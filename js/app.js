/**
 * app.js
 * Core Single Page Application controller, router, and UI state manager.
 */

import { 
  getExercises, 
  addExercise, 
  deleteExercise, 
  updateExercise,
  resetDefaultExercises,
  getWorkouts, 
  saveWorkout, 
  deleteWorkout,
  updateWorkout,
  initDB,
  syncDatabaseWithFirebase,
  mergeLocalDataToCloud,
  getPersonalRecords
} from './db.js';

import {
  onAuthStateChanged,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  getCurrentUser
} from './auth.js';

import {
  DOM,
  cacheDOM,
  uiRenderActiveWorkout,
  uiRenderHistory,
  uiRenderExercisesLibrary,
  uiRenderProfile
} from './ui.js';

import {
  showCustomAlert,
  showCustomConfirm
} from './dialog.js';

import {
  showToast
} from './toast.js';

import { forceTimerSync } from './timer.js';

import {
  startRestTimer,
  adjustRestTimer,
  hideRestTimerOverlay,
  getDefaultRestDuration,
  setDefaultRestDuration,
  isRestTimerEnabled,
  setRestTimerEnabled
} from './timer.js';


// Application State
export let activeWorkout = null;
let timerInterval = null;
let currentView = 'workout'; // 'workout', 'history', 'exercises', 'profile'
let exerciseFilter = 'all';

// Check if running in browser with full DOM (avoids crashes in testing runner)
const isBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

// --- SPA Router ---
export function switchView(viewName) {
  currentView = viewName;
  if (!isBrowserEnv || !DOM.views) return;

  DOM.views.forEach(view => {
    view.classList.remove('active');
    if (view.id === `view-${viewName}`) {
      view.classList.add('active');
    }
  });

  DOM.navTabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.view === viewName) {
      tab.classList.add('active');
    }
  });

  if (viewName === 'history') {
    renderHistory();
  } else if (viewName === 'exercises') {
    renderExercisesLibrary();
  } else if (viewName === 'workout') {
    renderActiveWorkout();
  } else if (viewName === 'profile') {
    renderProfile();
  }
}

// --- Active Workout Logic ---
export function startWorkout() {
  activeWorkout = {
    id: 'wo_' + Date.now(),
    name: getDefaultWorkoutName(),
    startTime: Date.now(),
    exercises: []
  };
  saveActiveWorkoutState();
  
  if (isBrowserEnv && DOM.workoutTimer) {
    initTimer();
    renderActiveWorkout();
    showToast('Neues Training gestartet!', 'success');
  }
}

function getDefaultWorkoutName() {
  const hour = new Date().getHours();
  let period = 'Training';
  if (hour < 12) period = 'Morgendliches Training';
  else if (hour < 17) period = 'Nachmittagstraining';
  else if (hour < 22) period = 'Abendtraining';
  else period = 'Nachttraining';
  return period;
}

export async function cancelWorkout() {
  if (!activeWorkout) return;
  
  const isEditing = activeWorkout.isEditing;
  const confirmMsg = isEditing 
    ? 'Bearbeiten abbrechen? Die Änderungen werden nicht gespeichert.' 
    : 'Möchtest du dieses Training wirklich verwerfen?';
    
  let confirmDiscard = true;
  if (isBrowserEnv && DOM.workoutTimer) {
    const dialogModal = document.getElementById('custom-dialog-modal');
    if (dialogModal) {
      confirmDiscard = await showCustomConfirm(isEditing ? 'Bearbeiten abbrechen' : 'Training verwerfen', confirmMsg);
    } else {
      confirmDiscard = confirm(confirmMsg);
    }
  }

  if (confirmDiscard) {
    activeWorkout = null;
    localStorage.removeItem('activeWorkout');
    if (isBrowserEnv && DOM.workoutTimer) {
      clearInterval(timerInterval);
      DOM.workoutTimer.style.display = 'none';
      hideRestTimerOverlay();
      if (isEditing) {
        switchView('history');
      } else {
        renderActiveWorkout();
      }
      showToast('Training verworfen.', 'info');
    }
  }
}

