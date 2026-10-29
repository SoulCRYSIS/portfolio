import { useMemo, useState } from 'react';
import { projects } from '../data/projects';
import type { Category, Project } from '../data/projects';
import { ProjectDialog } from './ProjectDialog';

const filters: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All projects' }, { value: 'web', label: 'Web & mobile' },
  { value: 'games', label: 'Games' }, { value: 'mods', label: 'Factorio mods' },
  { value: 'data', label: 'Data & research' }, { value: 'tools', label: 'Tools' },
];

export function Projects() {
  const [active, setActive] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects.filter(project => (active === 'all' || project.category === active) && [project.name, project.label, project.description, ...project.tech].join(' ').toLowerCase().includes(term));
  }, [active, query]);
  return <section id="archive" className="archive-section"><div className="wrap">
    <div className="section-heading archive-heading"><div><div className="eyebrow">02 / PROJECTS</div><h2>Project<br /><em>list.</em></h2></div><p>Select a project to see its technology, architecture, screenshots and available links.</p></div>
    <div className="archive-tools"><div className="filters" role="group" aria-label="Filter projects by category">
      {filters.map(filter => <button key={filter.value} type="button" className={`filter${filter.value === active ? ' active' : ''}`} aria-pressed={filter.value === active} onClick={() => setActive(filter.value)}>{filter.label}</button>)}
    </div><label className="search"><span aria-hidden="true">⌕</span><span className="sr-only">Search projects</span><input type="search" placeholder="Search projects" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
    <div className="archive-meta"><span aria-live="polite">{String(matches.length).padStart(2, '0')} PROJECT{matches.length === 1 ? '' : 'S'}</span><span>SELECT A PROJECT FOR DETAILS</span></div>
    <div className="project-grid">{matches.map(project => <button key={project.name} type="button" className="archive-card" aria-label={`View ${project.name} project details`} onClick={() => setSelected(project)}>
      {project.image && <img className={`project-image${project.category === 'mods' ? ' mod-icon' : ''}`} src={project.image} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
      <span className="category">{project.label}</span><h3>{project.name}</h3><p>{project.description}</p>
      <div className="archive-links"><span className="card-action">View project ↗</span><span className="lang">{project.tech.slice(0, 2).join(' · ')}</span></div>
    </button>)}</div>
    {matches.length === 0 && <p className="empty">No projects match that search. Try a different term or category.</p>}
    {selected && <ProjectDialog project={selected} onClose={() => setSelected(null)} />}
  </div></section>;
}
