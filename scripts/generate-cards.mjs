// Generates the live telemetry panels in assets/telemetry/ from the GitHub API, in the same
// design system as the static assets, so the README depends on no third-party stats service.
// Usage:  GITHUB_TOKEN=... node scripts/generate-cards.mjs
//         node scripts/generate-cards.mjs --preview   (synthetic data → .preview/, no network)

import { mkdir, writeFile } from "node:fs/promises";
import { COLORS, FONTS, esc, round, monoWidth, svgDocument, screen, headerBar } from "./lib/theme.mjs";

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

const LEVEL_COLORS = {
  NONE: COLORS.raised,
  FIRST_QUARTILE: "#1e3a8a",
  SECOND_QUARTILE: COLORS.blueDeep,
  THIRD_QUARTILE: COLORS.blue,
  FOURTH_QUARTILE: "#7dd3fc",
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

// Public, non-fork repositories owned by the user (the profile repository itself is excluded
// from "recent activity" because the bot commits to it every day).
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
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount contributionLevel } }
          }
        }
        pullRequests { totalCount }
        issues { totalCount }
        repositoriesContributedTo(contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) { totalCount }
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

function streaks(days) {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    run = day.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // Today may simply not have contributions yet: the current streak counts from yesterday then.
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--;
  let current = 0;
  while (i >= 0 && days[i].contributionCount > 0) {
    current++;
    i--;
  }
  const best = days.reduce((top, day) => (day.contributionCount > top.contributionCount ? day : top), days[0]);
  const active = days.filter((day) => day.contributionCount > 0).length;
  return { current, longest, best, active };
}

function buildModel({ user, repos, languages, now }) {
  const weeks = user.contributionsCollection.contributionCalendar.weeks;
  const days = weeks.flatMap((week) => week.contributionDays);
  const total = [...languages.values()].reduce((a, b) => a + b, 0) || 1;
  const owner = USERNAME.toLowerCase();
  return {
    synced: now.toISOString().slice(0, 10),
    weeks,
    days,
    totalContributions: user.contributionsCollection.contributionCalendar.totalContributions,
    commits: user.contributionsCollection.totalCommitContributions,
    prs: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    publicRepos: repos.length,
    stars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    streak: streaks(days),
    languages: [...languages]
      .sort((a, b) => b[1] - a[1])
      .slice(0, LANGS_COUNT)
      .map(([name, size]) => ({ name, pct: (size / total) * 100, color: visible(LANGUAGE_COLORS[name] || "#8b9bb4") })),
    recent: repos
      .filter((repo) => repo.name.toLowerCase() !== owner)
      .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
      .slice(0, RECENT_COUNT)
      .map((repo) => ({ name: repo.name, language: repo.language, pushed: repo.pushed_at })),
  };
}

// Deterministic synthetic data for --preview, so the design can be iterated on without a token.
function previewModel() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 364 - start.getUTCDay());
  const weeks = [];
  for (let d = new Date(start); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) weeks.push({ contributionDays: [] });
    const busy = rand() < 0.62 ? Math.floor(rand() * rand() * 14) : 0;
    const level = busy === 0 ? "NONE" : busy < 3 ? "FIRST_QUARTILE" : busy < 6 ? "SECOND_QUARTILE" : busy < 9 ? "THIRD_QUARTILE" : "FOURTH_QUARTILE";
    weeks[weeks.length - 1].contributionDays.push({ date: d.toISOString().slice(0, 10), contributionCount: busy, contributionLevel: level });
  }
  const user = {
    contributionsCollection: {
      totalCommitContributions: 300,
      contributionCalendar: { totalContributions: weeks.flatMap((w) => w.contributionDays).reduce((s, d) => s + d.contributionCount, 0), weeks },
    },
    pullRequests: { totalCount: 100 },
    issues: { totalCount: 1 },
    repositoriesContributedTo: { totalCount: 2 },
  };
  const languages = new Map([["HTML", 38], ["PHP", 14], ["TypeScript", 14], ["JavaScript", 13], ["Blade", 11], ["CSS", 9]]);
  const repos = ["sample-repo-one", "sample-repo-two", "sample-repo-three", "sample-repo-four"].map((name, i) => ({
    name, language: ["TypeScript", "Java", "PHP", "JavaScript"][i], pushed_at: new Date(Date.now() - i * 3 * 864e5).toISOString(), stargazers_count: 0,
  }));
  return buildModel({ user, repos, languages, now });
}

// ---------------------------------------------------------------------------------------------
// Rendering

const syncLabel = (model) => (PREVIEW ? "PREVIEW · SYNTHETIC DATA" : `SYNCED ${model.synced} · GITHUB API`);

