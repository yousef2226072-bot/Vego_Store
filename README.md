# VEGO STORE — Frontend (React + TypeScript + Tailwind + Vite)

Talks to the Node backend in `vego-store-backend.zip` (same API: `/api/me`, `/api/login`, `/api/products`, `/api/orders`, `/api/customers`).

## Run (dev)
    npm install
    cp .env.example .env
    # terminal 1: backend  →  node server.js        (port 3000)
    # terminal 2: frontend →  npm run dev            (http://localhost:5173, /api is proxied to :3000)

## Build & deploy
    npm run build          # type-checks, outputs dist/
Copy everything inside `dist/` into the backend's `public/` folder (replacing the old index.html).
The backend serves it and falls back to index.html for client-side routes (/admin, /login, /checkout).
Then edit the domain in `public/sitemap.xml`, `public/robots.txt` and `VITE_SITE_URL`.

## Structure
    src/api/         fetch client (cookies, typed ApiError, 401 hook) + auth/products/orders services
    src/types/       DTOs mirroring backend payloads (no `any`)
    src/hooks/       TanStack Query hooks (useProducts, useOrders…), useDebounce
    src/context/     Auth (owner session), Cart (persisted), Toast (aria-live)
    src/components/  ui/ (Button, Input, Modal, Badge, Skeleton, EmptyState), layout/, product/, cart/, admin/
    src/pages/       Home, Checkout, Login, Admin (protected), NotFound — lazy-loaded
    tailwind.config.ts + src/index.css   design tokens (colours, fonts, radius, shadows)

## Security notes
Owner access is enforced by the backend session cookie (HttpOnly). `ProtectedRoute` only hides UI; the API rejects non-owners with 401.
No credentials exist in this frontend. All user text is rendered through React (escaped); no `dangerouslySetInnerHTML`.
