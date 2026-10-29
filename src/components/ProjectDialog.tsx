import { useEffect, useRef } from 'react';
import type { Project } from '../data/projects';

type Props = { project: Project; onClose: () => void };

export function ProjectDialog({ project, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const screenshots = project.screenshots ?? (project.image ? [{ src: project.image, alt: project.imageAlt ?? project.name }] : []);
  const source = project.url ?? (project.repo ? `https://github.com/SoulCRYSIS/${project.repo}` : undefined);
  return <dialog ref={ref} className="project-dialog" aria-labelledby="dialog-title" onClose={onClose} onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
    <div className="dialog-header"><span>{project.label}</span><button className="dialog-close" type="button" aria-label="Close project details" onClick={() => ref.current?.close()}>✕</button></div>
    <div id="dialog-body">
      <h2 className="dialog-title" id="dialog-title">{project.name}</h2><p className="dialog-lead">{project.description}</p>
      <section className="dialog-section"><h3>Project details</h3><ul className="detail-list">{(project.details ?? [project.description]).map(item => <li key={item}>{item}</li>)}</ul></section>
      <section className="dialog-section"><h3>Technology</h3><div className="dialog-chips">{project.tech.map(item => <span key={item}>{item}</span>)}</div></section>
      {!!project.patterns?.length && <section className="dialog-section"><h3>Architecture &amp; patterns</h3><ul className="detail-list">{project.patterns.map(item => <li key={item}>{item}</li>)}</ul></section>}
      <div className="dialog-links">
        {project.demo && <a className="dialog-primary" href={project.demo} target="_blank" rel="noopener noreferrer">{project.demoLabel ?? 'Open demo'} ↗</a>}
        {source && <a className="dialog-secondary" href={source} target="_blank" rel="noopener noreferrer">{project.sourceLabel ?? 'View source'} ↗</a>}
      </div>
      {screenshots.length > 0 && <section className="dialog-section"><h3>{project.mediaLabel ?? 'Screenshots'}</h3><div className="dialog-gallery">{screenshots.map(shot => <img src={shot.src} alt={shot.alt} loading="lazy" key={shot.src} />)}</div></section>}
      {project.video && <section className="dialog-section"><h3>Video</h3><video src={project.video} poster="assets/caret-gameplay.png" controls preload="none" /></section>}
    </div>
  </dialog>;
}
