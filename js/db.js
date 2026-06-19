/**
 * db.js
 * Database and storage persistence layer using LocalStorage and Firebase Firestore.
 */

import { getCurrentUser, firebaseReady } from './auth.js';

// Default exercise database (German localization)
const DEFAULT_EXERCISES = [
  { id: 'bench_press', name: 'Bankdrücken', category: 'Brust' },
  { id: 'incline_dumbbells', name: 'Schrägbankdrücken Kurzhantel', category: 'Brust' },
  { id: 'chest_fly', name: 'Fliegende Bewegung (Brust)', category: 'Brust' },
  { id: 'squats', name: 'Kniebeugen', category: 'Beine' },
  { id: 'leg_press', name: 'Beinpresse', category: 'Beine' },
  { id: 'leg_extension', name: 'Beinstrecker', category: 'Beine' },
  { id: 'leg_curl', name: 'Beinbeuger', category: 'Beine' },
  { id: 'deadlift', name: 'Kreuzheben', category: 'Rücken' },
  { id: 'pullups', name: 'Klimmzüge', category: 'Rücken' },
  { id: 'lat_pulldown', name: 'Latzug', category: 'Rücken' },
  { id: 'barbell_row', name: 'Langhantelrudern', category: 'Rücken' },
  { id: 'overhead_press', name: 'Überkopfdrücken (OHP)', category: 'Schultern' },
  { id: 'lateral_raise', name: 'Seitheben', category: 'Schultern' },
  { id: 'bicep_curl', name: 'Bizeps-Curl Kurzhantel', category: 'Arme' },
  { id: 'hammer_curl', name: 'Hammer-Curls', category: 'Arme' },
  { id: 'tricep_pushdown', name: 'Trizeps-Pushdown Seil', category: 'Arme' },
  { id: 'skull_crusher', name: 'Skull Crusher', category: 'Arme' },
  { id: 'plank', name: 'Plank (Unterarmstütz)', category: 'Bauch' },
  { id: 'crunches', name: 'Crunches', category: 'Bauch' }
];

// Firebase Firestore instance
let dbFirestore = null;
const isBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

// Asynchronously initialize Firestore once Firebase ready promise resolves
if (isBrowserEnv) {
  firebaseReady.then(() => {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      try {
        dbFirestore = firebase.firestore();
        // Enable offline cache persistence
        dbFirestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
          if (err.code === 'failed-precondition') {
            console.warn('Firestore Offline-Cache: Mehrere Tabs offen, Cache deaktiviert.');
          } else if (err.code === 'unimplemented') {
            console.warn('Firestore Offline-Cache: Browser unterstützt IndexedDB nicht.');
          }
        });
        console.log('[DB] Firestore initialized successfully.');
      } catch (e) {
        console.error('Firestore initialization failed:', e);
      }
    }
  });
}

// Memory cache initialized from local storage for instant offline loading
let cachedExercises = [];
let cachedWorkouts = [];

// Track active Firestore subscription unsubscribes
let exercisesUnsubscribe = null;
let workoutsUnsubscribe = null;

