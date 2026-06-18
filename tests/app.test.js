/**
 * app.test.js
 * QUnit test suite for FitTrack database and application logic.
 */

import {
  initDB,
  getExercises,
  addExercise,
  deleteExercise,
  getWorkouts,
  saveWorkout,
  deleteWorkout,
  updateWorkout
} from '../js/db.js';

import {
  activeWorkout,
  startWorkout,
  cancelWorkout,
  finishWorkout,
  addExerciseToActiveWorkout,
  deleteExerciseFromWorkout,
  addSetToExercise,
  deleteSetFromExercise,
  toggleCompleteSet,
  formatDuration,
  editWorkout
} from '../js/app.js';

import {
  getRestTimerState,
  startRestTimer,
  adjustRestTimer,
  hideRestTimerOverlay
} from '../js/timer.js';

QUnit.module('FitTrack Test Suite', hooks => {

  // Isolate localStorage before and after each test
  hooks.beforeEach(() => {
    localStorage.clear();
    initDB();
  });

  hooks.afterEach(() => {
    localStorage.clear();
    initDB();
    hideRestTimerOverlay();
  });

  QUnit.module('Database and Storage (db.js)', () => {
    
    QUnit.test('Database Initialization', assert => {
      const exercises = getExercises();
      assert.ok(Array.isArray(exercises), 'Exercises should be an array');
      assert.ok(exercises.length > 10, 'Should load preloaded exercises list');
      
      const benchPress = exercises.find(e => e.id === 'bench_press');
      assert.ok(benchPress, 'Should contain Bench Press');
      assert.equal(benchPress.name, 'Bankdrücken', 'Exercise name match');
      assert.equal(benchPress.category, 'Brust', 'Exercise category match');
    });

    QUnit.test('Custom Exercise Addition', assert => {
      const initialCount = getExercises().length;
      const newEx = addExercise('Beinpresse schräg', 'Beine');
      
      assert.ok(newEx, 'Custom exercise should be returned');
      assert.equal(newEx.name, 'Beinpresse schräg', 'Name matches custom name');
      assert.equal(newEx.category, 'Beine', 'Category matches custom category');
      assert.ok(newEx.id, 'ID is generated');
      
      const exercises = getExercises();
      assert.equal(exercises.length, initialCount + 1, 'Exercises count increases by 1');
      assert.ok(exercises.some(e => e.id === newEx.id), 'Custom exercise is stored');
    });

    QUnit.test('Default Exercise Deletion Restraint', assert => {
      const result = deleteExercise('bench_press');
      assert.notOk(result, 'Deleting default exercise should return false');
      assert.ok(getExercises().some(e => e.id === 'bench_press'), 'Default exercise is preserved');
    });

    QUnit.test('Custom Exercise Deletion', assert => {
      const newEx = addExercise('Preacher Curls', 'Arme');
      const result = deleteExercise(newEx.id);
      
      assert.ok(result, 'Deleting custom exercise should return true');
      assert.notOk(getExercises().some(e => e.id === newEx.id), 'Custom exercise is removed');
    });

    QUnit.test('Completed Workout Logging & History Delete', assert => {
      const mockWorkout = {
        id: 'wo_qtest_1',
        name: 'Rückentraining',
        date: new Date().toISOString(),
        duration: 50,
        volume: 4500,
        exercises: [
          {
            id: 'pullups',
            name: 'Klimmzüge',
            category: 'Rücken',
            sets: [{ weight: 0, reps: 12, completed: true }]
          }
        ]
      };

      saveWorkout(mockWorkout);
      
      let workouts = getWorkouts();
      assert.equal(workouts.length, 1, 'Workout log saved');
      assert.equal(workouts[0].name, 'Rückentraining', 'Workout name matches');
      assert.equal(workouts[0].volume, 4500, 'Workout volume matches');
      
      deleteWorkout('wo_qtest_1');
      workouts = getWorkouts();
      assert.equal(workouts.length, 0, 'Workout log removed');
    });

    QUnit.test('Database Migration & Translation (v3)', assert => {
      // 1. Setup legacy English exercises & workouts in localStorage
      localStorage.clear();
      
      const legacyExercises = [
        { id: 'custom_biceps', name: 'Concentration Curls', category: 'arms' },
        { id: 'bench_press', name: 'bench press', category: 'chest' }
      ];
      localStorage.setItem('exercises', JSON.stringify(legacyExercises));

      const legacyWorkouts = [
        {
          id: 'wo_legacy_1',
          name: 'morning workout',
          exercises: [
            { id: 'bench_press', name: 'bench press', category: 'chest', sets: [] }
          ]
        }
      ];
      localStorage.setItem('workouts', JSON.stringify(legacyWorkouts));

      // Remove migration flag to force migration
      localStorage.removeItem('db_migrated_v3');

      // 2. Run initialization
      initDB();

      // 3. Verify exercises category translation (e.g., 'arms' -> 'Arme')
      const exercises = getExercises();
      const customEx = exercises.find(e => e.id === 'custom_biceps');
      assert.ok(customEx, 'Custom exercise preserved');
      assert.equal(customEx.category, 'Arme', 'Category migrated to German');

      // 4. Verify default exercises were reset/updated to defaults
      const bp = exercises.find(e => e.id === 'bench_press');
      assert.equal(bp.name, 'Bankdrücken', 'Default exercise name migrated');
      assert.equal(bp.category, 'Brust', 'Default exercise category migrated');

      // 5. Verify workouts translation
      const workouts = getWorkouts();
      assert.equal(workouts.length, 1, 'Workout preserved');
      assert.equal(workouts[0].name, 'Morgendliches Training', 'Workout name migrated');
      assert.equal(workouts[0].exercises[0].name, 'Bankdrücken', 'Workout exercise name migrated');
      assert.equal(workouts[0].exercises[0].category, 'Brust', 'Workout exercise category migrated');
    });
  });

  QUnit.module('Application Logic & Workouts (app.js)', () => {

    QUnit.test('Duration Formatter', assert => {
      assert.equal(formatDuration(25 * 1000), '00:25', 'Formats seconds');
      assert.equal(formatDuration((8 * 60 + 19) * 1000), '08:19', 'Formats minutes');
      assert.equal(formatDuration((3 * 3600 + 40 * 60 + 5) * 1000), '03:40:05', 'Formats hours');
    });

    QUnit.test('Workout State Lifecycle', assert => {
      // Mock window.confirm (since cancelWorkout triggers confirm prompt)
      const originalConfirm = window.confirm;
      window.confirm = () => true;

      startWorkout();
      assert.ok(localStorage.getItem('activeWorkout'), 'Workout state saved to storage');

      cancelWorkout();
      assert.notOk(localStorage.getItem('activeWorkout'), 'Workout state cleared from storage');

      window.confirm = originalConfirm;
    });

    QUnit.test('Set Operations in Active Workout', assert => {
      startWorkout();

      const deadlift = { id: 'deadlift', name: 'Kreuzheben', category: 'Rücken' };
      addExerciseToActiveWorkout(deadlift);

      let active = JSON.parse(localStorage.getItem('activeWorkout'));
      assert.equal(active.exercises.length, 1, 'Deadlift added to active workout');
      assert.equal(active.exercises[0].sets.length, 1, 'Default set created');

      // Add Set
      addSetToExercise(0);
      active = JSON.parse(localStorage.getItem('activeWorkout'));
      assert.equal(active.exercises[0].sets.length, 2, 'Second set added');

      // Toggle Set 1 Complete
      toggleCompleteSet(0, 0);
      active = JSON.parse(localStorage.getItem('activeWorkout'));
      assert.ok(active.exercises[0].sets[0].completed, 'Set 1 is completed');

      // Delete Set 2
      deleteSetFromExercise(0, 1);
      active = JSON.parse(localStorage.getItem('activeWorkout'));
      assert.equal(active.exercises[0].sets.length, 1, 'Set 2 removed');

      // Delete Exercise
      deleteExerciseFromWorkout(0);
      active = JSON.parse(localStorage.getItem('activeWorkout'));
      assert.equal(active.exercises.length, 0, 'Exercise removed');

      localStorage.removeItem('activeWorkout');
    });

    QUnit.test('Edit Workout Lifecycle', assert => {
      // 1. Create a workout and save to history
      const originalWorkout = {
        id: 'wo_edit_test',
        name: 'Originaler Trainingsname',
        date: new Date().toISOString(),
        duration: 40,
        volume: 1000,
        exercises: [
          { id: 'bench_press', name: 'Bankdrücken', category: 'Brust', sets: [{ weight: 50, reps: 10, completed: true }] }
        ]
      };
      saveWorkout(originalWorkout);

      // Verify it is in history
      let workouts = getWorkouts();
      assert.equal(workouts.length, 1);
      assert.equal(workouts[0].name, 'Originaler Trainingsname');

      // 2. Trigger editWorkout
      editWorkout(originalWorkout);

      // Verify it loads correctly into active state with isEditing flag
      let session = JSON.parse(localStorage.getItem('activeWorkout'));
      assert.ok(session.isEditing, 'activeWorkout is marked as editing');
      assert.equal(session.id, 'wo_edit_test', 'Keeps original ID');

      // 3. Make changes: change name, add a set
      addSetToExercise(0); // Add second set
      activeWorkout.name = 'Geänderter Trainingsname';
      activeWorkout.exercises[0].sets[1].weight = 60;
      activeWorkout.exercises[0].sets[1].reps = 8;
      activeWorkout.exercises[0].sets[1].completed = true;

      // 4. Finish/save the edited workout
      finishWorkout();

      // Verify the active state is cleared
      assert.notOk(localStorage.getItem('activeWorkout'), 'activeWorkout state cleared');

      // Verify history is updated in-place (still length 1, but updated)
      workouts = getWorkouts();
      assert.equal(workouts.length, 1, 'Still only 1 workout in history');
      assert.equal(workouts[0].name, 'Geänderter Trainingsname', 'Workout name updated');
      assert.equal(workouts[0].exercises[0].sets.length, 2, 'Sets count increased to 2');
      assert.equal(workouts[0].volume, 980, 'Volume recalculated correctly (50*10 + 60*8 = 980)');
    });
  });

  QUnit.module('Pausen-Timer (timer.js)', hooks => {
    hooks.afterEach(() => {
      hideRestTimerOverlay();
    });

    QUnit.test('Timer start on set completion', assert => {
      // 1. Start a mock workout and add exercise
      startWorkout();
      const deadlift = { id: 'deadlift', name: 'Kreuzheben', category: 'Rücken' };
      addExerciseToActiveWorkout(deadlift);

      // Verify timer is initially inactive
      let timerState = getRestTimerState();
      assert.notOk(timerState.isActive, 'Rest timer is not active initially');

      // 2. Toggle set 1 to complete
      toggleCompleteSet(0, 0);

      // Verify rest timer is started
      timerState = getRestTimerState();
      assert.ok(timerState.isActive, 'Rest timer started on set completion');
      assert.equal(timerState.exerciseName, 'Kreuzheben', 'Correct exercise name associated');
      assert.ok(timerState.timeLeft > 0, 'Time left is initialized');
    });

    QUnit.test('Timer adjustment (+30s / -30s)', assert => {
      startRestTimer(90, 'Bankdrücken');
      
      let state = getRestTimerState();
      assert.equal(state.timeLeft, 90, 'Initial time left is 90s');

      // Add 30 seconds
      adjustRestTimer(30);
      state = getRestTimerState();
      assert.equal(state.timeLeft, 120, 'Adjusted time left is 120s (+30s)');

      // Subtract 30 seconds
      adjustRestTimer(-30);
      state = getRestTimerState();
      assert.equal(state.timeLeft, 90, 'Adjusted time left is 90s (-30s)');
    });

    QUnit.test('Timer skip/dismissal', assert => {
      startRestTimer(60, 'Kniebeugen');
      
      let state = getRestTimerState();
      assert.ok(state.isActive, 'Timer is active');

      // Skip the timer
      hideRestTimerOverlay();
      state = getRestTimerState();
      assert.notOk(state.isActive, 'Timer is inactive after skip');
    });
  });
});

// Start QUnit manually after ES module registration
QUnit.start();
