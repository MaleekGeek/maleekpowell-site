// Eleventy 3 config for maleekpowell.com
// Source: src/   Output: _site/   Templates: Nunjucks (.njk) + Markdown for videos.

import { readFileSync } from "node:fs";

export default function (eleventyConfig) {
  // Static files copied as-is
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
  // Cloudflare Pages security headers (see research/security-check.md section 4)
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });

  // Site settings, for filters below
  const themes = ["Motivation", "Discipline", "Mental health", "Healing & resilience"];

  // Videos collection: newest first. Sample videos are dropped when site.json showSamples is false.
  eleventyConfig.addCollection("videos", (api) => {
    return api
      .getFilteredByGlob("src/videos/*.md")
      .filter((item) => item.data.permalink !== false && !item.data.hidden)
      .sort((a, b) => b.date - a.date);
  });

  // Journal: newest first. Events: soonest first. Samples drop out when showSamples is false.
  eleventyConfig.addCollection("journal", (api) =>
    api.getFilteredByGlob("src/journal/*.md").filter((i) => i.data.permalink !== false).sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("events", (api) =>
    api.getFilteredByGlob("src/events/*.md").filter((i) => i.data.permalink !== false).sort((a, b) => a.date - b.date)
  );
  // Events as JSON for the calendar (read by /js/calendar.js)
  // Event times are Jamaica time unless the time typed in already names a zone.
  const withZone = (t) => !t ? "" : (/time/i.test(t) || /\b(GMT|UTC|[A-Z]{2,4}T)\b/.test(t)) ? t : `${t} Jamaica time`;
  // A YouTube link or a bare ID -> the 11-character video ID ("" if it doesn't look like one)
  eleventyConfig.addFilter("ytId", (v) => {
    const s = String(v || "").trim();
    const m = s.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/) || s.match(/^([\w-]{11})$/);
    return m ? m[1] : "";
  });
  eleventyConfig.addFilter("withZone", withZone);
  eleventyConfig.addFilter("eventsJson", (events) =>
    JSON.stringify((events || []).map((e) => ({
      title: (e.data.sample ? "[Sample] " : "") + e.data.title,
      date: new Date(e.date).toISOString().slice(0, 10),
      time: withZone(e.data.time),
      place: e.data.place || "",
      kind: e.data.kind || "",
      url: e.url,
    }))).replace(/</g, "\\u003c")
  );
  eleventyConfig.addFilter("upcoming", (events, today) => (events || []).filter((e) => new Date(e.date) >= new Date(today)));
  eleventyConfig.addFilter("past", (events, today) => (events || []).filter((e) => new Date(e.date) < new Date(today)).reverse());
  eleventyConfig.addGlobalData("buildDate", () => new Date().toISOString().slice(0, 10));

  // Count of videos per theme (for the home tiles)
  eleventyConfig.addFilter("countTheme", (videos, theme) =>
    (videos || []).filter((v) => !theme || v.data.theme === theme).length
  );

  // Pick n items, cycling through the list (for the decorative video wall)
  eleventyConfig.addFilter("cycle", (list, n) => {
    const out = [];
    if (!list || !list.length) return Array.from({ length: n }, () => null);
    for (let i = 0; i < n; i++) out.push(list[i % list.length]);
    return out;
  });

  eleventyConfig.addFilter("readableDate", (d) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d))
  );
  eleventyConfig.addFilter("dayNum", (d) => new Date(d).getUTCDate());
  eleventyConfig.addFilter("monthShort", (d) => new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(d)));
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));

  // Videos on the same theme first, then the rest, excluding the current one
  eleventyConfig.addFilter("related", (videos, url, theme, n = 3) => {
    const others = (videos || []).filter((v) => v.url !== url);
    const same = others.filter((v) => v.data.theme === theme);
    const rest = others.filter((v) => v.data.theme !== theme);
    return same.concat(rest).slice(0, n);
  });

  // Stand-in photos for the test build only. When site.json "dummyPhotos" is true, every empty
  // photo slot gets a random black-and-white stock photo from picsum.photos (Unsplash licence).
  // Turn it off before launch; scripts/check-launch.mjs fails the build if it's still on.
  eleventyConfig.addTransform("dummyPhotos", function (content) {
    const site = JSON.parse(readFileSync("src/_data/site.json", "utf8"));
    if (!site.dummyPhotos || !(this.page.outputPath || "").endsWith(".html")) return content;
    let n = 0;
    const slug = (this.page.url || "x").replace(/[^a-z0-9]/gi, "") || "home";
    return content.replace(/<(figure|div|span|a)(\s[^>]*?)class="([^"]*\bphoto\b[^"]*)"([^>]*)>/g, (tag, el, pre, cls, post) => {
      if (/\bhas-img\b/.test(cls)) return tag;
      const big = /hero__media|intro__portrait|tile|work__shot/.test(cls);
      const src = `https://picsum.photos/seed/mp-${slug}-${n++}/${big ? "1600/1200" : "800/600"}?grayscale`;
      return `<${el}${pre}class="${cls} has-img"${post}><img class="fill" src="${src}" alt="" loading="lazy" decoding="async">`;
    });
  });

  eleventyConfig.addGlobalData("themes", themes);

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
