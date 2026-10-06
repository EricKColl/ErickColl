// Single source of truth for the static profile assets. Edit here, then run `npm run build:assets`.
// Every fact below comes from this README, the linked repositories or the published portfolio.

export const PROFILE = {
  name: ["ERICK COLL", "RODRÍGUEZ"],
  node: "DEVELOPER NODE · GIRONA, ES",
  motto: "PURPOSE · DISCIPLINE · CODE",
  roles: [
    "Ambitious DAW Student",
    "Aspiring Full-Stack Developer",
    "Administrative Background",
    "Applied AI Learner",
    "Building discipline through technology",
  ],
  readouts: [
    ["FOCUS", "Software development"],
    ["PATH", "Full-stack development"],
    ["INTEREST", "Applied AI"],
    ["MINDSET", "Discipline & growth"],
  ],
  ticker: [
    ["EDUCATION", "DAW · UOC", "cyan"],
    ["BACKGROUND", "7+ YRS ADMIN", "violet"],
    ["APPLIED AI", "2 YRS EXPLORING", "violet"],
    ["PRODUCTS", "2 LIVE PWAs", "green"],
    ["METHOD", "BUILD · TEST · EVOLVE", "cyan"],
  ],
  philosophy: ["DISCIPLINE", "CONSISTENCY", "SKILL", "VALUE"],
};

// Tier "live" = shipped in a production app (HotelScout / Forja). Everything else is in use or being learned.
export const STACK = [
  {
    layer: "LANGUAGES",
    caption: "core syntax",
    items: [
      ["Java", "openjdk"], ["JavaScript", "javascript"], ["TypeScript", "typescript", "live"], ["PHP", "php"],
      ["Python", "python"], ["C", "c"], ["C++", "cplusplus"], ["SQL", null, null, "SQL"],
    ],
  },
  {
    layer: "INTERFACE LAYER",
    caption: "frontend",
    items: [
      ["HTML5", "html5"], ["CSS3", "css"], ["React", "react", "live"], ["Angular", "angular"],
      ["Bootstrap", "bootstrap"], ["Tailwind CSS", "tailwindcss", "live"], ["Vite", "vite", "live"],
      ["Three.js", "threedotjs", "live"], ["Leaflet", "leaflet", "live"], ["PWA", "pwa", "live"], ["JavaFX", null, null, "FX"],
    ],
  },
  {
    layer: "LOGIC ENGINE",
    caption: "backend",
    items: [
      ["Node.js", "nodedotjs"], ["Express", "express"], ["GraphQL", "graphql"], ["Apollo", "apollographql"],
      ["Socket.io", "socketdotio"], ["Laravel", "laravel"], ["Spring Boot", "springboot"], ["WordPress", "wordpress"],
    ],
  },
  {
    layer: "DATA MEMORY",
    caption: "persistence",
    items: [
      ["MySQL", "mysql"], ["MongoDB", "mongodb"], ["Mongoose", "mongoose"], ["Supabase", "supabase", "live"],
      ["IndexedDB · Dexie", null, "live", "IDB"], ["Zod", "zod", "live"], ["JPA · Hibernate", "hibernate"], ["JDBC", null, null, "DB"],
    ],
  },
  {
    layer: "DELIVERY PIPELINE",
    caption: "ship & verify",
    items: [
      ["Git", "git"], ["GitHub", "github"], ["GitHub Actions", "githubactions", "live"], ["Docker", "docker"],
      ["Cloudflare Pages", "cloudflarepages", "live"], ["Vitest", "vitest", "live"], ["Playwright", null, "live", "PW"],
      ["JUnit", "junit5"], ["Postman", "postman"], ["Maven", "apachemaven"],
    ],
  },
  {
    layer: "WORKSTATION",
    caption: "environments",
    items: [
      ["VS Code", null, null, "VS"], ["Visual Studio 2022", null, null, "VS"], ["IntelliJ IDEA", "intellijidea"],
      ["VirtualBox", "virtualbox"], ["Hyper-V", null, null, "HV"], ["Windows", null, null, "WIN"], ["Linux", "linux"],
    ],
  },
  {
    layer: "AI MODULE",
    caption: "applied ai",
    items: [
      ["Claude · Claude Code", "claude"], ["ChatGPT", null, null, "GPT"], ["Codex", null, null, "CX"],
      ["Gemini", "googlegemini"], ["DeepSeek", "deepseek"], ["Copilot", "githubcopilot"], ["Suno AI", null, null, "SU"],
      ["AI agents", null, null, "AG"],
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
      ["React 19", "react"], ["TypeScript", "typescript"], ["Vite", "vite"], ["Tailwind CSS 4", "tailwindcss"],
      ["Leaflet", "leaflet"], ["TanStack Query", "reactquery"], ["Zod", "zod"], ["Vitest", "vitest"],
      ["Cloudflare Pages", "cloudflarepages"],
    ],
  },
  {
    file: "forja",
    index: "MODULE 02",
    name: "FORJA",
    kind: "Personal gym training PWA",
    url: "forja-13u.pages.dev",
    summary:
      "Local-first training app: plans come from a deterministic, fully tested rule engine built on evidence-backed training principles — no AI decides your plan. Works offline and keeps health data on the device.",
    flow: [
      { tag: "INTERFACE", title: "React 19 UI", lines: ["Tailwind · shadcn/ui", "Motion · i18n"] },
      { tag: "ENGINE", title: "Rule engine", lines: ["pure TypeScript", "deterministic · tested"] },
      { tag: "LOCAL DATA", title: "IndexedDB", lines: ["Dexie · Zustand", "Zod schemas"] },
    ],
    edges: ["profile", "plan"],
    extras: [
      { tag: "OPTIONAL", title: "Supabase sync", line: "EU · RLS · no health data" },
      { tag: "LAZY", title: "3D anatomy", line: "three.js · React Three Fiber" },
      { tag: "ON-DEVICE", title: "AI glossary", line: "WebLLM · Gemini optional" },
    ],
    systemsTitle: "KEY SYSTEMS",
    systems: [
      "Full offline PWA (Workbox), installable from the browser",
      "Interactive 3D anatomy model, loaded on demand",
      "Passwordless optional cloud sync between devices",
      "CI/CD to Cloudflare Pages with GitHub Actions",
    ],
    metricsTitle: "DESIGN PRINCIPLES",
    metrics: [["0", "AI-decided plans"], ["100%", "works offline"], ["TS", "strict mode"], ["EU", "cloud region"]],
    stack: [
      ["React 19", "react"], ["TypeScript", "typescript"], ["Vite", "vite"], ["Tailwind CSS 4", "tailwindcss"],
      ["Three.js", "threedotjs"], ["Dexie", null], ["Supabase", "supabase"], ["Vitest", "vitest"], ["PWA", "pwa"],
    ],
  },
];

