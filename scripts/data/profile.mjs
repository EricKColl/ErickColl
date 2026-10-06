// Single source of truth for the static profile assets. Edit here, then run `npm run build:assets`.
// Every fact below comes from this README, the linked repositories, the published portfolio or the CV.

export const PROFILE = {
  name: ["ERICK COLL", "RODRÍGUEZ"],
  node: "DEVELOPER NODE · GIRONA, CATALUNYA",
  status: "OPEN TO INTERNSHIP",
  motto: "PURPOSE · DISCIPLINE · CODE",
  roles: [
    "Full-stack developer in training",
    "DAW student · last semester · UOC",
    "Open to a DAW internship",
    "2 PWAs live in production",
    "Building discipline through technology",
  ],
  readouts: [
    ["FOCUS", "Full-stack development"],
    ["INTEREST", "Applied AI"],
    ["LANGUAGES", "Catalan · Spanish · English B1.1"],
    ["METHOD", "Build · Test · Evolve"],
  ],
  ticker: [
    ["EDUCATION", "DAW · LAST SEMESTER", "cyan"],
    ["GRADE AVERAGE", "9.29 / 10", "cyan"],
    ["PRIOR CAREER", "7+ YRS ADMIN & OPS", "violet"],
    ["PRODUCTS", "2 LIVE PWAs", "green"],
    ["APPLIED AI", "2 YRS EXPLORING", "violet"],
  ],
  boot: [
    ["mounting identity", "erick coll rodríguez"],
    ["loading stack", "java · ts · php · sql"],
    ["linking project modules", "2 live · 3 team"],
    ["status", "open to internship"],
  ],
  philosophy: ["DISCIPLINE", "CONSISTENCY", "SKILL", "VALUE"],
};

// How each technology's mark is drawn:
//   dev  → the original full-colour logo from Devicon (MIT)
//   si   → the Simple Icons mark (CC0) in its brand colour, lifted when too dark for the screen
//   mono → a monogram tile in the brand colour, for marks that are not available or not permitted
export const ICONS = {
  Java: { dev: "java/java-original" },
  JavaScript: { dev: "javascript/javascript-original" },
  TypeScript: { dev: "typescript/typescript-original" },
  PHP: { si: "php" },
  Python: { dev: "python/python-original" },
  C: { dev: "c/c-original" },
  "C++": { dev: "cplusplus/cplusplus-original" },
  SQL: { mono: "SQL", color: "#4FA7C7" },
  HTML5: { dev: "html5/html5-original" },
  CSS3: { dev: "css3/css3-original" },
  React: { dev: "react/react-original" },
  Angular: { dev: "angular/angular-original" },
  Bootstrap: { dev: "bootstrap/bootstrap-original" },
  "Tailwind CSS": { dev: "tailwindcss/tailwindcss-original" },
  Vite: { dev: "vitejs/vitejs-original" },
  "Three.js": { si: "threedotjs" },
  Leaflet: { si: "leaflet" },
  PWA: { si: "pwa" },
  JavaFX: { mono: "FX", color: "#ED8B00" },
  "Node.js": { dev: "nodejs/nodejs-original" },
  Express: { si: "express" },
  GraphQL: { dev: "graphql/graphql-plain" },
  Apollo: { si: "apollographql" },
  "Socket.io": { si: "socketdotio" },
  Laravel: { dev: "laravel/laravel-original" },
  "Spring Boot": { dev: "spring/spring-original" },
  WordPress: { si: "wordpress" },
  MySQL: { dev: "mysql/mysql-original", lift: true, bold: 5 },
  MongoDB: { dev: "mongodb/mongodb-original" },
  Mongoose: { si: "mongoose" },
  Supabase: { dev: "supabase/supabase-original" },
  IndexedDB: { mono: "IDB", color: "#38BDF8" },
  Zod: { si: "zod" },
  Hibernate: { dev: "hibernate/hibernate-original" },
  JDBC: { mono: "DB", color: "#F89820" },
  Git: { dev: "git/git-original" },
  GitHub: { si: "github" },
  "GitHub Actions": { dev: "githubactions/githubactions-original" },
  Docker: { dev: "docker/docker-original" },
  "Cloudflare Pages": { si: "cloudflarepages" },
  Vitest: { dev: "vitest/vitest-original" },
  Playwright: { dev: "playwright/playwright-original" },
  JUnit: { dev: "junit/junit-original" },
  Postman: { dev: "postman/postman-original" },
  Maven: { si: "apachemaven" },
  "TanStack Query": { si: "reactquery" },
  "VS Code": { dev: "vscode/vscode-original" },
  "Visual Studio": { dev: "visualstudio/visualstudio-original" },
  "IntelliJ IDEA": { dev: "intellij/intellij-original" },
  VirtualBox: { si: "virtualbox" },
  "Hyper-V": { mono: "HV", color: "#00A4EF" },
  Windows: { dev: "windows11/windows11-original" },
  Linux: { si: "linux" },
  Claude: { si: "claude" },
  ChatGPT: { mono: "GPT", color: "#74AA9C" },
  Codex: { mono: "CX", color: "#E8EEF9" },
  Gemini: { si: "googlegemini" },
  DeepSeek: { si: "deepseek" },
  Copilot: { mono: "CP", color: "#2B88D8" },
  "Suno AI": { mono: "SU", color: "#E8EEF9" },
  "AI agents": { mono: "AG", color: "#22C55E" },
};