export async function finishWorkout() {
  if (!activeWorkout) return;

  const loggedExercises = activeWorkout.exercises.filter(ex => ex.sets.length > 0);
  
  if (loggedExercises.length === 0) {
    const msg = 'Bitte füge mindestens eine Übung und einen Satz hinzu, bevor du das Training beendest.';
    if (isBrowserEnv && DOM.workoutTimer) {
      const dialogModal = document.getElementById('custom-dialog-modal');
      if (dialogModal) {
        await showCustomAlert('Hinweis', msg);
      } else {
        alert(msg);
      }
    }
    return;
  }

  // Calculate volume and duration
  let totalVolume = 0;
  let completedSetsCount = 0;
  
  loggedExercises.forEach(ex => {
    ex.sets.forEach(set => {
      // Calculate volume if completed OR if reps were entered
      if (set.completed || set.reps > 0) {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        totalVolume += (weight * reps);
        if (set.completed) completedSetsCount++;
      }
    });
  });

  const durationSeconds = activeWorkout.isEditing 
    ? (activeWorkout.durationSeconds || (activeWorkout.duration * 60)) 
    : Math.round((Date.now() - activeWorkout.startTime) / 1000);

  const durationMinutes = Math.round(durationSeconds / 60);

  const dateStr = activeWorkout.isEditing
    ? activeWorkout.date
    : new Date().toISOString();

  const completedWorkout = {
    id: activeWorkout.id,
    name: activeWorkout.name,
    date: dateStr,
    duration: durationMinutes,
    durationSeconds: durationSeconds,
    volume: totalVolume,
    exercises: loggedExercises
  };

  // Check for Personal Records if it's not an edit (or even if it is, it's nice to know)
  const oldPRs = getPersonalRecords();
  let newPrMessages = [];

  loggedExercises.forEach(ex => {
    let maxWeightThisWorkout = 0;
    let max1RMThisWorkout = 0;
    
    ex.sets.forEach(set => {
      if (set.completed || (set.weight > 0 && set.reps > 0)) {
        const wgt = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        if (wgt > maxWeightThisWorkout) maxWeightThisWorkout = wgt;
        
        const calculated1RM = Math.round((wgt * (1 + reps / 30)) * 10) / 10;
        if (calculated1RM > max1RMThisWorkout) max1RMThisWorkout = calculated1RM;
      }
    });

    const oldPR = oldPRs[ex.id];
    let beatWeight = false;
    let beat1RM = false;
    let isFirstTime = false;

    if (!oldPR) {
      if (maxWeightThisWorkout > 0) isFirstTime = true;
    } else {
      if (maxWeightThisWorkout > oldPR.maxWeight) beatWeight = true;
      if (max1RMThisWorkout > oldPR.max1RM) beat1RM = true;
    }

    if (isFirstTime) {
      newPrMessages.push(`Erster PR bei ${ex.name}! 🏆`);
    } else if (beatWeight && beat1RM) {
      newPrMessages.push(`Doppelter PR bei ${ex.name}! (Max & 1RM) 🏆`);
    } else if (beatWeight) {
      newPrMessages.push(`Neuer Gewichts-PR bei ${ex.name}! (${maxWeightThisWorkout} kg) 🏆`);
    } else if (beat1RM) {
      newPrMessages.push(`Neuer 1RM-PR bei ${ex.name}! (${max1RMThisWorkout} kg) 🏆`);
    }
  });

  const isEditing = activeWorkout.isEditing;
  if (isEditing) {
    updateWorkout(completedWorkout);
  } else {
    saveWorkout(completedWorkout);
  }
  activeWorkout = null;
  localStorage.removeItem('activeWorkout');

  // Always stop the rest timer when finishing, regardless of browser env
  hideRestTimerOverlay();

  if (isBrowserEnv && DOM.workoutTimer) {
    clearInterval(timerInterval);
    DOM.workoutTimer.style.display = 'none';
    switchView('history');
    showToast(isEditing ? 'Training aktualisiert!' : 'Training abgeschlossen!', 'success');
    
    // Show PR toasts sequentially
    newPrMessages.forEach((msg, idx) => {
      setTimeout(() => showToast(msg, 'success'), (idx + 1) * 800);
    });
  }
}

