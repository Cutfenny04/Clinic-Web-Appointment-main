# JanjiCare migration map

## Findings from the uploaded source
- The source has React pages in `clinic-app/resources/js/Pages`, mostly `.tsx`.
- `resources/js/app.tsx` uses `createInertiaApp`.
- `package.json` includes `@inertiajs/react` and `laravel-vite-plugin`.
- `routes/web.php` defines page routes and Laravel controller actions.
- The UI relies heavily on Tailwind utility classes.
- Several features also depend on Laravel auth, notifications/broadcasting, AI controller, PDF exports, and LiveKit.

## Migration mapping
| Original Laravel/Inertia | Standalone React + Express |
| --- | --- |
| `@inertiajs/react` `Link` | `Link` from `react-router-dom` |
| `Head` | document title management (or `react-helmet-async` if needed) |
| `useForm` / Inertia form posts | controlled React form + `fetch` API |
| Inertia page props | loading API data in `useEffect` / custom hooks |
| Laravel web routes | React Router page routes |
| Laravel controllers | Express route/controller endpoints |
| Laravel session auth / middleware | explicit agreed auth strategy, API middleware, role checks |
| Laravel migrations/models | Supabase PostgreSQL schema and Express data access |
| Laravel Reverb/Echo | selected real-time solution (Supabase Realtime or another agreed service) |
| Laravel PDF/email/AI controller | Express-side endpoint or separate service |

## Suggested page inventory
- Public: `Welcome.tsx`, auth login/register/forgot/reset/verification
- Admin: dashboard, AI settings, analytics, appointments, doctors, patients, pharmacy, reports, schedules, security
- Doctor: dashboard, analytics, appointments, history, patient EMR, patients, schedules
- Patient: appointments, dashboard, doctors, history, schedules
- Shared: profile, queue TV, telehealth room, modals, notifications, layouts, chatbot

## Do not claim complete migration yet
The included app is a working React JS starting point for the new architecture. Each feature from the original must be ported, connected to API contracts, and tested before it can be called migrated.
