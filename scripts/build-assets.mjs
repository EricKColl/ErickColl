// Builds the static SVG assets of the profile README from scripts/data/profile.mjs.
// Usage: npm install && npm run build:assets
// Display type (Michroma, SIL OFL 1.1) is converted to outlines at build time because an SVG
// loaded through <img> cannot fetch web fonts. Technology marks are the original full-colour logos
// from Devicon (MIT), or Simple Icons (CC0) in their brand colour where Devicon has none.

import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import opentype from "opentype.js";
import * as simpleIcons from "simple-icons";
import {
  COLORS, FONTS, esc, round, monoWidth, sansWidth, svgDocument, screen, headerBar, statusLight,
} from "./lib/theme.mjs";
import { PROFILE, ICONS, STACK, FEATURED, RACK, TRAJECTORY } from "./data/profile.mjs";

const ROOT = new URL("../", import.meta.url);
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------------------------
// Display type and icons

const fontBuffer = readFileSync(require.resolve("@fontsource/michroma/files/michroma-latin-400-normal.woff"));
const DISPLAY = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));

// Glyph-by-glyph layout with kerning; tracking is in em. Returns outline path data and its width.
function outline(text, size, tracking = 0) {
  const scale = size / DISPLAY.unitsPerEm;
  const glyphs = [...text].map((ch) => DISPLAY.charToGlyph(ch));
  let pen = 0;
  const parts = [];
  glyphs.forEach((glyph, i) => {
    if (i > 0) pen += DISPLAY.getKerningValue(glyphs[i - 1], glyph) * scale;
    parts.push({ glyph, x: pen });
    pen += glyph.advanceWidth * scale + (i < glyphs.length - 1 ? tracking * size : 0);
  });
  return {
    width: pen,
    at(x, y) {
      return parts.map(({ glyph, x: gx }) => glyph.getPath(x + gx, y, size).toPathData(1)).join("");
    },
  };
}

function display(text, x, y, size, { tracking = 0.04, anchor = "start", attrs = "" } = {}) {
  const shape = outline(text, size, tracking);
  const left = anchor === "middle" ? x - shape.width / 2 : anchor === "end" ? x - shape.width : x;
  return { width: shape.width, svg: `<path ${attrs} d="${shape.at(left, y)}"/>` };
}

const SIMPLE_ICONS = Object.fromEntries(Object.values(simpleIcons).filter((i) => i && i.slug).map((i) => [i.slug, i]));
const DEVICON_DIR = new URL("../node_modules/devicon/icons/", import.meta.url);
// Two decimals in a 24- or 128-unit icon grid is far below a device pixel at these sizes.
const trim = (d) => d.replace(/(\d*\.\d{2})\d+/g, "$1");

function brandIcon(slug, x, y, size, fill) {
  const icon = SIMPLE_ICONS[slug];
  if (!icon) throw new Error(`Unknown Simple Icons slug: ${slug}`);
  return `<path transform="translate(${round(x)} ${round(y)}) scale(${round(size / 24, 4)})" fill="${fill}" d="${trim(icon.path)}"/>`;
}

// Brand colours are chosen for white pages; lift the darkest ones so they stay visible on the screen.
function onScreen(hex) {
  const n = parseInt(hex, 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (lum < 0.1) return COLORS.text;
  if (lum >= 0.32) return `#${hex}`;
  return `#${rgb.map((c) => Math.round(c + (255 - c) * 0.45).toString(16).padStart(2, "0")).join("")}`;
}

// Original Devicon artwork, nested as its own viewport. Internal ids (gradients) are scoped per use,
// so the same logo can appear twice in one document.
const deviconCache = new Map();
let markId = 0;
function devicon(slug, x, y, size) {
  if (!deviconCache.has(slug)) {
    const raw = readFileSync(new URL(`${slug}.svg`, DEVICON_DIR), "utf8");
    const viewBox = raw.match(/viewBox="([^"]+)"/)[1];
    const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    deviconCache.set(slug, { viewBox, inner: trim(inner) });
  }
  const { viewBox, inner } = deviconCache.get(slug);
  const p = `m${++markId}`;
  const scoped = inner
    .replace(/id="([^"]+)"/g, `id="${p}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${p}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${p}-$1"`);
  return `<svg x="${round(x)}" y="${round(y)}" width="${size}" height="${size}" viewBox="${viewBox}">${scoped}</svg>`;
}

// Monogram tile in the brand colour, for marks that are unavailable or not permitted.
function monogram(text, x, y, size, color) {
  const fs = text.length > 2 ? size * 0.4 : size * 0.5;
  return `<g><rect x="${round(x + 0.5)}" y="${round(y + 0.5)}" width="${size - 1}" height="${size - 1}" rx="3.5" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-opacity=".8"/>
<text x="${round(x + size / 2)}" y="${round(y + size / 2 + fs * 0.36)}" text-anchor="middle" font-family="${FONTS.mono}" font-size="${round(fs)}" font-weight="700" fill="${color}">${esc(text)}</text></g>`;
}

function techMark(key, x, y, size) {
  const spec = ICONS[key];
  if (!spec) throw new Error(`No icon defined for "${key}" in scripts/data/profile.mjs`);
  if (spec.dev) return devicon(spec.dev, x, y, size);
  if (spec.si) return brandIcon(spec.si, x, y, size, onScreen(SIMPLE_ICONS[spec.si].hex));
  return monogram(spec.mono, x, y, size, spec.color);
}

