const container = document.querySelector('#projects');
const count = document.querySelector('#project-count');
const search = document.querySelector('#search');
const empty = document.querySelector('#empty');
const buttons = [...document.querySelectorAll('.filter')];
const dialog = document.querySelector('#project-dialog');
const dialogBody = document.querySelector('#dialog-body');
let active = 'all';
function element(tag, className, value) { const el = document.createElement(tag); if (className) el.className = className; if (value !== undefined) el.textContent = value; return el; }
function externalLink(href, label, className) { const a = element('a', className, label + ' ↗'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function openProject(project) {
  document.querySelector('#dialog-category').textContent = project.label;
  dialogBody.replaceChildren();
  const title = element('h2', 'dialog-title', project.name); title.id = 'dialog-title';
  dialogBody.append(title, element('p', 'dialog-lead', project.description));
  const section = element('section','dialog-section'); section.append(element('h3', '', 'Project details'));
  const list = element('ul','detail-list'); (project.details || [project.description]).forEach(text => list.append(element('li','',text))); section.append(list); dialogBody.append(section);
  const stack = element('section','dialog-section'); stack.append(element('h3','','Technology')); const chips = element('div','dialog-chips'); project.tech.forEach(item => chips.append(element('span','',item))); stack.append(chips); dialogBody.append(stack);
  if (project.patterns?.length) { const patterns = element('section','dialog-section'); patterns.append(element('h3','','Architecture & patterns')); const list = element('ul','detail-list'); project.patterns.forEach(item => list.append(element('li','',item))); patterns.append(list); dialogBody.append(patterns); }
  const links = element('div','dialog-links'); if(project.demo) links.append(externalLink(project.demo,project.demoLabel || 'Open demo','dialog-primary'));
  if(project.url || project.repo) links.append(externalLink(project.url || `https://github.com/SoulCRYSIS/${project.repo}`,project.sourceLabel || 'View source','dialog-secondary'));
  dialogBody.append(links);
  const shots = project.screenshots || (project.image ? [{src:project.image,alt:project.imageAlt}] : []);
  if (shots.length) { const gallery = element('section','dialog-section'); gallery.append(element('h3','',project.mediaLabel || 'Screenshots')); const images = element('div','dialog-gallery'); shots.forEach(shot => {const img = document.createElement('img'); img.src = shot.src; img.alt = shot.alt; img.loading = 'lazy'; images.append(img);}); gallery.append(images); dialogBody.append(gallery); }
  if (project.video) { const videoSection = element('section','dialog-section'); videoSection.append(element('h3','','Video')); const video = document.createElement('video'); video.src = project.video; video.poster = 'assets/caret-gameplay.png'; video.controls = true; video.preload = 'none'; videoSection.append(video); dialogBody.append(videoSection); }
  dialog.showModal();
}
function render() {
  const query = search.value.trim().toLowerCase();
  const matches = projects.filter(p => (active === 'all' || p.category === active) && [p.name,p.label,p.description,...p.tech].join(' ').toLowerCase().includes(query));
  container.replaceChildren();
  matches.forEach(p => {
    const card = element('button','archive-card'); card.type = 'button'; card.setAttribute('aria-label', `View ${p.name} project details`);
    if (p.image) { const image = document.createElement('img'); image.className = p.category === 'mods' ? 'project-image mod-icon' : 'project-image'; image.src = p.image; image.alt = ''; image.loading = 'lazy'; image.addEventListener('error', () => image.remove()); card.append(image); }
    card.append(element('span','category',p.label),element('h3','',p.name),element('p','',p.description));
    const footer = element('div','archive-links'); footer.append(element('span','card-action','View project ↗'),element('span','lang',p.tech.slice(0,2).join(' · '))); card.append(footer);
    card.addEventListener('click', () => openProject(p)); container.append(card);
  });
  count.textContent = `${String(matches.length).padStart(2,'0')} PROJECT${matches.length === 1 ? '' : 'S'}`;
  empty.hidden = matches.length !== 0;
}
buttons.forEach(button => button.addEventListener('click', () => { active = button.dataset.filter; buttons.forEach(b => { const selected = b === button; b.classList.toggle('active',selected); b.setAttribute('aria-pressed',String(selected)); }); render(); }));
search.addEventListener('input', render);
document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { const video = dialogBody.querySelector('video'); if (video) video.pause(); });
render();
