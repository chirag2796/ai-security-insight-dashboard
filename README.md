# AI Tools Security Insights

AI Security Intelligence dashboard. Search for any AI tool or service and get a structured security report: vulnerabilities, compliance context, trust score, competitor comparison, and an intelligence feed with source links. Includes compliance tasks and report history for teams evaluating new AI tools.

## Features

- **Scan AI tools** — Enter a service name (e.g. ChatGPT, Claude) to run a web-backed security analysis.
- **Security reports** — Trust score, vulnerability radar (data privacy, prompt injection, bias, infrastructure, compliance, etc.), executive summary, and source-backed findings.
- **Reports history** — View and revisit past scans.
- **Compliance** — Compliance dashboard and plans to track steps and decisions when adopting AI tools.
- **Export** — Export reports as PDF for sharing with legal or procurement.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, React Router
- **UI:** Tailwind CSS, shadcn/ui (Radix), Framer Motion, Recharts
- **Backend:** Supabase (PostgreSQL, Edge Functions)
- **External APIs:** Serper (web search), OpenRouter (LLM synthesis)

## Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project
- API keys: [Serper](https://serper.dev), [OpenRouter](https://openrouter.ai) (used as Supabase Edge Function secrets)

## Setup

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd aegis-insight-dashboard
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and set your Supabase values (from Supabase Dashboard → Settings → API):

   ```bash
   cp .env.example .env
   ```

   Required in `.env`:

   - `VITE_SUPABASE_URL` — Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — Anon/public key

   Optional: `VITE_SUPABASE_PROJECT_ID` if you use it in the app.

   **Backend (Supabase Edge Function secrets):** Set in Supabase Dashboard → Project Settings → Edge Functions → Secrets (or via Supabase CLI):

   - `SERPER_API_KEY`
   - `OPENROUTER_API_KEY`

   The Edge Function uses these; they are not put in the frontend `.env`.

3. **Database**

   Apply the Supabase migration so the `reports` table (and any other tables) exist. Use the Supabase Dashboard SQL editor or:

   ```bash
   supabase db push
   ```

   (Requires [Supabase CLI](https://supabase.com/docs/guides/cli) and a linked project.)

4. **Run the app**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080` (or the port shown in the terminal).

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Start dev server (Vite)        |
| `npm run build`| Production build              |
| `npm run preview` | Preview production build   |
| `npm run lint` | Run ESLint                     |
| `npm run test` | Run tests (Vitest)             |

## Project structure (main paths)

```
src/
  App.tsx                 # Routes, auth, providers
  main.tsx
  pages/
    Index.tsx             # Home: scan input
    Report.tsx             # Single report view
    ReportsHistory.tsx     # Past reports
    ComplianceDashboard.tsx
    CompliancePlan.tsx
    Auth.tsx
    NotFound.tsx
  components/             # UI and shared components
  integrations/supabase/  # Supabase client and types
  lib/                    # Utils, PDF export, etc.
  hooks/                  # useAuth, etc.

supabase/
  functions/analyze-service/  # Edge Function: Serper + OpenRouter → report
  migrations/                 # DB schema
```

## How analysis works

1. User enters an AI service name and starts a scan.
2. Frontend creates a report row in Supabase and calls the `analyze-service` Edge Function.
3. The function runs four Serper web searches (security, privacy, competitors, bias), then sends the results to OpenRouter (Gemini) to produce a structured JSON report.
4. The report is saved to Supabase; the Report page polls until status is complete and then displays the result.

## Deployment

Build the app and deploy the `dist/` output to any static host (Vercel, Netlify, Cloudflare Pages, etc.). Point the host to your Supabase project; ensure Edge Functions are deployed (e.g. `supabase functions deploy analyze-service`) and secrets are set in the Supabase project.

## License

Private / unlicensed unless otherwise specified.