const write = async (path, svg) => {
  const url = new URL(path, ROOT);
  await mkdir(new URL("./", url), { recursive: true });
  await writeFile(url, svg);
  console.log(`wrote ${path} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
};

// ---------------------------------------------------------------------------------------------
// Hero: boot sequence → identity → Compounding Core

function arcPath(cx, cy, r, a0, a1) {
  const rad = (a) => (a * Math.PI) / 180;
  const p = (a) => `${round(cx + r * Math.cos(rad(a)), 2)} ${round(cy + r * Math.sin(rad(a)), 2)}`;
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${p(a0)}A${r} ${r} 0 ${large} 1 ${p(a1)}`;
}

// The visual signature: the profile's philosophy (discipline → consistency → skill → value)
// drawn as concentric rings whose energy flows inward to the core.
function compoundingCore(cx, cy, { scale = 1, idPrefix = "core", labels = true } = {}) {
  const rings = [
    { r: 148, label: "01 · DISCIPLINE", color: COLORS.violet },
    { r: 112, label: "02 · CONSISTENCY", color: COLORS.blue },
    { r: 78, label: "03 · SKILL", color: COLORS.cyan },
  ];
  const fontSize = 9.5;
  const tracking = 2.6;
  let defs = "";
  let body = "";

  rings.forEach((ring, i) => {
    const textLen = monoWidth(ring.label, fontSize, tracking);
    const span = ((textLen + 22) / ring.r) * (180 / Math.PI);
    const gapStart = -90 - span / 2;
    const gapEnd = -90 + span / 2;
    body += `<path d="${arcPath(0, 0, ring.r, gapEnd, gapStart + 360)}" stroke="${ring.color}" stroke-opacity=".6"/>`;
    if (labels) {
      const id = `${idPrefix}-label-${i}`;
      defs += `<path id="${id}" d="${arcPath(0, 0, ring.r - 3.3, gapStart, gapEnd)}"/>`;
      body += `<text font-family="${FONTS.mono}" font-size="${fontSize}" font-weight="600" letter-spacing="${tracking}" fill="${ring.color}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(ring.label)}</textPath></text>`;
    }
  });

  // Outer instrument ring (slow rotation).
  let ticks = "";
  for (let a = 0; a < 360; a += 5) {
    const major = a % 30 === 0;
    const r0 = 155;
    const r1 = major ? 163 : 158.5;
    const rad = (a * Math.PI) / 180;
    ticks += `M${round(r0 * Math.cos(rad), 2)} ${round(r0 * Math.sin(rad), 2)}L${round(r1 * Math.cos(rad), 2)} ${round(r1 * Math.sin(rad), 2)}`;
  }
  body += `<g class="spin-slow"><path d="${ticks}" stroke="${COLORS.ice}" stroke-opacity=".35"/>
    <circle r="163" stroke="${COLORS.cyan}" stroke-opacity=".5" stroke-width="1.6" stroke-dasharray="40 980"/></g>`;

  // Comet orbiting the consistency ring.
  defs += `<linearGradient id="${idPrefix}-comet" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${COLORS.cyan}"/><stop offset="1" stop-color="${COLORS.cyan}" stop-opacity="0"/></linearGradient>`;
  body += `<g class="spin-comet"><path d="${arcPath(0, 0, 112, 200, 250)}" stroke="url(#${idPrefix}-comet)" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="${round(112 * Math.cos((250 * Math.PI) / 180), 2)}" cy="${round(112 * Math.sin((250 * Math.PI) / 180), 2)}" r="3.2" fill="${COLORS.ice}"/></g>`;

  // Counter-rotating skill dashes.
  body += `<circle class="spin-reverse" r="68" stroke="${COLORS.violet}" stroke-opacity=".6" stroke-width="1.4" stroke-dasharray="2 7"/>`;

  // Inward energy: four spokes carrying packets from the outer ring to the core.
  [45, 135, 225, 315].forEach((a, i) => {
    const rad = (a * Math.PI) / 180;
    const d = `M${round(150 * Math.cos(rad), 2)} ${round(150 * Math.sin(rad), 2)}L${round(46 * Math.cos(rad), 2)} ${round(46 * Math.sin(rad), 2)}`;
    body += `<path d="${d}" stroke="${COLORS.lineHi}" stroke-opacity=".7"/>`;
    body += `<path d="${d}" class="inflow" style="animation-delay:-${i * 0.6}s" stroke="${COLORS.cyan}" stroke-width="2" stroke-linecap="round"/>`;
  });

  // Core.
  defs += `<radialGradient id="${idPrefix}-glow"><stop offset="0" stop-color="${COLORS.cyan}" stop-opacity=".55"/><stop offset=".55" stop-color="${COLORS.blueDeep}" stop-opacity=".18"/><stop offset="1" stop-color="${COLORS.blueDeep}" stop-opacity="0"/></radialGradient>
  <radialGradient id="${idPrefix}-halo"><stop offset="0" stop-color="${COLORS.blue}" stop-opacity=".22"/><stop offset="1" stop-color="${COLORS.blue}" stop-opacity="0"/></radialGradient>`;
  const mono = display("EC", 0, 8.5, 22, { anchor: "middle", tracking: 0.02, attrs: `fill="${COLORS.text}"` });
  body = `<circle r="185" fill="url(#${idPrefix}-halo)"/>${body}
    <circle r="70" fill="url(#${idPrefix}-glow)" class="breathe"/>
    <circle r="42" fill="${COLORS.void}" fill-opacity=".85" stroke="${COLORS.cyan}" stroke-opacity=".8"/>
    <circle r="36" stroke="${COLORS.ice}" stroke-opacity=".25" stroke-dasharray="1 3"/>
    ${mono.svg}
    <text y="27" text-anchor="middle" font-family="${FONTS.mono}" font-size="7.5" font-weight="700" letter-spacing="2" fill="${COLORS.green}">04·VALUE</text>`;

  return {
    defs,
    body: `<g transform="translate(${cx} ${cy}) scale(${scale})">${body}</g>`,
  };
}

const CORE_STYLE = `
  .spin-slow { animation: spin 140s linear infinite; transform-box: view-box; transform-origin: 0 0; }
  .spin-comet { animation: spin 16s linear infinite; transform-box: view-box; transform-origin: 0 0; }
  .spin-reverse { animation: spin-reverse 48s linear infinite; transform-box: view-box; transform-origin: 0 0; }
  .inflow { stroke-dasharray: 3 47; animation: inflow 2.4s linear infinite; }
  @keyframes inflow { from { stroke-dashoffset: 50; } to { stroke-dashoffset: 0; } }`;

function roleTicker(x, y, size) {
  const charW = size * 0.6;
  const slot = 3.8;
  const cycle = slot * PROFILE.roles.length;
  const caretTimes = [0];
  const caretValues = [x + PROFILE.roles[0].length * charW];
  let defs = "";
  let body = "";
  const kt = (t) => round(Math.min(t / cycle, 1), 4);

  PROFILE.roles.forEach((role, i) => {
    const width = role.length * charW;
    const start = i * slot;
    const typeEnd = start + Math.min(1.3, role.length * 0.045);
    const holdEnd = start + slot - 0.55;
    const eraseEnd = start + slot - 0.2;
    const times = [0];
    const values = [0];
    // Typing, one character per step.
    for (let c = 0; c <= role.length; c++) {
      const t = start + ((typeEnd - start) * c) / role.length;
      times.push(t);
      values.push(c * charW);
      caretTimes.push(t);
      caretValues.push(x + c * charW);
    }
    times.push(holdEnd, eraseEnd, cycle);
    values.push(width, 0, 0);
    caretTimes.push(holdEnd, eraseEnd);
    caretValues.push(x + width, x);

    const id = `role-clip-${i}`;
    defs += `<clipPath id="${id}"><rect x="${x}" y="${y - size}" height="${size * 1.4}" width="${i === 0 ? round(width) : 0}">
      <animate attributeName="width" dur="${cycle}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times.map(kt).join(";")}" values="${values.map((v) => round(v)).join(";")}"/>
    </rect></clipPath>`;
    body += `<text x="${x}" y="${y}" clip-path="url(#${id})" textLength="${round(width)}" lengthAdjust="spacing" font-family="${FONTS.mono}" font-size="${size}" font-weight="500" fill="${COLORS.ice}">${esc(role)}</text>`;
  });
  caretTimes.push(cycle);
  caretValues.push(caretValues[0]);
  body += `<rect x="${round(caretValues[0])}" y="${y - size * 0.82}" width="${round(size * 0.55)}" height="${round(size * 1.02)}" fill="${COLORS.cyan}" class="caret">
    <animate attributeName="x" dur="${cycle}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${caretTimes.map(kt).join(";")}" values="${caretValues.map((v) => round(v)).join(";")}"/>
  </rect>`;
  return { defs, body };
}

function hero() {
  const W = 1000;
  const H = 520;
  const frame = screen(W, H);
  const core = compoundingCore(790, 262, { idPrefix: "hero" });
  const roles = roleTicker(80, 300, 17);
  const x0 = 56;
  const statusX = round(W - 26 - 11 - monoWidth(PROFILE.status, 11, 1.6));

  const nameGradient = `<linearGradient id="name-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="${COLORS.ice}"/><stop offset="1" stop-color="${COLORS.cyan}"/></linearGradient>
  <filter id="name-glow" x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
  <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.cyan}" stop-opacity="0"/><stop offset="1" stop-color="${COLORS.cyan}" stop-opacity=".22"/></linearGradient>`;
  const line1 = display(PROFILE.name[0], x0, 176, 50, { tracking: 0.05 });
  const line2 = display(PROFILE.name[1], x0, 240, 50, { tracking: 0.05 });
  const namePaths = `<path d="${line1.svg.match(/d="([^"]+)"/)[1]}${line2.svg.match(/d="([^"]+)"/)[1]}"`;

  const readouts = PROFILE.readouts
    .map(([label, value], i) => {
      const cx = x0 + (i % 2) * 250;
      const cy = 366 + Math.floor(i / 2) * 48;
      return `<g class="rise d${6 + i}">
        <rect x="${cx}" y="${cy - 12}" width="2" height="32" fill="${i % 2 ? COLORS.violet : COLORS.cyan}"/>
        <text x="${cx + 14}" y="${cy}" class="label">${label}</text>
        <text x="${cx + 14}" y="${cy + 19}" class="strong" font-size="${sansWidth(value, 14.5, true) > 226 ? 13.5 : 14.5}">${esc(value)}</text>
      </g>`;
    })
    .join("");

  const tickerY = 478;
  const cell = (W - 56) / PROFILE.ticker.length;
  const ticker = PROFILE.ticker
    .map(([label, value, color], i) => {
      const x = 28 + i * cell;
      return `<g>
        ${i ? `<rect x="${round(x - 14)}" y="${tickerY - 12}" width="1" height="30" fill="${COLORS.line}"/>` : ""}
        <circle cx="${round(x + 4)}" cy="${tickerY - 4}" r="3" fill="${COLORS[color]}" class="pulse" style="animation-delay:-${i * 0.5}s"/>
        <text x="${round(x + 14)}" y="${tickerY}" class="label" font-size="9.5">${label}</text>
        <text x="${round(x + 14)}" y="${tickerY + 17}" font-family="${FONTS.mono}" font-size="${monoWidth(value, 12, 1) > cell - 26 ? 11 : 12}" font-weight="700" letter-spacing="${monoWidth(value, 12, 1) > cell - 26 ? 0.4 : 1}" fill="${COLORS.text}">${esc(value)}</text>
      </g>`;
    })
    .join("");

  const bootX = 270;
  const boot = PROFILE.boot
    .map(([task, result], i) => {
      const dots = ".".repeat(Math.max(3, 30 - task.length));
      const y = 230 + i * 26;
      return `<g class="boot-line" style="animation-delay:${round(0.1 + i * 0.16, 2)}s">
        <text x="${bootX}" y="${y}" font-family="${FONTS.mono}" font-size="13" fill="${COLORS.green}">[ OK ]</text>
        <text x="${bootX + 62}" y="${y}" font-family="${FONTS.mono}" font-size="13" fill="${COLORS.muted}" textLength="${round(monoWidth(`${task} ${dots}`, 13))}" lengthAdjust="spacing">${task} <tspan fill="${COLORS.lineHi}">${dots}</tspan></text>
        <text x="${bootX + 62 + monoWidth(`${task} ${dots} `, 13)}" y="${y}" font-family="${FONTS.mono}" font-size="13" fill="${COLORS.text}">${esc(result)}</text>
      </g>`;
    })
    .join("");

  const style = `${CORE_STYLE}
    .rise { animation: rise .8s cubic-bezier(.2,.7,.2,1) both; }
    .d0 { animation-delay: 1.15s; } .d1 { animation-delay: 1.22s; } .d2 { animation-delay: 1.3s; }
    .d3 { animation-delay: 1.38s; } .d4 { animation-delay: 1.45s; } .d5 { animation-delay: 1.5s; }
    .d6 { animation-delay: 1.55s; } .d7 { animation-delay: 1.6s; } .d8 { animation-delay: 1.65s; } .d9 { animation-delay: 1.7s; }
    .fade { animation: fade-in 1.4s ease both; }
    .boot { opacity: 0; animation: boot 1.5s ease both; }
    @keyframes boot { 0%, 72% { opacity: 1; } 100% { opacity: 0; } }
    .boot-line { animation: rise .35s ease both; }
    .boot-bar { transform-box: fill-box; transform-origin: left; animation: bar .8s cubic-bezier(.4,0,.2,1) .1s both; }
    @keyframes bar { from { transform: scaleX(0); } }
    .ready { animation: fade-in .25s ease .85s both; }
    .status-boot { opacity: 0; animation: boot 1.5s ease both; }
    .status-online { animation: fade-in .6s ease 1.3s both; }
    .caret { animation: pulse 1.1s steps(1) infinite; }
    .scanline { animation: scan 9s linear 2.5s infinite; }
    @keyframes scan { from { transform: translateY(0); } to { transform: translateY(${H + 60}px); } }
    .typing-static { display: none; }
    @media (prefers-reduced-motion: reduce) { .typing { display: none; } .typing-static { display: inline; } }`;

  const body = `${frame.body}
<g clip-path="url(#screen-clip)"><g class="scanline"><rect x="0" y="-60" width="${W}" height="58" fill="url(#scan)" opacity=".55"/><rect x="0" y="-2" width="${W}" height="1" fill="${COLORS.cyan}" opacity=".35"/></g></g>
${headerBar(W, { code: "ECR//OS", title: "DEVELOPER OPERATING SYSTEM" })}
<g class="status-boot">${statusLight(statusX, 27, { label: "BOOTING", color: COLORS.amber })}</g>
<g class="status-online">${statusLight(statusX, 27, { label: PROFILE.status, color: COLORS.green })}</g>

<g class="rise d0">
  <rect x="${x0}" y="92" width="7" height="7" fill="${COLORS.cyan}"/>
  <text x="${x0 + 18}" y="100" font-family="${FONTS.mono}" font-size="11.5" font-weight="600" letter-spacing="2.6" fill="${COLORS.muted}">${PROFILE.node}</text>
</g>
<g class="rise d1">
  ${namePaths} fill="${COLORS.cyan}" opacity=".45" filter="url(#name-glow)"/>
  ${namePaths} fill="url(#name-fill)"/>
</g>
<g class="rise d3">
  <text x="${x0}" y="300" font-family="${FONTS.mono}" font-size="17" font-weight="700" fill="${COLORS.cyan}">&gt;</text>
  <g class="typing">${roles.body}</g>
  <text class="typing-static" x="80" y="300" font-family="${FONTS.mono}" font-size="17" font-weight="500" fill="${COLORS.ice}">${esc(PROFILE.roles[0])}</text>
</g>
<text x="${x0}" y="336" class="rise d4" font-family="${FONTS.mono}" font-size="12" font-weight="600" letter-spacing="5" fill="${COLORS.dim}">${PROFILE.motto}</text>
${readouts}
<g class="fade d2">${core.body}</g>

<rect x="1" y="${tickerY - 30}" width="${W - 2}" height="1" fill="${COLORS.line}"/>
<g class="rise d9">${ticker}</g>

<g class="boot">
  <rect clip-path="url(#screen-clip)" x="0" y="47" width="${W}" height="${H - 47}" fill="${COLORS.void}"/>
  <text x="${bootX}" y="196" font-family="${FONTS.mono}" font-size="12" font-weight="700" letter-spacing="3" fill="${COLORS.cyan}">ECR//OS · COLD BOOT</text>
  ${boot}
  <rect x="${bootX}" y="340" width="460" height="4" rx="2" fill="${COLORS.line}"/>
  <rect class="boot-bar" x="${bootX}" y="340" width="460" height="4" rx="2" fill="${COLORS.cyan}"/>
  <text class="ready" x="${bootX}" y="372" font-family="${FONTS.mono}" font-size="12" font-weight="700" letter-spacing="3" fill="${COLORS.green}">SYSTEM READY</text>
  <text class="ready" x="${bootX + 460}" y="372" text-anchor="end" font-family="${FONTS.mono}" font-size="12" fill="${COLORS.dim}">100%</text>
</g>`;

  return svgDocument({
    width: W,
    height: H,
    title: "ECR//OS — Erick Coll Rodríguez, developer operating system",
    desc: `Erick Coll Rodríguez, full-stack developer in training, ${PROFILE.status.toLowerCase()}. ${PROFILE.roles.join(". ")}. ${PROFILE.readouts.map(([l, v]) => `${l}: ${v}`).join(". ")}. ${PROFILE.ticker.map(([l, v]) => `${l}: ${v}`).join(". ")}.`,
    defs: frame.defs + nameGradient + core.defs + roles.defs,
    style,
    body,
  });
}

// ---------------------------------------------------------------------------------------------
// Trajectory: the journey graph (operations → DAW → full-stack + applied AI → goal).

function trajectory() {
  const W = 1000;
  const H = 350;
  const frame = screen(W, H);
  const mid = 192;
  const nodes = {
    admin: { x: 92, y: mid },
    daw: { x: 320, y: mid },
    fork: { x: 420, y: mid },
    full: { x: 540, y: 140 },
    ai: { x: 540, y: 244 },
    join: { x: 790, y: mid },
    goal: { x: 850, y: mid },
  };
  const [admin, daw, full, ai, goal] = TRAJECTORY;
  const lane = (from) =>
    `M${from.x} ${from.y}H${from.x + 120}C${from.x + 180} ${from.y} ${nodes.join.x - 60} ${mid} ${nodes.join.x} ${mid}H${nodes.goal.x}`;
  const paths = [
    `M${nodes.admin.x} ${mid}H${nodes.daw.x}`,
    `M${nodes.daw.x} ${mid}H${nodes.fork.x}`,
    `M${nodes.fork.x} ${mid}C${nodes.fork.x + 60} ${mid} ${nodes.full.x - 70} ${nodes.full.y} ${nodes.full.x} ${nodes.full.y}`,
    `M${nodes.fork.x} ${mid}C${nodes.fork.x + 60} ${mid} ${nodes.ai.x - 70} ${nodes.ai.y} ${nodes.ai.x} ${nodes.ai.y}`,
    lane(nodes.full),
    lane(nodes.ai),
  ];
  const wires = paths
    .map((d, i) => `<path d="${d}" stroke="${COLORS.lineHi}" stroke-width="1.5"/><path d="${d}" class="flow" style="animation-delay:-${i * 0.3}s" stroke="${COLORS.cyan}" stroke-width="2" stroke-linecap="round"/>`)
    .join("");

  const marker = (x, y, color, big = false) => `<circle cx="${x}" cy="${y}" r="${big ? 15 : 11}" fill="${color}" fill-opacity=".12" class="breathe"/>
    <circle cx="${x}" cy="${y}" r="${big ? 7 : 5.5}" fill="${COLORS.void}" stroke="${color}" stroke-width="2"/>
    <circle cx="${x}" cy="${y}" r="${big ? 2.6 : 2}" fill="${color}"/>`;

  const block = (step, x, y) => {
    const color = COLORS[step.color];
    const title = display(step.title, x, y + 18, 13, { tracking: 0.06, attrs: `fill="${COLORS.text}"` });
    return `<text x="${x}" y="${y}" class="label" style="fill:${color}">STEP ${step.index}</text>
      ${title.svg}
      ${step.lines.map((line, i) => `<text x="${x}" y="${y + 40 + i * 17}" font-family="${FONTS.sans}" font-size="13" fill="${COLORS.muted}">${esc(line)}</text>`).join("")}`;
  };

  return svgDocument({
    width: W,
    height: H,
    title: "Trajectory — from operations to full-stack development and applied AI",
    desc: TRAJECTORY.map((s) => `Step ${s.index} ${s.title}: ${s.lines.join(" ")}`).join(". "),
    defs: frame.defs,
    body: `${frame.body}
${headerBar(W, { code: "ECR://PATH", title: "TRAJECTORY", right: "operations → daw → full-stack + applied ai → goal" })}
${wires}
${marker(nodes.admin.x, mid, COLORS.violet)}${marker(nodes.daw.x, mid, COLORS.cyan)}
${marker(nodes.full.x, nodes.full.y, COLORS.blue)}${marker(nodes.ai.x, nodes.ai.y, COLORS.violet)}
${marker(nodes.goal.x, mid, COLORS.green, true)}
${block(admin, nodes.admin.x - 32, mid + 36)}
${block(daw, nodes.daw.x - 32, mid + 36)}
${block(full, nodes.full.x - 24, nodes.full.y - 80)}
${block(ai, nodes.ai.x - 24, nodes.ai.y + 36)}
${block(goal, nodes.goal.x - 40, mid + 36)}`,
  });
}

// ---------------------------------------------------------------------------------------------
// Technology chips with the original full-colour marks.

function chip(x, y, [label, key, tier], { size = 11.5, h = 30, icon = 16, textColor } = {}) {
  const live = tier === "live";
  const w = round(10 + icon + 8 + monoWidth(label, size) + (live ? 22 : 12));
  return {
    w,
    svg: `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${live ? COLORS.raised : COLORS.panel}" stroke="${live ? COLORS.cyan : COLORS.line}" stroke-opacity="${live ? 0.6 : 1}"/>
      ${techMark(key ?? label, x + 10, y + (h - icon) / 2, icon)}
      <text x="${round(x + 10 + icon + 8)}" y="${round(y + h / 2 + size * 0.36)}" font-family="${FONTS.mono}" font-size="${size}" font-weight="${live ? 600 : 500}" fill="${textColor ?? (live ? COLORS.text : COLORS.muted)}">${esc(label)}</text>
      ${live ? `<circle cx="${round(x + w - 11)}" cy="${y + h / 2}" r="3" fill="${COLORS.green}" class="pulse"/>` : ""}
    </g>`,
  };
}

function flowChips(items, x0, y0, maxW, opts = {}) {
  const gap = opts.gap ?? 8;
  const h = opts.h ?? 30;
  let x = x0;
  let y = y0;
  let svg = "";
  for (const item of items) {
    let c = chip(x, y, item, opts);
    if (x > x0 && x + c.w > x0 + maxW) {
      x = x0;
      y += h + 9;
      c = chip(x, y, item, opts);
    }
    svg += c.svg;
    x += c.w + gap;
  }
  return { svg, bottom: y + h };
}

function technologyMatrix() {
  const W = 1000;
  const colX = 214;
  let y = 78;
  let rows = "";
  STACK.forEach((group, i) => {
    const chips = flowChips(group.items, colX, y, W - colX - 30);
    rows += `<g>
      <rect x="30" y="${y}" width="2" height="${chips.bottom - y}" fill="${i % 2 ? COLORS.violet : COLORS.cyan}" opacity=".85"/>
      <text x="46" y="${y + 14}" font-family="${FONTS.mono}" font-size="11.5" font-weight="700" letter-spacing="2" fill="${COLORS.text}">${group.layer}</text>
      <text x="46" y="${y + 30}" class="label" font-size="10" letter-spacing="1.2">${esc(group.caption)} · ${group.items.length}</text>
      ${chips.svg}
    </g>`;
    y = chips.bottom + 16;
    if (i < STACK.length - 1) rows += `<rect x="30" y="${y - 8}" width="${W - 60}" height="1" fill="${COLORS.line}" opacity=".7"/>`;
  });
  const H = y + 14;
  const frame = screen(W, H);
  const total = STACK.reduce((n, g) => n + g.items.length, 0);
  const live = STACK.reduce((n, g) => n + g.items.filter((it) => it[2] === "live").length, 0);
  const legend = `<g>
    <circle cx="${W - 356}" cy="23" r="3" fill="${COLORS.green}"/>
    <text x="${W - 348}" y="27" class="meta">LIVE IN PRODUCTION</text>
    <rect x="${W - 192}" y="17" width="12" height="12" rx="3" stroke="${COLORS.line}" fill="${COLORS.panel}"/>
    <text x="${W - 174}" y="27" class="meta">IN USE · LEARNING</text>
  </g>`;
  return svgDocument({
    width: W,
    height: H,
    title: "Technology matrix",
    desc: `${total} technologies across ${STACK.length} layers, ${live} of them shipped in live products. ${STACK.map((g) => `${g.layer}: ${g.items.map((it) => it[0] + (it[2] === "live" ? " (live)" : "")).join(", ")}`).join(". ")}.`,
    defs: `${frame.defs}<linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLORS.cyan}" stop-opacity="0"/><stop offset=".5" stop-color="${COLORS.cyan}" stop-opacity=".1"/><stop offset="1" stop-color="${COLORS.cyan}" stop-opacity="0"/></linearGradient>`,
    style: `.sweep { animation: sweep 11s cubic-bezier(.45,0,.55,1) 1s infinite; }
      @keyframes sweep { from { transform: translateX(${colX}px); } 60%, to { transform: translateX(${W + 160}px); } }`,
    body: `${frame.body}
${headerBar(W, { code: "ECR://STACK", title: "TECHNOLOGY MATRIX" })}
${legend}
<g clip-path="url(#screen-clip)"><g class="sweep"><rect x="-140" y="48" width="140" height="${H - 50}" fill="url(#sweep)"/></g></g>
${rows}`,
  });
}

// ---------------------------------------------------------------------------------------------
// Featured project modules with their real architecture.

function archBox(x, y, w, h, { tag, title, lines }, accent = COLORS.cyan) {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${COLORS.raised}" fill-opacity=".85" stroke="${COLORS.lineHi}"/>
    <path d="M${x + 14} ${y + 0.5}H${x + 70}" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    <text x="${x + 16}" y="${y + 23}" class="label" style="fill:${accent}">${esc(tag)}</text>
    <text x="${x + 16}" y="${y + 45}" font-family="${FONTS.sans}" font-size="16" font-weight="700" fill="${COLORS.text}">${esc(title)}</text>
    ${lines.map((line, i) => `<text x="${x + 16}" y="${y + 66 + i * 16}" font-family="${FONTS.mono}" font-size="11" fill="${COLORS.muted}">${esc(line)}</text>`).join("")}
  </g>`;
}

function link(x1, x2, y, label) {
  return `<g>
    <path d="M${x1} ${y}H${x2}" stroke="${COLORS.lineHi}" stroke-width="1.5"/>
    <path d="M${x1} ${y}H${x2}" class="flow" stroke="${COLORS.cyan}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M${x2 - 7} ${y - 4.5}L${x2} ${y}L${x2 - 7} ${y + 4.5}" stroke="${COLORS.cyan}" stroke-width="1.5" stroke-linejoin="round"/>
    <text x="${(x1 + x2) / 2}" y="${y - 10}" text-anchor="middle" font-family="${FONTS.mono}" font-size="9.5" fill="${COLORS.muted}">${esc(label)}</text>
  </g>`;
}

function wrapLabel(text, maxW, size = 9.5) {
  const lines = [""];
  for (const word of text.split(" ")) {
    const next = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (monoWidth(next, size) > maxW && lines[lines.length - 1]) lines.push(word);
    else lines[lines.length - 1] = next;
  }
  return lines;
}

function moduleCard(mod) {
  const W = 1000;
  const pad = 40;
  let y = 104;
  let body = "";

  const name = display(mod.name, pad, y, 30, { tracking: 0.08, attrs: `fill="url(#title-fill)"` });
  body += name.svg;
  body += `<text x="${pad + name.width + 18}" y="${y - 2}" font-family="${FONTS.sans}" font-size="15" font-weight="600" fill="${COLORS.muted}">${esc(mod.kind)}</text>`;

  // The summary lives in the README as real text (readable on phones), so the card starts at the diagram.
  y += 44;

  body += `<text x="${pad}" y="${y}" class="label">ARCHITECTURE</text>`;
  y += 14;
  const boxW = 244;
  const boxH = 100;
  const gapW = (W - pad * 2 - boxW * 3) / 2;
  mod.flow.forEach((node, i) => {
    const x = pad + i * (boxW + gapW);
    body += archBox(x, y, boxW, boxH, node, i === 1 ? COLORS.violet : COLORS.cyan);
    if (i < mod.flow.length - 1) body += link(x + boxW + 6, x + boxW + gapW - 6, y + boxH / 2, mod.edges[i]);
  });
  y += boxH;

  if (mod.extras) {
    const busY = y + 26;
    const extraH = 56;
    const busStart = pad + boxW / 2;
    body += `<path d="M${busStart} ${y}V${busY}H${W - pad - boxW / 2}" stroke="${COLORS.violet}" stroke-opacity=".7" stroke-dasharray="4 5"/>
      <text x="${busStart + 10}" y="${busY - 7}" font-family="${FONTS.mono}" font-size="9.5" fill="${COLORS.dim}">optional · lazy-loaded modules</text>`;
    mod.extras.forEach((extra, i) => {
      const x = pad + i * (boxW + gapW);
      const ey = busY + 16;
      body += `<path d="M${x + boxW / 2} ${busY}V${ey}" stroke="${COLORS.violet}" stroke-opacity=".7" stroke-dasharray="4 5"/>
        <circle cx="${x + boxW / 2}" cy="${busY}" r="2.5" fill="${COLORS.violet}"/>
        <rect x="${x}" y="${ey}" width="${boxW}" height="${extraH}" rx="9" fill="${COLORS.panel}" stroke="${COLORS.violet}" stroke-opacity=".45" stroke-dasharray="3 3"/>
        <text x="${x + 16}" y="${ey + 22}" class="label" style="fill:${COLORS.violet}">${esc(extra.tag)}</text>
        <text x="${x + 16 + monoWidth(extra.tag, 10, 1.8) + 8}" y="${ey + 22}" font-family="${FONTS.sans}" font-size="14" font-weight="700" fill="${COLORS.text}">${esc(extra.title)}</text>
        <text x="${x + 16}" y="${ey + 42}" font-family="${FONTS.mono}" font-size="11" fill="${COLORS.muted}">${esc(extra.line)}</text>`;
    });
    y = busY + 16 + extraH;
  }

  y += 36;
  const colSplit = 560;
  body += `<text x="${pad}" y="${y}" class="label">${mod.systemsTitle}</text>`;
  mod.systems.forEach((line, i) => {
    const ly = y + 26 + i * 23;
    body += `<path d="M${pad} ${ly - 5}l4-4 4 4-4 4z" fill="${COLORS.cyan}"/>
      <text x="${pad + 18}" y="${ly}" font-family="${FONTS.sans}" font-size="14" fill="${COLORS.text}">${esc(line)}</text>`;
  });
  body += `<text x="${colSplit}" y="${y}" class="label">${mod.metricsTitle}</text>`;
  const tileW = (W - pad - colSplit - 3 * 10) / 4;
  mod.metrics.forEach(([value, label], i) => {
    const tx = colSplit + i * (tileW + 10);
    const valueSize = value.length > 3 ? (monoWidth(value, 17, 1.5) > tileW - 14 ? 14.5 : 17) : 28;
    body += `<g>
      <rect x="${round(tx)}" y="${y + 12}" width="${round(tileW)}" height="86" rx="9" fill="${COLORS.panel}" stroke="${COLORS.line}"/>
      <text x="${round(tx + tileW / 2)}" y="${y + (valueSize > 20 ? 56 : 52)}" text-anchor="middle" font-family="${valueSize > 20 ? FONTS.sans : FONTS.mono}" font-size="${valueSize}" font-weight="700" letter-spacing="${valueSize > 20 ? 0 : 1.5}" fill="${COLORS.cyan}">${esc(value)}</text>
      ${wrapLabel(label, tileW - 12).map((l, j) => `<text x="${round(tx + tileW / 2)}" y="${y + 76 + j * 12}" text-anchor="middle" font-family="${FONTS.mono}" font-size="9.5" fill="${COLORS.muted}">${esc(l)}</text>`).join("")}
    </g>`;
  });
  y += 26 + mod.systems.length * 23 + 18;

  body += `<rect x="${pad}" y="${y - 4}" width="${W - pad * 2}" height="1" fill="${COLORS.line}"/>`;
  const chips = flowChips(mod.stack.map(([label, key]) => [label, key]), pad, y + 12, W - pad * 2, { size: 10.5, h: 28, icon: 15, gap: 6, textColor: COLORS.text });
  body += chips.svg;
  const H = chips.bottom + 24;

  const frame = screen(W, H);
  const urlW = monoWidth(mod.url, 11, 1.2);
  return svgDocument({
    width: W,
    height: H,
    title: `${mod.name} — ${mod.kind}`,
    desc: `${mod.summary} Architecture: ${mod.flow.map((n) => `${n.tag} ${n.title} (${n.lines.join(", ")})`).join(" → ")}${mod.extras ? `; optional modules: ${mod.extras.map((e) => `${e.title} (${e.line})`).join(", ")}` : ""}. ${mod.systemsTitle}: ${mod.systems.join("; ")}. ${mod.metricsTitle}: ${mod.metrics.map(([v, l]) => `${v} ${l}`).join(", ")}. Stack: ${mod.stack.map(([l]) => l).join(", ")}. Live at ${mod.url}.`,
    defs: `${frame.defs}<linearGradient id="title-fill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${COLORS.ice}"/></linearGradient>`,
    body: `${frame.body}
${headerBar(W, { code: `ECR://${mod.index.replace(" ", "/")}`, title: "PROJECT MODULE" })}
${statusLight(W - 26 - urlW - 70, 27, { label: "LIVE", color: COLORS.green })}
<text x="${W - 26}" y="27" class="meta" text-anchor="end" style="fill:${COLORS.ice}">${esc(mod.url)}</text>
${body}`,
  });
}

// ---------------------------------------------------------------------------------------------
// Module rack: the UOC team product lines, each at its most complete iteration.

function moduleRack() {
  const W = 1000;
  const rowH = 128;
  const top = 64;
  const H = top + RACK.length * rowH + 8;
  const frame = screen(W, H);
  const chainX = 430;
  let body = "";

  RACK.forEach((mod, i) => {
    const y = top + i * rowH;
    if (i) body += `<rect x="30" y="${y - 8}" width="${W - 60}" height="1" fill="${COLORS.line}"/>`;
    const index = display(mod.index, 40, y + 38, 22, { tracking: 0.04, attrs: `fill="${COLORS.lineHi}"` });
    const name = display(mod.name, 96, y + 34, 15, { tracking: 0.06, attrs: `fill="${COLORS.text}"` });
    body += `${index.svg}${name.svg}
      <text x="96" y="${y + 55}" font-family="${FONTS.mono}" font-size="10.5" fill="${COLORS.cyan}">${esc(mod.repo)}</text>
      <text x="96" y="${y + 77}" font-family="${FONTS.sans}" font-size="13.5" fill="${COLORS.muted}">${esc(mod.kind)}</text>
      ${mod.icons.map((key, j) => techMark(key, 96 + j * 26, y + 89, 18)).join("")}`;

    let x = chainX;
    const cy = y + 32;
    mod.chain.forEach((part, j) => {
      const w = round(monoWidth(part, 10.5) + 20);
      body += `<rect x="${x}" y="${cy - 15}" width="${w}" height="30" rx="7" fill="${COLORS.raised}" stroke="${j === mod.chain.length - 1 ? COLORS.violet : COLORS.lineHi}" stroke-opacity=".9"/>
        <text x="${x + 10}" y="${cy + 4}" font-family="${FONTS.mono}" font-size="10.5" fill="${COLORS.text}">${esc(part)}</text>`;
      x += w;
      if (j < mod.chain.length - 1) {
        body += `<path d="M${x + 3} ${cy}H${x + 19}" stroke="${COLORS.cyan}" stroke-opacity=".8"/><path d="M${x + 15} ${cy - 3}L${x + 19} ${cy}L${x + 15} ${cy + 3}" stroke="${COLORS.cyan}"/>`;
        x += 22;
      }
    });
    body += `<text x="${chainX}" y="${y + 72}" font-family="${FONTS.mono}" font-size="10.5" fill="${COLORS.muted}"><tspan fill="${COLORS.violet}">+ </tspan>${esc(mod.note)}</text>
      <text x="${chainX}" y="${y + 100}" class="label" font-size="9.5">${esc(mod.context)}</text>`;
  });

  return svgDocument({
    width: W,
    height: H,
    title: "Module rack — team product lines at UOC",
    desc: RACK.map((m) => `${m.index} ${m.name} (${m.repo}): ${m.kind}. ${m.chain.join(" → ")}. ${m.note}. ${m.context}.`).join(" "),
    defs: frame.defs,
    body: `${frame.body}
${headerBar(W, { code: "ECR://MODULES", title: "MODULE RACK", right: "team product lines · UOC" })}
${body}`,
  });
}

// ---------------------------------------------------------------------------------------------
// Footer: a compact closing strip with the philosophy as a pipeline.

function endOfTransmission() {
  const W = 1000;
  const H = 196;
  const frame = screen(W, H);
  const core = compoundingCore(118, 98, { scale: 0.46, idPrefix: "foot", labels: false });
  const x0 = 236;
  const title = display("END OF TRANSMISSION", x0, 60, 17, { tracking: 0.08, attrs: `fill="url(#title-fill)"` });

  let x = x0;
  let pipeline = "";
  PROFILE.philosophy.forEach((word, i) => {
    const color = [COLORS.violet, COLORS.blue, COLORS.cyan, COLORS.green][i];
    const w = monoWidth(word, 11.5, 2.2) + 24;
    pipeline += `<rect x="${round(x)}" y="80" width="${round(w)}" height="28" rx="14" fill="${COLORS.raised}" stroke="${color}" stroke-opacity=".75"/>
      <text x="${round(x + w / 2)}" y="98.5" text-anchor="middle" font-family="${FONTS.mono}" font-size="11.5" font-weight="700" letter-spacing="2.2" fill="${color}">${word}</text>`;
    x += w;
    if (i < PROFILE.philosophy.length - 1) {
      pipeline += `<path d="M${round(x + 4)} 94H${round(x + 46)}" stroke="${COLORS.lineHi}"/><path d="M${round(x + 4)} 94H${round(x + 46)}" class="flow" stroke="${COLORS.cyan}" stroke-width="2"/>
        <text x="${round(x + 25)}" y="87" text-anchor="middle" font-family="${FONTS.mono}" font-size="8.5" fill="${COLORS.dim}">builds</text>`;
      x += 50;
    }
  });

  return svgDocument({
    width: W,
    height: H,
    title: "End of transmission — Discipline builds consistency. Consistency builds skill. Skill builds value.",
    desc: "Philosophy pipeline: discipline builds consistency, consistency builds skill, skill builds value. Building my path through discipline, technology, and continuous growth.",
    defs: `${frame.defs}${core.defs}<linearGradient id="title-fill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${COLORS.ice}"/></linearGradient>`,
    style: CORE_STYLE,
    body: `${frame.body}
${statusLight(W - 26 - 11 - monoWidth("CHANNEL OPEN", 11, 1.6), 34, { label: "CHANNEL OPEN", color: COLORS.green })}
${core.body}
${title.svg}
${pipeline}
<text x="${x0}" y="140" font-family="${FONTS.sans}" font-size="14.5" fill="${COLORS.muted}">Discipline builds consistency. Consistency builds skill. Skill builds value.</text>
<text x="${x0}" y="164" font-family="${FONTS.sans}" font-size="14.5" font-weight="600" fill="${COLORS.text}">Building my path through discipline, technology, and continuous growth.</text>`,
  });
}

// ---------------------------------------------------------------------------------------------
// Call-to-action buttons and status badges: small self-contained pills, legible on both themes.

const GLYPHS = {
  portfolio: "M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5zM3 8.5h18M6.2 5.8h.01M8.4 5.8h.01M10.6 5.8h.01",
  cv: "M6 3h8l4 4v14H6zM14 3v4h4M9 11h6M9 14.5h6M9 18h4",
  email: "M3.5 6h17v12h-17zM3.8 6.4 12 13l8.2-6.6",
};

function ctaButton({ label, detail, glyph, primary }) {
  const H = 52;
  const textW = Math.max(monoWidth(label, 12.5, 2.4), monoWidth(detail, 10.5));
  const W = round(58 + textW + 46);
  const defs = `<linearGradient id="btn-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.cyan}" stop-opacity="${primary ? 0.95 : 0.5}"/><stop offset="1" stop-color="${COLORS.violet}" stop-opacity="${primary ? 0.8 : 0.35}"/></linearGradient>
    <linearGradient id="btn-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="btn-clip"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12"/></clipPath>`;
  return svgDocument({
    width: W,
    height: H,
    title: `${label} — ${detail}`,
    desc: `Button: ${label}, ${detail}`,
    defs,
    style: `.sheen { animation: sheen 6s ease-in-out 2s infinite; } @keyframes sheen { from { transform: translateX(0); } 40%, to { transform: translateX(${W + 160}px); } }`,
    body: `<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="12" fill="${primary ? COLORS.raised : COLORS.base}" stroke="url(#btn-edge)" stroke-width="1.5"/>
    ${primary ? `<g clip-path="url(#btn-clip)"><rect class="sheen" x="-80" y="0" width="80" height="${H}" fill="url(#btn-sheen)"/></g>` : ""}
    <path transform="translate(19 14)" d="${GLYPHS[glyph]}" stroke="${COLORS.ice}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="52" y="12" width="1" height="${H - 24}" fill="${primary ? COLORS.cyan : COLORS.lineHi}" opacity=".6"/>
    <text x="66" y="23" font-family="${FONTS.mono}" font-size="12.5" font-weight="700" letter-spacing="2.4" fill="${COLORS.text}">${esc(label)}</text>
    <text x="66" y="39" font-family="${FONTS.mono}" font-size="10.5" fill="${COLORS.muted}">${esc(detail)}</text>
    <path d="M${W - 30} ${H / 2 + 5}l9-9m-6 0h6v6" stroke="${COLORS.cyan}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
  });
}

