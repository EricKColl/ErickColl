// ECR//OS design system: tokens and SVG primitives shared by every generated asset.
// Zero dependencies on purpose: generate-cards.mjs runs in GitHub Actions without `npm ci`.

export const COLORS = {
  void: "#04070f",
  base: "#070d1c",
  panel: "#0a1224",
  raised: "#0f1a33",
  line: "#1c2b4d",
  lineHi: "#2b4170",
  text: "#e8eef9",
  muted: "#a3b3cf",
  dim: "#6b7fa6",
  blue: "#3b82f6",
  blueDeep: "#1d4ed8",
  cyan: "#38bdf8",
  ice: "#bae6fd",
  violet: "#a78bfa",
  green: "#34d399",
  amber: "#fbbf24",
};

export const FONTS = {
  mono: "'JetBrains Mono','SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono','DejaVu Sans Mono',monospace",
  sans: "Inter,'Segoe UI',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif",
};

export const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const round = (n, d = 1) => Number(n.toFixed(d));

// Monospace advance is ~0.6em in every font of the stack (Consolas is narrower, never wider).
export const monoWidth = (text, size, tracking = 0) => [...String(text)].length * (size * 0.6 + tracking);

// Arial advance widths (1/1000 em), padded by 8% so Inter / Segoe UI never overflow a computed box.
const SANS_WIDTHS = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191, "(": 333, ")": 333, "*": 389,
  "+": 584, ",": 278, "-": 333, ".": 278, "/": 278, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556,
  "@": 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556,
  M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667,
  Z: 611, "[": 278, "]": 278, _: 556, a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222,
  j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500,
  w: 722, x: 500, y: 500, z: 500, "·": 278, "—": 1000, "–": 556, "€": 556, "→": 1000,
};

export function sansWidth(text, size, bold = false) {
  let units = 0;
  for (const ch of String(text)) units += SANS_WIDTHS[ch] ?? (/\d/.test(ch) ? 556 : 560);
  return (units / 1000) * size * 1.08 * (bold ? 1.06 : 1);
}

// Base stylesheet for every asset. Motion is decorative only, so it is fully disabled for
// visitors who ask for reduced motion; every element's resting state is its final state.
export function baseStyle(extra = "") {
  return `
    .mono { font-family: ${FONTS.mono}; }
    .sans { font-family: ${FONTS.sans}; }
    .code { font: 600 11.5px ${FONTS.mono}; letter-spacing: 2px; fill: ${COLORS.cyan}; }
    .title { font: 500 11.5px ${FONTS.mono}; letter-spacing: 2.5px; fill: ${COLORS.text}; }
    .meta { font: 500 11px ${FONTS.mono}; letter-spacing: 1.2px; fill: ${COLORS.dim}; }
    .label { font: 600 10px ${FONTS.mono}; letter-spacing: 1.8px; fill: ${COLORS.dim}; }
    .body { font: 400 15px ${FONTS.sans}; fill: ${COLORS.muted}; }
    .strong { font: 600 15px ${FONTS.sans}; fill: ${COLORS.text}; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
    @keyframes breathe { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes spin-reverse { to { transform: rotate(-360deg); } }
    @keyframes fade-in { from { opacity: 0; } }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
    @keyframes flow { to { stroke-dashoffset: -40; } }
    .pulse { animation: pulse 2.4s ease-in-out infinite; }
    .breathe { animation: breathe 4s ease-in-out infinite; }
    .flow { stroke-dasharray: 4 16; animation: flow 1.6s linear infinite; }
    ${extra}
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; }
    }`;
}

