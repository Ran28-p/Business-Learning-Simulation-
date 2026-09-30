/**
 * Presentation Layer – Modal dialogs
 */

/**
 * Shows the application modal with a title and HTML body content.
 * @param {string} title
 * @param {string} contentHTML
 */
export function showModal(title, contentHTML) {
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  const overlay = document.getElementById('modalAlert');

  if (titleEl) titleEl.innerText = title;
  if (bodyEl) bodyEl.innerHTML = contentHTML;
  if (overlay) overlay.classList.add('active');
}

/**
 * Closes the application modal.
 */
export function closeModal() {
  const overlay = document.getElementById('modalAlert');
  if (overlay) overlay.classList.remove('active');
}

/**
 * Shows a small, non-blocking toast notice (auto-dismisses). Used for
 * background events like "session restored" that shouldn't interrupt
 * the student with a modal dialog.
 * @param {string} message
 * @param {number} duration ms before it fades out
 */
export function showToast(message, duration = 4500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
  raf(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
