import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { flushSync } from 'react-dom';
import { Header } from './components/Header';
import { Intro } from './components/Intro';
import { Experience } from './components/Experience';
import { SimsCaseStudy } from './components/SimsCaseStudy';
import { Projects } from './components/Projects';
import { About } from './components/About';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { ModeContext, initialMode, loadFancy, rememberMode } from './mode';
import type { Mode } from './mode';

function SimpleSite() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Intro />
        <SimsCaseStudy />
        <Experience />
        <Projects />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

const THEME_COLOR: Record<Mode, string> = { simple: '#f7f8f3', fancy: '#060d0a' };

export function App() {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [Fancy, setFancy] = useState<ComponentType | null>(null);

  // Load the fancy bundle if the page opens in fancy mode.
  useEffect(() => {
    if (mode === 'fancy' && !Fancy) void loadFancy().then(m => setFancy(() => m.FancyApp));
  }, [mode, Fancy]);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[mode]);
  }, [mode]);

  const switchMode = useCallback((next: Mode, origin?: { x: number; y: number }) => {
    rememberMode(next);
    const apply = async () => {
      const module = next === 'fancy' ? await loadFancy() : null;
      flushSync(() => {
        if (module) setFancy(() => module.FancyApp);
        setMode(next);
      });
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduceMotion) { void apply(); return; }

    const transition = document.startViewTransition(apply);
    const { x, y } = origin ?? { x: window.innerWidth - 80, y: 40 };
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.76, 0, .24, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => { /* transition skipped */ });
  }, []);

  const context = useMemo(() => ({ mode, switchMode }), [mode, switchMode]);

  return (
    <ModeContext.Provider value={context}>
      {mode === 'fancy' && Fancy ? <Fancy /> : mode === 'fancy' ? <div className="mode-loading" aria-busy="true" /> : <SimpleSite />}
    </ModeContext.Provider>
  );
}