export function svgDocument({ width, height, title, desc, defs = "", style = "", body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
<style>${baseStyle(style).replace(/\n\s*/g, " ").trim()}</style>
<defs>${defs}</defs>
${body}
</svg>
`;
}

// The shared "screen": deep-space panel, dot grid fading into a vignette, gradient edge and HUD corners.
export function screen(width, height, { radius = 16, aura = true } = {}) {
  const defs = `
<linearGradient id="screen-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.base}"/><stop offset="1" stop-color="${COLORS.void}"/></linearGradient>
<linearGradient id="screen-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.cyan}" stop-opacity=".6"/><stop offset=".5" stop-color="${COLORS.blueDeep}" stop-opacity=".2"/><stop offset="1" stop-color="${COLORS.violet}" stop-opacity=".5"/></linearGradient>
<pattern id="screen-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${COLORS.ice}" fill-opacity=".13"/></pattern>
<radialGradient id="screen-fade" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="screen-vignette"><rect width="${width}" height="${height}" fill="url(#screen-fade)"/></mask>
<radialGradient id="screen-aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${COLORS.blueDeep}" stop-opacity=".28"/><stop offset="1" stop-color="${COLORS.blueDeep}" stop-opacity="0"/></radialGradient>
<clipPath id="screen-clip"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${radius}"/></clipPath>`;
  const c = 14;
  const i = 9;
  const corners = [
    `M${i} ${i + c}V${i}H${i + c}`,
    `M${width - i - c} ${i}H${width - i}V${i + c}`,
    `M${width - i} ${height - i - c}V${height - i}H${width - i - c}`,
    `M${i + c} ${height - i}H${i}V${height - i - c}`,
  ].join("");
  const body = `
<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${radius}" fill="url(#screen-bg)"/>
<g clip-path="url(#screen-clip)">
  <rect width="${width}" height="${height}" fill="url(#screen-grid)" mask="url(#screen-vignette)"/>
  ${aura ? `<ellipse cx="${width * 0.5}" cy="${height * 0.45}" rx="${width * 0.55}" ry="${height * 0.6}" fill="url(#screen-aura)"/>` : ""}
</g>
<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${radius}" stroke="url(#screen-edge)"/>
<path d="${corners}" stroke="${COLORS.cyan}" stroke-opacity=".75" stroke-width="1.5" stroke-linecap="round"/>`;
  return { defs, body };
}

// Mini version of the Compounding Core emblem, used as the window mark of every panel.
export function coreMark(cx, cy, scale = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${scale})">
  <circle r="7.5" stroke="${COLORS.cyan}" stroke-opacity=".55"/>
  <circle r="4.5" stroke="${COLORS.violet}" stroke-opacity=".8" stroke-dasharray="3 2.5"/>
  <circle r="1.8" fill="${COLORS.ice}"/>
</g>`;
}

// Window title bar: system path on the left, metadata on the right, hairline divider below.
export function headerBar(width, { code, title, right = "", y = 0, height = 46 }) {
  const mid = y + height / 2 + 4;
  const codeWidth = monoWidth(code, 11.5, 2);
  return `
<defs><linearGradient id="hairline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLORS.cyan}" stop-opacity=".45"/><stop offset=".6" stop-color="${COLORS.blue}" stop-opacity=".15"/><stop offset="1" stop-color="${COLORS.blue}" stop-opacity="0"/></linearGradient></defs>
${coreMark(30, y + height / 2)}
<text x="48" y="${mid}" class="code">${esc(code)}</text>
<text x="${48 + codeWidth + 10}" y="${mid}" class="title">${esc(title)}</text>
${right ? `<text x="${width - 26}" y="${mid}" class="meta" text-anchor="end">${esc(right)}</text>` : ""}
<rect x="1" y="${y + height}" width="${width - 2}" height="1" fill="url(#hairline)"/>`;
}

// Status light + label, e.g. "● LIVE".
export function statusLight(x, y, { label, color = COLORS.green, size = 11 }) {
  return `<g>
  <circle cx="${x}" cy="${y - size * 0.35}" r="${size * 0.55}" fill="${color}" fill-opacity=".18" class="pulse"/>
  <circle cx="${x}" cy="${y - size * 0.35}" r="${size * 0.28}" fill="${color}"/>
  <text x="${x + size}" y="${y}" font-family="${FONTS.mono}" font-size="${size}" font-weight="700" letter-spacing="1.6" fill="${color}">${esc(label)}</text>
</g>`;
}