// Secondary modules: team and academic systems at UOC, shown as one rack.
export const RACK = [
  {
    index: "03",
    name: "JOBCONNECT",
    repo: "FullStackAttack · Producto 4",
    kind: "Full-stack JavaScript job platform",
    context: "TEAM OF 3 · UOC FP.450",
    chain: ["HTML · Bootstrap · JS", "Fetch", "GraphQL · Apollo", "Mongoose", "MongoDB"],
    note: "Express server · auth & roles · Socket.io real time",
  },
  {
    index: "04",
    name: "REPARAYA · LARAVEL",
    repo: "ReparaYa · Producto 3",
    kind: "Repair management migrated to Laravel",
    context: "TEAM OF 3 · UOC FP.448",
    chain: ["Blade views", "Laravel 12 MVC", "Eloquent ORM", "MySQL 8"],
    note: "REST JSON API · B2B module · Docker · deployed to a UOC server",
  },
  {
    index: "05",
    name: "REPARAYA · PHP",
    repo: "ReparaYa · Producto 2",
    kind: "Framework-less PHP repair management",
    context: "UOC FP.448",
    chain: ["public entry", "PHP MVC core", "PDO", "MySQL 8"],
    note: "Apache · phpMyAdmin · Docker Compose environment",
  },
  {
    index: "06",
    name: "BUGBUSTERS",
    repo: "BugBusters · Producto 2",
    kind: "Collaborative Java online-store logic",
    context: "TEAM PROJECT · UOC",
    chain: ["console view", "controller", "model · generics", "in-memory data"],
    note: "MVC · OOP business rules · exceptions · JUnit tests",
  },
];

export const TRAJECTORY = [
  { index: "01", title: "ADMINISTRATION", lines: ["7+ yrs structure,", "responsibility, detail"], color: "violet" },
  { index: "02", title: "DAW · UOC", lines: ["Web Application", "Development"], color: "cyan" },
  { index: "03", title: "FULL-STACK", lines: ["backend · frontend", "devops"], color: "blue", lane: 0 },
  { index: "03", title: "APPLIED AI", lines: ["agents · automation", "prompt design"], color: "violet", lane: 1 },
  { index: "04", title: "GOAL", lines: ["practical, scalable,", "well-structured solutions"], color: "green" },
];

// The identity shell doubles as the "core profile" manifest of the original README.
export const TERMINAL = [
  { cmd: "whoami", out: [["Erick Coll Rodríguez", "text"], ["  ·  full-stack developer in training  ·  Girona, ES", "muted"]] },
  { cmd: "profile --path", out: [["Web Application Development (DAW)", "text"], ["  ·  UOC", "cyan"]] },
  { cmd: "profile --direction", out: [["Full-stack development", "text"], ["  ·  backend · frontend · devops", "muted"]] },
  { cmd: "profile --focus", out: [["Applied AI", "violet"], ["  ·  AI agents · productivity workflows · prompt design", "muted"]] },
  { cmd: "profile --background", out: [["Administration & structured professional work", "text"], ["  ·  7+ yrs", "violet"]] },
  { cmd: "profile --goal", out: [["Build useful, scalable and well-designed digital solutions", "text"]] },
  { cmd: "projects --live", out: [["hotelscout.pages.dev", "cyan"], ["  [LIVE]", "green"], ["    forja-13u.pages.dev", "cyan"], ["  [LIVE]", "green"]] },
];
