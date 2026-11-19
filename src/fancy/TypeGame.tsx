import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionHeading } from './Sections';

const WORDS = ['react', 'flutter', 'kotlin', 'bloc', 'hooks', 'state', 'render', 'commit', 'deploy', 'async', 'props', 'query', 'widget', 'canvas', 'pixel', 'layout', 'cache', 'fetch', 'stream', 'merge', 'build', 'debug', 'vite', 'node', 'fastify', 'algolia', 'sonar', 'melos', 'jenkins', 'typescript', 'firebase', 'refactor', 'suspense', 'reducer', 'context', 'effect', 'router', 'schema', 'lambda', 'pointer'];

interface Word { id: number; text: string; x: number; y: number; speed: number }
type Phase = 'idle' | 'playing' | 'over';

const LIVES = 3;
const BEST_KEY = 'fx-typegame-best';

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

export function TypeGame() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [words, setWords] = useState<Word[]>([]);
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [best, setBest] = useState(readBest);
  const [shake, setShake] = useState(0);
  const [pops, setPops] = useState<{ id: number; x: number; y: number; text: string }[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const state = useRef({ words: [] as Word[], nextId: 0, lastSpawn: 0, started: 0, lives: LIVES, score: 0, combo: 0 });

  const start = () => {
    state.current = { words: [], nextId: 0, lastSpawn: 0, started: performance.now(), lives: LIVES, score: 0, combo: 0 };
    setWords([]); setTyped(''); setScore(0); setCombo(0); setLives(LIVES); setPops([]);
    setPhase('playing');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const finish = useCallback(() => {
    setPhase('over');
    const final = state.current.score;
    setBest(prev => {
      if (final <= prev) return prev;
      try { localStorage.setItem(BEST_KEY, String(final)); } catch { /* ignore */ }
      return final;
    });
  }, []);

  // Game loop: spawn words, let them fall, and lose a life when one hits the floor.
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const s = state.current;
      const elapsed = (now - s.started) / 1000;
      const interval = Math.max(650, 1700 - elapsed * 22);
      if (now - s.lastSpawn > interval && s.words.length < 7) {
        s.lastSpawn = now;
        const used = new Set(s.words.map(w => w.text[0]));
        const pool = WORDS.filter(w => !used.has(w[0]));
        const text = (pool.length ? pool : WORDS)[Math.floor(Math.random() * (pool.length || WORDS.length))];
        s.words.push({ id: s.nextId++, text, x: 6 + Math.random() * 70, y: 0, speed: 0.000055 + Math.random() * 0.00003 + elapsed * 0.0000016 });
      }
      let missed = 0;
      s.words = s.words.filter(word => {
        word.y += word.speed * dt;
        if (word.y >= 1) { missed += 1; return false; }
        return true;
      });
      if (missed) {
        s.lives -= missed;
        setLives(Math.max(0, s.lives));
        s.combo = 0;
        setCombo(0);
        setShake(n => n + 1);
        if (s.lives <= 0) { setWords([]); finish(); return; }
      }
      setWords([...s.words]);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, finish]);

  const onType = (value: string) => {
    const next = value.toLowerCase().replace(/\s/g, '');
    const s = state.current;
    const candidates = s.words.filter(w => w.text.startsWith(next)).sort((a, b) => b.y - a.y);
    if (next && candidates.length === 0) {
      s.combo = 0;
      setTyped(''); setCombo(0); setShake(n => n + 1);
      return;
    }
    const hit = candidates.find(w => w.text === next);
    if (hit) {
      s.words = s.words.filter(w => w.id !== hit.id);
      setWords([...s.words]);
      s.combo += 1;
      const gained = hit.text.length * 10 * Math.min(5, 1 + Math.floor(s.combo / 4));
      s.score += gained;
      setCombo(s.combo);
      setScore(s.score);
      setPops(p => [...p.slice(-4), { id: hit.id, x: hit.x, y: hit.y, text: `+${gained}` }]);
      setTyped('');
      return;
    }
    setTyped(next);
  };

  const target = typed ? words.filter(w => w.text.startsWith(typed)).sort((a, b) => b.y - a.y)[0] : undefined;
  const multiplier = Math.min(5, 1 + Math.floor(combo / 4));

  return (
    <section id="play" className="fx-section fx-play" aria-labelledby="fx-play-title">
      <div className="fx-wrap">
        <SectionHeading index="04" kicker="Take a break" title={<span id="fx-play-title">Type <span className="fx-serif">fast</span></span>}>
          A tiny tribute to Caret Type. Type the falling words before they hit the floor.
        </SectionHeading>
        <div className={`fx-game ${phase === 'playing' ? 'is-playing' : ''}`} data-reveal onClick={() => phase === 'playing' && inputRef.current?.focus()}>
          <div className="fx-game-hud fx-mono">
            <span>score <b>{score.toLocaleString('en-US')}</b></span>
            <span>combo <b>×{multiplier}</b></span>
            <span aria-label={`${lives} lives left`}>{Array.from({ length: LIVES }, (_, i) => <i key={i} className={i < lives ? 'is-on' : undefined} />)}</span>
            <span>best <b>{best.toLocaleString('en-US')}</b></span>
          </div>
          <div key={shake} className={`fx-game-field ${shake ? 'is-shaking' : ''}`}>
            {words.map(word => {
              const isTarget = word === target;
              return (
                <span key={word.id} className={`fx-word ${isTarget ? 'is-target' : ''}`} style={{ left: `${word.x}%`, top: `${word.y * 88}%` }}>
                  {isTarget ? <><b>{word.text.slice(0, typed.length)}</b>{word.text.slice(typed.length)}</> : word.text}
                </span>
              );
            })}
            {pops.map(pop => <span key={pop.id} className="fx-pop fx-mono" style={{ left: `${pop.x}%`, top: `${pop.y * 88}%` }}>{pop.text}</span>)}
            <div className="fx-game-floor" aria-hidden="true" />

            {phase !== 'playing' && (
              <div className="fx-game-overlay">
                {phase === 'over' && <p className="fx-game-result"><span className="fx-mono">final score</span>{score.toLocaleString('en-US')}{score > 0 && score >= best && <em>new best!</em>}</p>}
                <button type="button" className="fx-btn fx-btn-primary" onClick={start}>{phase === 'over' ? 'Play again' : 'Start typing'}</button>
                <p className="fx-mono fx-game-help">3 lives · combos multiply your score</p>
              </div>
            )}
          </div>
          <label className="fx-game-input">
            <span className="fx-mono" aria-hidden="true">›</span>
            <span className="sr-only">Type the falling words</span>
            <input ref={inputRef} value={typed} onChange={event => onType(event.target.value)} disabled={phase !== 'playing'} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder={phase === 'playing' ? 'type here…' : 'press start'} />
          </label>
        </div>
      </div>
    </section>
  );
}
