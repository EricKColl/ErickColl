// Generates the live telemetry panel (assets/telemetry/telemetry.svg) from the GitHub API, in the same
// design system as the static assets, so the README depends on no third-party stats service.
// Usage:  GITHUB_TOKEN=... node scripts/generate-cards.mjs
//         node scripts/generate-cards.mjs --preview   (synthetic data → .preview/, no network)

import { mkdir, writeFile } from "node:fs/promises";
import { COLORS, FONTS, esc, round, svgDocument, screen, headerBar } from "./lib/theme.mjs";

const USERNAME = "EricKColl";
const LANGS_COUNT = 6;
const RECENT_COUNT = 4;
const PREVIEW = process.argv.includes("--preview");
const OUT_DIR = new URL(PREVIEW ? "../.preview/telemetry/" : "../assets/telemetry/", import.meta.url);

const LANGUAGE_COLORS = {
  Blade: "#f7523f", C: "#555555", "C#": "#178600", "C++": "#f34b7d", CSS: "#663399", Dart: "#00B4AB",
  Dockerfile: "#384d54", Go: "#00ADD8", Hack: "#878787", HTML: "#e34c26", Java: "#b07219", JavaScript: "#f1e05a",
  "Jupyter Notebook": "#DA5B0B", Kotlin: "#A97BFF", PHP: "#4F5D95", PowerShell: "#012456", Python: "#3572A5",
  Ruby: "#701516", Rust: "#dea584", SCSS: "#c6538c", Shell: "#89e051", Swift: "#F05138", TSQL: "#e38c00",
  TypeScript: "#3178c6", Vue: "#41b883",
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const fmt = new Intl.NumberFormat("en-US");

// Linguist colours are tuned for white backgrounds; lift the darkest ones so they read on the screen.
function visible(hex) {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (lum >= 0.3) return hex;
  const mix = rgb.map((c) => Math.round(c + (255 - c) * 0.4));
  return `#${mix.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const shortDate = (iso) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
};

// ---------------------------------------------------------------------------------------------
// Data

function headers() {
  const result = {
    Accept: "application/vnd.github+json",
    "User-Agent": `${USERNAME}-profile-telemetry`,
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

// Public, non-fork repositories owned by the user.
async function listOwnRepos() {
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/users/${USERNAME}/repos?type=owner&per_page=100&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos.filter((repo) => !repo.fork && !repo.private);
}

async function fetchUser() {
  const { user } = await graphql(
    `query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          totalCommitContributions
          contributionCalendar { totalContributions }
        }
        pullRequests { totalCount }
      }
    }`,
    { login: USERNAME },
  );
  return user;
}

async function fetchLanguages(repos) {
  const totals = new Map();
  for (const repo of repos) {
    const langs = await api(`/repos/${repo.full_name}/languages`);
    for (const [name, size] of Object.entries(langs)) totals.set(name, (totals.get(name) || 0) + size);
  }
  return totals;
}

function buildModel({ user, repos, languages, now }) {
  const total = [...languages.values()].reduce((a, b) => a + b, 0) || 1;
  const owner = USERNAME.toLowerCase();
  return {
    synced: now.toISOString().slice(0, 10),
    contributions: user.contributionsCollection.contributionCalendar.totalContributions,
    commits: user.contributionsCollection.totalCommitContributions,
    prs: user.pullRequests.totalCount,
    publicRepos: repos.length,
    languages: [...languages]
      .sort((a, b) => b[1] - a[1])
      .slice(0, LANGS_COUNT)
      .map(([name, size]) => ({ name, pct: (size / total) * 100, color: visible(LANGUAGE_COLORS[name] || "#8b9bb4") })),
    // The profile repository itself is excluded: the bot commits to it every day.
    recent: repos
      .filter((repo) => repo.name.toLowerCase() !== owner)
      .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
      .slice(0, RECENT_COUNT)
      .map((repo) => ({ name: repo.name, language: repo.language, pushed: repo.pushed_at })),
  };
}

// Synthetic data for --preview, so the design can be iterated on without a token.
function previewModel() {
  const user = {
    contributionsCollection: { totalCommitContributions: 300, contributionCalendar: { totalContributions: 450 } },
    pullRequests: { totalCount: 100 },
  };
  const languages = new Map([["HTML", 38], ["PHP", 14], ["TypeScript", 14], ["JavaScript", 13], ["Blade", 11], ["CSS", 9]]);
  const now = new Date();
  const repos = ["sample-repo-one", "sample-repository-with-a-long-name", "sample-repo-three", "sample-repo-four"].map((name, i) => ({
    name, language: ["TypeScript", "Java", "PHP", "JavaScript"][i], pushed_at: new Date(now - i * 3 * 864e5).toISOString(), stargazers_count: 0,
  }));
  return buildModel({ user, repos, languages, now });
}

// ---------------------------------------------------------------------------------------------
// Rendering

const syncLabel = (model) => (PREVIEW ? "PREVIEW · SYNTHETIC DATA" : `SYNCED ${model.synced} · GITHUB API`);

function renderTelemetry(model) {
  const W = 1000;
  const top = 76;
  const tileW = 140;
  const tileH = 100;
  const gap = 10;
  const H = top + tileH * 2 + gap + 30;
  const frame = screen(W, H);

  const tiles = [
    ["CONTRIBUTIONS", "last 12 months", model.contributions, COLORS.cyan],
    ["COMMITS", "last 12 months", model.commits, COLORS.cyan],
    ["PULL REQUESTS", "all time", model.prs, COLORS.violet],
    ["PUBLIC REPOS", "owned · no forks", model.publicRepos, COLORS.blue],
  ];
  const tileSvg = tiles
    .map(([label, sub, value, color], i) => {
      const x = 30 + (i % 2) * (tileW + gap);
      const y = top + Math.floor(i / 2) * (tileH + gap);
      return `<g class="tile" style="animation-delay:${round(0.1 + i * 0.08, 2)}s">
        <rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="10" fill="${COLORS.panel}" stroke="${COLORS.line}"/>
        <path d="M${x + 14} ${y + 0.5}H${x + 46}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <text x="${x + 14}" y="${y + 25}" class="label" font-size="9.5">${label}</text>
        <text x="${x + 14}" y="${y + 64}" font-family="${FONTS.sans}" font-size="32" font-weight="700" fill="${COLORS.text}">${fmt.format(value)}</text>
        <text x="${x + 14}" y="${y + 85}" font-family="${FONTS.mono}" font-size="9.5" fill="${COLORS.dim}">${esc(sub)}</text>
      </g>`;
    })
    .join("");

  // Language spectrum.
  const lx = 352;
  const lw = 290;
  let offset = 0;
  const totalPct = model.languages.reduce((s, l) => s + l.pct, 0) || 1;
  const spectrum = model.languages
    .map((lang) => {
      const w = (lang.pct / totalPct) * lw;
      const rect = `<rect x="${round(lx + offset, 2)}" y="${top + 20}" width="${round(Math.max(w - 2, 1), 2)}" height="10" fill="${lang.color}"/>`;
      offset += w;
      return rect;
    })
    .join("");
  const max = Math.max(...model.languages.map((l) => l.pct), 1);
  const rows = model.languages
    .map((lang, i) => {
      const y = top + 58 + i * 24;
      const barW = (lang.pct / max) * 96;
      return `<g class="tile" style="animation-delay:${round(0.3 + i * 0.06, 2)}s">
        <circle cx="${lx + 5}" cy="${y - 4}" r="4.5" fill="${lang.color}"/>
        <text x="${lx + 18}" y="${y}" font-family="${FONTS.mono}" font-size="11.5" fill="${COLORS.text}">${esc(lang.name)}</text>
        <rect x="${lx + 134}" y="${y - 7}" width="96" height="5" rx="2.5" fill="${COLORS.raised}"/>
        <rect x="${lx + 134}" y="${y - 7}" width="${round(Math.max(barW, 3), 2)}" height="5" rx="2.5" fill="${lang.color}" class="grow"/>
        <text x="${lx + lw}" y="${y}" text-anchor="end" font-family="${FONTS.mono}" font-size="11.5" font-weight="700" fill="${COLORS.muted}">${lang.pct.toFixed(1)}%</text>
      </g>`;
    })
    .join("");

  // Latest pushes.
  const ox = 676;
  const ops = model.recent
    .map((repo, i) => {
      const y = top + 34 + i * 45;
      const name = repo.name.length > 30 ? `${repo.name.slice(0, 29)}…` : repo.name;
      const color = visible(LANGUAGE_COLORS[repo.language] || "#8b9bb4");
      return `<g class="tile" style="animation-delay:${round(0.5 + i * 0.08, 2)}s">
        <text x="${ox}" y="${y}" font-family="${FONTS.mono}" font-size="11.5" font-weight="700" fill="${COLORS.text}">${esc(name)}</text>
        <text x="${ox}" y="${y + 17}" font-family="${FONTS.mono}" font-size="10" fill="${COLORS.dim}">${shortDate(repo.pushed)}${repo.language ? "  ·  " : ""}</text>
        ${repo.language ? `<circle cx="${ox + 72}" cy="${y + 13.5}" r="3.5" fill="${color}"/><text x="${ox + 81}" y="${y + 17}" font-family="${FONTS.mono}" font-size="10" fill="${COLORS.muted}">${esc(repo.language)}</text>` : ""}
      </g>`;
    })
    .join("");

  return svgDocument({
    width: W,
    height: H,
    title: "Development telemetry",
    desc: `${tiles.map(([label, sub, value]) => `${label} (${sub}): ${value}`).join("; ")}. Languages across all public repositories, including coursework: ${model.languages.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ")}. Latest pushes: ${model.recent.map((r) => `${r.name} (${r.pushed.slice(0, 10)})`).join(", ")}. ${syncLabel(model)}.`,
    defs: `${frame.defs}<clipPath id="spectrum"><rect x="${lx}" y="${top + 20}" width="${lw}" height="10" rx="5"/></clipPath>`,
    style: `.tile { animation: rise .6s cubic-bezier(.2,.7,.2,1) both; }
      .grow { transform-box: fill-box; transform-origin: left; animation: grow 1.2s cubic-bezier(.2,.7,.2,1) .5s both; }
      @keyframes grow { from { transform: scaleX(0); } }`,
    body: `${frame.body}
${headerBar(W, { code: "ECR://TELEMETRY", title: "DEVELOPMENT TELEMETRY", right: syncLabel(model) })}
${tileSvg}
<rect x="${lx - 22}" y="${top}" width="1" height="${tileH * 2 + gap}" fill="${COLORS.line}"/>
<text x="${lx}" y="${top + 8}" class="label">LANGUAGES · ALL PUBLIC REPOS</text>
<g clip-path="url(#spectrum)"><rect x="${lx}" y="${top + 20}" width="${lw}" height="10" fill="${COLORS.raised}"/>${spectrum}</g>
${rows}
<text x="${lx}" y="${top + tileH * 2 + gap - 2}" font-family="${FONTS.mono}" font-size="9.5" fill="${COLORS.dim}">by code volume · includes coursework</text>
<rect x="${ox - 22}" y="${top}" width="1" height="${tileH * 2 + gap}" fill="${COLORS.line}"/>
<text x="${ox}" y="${top + 8}" class="label">LATEST PUSHES</text>
${ops}`,
  });
}

// ---------------------------------------------------------------------------------------------

// The panel is written only when every request succeeded, so a failed run keeps the previous
// panel instead of publishing an error image.
async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const write = async (file, svg) => {
    await writeFile(new URL(file, OUT_DIR), svg);
    console.log(`wrote ${PREVIEW ? ".preview" : "assets"}/telemetry/${file}`);
  };

  if (PREVIEW) {
    await write("telemetry.svg", renderTelemetry(previewModel()));
    return;
  }

  try {
    const [user, repos] = await Promise.all([fetchUser(), listOwnRepos()]);
    const languages = await fetchLanguages(repos);
    await write("telemetry.svg", renderTelemetry(buildModel({ user, repos, languages, now: new Date() })));
  } catch (error) {
    console.error(`::warning::telemetry not updated: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
