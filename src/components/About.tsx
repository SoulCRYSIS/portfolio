const skills = [
  ['Web', 'React, Next.js, TypeScript, JavaScript'],
  ['Mobile', 'Flutter, Dart, Kotlin, Bloc'],
  ['Backend & data', 'Node.js, Fastify, Firebase, Firestore Enterprise, Algolia, PostgreSQL'],
  ['Testing & delivery', 'Unit and integration tests, Jenkins, Sonar, Melos'],
];

export function About() {
  return (
    <section id="about" className="section wrap about" aria-labelledby="about-title">
      <div>
        <h2 id="about-title">Technical skills</h2>
        <dl className="skills-list">
          {skills.map(([area, technologies]) => <div key={area}><dt>{area}</dt><dd>{technologies}</dd></div>)}
        </dl>
      </div>
      <div className="education">
        <h2>Education &amp; languages</h2>
        <h3>Chulalongkorn University</h3>
        <p>Computer Engineering, 2020–2024<br />Second Class Honors · GPA 3.31</p>
        <h3>Languages</h3>
        <p>Thai (native) · English (TOEIC 920/990)</p>
        <h3>IBM digital badges</h3>
        <p>Basics of Quantum Information and Fundamentals of Quantum Algorithms</p>
      </div>
    </section>
  );
}
