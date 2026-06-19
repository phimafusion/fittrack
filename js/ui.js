/**
 * ui.js
 * Stateless DOM presentation and rendering library for FitTrack.
 * Contains pure layout renderers and HTML card generators.
 */

// Cache DOM Elements object
export const DOM = {};

export function cacheDOM() {
  DOM.navTabs = document.querySelectorAll('.nav-tab');
  DOM.views = document.querySelectorAll('.view');
  
  DOM.workoutTimer = document.getElementById('workout-timer');
  DOM.timerText = document.getElementById('timer-text');
  
  DOM.workoutEmptyState = document.getElementById('workout-empty-state');
  DOM.workoutActiveUI = document.getElementById('workout-active-ui');
  DOM.btnStartWorkout = document.getElementById('btn-start-workout');
  DOM.btnCancelWorkout = document.getElementById('btn-cancel-workout');
  DOM.btnFinishWorkout = document.getElementById('btn-finish-workout');
  DOM.workoutNameInput = document.getElementById('workout-name-input');
  DOM.workoutExerciseCount = document.getElementById('workout-exercise-count');
  DOM.workoutExercisesList = document.getElementById('workout-exercises-list');
  DOM.btnAddExerciseTrigger = document.getElementById('btn-add-exercise-trigger');
  
  DOM.historyEmptyState = document.getElementById('history-empty-state');
  DOM.historyList = document.getElementById('history-list');
  
  DOM.btnCreateExerciseModalTrigger = document.getElementById('btn-create-exercise-modal-trigger');
  DOM.exerciseSearchInput = document.getElementById('exercise-search-input');
  DOM.exercisesList = document.getElementById('exercises-list');
  DOM.filterBadges = document.querySelectorAll('.filter-badge');
  
  // Modals
  DOM.modalSelectExercise = document.getElementById('modal-select-exercise');
  DOM.btnCloseSelectModal = document.getElementById('btn-close-select-modal');
  DOM.modalExerciseSearchInput = document.getElementById('modal-exercise-search-input');
  DOM.modalExercisesList = document.getElementById('modal-exercises-list');
  
  DOM.modalCreateExercise = document.getElementById('modal-create-exercise');
  DOM.btnCloseCreateModal = document.getElementById('btn-close-create-modal');
  DOM.btnCancelCreateExercise = document.getElementById('btn-cancel-create-exercise');
  DOM.formCreateExercise = document.getElementById('form-create-exercise');
  DOM.customExerciseName = document.getElementById('custom-exercise-name');
  DOM.customExerciseCategory = document.getElementById('custom-exercise-category');

  // Profile DOM
  DOM.profileLoggedIn = document.getElementById('profile-logged-in');
  DOM.profileLoggedOut = document.getElementById('profile-logged-out');
  DOM.profileEmail = document.getElementById('profile-email');
  DOM.btnLogout = document.getElementById('btn-logout');
  DOM.authForm = document.getElementById('auth-form');
  DOM.authEmail = document.getElementById('auth-email');
  DOM.authPassword = document.getElementById('auth-password');
  DOM.authErrorMsg = document.getElementById('auth-error-msg');
  DOM.btnSubmitLogin = document.getElementById('btn-submit-login');
  DOM.btnSubmitRegister = document.getElementById('btn-submit-register');
  DOM.btnGoogleLogin = document.getElementById('btn-google-login');

  // Settings DOM
  DOM.settingTimerEnabled = document.getElementById('setting-timer-enabled');
  DOM.settingTimerDuration = document.getElementById('setting-timer-duration');

  // Rest Timer DOM elements
  DOM.restTimerOverlay = document.getElementById('rest-timer-overlay');
  DOM.restTimerTitle = document.getElementById('rest-timer-title');
  DOM.restTimerCircleProgress = document.getElementById('rest-timer-circle-progress');
  DOM.restTimerTime = document.getElementById('rest-timer-time');
  DOM.btnRestTimerMinus = document.getElementById('btn-rest-timer-minus');
  DOM.btnRestTimerPlus = document.getElementById('btn-rest-timer-plus');
  DOM.btnRestTimerSkip = document.getElementById('btn-rest-timer-skip');
}

/**
 * Render Active Workout interface
 */
