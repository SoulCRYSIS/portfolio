import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery('');
      setCursor(0);
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return commands.filter(command => {
      const haystack = `${command.group} ${command.label}`.toLowerCase();
      return terms.every(term => haystack.includes(term));
    });
  }, [commands, query]);

  useEffect(() => { setCursor(0); }, [query]);
  useEffect(() => {
    dialogRef.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const run = (command?: Command) => {
    if (!command) return;
    onClose();
    // Let the dialog close before scrolling or opening another dialog.
    requestAnimationFrame(() => command.run());
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setCursor(c => (c + 1) % Math.max(1, results.length)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setCursor(c => (c - 1 + results.length) % Math.max(1, results.length)); }
    else if (event.key === 'Enter') { event.preventDefault(); run(results[cursor]); }
  };

  let lastGroup = '';
  return (
    <dialog ref={dialogRef} className="fx-palette" aria-label="Command menu" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="fx-palette-search">
        <span aria-hidden="true" className="fx-mono">⌘</span>
        <input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Jump to a section, open a project, copy my email…"
          role="combobox"
          aria-expanded="true"
          aria-controls="fx-palette-list"
          aria-activedescendant={results[cursor] ? `fx-cmd-${results[cursor].id}` : undefined}
          aria-label="Search commands"
        />
        <kbd>esc</kbd>
      </div>
      <ul id="fx-palette-list" role="listbox" aria-label="Commands">
        {results.map((command, index) => {
          const header = command.group !== lastGroup ? command.group : null;
          lastGroup = command.group;
          return (
            <li key={command.id} role="presentation">
              {header && <p className="fx-palette-group" aria-hidden="true">{header}</p>}
              <div
                id={`fx-cmd-${command.id}`}
                role="option"
                aria-selected={index === cursor}
                data-index={index}
                className="fx-palette-item"
                onPointerMove={() => setCursor(index)}
                onClick={() => run(command)}
              >
                <span>{command.label}</span>
                {command.hint && <span className="fx-mono">{command.hint}</span>}
              </div>
            </li>
          );
        })}
        {results.length === 0 && <li className="fx-palette-empty">No commands match “{query}”.</li>}
      </ul>
      <p className="fx-palette-foot fx-mono"><span>↑↓ navigate</span><span>↵ select</span><span>esc close</span></p>
    </dialog>
  );
}
