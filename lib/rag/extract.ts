export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (!buffer.length) return "";

  if (mimeType === "application/pdf") {
    try {
      const pdfParseModule = (await import("pdf-parse/lib/pdf-parse.js")) as {
        default: (data: Buffer | { data: Buffer }) => Promise<{ text: string }>;
      };

      console.log("📄 Parsing PDF, buffer size:", buffer.length);
      const data = await pdfParseModule.default(buffer);
      console.log("📄 PDF parsed, text length:", data.text.length, "First 100 chars:", data.text.substring(0, 100));
      return data.text;
    } catch (error) {
      console.error("PDF parsing error:", error);
      throw new Error(
        "Failed to parse PDF. Please try converting it to text first or paste the content directly."
      );
    }
  }

  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/x-ndjson"
  ) {
    return buffer.toString("utf-8");
  }

  throw new Error(
    `Unsupported file type: ${mimeType}. Please upload text files (.txt, .md, .json) or paste text directly.`
  );
}

export function sanitizeText(text: string) {
  return text.replace(/\u0000/g, "").trim();
}
