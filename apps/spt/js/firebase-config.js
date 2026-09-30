/**
 * Firebase configuration & initialization for SPT Simulator.
 * Graceful offline fallback: app continues with localStorage if SDK unavailable.
 */
const firebaseConfig = window.PORTAL_FIREBASE_CONFIG;

window.firebaseReady = false;
try {
  firebase.initializeApp(firebaseConfig);
  window.firebaseReady = true;
} catch (e) {
  console.warn('Firebase SDK gagal diinisialisasi (kemungkinan sedang offline). App tetap berjalan dengan localStorage.', e);
}