// Stack items: [label, icon key (defaults to the label), tier].
//   "live"  = part of a shipped product's codebase (HotelScout / Forja): runtime, build, tests or CI
//   "learn" = still being learned, with no project in the linked repositories yet
//   none    = used in coursework and team projects
export const STACK = [
  {
    layer: "LANGUAGES",
    caption: "core syntax",
    items: [["Java"], ["JavaScript"], ["TypeScript", null, "live"], ["PHP"], ["SQL"], ["Python", null, "learn"], ["C", null, "learn"], ["C++", null, "learn"]],
  },
  {
    layer: "INTERFACE LAYER",
    caption: "frontend",
    items: [
      ["HTML5"], ["CSS3"], ["React", null, "live"], ["Angular"], ["Bootstrap"], ["Tailwind CSS", null, "live"],
      ["Vite", null, "live"], ["Three.js", null, "live"], ["Leaflet", null, "live"], ["PWA", null, "live"], ["JavaFX"],
    ],
  },
  {
    layer: "LOGIC ENGINE",
    caption: "backend",
    items: [["Node.js"], ["Express"], ["GraphQL"], ["Apollo"], ["Socket.io"], ["Laravel"], ["Spring Boot"], ["WordPress"]],
  },
  {
    layer: "DATA MEMORY",
    caption: "persistence",
    items: [
      ["MySQL"], ["MongoDB"], ["Mongoose"], ["Supabase", null, "live"], ["IndexedDB · Dexie", "IndexedDB", "live"],
      ["Zod", null, "live"], ["JPA · Hibernate", "Hibernate"], ["JDBC"],
    ],
  },
  {
    layer: "DELIVERY PIPELINE",
    caption: "ship & verify",
    items: [
      ["Git"], ["GitHub"], ["GitHub Actions", null, "live"], ["Docker"], ["Cloudflare Pages", null, "live"],
      ["Vitest", null, "live"], ["Playwright", null, "live"], ["JUnit"], ["Postman"], ["Maven"],
    ],
  },
  {
    layer: "WORKSTATION",
    caption: "environments",
    items: [
      ["VS Code"], ["Visual Studio 2022", "Visual Studio"], ["IntelliJ IDEA"], ["VirtualBox"], ["Hyper-V"], ["Windows"], ["Linux"],
    ],
  },
  {
    layer: "AI MODULE",
    caption: "applied ai",
    items: [
      ["Claude · Claude Code", "Claude"], ["ChatGPT"], ["Codex"], ["Gemini"], ["DeepSeek"], ["Microsoft Copilot", "Copilot"], ["Suno AI"], ["AI agents"],
    ],
  },
];