function renderTelemetry(model) {
  const W = 1000;
  const H = 316;
  const frame = screen(W, H);
  const tiles = [
    ["CONTRIBUTIONS", "last 12 months", model.totalContributions, COLORS.cyan],
    ["COMMITS", "last 12 months", model.commits, COLORS.cyan],
    ["PULL REQUESTS", "all time", model.prs, COLORS.violet],
    ["ISSUES", "all time", model.issues, COLORS.violet],
    ["ACTIVE DAYS", "last 12 months", model.streak.active, COLORS.cyan],
    ["PUBLIC REPOS", "owned · no forks", model.publicRepos, COLORS.blue],
    ["STARS EARNED", "own repositories", model.stars, COLORS.blue],
    ["CONTRIBUTED TO", "repositories · 12m", model.contributedTo, COLORS.green],
  ];
  const tileW = 132;
  const tileH = 104;
  const gap = 10;
  const x0 = 30;
  const y0 = 76;
  const tileSvg = tiles
    .map(([label, sub, value, color], i) => {
      const x = x0 + (i % 4) * (tileW + gap);
      const y = y0 + Math.floor(i / 4) * (tileH + gap);
      return `<g class="tile" style="animation-delay:${round(0.1 + i * 0.07, 2)}s">
        <rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="10" fill="${COLORS.panel}" stroke="${COLORS.line}"/>
        <path d="M${x + 14} ${y + 0.5}H${x + 46}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <text x="${x + 14}" y="${y + 26}" class="label" font-size="9.5">${label}</text>
        <text x="${x + 14}" y="${y + 66}" font-family="${FONTS.sans}" font-size="32" font-weight="700" fill="${COLORS.text}">${fmt.format(value)}</text>
        <text x="${x + 14}" y="${y + 88}" font-family="${FONTS.mono}" font-size="9.5" fill="${COLORS.dim}">${esc(sub)}</text>
      </g>`;
    })
    .join("");

  const lx = 620;
  const lw = W - lx - 30;
  let offset = 0;
  const totalPct = model.languages.reduce((s, l) => s + l.pct, 0) || 1;
  const spectrum = model.languages
    .map((lang) => {
      const w = (lang.pct / totalPct) * lw;
      const rect = `<rect x="${round(lx + offset, 2)}" y="96" width="${round(Math.max(w - 2, 1), 2)}" height="10" fill="${lang.color}"/>`;
      offset += w;
      return rect;
    })
    .join("");
  const top = Math.max(...model.languages.map((l) => l.pct), 1);
  const rows = model.languages
    .map((lang, i) => {
      const y = 140 + i * 27;
      const barW = (lang.pct / top) * (lw - 180);
      return `<g class="tile" style="animation-delay:${round(0.3 + i * 0.07, 2)}s">
        <circle cx="${lx + 5}" cy="${y - 4}" r="4.5" fill="${lang.color}"/>
        <text x="${lx + 18}" y="${y}" font-family="${FONTS.mono}" font-size="12" fill="${COLORS.text}">${esc(lang.name)}</text>
        <rect x="${lx + 128}" y="${y - 8}" width="${round(lw - 180, 2)}" height="6" rx="3" fill="${COLORS.raised}"/>
        <rect x="${lx + 128}" y="${y - 8}" width="${round(Math.max(barW, 3), 2)}" height="6" rx="3" fill="${lang.color}" class="grow"/>
        <text x="${W - 30}" y="${y}" text-anchor="end" font-family="${FONTS.mono}" font-size="12" font-weight="700" fill="${COLORS.muted}">${lang.pct.toFixed(1)}%</text>
      </g>`;
    })
    .join("");

  return svgDocument({
    width: W,
    height: H,
    title: "Development telemetry",
    desc: `${tiles.map(([label, sub, value]) => `${label} (${sub}): ${value}`).join("; ")}. Languages by code volume: ${model.languages.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ")}. ${syncLabel(model)}.`,
    defs: `${frame.defs}<clipPath id="spectrum"><rect x="${lx}" y="96" width="${lw}" height="10" rx="5"/></clipPath>`,
    style: `.tile { animation: rise .6s cubic-bezier(.2,.7,.2,1) both; }
      .grow { transform-box: fill-box; transform-origin: left; animation: grow 1.2s cubic-bezier(.2,.7,.2,1) .5s both; }
      @keyframes grow { from { transform: scaleX(0); } }`,
    body: `${frame.body}
${headerBar(W, { code: "ECR://TELEMETRY", title: "DEVELOPMENT TELEMETRY", right: syncLabel(model) })}
${tileSvg}
<rect x="${lx - 22}" y="76" width="1" height="${2 * tileH + gap}" fill="${COLORS.line}"/>
<text x="${lx}" y="84" class="label">LANGUAGE SPECTRUM · BY CODE VOLUME</text>
<g clip-path="url(#spectrum)"><rect x="${lx}" y="96" width="${lw}" height="10" fill="${COLORS.raised}"/>${spectrum}</g>
${rows}`,
  });
}