export async function addExerciseToActiveWorkout(exercise) {
  if (!activeWorkout) return;
  
  const exists = activeWorkout.exercises.some(ex => ex.id === exercise.id);
  if (exists) {
    const msg = `${exercise.name} ist bereits in diesem Training enthalten.`;
    if (isBrowserEnv && DOM.modalSelectExercise) {
      const dialogModal = document.getElementById('custom-dialog-modal');
      if (dialogModal) {
        await showCustomAlert('Information', msg);
      } else {
        alert(msg);
      }
    }
    return;
  }

  const newExercise = {
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    sets: [
      { weight: 0, reps: 0, completed: false }
    ]
  };

  activeWorkout.exercises.push(newExercise);
  saveActiveWorkoutState();
  
  if (isBrowserEnv && DOM.modalSelectExercise) {
    renderActiveWorkout();
    closeModal(DOM.modalSelectExercise);
    showToast('Übung hinzugefügt.', 'success');
  }
}

export function deleteExerciseFromWorkout(index) {
  if (!activeWorkout) return;
  activeWorkout.exercises.splice(index, 1);
  saveActiveWorkoutState();
  if (isBrowserEnv && DOM.workoutExercisesList) renderActiveWorkout();
}

// --- Sets Management ---
export function addSetToExercise(exerciseIndex) {
  if (!activeWorkout) return;
  const ex = activeWorkout.exercises[exerciseIndex];
  const lastSet = ex.sets[ex.sets.length - 1];
  
  const newSet = {
    weight: lastSet ? lastSet.weight : 0,
    reps: lastSet ? lastSet.reps : 0,
    completed: false
  };
  
  ex.sets.push(newSet);
  saveActiveWorkoutState();
  if (isBrowserEnv && DOM.workoutExercisesList) renderActiveWorkout();
}

export function deleteSetFromExercise(exerciseIndex, setIndex) {
  if (!activeWorkout) return;
  const ex = activeWorkout.exercises[exerciseIndex];
  ex.sets.splice(setIndex, 1);
  saveActiveWorkoutState();
  if (isBrowserEnv && DOM.workoutExercisesList) renderActiveWorkout();
}

export function toggleCompleteSet(exerciseIndex, setIndex) {
  if (!activeWorkout) return;
  const ex = activeWorkout.exercises[exerciseIndex];
  const set = ex.sets[setIndex];
  set.completed = !set.completed;
  saveActiveWorkoutState();
  
  if (isBrowserEnv && DOM.workoutExercisesList) {
    renderActiveWorkout();
  }
  
  if (isBrowserEnv && set.completed) {
    const defaultDuration = getDefaultRestDuration();
    startRestTimer(defaultDuration, ex.name);
  }
}

// LocalStorage Synchronization
export function saveActiveWorkoutState() {
  if (activeWorkout) {
    localStorage.setItem('activeWorkout', JSON.stringify(activeWorkout));
  }
}

export function loadActiveWorkoutState() {
  const stateVal = localStorage.getItem('activeWorkout');
  if (stateVal) {
    activeWorkout = JSON.parse(stateVal);
    if (isBrowserEnv && DOM.workoutTimer) {
      if (activeWorkout.isEditing) {
        DOM.workoutTimer.style.display = 'flex';
        DOM.workoutTimer.classList.remove('active');
        DOM.timerText.textContent = `${activeWorkout.duration} min`;
      } else {
        initTimer();
      }
      renderActiveWorkout();
    }
  }
}

