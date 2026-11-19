import { Header } from './components/Header';
import { Intro } from './components/Intro';
import { Experience } from './components/Experience';
import { SimsCaseStudy } from './components/SimsCaseStudy';
import { Projects } from './components/Projects';
import { About } from './components/About';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';

export function App() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Intro />
        <SimsCaseStudy />
        <Experience />
        <Projects />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
