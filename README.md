# maleekpowell.com

The website, built with Eleventy 3. Pages live in `src/`, videos in `src/videos/`, settings in `src/_data/site.json`. The built site goes to `_site/`.

## For Maleek: publish a new video

**New uploads on your main YouTube channel show up on the site by themselves** (the site checks once a day and on every save). Put a tag in the YouTube description to file it under a theme: #motivation, #discipline, #mentalhealth, or #healing (or #resilience). Untagged videos still show under Every video. Shorts are skipped. Only your 15 newest uploads are picked up, so use the steps below for older videos, or when you want to add notes, a transcript, your own thumbnail or the length. An entry you add by hand replaces the automatic one for the same video.

1. **Upload to YouTube.** Set it to Public. Member-only videos and audio go straight into a Patreon post instead, not on YouTube. Add your captions file in YouTube Studio > Subtitles, English.
2. **Copy the link.** On the video, tap Share > Copy link.
3. **Open Pages CMS.** Go to app.pagescms.org, sign in with GitHub, open the site, and click **Videos > Add an entry**.
4. **Fill in the form:** title, date, theme, the YouTube link, a thumbnail image (you can save the one from YouTube Studio), the length (like 14:20), a one or two sentence summary, and the notes or transcript. Tick "Heavy topic" if the video needs the safety note. Leave "Sample video" off.
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

### YouTube
- **Automatic videos:** `scripts/youtube-sync.mjs` runs before each build and reads the channel set in Site settings > YouTube channel link. If YouTube ever blocks the channel lookup, put the channel ID (starts with UC) in `youtubeChannelId` in `src/_data/site.json`.
- **Daily refresh:** `.github/workflows/daily-rebuild.yml` asks Cloudflare to rebuild every morning. It needs a deploy hook: Cloudflare > Workers & Pages > maleekpowell-site > Settings > Builds > Deploy hooks > add one for `main`, copy its URL, then GitHub > the repo > Settings > Secrets and variables > Actions > New secret named `CF_DEPLOY_HOOK`.
- Video pages embed from `www.youtube-nocookie.com` (YouTube's privacy-enhanced mode). Nothing plays until pressed, captions show by default, and suggested videos at the end come from your own channel.
- **Test with the first real video:** open its page with the browser console open and check for CSP errors. `src/_headers` allows frames from `www.youtube-nocookie.com` only.
- In YouTube Studio, allow embedding on each video (it's on by default).
- Members' videos and the Sunday audio: upload them straight into a Patreon post, not to YouTube. For early access to a public video, post it on Patreon first and publish it on YouTube and the site later.

### Payments
- Patreon and Lemon Squeezy are **plain links only**. Don't add the Lemon Squeezy overlay script (the CSP would block it anyway).

### Launch checklist
- [ ] Repo private; two-factor sign-in on GitHub, Cloudflare, the registrar, Kit, YouTube (Google), Patreon, Lemon Squeezy, PayPal and the main email account.
- [ ] Cloudflare: **Always Use HTTPS** on, SSL/TLS **Full (strict)**, Bot Fight Mode on.
- [ ] **DNSSEC:** turn it on in Cloudflare, then add Cloudflare's DS record at the registrar. It's done once the registrar accepts the DS record and Cloudflare shows DNSSEC as active.
- [ ] Registrar lock and auto-renew on.
- [ ] Kit form ID, double opt-in and redirect URL set; send yourself a test signup and check the email isn't in the address bar.
- [ ] Business email and postal address filled in under Site settings.
- [ ] Sample videos off; photos added.
- [ ] Check the live site at securityheaders.com and the Mozilla HTTP Observatory.

### Rules for the code
- No API keys or passwords in the repo. YouTube links and the Kit form ID are public and fine.
- No inline scripts: all JavaScript is in `src/js/site.js`.
- Fonts are self-hosted in `src/fonts/` (Oswald and DM Sans, both SIL Open Font License; licences included). No Google Fonts.

## Launch check

`npm run build` runs `scripts/check-launch.mjs` after Eleventy. Once **Show sample videos** is off, the build fails if any page still has placeholder text (anything in square brackets that starts with a capital letter, like `[NEEDS MALEEK: …]`, `[Year]` or `[Yardy Life link]`), and it lists where.

## Stand-in photos (test build only)

While `"dummyPhotos": true` in `src/_data/site.json`, every empty photo spot shows a random black-and-white stock photo from picsum.photos (Unsplash licence), with its "Your photo: …" label still on top so you know what goes there. Before launch: add your own photos, set `"dummyPhotos": false`, and remove `https://picsum.photos https://fastly.picsum.photos` from `img-src` in `src/_headers`. The launch check fails until both are done.
