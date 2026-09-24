// Generates the profile SVG cards in assets/cards/ from the GitHub REST API,
// so the README does not depend on a third-party github-readme-stats instance.
// Usage: GITHUB_TOKEN=... node scripts/generate-cards.mjs

import { mkdir, writeFile } from "node:fs/promises";

const USERNAME = "EricKColl";
const DISPLAY_NAME = "Erick Coll";
const PINNED_REPOS = [
  "hotelscout",
  "FullStackAttack-Producto4",
  "ReparaYa-Producto3-Laravel",
  "ReparaYa-Producto2",
  "BugBusters-Producto2",
];
// Used only while the repository has no description set on GitHub.
const DESCRIPTION_FALLBACKS = {
  hotelscout:
    "PWA que localiza alojamientos reales cerca de una estación, un aeropuerto o una dirección con datos de OpenStreetMap.",
};
const LANGS_COUNT = 6;
const OUT_DIR = new URL("../assets/cards/", import.meta.url);

// "tokyonight" palette, the same theme the README used before.
const THEME = {
  bg: "#1a1b27",
  title: "#70a5fd",
  text: "#38bdae",
  icon: "#bf91f3",
  ring: "#bf91f3",
};

const LANGUAGE_COLORS = {
  Blade: "#f7523f",
  C: "#555555",
  "C#": "#178600",
  "C++": "#f34b7d",
  CSS: "#663399",
  Dart: "#00B4AB",
  Dockerfile: "#384d54",
  Go: "#00ADD8",
  Hack: "#878787",
  HTML: "#e34c26",
  Java: "#b07219",
  JavaScript: "#f1e05a",
  "Jupyter Notebook": "#DA5B0B",
  Kotlin: "#A97BFF",
  PHP: "#4F5D95",
  PowerShell: "#012456",
  Python: "#3572A5",
  Ruby: "#701516",
  Rust: "#dea584",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Swift: "#F05138",
  TSQL: "#e38c00",
  TypeScript: "#3178c6",
  Vue: "#41b883",
};

const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif";

const ICONS = {
  repo: "M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z",
  star: "M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z",
  fork: "M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z",
  commit: "M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z",
  pr: "M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z",
  issue: "M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z",
  github: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z",
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const kFormat = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));

const icon = (path, x, y, size = 16) =>
  `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 16 16" class="icon"><path fill-rule="evenodd" d="${path}"/></svg>`;

function wrapText(text, maxChars, maxLines) {
  const lines = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (current && `${current} ${word}`.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxChars - 1).trimEnd()}…`;
  }
  return lines;
}

function headers() {
  const result = {
    Accept: "application/vnd.github+json",
    "User-Agent": `${USERNAME}-profile-cards`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) result.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return result;
}

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function graphql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) throw new Error(`GraphQL -> ${res.status} ${JSON.stringify(body.errors || body)}`);
  return body.data;
}

function renderPinCard(repo) {
  const lines = wrapText(repo.description || "No description provided", 52, 3);
  const descY = 65;
  const lineHeight = 17;
  const footerY = descY + (lines.length - 1) * lineHeight + 30;
  const height = footerY + 20;

  const footer = [];
  let x = 25;
  if (repo.language) {
    const color = LANGUAGE_COLORS[repo.language] || "#858585";
    footer.push(`<circle cx="${x + 6}" cy="${footerY - 4}" r="6" fill="${color}"/>`);
    footer.push(`<text x="${x + 18}" y="${footerY}" class="gray">${escapeXml(repo.language)}</text>`);
    x += 18 + repo.language.length * 6.5 + 20;
  }
  footer.push(icon(ICONS.star, x, footerY - 12));
  footer.push(`<text x="${x + 22}" y="${footerY}" class="gray">${kFormat(repo.stargazers_count)}</text>`);
  x += 22 + String(kFormat(repo.stargazers_count)).length * 7 + 20;
  footer.push(icon(ICONS.fork, x, footerY - 12));
  footer.push(`<text x="${x + 22}" y="${footerY}" class="gray">${kFormat(repo.forks_count)}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${height}" viewBox="0 0 400 ${height}" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(repo.name)}</title>
  <desc id="desc">${escapeXml(repo.description || "")}</desc>
  <style>
    .header { font: 600 18px ${FONT}; fill: ${THEME.title}; }
    .description { font: 400 13px ${FONT}; fill: ${THEME.text}; }
    .gray { font: 400 12px ${FONT}; fill: ${THEME.text}; }
    .icon { fill: ${THEME.icon}; }
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="399" height="${height - 1}" fill="${THEME.bg}"/>
  ${icon(ICONS.repo, 25, 23)}
  <text x="50" y="37" class="header">${escapeXml(repo.name)}</text>
  ${lines.map((line, i) => `<text x="25" y="${descY + i * lineHeight}" class="description">${escapeXml(line)}</text>`).join("\n  ")}
  ${footer.join("\n  ")}
