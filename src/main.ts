import './style.css';
import { getHealth } from './api';
import { initRouter } from './router';
import { getState, setState, subscribe } from './state';
import { renderPracticeCatalog } from './views/practiceCatalog';
import { renderCodeCatalog } from './views/codeCatalog';
import { renderQuizView } from './views/quizView';
import { renderPlanView } from './views/planView';
import { renderProblemView } from './views/problemView';
import {
  renderActivity,
  renderDashboard,
  renderNotFound,
  renderResources,
} from './views/auxViews';

const app = document.getElementById('app') as HTMLElement;

let lastRouteKey = '';

async function dispatchCurrentRoute(): Promise<void> {
  if (!app) return;

  const { activeRoute, routeParams } = getState();
  const routeKey = `${activeRoute}:${JSON.stringify(routeParams)}`;

  // Prevent redundant render if route hasn't changed
  if (routeKey === lastRouteKey) {
    return;
  }
  lastRouteKey = routeKey;

  switch (activeRoute) {
    case 'practice':
      await renderPracticeCatalog(app);
      break;
    case 'quiz':
      if (routeParams.id) {
        await renderQuizView(app, routeParams.id);
      } else {
        await renderPracticeCatalog(app);
      }
      break;
    case 'code':
      await renderCodeCatalog(app);
      break;
    case 'plan':
      if (routeParams.id) {
        await renderPlanView(app, routeParams.id);
      } else {
        await renderCodeCatalog(app);
      }
      break;
    case 'problem':
      if (routeParams.id) {
        await renderProblemView(app, routeParams.id);
      } else {
        await renderCodeCatalog(app);
      }
      break;
    case 'dashboard':
      renderDashboard(app);
      break;
    case 'activity':
      renderActivity(app);
      break;
    case 'resources':
      renderResources(app);
      break;
    default:
      renderNotFound(app);
      break;
  }
}

async function checkBackendConnectivity(): Promise<void> {
  try {
    const res = await getHealth();
    if (res.status === 'ok') {
      setState({ backendConnected: true });
    }
  } catch {
    setState({ backendConnected: false });
  }
}

// React to route changes and theme toggles
subscribe((state) => {
  // Update shell status indicators if present on DOM
  const statusDot = document.getElementById('shell-status-dot');
  if (statusDot) {
    statusDot.className = state.backendConnected
      ? 'w-2 h-2 rounded-full inline-block bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
      : 'w-2 h-2 rounded-full inline-block bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
  }
  const statusLabel = document.getElementById('shell-status-label');
  if (statusLabel) {
    statusLabel.textContent = state.backendConnected ? 'API Online' : 'API Offline';
  }

  dispatchCurrentRoute();
});

// Bootstrap application
checkBackendConnectivity();
initRouter();
dispatchCurrentRoute();
