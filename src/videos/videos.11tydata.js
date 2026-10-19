// Settings shared by every file in src/videos/.
// Each video becomes /watch/<file-name-without-date>/ (videos pulled from YouTube set their own slug).
// Sample videos (sample: true) are not built when site.json "showSamples" is false.
export default {
  layout: "layouts/video.njk",
  tags: [],
  eleventyComputed: {
    permalink: (data) => {
      if (data.sample && data.site && data.site.showSamples === false) return false;
      return `/watch/${data.slug || data.page.fileSlug}/`;
    },
    eleventyExcludeFromCollections: (data) => Boolean(data.sample && data.site && data.site.showSamples === false),
  },
};
