/**
 * Firebase configuration & initialization for SPT Simulator.
 * Graceful offline fallback: app continues with localStorage if SDK unavailable.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDFfCX8vsztmt7_B5WE8po2sxNIev-OqMU",
  authDomain: "simulator-spt-db.firebaseapp.com",
  projectId: "simulator-spt-db",
  storageBucket: "simulator-spt-db.firebasestorage.app",
  messagingSenderId: "104270461000",
  appId: "1:104270461000:web:ae700e02006544cb94807d",
  measurementId: "G-1T6RL183GP",
  databaseURL: "https://simulator-spt-db-default-rtdb.asia-southeast1.firebasedatabase.app"
};

window.firebaseReady = false;
try {
  firebase.initializeApp(firebaseConfig);
  window.firebaseReady = true;
} catch (e) {
  console.warn('Firebase SDK gagal diinisialisasi (kemungkinan sedang offline). App tetap berjalan dengan localStorage.', e);
}
