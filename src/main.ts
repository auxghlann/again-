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

export async function checkBackendConnectivity(): Promise<void> {
  try {
    const res = await getHealth();
    const isHealthy = res.status === 'healthy' || res.status === 'ok';
    setState({ backendConnected: isHealthy, healthData: res });
  } catch {
    setState({ backendConnected: false, healthData: null });
  }
}

// React to route changes and theme toggles
subscribe(() => {
  dispatchCurrentRoute();
});

// Bootstrap application
checkBackendConnectivity();
initRouter();
dispatchCurrentRoute();
