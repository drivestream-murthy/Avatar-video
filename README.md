# Drivestream • HeyGen Avatar (Vite + Vercel, matches your working settings)

## Vercel Settings (same as your working project)
- Framework Preset: **Other**
- Build Command: **npm run build**
- Output Directory: **dist**
- Root Directory: *(leave empty if these files are at repo root; set to subfolder name if not)*
- Environment Variables: `HEYGEN_API_KEY`

Then **Redeploy using Production Configuration**.

## Dev
- `npm i`
- `npm run dev` → http://localhost:5173
- `npm run build` → creates `dist/`

## Features
- One-time start (or “hello”); mic/session persist (auto-restart)
- Greets + captures **name + university** (even in one utterance), updates background
- Voice command: **“close video”** closes player and continues without restart
- Non-stretched avatar (9:16, `object-fit: contain`)
- Video panel stays inside layout (`.video-wrapper`)
- Simple Drivestream Q&A via `/public/kb.json` (edit freely)
- Serverless HeyGen stubs at `/api/heygen/*` (no credits until wired to real API)
