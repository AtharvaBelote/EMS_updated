# Employee Management System (EMS) — Project Overview

## What Is This Project?

This is a full-stack **Employee Management System** built for **Shree Samartha Krupa Consulting Services**. It consists of two applications sharing the same Firebase backend:

1. **Web App** — Next.js 15 admin/manager portal (this repo root)
2. **Mobile App** — React Native (Expo) employee-facing app (`EMS-Mobile/`)

---

## Tech Stack

### Web App
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI Library | MUI (Material UI) v7 + Tailwind CSS v4 |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Storage | Firebase Storage + Cloudflare R2 (branding assets) |
| Forms | React Hook Form + Yup |
| PDF Generation | jsPDF + jspdf-autotable, html2pdf.js |
| Excel | xlsx |
| Charts | Recharts |
| Language | TypeScript 5.9 |

### Mobile App (`EMS-Mobile/`)
| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| UI Library | React Native Paper |
| Auth | Firebase Authentication (AsyncStorage persistence) |
| Database | Firebase Firestore |
| PDF | expo-print + expo-sharing |
| Language | TypeScript 5.9 |

---

## Repository Structure

```
/                              ← Next.js web app root
├── src/
│   ├── app/                   ← Next.js App Router pages
│   ├── components/            ← React UI components
│   ├── contexts/              ← React context providers
│   ├── lib/                   ← Firebase init + utilities
│   └── types/                 ← TypeScript interfaces
├── public/                    ← Static assets
├── .env                       ← Environment variables (not committed)
├── env.example                ← Env variable template
├── next.config.ts
├── package.json
└── EMS-Mobile/                ← React Native (Expo) app
    ├── src/
    │   ├── config/            ← Firebase init for mobile
    │   ├── contexts/          ← Auth context for mobile
    │   ├── navigation/        ← App navigator
    │   ├── screens/           ← Screen components
    │   ├── types/             ← Mobile-specific types
    │   └── utils/             ← PDF generator utility
    ├── App.tsx                ← Entry point
    ├── app.json               ← Expo config
    └── package.json
```

---

## Web App — Detailed Breakdown

### Entry & Layout (`src/app/`)

| File | Purpose |
|---|---|
| `layout.tsx` | Root layout — wraps app in `ThemeProvider`, `ClientOnly`, and `AuthProvider` |
| `page.tsx` | Root route — redirects to `/dashboard` if logged in, else `/login` |
| `globals.css` | Global styles |

### Pages (Routes)

Every page under `src/app/` follows the same pattern: che