export function editWorkout(workout) {
  if (!workout) return;
  
  activeWorkout = JSON.parse(JSON.stringify(workout));
  activeWorkout.isEditing = true;
  
  saveActiveWorkoutState();
  
  if (isBrowserEnv) {
    if (timerInterval) clearInterval(timerInterval);
    if (DOM.workoutTimer) {
      DOM.workoutTimer.style.display = 'flex';
      DOM.workoutTimer.classList.remove('active');
      DOM.timerText.textContent = `${activeWorkout.duration} min`;
    }
    switchView('workout');
  }
}

// --- Timer Helper ---
function initTimer() {
  if (timerInterval) clearInterval(timerInterval);
  DOM.workoutTimer.style.display = 'flex';
  DOM.workoutTimer.classList.add('active');
  updateTimerUI();
  timerInterval = setInterval(updateTimerUI, 1000);
}

function updateTimerUI() {
  if (!activeWorkout) {
    clearInterval(timerInterval);
    return;
  }
  const ms = Date.now() - activeWorkout.startTime;
  DOM.timerText.textContent = formatDuration(ms);
}

export function formatDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  const s = seconds.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const h = hours.toString().padStart(2, '0');

  return hours > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// --- Renderers wrappers (for functional separation) ---
export function renderActiveWorkout() {
  uiRenderActiveWorkout(
    activeWorkout,
    DOM.workoutEmptyState,
    DOM.workoutActiveUI,
    DOM.workoutExercisesList,
    DOM.workoutNameInput,
    DOM.workoutExerciseCount,
    DOM.btnFinishWorkout,
    DOM.btnCancelWorkout,
    getPersonalRecords()
  );
}

export function renderHistory() {
  uiRenderHistory(getWorkouts(), DOM.historyList, DOM.historyEmptyState);
}

export function renderExercisesLibrary(container = DOM.exercisesList, searchInput = DOM.exerciseSearchInput, forSelectionModal = false) {
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  uiRenderExercisesLibrary(
    getExercises(),
    activeWorkout,
    exerciseFilter,
    container,
    query,
    forSelectionModal,
    getPersonalRecords()
  );
}

export function renderProfile() {
  uiRenderProfile(getCurrentUser(), DOM.profileLoggedIn, DOM.profileLoggedOut, DOM.profileEmail, DOM.authErrorMsg);
}

// --- Modals Controller ---
function openModal(modal) {
  if (!isBrowserEnv || !DOM.views) return;
  modal.classList.add('active');
}

function closeModal(modal) {
  if (!isBrowserEnv || !DOM.views) return;
  modal.classList.remove('active');
}

