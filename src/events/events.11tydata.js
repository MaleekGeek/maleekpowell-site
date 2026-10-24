// Settings shared by every file in src/events/. Samples are not built when site.json "showSamples" is false.
export default {
  layout: "layouts/event.njk",
  eleventyComputed: {
    permalink: (data) => {
      if (data.sample && data.site && data.site.showSamples === false) return false;
      return `/events/${data.page.fileSlug}/`;
    },
    eleventyExcludeFromCollections: (data) => Boolean(data.sample && data.site && data.site.showSamples === false),
  },
};
