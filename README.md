# Drivestream • HeyGen Avatar (Vite + Vercel)

## Deploy settings (Vercel → Project → Settings → Build & Development)
- Framework Preset: **Other**
- Install Command: **npm ci**   (or **pnpm i --frozen-lockfile**)
- Build Command: **npm run build**
- Output Directory: **dist**
- Root Directory: *(leave empty unless your app is inside a subfolder)*
- Environment Variables: set **HEYGEN_API_KEY**

After saving settings, click **Redeploy using Production Configuration**.

## Dev
- `npm i`
- `npm run dev` → http://localhost:5173
- `npm run build` → outputs to `dist`

## Notes
- Non-stretched portrait container (9:16) + `object-fit: contain` on `<video>`
- Fast mic reaction (continuous + interim results)
- Backgrounds: say/type "Harvard University", "Oxford University", "Stanford University" or "default"
- HeyGen endpoints are stubs; replace with your real session API when ready.
