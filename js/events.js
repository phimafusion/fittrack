import { DOM } from './ui.js';
import {
  getExercises,
  addExercise,
  updateExercise,
  deleteExercise,
  resetDefaultExercises,
  getWorkouts,
  deleteWorkout,
  mergeLocalDataToCloud
} from './db.js';
import {
  activeWorkout,
  timerInterval,
  updateTimerUI,
  switchView,
  startWorkout,
  cancelWorkout,
  finishWorkout,
  saveActiveWorkoutState,
  renderActiveWorkout,
  renderHistory,
  renderExercisesLibrary,
  renderProfile,
  addExerciseToActiveWorkout,
  deleteExerciseFromWorkout,
  addSetToExercise,
  deleteSetFromExercise,
  toggleCompleteSet,
  editWorkout
} from './app.js';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  getCurrentUser
} from './auth.js';
import {
  showCustomAlert,
  showCustomConfirm
} from './dialog.js';
import { showToast } from './toast.js';
import {
  forceTimerSync,
  adjustRestTimer,
  hideRestTimerOverlay,
  setDefaultRestDuration,
  setRestTimerEnabled
} from './timer.js';

const isBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

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
    if (DOM.customExerciseMeasurement) {
      DOM.customExerciseMeasurement.value = 'reps';
    }
    openModal(DOM.modalCreateExercise);
  });
  
  DOM.btnCloseCreateModal.addEventListener('click', () => closeModal(DOM.modalCreateExercise));
  DOM.btnCancelCreateExercise.addEventListener('click', () => closeModal(DOM.modalCreateExercise));
  
  DOM.formCreateExercise.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = DOM.customExerciseName.value.trim();
    const category = DOM.customExerciseCategory.value;
    const measurementType = DOM.customExerciseMeasurement ? DOM.customExerciseMeasurement.value : 'reps';
    const editId = DOM.formCreateExercise.dataset.editId;
    
    if (name) {
      if (editId) {
        const res = updateExercise(editId, name, category, measurementType);
        if (res && res.historyUpdatedCount > 0) {
          showToast(`Übung aktualisiert (auch in ${res.historyUpdatedCount} alten Trainings).`, 'success');
        } else {
          showToast('Übung aktualisiert.', 'success');
        }
      } else {
        const res = addExercise(name, category, measurementType);
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
      const ex = activeWorkout.exercises[exIdx];
      const set = ex.sets[setIdx];
      const step = ex.measurementType === 'time' ? 5 : 1;
      set.reps = Math.max(0, set.reps - step);
      saveActiveWorkoutState();
      renderActiveWorkout();
    }
    
    else if (btnRepsPlus) {
      const exIdx = parseInt(btnRepsPlus.dataset.exIdx);
      const setIdx = parseInt(btnRepsPlus.dataset.setIdx);
      const ex = activeWorkout.exercises[exIdx];
      const set = ex.sets[setIdx];
      const step = ex.measurementType === 'time' ? 5 : 1;
      set.reps = (set.reps || 0) + step;
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
      const exMeasurement = editBtn.dataset.exMeasurement || 'reps';
      
      document.getElementById('modal-create-exercise-title').textContent = 'Übung bearbeiten';
      document.getElementById('btn-submit-create-exercise').textContent = 'Speichern';
      DOM.formCreateExercise.dataset.editId = exId;
      DOM.customExerciseName.value = exName;
      DOM.customExerciseCategory.value = exCat;
      if (DOM.customExerciseMeasurement) {
        DOM.customExerciseMeasurement.value = exMeasurement;
      }
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


export { setupEventListeners };