// Initialize localStorage keys if they don't exist and run local translation migrations
export function initDB() {
  const isMigrated = localStorage.getItem('db_migrated_v3') === 'true';

  if (!isMigrated) {
    const catMap = {
      'chest': 'Brust',
      'legs': 'Beine',
      'back': 'Rücken',
      'shoulders': 'Schultern',
      'arms': 'Arme',
      'core': 'Bauch',
      'abs': 'Bauch'
    };

    const nameMap = {
      'bench press': 'Bankdrücken',
      'incline dumbbell press': 'Schrägbankdrücken Kurzhantel',
      'chest fly': 'Fliegende Bewegung (Brust)',
      'barbell squats': 'Kniebeugen',
      'squats': 'Kniebeugen',
      'leg press': 'Beinpresse',
      'leg extension': 'Beinstrecker',
      'leg curl': 'Beinbeuger',
      'deadlift': 'Kreuzheben',
      'pullups': 'Klimmzüge',
      'lat pulldown': 'Latzug',
      'barbell row': 'Langhantelrudern',
      'overhead press': 'Überkopfdrücken (OHP)',
      'lateral raise': 'Seitheben',
      'bicep curl': 'Bizeps-Curl Kurzhantel',
      'hammer curl': 'Hammer-Curls',
      'tricep pushdown': 'Trizeps-Pushdown Seil',
      'skull crusher': 'Skull Crusher',
      'plank': 'Plank (Unterarmstütz)',
      'crunches': 'Crunches'
    };

    const stored = localStorage.getItem('exercises');
    if (stored) {
      // Migrate: preserve custom exercises, update default ones to German
      try {
        const current = JSON.parse(stored);
        const oldDefaultIds = new Set([
          'bench_press', 'incline_dumbbells', 'chest_fly', 'squats', 'barbell_squats',
          'leg_press', 'leg_extension', 'leg_curl', 'deadlift', 'pullups',
          'lat_pulldown', 'barbell_row', 'overhead_press', 'lateral_raise',
          'bicep_curl', 'hammer_curl', 'tricep_pushdown', 'skull_crusher',
          'plank', 'crunches'
        ]);
        
        const custom = current.filter(ex => !oldDefaultIds.has(ex.id));
        custom.forEach(ex => {
          const catLower = (ex.category || '').toLowerCase();
          if (catMap[catLower]) {
            ex.category = catMap[catLower];
          }
        });
        const merged = [...DEFAULT_EXERCISES, ...custom];
        localStorage.setItem('exercises', JSON.stringify(merged));
      } catch (e) {
        console.error('Failed to parse stored exercises, resetting defaults', e);
        localStorage.setItem('exercises', JSON.stringify(DEFAULT_EXERCISES));
      }
    }

    const storedWorkouts = localStorage.getItem('workouts');
    if (storedWorkouts) {
      try {
        const workouts = JSON.parse(storedWorkouts);
        let updated = false;
        workouts.forEach(w => {
          const nameLower = (w.name || '').toLowerCase();
          if (nameLower === 'workout' || nameLower === 'training') {
            w.name = 'Training';
            updated = true;
          } else if (nameLower.includes('morning workout')) {
            w.name = w.name.replace(/morning workout/gi, 'Morgendliches Training');
            updated = true;
          } else if (nameLower.includes('afternoon workout')) {
            w.name = w.name.replace(/afternoon workout/gi, 'Nachmittagstraining');
            updated = true;
          } else if (nameLower.includes('evening workout')) {
            w.name = w.name.replace(/evening workout/gi, 'Abendtraining');
            updated = true;
          } else if (nameLower.includes('night workout')) {
            w.name = w.name.replace(/night workout/gi, 'Nachttraining');
            updated = true;
          }

          if (w.exercises) {
            w.exercises.forEach(ex => {
              const exNameLower = (ex.name || '').toLowerCase();
              if (nameMap[exNameLower]) {
                ex.name = nameMap[exNameLower];
                updated = true;
              }
              const catLower = (ex.category || '').toLowerCase();
              if (catMap[catLower]) {
                ex.category = catMap[catLower];
                updated = true;
              }
            });
          }
        });
        if (updated) {
          localStorage.setItem('workouts', JSON.stringify(workouts));
        }
      } catch (e) {
        console.error('Failed to migrate workout history', e);
      }
    }

    localStorage.setItem('db_migrated_v3', 'true');
  }

  // Ensure items are initialized if completely missing
  if (!localStorage.getItem('exercises')) {
    localStorage.setItem('exercises', JSON.stringify(DEFAULT_EXERCISES));
  }
  if (!localStorage.getItem('workouts')) {
    localStorage.setItem('workouts', JSON.stringify([]));
  }

  // Load from local storage into memory cache initially
  cachedExercises = JSON.parse(localStorage.getItem('exercises')) || [...DEFAULT_EXERCISES];
  cachedWorkouts = JSON.parse(localStorage.getItem('workouts')) || [];
}

// Call initialization immediately
initDB();

/**
 * Real-time Firestore sync setup for authenticated user
 */
export function syncDatabaseWithFirebase(user) {
  // Clear any existing active listeners
  if (exercisesUnsubscribe) {
    exercisesUnsubscribe();
    exercisesUnsubscribe = null;
  }
  if (workoutsUnsubscribe) {
    workoutsUnsubscribe();
    workoutsUnsubscribe = null;
  }

  // Wait for Firebase to finish initializing before setting up collection listeners
  firebaseReady.then(() => {
    if (!dbFirestore || !user) {
      // Logged out / guest mode: fall back to LocalStorage
      initDB();
      window.dispatchEvent(new CustomEvent('db-updated'));
      return;
    }

    // 1. Sync Exercises
    exercisesUnsubscribe = dbFirestore.collection('users').doc(user.uid).collection('exercises')
      .onSnapshot(snapshot => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (list.length === 0) {
          // First time initialization in the cloud: upload German defaults
          DEFAULT_EXERCISES.forEach(ex => {
            dbFirestore.collection('users').doc(user.uid).collection('exercises').doc(ex.id).set(ex);
          });
          cachedExercises = [...DEFAULT_EXERCISES];
        } else {
          cachedExercises = list;
        }
        localStorage.setItem('exercises', JSON.stringify(cachedExercises));
        window.dispatchEvent(new CustomEvent('db-updated'));
      }, err => {
        console.error('Firestore exercises sync error:', err);
      });

    // 2. Sync Workouts
    workoutsUnsubscribe = dbFirestore.collection('users').doc(user.uid).collection('workouts')
      .orderBy('date', 'desc')
      .onSnapshot(snapshot => {
        cachedWorkouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localStorage.setItem('workouts', JSON.stringify(cachedWorkouts));
        window.dispatchEvent(new CustomEvent('db-updated'));
      }, err => {
        console.error('Firestore workouts sync error:', err);
      });
  });
}

