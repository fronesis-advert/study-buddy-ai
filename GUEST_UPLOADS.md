# Guest Upload Support

## Overview
The app now supports document uploads for non-authenticated users (guests). Guest uploads are session-based and won't persist when the user closes the browser, but they can fully use all features during their session.

## Changes Made

### Database Migrations

#### 1. `0006_documents_sessions.sql`
- Adds `session_id` column to `documents` table
- Creates index on `session_id`
- Adds constraint to ensure either `user_id` or `session_id` is set

#### 2. `0007_update_rls_for_guest_sessions.sql`
- Updates RLS policies for documents and chunks
- Authenticated users see their own documents
- Service role has full access (API handles session validation)

### Backend Changes

#### `lib/rag/store.ts`
- Added `sessionId` parameter to `ingestDocument()`
- Documents are now associated with either a `user_id` or `session_id`

#### `app/api/ingest/route.ts`
- Removed authentication requirement
- Uses session system for both authenticated and guest users
- Creates/retrieves session automatically
- Returns session ID in response headers

#### `app/api/documents/route.ts`
- **GET**: Filters by `user_id` for authenticated users, `session_id` for guests
- **DELETE**: Checks ownership via either `user_id` or `session_id`

### Frontend Changes

#### `components/documents/document-manager.tsx`
- Sends `x-studybuddy-session` header with all requests
- Remembers session ID from API responses
- Notifies parent component when session changes via `onSessionChange` callback

#### `app/page.tsx`
- Tracks document session ID separately from other sessions
- Passes session ID when fetching documents
- Refreshes documents when session changes
- Passes `onSessionChange` callback to DocumentManager

## How It Works

1. **Guest uploads a document**:
   - API creates a new session (if none exists)
   - Document is stored with `session_id` (no `user_id`)
   - Session ID is returned and stored in browser localStorage

2. **Guest views documents**:
   - Frontend sends session ID with request
   - API filters documents by `session_id`
   - Only documents from that session are shown

3. **Guest closes browser**:
   - Session ID is lost (localStorage cleared)
   - Documents remain in database but are orphaned
   - Future cleanup job could remove old session-based documents

4. **User signs up/in**:
   - New documents will have `user_id` instead of `session_id`
   - Old session documents are not automatically migrated
   - Could add migration feature in the future

## Applying Changes

### 1. Run Database Migrations

```bash
# Apply the migrations to your Supabase database
# Either through Supabase dashboard or CLI:
npx supabase migration up
```

### 2. Regenerate Types

```bash
# Update TypeScript types to include session_id column
npx supabase gen types typescript --local > types/database.ts
```

### 3. Test the Feature

- Visit the app without signing in
- Upload a document
- Verify it appears in the documents list
- Refresh the page - document should still be there
- Close and reopen browser - document should be gone

## Security Considerations

- Guest documents use service role permissions (RLS bypassed at API level)
- API validates session ownership before allowing operations
- No way for one guest to access another guest's documents
- Authenticated users' documents remain protected by RLS

## Future Enhancements

1. **Session Migration**: Allow guests to claim their session documents when they sign up
2. **Cleanup Job**: Periodically delete old session-based documents
3. **Session Expiry**: Add expiration time to sessions table
4. **Storage Limits**: Implement document/storage limits for guest users
