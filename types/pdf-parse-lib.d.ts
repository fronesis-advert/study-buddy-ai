declare module "pdf-parse/lib/pdf-parse.js" {
  export default function pdfParse(data: Buffer | { data: Buffer }): Promise<{ text: string }>;
}

