// Before each build: pull the newest videos from Maleek's YouTube channel into src/videos/.
// Uses YouTube's public feed (no API key). The feed only lists the 15 newest uploads. Shorts come in marked vertical.
// Each video becomes src/videos/yt-<id>.md (not committed) with its thumbnail in src/assets/thumbs/.
// A video Maleek added by hand with the same YouTube link wins, so he can add notes or a transcript that way.
// Any network problem only prints a warning, so the site still builds.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, existsSync } from "node:fs";

const site = JSON.parse(readFileSync("src/_data/site.json", "utf8"));
const VIDEOS = "src/videos", THUMBS = "src/assets/thumbs";
const feedFile = process.env.YT_FEED_FILE; // test hook: read the feed from a file instead of YouTube

// Theme from a hashtag in the description, like #discipline
const TAGS = [
  [/#motivation\b/i, "Motivation"],
  [/#discipline\b/i, "Discipline"],
  [/#mentalhealth\b/i, "Mental health"],
  [/#(healing|resilience)\b/i, "Healing & resilience"],
];

const ytId = (v) => {
  const s = String(v || "").trim();
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/) || s.match(/^([\w-]{11})$/);
  return m ? m[1] : "";
};
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1].trim()) : ""; };
// "[" plus a capital letter is how the launch check spots unfinished placeholders, so use round brackets instead.
const unbracket = (s) => s.replace(/\[/g, "(").replace(/\]/g, ")");
const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 60).replace(/-$/, "");

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (maleekpowell.com build)", "accept-language": "en", cookie: "SOCS=CAI; CONSENT=YES+" } });
      if (!res.ok) throw new Error(`${res.status} for ${url}`);
      return res;
    } catch (e) {
      // YouTube sometimes refuses a request or two from build servers, so wait and try again
      if (i >= tries) throw e;
      console.warn(`YouTube sync: try ${i} failed (${e.message}), retrying`);
      await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
}

async function channelId() {
  if (site.youtubeChannelId) return site.youtubeChannelId.trim();
  const url = site.youtubeUrl || "";
  const direct = url.match(/\/channel\/(UC[\w-]{22})/);
  if (direct) return direct[1];
  if (!url) return "";
  const html = await (await get(url)).text();
  const m = html.match(/"externalId":"(UC[\w-]{22})"/) || html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) || html.match(/"channelId":"(UC[\w-]{22})"/);
  if (!m) throw new Error("couldn't find the channel ID on " + url);
  return m[1];
}

