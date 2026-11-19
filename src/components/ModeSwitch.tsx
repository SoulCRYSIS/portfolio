import type { MouseEvent } from 'react';
import { loadFancy, useMode } from '../mode';
import type { Mode } from '../mode';

const options: { value: Mode; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'fancy', label: 'Fancy' },
];

export function ModeSwitch({ className = '' }: { className?: string }) {
  const { mode, switchMode } = useMode();
  const choose = (value: Mode, event: MouseEvent<HTMLButtonElement>) => {
    if (value === mode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    switchMode(value, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <div className={`mode-switch ${className}`} role="group" aria-label="Site style" data-mode={mode} onPointerEnter={() => { void loadFancy(); }}>
      <span className="mode-switch-thumb" aria-hidden="true" />
      {options.map(option => (
        <button key={option.value} type="button" aria-pressed={mode === option.value} onFocus={() => { void loadFancy(); }} onClick={event => choose(option.value, event)}>
          {option.value === 'fancy' && <span aria-hidden="true" className="mode-switch-spark">✦</span>}
          {option.label}
        </button>
      ))}
    </div>
  );
}