function renderActivity(model) {
  const W = 1000;
  const cell = 10.5;
  const pitch = 13.5;
  const gx = 62;
  const gy = 92;
  const weeks = model.weeks.slice(-53);

  let months = "";
  let lastMonth = -1;
  const columns = weeks
    .map((week, w) => {
      const x = gx + w * pitch;
      const first = week.contributionDays[0];
      const month = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
      if (month !== lastMonth && w < weeks.length - 2) {
        if (lastMonth !== -1 || new Date(`${first.date}T00:00:00Z`).getUTCDate() <= 7) {
          months += `<text x="${x}" y="${gy - 10}" class="label" font-size="9">${MONTHS[month]}</text>`;
        }
        lastMonth = month;
      }
      const cells = week.contributionDays
        .map((day) => {
          const row = new Date(`${day.date}T00:00:00Z`).getUTCDay();
          const level = day.contributionLevel || (day.contributionCount ? "SECOND_QUARTILE" : "NONE");
          const stroke = level === "NONE" ? ` stroke="${COLORS.line}"` : "";
          return `<rect x="${x}" y="${gy + row * pitch}" width="${cell}" height="${cell}" rx="2.5" fill="${LEVEL_COLORS[level]}"${stroke}/>`;
        })
        .join("");
      return `<g class="col" style="animation-delay:${round(0.2 + w * 0.018, 3)}s">${cells}</g>`;
    })
    .join("");

  const days = ["", "MON", "", "WED", "", "FRI", ""]
    .map((d, i) => (d ? `<text x="30" y="${gy + i * pitch + 10}" class="label" font-size="9">${d}</text>` : ""))
    .join("");

  const legendX = round(gx + 53 * pitch - 124);
  const legend = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"]
    .map((lvl, i) => `<rect x="${legendX + 34 + i * 15}" y="${gy + 7 * pitch + 8}" width="10" height="10" rx="2" fill="${LEVEL_COLORS[lvl]}"${lvl === "NONE" ? ` stroke="${COLORS.line}"` : ""}/>`)
    .join("");
  const legendSvg = `<text x="${legendX}" y="${gy + 7 * pitch + 17}" class="label" font-size="9">LESS</text>${legend}<text x="${legendX + 34 + 5 * 15 + 4}" y="${gy + 7 * pitch + 17}" class="label" font-size="9">MORE</text>`;

  // Streak column.
  const sx = gx + 53 * pitch + 26;
  const { current, longest, best } = model.streak;
  const stat = (y, label, value, unit, color) => `<g class="tile">
    <text x="${sx}" y="${y}" class="label" font-size="9.5">${label}</text>
    <text x="${sx}" y="${y + 30}" font-family="${FONTS.sans}" font-size="28" font-weight="700" fill="${color}">${fmt.format(value)}</text>
    <text x="${sx + 6 + String(fmt.format(value)).length * 17}" y="${y + 30}" font-family="${FONTS.mono}" font-size="10" fill="${COLORS.dim}">${unit}</text>
  </g>`;
  const streakSvg = `<rect x="${sx - 14}" y="${gy - 8}" width="1" height="${7 * pitch + 8}" fill="${COLORS.line}"/>
    ${stat(gy + 4, "CURRENT STREAK", current, current === 1 ? "day" : "days", COLORS.cyan)}
    ${stat(gy + 62, "LONGEST STREAK", longest, longest === 1 ? "day" : "days", COLORS.violet)}`;

  // 30-day signal.
  const last30 = model.days.slice(-30);
  const sy = gy + 7 * pitch + 66;
  const sw = 520;
  const sh = 64;
  const max = Math.max(...last30.map((d) => d.contributionCount), 1);
  const pts = last30.map((d, i) => [30 + (i / (last30.length - 1 || 1)) * sw, sy + sh - (d.contributionCount / max) * sh]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${round(x)} ${round(y)}`).join("");
  const area = `${line}L${round(pts[pts.length - 1][0])} ${sy + sh}L30 ${sy + sh}Z`;
  const signal = `<text x="30" y="${sy - 14}" class="label">SIGNAL · LAST 30 DAYS</text>
    <text x="${30 + sw}" y="${sy - 14}" text-anchor="end" class="label" font-size="9">PEAK ${max} · BEST DAY ${fmt.format(best.contributionCount)} (${shortDate(best.date)})</text>
    ${[0, 0.5, 1].map((f) => `<rect x="30" y="${round(sy + sh * f)}" width="${sw}" height="1" fill="${COLORS.line}" opacity=".7"/>`).join("")}
    <path d="${area}" fill="url(#signal-fill)"/>
    <path d="${line}" class="trace" pathLength="1" stroke="${COLORS.cyan}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(([x, y], i) => (last30[i].contributionCount ? `<circle cx="${round(x)}" cy="${round(y)}" r="2.2" fill="${COLORS.ice}"/>` : "")).join("")}`;

  // Latest operations.
  const ox = 600;
  const ops = model.recent
    .map((repo, i) => {
      const y = sy + 6 + i * 22;
      const name = repo.name.length > 28 ? `${repo.name.slice(0, 27)}…` : repo.name;
      const color = visible(LANGUAGE_COLORS[repo.language] || "#8b9bb4");
      return `<g class="tile" style="animation-delay:${round(0.6 + i * 0.1, 2)}s">
        <text x="${ox}" y="${y}" font-family="${FONTS.mono}" font-size="11" fill="${COLORS.dim}">${shortDate(repo.pushed)}</text>
        <text x="${ox + 58}" y="${y}" font-family="${FONTS.mono}" font-size="11.5" font-weight="600" fill="${COLORS.text}">${esc(name)}</text>
        ${repo.language ? `<circle cx="${W - 30 - monoWidth(repo.language, 10.5) - 10}" cy="${y - 4}" r="3.5" fill="${color}"/><text x="${W - 30}" y="${y}" text-anchor="end" font-family="${FONTS.mono}" font-size="10.5" fill="${COLORS.muted}">${esc(repo.language)}</text>` : ""}
      </g>`;
    })
    .join("");
  const opsSvg = `<text x="${ox}" y="${sy - 14}" class="label">LATEST PUSHES · PUBLIC REPOS</text>${ops}`;

  const H = sy + sh + 32;
  const frame = screen(W, H);
  return svgDocument({
    width: W,
    height: H,
    title: "Contribution matrix and recent activity",
    desc: `${fmt.format(model.totalContributions)} contributions in the last 12 months. Current streak ${current} days, longest ${longest} days, best day ${best.contributionCount} contributions on ${best.date}. Latest pushes: ${model.recent.map((r) => `${r.name} (${r.pushed.slice(0, 10)})`).join(", ")}. ${syncLabel(model)}.`,
    defs: `${frame.defs}<linearGradient id="signal-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.cyan}" stop-opacity=".35"/><stop offset="1" stop-color="${COLORS.cyan}" stop-opacity="0"/></linearGradient>`,
    style: `.col { animation: fade-in .5s ease both; }
      .tile { animation: rise .6s cubic-bezier(.2,.7,.2,1) both; }
      .trace { stroke-dasharray: 1; animation: trace 2.2s cubic-bezier(.4,0,.2,1) .4s both; }
      @keyframes trace { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }`,
    body: `${frame.body}
${headerBar(W, { code: "ECR://ACTIVITY", title: "CONTRIBUTION MATRIX", right: `${fmt.format(model.totalContributions)} CONTRIBUTIONS · LAST 12 MONTHS` })}
${months}${days}${columns}${legendSvg}
${streakSvg}
<rect x="30" y="${sy - 40}" width="${W - 60}" height="1" fill="${COLORS.line}"/>
${signal}
<rect x="${ox - 22}" y="${sy - 26}" width="1" height="${sh + 26}" fill="${COLORS.line}"/>
${opsSvg}`,
  });
}

// ---------------------------------------------------------------------------------------------

// Each panel is written only when its data was fetched successfully, so a failed run keeps the
// previous panel instead of publishing an error image.
async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const write = async (file, svg) => {
    await writeFile(new URL(file, OUT_DIR), svg);
    console.log(`wrote ${PREVIEW ? ".preview" : "assets"}/telemetry/${file}`);
  };

  if (PREVIEW) {
    const model = previewModel();
    await write("telemetry.svg", renderTelemetry(model));
    await write("activity.svg", renderActivity(model));
    return;
  }

  try {
    const [user, repos] = await Promise.all([fetchUser(), listOwnRepos()]);
    const languages = await fetchLanguages(repos);
    const model = buildModel({ user, repos, languages, now: new Date() });
    await write("telemetry.svg", renderTelemetry(model));
    await write("activity.svg", renderActivity(model));
  } catch (error) {
    console.error(`::warning::telemetry not updated: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