// --- Event Listeners and Setup ---
function setupEventListeners() {
  if (!isBrowserEnv || !DOM.views) return;

  // Sync timers when returning from background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      forceTimerSync();
      if (activeWorkout && timerInterval) {
        updateTimerUI();
      }
    }
  });

  // SPA Navigation Tabs
  DOM.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchView(tab.dataset.view);
    });
  });

  // Settings UI Listeners
  if (DOM.settingTimerEnabled) {
    DOM.settingTimerEnabled.addEventListener('change', (e) => {
      setRestTimerEnabled(e.target.checked);
      showToast(e.target.checked ? 'Pausen-Timer aktiviert' : 'Pausen-Timer deaktiviert', 'info');
    });
  }
  
  if (DOM.settingTimerDuration) {
    DOM.settingTimerDuration.addEventListener('change', (e) => {
      setDefaultRestDuration(parseInt(e.target.value, 10));
      showToast('Standardzeit auf ' + e.target.value + 's gesetzt', 'info');
    });
  }

  // Workout controls
  DOM.btnStartWorkout.addEventListener('click', startWorkout);
  DOM.btnCancelWorkout.addEventListener('click', cancelWorkout);
  DOM.btnFinishWorkout.addEventListener('click', finishWorkout);
  DOM.workoutNameInput.addEventListener('input', (e) => {
    if (activeWorkout) {
      activeWorkout.name = e.target.value;
      saveActiveWorkoutState();
    }
  });

  // Modal selector triggers
  DOM.btnAddExerciseTrigger.addEventListener('click', () => {
    DOM.modalExerciseSearchInput.value = '';
    renderExercisesLibrary(DOM.modalExercisesList, DOM.modalExerciseSearchInput, true);
    openModal(DOM.modalSelectExercise);
  });

  DOM.btnCloseSelectModal.addEventListener('click', () => closeModal(DOM.modalSelectExercise));

  // Exercise Search inputs
  DOM.exerciseSearchInput.addEventListener('input', () => renderExercisesLibrary());
  DOM.modalExerciseSearchInput.addEventListener('input', () => {
    renderExercisesLibrary(DOM.modalExercisesList, DOM.modalExerciseSearchInput, true);
  });

  // Reset Default Exercises
  const btnResetDefaults = document.getElementById('btn-reset-default-exercises');
  if (btnResetDefaults) {
    btnResetDefaults.addEventListener('click', async () => {
      const dialogModal = document.getElementById('custom-dialog-modal');
      let proceed = false;
      const msg = 'Alle Standardübungen werden auf ihren ursprünglichen Namen und ihre ursprüngliche Kategorie zurückgesetzt. Eigene Übungen bleiben erhalten. Fortfahren?';
      if (dialogModal) {
        proceed = await showCustomConfirm('Standardübungen zurücksetzen', msg);
      } else {
        proceed = confirm(msg);
      }
      if (proceed) {
        resetDefaultExercises();
        renderExercisesLibrary();
        showToast('Standardübungen wurden wiederhergestellt.', 'success');
      }
    });
  }

  // Custom Exercise Creation Modal
  DOM.btnCreateExerciseModalTrigger.addEventListener('click', () => {
    document.getElementById('modal-create-exercise-title').textContent = 'Neue eigene Übung';
    document.getElementById('btn-submit-create-exercise').textContent = 'Übung erstellen';
    delete DOM.formCreateExercise.dataset.editId;
    DOM.customExerciseName.value = '';
    openModal(DOM.modalCreateExercise);
  });
  
  DOM.btnCloseCreateModal.addEventListener('click', () => closeModal(DOM.modalCreateExercise));
  DOM.btnCancelCreateExercise.addEventListener('click', () => closeModal(DOM.modalCreateExercise));
  
  DOM.formCreateExercise.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = DOM.customExerciseName.value.trim();
    const category = DOM.customExerciseCategory.value;
    const editId = DOM.formCreateExercise.dataset.editId;
    
    if (name) {
      if (editId) {
        const res = updateExercise(editId, name, category);
        if (res && res.historyUpdatedCount > 0) {
          showToast(`Übung aktualisiert (auch in ${res.historyUpdatedCount} alten Trainings).`, 'success');
        } else {
          showToast('Übung aktualisiert.', 'success');
        }
      } else {
        const res = addExercise(name, category);
        if (res && res.wasReconnected) {
          showToast('Übung wiederhergestellt – PRs aus dem Verlauf wurden automatisch verknüpft! 🏆', 'success');
        } else {
          showToast('Neue Übung erstellt.', 'success');
        }
      }
      closeModal(DOM.modalCreateExercise);
      renderExercisesLibrary();
    }
  });

  // Exercise category filters
  DOM.filterBadges.forEach(badge => {
    badge.addEventListener('click', () => {
      DOM.filterBadges.forEach(b => b.classList.remove('active'));
      badge.classList.add('active');
      exerciseFilter = badge.dataset.category;
      renderExercisesLibrary();
    });
  });

  // Delegated events for dynamic elements in the Workout Exercises list
  DOM.workoutExercisesList.addEventListener('click', (e) => {
    const target = e.target;
    
    const btnWeightMinus = target.closest('.btn-weight-minus');
    const btnWeightPlus = target.closest('.btn-weight-plus');
    const btnRepsMinus = target.closest('.btn-reps-minus');
    const btnRepsPlus = target.closest('.btn-reps-plus');
    const btnComplete = target.closest('.btn-complete-set');
    const btnAddSet = target.closest('.btn-add-set');
    const btnRemoveLastSet = target.closest('.btn-delete-set');
    const btnDeleteExerciseCard = target.closest('.btn-card-delete');

    if (btnWeightMinus) {
      const exIdx = parseInt(btnWeightMinus.dataset.exIdx);
      const setIdx = parseInt(btnWeightMinus.dataset.setIdx);
      const set = activeWorkout.exercises[exIdx].sets[setIdx];
      set.weight = Math.max(0, set.weight - 1);
      saveActiveWorkoutState();
      renderActiveWorkout();
    }
    
    else if (btnWeightPlus) {
      const exIdx = parseInt(btnWeightPlus.dataset.exIdx);
      const setIdx = parseInt(btnWeightPlus.dataset.setIdx);
      const set = activeWorkout.exercises[exIdx].sets[setIdx];
      set.weight = set.weight + 1;
      saveActiveWorkoutState();
      renderActiveWorkout();
    }

    else if (btnRepsMinus) {
      const exIdx = parseInt(btnRepsMinus.dataset.exIdx);
      const setIdx = parseInt(btnRepsMinus.dataset.setIdx);
      const set = activeWorkout.exercises[exIdx].sets[setIdx];
      set.reps = Math.max(0, set.reps - 1);
      saveActiveWorkoutState();
      renderActiveWorkout();
    }

    else if (btnRepsPlus) {
      const exIdx = parseInt(btnRepsPlus.dataset.exIdx);
      const setIdx = parseInt(btnRepsPlus.dataset.setIdx);
      const set = activeWorkout.exercises[exIdx].sets[setIdx];
      set.reps = set.reps + 1;
      saveActiveWorkoutState();
      renderActiveWorkout();
    }

    else if (btnComplete) {
      const exIdx = parseInt(btnComplete.dataset.exIdx);
      const setIdx = parseInt(btnComplete.dataset.setIdx);
      toggleCompleteSet(exIdx, setIdx);
    }

    else if (btnAddSet) {
      const exIdx = parseInt(btnAddSet.dataset.exIdx);
      addSetToExercise(exIdx);
    }

    else if (btnRemoveLastSet) {
      const exIdx = parseInt(btnRemoveLastSet.dataset.exIdx);
      const sets = activeWorkout.exercises[exIdx].sets;
      if (sets.length > 1) {
        deleteSetFromExercise(exIdx, sets.length - 1);
      }
    }

    else if (btnDeleteExerciseCard) {
      const exIdx = parseInt(btnDeleteExerciseCard.dataset.exIdx);
      deleteExerciseFromWorkout(exIdx);
    }
  });

  // Delegated manual text/number input in active workout sets table
  DOM.workoutExercisesList.addEventListener('input', (e) => {
    const target = e.target;
    if (target.classList.contains('val-weight')) {
      const exIdx = parseInt(target.dataset.exIdx);
      const setIdx = parseInt(target.dataset.setIdx);
      activeWorkout.exercises[exIdx].sets[setIdx].weight = parseFloat(target.value) || 0;
      saveActiveWorkoutState();
    }
    
    if (target.classList.contains('val-reps')) {
      const exIdx = parseInt(target.dataset.exIdx);
      const setIdx = parseInt(target.dataset.setIdx);
      activeWorkout.exercises[exIdx].sets[setIdx].reps = parseInt(target.value) || 0;
      saveActiveWorkoutState();
    }
  });

  // Delegated trigger for Modal Select Exercise (clicking the list item add button)
  DOM.modalSelectExercise.addEventListener('click', (e) => {
    const target = e.target.closest('.btn-add-exercise-to-workout');
    if (target) {
      const exId = target.dataset.exId;
      const ex = getExercises().find(x => x.id === exId);
      if (ex) {
        addExerciseToActiveWorkout(ex);
      }
    }
  });

  // Delegated triggers in Exercise Library (Add directly, edit, or delete custom)
  DOM.exercisesList.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('.btn-add-exercise-to-workout');
    const deleteBtn = e.target.closest('.btn-delete-custom-ex');
    const editBtn = e.target.closest('.btn-edit-exercise');
    
    if (addBtn) {
      const exId = addBtn.dataset.exId;
      const ex = getExercises().find(x => x.id === exId);
      if (ex) {
        addExerciseToActiveWorkout(ex);
        switchView('workout');
      }
    }
    
    if (editBtn) {
      const exId = editBtn.dataset.exId;
      const exName = editBtn.dataset.exName;
      const exCat = editBtn.dataset.exCategory;
      
      document.getElementById('modal-create-exercise-title').textContent = 'Übung bearbeiten';
      document.getElementById('btn-submit-create-exercise').textContent = 'Speichern';
      DOM.formCreateExercise.dataset.editId = exId;
      DOM.customExerciseName.value = exName;
      DOM.customExerciseCategory.value = exCat;
      openModal(DOM.modalCreateExercise);
    }
    
    if (deleteBtn) {
      const exId = deleteBtn.dataset.exId;
      
      const isUsedInHistory = getWorkouts().some(w => w.exercises && w.exercises.some(ex => ex.id === exId));
      
      const dialogModal = document.getElementById('custom-dialog-modal');
      let proceed = false;
      let msg = 'Möchtest du diese Übung wirklich dauerhaft aus der Bibliothek löschen?';
      let title = 'Übung löschen';
      
      if (isUsedInHistory) {
        msg = 'Achtung: Diese Übung wird in deinen vergangenen Trainings verwendet! Wenn du sie löschst, verschwindet sie aus der Bibliothek, bleibt im Verlauf aber erhalten. Trotzdem löschen?';
        title = 'Warnung: Übung in Verwendung';
      }
      
      if (dialogModal) {
        proceed = await showCustomConfirm(title, msg);
      } else {
        proceed = confirm(msg);
      }

      if (proceed) {
        deleteExercise(exId);
        renderExercisesLibrary();
        showToast('Übung dauerhaft gelöscht.', 'success');
      }
    }
  });

  // Delegated triggers in History (delete or edit log)
  DOM.historyList.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.btn-delete-history');
    const editBtn = e.target.closest('.btn-edit-workout');
    
    if (deleteBtn) {
      const wId = deleteBtn.dataset.workoutId;
      const dialogModal = document.getElementById('custom-dialog-modal');
      let proceed = false;
      const msg = 'Möchtest du dieses Training wirklich aus dem Verlauf löschen?';
      if (dialogModal) {
        proceed = await showCustomConfirm('Eintrag löschen', msg);
      } else {
        proceed = confirm(msg);
      }

      if (proceed) {
        deleteWorkout(wId);
        renderHistory();
        showToast('Training gelöscht.', 'success');
      }
    }
    
    if (editBtn) {
      const wId = editBtn.dataset.workoutId;
      const workout = getWorkouts().find(w => w.id === wId);
      if (workout) {
        editWorkout(workout);
      }
    }
  });

  // Auth Form interactions (Login/Register)
  if (DOM.authForm) {
    DOM.btnSubmitLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = DOM.authEmail.value.trim();
      const password = DOM.authPassword.value;
      if (!email || !password) return;
      
      DOM.authErrorMsg.style.display = 'none';
      const result = await loginWithEmail(email, password);
      if (result.success) {
        const user = getCurrentUser();
        if (user) {
          await mergeLocalDataToCloud(user.uid);
        }
        switchView('profile');
        showToast('Erfolgreich angemeldet!', 'success');
      } else {
        DOM.authErrorMsg.textContent = translateAuthError(result.error);
        DOM.authErrorMsg.style.display = 'block';
      }
    });

    DOM.btnSubmitRegister.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = DOM.authEmail.value.trim();
      const password = DOM.authPassword.value;
      if (!email || !password) return;

      DOM.authErrorMsg.style.display = 'none';
      const result = await registerWithEmail(email, password);
      if (result.success) {
        const user = getCurrentUser();
        if (user) {
          await mergeLocalDataToCloud(user.uid);
        }
        switchView('profile');
        showToast('Konto erfolgreich erstellt und angemeldet!', 'success');
      } else {
        DOM.authErrorMsg.textContent = translateAuthError(result.error);
        DOM.authErrorMsg.style.display = 'block';
      }
    });

    DOM.btnGoogleLogin.addEventListener('click', async () => {
      DOM.authErrorMsg.style.display = 'none';
      const result = await loginWithGoogle();
      if (result.success) {
        const user = getCurrentUser();
        if (user) {
          await mergeLocalDataToCloud(user.uid);
        }
        switchView('profile');
        showToast('Erfolgreich mit Google angemeldet!', 'success');
      } else {
        DOM.authErrorMsg.textContent = translateAuthError(result.error);
        DOM.authErrorMsg.style.display = 'block';
      }
    });

    // Rest Timer Overlay button listeners
    if (DOM.btnRestTimerMinus) {
      DOM.btnRestTimerMinus.addEventListener('click', () => adjustRestTimer(-30));
    }
    if (DOM.btnRestTimerPlus) {
      DOM.btnRestTimerPlus.addEventListener('click', () => adjustRestTimer(30));
    }
    if (DOM.btnRestTimerSkip) {
      DOM.btnRestTimerSkip.addEventListener('click', () => hideRestTimerOverlay());
    }
  }

  if (DOM.btnLogout) {
    DOM.btnLogout.addEventListener('click', () => {
      logout().then(() => {
        switchView('profile');
        showToast('Erfolgreich abgemeldet.', 'info');
      });
    });
  }
}