function badge(label, color) {
  const H = 22;
  const W = round(28 + monoWidth(label, 10, 1.6) + 6);
  return svgDocument({
    width: W,
    height: H,
    title: label,
    desc: `Status: ${label}`,
    body: `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="11" fill="${COLORS.base}" stroke="${color}" stroke-opacity=".7"/>
      <circle cx="13" cy="11" r="5.5" fill="${color}" fill-opacity=".2" class="pulse"/><circle cx="13" cy="11" r="2.8" fill="${color}"/>
      <text x="24" y="14.6" font-family="${FONTS.mono}" font-size="10" font-weight="700" letter-spacing="1.6" fill="${color}">${esc(label)}</text>`,
  });
}

// ---------------------------------------------------------------------------------------------

const ASSETS = {
  "assets/hero/system-boot.svg": hero,
  "assets/hero/end-of-transmission.svg": endOfTransmission,
  "assets/panels/trajectory.svg": trajectory,
  "assets/panels/technology-matrix.svg": technologyMatrix,
  "assets/modules/hotelscout.svg": () => moduleCard(FEATURED[0]),
  "assets/modules/forja.svg": () => moduleCard(FEATURED[1]),
  "assets/modules/module-rack.svg": moduleRack,
  "assets/ui/cta-portfolio.svg": () => ctaButton({ label: "PORTFOLIO", detail: "erickcoll.github.io/Portfolio-V2", glyph: "portfolio", primary: true }),
  "assets/ui/cta-cv.svg": () => ctaButton({ label: "CV", detail: "PDF · Spanish · 2026", glyph: "cv" }),
  "assets/ui/cta-email.svg": () => ctaButton({ label: "EMAIL", detail: "erickcollrodriguez@gmail.com", glyph: "email" }),
  "assets/ui/badge-open.svg": () => badge("OPEN TO INTERNSHIP", COLORS.green),
  "assets/ui/badge-live.svg": () => badge("LIVE", COLORS.green),
  "assets/ui/badge-building.svg": () => badge("BUILDING", COLORS.amber),
};

const only = process.argv.slice(2);
for (const [path, build] of Object.entries(ASSETS)) {
  if (only.length && !only.some((name) => path.includes(name))) continue;
  markId = 0; // ids depend only on the asset itself, so partial and full builds are byte-identical
  await write(path, build());
}
