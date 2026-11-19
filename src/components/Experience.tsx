const earlierRoles = [
  {
    company: 'Hugeman Consultants',
    period: 'May 2024 – Aug 2025',
    role: 'Frontend Innovative Engineer',
    logo: 'assets/hugeman.png',
    description: 'Built STA Friends, a Flutter app for farmers with 100,000+ downloads, and its back office. Led a Clean Architecture refactor and automated model, UI, and test work, helping the team work 2–3× faster.',
  },
  {
    company: 'SIMS Property',
    period: '2023–2024, 2026',
    role: 'Freelance Developer',
    logo: 'assets/sims-property.png',
    description: 'Gathered requirements on site and used staff feedback to refine a Flutter valuation app used by 500+ employees. Returned in 2026 to rebuild it in React and TypeScript.',
    caseStudy: '#sims-property',
  },
  {
    company: 'Dr. Dish',
    period: 'Feb 2022 – Oct 2023',
    role: 'Lead Programmer / Full-Stack Developer · Part-time',
    logo: 'assets/drdish.jpg',
    description: 'Launched a Flutter and Firebase food-ordering app with 10,000+ downloads. Integrated external services and used feedback and Firebase Analytics to inform product changes.',
  },
  {
    company: 'SCB Tech X',
    period: 'Jun – Jul 2023',
    role: 'Frontend Software Engineer Intern',
    logo: 'assets/scb-techx.png',
    description: 'Contributed Flutter and Bloc code to SCB Easy, an app with 5 million+ users, and wrote unit and integration tests.',
  },
];

export function Experience() {
  return (
    <section id="experience" className="section wrap" aria-labelledby="experience-title">
      <div className="section-heading">
        <h2 id="experience-title">Experience</h2>
        <p>Banking, property valuation, and consumer apps.</p>
      </div>
      <article className="current-role">
        <div className="role-identity">
          <div className="company-logos"><img src="assets/ttb.png" alt="" loading="lazy" /><img src="assets/spark.png" alt="" loading="lazy" /></div>
          <p className="eyebrow">Aug 2025 – Present</p>
          <h3>TTB spark</h3>
          <p>Frontend Engineer · Middle Level</p>
        </div>
        <ul className="role-details">
          <li>Build Flutter and Kotlin features for an internal banking platform used by 10,000+ employees across branches and contribute to its React and Next.js admin panel.</li>
          <li>Apply Clean Architecture and Bloc, structure unit tests, and build developer tooling with Jenkins, Sonar, Melos, and Context Builder.</li>
          <li>Contributed to Android plugin integrations for face recognition and passport scanning.</li>
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
