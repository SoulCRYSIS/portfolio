import { profile } from '../data/profile';

export function Header() {
  return (
    <header className="site-header">
      <div className="wrap topbar">
        <a className="brand" href="#top">
          <img className="brand-photo" src={`${import.meta.env.BASE_URL}assets/profile-image.jpeg`} alt="" />
          <span>{profile.name}</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#experience">Experience</a>
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="button button-outline nav-resume" href={profile.resume} download="Phurin-Taengsriwan-Resume.pdf">Résumé</a>
      </div>
    </header>
  );
}
