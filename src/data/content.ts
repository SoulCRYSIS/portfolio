// Shared content used by both the simple and the fancy versions of the site.

export const impact = [
  { label: 'Professional experience', value: 3, suffix: '+', unit: ' years', display: '3+ years' },
  { label: 'Employees on TTB’s banking platform', value: 10000, suffix: '+', unit: '', display: '10,000+' },
  { label: 'Downloads for STA Friends', value: 100000, suffix: '+', unit: '', display: '100,000+' },
];

export const currentRole = {
  company: 'TTB spark',
  period: 'Aug 2025 – Present',
  role: 'Frontend Engineer · Middle Level',
  logos: ['assets/ttb.png', 'assets/spark.png'],
  details: [
    'Build Flutter and Kotlin features for an internal banking platform used by 10,000+ employees across branches and contribute to its React and Next.js admin panel.',
    'Apply Clean Architecture and Bloc, structure unit tests, and build developer tooling with Jenkins, Sonar, Melos, and Context Builder.',
    'Contributed to Android plugin integrations for face recognition and passport scanning.',
  ],
};

export interface Role {
  company: string;
  period: string;
  role: string;
  logo: string;
  description: string;
  caseStudy?: string;
}

export const earlierRoles: Role[] = [
  {
    company: 'Hugeman Consultants',
    period: 'May 2024 – Aug 2025',
    role: 'Frontend Innovative Engineer',
    logo: 'assets/hugeman.png',
    description: 'Built STA Friends, a Flutter app for farmers with 100,000+ downloads, and its back office. Led a Clean Architecture refactor and automated model, UI, and test work, helping the team work 2–3× faster.',
  },
  {
    company: 'SIMS Property',
    period: '2023–2024, 2026',
    role: 'Freelance Developer',
    logo: 'assets/sims-property.png',
    description: 'Gathered requirements on site and used staff feedback to refine a Flutter valuation app used by 500+ employees. Returned in 2026 to rebuild it in React and TypeScript.',
    caseStudy: '#sims-property',
  },
  {
    company: 'Dr. Dish',
    period: 'Feb 2022 – Oct 2023',
    role: 'Lead Programmer / Full-Stack Developer · Part-time',
    logo: 'assets/drdish.jpg',
    description: 'Launched a Flutter and Firebase food-ordering app with 10,000+ downloads. Integrated external services and used feedback and Firebase Analytics to inform product changes.',
  },
  {
    company: 'SCB Tech X',
    period: 'Jun – Jul 2023',
    role: 'Frontend Software Engineer Intern',
    logo: 'assets/scb-techx.png',
    description: 'Contributed Flutter and Bloc code to SCB Easy, an app with 5 million+ users, and wrote unit and integration tests.',
  },
];

export const skills: [area: string, technologies: string][] = [
  ['Web', 'React, Next.js, TypeScript, JavaScript'],
  ['Mobile', 'Flutter, Dart, Kotlin, Bloc'],
  ['Backend & data', 'Node.js, Fastify, Firebase, Firestore Enterprise, Algolia, PostgreSQL'],
  ['Testing & delivery', 'Unit and integration tests, Jenkins, Sonar, Melos'],
];

export const simsScreens = [
  {
    file: 'sims-2.png',
    title: 'Team workload',
    alt: 'SIMS Property team workload screen with filters for directors and managers and a table of jobs by stage',
    description: 'See open valuation jobs by assignee and stage, and filter the view by director or manager.',
  },
  {
    file: 'sims-3.png',
    title: 'Role management',
    alt: 'SIMS Property role management screen showing the permissions and staff scope for six roles',
    description: 'See what each staff role can access and who it can manage.',
  },
  {
    file: 'sims-1.png',
    title: 'Sign-in',
    alt: 'SIMS Property sign-in screen with Google and Microsoft options',
    description: 'Staff can sign in with an organization-authorized Google or Microsoft account.',
  },
];

export const simsHighlights = [
  'Built a Node.js and Fastify API on Cloud Functions.',
  'Migrated legacy valuation data to Firestore Enterprise.',
  'Implemented Thai-language job search with Algolia, including partial name matching.',
];
