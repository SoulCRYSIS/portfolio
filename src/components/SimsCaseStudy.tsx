import { useState } from 'react';

const screens = [
  {
    file: 'sims-2.png',
    title: 'Team workload',
    alt: 'SIMS Property team workload screen with filters for directors and managers and a table of jobs by stage',
    description: 'See open valuation jobs by assignee and stage, and filter the view by director or manager.',
  },
  {
    file: 'sims-3.png',
    title: 'Role management',
    alt: 'SIMS Property role management screen showing the permissions and staff scope for six roles',
    description: 'See what each staff role can access and who it can manage.',
  },
  {
    file: 'sims-1.png',
    title: 'Sign-in',
    alt: 'SIMS Property sign-in screen with Google and Microsoft options',
    description: 'Staff can sign in with an organization-authorized Google or Microsoft account.',
  },
];

function SimsGallery() {
  const [selected, setSelected] = useState(0);
  const screen = screens[selected];
  const src = `${import.meta.env.BASE_URL}assets/${screen.file}`;

  return (
    <figure className="case-figure">
      <div className="preview-frame">
        <div className="preview-bar">SIMS Property Workspace</div>
        <img className="case-screenshot" src={src} alt={screen.alt} loading="lazy" decoding="async" />
      </div>
      <div className="preview-controls" role="group" aria-label="Choose a SIMS screenshot">
        {screens.map((item, index) => (
          <button key={item.file} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.title}</button>
        ))}
      </div>
      <figcaption aria-live="polite">{screen.description}</figcaption>
    </figure>
  );
}

export function SimsCaseStudy() {
  return (
    <section id="work" className="section featured" aria-labelledby="sims-title">
      <article id="sims-property" className="wrap featured-grid">
        <div className="case-copy">
          <p className="eyebrow">Featured case study</p>
          <h2 id="sims-title">SIMS Property</h2>
          <p className="case-role">Freelance developer · 2023–2024, 2026</p>
          <p className="case-lead">I started the project from scratch by visiting the client on site. I observed how valuation and accounting staff handled jobs, turned those workflows into requirements, and used their feedback to refine the app.</p>
          <p className="case-history">The original Flutter app was used by 500+ employees. I returned in 2026 to rebuild the workspace in React and TypeScript.</p>
          <ul className="case-details">
            <li>Built a Node.js and Fastify API on Cloud Functions.</li>
            <li>Migrated legacy valuation data to Firestore Enterprise.</li>
            <li>Implemented Thai-language job search with Algolia, including partial name matching.</li>
          </ul>
        </div>
        <SimsGallery />
      </article>
    </section>
  );
}