export const FEATURED = [
  {
    file: "hotelscout",
    index: "MODULE 01",
    name: "HOTELSCOUT",
    kind: "Hotel finder PWA",
    url: "hotelscout.pages.dev",
    summary:
      "Finds real accommodation near a station, an airport or an address with OpenStreetMap data: interactive map, filters, favourites and a Booking.com search link. No accounts, no trackers, €0 running cost.",
    flow: [
      { tag: "CLIENT", title: "React PWA", lines: ["map · filters · favourites", "own service worker"] },
      { tag: "EDGE", title: "Pages Functions", lines: ["/api/* proxy · cache", "rate limit · User-Agent"] },
      { tag: "DATA", title: "OpenStreetMap", lines: ["Nominatim geocoding", "Overpass POI queries"] },
    ],
    edges: ["/api/*", "1 req/s"],
    systemsTitle: "KEY SYSTEMS",
    systems: [
      "Leaflet + MapLibre map with Spanish names worldwide",
      "Distinct states: empty ≠ limit ≠ outage ≠ offline",
      "Booking.com deep link — a search, never a fake price",
      "Installable, opens offline, favourites stay local",
    ],
    metricsTitle: "QUALITY GATES",
    metrics: [["85", "unit + integration"], ["21", "end-to-end"], ["0", "axe violations"], ["0", "npm audit"]],
    stack: [
      ["React 19", "React"], ["TypeScript"], ["Vite"], ["Tailwind CSS 4", "Tailwind CSS"], ["Leaflet"],
      ["TanStack Query"], ["Zod"], ["Vitest"], ["Playwright"], ["Cloudflare Pages"],
    ],
  },
  {
    file: "forja",
    index: "MODULE 02",
    name: "FORJA",
    kind: "Personal gym training PWA",
    url: "forja-13u.pages.dev",
    summary:
      "Local-first training app: plans come from a deterministic, unit-tested rule engine built on evidence-backed training principles — no AI decides your plan. Works offline and keeps health data on the device.",
    flow: [
      { tag: "INTERFACE", title: "React 19 UI", lines: ["Tailwind · shadcn/ui", "Motion · i18n"] },
      { tag: "ENGINE", title: "Rule engine", lines: ["pure TypeScript", "deterministic · tested"] },
      { tag: "LOCAL DATA", title: "IndexedDB", lines: ["Dexie · Zustand", "Zod schemas"] },
    ],
    edges: ["profile", "plan"],
    extras: [
      { tag: "OPTIONAL", title: "Supabase sync", line: "EU · RLS · no health data" },
      { tag: "LAZY", title: "3D anatomy", line: "three.js · React Three Fiber" },
      { tag: "ASSISTANT", title: "AI Q&A", line: "WebLLM · Gemini · glossary" },
    ],
    systemsTitle: "KEY SYSTEMS",
    systems: [
      "Full offline PWA (Workbox), installable from the browser",
      "Interactive 3D anatomy model, loaded on demand",
      "Passwordless optional cloud sync between devices",
      "CI + CD to Cloudflare Pages, smoke-tested in production",
    ],
    metricsTitle: "DESIGN PRINCIPLES",
    metrics: [["RULES", "no AI picks the plan"], ["LOCAL", "health data on device"], ["OFFLINE", "installable PWA"], ["SMOKE", "prod checks per deploy"]],
    stack: [
      ["React 19", "React"], ["TypeScript"], ["Vite"], ["Tailwind CSS 4", "Tailwind CSS"], ["Three.js"],
      ["Dexie", "IndexedDB"], ["Supabase"], ["Vitest"], ["PWA"],
    ],
  },
];

// Team product lines at UOC, each shown at its most complete iteration.
export const RACK = [
  {
    index: "03",
    name: "JOBCONNECT",
    repo: "FullStackAttack · Producto 4",
    kind: "Full-stack JavaScript job platform",
    context: "TEAM OF 3 · UOC FP.450",
    icons: ["JavaScript", "Node.js", "GraphQL", "MongoDB", "Socket.io"],
    chain: ["Bootstrap UI", "Fetch", "Express · Apollo", "Mongoose", "MongoDB"],
    note: "JWT auth & roles · Socket.io real time · GraphQL API",
  },
  {
    index: "04",
    name: "REPARAYA",
    repo: "ReparaYa · Producto 2 → 4",
    kind: "Repair management in three iterations",
    context: "TEAM OF 3 · UOC FP.448",
    icons: ["PHP", "Laravel", "WordPress", "MySQL", "Docker"],
    chain: ["P2 · PHP MVC", "P3 · Laravel 12", "P4 · WordPress site", "MySQL 8"],
    note: "roles · calendar · REST JSON API · deployed to a UOC server",
  },
  {
    index: "05",
    name: "ONLINE STORE",
    repo: "BugBusters · Producto 5",
    kind: "Java desktop store management",
    context: "TEAM OF 4 · UOC FP.447",
    icons: ["Java", "JavaFX", "Hibernate", "MySQL", "Maven"],
    chain: ["JavaFX · FXML", "controllers", "JPA · Hibernate", "MySQL"],
    note: "KPI dashboard · grew from a console app (P2) with JUnit tests",
  },
];

export const TRAJECTORY = [
  { index: "01", title: "OPERATIONS", lines: ["7+ yrs · 4 companies", "admin · ops · customers"], color: "violet" },
  { index: "02", title: "DAW · UOC", lines: ["last semester", "grade average 9.29 / 10"], color: "cyan" },
  { index: "03", title: "FULL-STACK", lines: ["backend · frontend", "devops"], color: "blue", lane: 0 },
  { index: "03", title: "APPLIED AI", lines: ["agents · automation", "prompt design"], color: "violet", lane: 1 },
  { index: "04", title: "GOAL", lines: ["practical, scalable,", "well-structured solutions"], color: "green" },
];
