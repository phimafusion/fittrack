import { setupEventListeners } from './events.js';
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

import {
  forceTimerSync,
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
export let timerInterval = null;
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

export function cancelWorkoutState() {
  activeWorkout = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('activeWorkout');
  }
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
    cancelWorkoutState();
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

export function updateTimerUI() {
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
