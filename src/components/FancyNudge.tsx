import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { hasSeenFancy, loadFancy, markFancySeen, useMode } from '../mode';

/** A callout under the mode switch inviting first-time viewers to try the fancy version. */
export function FancyNudge() {
  const { switchMode } = useMode();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasSeenFancy()) return;
    const timer = window.setTimeout(() => {
      setVisible(true);
      void loadFancy(); // Warm the bundle so "Show me" switches instantly.
    }, 2500);
    return () => clearTimeout(timer);
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
    <div className="fancy-nudge" role="dialog" aria-label="Try the fancy version" aria-modal="false">
      <p className="fancy-nudge-title"><span aria-hidden="true">✦</span> There’s a fancier version of this site</p>
      <p>An interactive hero, a 3D case study, a ⌘K menu and a small typing game. Same content, more frontend.</p>
      <div className="fancy-nudge-actions">
        <button type="button" className="fancy-nudge-go" onClick={tryIt}>Show me ✦</button>
        <button type="button" className="fancy-nudge-later" onClick={dismiss}>Maybe later</button>
      </div>
    </div>
  );
}
