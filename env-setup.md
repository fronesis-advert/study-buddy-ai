# Environment Variables Setup

Add these variables to your `.env.local` file:

```env
# OpenAI API Key (you already have this)
OPENAI_API_KEY=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

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://figmhrdqkcforwzucdni.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZ21ocmRxa2Nmb3J3enVjZG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3Nzg0MTUsImV4cCI6MjA3NTM1NDQxNX0.kV9EiCQb3xNXbJZ9U54xJRqhbtW7PBK4oDIQMFui3FQ

# Service Role Key (Get this from Supabase Dashboard)
# Go to: https://supabase.com/dashboard/project/figmhrdqkcforwzucdni/settings/api
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Steps:

1. **Open your `.env.local` file** (currently on line 5)
2. **Copy the environment variables above**
3. **Get your Service Role Key:**
   - Go to: https://supabase.com/dashboard/project/figmhrdqkcforwzucdni/settings/api
   - Copy the **service_role** key (not the anon key)
   - Replace `your-service-role-key-here` with the actual key
4. **Restart your dev server** (stop `npm run dev` and start it again)

After adding these variables, the `/api/ingest` endpoint will work!
