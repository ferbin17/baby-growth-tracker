# Baby Growth Tracker

An App Router application for recording baby measurements and comparing growth trends with WHO reference data.

## Requirements

- Node.js version from [`.nvmrc`](.nvmrc)
- A Supabase project with the `babies` and `measurements` tables

Create a local `.env` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Project structure

- `src/app`: thin App Router routes, layouts, and route-level error handling
- `src/features`: route-specific client components grouped by domain
- `src/components`: reusable UI, including app-state hydration and loading primitives
- `src/services`: browser-only Supabase-backed profile, measurement, and login operations
- `src/store`: persisted client session state
- `src/utils`: growth, date, formatting, and WHO-data calculations

The persisted auth store is explicitly hydrated in the root layout. Route guards wait for that hydration before deciding whether to redirect, avoiding false redirects on refresh.
