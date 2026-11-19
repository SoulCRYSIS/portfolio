import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(pointer: fine)').matches;

/** True once the element has scrolled into view. */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = '0px 0px -10% 0px') {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
    }, { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, inView]);
  return inView;
}

const GLYPHS = '!<>-_\\/[]{}—=+*^?#ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

/** Decodes `text` from random glyphs, one character at a time. */
export function useScramble(text: string, { delay = 0, speed = 32 } = {}) {
  const [output, setOutput] = useState(() => (prefersReducedMotion() ? text : text.replace(/\S/g, ' ')));
  useEffect(() => {
    if (prefersReducedMotion()) { setOutput(text); return; }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      if (now < start) { raf = requestAnimationFrame(tick); return; }
      const revealed = Math.floor((now - start) / speed);
      const next = [...text].map((char, i) => {
        if (char === ' ' || i < revealed) return char;
        if (i > revealed + 6) return ' ';
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }).join('');
      setOutput(next);
      if (revealed <= text.length) raf = requestAnimationFrame(tick);
      else setOutput(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay, speed]);
  return output;
}

/** Eases a number from 0 to `target` once `active` becomes true. */
export function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) { setValue(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

/** Pulls an element toward the pointer while it hovers nearby. */
export function useMagnetic<T extends HTMLElement>(strength = 0.35) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !finePointer() || prefersReducedMotion()) return;
    const move = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      node.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    };
    const leave = () => { node.style.transform = ''; };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', leave);
    return () => { node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', leave); };
  }, [strength]);
  return ref;
}

/** Writes the pointer position inside each matching element to --mx / --my (for spotlight borders). */
export function useSpotlight<T extends HTMLElement>(selector: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !finePointer()) return;
    const move = (event: PointerEvent) => {
      root.querySelectorAll<HTMLElement>(selector).forEach(card => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    };
    root.addEventListener('pointermove', move);
    return () => root.removeEventListener('pointermove', move);
  }, [selector]);
  return ref;
}
