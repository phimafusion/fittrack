/**
 * timer.js
 * Controller for the workout Rest Timer (Pausen-Timer) with Web Audio API alerts.
 */

import { DOM, uiUpdateRestTimer } from './ui.js';
import { showToast } from './toast.js';

let timerInterval = null;
let timeLeft = 0;
let totalDuration = 0;
let endTime = 0; // Absolute timestamp for when the timer should end
let currentExerciseName = '';
let audioCtx = null;

const DEFAULT_REST_DURATION = 90; // Default: 90 seconds

/**
 * Get the user's default rest duration preference
 */
export function getDefaultRestDuration() {
  const stored = localStorage.getItem('rest_timer_default');
  return stored ? parseInt(stored, 10) : DEFAULT_REST_DURATION;
}

/**
 * Set the user's default rest duration preference
 */
export function setDefaultRestDuration(seconds) {
  if (seconds > 0) {
    localStorage.setItem('rest_timer_default', seconds.toString());
  }
}

/**
 * Initialize Web Audio Context safely on user interaction
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Play a premium double-beep sound using the Web Audio API
 */
export function playBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const now = ctx.currentTime;
    
    // First high-pitched beep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5 note
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.15);
    
    // Second high-pitched beep (double tone)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.2);
    gain2.gain.setValueAtTime(0.15, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.start(now + 0.2);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.warn('Web Audio API beep failed:', e);
  }
}

/**
 * Format seconds into MM:SS display format
 */
export function formatTimerTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Close and hide the rest timer overlay with slide-down animation
 */
export function hideRestTimerOverlay() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  const overlay = document.getElementById('rest-timer-overlay');
  if (overlay) {
    overlay.classList.add('closing');
    
    // Wait for the slide-down animation to finish
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('closing');
    }, 300);
  }
}

/**
 * Start the rest timer countdown
 */
export function startRestTimer(durationSeconds, exerciseName = '') {
  // If a timer is already running, clear it first
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Pre-initialize audio context on user interaction event
  getAudioContext();

  timeLeft = durationSeconds;
  totalDuration = durationSeconds;
  endTime = Date.now() + (durationSeconds * 1000);
  currentExerciseName = exerciseName;

  const overlay = document.getElementById('rest-timer-overlay');
  if (overlay) {
    overlay.style.display = 'block';
  }

  // Initial update
  uiUpdateRestTimer(timeLeft, totalDuration, currentExerciseName);

  timerInterval = setInterval(() => {
    // Calculate precise time left using absolute timestamps
    timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      
      // Visual feedback and beep
      playBeep();
      showToast('Pause beendet! Nächster Satz!', 'info');
      hideRestTimerOverlay();
    } else {
      uiUpdateRestTimer(timeLeft, totalDuration, currentExerciseName);
    }
  }, 1000);
}

/**
 * Adjust the active timer duration by adding or subtracting seconds
 */
export function adjustRestTimer(seconds) {
  if (!timerInterval && timeLeft <= 0) return;

  // Adjust absolute end time
  endTime += (seconds * 1000);
  
  // Recompute time left immediately
  timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  
  // Also adjust total duration if timeLeft exceeds totalDuration
  if (timeLeft > totalDuration) {
    totalDuration = timeLeft;
  }

  if (timeLeft === 0) {
    // Immediate timeout
    clearInterval(timerInterval);
    timerInterval = null;
    playBeep();
    showToast('Pause beendet!', 'info');
    hideRestTimerOverlay();
  } else {
    uiUpdateRestTimer(timeLeft, totalDuration, currentExerciseName);
  }
}

/**
 * Force an immediate UI update (useful when app wakes from background)
 */
export function forceTimerSync() {
  if (timerInterval && endTime > 0) {
    timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      playBeep();
      showToast('Pause beendet! Nächster Satz!', 'info');
      hideRestTimerOverlay();
    } else {
      uiUpdateRestTimer(timeLeft, totalDuration, currentExerciseName);
    }
  }
}

/**
 * Get active rest timer state (useful for tests)
 */
export function getRestTimerState() {
  return {
    isActive: timerInterval !== null,
    timeLeft,
    totalDuration,
    exerciseName: currentExerciseName
  };
}
