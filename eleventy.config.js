// Eleventy 3 config for maleekpowell.com
// Source: src/   Output: _site/   Templates: Nunjucks (.njk) + Markdown for videos.

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
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));

  // Videos on the same theme first, then the rest, excluding the current one
  eleventyConfig.addFilter("related", (videos, url, theme, n = 3) => {
    const others = (videos || []).filter((v) => v.url !== url);
    const same = others.filter((v) => v.data.theme === theme);
    const rest = others.filter((v) => v.data.theme !== theme);
    return same.concat(rest).slice(0, n);
  });

  eleventyConfig.addGlobalData("themes", themes);

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
