import { useEffect, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { hasSeenFancy, loadFancy, markFancySeen, useMode } from '../mode';

/** A callout under the mode switch inviting first-time viewers to try the fancy version. */
export function FancyNudge() {
  const { switchMode } = useMode();
  const [visible, setVisible] = useState(false);


  useEffect(() => {
    if (hasSeenFancy()) return;
    setVisible(true);
    void loadFancy(); // Warm the bundle so the switch is instant.
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  const dismiss = () => { markFancySeen(); setVisible(false); };
  const tryIt = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setVisible(false);
    switchMode('fancy', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  if (!visible) return null;
  return (
    <>
      <button type="button" className="fancy-nudge" onClick={tryIt} aria-label="Try the fancy version">
        <span className="fn-burst" aria-hidden="true">
          <i className="fn-ring" /><i className="fn-ring fn-ring-2" />
          {Array.from({ length: 10 }, (_, i) => <b key={i} style={{ '--a': `${i * 36}deg`, '--d': `${3.2 + (i % 3) * .6}rem` } as CSSProperties}>✦</b>)}
        </span>
        Try this! <span aria-hidden="true">✦</span>
      </button>
    </>
  );
}
