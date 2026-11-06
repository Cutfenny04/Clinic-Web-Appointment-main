# JanjiCare Frontend

**Clinic Web Appointment System — Standalone React Frontend**

Migrated from Laravel 13 / Inertia.js / TypeScript to a fully independent **React 18 + Vite + Tailwind CSS** application.

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18 and npm ≥ 9

### Installation

```bash
cd janjicare-frontend
npm install
```

### Development Server

```bash
npm run dev
```

Open http://localhost:5173

### Production Build

```bash
npm run build
npm run preview
```

---

## 🔐 Demo Credentials

Login with these accounts to explore each role:

| Role    | Email                   | Password     |
|---------|-------------------------|--------------|
| Admin   | admin@janjicare.com     | password     |
| Doctor  | doctor@janjicare.com    | password     |
| Patient | patient@janjicare.com   | password     |

The **Login page** also has one-click role switcher buttons for quick testing without typing.

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable              | Default                        | Description                          |
|-----------------------|--------------------------------|--------------------------------------|
| `VITE_API_BASE_URL`   | `http://localhost:5000/api`    | Express.js backend base URL          |
| `VITE_LIVEKIT_WS_URL` | `ws://localhost:7880`          | LiveKit WebSocket server for telehealth |

---

## 🏗️ Project Structure

```
janjicare-frontend/
├── public/
│   ├── favicon.svg
│   └── manifest.json
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AIChatbot.jsx
│   │   ├── AppointmentDetailsModal.jsx
│   │   ├── ApplicationLogo.jsx
│   │   ├── Checkbox.jsx
│   │   ├── CustomDatePicker.jsx
│   │   ├── CustomMultiSelect.jsx
│   │   ├── CustomSelect.jsx
│   │   ├── CustomTimePicker.jsx
│   │   ├── DangerButton.jsx
│   │   ├── DoctorDetailsModal.jsx
│   │   ├── DoctorProfileCard.jsx
│   │   ├── Dropdown.jsx
│   │   ├── InputError.jsx
│   │   ├── InputLabel.jsx
│   │   ├── Modal.jsx
│   │   ├── NotificationBell.jsx
│   │   ├── PatientDetailsModal.jsx
│   │   ├── PatientProfileCard.jsx
│   │   ├── PrimaryButton.jsx
│   │   ├── SecondaryButton.jsx
│   │   ├── SessionTimeout.jsx
│   │   ├── TextInput.jsx
│   │   └── Toast.jsx
│   ├── context/
│   │   └── AuthContext.jsx   # Global auth state + demo login
│   ├── layouts/
│   │   ├── GuestLayout.jsx   # Auth pages (login, register)
│   │   └── SidebarLayout.jsx # Dashboard pages (admin/doctor/patient)
│   ├── pages/
│   │   ├── public/
│   │   │   └── Welcome.jsx
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── Verify2FA.jsx
│   │   │   ├── VerifyEmail.jsx
│   │   │   └── ConfirmPassword.jsx
│   │   ├── admin/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Doctors.jsx
│   │   │   ├── Patients.jsx
│   │   │   ├── Appointments.jsx
│   │   │   ├── Schedules.jsx
│   │   │   ├── Pharmacy.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── AI.jsx
│   │   │   └── Security.jsx
│   │   ├── doctor/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Appointments.jsx
│   │   │   ├── Patients.jsx
│   │   │   ├── PatientEMR.jsx
│   │   │   ├── Schedules.jsx
│   │   │   ├── History.jsx
│   │   │   └── Analytics.jsx
│   │   ├── patient/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Doctors.jsx
│   │   │   ├── Schedules.jsx
│   │   │   ├── Appointments.jsx
│   │   │   └── History.jsx
│   │   ├── queue/
│   │   │   └── QueueTV.jsx   # Public TV display (no sidebar)
│   │   ├── telehealth/
│   │   │   └── TelehealthRoom.jsx
│   │   ├── profile/
│   │   │   └── ProfileEdit.jsx
│   │   └── NotFound.jsx
│   ├── routes/
│   │   ├── AppRoutes.jsx     # All route definitions
│   │   └── ProtectedRoute.jsx # Auth + role guard
│   ├── services/
│   │   └── api.js            # Axios client (Bearer token, 401 redirect)
│   ├── utils/
│   │   └── time.js           # formatTime12Hour helper
│   ├── App.jsx               # BrowserRouter + AuthProvider + AppRoutes
│   ├── main.jsx              # createRoot entry point
│   └── index.css             # Tailwind base + custom styles
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── package.json
```

