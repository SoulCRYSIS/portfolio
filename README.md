# Phurin's portfolio

A React and TypeScript portfolio built with Vite and hosted on Firebase Hosting.

**Live site:** [phurin-portfolio-2026.web.app](https://phurin-portfolio-2026.web.app/)

## Getting started

Install dependencies with `npm install`, then run `npm run dev`. Open the URL shown in the terminal.

- `npm run build` checks TypeScript and builds the production site in `dist/`.
- `npm run preview` previews the production build.
- `npm run deploy` builds and deploys to the Firebase project configured in `.firebaserc` (requires the Firebase CLI and access to that project).

## Project structure

- The site has two versions, chosen with the Simple / Fancy switch at the top right. Simple is the default; the choice is remembered in `localStorage`, and `?mode=fancy` or `?mode=simple` in the URL overrides it.
- `src/components/` contains the simple version's sections, the project detail dialog and the mode switch.
- `src/fancy/` contains the fancy version (ASCII ocean background in `Ocean.tsx`, dot-field hero, case study, timeline, project index, typing game, ⌘K command menu). It's loaded only when someone switches to it.
- `src/data/` contains the content shared by both versions: `projects.ts` (projects), `content.ts` (experience, skills, SIMS screens, stats) and `profile.ts` (links).
- `src/styles.css` contains the simple version's styling; `src/fancy/fancy.css` styles the fancy version.
- `public/assets/` contains images and video; `public/resume.pdf` is the downloadable resume.
- `firebase.json` and `.firebaserc` configure Firebase Hosting.

To update the resume, replace `public/resume.pdf` with a current PDF. Only include verified claims about projects and experience.
