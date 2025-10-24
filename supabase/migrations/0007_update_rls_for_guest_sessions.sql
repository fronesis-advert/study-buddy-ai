-- Update RLS policies to properly handle guest sessions
-- Documents can be accessed by authenticated users OR by anyone with service role
-- The API layer will handle session-based authorization for guest users

-- Drop old document policies
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- New document policies
-- For authenticated users: access their own documents
-- For service role: full access (API handles session validation)
CREATE POLICY "Authenticated users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to documents"
  ON documents FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Update chunks policy to reflect document access
DROP POLICY IF EXISTS "Users can view chunks from their documents" ON chunks;

CREATE POLICY "Authenticated users can view chunks from their documents"
  ON chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = chunks.document_id
      AND documents.user_id = auth.uid()
    )
  );
