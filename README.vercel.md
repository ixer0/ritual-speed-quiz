# Vercel Deployment

This project is configured for Vercel with [vercel.json](/home/mceesquare/ritual-projects/ritual-quiz-arena/vercel.json).

## Required Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

Use `.env.example` as the key reference.

## Deploy Trigger

Deployments are triggered by pushes to `main` once the GitHub repo is connected in Vercel.
