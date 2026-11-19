import { useMemo, useState } from 'react';
import { projects } from '../data/projects';
import type { Category, Project } from '../data/projects';
import { ProjectDialog } from './ProjectDialog';

const filters: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All projects' },
  { value: 'web', label: 'Web & mobile' },
  { value: 'games', label: 'Games' },
  { value: 'mods', label: 'Factorio mods' },
  { value: 'data', label: 'Data & research' },
  { value: 'tools', label: 'Tools' },
];

const featuredProjects = projects.filter(project => ['Caret Type', 'Virentis'].includes(project.name));

export function Projects() {
  const [active, setActive] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects.filter(project => (active === 'all' || project.category === active) &&
      [project.name, project.label, project.description, ...project.tech].join(' ').toLowerCase().includes(term));
  }, [active, query]);

  return (
    <section className="section project-section" aria-labelledby="projects-title">
      <div className="wrap">
        <div className="section-heading"><h2 id="projects-title">Side projects</h2></div>
        <div className="selected-projects">
          {featuredProjects.map(project => (
            <article key={project.name} className="selected-project">
              {project.image && <img src={project.image} alt={project.imageAlt ?? ''} loading="lazy" className={project.category === 'mods' ? 'mod-feature' : undefined} />}
              <div>
                <p className="eyebrow">{project.label}</p>
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                <button type="button" className="text-link" onClick={() => setSelected(project)}>View {project.name} details</button>
              </div>
            </article>
          ))}
        </div>
        <details className="project-archive">
          <summary>Browse all side projects</summary>
          <div id="archive">
            <div className="archive-tools">
              <div className="filters" role="group" aria-label="Filter projects by category">
                {filters.map(filter => <button key={filter.value} type="button" className="filter" aria-pressed={filter.value === active} onClick={() => setActive(filter.value)}>{filter.label}</button>)}
              </div>
              <label className="search"><span className="sr-only">Search projects</span><input type="search" placeholder="Search projects" value={query} onChange={event => setQuery(event.target.value)} /></label>
            </div>
            <p className="archive-meta" aria-live="polite">{matches.length} project{matches.length === 1 ? '' : 's'}</p>
            <div className="project-grid">
              {matches.map(project => (
                <button key={project.name} type="button" className="archive-card" aria-label={`View ${project.name} project details`} onClick={() => setSelected(project)}>
                  <span className="eyebrow">{project.label}</span>
                  <strong>{project.name}</strong>
                  <span>{project.description}</span>
                </button>
              ))}
            </div>
            {matches.length === 0 && <p className="empty">No projects match that search.</p>}
          </div>
        </details>
        {selected && <ProjectDialog project={selected} onClose={() => setSelected(null)} />}
      </div>
    </section>
  );
}
