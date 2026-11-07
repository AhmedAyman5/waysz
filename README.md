# WaysZ — waysz.org

Bilingual (Arabic/English) marketing website. Astro 7 + GSAP + Lenis. Static output for Namecheap hosting.
Rules for Claude Code: `CLAUDE.md` · Animation system: `.claude/skills/waysz-motion/`.

## 1 · One-time setup (every developer)
1. Install **Node.js 22.23.4 or newer** (LTS from nodejs.org), **Git**, **VS Code**, **Claude Code**.
2. Clone and install:
   ```bash
   git clone <repo-url> waysz
   cd waysz
   npm install
   ```
3. Install the Claude Code plugins for this project (run in the normal terminal, inside the `waysz` folder):
   ```bash
   claude plugin marketplace add anthropics/claude-plugins-official
   claude plugin marketplace add greensock/gsap-skills
   claude plugin install gsap-skills@gsap-skills --scope project
   claude plugin install frontend-design@claude-plugins-official --scope project
   claude plugin list
   ```
   The first person commits the `.claude/settings.json` these commands create. Everyone else still runs
   the same commands once on their own machine.
4. Start Claude Code with `claude` in the folder and accept the "trust this folder" prompt
   (needed for the project skill `waysz-motion`).

## 2 · Run
```bash
npm run dev       # http://localhost:4321
                  # Motion Lab (every animation, working): http://localhost:4321/dev/motion-lab/
npm run check     # must show 0 errors before a PR
npm run build     # production files in dist/
npm run preview   # test dist/ locally
```

## 3 · Daily workflow
1. `git pull` on `main`, then a branch: `git checkout -b feat/home-hero`.
2. Open Claude Code (`claude`) and give it the task (template below). It reads `CLAUDE.md` and the
   waysz-motion skill by itself.
3. Review in the browser: Arabic + `/en/`, mobile size, reduced motion ON.
4. `npm run check` → commit → push → Pull Request → one teammate reviews → merge.

Task template for Claude Code:
```
Build brief section §1.4 "Why WaysZ" on the Home page (src/views/HomePage.astro), Arabic and English.
Replace its <TodoSection>. Content: brief §1.4. Motion: follow reference.md row 1.4 and copy the
pattern from the Motion Lab. Follow CLAUDE.md. Finish with npm run check = 0 errors.
```

## 4 · Deploy (Namecheap — Stellar Plus)
1. `npm run build`
2. cPanel → File Manager → `public_html/` → upload the **contents** of `dist/` (not the folder itself).
3. First time only: cPanel → SSL/TLS Status → run AutoSSL for waysz.org.
`public/.htaccess` (HTTPS redirect, 404 page, caching) is included in every build.

## 5 · Still open
- Form destination (email) → `src/lib/forms.ts` `TODO(endpoint)`.
- Real phone / WhatsApp / address / hours → `src/lib/site.ts` `TODO(client)`.
- Final logo (SVG, plane as a separate layer) and brand colors → replace LAYER 1 in `src/styles/tokens.css`.
