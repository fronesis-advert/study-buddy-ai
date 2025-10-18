import { NextRequest, NextResponse } from "next/server";
import type { DocumentSourceType } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  console.log("🚀 Ingest route called!");
  
  try {
    // Dynamically import to avoid initialization errors
    const { getCurrentUserId } = await import("@/lib/auth");
    const { ingestDocument } = await import("@/lib/rag/store");
    const { extractTextFromFile, sanitizeText } = await import("@/lib/rag/extract");
    
    const contentType = request.headers.get("content-type") ?? "";
    console.log("Content-Type:", contentType);
    const userId = await getCurrentUserId();
    console.log("User ID:", userId);

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fileEntry = formData.get("file");
      const sourceType = (formData.get("sourceType")?.toString() ?? "upload") as DocumentSourceType;
      const titleInput = (formData.get("title")?.toString() ?? "").trim();

      if (!fileEntry || !(fileEntry instanceof File)) {
        return new Response(
          JSON.stringify({ error: "Expected a file upload." }),
          { status: 400 }
        );
      }

      const file = fileEntry as File;
      
      // Validate file size (10MB max)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: "File too large. Maximum size is 10MB." }),
          { status: 413 }
        );
      }

      // Validate MIME type
      const ALLOWED_MIME_TYPES = [
        "application/pdf",
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/json",
        "application/x-ndjson",
      ];
      
      if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.type.startsWith("text/")) {
        return new Response(
          JSON.stringify({ 
            error: `Unsupported file type: ${file.type}. Allowed types: PDF, TXT, MD, CSV, JSON` 
          }),
          { status: 415 }
        );
      }

      const title = titleInput || file.name || "Untitled";
      const buffer = Buffer.from(await file.arrayBuffer());
      const text = await extractTextFromFile(buffer, file.type);

      const result = await ingestDocument({
        userId,
        title,
        sourceType,
        text,
      });

      return Response.json(
        { documentId: result.documentId, chunks: result.chunksPersisted },
        { status: 201 }
      );
    }

    const payload = await request.json();
    const title =
      (payload.title as string | undefined)?.trim() ?? "Untitled notes";
    const sourceType = (payload.sourceType as DocumentSourceType) ?? "note";
    const text = sanitizeText((payload.text as string | undefined) ?? "");

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Provide some text to ingest." }),
        { status: 400 }
      );
    }

    const result = await ingestDocument({
      userId,
      title,
      sourceType,
      text,
    });

    return Response.json(
      { documentId: result.documentId, chunks: result.chunksPersisted },
      { status: 201 }
    );
  } catch (error) {
    console.error("ingest error", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to process document.",
      }),
      { status: 500 }
    );
  }
}
