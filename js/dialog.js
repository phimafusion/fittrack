/**
 * dialog.js
 * Premium custom alert and confirmation modal service.
 * Replaces blocking native window.confirm() and window.alert() popups.
 */

export function showCustomAlert(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-dialog-modal');
    if (!modal) {
      // Graceful fallback for non-browser/test runner environments
      resolve(true);
      return;
    }

    const titleEl = document.getElementById('custom-dialog-title');
    const msgEl = document.getElementById('custom-dialog-message');
    const confirmBtn = document.getElementById('btn-custom-dialog-confirm');
    const cancelBtn = document.getElementById('btn-custom-dialog-cancel');

    titleEl.textContent = title;
    msgEl.textContent = message;

    // Configure as simple alert: hide cancel, show OK
    cancelBtn.style.display = 'none';
    confirmBtn.textContent = 'OK';
    confirmBtn.style.width = '100%';

    modal.classList.add('active');

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      modal.classList.remove('active');
    };

    confirmBtn.addEventListener('click', handleConfirm);
  });
}

export function showCustomConfirm(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-dialog-modal');
    if (!modal) {
      // Graceful fallback for test runner environments
      resolve(true);
      return;
    }

    const titleEl = document.getElementById('custom-dialog-title');
    const msgEl = document.getElementById('custom-dialog-message');
    const confirmBtn = document.getElementById('btn-custom-dialog-confirm');
    const cancelBtn = document.getElementById('btn-custom-dialog-cancel');

    titleEl.textContent = title;
    msgEl.textContent = message;

    // Configure as confirmation: show both buttons
    cancelBtn.style.display = 'block';
    cancelBtn.style.width = '50%';
    confirmBtn.textContent = 'Ja';
    confirmBtn.style.width = '50%';

    modal.classList.add('active');

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.classList.remove('active');
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}
