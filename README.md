# maleekpowell.com

The website, built with Eleventy 3. Pages live in `src/`, videos in `src/videos/`, settings in `src/_data/site.json`. The built site goes to `_site/`.

## For Maleek: publish a new video

1. **Upload to Bunny.** Go to bunny.net > Stream > your library > Upload. Wait until it says "Finished". Upload or check the captions (Captions tab, English).
2. **Copy two numbers.** The library ID is in the library's API tab (Video Library ID). The video ID is on the video itself (Video ID, a long code with dashes).
3. **Open Pages CMS.** Go to app.pagescms.org, sign in with GitHub, open the site, and click **Videos > Add an entry**.
4. **Fill in the form:** title, date, theme, the two Bunny IDs, a thumbnail image, the length (like 14:20), a one or two sentence summary, and the notes or transcript. Tick "Heavy topic" if the video needs the safety note. Leave "Sample video" off.
5. **Click Save.** The site rebuilds by itself and the video is live in a minute or two at maleekpowell.com/watch/.

Other settings (hero video or photo, links, business email, postal address, Kit form, membership on or off, photos) are under **Site settings** in Pages CMS.

When the first real videos are up, turn **Show sample videos** off in Site settings. The three sample videos then disappear from the site.

## Setup (for whoever builds it)

### Cloudflare Pages
- Connect the GitHub repo (keep the repo **private**).
- Build command: `npm run build`
- Output directory: `_site`
- Node version: 22 (from `.nvmrc`; or set the `NODE_VERSION=22` environment variable).
- The `_headers` file (security headers, content security policy, noindex on `*.pages.dev` previews) is copied into `_site` by the build.

### Local build
```
npm install
npm run build      # or: npm run serve
```
If `npm install` fails on a network drive because of symlinks, use `npm install --no-bin-links` and run `node node_modules/@11ty/eleventy/cmd.cjs` (add `--serve` for a local server).

### Kit (email)
- Put the form's number in Site settings > Kit form ID. Until it is set, every form shows a "not connected yet" message and sends nothing.
- Forms POST to `https://app.convertkit.com/forms/{ID}/subscriptions` with the field `email_address`. The email never goes in a web address.
- In Kit, turn on **double opt-in** (form settings > Incentive), so nobody can sign up somebody else.
- In Kit form settings, set **"redirect to URL"** to `https://maleekpowell.com/thanks/`.
- Add Kit's SPF, DKIM and DMARC records for maleekpowell.com in Cloudflare DNS.

### Bunny Stream
- Library > Security: set **Allowed domains** to `maleekpowell.com` (plus the pages.dev preview address while testing), then turn on **Block direct URL file access**.
- The home page hero plays a direct MP4 from Bunny so it can be paused: turn on **MP4 fallback** for the library, and copy the CDN host name (like `vz-xxxx-xxx`, without `.b-cdn.net`) into Site settings > Hero video. If direct URL access is blocked, check the hero still plays on maleekpowell.com.
- Set a low-balance alert in Bunny billing.
- **Test with the first real video:** the content security policy in `src/_headers` allows `iframe.mediadelivery.net`, `player.mediadelivery.net` and `*.b-cdn.net`. Open a video page and the home page with the browser console open and check for CSP errors. If Bunny uses another host, add it to `src/_headers`. Also check that the hero video's captions file (`.vtt`) loads from Bunny's CDN: in the Network tab it should return 200, and Bunny's response must include an `Access-Control-Allow-Origin` header that allows the site, or the captions won't show.

### Payments
- Patreon and Lemon Squeezy are **plain links only**. Don't add the Lemon Squeezy overlay script (the CSP would block it anyway).

### Launch checklist
- [ ] Repo private; two-factor sign-in on GitHub, Cloudflare, the registrar, Kit, Bunny, Patreon, Lemon Squeezy, PayPal and the main email account.
- [ ] Cloudflare: **Always Use HTTPS** on, SSL/TLS **Full (strict)**, Bot Fight Mode on.
- [ ] **DNSSEC:** turn it on in Cloudflare, then add Cloudflare's DS record at the registrar. It's done once the registrar accepts the DS record and Cloudflare shows DNSSEC as active.
- [ ] Registrar lock and auto-renew on.
- [ ] Bunny allowed domains and direct URL blocking set (above).
- [ ] Kit form ID, double opt-in and redirect URL set; send yourself a test signup and check the email isn't in the address bar.
- [ ] Business email and postal address filled in under Site settings.
- [ ] Sample videos off; photos added.
- [ ] Check the live site at securityheaders.com and the Mozilla HTTP Observatory.

### Rules for the code
- No API keys or passwords in the repo. Bunny library and video IDs and the Kit form ID are public and fine.
- No inline scripts: all JavaScript is in `src/js/site.js`.
- Fonts are self-hosted in `src/fonts/` (Oswald and DM Sans, both SIL Open Font License; licences included). No Google Fonts.

## Launch check

`npm run build` runs `scripts/check-launch.mjs` after Eleventy. Once **Show sample videos** is off, the build fails if any page still has placeholder text (anything in square brackets that starts with a capital letter, like `[NEEDS MALEEK: …]`, `[Year]` or `[Yardy Life link]`), and it lists where.