export function uiRenderActiveWorkout(
  activeWorkout, 
  emptyStateEl, 
  activeUIEl, 
  exercisesListEl, 
  nameInputEl, 
  exerciseCountEl, 
  btnFinishEl, 
  btnCancelEl,
  personalRecords = null
) {
  if (!emptyStateEl || !activeUIEl) return;

  if (!activeWorkout) {
    emptyStateEl.style.display = 'flex';
    activeUIEl.style.display = 'none';
    const timerEl = document.getElementById('workout-timer');
    if (timerEl) timerEl.style.display = 'none';
    return;
  }

  emptyStateEl.style.display = 'none';
  activeUIEl.style.display = 'block';
  
  if (btnFinishEl) {
    if (activeWorkout.isEditing) {
      btnFinishEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Training aktualisieren';
      btnCancelEl.title = 'Bearbeiten abbrechen';
      btnCancelEl.className = 'btn btn-secondary btn-sm';
      btnCancelEl.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    } else {
      btnFinishEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Training abschließen';
      btnCancelEl.title = 'Training verwerfen';
      btnCancelEl.className = 'btn btn-danger btn-sm';
      btnCancelEl.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    }
  }
  
  if (nameInputEl) nameInputEl.value = activeWorkout.name;
  if (exerciseCountEl) exerciseCountEl.textContent = activeWorkout.exercises.length;

  if (!exercisesListEl) return;
  exercisesListEl.innerHTML = '';

  activeWorkout.exercises.forEach((ex, exIdx) => {
    const pr = personalRecords ? personalRecords[ex.id] : null;
    const prText = pr ? `<span class="active-pr-text" style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500; margin-left: 8px;">(PR: ${pr.maxWeight}kg | 1RM: ${pr.max1RM}kg)</span>` : '';

    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.innerHTML = `
      <div class="exercise-card-header">
        <div class="exercise-title-info">
          <div style="display: flex; align-items: baseline;">
            <span class="exercise-name">${ex.name}</span>
            ${prText}
          </div>
          <span class="exercise-category">${ex.category}</span>
        </div>
        <button class="btn-card-delete" data-ex-idx="${exIdx}" title="Übung entfernen">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="sets-table">
        <div class="sets-header">
          <span>Satz</span>
          <span>Gewicht (kg)</span>
          <span>Wdh.</span>
          <span>Status</span>
        </div>
        <div class="sets-list-container">
          ${ex.sets.map((set, setIdx) => `
            <div class="set-row ${set.completed ? 'completed' : ''}">
              <span class="set-num">${setIdx + 1}</span>
              
              <!-- Weight Input Counter -->
              <div class="input-group">
                <button class="input-btn btn-weight-minus" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">-</button>
                <input type="number" step="0.5" class="set-input val-weight" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.weight}" aria-label="Gewicht in kg">
                <button class="input-btn btn-weight-plus" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">+</button>
              </div>

              <!-- Reps Input Counter -->
              <div class="input-group">
                <button class="input-btn btn-reps-minus" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">-</button>
                <input type="number" class="set-input val-reps" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.reps}" aria-label="Wiederholungen">
                <button class="input-btn btn-reps-plus" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">+</button>
              </div>

              <!-- Checkbox button -->
              <div>
                <button class="btn-complete-set ${set.completed ? 'completed' : ''}" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">
                  <i class="fa-solid ${set.completed ? 'fa-check' : 'fa-minus'}"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; gap: 8px;">
        <button class="btn btn-secondary btn-sm btn-add-set" data-ex-idx="${exIdx}" style="width: auto;">
          <i class="fa-solid fa-plus"></i> Satz hinzufügen
        </button>
        ${ex.sets.length > 1 ? `
          <button class="btn btn-danger btn-sm btn-delete-set" data-ex-idx="${exIdx}" style="background: none; border: none; padding: 4px;">
            <i class="fa-solid fa-minus-circle"></i> Letzten Satz entfernen
          </button>
        ` : ''}
      </div>
    `;

    exercisesListEl.appendChild(card);
  });
}

/**
 * Render Completed Workouts History List
 */
export function uiRenderHistory(workouts, listContainerEl, emptyStateEl) {
  if (!listContainerEl || !emptyStateEl) return;

  listContainerEl.innerHTML = '';

  if (workouts.length === 0) {
    emptyStateEl.style.display = 'flex';
    listContainerEl.style.display = 'none';
    return;
  }

  emptyStateEl.style.display = 'none';
  listContainerEl.style.display = 'flex';

  workouts.forEach((w) => {
    const formattedDate = new Date(w.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let durationDisplay = `${w.duration} min`;
    if (w.durationSeconds !== undefined) {
      const m = Math.floor(w.durationSeconds / 60);
      const s = w.durationSeconds % 60;
      durationDisplay = `${m}m ${s}s`;
    }

    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-header">
        <div>
          <span class="history-workout-name">${w.name}</span>
          <div class="history-workout-date">${formattedDate}</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; margin-top: -2px;">
          <button class="btn-card-delete btn-edit-workout" data-workout-id="${w.id}" title="Training bearbeiten" style="color: var(--accent-secondary);">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-card-delete btn-delete-history" data-workout-id="${w.id}" title="Eintrag löschen">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>

      <div class="history-stats">
        <span class="history-stat">
          <i class="fa-regular fa-clock"></i> ${durationDisplay}
        </span>
        <span class="history-stat">
          <i class="fa-solid fa-weight-hanging"></i> ${w.volume} kg
        </span>
      </div>

      <div class="history-exercises-summary">
        ${w.exercises.map(ex => {
          const setsSummary = ex.sets.map(s => `${s.weight}kg x ${s.reps}`).join(', ');
          return `
            <div class="history-ex-row">
              <span class="history-ex-name">${ex.name}</span>
              <span class="history-ex-sets">${ex.sets.length} Sätze (${setsSummary})</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    listContainerEl.appendChild(card);
  });
}

