// Fails the build if placeholder text is left in the site once samples are off.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const site = JSON.parse(readFileSync("src/_data/site.json", "utf8"));
if (site.showSamples !== false) process.exit(0);

// Any "[" followed by a capital letter is a placeholder, like [NEEDS MALEEK: ...], [Year] or [Yardy Life link].
const placeholder = /\[[A-Z][^\]\n]{0,120}\]?/g;
const found = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".html")) {
      // Skip script and style blocks so code like arrays or CSS selectors doesn't trip the check.
      const html = readFileSync(path, "utf8").replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, " "));
      html.split("\n").forEach((line, i) => {
        for (const m of line.match(placeholder) || []) found.push(`${path}:${i + 1}  ${m}`);
      });
    }
  }
}
walk("_site");

if (found.length) {
  console.error(`Launch check failed: ${found.length} placeholder(s) still in the site.\n` + found.join("\n"));
  process.exit(1);
}
console.log("Launch check passed: no placeholders left.");