/**
 * Merge local guest workouts and custom exercises to cloud profile on sign-in
 */
export async function mergeLocalDataToCloud(uid) {
  await firebaseReady;
  if (!dbFirestore || !uid) return;

  try {
    // 1. Merge exercises (only custom ones)
    const localExercises = JSON.parse(localStorage.getItem('exercises')) || [];
    const oldDefaultIds = new Set([
      'bench_press', 'incline_dumbbells', 'chest_fly', 'squats', 'barbell_squats',
      'leg_press', 'leg_extension', 'leg_curl', 'deadlift', 'pullups',
      'lat_pulldown', 'barbell_row', 'overhead_press', 'lateral_raise',
      'bicep_curl', 'hammer_curl', 'tricep_pushdown', 'skull_crusher',
      'plank', 'crunches'
    ]);
    const customExercises = localExercises.filter(ex => !oldDefaultIds.has(ex.id));
    
    for (const ex of customExercises) {
      await dbFirestore.collection('users').doc(uid).collection('exercises').doc(ex.id).set(ex);
    }

    // 2. Merge workouts
    const localWorkouts = JSON.parse(localStorage.getItem('workouts')) || [];
    for (const w of localWorkouts) {
      await dbFirestore.collection('users').doc(uid).collection('workouts').doc(w.id).set(w);
    }

    console.log('Local guest data merged to Firebase Cloud successfully.');
  } catch (error) {
    console.error('Failed to merge local data to Firebase Cloud:', error);
  }
}

/**
 * Fetch all available exercises (returns cached memory representation immediately)
 */
export function getExercises() {
  return cachedExercises.length > 0 ? cachedExercises : DEFAULT_EXERCISES;
}

/**
 * Add a new custom exercise
 */
export function addExercise(name, category) {
  if (!name || !category) return null;
  
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
  const newEx = { id, name, category };

  const user = getCurrentUser();
  if (dbFirestore && user) {
    dbFirestore.collection('users').doc(user.uid).collection('exercises').doc(id).set(newEx)
      .catch(err => console.error('Firestore save custom exercise failed:', err));
  } else {
    // Guest fallback
    cachedExercises.push(newEx);
    localStorage.setItem('exercises', JSON.stringify(cachedExercises));
    window.dispatchEvent(new CustomEvent('db-updated'));
  }

  return newEx;
}

/**
 * Update an existing exercise
 */
export function updateExercise(id, name, category) {
  if (!id || !name || !category) return null;
  
  const updatedEx = { id, name, category };

  const user = getCurrentUser();
  if (dbFirestore && user) {
    dbFirestore.collection('users').doc(user.uid).collection('exercises').doc(id).set(updatedEx)
      .catch(err => console.error('Firestore update custom exercise failed:', err));
  } else {
    // Guest fallback
    const index = cachedExercises.findIndex(ex => ex.id === id);
    if (index !== -1) {
      cachedExercises[index] = updatedEx;
    } else {
      cachedExercises.push(updatedEx);
    }
    localStorage.setItem('exercises', JSON.stringify(cachedExercises));
    window.dispatchEvent(new CustomEvent('db-updated'));
  }

  // Propagate edit to history (all past workouts)
  let historyUpdatedCount = 0;
  const workouts = getWorkouts();
  workouts.forEach(w => {
    let workoutChanged = false;
    if (w.exercises) {
      w.exercises.forEach(ex => {
        if (ex.id === id) {
          ex.name = name;
          ex.category = category;
          workoutChanged = true;
        }
      });
    }
    if (workoutChanged) {
      historyUpdatedCount++;
      if (dbFirestore && user) {
        dbFirestore.collection('users').doc(user.uid).collection('workouts').doc(w.id).set(w)
          .catch(err => console.error('Firestore history propagation failed:', err));
      }
    }
  });
  
  if (historyUpdatedCount > 0) {
    localStorage.setItem('workouts', JSON.stringify(workouts));
    window.dispatchEvent(new CustomEvent('db-updated'));
  }

  return { updatedEx, historyUpdatedCount };
}

