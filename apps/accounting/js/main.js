/**
 * Application Entry Point
 */
import { hydrateFromStorage } from './business/appState.js';
import { loadProgress } from './business/scoringEngine.js';
import { initEngine, importSessionState } from './accounting/engine.js';
import { loadSession } from './storage/localStorage.js';
import { initUI } from './presentation/ui.js';
import { hydrateTaxState } from './tax/taxState.js';
import { bindTaxUIEvents, initTaxModule } from './presentation/taxUI.js';

function bootstrap() {
  hydrateFromStorage();
  loadProgress();
  hydrateTaxState();

  const session = loadSession();
  const restored = session ? importSessionState(session) : false;
  if (!restored) {
    initEngine(1);
  }

  initUI({ restoredSession: restored ? session : null });

  bindTaxUIEvents();
  initTaxModule();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
