export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRow = {
  user_id: string;
  plan: "free" | "pro";
  created_at: string;
};

export type DocumentSourceType = "upload" | "url" | "note";

export type DocumentRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  source_type: DocumentSourceType | null;
  raw_text: string | null;
  created_at: string;
};

export type ChunkRow = {
  id: string;
  document_id: string;
  content: string;
  embedding: number[] | null;
  token_count: number | null;
  created_at: string;
};

export type SessionMode = "chat" | "quiz" | "study";

export type SessionRow = {
  id: string;
  user_id: string | null;
  mode: SessionMode;
  meta: Json | null;
  created_at: string;
};

export type MessageRole = "user" | "assistant" | "system";

export type MessageRow = {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string | null;
  json: Json | null;
  created_at: string;
};

export type QuizRow = {
  id: string;
  session_id: string;
  spec: Json | null;
  result: Json | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          user_id: string;
          plan?: "free" | "pro";
          created_at?: string;
        };
        Update: {
          plan?: "free" | "pro";
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: DocumentRow;
        Insert: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          source_type?: DocumentSourceType | null;
          raw_text?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          source_type?: DocumentSourceType | null;
          raw_text?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chunks: {
        Row: ChunkRow;
        Insert: {
          id?: string;
          document_id: string;
          content: string;
          embedding?: number[] | null;
          token_count?: number | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          embedding?: number[] | null;
          token_count?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: SessionRow;
        Insert: {
          id?: string;
          user_id?: string | null;
          mode: SessionMode;
          meta?: Json | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          mode?: SessionMode;
          meta?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: {
          id?: string;
          session_id: string;
          role: MessageRole;
          content?: string | null;
          json?: Json | null;
          created_at?: string;
        };
        Update: {
          content?: string | null;
          json?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quizzes: {
        Row: QuizRow;
        Insert: {
          id?: string;
          session_id: string;
          spec?: Json | null;
          result?: Json | null;
          created_at?: string;
        };
        Update: {
          spec?: Json | null;
          result?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          doc_ids?: string[] | null;
        };
        Returns: {
          id: string;
          document_id: string;
          content: string;
          similarity: number;
        }[];
      };
    };
    Views: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Enums: {
      [_ in never]: never;
    };
  };
};