---

## 🔌 Backend Integration

### API Client

All HTTP requests go through `src/services/api.js`:

```js
import apiClient from '@/services/api';

// GET
const res = await apiClient.get('/admin/doctors');

// POST
await apiClient.post('/admin/appointments', { schedule_id: 5, notes: '...' });

// PUT
await apiClient.put('/admin/doctors/3', { name: '...' });

// DELETE
await apiClient.delete('/admin/doctors/3');
```

The client automatically:
- Reads base URL from `VITE_API_BASE_URL`
- Attaches `Authorization: Bearer <token>` from localStorage
- Redirects to `/login` on 401 responses

### Expected Express.js Endpoints

#### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Returns `{token, user:{id,name,email,role}}` |
| POST | `/api/auth/register` | Patient self-registration |
| POST | `/api/auth/logout` | Invalidates token |
| POST | `/api/auth/forgot-password` | Sends reset email |
| POST | `/api/auth/reset-password` | Resets password with token |
| POST | `/api/auth/verify-2fa` | Verifies OTP |

#### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET/POST | `/api/admin/doctors` | List / create doctors |
| PUT/DELETE | `/api/admin/doctors/:id` | Update / delete doctor |
| GET/POST | `/api/admin/patients` | List / create patients |
| GET/POST | `/api/admin/appointments` | List / create appointments |
| PUT | `/api/admin/appointments/:id` | Update appointment status |
| GET/POST | `/api/admin/schedules` | List / create schedules |
| GET/POST/PUT | `/api/admin/pharmacy` | Medicines inventory |
| GET | `/api/admin/reports` | System report data |
| GET | `/api/admin/analytics` | Charts data |
| GET/POST | `/api/admin/ai-settings` | AI API key management |
| POST | `/api/admin/ai/test` | Test AI connection |
| GET | `/api/admin/security` | Security logs + stats |
| POST | `/api/admin/security/unlock/:id` | Unlock user account |
| POST | `/api/admin/backups` | Generate backup |

#### Doctor
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/doctor/dashboard` | Doctor dashboard |
| GET | `/api/doctor/appointments` | Doctor's appointments |
| PUT | `/api/doctor/appointments/:id` | Update appointment status |
| GET | `/api/doctor/patients` | Doctor's patient list |
| GET | `/api/doctor/patients/:id/emr` | Patient EMR |
| POST | `/api/doctor/patients/:id/vitals` | Record vitals |
| POST | `/api/doctor/patients/:id/prescriptions` | Add prescription |
| GET/POST | `/api/doctor/schedules` | Doctor's schedules |
| DELETE | `/api/doctor/schedules/:id` | Cancel schedule |
| GET | `/api/doctor/history` | Consultation history |
| GET | `/api/doctor/analytics` | Doctor analytics |

#### Patient
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/patient/dashboard` | Patient dashboard |
| GET | `/api/patient/doctors` | Search doctors |
| GET | `/api/patient/schedules/slots` | Available slots `?doctor_id&date` |
| GET | `/api/patient/appointments` | Patient's appointments |
| POST | `/api/patient/appointments` | Book appointment |
| DELETE | `/api/patient/appointments/:id` | Cancel appointment |
| GET | `/api/patient/history` | Medical history |

#### Queue & Telehealth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/queue/current` | Current serving + waiting list |
| GET | `/api/telehealth/token` | LiveKit token `?room=` |