</svg>
`;
}

function renderStatsCard(stats) {
  const rows = [
    [ICONS.star, "Total Stars Earned", stats.stars],
    [ICONS.commit, "Commits (last year)", stats.commits],
    [ICONS.pr, "Total PRs", stats.prs],
    [ICONS.issue, "Total Issues", stats.issues],
    [ICONS.repo, "Contributed to (last year)", stats.contributedTo],
  ];
  const width = 467;
  const height = 195;
  const radius = 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(DISPLAY_NAME)}'s GitHub Stats</title>
  <style>
    .header { font: 600 18px ${FONT}; fill: ${THEME.title}; }
    .stat { font: 600 14px ${FONT}; fill: ${THEME.text}; }
    .bold { font-weight: 700; }
    .icon { fill: ${THEME.icon}; }
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="${width - 1}" height="${height - 1}" fill="${THEME.bg}"/>
  <text x="25" y="35" class="header">${escapeXml(DISPLAY_NAME)}'s GitHub Stats</text>
  ${rows
    .map(
      ([path, label, value], i) => `<g transform="translate(25, ${55 + i * 25})">
    ${icon(path, 0, 0)}
    <text x="25" y="12.5" class="stat">${label}:</text>
    <text x="235" y="12.5" class="stat bold">${kFormat(value)}</text>
  </g>`,
    )
    .join("\n  ")}
  <g transform="translate(${width - 90}, ${height / 2 + 10})">
    <circle r="${radius}" stroke="${THEME.ring}" stroke-width="6"/>
    <svg x="-16" y="-16" width="32" height="32" viewBox="0 0 16 16"><path fill="${THEME.title}" d="${ICONS.github}"/></svg>
  </g>
</svg>
`;
}

function renderTopLangsCard(langs) {
  const width = 300;
  const barWidth = width - 50;
  const rowsCount = Math.ceil(langs.length / 2);
  const height = 90 + rowsCount * 25;
  const total = langs.reduce((sum, lang) => sum + lang.size, 0);

  let offset = 0;
  const bar = langs
    .map((lang) => {
      const w = (lang.size / total) * barWidth;
      const rect = `<rect x="${offset.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="8" fill="${lang.color}"/>`;
      offset += w;
      return rect;
    })
    .join("");

  const legend = langs
    .map((lang, i) => {
      const x = i % 2 === 0 ? 0 : 150;
      const y = Math.floor(i / 2) * 25;
      const pct = ((lang.size / total) * 100).toFixed(2);
      return `<g transform="translate(${x}, ${y})">
      <circle cx="5" cy="6" r="5" fill="${lang.color}"/>
      <text x="15" y="10" class="lang-name">${escapeXml(lang.name)} ${pct}%</text>
    </g>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-labelledby="title">
  <title id="title">Most Used Languages</title>
  <style>
    .header { font: 600 18px ${FONT}; fill: ${THEME.title}; }
    .lang-name { font: 400 11px ${FONT}; fill: ${THEME.text}; }
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="${width - 1}" height="${height - 1}" fill="${THEME.bg}"/>
  <text x="25" y="35" class="header">Most Used Languages</text>
  <mask id="bar-mask"><rect x="0" y="0" width="${barWidth}" height="8" rx="5" fill="white"/></mask>
  <g transform="translate(25, 55)" mask="url(#bar-mask)">${bar}</g>
  <g transform="translate(25, 80)">
    ${legend}
  </g>
</svg>
`;
}

async function listOwnRepos() {
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/users/${USERNAME}/repos?type=owner&per_page=100&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos.filter((repo) => !repo.fork);
}

async function buildStats(repos) {
  const { user } = await graphql(
    `query($login: String!) {
      user(login: $login) {
        contributionsCollection { totalCommitContributions }
        pullRequests { totalCount }
        issues { totalCount }
        repositoriesContributedTo(contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) { totalCount }
      }
    }`,
    { login: USERNAME },
  );
  return {
    stars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    commits: user.contributionsCollection.totalCommitContributions,
    prs: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
  };
}

async function buildTopLangs(repos) {
  const totals = new Map();
  for (const repo of repos) {
    const langs = await api(`/repos/${repo.full_name}/languages`);
    for (const [name, size] of Object.entries(langs)) totals.set(name, (totals.get(name) || 0) + size);
  }
  return [...totals]
    .sort((a, b) => b[1] - a[1])
    .slice(0, LANGS_COUNT)
    .map(([name, size]) => ({ name, size, color: LANGUAGE_COLORS[name] || "#858585" }));
}

// Each card is written only when its data was fetched successfully, so a failed
// run keeps the previous card instead of publishing an error image.
async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const failures = [];
  const write = (file, svg) => writeFile(new URL(file, OUT_DIR), svg).then(() => console.log(`wrote assets/cards/${file}`));
  const attempt = async (label, fn) => {
    try {
      await fn();
    } catch (error) {
      failures.push(label);
      console.error(`::warning::${label} not updated: ${error.message}`);
    }
  };

  for (const name of PINNED_REPOS) {
    await attempt(`pin ${name}`, async () => {
      const repo = await api(`/repos/${USERNAME}/${name}`);
      repo.description ||= DESCRIPTION_FALLBACKS[name];
      await write(`${name}.svg`, renderPinCard(repo));
    });
  }

  let repos;
  await attempt("repository list", async () => {
    repos = await listOwnRepos();
  });
  if (repos) {
    await attempt("stats card", async () => write("stats.svg", renderStatsCard(await buildStats(repos))));
    await attempt("top languages card", async () => write("top-langs.svg", renderTopLangsCard(await buildTopLangs(repos))));
  }

  if (failures.length) {
    console.error(`Failed: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}

await main();