function translateAuthError(msg) {
  if (!msg) return 'Fehler bei der Anmeldung.';
  if (msg.includes('user-not-found') || msg.includes('auth/invalid-credential')) {
    return 'Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort.';
  }
  if (msg.includes('email-already-in-use')) {
    return 'Diese E-Mail-Adresse wird bereits verwendet.';
  }
  if (msg.includes('weak-password')) {
    return 'Das Passwort ist zu schwach. Es sollte mindestens 6 Zeichen haben.';
  }
  if (msg.includes('invalid-email')) {
    return 'Ungültiges E-Mail-Format.';
  }
  return msg;
}

// Service Worker Registration
function registerServiceWorker() {
  if (isBrowserEnv && 'serviceWorker' in navigator) {
    // Determine the correct SW scope based on the current path
    // Works both for local dev (/) and GitHub Pages subdirectory (/fittrack/)
    const swPath = new URL('./sw.js', window.location.href).href;
    
    navigator.serviceWorker.register(swPath, { scope: './' })
      .then(reg => {
        console.log('[App] Service Worker registered successfully, scope:', reg.scope);
      })
      .catch(err => {
        console.warn('[App] Service Worker registration failed:', err);
      });
  }
}

// App Initialization
export function init() {
  if (isBrowserEnv) {
    const mainAppElement = document.getElementById('btn-start-workout');
    if (!mainAppElement) {
      console.log('App initialization skipped (Test environment detected)');
      return;
    }
    initDB();
    cacheDOM();
    
    // Initialize Settings UI from local storage
    if (DOM.settingTimerEnabled) {
      DOM.settingTimerEnabled.checked = isRestTimerEnabled();
    }
    if (DOM.settingTimerDuration) {
      DOM.settingTimerDuration.value = getDefaultRestDuration().toString();
    }

    setupEventListeners();
    loadActiveWorkoutState();
    switchView(currentView);
    registerServiceWorker();

    // Set up Firebase auth state listener
    onAuthStateChanged(user => {
      syncDatabaseWithFirebase(user);
      renderProfile();
    });

    // Re-render components when the in-memory database updates from Firestore
    window.addEventListener('db-updated', () => {
      if (currentView === 'history') renderHistory();
      else if (currentView === 'exercises') renderExercisesLibrary();
      else if (currentView === 'workout') renderActiveWorkout();
    });
  }
}

// Trigger initial setup
init();