#### Profile
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/api/profile` | Update profile info |
| PUT | `/api/profile/password` | Change password |
| PUT | `/api/profile/medical` | Update medical profile |
| GET | `/api/profile/sessions` | Active browser sessions |
| DELETE | `/api/profile/sessions` | Logout other sessions |

---

## 🎨 Design System

### Colors
- **Primary gradient**: `from-teal-400 to-blue-600` (teal → blue)
- **Dark mode**: `dark:bg-slate-800`, `dark:bg-slate-900`, `dark:border-slate-700`
- **Card base**: `bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700`

### Typography
- Font: **Inter** (loaded via Google Fonts in index.html)
- Dark mode toggle: stored in `localStorage` as `theme`, applied to `document.documentElement.classList`

### Dark Mode
Toggle via the moon/sun button in the SidebarLayout header. State persists across page reloads.

---

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3.1 | UI framework |
| react-dom | ^18.3.1 | DOM renderer |
| react-router-dom | ^6.28.0 | Client-side routing |
| vite | ^5.4.11 | Build tool + dev server |
| tailwindcss | ^3.4.16 | Utility CSS framework |
| axios | ^1.7.9 | HTTP client |
| chart.js | ^4.4.7 | Chart rendering |
| react-chartjs-2 | ^5.2.0 | React wrapper for Chart.js |
| @headlessui/react | ^2.2.0 | Accessible UI primitives |
| lucide-react | ^0.468.0 | Icon library |
| framer-motion | ^11.15.0 | Animations |
| @livekit/components-react | ^2.6.5 | Telehealth video |
| lenis | ^1.1.18 | Smooth scrolling |
| react-markdown | ^9.0.1 | AI chatbot message rendering |
| dayjs | ^1.11.13 | Date/time utilities |

---

## 📋 Migration Status

| File | Source | Status |
|------|--------|--------|
| `src/pages/public/Welcome.jsx` | Pages/Welcome.tsx | ✅ Migrated |
| `src/pages/auth/Login.jsx` | Pages/Auth/Login.tsx | ✅ Migrated |
| `src/pages/auth/Register.jsx` | Pages/Auth/Register.tsx | ✅ Migrated |
| `src/pages/auth/ForgotPassword.jsx` | Pages/Auth/ForgotPassword.tsx | ✅ Migrated |
| `src/pages/auth/ResetPassword.jsx` | Pages/Auth/ResetPassword.tsx | ✅ Migrated |
| `src/pages/auth/Verify2FA.jsx` | Pages/Auth/Verify2FA.tsx | ✅ Migrated |
| `src/pages/auth/VerifyEmail.jsx` | Pages/Auth/VerifyEmail.tsx | ✅ Migrated |
| `src/pages/auth/ConfirmPassword.jsx` | Pages/Auth/ConfirmPassword.tsx | ✅ Migrated |
| `src/pages/admin/Dashboard.jsx` | Pages/Admin/Dashboard.tsx | ✅ Migrated |
| `src/pages/admin/Doctors.jsx` | Pages/Admin/Doctors.tsx | ✅ Migrated |
| `src/pages/admin/Patients.jsx` | Pages/Admin/Patients.tsx | ✅ Migrated |
| `src/pages/admin/Appointments.jsx` | Pages/Admin/Appointments.tsx | ✅ Migrated |
| `src/pages/admin/Schedules.jsx` | Pages/Admin/Schedules.tsx | ✅ Migrated |
| `src/pages/admin/Pharmacy.jsx` | Pages/Admin/Pharmacy.tsx | ✅ Migrated |
| `src/pages/admin/Reports.jsx` | Pages/Admin/Reports.tsx | ✅ Migrated |
| `src/pages/admin/Analytics.jsx` | Pages/Admin/Analytics.tsx | ✅ Migrated |
| `src/pages/admin/AI.jsx` | Pages/Admin/AI.tsx | ✅ Migrated |
| `src/pages/admin/Security.jsx` | Pages/Admin/Security.tsx | ✅ Migrated |
| `src/pages/doctor/Dashboard.jsx` | Pages/Doctor/Dashboard.tsx | ✅ Migrated |
| `src/pages/doctor/Appointments.jsx` | Pages/Doctor/Appointments.tsx | ✅ Migrated |
| `src/pages/doctor/Patients.jsx` | Pages/Doctor/Patients.tsx | ✅ Migrated |
| `src/pages/doctor/PatientEMR.jsx` | Pages/Doctor/PatientEMR.tsx | ✅ Migrated |
| `src/pages/doctor/Schedules.jsx` | Pages/Doctor/Schedules.tsx | ✅ Migrated |
| `src/pages/doctor/History.jsx` | Pages/Doctor/History.tsx | ✅ Migrated |
| `src/pages/doctor/Analytics.jsx` | Pages/Doctor/Analytics.tsx | ✅ Migrated |
| `src/pages/patient/Dashboard.jsx` | Pages/Patient/Dashboard.tsx | ✅ Migrated |
| `src/pages/patient/Doctors.jsx` | Pages/Patient/Doctors.tsx | ✅ Migrated |
| `src/pages/patient/Schedules.jsx` | Pages/Patient/Schedules.tsx | ✅ Migrated |
| `src/pages/patient/Appointments.jsx` | Pages/Patient/Appointments.tsx | ✅ Migrated |
| `src/pages/patient/History.jsx` | Pages/Patient/History.tsx | ✅ Migrated |
| `src/pages/queue/QueueTV.jsx` | Pages/Queue/TV.tsx | ✅ Migrated |
| `src/pages/telehealth/TelehealthRoom.jsx` | Pages/Telehealth/Room.tsx | ✅ Migrated |
| `src/pages/profile/ProfileEdit.jsx` | Pages/Profile/Edit.tsx + Partials | ✅ Migrated |
| `src/layouts/SidebarLayout.jsx` | Layouts/SidebarLayout.tsx | ✅ Migrated |
| `src/layouts/GuestLayout.jsx` | Layouts/GuestLayout.tsx | ✅ Migrated |
| `src/components/Toast.jsx` | Components/Toast.tsx | ✅ Migrated |
| `src/components/Modal.jsx` | Components/Modal.tsx | ✅ Migrated |
| `src/components/Dropdown.jsx` | Components/Dropdown.tsx | ✅ Migrated |
| `src/components/AIChatbot.jsx` | Components/AIChatbot.tsx | ✅ Migrated |
| `src/components/NotificationBell.jsx` | Components/NotificationBell.tsx | ✅ Migrated |
| `src/components/SessionTimeout.jsx` | Components/SessionTimeout.tsx | ✅ Migrated |
| All other Components | Various | ✅ Migrated |

> **Note**: All pages use demo/mock data when the backend API is offline. The system
> automatically tries the real API endpoint first and falls back to demo data on network
> errors — no blank or broken pages in standalone demo mode.

---

## 🔒 Authentication Flow

1. User submits login form → `POST /api/auth/login`
2. Backend returns `{ token, user }` 
3. Token saved to `localStorage` as `jc_token`
4. User object saved to `localStorage` as `jc_user`
5. AuthContext exposes `{ user, token, login, logout }` globally
6. ProtectedRoute checks `user` and `user.role` for each route
7. Unauthorized access → redirect to `/login`
8. Unauthenticated access to role-specific route → redirect to `/login`

### SessionTimeout
Automatically logs out after 15 minutes of inactivity (no mouse/keyboard/touch events). A countdown warning modal appears 60 seconds before timeout.

---

## 🌐 Routing Summary

| Path | Component | Access |
|------|-----------|--------|
| `/` | Welcome | Public |
| `/queue/tv` | QueueTV | Public (TV display) |
| `/login` | Login | Guest only |
| `/register` | Register | Guest only |
| `/forgot-password` | ForgotPassword | Guest only |
| `/reset-password/:token` | ResetPassword | Guest only |
| `/verify-2fa` | Verify2FA | Guest only |
| `/verify-email` | VerifyEmail | Auth |
| `/confirm-password` | ConfirmPassword | Auth |
| `/admin/*` | Admin pages | Admin role only |
| `/doctor/*` | Doctor pages | Doctor role only |
| `/patient/*` | Patient pages | Patient role only |
| `/telehealth/room/:id` | TelehealthRoom | Any auth role |
| `/profile` | ProfileEdit | Any auth role |
| `*` | NotFound (404) | Public |

---

## 💡 Notes for Backend Team (Express.js)

1. **CORS**: Allow `http://localhost:5173` in development, and your production frontend domain.
2. **Auth tokens**: Use JWT. Frontend reads from `Authorization: Bearer <token>` header (set by Axios interceptor).
3. **Response format**: Wrap all responses in consistent JSON: `{ data: ..., message: '...', success: true }`.
4. **Error format**: Return `{ message: '...', errors: { field: ['...'] } }` for validation errors.
5. **Supabase**: Use `@supabase/supabase-js` on the Express backend for database access.
6. **LiveKit**: Generate tokens server-side using `livekit-server-sdk`. Return token string from `/api/telehealth/token`.

---

## 🛠️ Troubleshooting

**Q: `import.meta.env.VITE_*` returns undefined**  
A: Make sure you've copied `.env.example` to `.env` and restarted the dev server.

**Q: Charts don't render**  
A: Ensure `chart.js` and `react-chartjs-2` are installed (`npm install`). Check browser console for Chart.js registration errors.

**Q: LiveKit video not working**  
A: Ensure LiveKit server is running and `VITE_LIVEKIT_WS_URL` is correct. The backend must generate a valid LiveKit access token.

**Q: Login succeeds in demo but fails with real backend**  
A: The demo mode in `AuthContext.jsx` uses hardcoded credentials. Remove or disable the demo fallback once the real backend is connected.

---

*JanjiCare Clinic Web Appointment System — Frontend v1.0.0*  
*Migrated from Laravel/Inertia to React/Vite — 2026*
