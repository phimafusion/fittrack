/**
 * toast.js
 * Toast notification service for FitTrack.
 */

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  else if (type === 'error') iconClass = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger browser layout repaint to start slide-in transition
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    
    // Clean up DOM node once fade transition finishes
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 3500);
}
