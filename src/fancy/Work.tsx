import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { projects } from '../data/projects';
import type { Category, Project } from '../data/projects';
import { finePointer, prefersReducedMotion, useSpotlight } from './hooks';
import { SectionHeading } from './Sections';

const FILTERS: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Web & mobile' },
  { value: 'games', label: 'Games' },
  { value: 'mods', label: 'Factorio mods' },
  { value: 'data', label: 'Data & research' },
  { value: 'tools', label: 'Tools' },
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function CaretTile({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const play = () => {
    const video = videoRef.current;
    if (!video || prefersReducedMotion() || !finePointer()) return;
    video.preload = 'auto';
    void video.play().catch(() => {});
  };
  const stop = () => videoRef.current?.pause();

  return (
    <article className="fx-feature fx-feature-caret fx-glow-card" onPointerEnter={play} onPointerLeave={stop} data-reveal>
      <div className="fx-feature-media">
        <img src={project.image} alt={project.imageAlt ?? ''} loading="lazy" />
        {project.video && <video ref={videoRef} src={project.video} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />}
        <span className="fx-feature-hint fx-mono" aria-hidden="true">▶ hover to play trailer</span>
      </div>
      <div className="fx-feature-body">
        <p className="fx-kicker">{project.label}</p>
        <h3>{project.name}</h3>
        <p>{project.description}</p>
        <div className="fx-feature-actions">
          <button type="button" className="fx-btn fx-btn-primary" onClick={onOpen}>Details</button>
          {project.demo && <a className="fx-btn fx-btn-ghost" href={project.demo} target="_blank" rel="noopener noreferrer">{project.demoLabel} ↗</a>}
        </div>
      </div>
    </article>
  );
}

function ModTile({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <article className="fx-feature fx-feature-mod fx-glow-card" data-reveal>
      <div className="fx-feature-media">
        <img src={project.image} alt={project.imageAlt ?? ''} loading="lazy" />
        <p className="fx-big-number" aria-hidden="true">10k<span>downloads</span></p>
      </div>
      <div className="fx-feature-body">
        <p className="fx-kicker">{project.label}</p>
        <h3>{project.name}</h3>
        <p>{project.description}</p>
        <div className="fx-feature-actions">
          <button type="button" className="fx-btn fx-btn-primary" onClick={onOpen}>Details</button>
          {project.demo && <a className="fx-btn fx-btn-ghost" href={project.demo} target="_blank" rel="noopener noreferrer">{project.demoLabel} ↗</a>}
        </div>
      </div>
    </article>
  );
}

export function Work({ onOpen }: { onOpen: (project: Project) => void }) {
  const [active, setActive] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const spotlightRef = useSpotlight<HTMLDivElement>('.fx-glow-card');
  const filtersRef = useRef<HTMLDivElement>(null);

  const caret = projects.find(p => p.name === 'Caret Type');
  const virentis = projects.find(p => p.name === 'Virentis');

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: projects.length };
    for (const p of projects) result[p.category] = (result[p.category] ?? 0) + 1;
    return result;
  }, []);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects.filter(project => (active === 'all' || project.category === active) &&
      [project.name, project.label, project.description, ...project.tech].join(' ').toLowerCase().includes(term));
  }, [active, query]);

  // Slide the highlight pill under the active filter.
  useLayoutEffect(() => {
    const group = filtersRef.current;
    const button = group?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!group || !button) return;
    group.style.setProperty('--pill-x', `${button.offsetLeft}px`);
    group.style.setProperty('--pill-y', `${button.offsetTop}px`);
    group.style.setProperty('--pill-w', `${button.offsetWidth}px`);
    group.style.setProperty('--pill-h', `${button.offsetHeight}px`);
  }, [active]);

  const changeFilter = (value: Category | 'all') => {
    if (!document.startViewTransition || prefersReducedMotion()) { setActive(value); return; }
    document.documentElement.classList.add('fx-filtering');
    const transition = document.startViewTransition(() => flushSync(() => setActive(value)));
    void transition.finished.finally(() => document.documentElement.classList.remove('fx-filtering'));
  };

  return (
    <section id="projects" className="fx-section fx-work" aria-labelledby="fx-work-title">
      <div className="fx-wrap" ref={spotlightRef}>
        <SectionHeading index="03" kicker="Side projects" title={<span id="fx-work-title">Built after <span className="fx-serif">hours</span></span>}>
          Games, Factorio mods with 10k+ downloads, research notebooks and small tools.
        </SectionHeading>

        <div className="fx-features">
          {caret && <CaretTile project={caret} onOpen={() => onOpen(caret)} />}
          {virentis && <ModTile project={virentis} onOpen={() => onOpen(virentis)} />}
        </div>

        <div className="fx-index" data-reveal>
          <div className="fx-index-tools">
            <div className="fx-filters" ref={filtersRef} role="group" aria-label="Filter projects by category">
              <span className="fx-filter-pill" aria-hidden="true" />
              {FILTERS.map(filter => (
                <button key={filter.value} type="button" aria-pressed={filter.value === active} onClick={() => changeFilter(filter.value)}>
                  {filter.label}<sup>{counts[filter.value] ?? 0}</sup>
                </button>
              ))}
            </div>
            <label className="fx-search">
              <span className="sr-only">Search projects</span>
              <span aria-hidden="true" className="fx-mono">/</span>
              <input type="search" placeholder="Search by name or tech" value={query} onChange={event => setQuery(event.target.value)} />
            </label>
          </div>
          <p className="fx-index-meta fx-mono" aria-live="polite">{String(matches.length).padStart(2, '0')} / {String(projects.length).padStart(2, '0')} projects</p>
          <ul className="fx-index-grid">
            {matches.map(project => (
              <li key={project.name} style={{ '--vt': `fx-p-${slug(project.name)}` } as CSSProperties}>
                <button type="button" className="fx-card fx-glow-card" aria-label={`View ${project.name} project details`} onClick={() => onOpen(project)}>
                  <span className="fx-card-top">
                    <span className="fx-kicker">{project.label}</span>
                    <span className="fx-card-arrow" aria-hidden="true">↗</span>
                  </span>
                  <strong>{project.name}</strong>
                  <span className="fx-card-desc">{project.description}</span>
                  <span className="fx-card-tech">{project.tech.slice(0, 3).map(tech => <span key={tech}>{tech}</span>)}</span>
                </button>
              </li>
            ))}
          </ul>
          {matches.length === 0 && <p className="fx-empty">Nothing matches “{query}”. Try “Flutter”, “Lua” or “Godot”.</p>}
        </div>
      </div>
    </section>
  );
}
