// Fails the build if placeholder text is left in the site once samples are off.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const site = JSON.parse(readFileSync("src/_data/site.json", "utf8"));
if (site.showSamples !== false) process.exit(0);

const markers = ["[NEEDS", "[Confirm", "[Build"];
const found = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".html")) {
      readFileSync(path, "utf8").split("\n").forEach((line, i) => {
        for (const m of markers) if (line.includes(m)) found.push(`${path}:${i + 1}  ${line.trim().slice(0, 120)}`);
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
