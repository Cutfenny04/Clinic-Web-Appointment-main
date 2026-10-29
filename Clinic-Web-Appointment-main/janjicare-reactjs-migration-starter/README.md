# JanjiCare React JS Frontend Migration Starter

This is a standalone React + JavaScript (JSX) frontend starter prepared from the uploaded JanjiCare repository structure. It does not run Laravel or Inertia.

## Stack
- React 18 + JavaScript / JSX
- Vite
- React Router
- Plain CSS
- Express API helper in `src/services/api.js`
- Intended database behind API: Supabase PostgreSQL (backend responsibility)

## Run locally
1. Install Node.js LTS from https://nodejs.org/
2. Open this folder in VS Code.
3. Open Terminal and run:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` (optional for the UI demo).
5. Run:
   ```bash
   npm run dev
   ```
6. Open the local URL printed by Vite, usually http://localhost:5173.

## Important scope note
This is a migration foundation, not a completed migration of every original JanjiCare feature. The original ZIP contains many TypeScript/TSX pages coupled to Inertia and Laravel routes/controllers. Those pages must be migrated and tested one by one. Login and other placeholder pages are UI-only until the Express team provides API contracts.

## Backend API integration
Set `VITE_API_BASE_URL` to the Express API base URL. Example:
`VITE_API_BASE_URL=http://localhost:3000/api`

Only call the Express API from the frontend. Never put database passwords or the Supabase service-role key in frontend environment variables. The Express backend should own privileged database access and authorization.

## Next migration tasks
1. Inventory each original page and reusable component.
2. Convert TSX to JSX, removing TypeScript annotations.
3. Replace `@inertiajs/react` Link/Head/forms with React Router and fetch calls.
4. Replace Laravel route names and form submissions with Express API endpoints.
5. Replace backend-provided Inertia props with API loading states.
6. Migrate authentication, role guards, booking, queue, notifications, analytics, EMR/pharmacy, and telehealth integrations.
7. Test each page and role against a running Express API before marking it complete.
