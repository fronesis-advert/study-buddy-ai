import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    return Response.json({ message: "Test route works!" }, { status: 200 });
  } catch (error) {
    console.error("test error", error);
    return Response.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
