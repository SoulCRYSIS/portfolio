import { createContext, useContext } from 'react';

export type Mode = 'simple' | 'fancy';

const STORAGE_KEY = 'portfolio-mode';

export function initialMode(): Mode {
  try {
    const param = new URLSearchParams(window.location.search).get('mode');
    if (param === 'simple' || param === 'fancy') return param;
    return localStorage.getItem(STORAGE_KEY) === 'fancy' ? 'fancy' : 'simple';
  } catch {
    return 'simple';
  }
}

export function rememberMode(mode: Mode) {
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* storage unavailable */ }
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('mode')) {
      url.searchParams.delete('mode');
      history.replaceState(null, '', url);
    }
  } catch { /* ignore */ }
}

let fancyModule: Promise<typeof import('./fancy/FancyApp')> | null = null;
export const loadFancy = () => (fancyModule ??= import('./fancy/FancyApp'));

export interface ModeContextValue {
  mode: Mode;
  /** Switch modes. `origin` is the point the circular reveal grows from. */
  switchMode: (next: Mode, origin?: { x: number; y: number }) => void;
}

export const ModeContext = createContext<ModeContextValue>({ mode: 'simple', switchMode: () => {} });
export const useMode = () => useContext(ModeContext);
