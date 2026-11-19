import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { ModeSwitch } from '../components/ModeSwitch';
import { ProjectDialog } from '../components/ProjectDialog';
import { profile } from '../data/profile';
import { projects } from '../data/projects';
import type { Project } from '../data/projects';
import { useMode } from '../mode';
import { CommandPalette } from './CommandPalette';
import type { Command } from './CommandPalette';
import { Hero } from './Hero';
import { finePointer, prefersReducedMotion } from './hooks';
import { CaseStudy, Contact, Footer, Marquee, Skills, Timeline } from './Sections';
import { TypeGame } from './TypeGame';
import { Work } from './Work';
import './fancy.css';

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&display=swap';

const NAV = [
  { href: '#work', label: 'Work' },
  { href: '#experience', label: 'Experience' },
  { href: '#projects', label: 'Projects' },
  { href: '#play', label: 'Play' },
  { href: '#contact', label: 'Contact' },
];

function useExtraFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);
}

/** Fades sections in as they enter the viewport. */
function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const items = node.querySelectorAll<HTMLElement>('[data-reveal]');
    if (prefersReducedMotion()) { items.forEach(item => { item.dataset.in = ''; }); return; }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.in = ''; observer.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    items.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, [root]);
}

/** Scroll progress bar, hide-on-scroll header, and the active nav link. */
function useScrollState() {
  const [hidden, setHidden] = useState(false);
  const [section, setSection] = useState('');
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressRef.current?.style.setProperty('--scroll', String(max > 0 ? y / max : 0));
      if (Math.abs(y - lastY) > 6) { setHidden(y > lastY && y > 320); lastY = y; }
      let current = '';
      for (const { href } of NAV) {
        const el = document.querySelector(href);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) current = href;
      }
      setSection(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return { hidden, section, progressRef };
}

function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !finePointer() || prefersReducedMotion()) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 3, tx = x, ty = y, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    const move = (event: PointerEvent) => {
      tx = event.clientX; ty = event.clientY;
      node.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className="fx-cursor" aria-hidden="true" />;
}

export function FancyApp() {
  useExtraFonts();
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);
  const { hidden, section, progressRef } = useScrollState();
  const { switchMode } = useMode();
  const [selected, setSelected] = useState<Project | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      showToast('Email copied to clipboard ✓');
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  }, [showToast]);

  const go = (hash: string) => document.querySelector(hash)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  const commands = useMemo<Command[]>(() => [
    { id: 'top', group: 'Navigate', label: 'Home', hint: '↑', run: () => go('#top') },
    ...NAV.map(item => ({ id: item.href.slice(1), group: 'Navigate', label: item.label, hint: item.href, run: () => go(item.href) })),
    { id: 'skills', group: 'Navigate', label: 'Skills & education', hint: '#about', run: () => go('#about') },
    { id: 'copy', group: 'Actions', label: 'Copy email address', hint: profile.email, run: () => { void copyEmail(); } },
    { id: 'resume', group: 'Actions', label: 'Open résumé (PDF)', run: () => window.open(profile.resume, '_blank', 'noopener') },
    { id: 'github', group: 'Actions', label: 'Open GitHub', run: () => window.open(profile.github, '_blank', 'noopener') },
    { id: 'linkedin', group: 'Actions', label: 'Open LinkedIn', run: () => window.open(profile.linkedin, '_blank', 'noopener') },
    { id: 'simple', group: 'Actions', label: 'Switch to the simple version', run: () => switchMode('simple') },
    ...projects.map(project => ({ id: `p-${project.name}`, group: 'Projects', label: project.name, hint: project.label.toLowerCase(), run: () => setSelected(project) })),
  ], [copyEmail, switchMode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
        return;
      }
      const target = event.target as HTMLElement;
      const typing = target.closest('input, textarea, [contenteditable="true"]');
      if (event.key === '/' && !typing && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        go('#projects');
        document.querySelector<HTMLInputElement>('.fx-search input')?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  return (
    <div className="fx" ref={rootRef}>
      <a className="fx-skip" href="#fx-main">Skip to content</a>
      <div className="fx-progress" ref={progressRef} aria-hidden="true" />
      <div className="fx-grain" aria-hidden="true" />
      <CursorGlow />

      <header className={`fx-header ${hidden && !paletteOpen ? 'is-hidden' : ''}`}>
        <a className="fx-brand" href="#top">
          <img src={`${import.meta.env.BASE_URL}assets/profile-image.jpeg`} alt="" />
          <span>Phurin<em>.</em></span>
        </a>
        <nav aria-label="Main navigation" className="fx-nav">
          {NAV.map(item => <a key={item.href} href={item.href} aria-current={section === item.href ? 'location' : undefined}>{item.label}</a>)}
        </nav>
        <div className="fx-header-actions">
          <button type="button" className="fx-kbd-btn" onClick={() => setPaletteOpen(true)} aria-label="Open command menu" aria-haspopup="dialog">
            <span className="fx-kbd-label"><kbd>{isMac ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd></span>
            <span className="fx-menu-icon" aria-hidden="true"><i /><i /></span>
          </button>
          <ModeSwitch />
        </div>
      </header>

      <main id="fx-main">
        <Hero />
        <Marquee />
        <CaseStudy />
        <Timeline />
        <Work onOpen={setSelected} />
        <TypeGame />
        <Skills />
        <Contact onCopyEmail={() => { void copyEmail(); }} />
      </main>
      <Footer />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      {selected && <ProjectDialog key={selected.name} project={selected} onClose={() => setSelected(null)} />}
      <div className="fx-toast-region" role="status" aria-live="polite">
        {toast && <p key={toast.id} className="fx-toast">{toast.text}</p>}
      </div>
    </div>
  );
}