/**
 * Render Exercises Database Library
 */
export function uiRenderExercisesLibrary(
  allExercises,
  activeWorkout,
  exerciseFilter,
  container,
  query = '',
  forSelectionModal = false,
  personalRecords = null
) {
  if (!container) return;

  container.innerHTML = '';

  const filtered = allExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(query) || ex.category.toLowerCase().includes(query);
    const matchesCategory = forSelectionModal || exerciseFilter === 'all' || ex.category.toLowerCase() === exerciseFilter;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Keine Übungen gefunden.</p>`;
    return;
  }

  filtered.forEach(ex => {
    const item = document.createElement('div');
    item.className = 'exercise-item';
    
    const isCustom = ex.id.includes('_17') || ex.id.includes('_18') || ex.id.includes('_19');
    const pr = personalRecords ? personalRecords[ex.id] : null;

    item.innerHTML = `
      <div class="exercise-item-info">
        <span class="exercise-item-name">${ex.name}</span>
        <span class="exercise-item-category">${ex.category}</span>
        ${pr ? `<div class="exercise-pr-badge"><i class="fa-solid fa-trophy"></i> Max: ${pr.maxWeight} kg | 1RM: ${pr.max1RM} kg</div>` : ''}
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        ${activeWorkout ? `
          <button class="btn-add-exercise-to-workout" data-ex-id="${ex.id}" title="Zum aktiven Training hinzufügen">
            <i class="fa-solid fa-plus"></i>
          </button>
        ` : ''}
        ${!forSelectionModal ? `
          <button class="btn-edit-exercise" data-ex-id="${ex.id}" data-ex-name="${ex.name}" data-ex-category="${ex.category}" title="Übung bearbeiten" style="background: none; border: none; color: var(--accent-secondary); font-size: 1.1rem; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 32px; width: 32px; border-radius: 50%;">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        ` : ''}
        ${isCustom && !forSelectionModal ? `
          <button class="btn-delete-custom-ex" data-ex-id="${ex.id}" title="Eigene Übung löschen">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : ''}
      </div>
    `;

    container.appendChild(item);
  });
}

/**
 * Render Profile synchronisation state View
 */
export function uiRenderProfile(user, loggedInEl, loggedOutEl, emailEl, errorEl) {
  if (!loggedInEl || !loggedOutEl) return;

  if (user) {
    loggedInEl.style.display = 'block';
    loggedOutEl.style.display = 'none';
    if (emailEl) emailEl.textContent = user.email || 'Angemeldet';
  } else {
    loggedInEl.style.display = 'none';
    loggedOutEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
  }
}

/**
 * Update Rest Timer circular progress and time text
 */
export function uiUpdateRestTimer(timeLeft, totalDuration, exerciseName) {
  if (!DOM.restTimerTitle || !DOM.restTimerTime || !DOM.restTimerCircleProgress) return;

  DOM.restTimerTitle.textContent = exerciseName ? `Pause - ${exerciseName}` : 'Pause';

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  DOM.restTimerTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const percent = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const offset = 283 * (1 - percent);
  DOM.restTimerCircleProgress.style.strokeDashoffset = offset;
}