/**
 * Delete an exercise
 */
export function deleteExercise(id) {

  const user = getCurrentUser();
  if (dbFirestore && user) {
    dbFirestore.collection('users').doc(user.uid).collection('exercises').doc(id).delete()
      .catch(err => console.error('Firestore delete custom exercise failed:', err));
  } else {
    // Guest fallback
    cachedExercises = cachedExercises.filter(ex => ex.id !== id);
    localStorage.setItem('exercises', JSON.stringify(cachedExercises));
    window.dispatchEvent(new CustomEvent('db-updated'));
  }

  return true;
}

/**
 * Fetch all completed workouts (returns cached memory representation immediately)
 */
export function getWorkouts() {
  return cachedWorkouts;
}

/**
 * Save a new workout to history
 */
export function saveWorkout(workout) {
  if (!workout) return;
  workout.id = workout.id || 'wo_' + Date.now();
  workout.date = workout.date || new Date().toISOString();

  const user = getCurrentUser();
  if (dbFirestore && user) {
    dbFirestore.collection('users').doc(user.uid).collection('workouts').doc(workout.id).set(workout)
      .catch(err => console.error('Firestore save workout failed:', err));
  } else {
    // Guest fallback
    cachedWorkouts.unshift(workout);
    localStorage.setItem('workouts', JSON.stringify(cachedWorkouts));
    window.dispatchEvent(new CustomEvent('db-updated'));
  }

  return workout;
}

/**
 * Delete a completed workout from history
 */
export function deleteWorkout(id) {
  const user = getCurrentUser();
  if (dbFirestore && user) {
    dbFirestore.collection('users').doc(user.uid).collection('workouts').doc(id).delete()
      .catch(err => console.error('Firestore delete workout failed:', err));
  } else {
    // Guest fallback
    cachedWorkouts = cachedWorkouts.filter(w => w.id !== id);
    localStorage.setItem('workouts', JSON.stringify(cachedWorkouts));
    window.dispatchEvent(new CustomEvent('db-updated'));
  }
}

/**
 * Update an existing workout in history
 */
export function updateWorkout(updatedWorkout) {
  if (!updatedWorkout || !updatedWorkout.id) return null;

  const user = getCurrentUser();
  if (dbFirestore && user) {
    dbFirestore.collection('users').doc(user.uid).collection('workouts').doc(updatedWorkout.id).set(updatedWorkout)
      .catch(err => console.error('Firestore update workout failed:', err));
    return updatedWorkout;
  } else {
    // Guest fallback
    const index = cachedWorkouts.findIndex(w => w.id === updatedWorkout.id);
    if (index !== -1) {
      cachedWorkouts[index] = updatedWorkout;
      localStorage.setItem('workouts', JSON.stringify(cachedWorkouts));
      window.dispatchEvent(new CustomEvent('db-updated'));
      return updatedWorkout;
    }
  }
  return null;
}

/**
 * Calculate Personal Records dynamically from history
 * Returns a map: { [exerciseId]: { maxWeight: number, max1RM: number } }
 */
export function getPersonalRecords() {
  const prs = {};
  const workouts = getWorkouts();
  
  workouts.forEach(w => {
    if (!w.exercises) return;
    
    w.exercises.forEach(ex => {
      if (!ex.id || !ex.sets) return;
      
      ex.sets.forEach(set => {
        // Only consider sets that were either explicitly completed or have actual values
        if (set.completed || (set.weight > 0 && set.reps > 0)) {
          const wgt = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          
          if (wgt > 0 && reps > 0) {
            // Epley Formula for 1RM: Weight * (1 + Reps/30)
            const calculated1RM = Math.round((wgt * (1 + reps / 30)) * 10) / 10; // Round to 1 decimal
            
            if (!prs[ex.id]) {
              prs[ex.id] = { maxWeight: wgt, max1RM: calculated1RM };
            } else {
              if (wgt > prs[ex.id].maxWeight) prs[ex.id].maxWeight = wgt;
              if (calculated1RM > prs[ex.id].max1RM) prs[ex.id].max1RM = calculated1RM;
            }
          }
        }
      });
    });
  });
  
  return prs;
}
