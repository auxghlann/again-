import { setState } from './state';

export interface RouteMatch {
  name: string;
  params: Record<string, string>;
}

interface RoutePattern {
  name: string;
  regex: RegExp;
  paramNames: string[];
}

const routePatterns: RoutePattern[] = [
  {
    name: 'quiz',
    regex: /^#\/quiz\/([^/?#]+)$/,
    paramNames: ['id'],
  },
  {
    name: 'problem',
    regex: /^#\/problem\/([^/?#]+)$/,
    paramNames: ['id'],
  },
  {
    name: 'plan',
    regex: /^#\/(?:plans|code)\/([^/?#]+)$/,
    paramNames: ['id'],
  },
  {
    name: 'dashboard',
    regex: /^#\/dashboard\/?$/,
    paramNames: [],
  },
  {
    name: 'activity',
    regex: /^#\/activity\/?$/,
    paramNames: [],
  },
  {
    name: 'resources',
    regex: /^#\/resources\/?$/,
    paramNames: [],
  },
  {
    name: 'code',
    regex: /^#\/(?:code|plans)\/?$/,
    paramNames: [],
  },
  {
    name: 'practice',
    regex: /^#\/(?:practice)?\/?$/,
    paramNames: [],
  },
];

export function parseHash(hash: string): RouteMatch {
  const cleanHash = hash.trim() || '#/practice';

  for (const pattern of routePatterns) {
    const match = cleanHash.match(pattern.regex);
    if (match) {
      const params: Record<string, string> = {};
      pattern.paramNames.forEach((paramName, idx) => {
        params[paramName] = decodeURIComponent(match[idx + 1] || '');
      });
      return { name: pattern.name, params };
    }
  }

  // Fallback to default route
  return { name: 'practice', params: {} };
}

export function navigate(path: string): void {
  const normalized = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === normalized) {
    // Force dispatch if navigating to the same hash
    handleHashChange();
  } else {
    window.location.hash = normalized;
  }
}

function handleHashChange(): void {
  const match = parseHash(window.location.hash);
  setState({
    activeRoute: match.name,
    routeParams: match.params,
  });
}

export function initRouter(): void {
  window.addEventListener('hashchange', handleHashChange);
  // Ensure default hash is set if empty
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/practice';
  } else {
    handleHashChange();
  }
}
