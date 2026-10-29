const ttbStack = ['Flutter', 'Dart', 'Kotlin', 'React', 'Next.js', 'TypeScript', 'Python', 'Java', 'Bloc', 'Clean Architecture', 'Jenkins', 'Sonar', 'Melos'];
const roles = [
  { company: 'Hugeman Consultants', period: 'MAY 2024 – AUG 2025', role: 'Frontend Innovative Engineer', logo: 'assets/hugeman.png', description: 'Developed the STA Friends app and back-office system with Flutter and GetX. Led a refactor toward Clean Architecture and built automation for repetitive development tasks.', tech: 'Flutter · Dart · GetX · Clean Architecture' },
  { company: 'SIMS Property', period: 'AUG 2023 – MAY 2024', role: 'Freelance Developer', logo: 'assets/sims-property.png', description: 'Built a web application supporting property consulting workflows, including job intake and property estimation.', tech: 'Flutter · Riverpod · Flutter Hooks · Firebase' },
  { company: 'Dr. Dish', period: 'FEB 2022 – OCT 2023', role: 'Lead Programmer / Full-Stack Developer', logo: 'assets/drdish.jpg', description: 'Developed and published a food-ordering app, integrated external services, and analyzed customer behavior with Firebase Analytics.', tech: 'Flutter · Firebase · Firebase Analytics' },
  { company: 'SCB Tech X', period: 'JUN – JUL 2023', role: 'Frontend Software Engineer Intern', logo: 'assets/scb-techx.png', description: 'Contributed to the SCB Easy app and wrote unit and integration tests as part of the Flutter team.', tech: 'Flutter · Bloc · MVC · Mockito' },
];
export function Experience() {
  return <section id="experience" className="experience"><div className="wrap">
    <div className="experience-top"><div><div className="eyebrow">01 / PROFESSIONAL EXPERIENCE</div><h2>Professional<br /><em>experience.</em></h2></div><p>Frontend and mobile development, architecture, testing and tools across production applications.</p></div>
    <article className="ttb-experience">
      <header className="ttb-header"><div className="ttb-identity"><div className="ttb-logos" aria-label="TTB spark"><img src="assets/ttb.png" alt="" /><img src="assets/spark.png" alt="" /></div><div><span className="experience-kicker">AUG 2025 – PRESENT</span><h3>TTB spark</h3><p>Frontend Engineer · Middle Level</p></div></div><div className="ttb-scale"><strong>10,000+</strong><span>employees use the internal enterprise platform across bank branches</span></div></header>
      <div className="ttb-work"><div className="ttb-work-intro"><span className="experience-kicker">CURRENT ROLE</span><h4>Mobile and web<br />development</h4><p>I develop features for TTB’s internal enterprise platform and contribute to its admin panel, working across frontend development, testing and delivery.</p></div><div className="ttb-work-details">
        <div><span>01</span><div><h5>Application development</h5><p>Build mobile features with Flutter and Kotlin, and contribute to an admin panel using React and Next.js.</p></div></div>
        <div><span>02</span><div><h5>Architecture and quality</h5><p>Apply Clean Architecture and Bloc, structure unit tests, and contribute throughout planning, development, testing and deployment.</p></div></div>
        <div><span>03</span><div><h5>Native integrations</h5><p>Work on Android plugin integrations for face recognition and passport scanning.</p></div></div>
        <div><span>04</span><div><h5>Developer tooling</h5><p>Create Jenkins and Sonar pipelines, Melos commands, and Context Builder to support development workflows.</p></div></div>
      </div></div>
      <div className="ttb-stack"><span className="experience-kicker">TECHNOLOGIES &amp; PRACTICES</span><div>{ttbStack.map(item => <span key={item}>{item}</span>)}</div></div>
    </article>
    <div className="career-header"><div><span className="experience-kicker">PREVIOUS ROLES</span><h3>Earlier experience</h3></div><p>Product development, freelance work and internships.</p></div>
    <div className="career-grid">{roles.map(item => <article className="career-card" key={item.company}><div className="career-card-top"><img className="company-logo" src={item.logo} alt="" /><span className="experience-kicker">{item.period}</span></div><h4>{item.company}</h4><div className="career-role">{item.role}</div><p>{item.description}</p><div className="career-tech">{item.tech}</div></article>)}</div>
  </div></section>;
}
