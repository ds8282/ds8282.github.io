# Dev Sheth · Engagement File DS-2027

Static portfolio site. No build step, no framework, no backend.

## What's in the folder

| File | What it is |
|---|---|
| `index.html` | The whole site |
| `assets/styles.css` | All styles |
| `assets/app.js` | All interactions, sims, terminal and CTF logic |
| `Dev_Sheth_Resume.pdf` | The resume every "Resume ↓" / "Export report" button downloads |
| `favicon.svg` | Tab icon |
| `.well-known/security.txt` | Security contact file (RFC 9116). Renew the `Expires` date before Oct 2027 |
| `_headers` | Security headers (CSP, HSTS, etc.) for Netlify or Cloudflare Pages |
| `.nojekyll` | Tells GitHub Pages to serve `.well-known/` and `_headers` as-is |

## Publish on Netlify (recommended, about 5 minutes)

1. Unzip this folder.
2. Sign up or log in at https://app.netlify.com (free). You can skip this, but then the site sits behind a temporary password until you claim it.
3. Go to https://app.netlify.com/drop and drag the **dev-sheth-site** folder onto the page.
4. You get a live URL like `random-name-123.netlify.app`.
5. Rename it: Project configuration → General → Change project name → for example `devsheth` → `devsheth.netlify.app`.
6. Optional custom domain (about $10–15/year, e.g. `devsheth.com`): Domain management → Add a domain, then follow Netlify's DNS steps. HTTPS is issued automatically.

**To update later:** open the project in Netlify → Deploys → drag the updated folder onto the drop area.

## Or publish on GitHub Pages (free, lives at ds8282.github.io)

1. Create a public repo named exactly `ds8282.github.io`.
2. Upload everything in this folder (including `.nojekyll` and the `.well-known` folder) to the repo root.
3. Settings → Pages → Source: "Deploy from a branch" → `main` / root → Save.
4. The site goes live at `https://ds8282.github.io` in a minute or two.

GitHub Pages ignores `_headers`, so you get the Content-Security-Policy from the `<meta>` tag in `index.html` but not the other security headers. Netlify gives you the full set.

## After it's live

- Check the headers: https://securityheaders.com and https://developer.mozilla.org/en-US/observatory
- Add your real domain as a `Canonical:` line in `.well-known/security.txt`.
- Recruiter shortcut link: add `#recruiter` to the end of the URL to open straight into Recruiter Mode.
- Put the link on your resume, LinkedIn "Featured" section and email signature.

## Easy edits

- **Project repo links:** in `index.html`, search for `github.com/ds8282` inside each `case-links` block and swap in the specific repo URL.
- **Photo:** the badge in Phase 01 says "Photo withheld · pending interview". To use a real photo, replace the `<span class="mono-mark">` and `<span class="withheld">` inside `.photo` with `<img src="photo.jpg" alt="Dev Sheth">` and drop `photo.jpg` in the folder.
- **Resume:** replace `Dev_Sheth_Resume.pdf` with a new file of the same name.
- **CTF flags:** the five flags are stored as SHA-256 hashes in `assets/app.js` (`FLAG_HASHES`). If you change a flag's text, update its hash too.
