import { currentRole, earlierRoles } from '../data/content';

export function Experience() {
  return (
    <section id="experience" className="section wrap" aria-labelledby="experience-title">
      <div className="section-heading">
        <h2 id="experience-title">Experience</h2>
        <p>Banking, property valuation, and consumer apps.</p>
      </div>
      <article className="current-role">
        <div className="role-identity">
          <div className="company-logos">{currentRole.logos.map(logo => <img key={logo} src={logo} alt="" loading="lazy" />)}</div>
          <p className="eyebrow">{currentRole.period}</p>
          <h3>{currentRole.company}</h3>
          <p>{currentRole.role}</p>
        </div>
        <ul className="role-details">
          {currentRole.details.map(item => <li key={item}>{item}</li>)}
        </ul>
      </article>
      <div className="career-grid">
        {earlierRoles.map(role => (
          <article className="career-card" key={role.company}>
            <div className="career-top"><img src={role.logo} alt="" loading="lazy" /><p className="eyebrow">{role.period}</p></div>
            <h3>{role.company}</h3>
            <p className="career-role">{role.role}</p>
            <p>{role.description}</p>
            {role.caseStudy && <a className="text-link" href={role.caseStudy}>Read the SIMS case study</a>}
          </article>
        ))}
      </div>
    </section>
  );
}
