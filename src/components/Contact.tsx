import { profile } from '../data/profile';

export function Contact() {
  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <div className="wrap contact-inner">
        <div>
          <h2 id="contact-title">Get in touch</h2>
          <a className="contact-email" href={`mailto:${profile.email}`}>{profile.email}</a>
        </div>
        <div className="contact-actions">
          <a className="button button-light" href={profile.resume} download="Phurin-Taengsriwan-Resume.pdf">Download résumé</a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a href={profile.github} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </section>
  );
}
