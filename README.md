# Phurin's portfolio

A React and TypeScript portfolio built with Vite and hosted on Firebase Hosting.

## Getting started

Install dependencies with `npm install`, then run `npm run dev`. Open the URL shown in the terminal.

- `npm run build` checks TypeScript and builds the production site in `dist/`.
- `npm run preview` previews the production build.
- `npm run deploy` builds and deploys to the Firebase project configured in `.firebaserc` (requires the Firebase CLI and access to that project).

## Project structure

- `src/components/` contains the page sections, project list and detail dialog.
- `src/data/projects.ts` contains the project descriptions, technologies, patterns, images and links.
- `src/styles.css` contains the site styling and responsive layouts.
- `public/assets/` contains images and video; `public/resume.pdf` is the downloadable resume.
- `firebase.json` and `.firebaserc` configure Firebase Hosting.

To update the resume, replace `public/resume.pdf` with a current PDF. Only include verified claims about projects and experience.
