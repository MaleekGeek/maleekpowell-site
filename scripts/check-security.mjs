// Safety check, run on every build. It stops the build if a change would weaken the site's protection,
// so a mistake in a template or a bad link typed into Pages CMS can't reach the live site.
// What it checks is listed in the README under "Safety check".
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT = "_site";
const problems = [], warnings = [];

// 1. The security headers file must be in the built site, with every header still in place.
const NEEDED = [
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Content-Security-Policy",
];
const headersPath = join(OUT, "_headers");
if (!existsSync(headersPath)) problems.push("_site/_headers is missing, so the site would ship with no security headers");
else {
  const headers = readFileSync(headersPath, "utf8");
  for (const h of NEEDED) if (!new RegExp(`^\\s+${h}:`, "m").test(headers)) problems.push(`src/_headers  the ${h} header is gone`);
  const csp = (headers.match(/Content-Security-Policy:(.*)/) || [, ""])[1];
  const rule = (name) => (csp.split(";").map((p) => p.trim()).find((p) => p.startsWith(name + " ")) || "");
  const scripts = rule("script-src");
  if (!scripts) problems.push("src/_headers  the content security policy has no script-src rule");
  if (/'unsafe-inline'|'unsafe-eval'|\s\*(\s|$)|\shttps?:(\s|$)|\sdata:/.test(scripts)) problems.push(`src/_headers  script-src is too open: ${scripts}`);
  for (const [name, want] of [["default-src", "'self'"], ["object-src", "'none'"], ["base-uri", "'self'"], ["frame-ancestors", "'none'"]])
    if (!rule(name).includes(want)) problems.push(`src/_headers  the content security policy should keep ${name} ${want}`);
  if (!rule("form-action")) problems.push("src/_headers  the content security policy has no form-action rule");
}

// 2. Nothing private may be copied into the public site.
const PRIVATE = /(^\.(?!well-known$|gitkeep$))|(\.(env|yml|yaml|map|md|mjs|lock|pem|key)$)|^(package(-lock)?\.json|node_modules)$/i;

// 3. Every page: scripts only from this site, no code hidden in links, forms only send to Kit, frames only from YouTube.
const FORM_OK = /^(#|https:\/\/app\.(convertkit|kit)\.com\/forms\/\d+\/subscriptions)$/;
const FRAME_OK = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/;
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")); return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null; };
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32))
  .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(parseInt(d, 10) || 32))
  .replace(/&colon;/gi, ":").replace(/&(tab|newline);/gi, "")
  .replace(/[\s\u0000-\u001f]/g, "");

function checkPage(path) {
  const html = readFileSync(path, "utf8");
  const at = (i) => `${path}:${html.slice(0, i).split("\n").length}`;
  for (const m of html.matchAll(/<[a-zA-Z][^>]*>/g)) {
    const tag = m[0], name = tag.match(/^<([a-zA-Z0-9-]+)/)[1].toLowerCase(), where = at(m.index);
    if (/\son[a-z]+\s*=/i.test(tag.replace(/"[^"]*"|'[^']*'/g, '""'))) problems.push(`${where}  inline event code (on...=) in <${name}>`);
    for (const a of ["href", "src", "action", "formaction", "poster", "data", "srcdoc"]) {
      const v = attr(tag, a);
      if (v == null) continue;
      if (a === "srcdoc") { problems.push(`${where}  srcdoc on <${name}>`); continue; }
      const flat = decode(v).toLowerCase();
      if (/^(javascript|vbscript|data|blob|file):/.test(flat)) problems.push(`${where}  unsafe link in ${a}: ${v.slice(0, 80)}`);
      else if (/^http:\/\//.test(flat) && name !== "svg") warnings.push(`${where}  link without HTTPS: ${v.slice(0, 80)}`);
    }
    if (name === "script") {
      const src = attr(tag, "src"), type = (attr(tag, "type") || "").toLowerCase();
      if (src == null && type !== "application/json" && type !== "application/ld+json") problems.push(`${where}  script written inside the page (move it into src/js/)`);
      if (src != null && !/^\/(?!\/)/.test(src)) problems.push(`${where}  script loaded from outside the site: ${src}`);
    }
    if (name === "form") {
      const action = attr(tag, "action") || "", method = (attr(tag, "method") || "get").toLowerCase();
      if (method !== "post") problems.push(`${where}  form doesn't use method="post", so what's typed could end up in the web address`);
      if (!FORM_OK.test(action)) problems.push(`${where}  form sends to an unexpected place: ${action || "(this page)"}`);
    }
    if (name === "iframe" && !FRAME_OK.test((attr(tag, "src") || "").replace(/&amp;/g, "&"))) problems.push(`${where}  frame from an unexpected place: ${attr(tag, "src")}`);
    if (name === "object" || name === "embed" || name === "base") problems.push(`${where}  <${name}> isn't allowed`);
    if (name === "meta" && /refresh/i.test(attr(tag, "http-equiv") || "")) problems.push(`${where}  automatic redirect (meta refresh)`);
    if (name === "a" && (attr(tag, "target") || "").toLowerCase() === "_blank" && !/\bnoopener\b/i.test(attr(tag, "rel") || "")) problems.push(`${where}  link opens a new tab without rel="noopener"`);
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (PRIVATE.test(name)) { problems.push(`${path}  shouldn't be in the public site`); continue; }
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".html")) checkPage(path);
  }
}
if (existsSync(OUT)) walk(OUT); else problems.push("_site is missing: run the Eleventy build first");

if (warnings.length) console.warn(`Safety check: ${warnings.length} thing(s) to tidy (not blocking).\n` + warnings.join("\n"));
if (problems.length) {
  console.error(`Safety check failed: ${problems.length} problem(s). The site was not published.\n` + problems.join("\n"));
  process.exit(1);
}
console.log("Safety check passed.");