// Pull the JSON object that follows `name = ` in a YouTube page (brace matching, strings respected)
function pageJson(html, name) {
  const m = new RegExp(`${name}\\s*=\\s*\\{`).exec(html);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) { try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; } }
  }
  return null;
}
const xmlEsc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Backup when YouTube's feeds are down: list the newest uploads from the channel's Videos and Shorts tabs,
// then read each video's own page for its title, description and date. Returns feed-shaped XML for the code below.
async function fromChannelPages(id) {
  const ids = [];
  for (const [tab, vertical] of [["videos", false], ["shorts", true]]) {
    try {
      const html = await (await get(`https://www.youtube.com/channel/${id}/${tab}`)).text();
      const re = vertical ? /"reelWatchEndpoint":\{"videoId":"([\w-]{11})"/g : /"videoRenderer":\{"videoId":"([\w-]{11})"/g;
      let n = 0;
      for (const m of html.matchAll(re)) if (!ids.some((x) => x.v === m[1]) && n++ < 15) ids.push({ v: m[1], vertical });
    } catch (e) { console.warn(`YouTube sync: ${tab} page unavailable,`, e.message); }
  }
  if (!ids.length) throw new Error("no videos found on the channel pages either");
  let out = "";
  for (const { v, vertical } of ids) {
    try {
      const html = await (await get(`https://www.youtube.com/watch?v=${v}`)).text();
      const p = pageJson(html, "ytInitialPlayerResponse") || {};
      const d = p.videoDetails || {}, mf = (p.microformat || {}).playerMicroformatRenderer || {};
      const when = mf.publishDate || mf.uploadDate;
      if (!d.title || !when) continue;
      const link = vertical ? `https://www.youtube.com/shorts/${v}` : `https://www.youtube.com/watch?v=${v}`;
      out += `<entry><yt:videoId>${v}</yt:videoId><title>${xmlEsc(d.title)}</title><link rel="alternate" href="${link}"/>` +
        `<published>${xmlEsc(new Date(when).toISOString())}</published><media:description>${xmlEsc(d.shortDescription || "")}</media:description></entry>`;
    } catch (e) { console.warn(`YouTube sync: couldn't read video ${v},`, e.message); }
  }
  if (!out) throw new Error("couldn't read any video pages");
  return out;
}

async function main() {
  if (!site.youtubeUrl && !site.youtubeChannelId && !feedFile) return console.log("YouTube sync: no channel set, skipped.");

  let xml;
  if (feedFile) xml = readFileSync(feedFile, "utf8");
  else {
    const id = await channelId();
    // The channel feed sometimes answers 404 for days; the uploads list (UU + the same ID) carries the same videos
    try { xml = await (await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`)).text(); }
    catch (e) {
      console.warn("YouTube sync: channel feed unavailable,", e.message, "- trying the uploads list");
      try { xml = await (await get(`https://www.youtube.com/feeds/videos.xml?playlist_id=UU${id.slice(2)}`)).text(); }
      catch (e2) {
        // Both feeds down: read the channel's own Videos and Shorts pages instead
        console.warn("YouTube sync: uploads list unavailable,", e2.message, "- reading the channel pages");
        xml = await fromChannelPages(id);
      }
    }
    // The main feed only holds the 15 newest uploads, Shorts included, so add the full-length-only list too.
    // It's an unofficial feed, so if it fails the build carries on with the main one.
    try { xml += await (await get(`https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${id.slice(2)}`)).text(); }
    catch (e) { console.warn("YouTube sync: full-length list unavailable,", e.message); }
  }

  // Only now that the feed arrived, clear last build's pulled videos so removed ones disappear
  for (const f of readdirSync(VIDEOS)) if (/^yt-.*\.md$/.test(f)) unlinkSync(`${VIDEOS}/${f}`);

  // IDs already added by hand, and the page addresses they use (file name minus the date)
  const manual = new Set(), used = new Set();
  for (const f of readdirSync(VIDEOS)) if (f.endsWith(".md")) {
    used.add(f.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, ""));
    const m = readFileSync(`${VIDEOS}/${f}`, "utf8").match(/^youtube:\s*"?([^"\n]*)"?/m); const id = m && ytId(m[1]); if (id) manual.add(id);
  }

  mkdirSync(THUMBS, { recursive: true });
  let added = 0;
  const seen = new Set();
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = tag(entry, "yt:videoId");
    if (!/^[\w-]{11}$/.test(id) || manual.has(id) || seen.has(id)) continue;
    seen.add(id);
    // Shorts are vertical (Maleek's Instagram videos land on YouTube as Shorts), so they get the tall player
    const vertical = /href="https:\/\/www\.youtube\.com\/shorts\//.test(entry);
    // Hashtags and emoji help on YouTube but make a messy headline here, so the site title drops them.
    // (Themes still come from the description.) To use a different title, add the video by hand with the same link.
    const tidy = (t) => t.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, " ").replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
      .replace(/\s+/g, " ").replace(/^[\s|\-–—:·]+|[\s|\-–—:·]+$/g, "").trim();
    const desc = unbracket(tag(entry, "media:description"));
    const date = tag(entry, "published").slice(0, 10);
    // A hashtag-only title falls back to the description's first line, then to "Short, <date>"
    const title = tidy(unbracket(tag(entry, "title"))) || tidy(desc.split("\n").find((l) => tidy(l)) || "").slice(0, 90)
      || `${vertical ? "Short" : "Video"}, ${new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`;
    const theme = (TAGS.find(([re]) => re.test(desc)) || [, ""])[1];
    const clean = desc.replace(/(^|\s)#\w+/g, "").trim();
    const summary = (clean.split(/\n\s*\n|\n/)[0] || "").slice(0, 220);
    const body = clean.split(/\n\s*\n/).map((p) => `<p>${escHtml(p.trim()).replace(/\n/g, "<br>")}</p>`).join("\n");

    // Thumbnail saved into the site, so visitors' browsers never call Google just to see the list
    let thumb = "";
    try {
      if (!feedFile) {
        const img = Buffer.from(await (await get(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)).arrayBuffer());
        writeFileSync(`${THUMBS}/yt-${id}.jpg`, img);
      }
      if (feedFile || existsSync(`${THUMBS}/yt-${id}.jpg`)) thumb = `/assets/thumbs/yt-${id}.jpg`;
    } catch (e) { console.warn(`YouTube sync: no thumbnail for ${id} (${e.message})`); }

    // Two videos can't share an address, or the build fails: add the video ID on a clash
    let slug = slugify(title) || id;
    if (used.has(slug)) slug = `${slug}-${id}`.toLowerCase();
    used.add(slug);

    const fm = {
      title, date, theme, youtube: `https://youtu.be/${id}`, thumbnail: thumb, length: "", summary,
      // Safety note on everything except clearly light themes, since most videos touch heavy topics
      heavy: !["Motivation", "Discipline"].includes(theme),
      fromYouTube: true, slug, vertical,
    };
    const yaml = Object.entries(fm).map(([k, v]) => `${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`).join("\n");
    writeFileSync(`${VIDEOS}/yt-${id}.md`, `---\n${yaml}\n---\n${body}\n`);
    added++;
  }
  console.log(`YouTube sync: ${added} video(s) from the channel.`);
}

const STATUS = "src/_data/ytSync.json"; // not committed; test builds show it on /watch/
writeFileSync(STATUS, "{}");
main().catch((e) => {
  // On the live site (main), fail the build so the last good version stays live instead of a site with no videos.
  // YouTube's feed has short outages; the next build (or the daily one) picks it up again.
  if (process.env.CF_PAGES && process.env.CF_PAGES_BRANCH === "main") { console.error("YouTube sync failed, keeping the current site live:", e.message, e.cause || ""); process.exit(1); }
  // Test builds carry on without the YouTube videos and say why on /watch/
  const why = e.message + (e.cause ? ` (${e.cause.code || e.cause.message})` : "");
  writeFileSync(STATUS, JSON.stringify({ error: why }));
  console.warn("YouTube sync skipped:", why);
});
