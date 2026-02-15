
# Aegis Insight — AI Security & Insights Auditor (POC)

## Overview
A sleek, dark-themed web app where users input an AI service name/URL and receive a comprehensive "Intelligence Report" covering features, security vulnerabilities, market sentiment, and competitive analysis. Built for clarier.ai as a proof of concept.

---

## Phase 1: Landing Page & Design System

**Obsidian Dark Theme** — Deep charcoal (#0a0a0a) background, electric blue (#3b82f6) accents, crimson (#ef4444) for vulnerability highlights. Glassmorphism cards with subtle glowing borders and monospaced fonts for technical data.

**Landing Page** — Minimalist hero with the Aegis Insight logo/wordmark, a glowing central search bar with placeholder text like "Enter an AI service (e.g., OpenAI Sora, Midjourney...)", and a brief tagline about AI security intelligence.

---

## Phase 2: Search & "Deep Scanning" Animation

**Scanning Experience** — When the user submits a query, transition to a full-screen scanning state with:
- A terminal-style log showing progress messages (e.g., "Accessing arXiv papers...", "Checking CVE databases...", "Analyzing market reports...", "Synthesizing intelligence...")
- Animated progress indicators with a pulsing blue glow
- This runs while the backend performs the actual search and analysis

---

## Phase 3: Backend — Intelligence Pipeline

**Perplexity Integration** (via Supabase Edge Function + Perplexity connector) — Real-time web search to gather articles, research papers, news, CVE data, and competitor info about the queried AI service.

**Lovable AI Integration** (via Supabase Edge Function) — Takes the raw Perplexity search results and synthesizes:
- Executive summary & Trust Score (0-100)
- Vulnerability assessment across categories (Data Privacy, Prompt Injection, Model Bias, Infrastructure Security)
- Competitive comparison with 2-3 alternatives
- Structured knowledge feed with source credibility ratings

**Database** — A `reports` table storing the service name, raw search data (JSONB), analysis results (JSONB), trust score, and timestamp. No auth for POC — reports stored without user association.

---

## Phase 4: Report Dashboard

**Bento Grid Layout** with these cards:

1. **Executive Summary Card** — Trust Score displayed as a large circular gauge (0-100, color-coded green→yellow→red), plus a 3-sentence summary of the AI service's security posture.

2. **Vulnerability Radar** — A radar/spider chart visualizing risk levels across Data Privacy, Prompt Injection Susceptibility, Model Bias, Infrastructure Security, and other relevant categories. Uses recharts.

3. **Knowledge Feed** — A vertical timeline of discovered articles, papers, and news items. Each entry shows title, source, date, snippet, and a "Source Credibility" badge (High/Medium/Low confidence).

4. **Competitive Context Table** — Side-by-side comparison of the queried service vs. 2-3 top competitors on key metrics (pricing, security features, compliance certifications, trust score).

---

## Phase 5: PDF Export

**Full Branded PDF** — A "Download Security Audit" button that generates a professionally formatted PDF including:
- Aegis Insight branding/header
- Executive summary with Trust Score
- Vulnerability radar visualization
- Knowledge feed highlights
- Competitive comparison table
- Timestamp and disclaimer footer

---

## Phase 6: Polish & History

**Report History** — A sidebar or secondary page listing previously generated reports so users can revisit past scans.

**Responsive Design** — Ensure the bento grid and all components work well on tablet and desktop viewports.

**Loading States & Error Handling** — Graceful fallbacks if search returns limited results, rate limit handling for AI APIs, and informative error messages.
