import { impact } from '../data/content';
import { profile } from '../data/profile';

export function Intro() {
  return (
    <section id="top" className="intro wrap" aria-labelledby="intro-title">
      <div className="intro-main">
        <div>
          <p className="eyebrow">Software engineer <span>·</span> Thailand</p>
          <h1 id="intro-title">Phurin<br />Taengsriwan<span>.</span></h1>
        </div>
        <div className="intro-summary">
          <h2>Frontend &amp; mobile engineer</h2>
          <p>I build production web and mobile apps with React, TypeScript, Flutter, and Kotlin. I also build Node.js APIs and tools that help teams ship.</p>
          <div className="actions">
            <a className="button button-primary" href={profile.resume} target="_blank" rel="noreferrer">View résumé</a>
            <a className="button button-outline" href="#contact">Get in touch</a>
          </div>
        </div>
      </div>
      <dl className="impact">
        {impact.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.display}</dd></div>)}
      </dl>
    </section>
  );
}
