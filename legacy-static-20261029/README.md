# Phurin's portfolio

A static website using HTML, CSS and JavaScript. No install or build step is needed.

## Preview

From this folder, run `python3 -m http.server 8000`, then visit `http://localhost:8000`.

## Files

- `index.html`: page structure and professional experience.
- `projects.js`: the project list and each project's description, technology, patterns, images, and links.
- `script.js`: project filtering, search and detail dialog behavior.
- `style.css`: site layout, dialog and responsive styling.
- `assets/`: local screenshots and video. Mod icons and some Virentis images load from their public hosting services.

## Adding or editing projects

Edit the objects in `projects.js`. Supply `name`, `category`, `label`, `description`, and `tech`. Optional fields include `details`, `patterns`, `repo` or `url`, `demo`, `demoLabel`, `image`, `imageAlt`, `screenshots`, and `video`. Only add claims that can be confirmed. Projects without a screenshot will display text and available links.

## Firebase Hosting

The site uses project `phurin-portfolio-2026`. After making edits, run `node build.mjs` and then `firebase deploy --only hosting`. The build copies only the website files, public assets and `resume.pdf` into `dist/`. Replace `resume.pdf` with a current export when the resume changes.
