import { profile } from '../data/profile';

export function Footer() {
  return (
    <footer className="wrap footer">
      <span>© {new Date().getFullYear()} {profile.name}</span>
      <a href={`${profile.github}/portfolio`} target="_blank" rel="noreferrer">Site source</a>
      <a href="#top">Back to top</a>
    </footer>
  );
}
