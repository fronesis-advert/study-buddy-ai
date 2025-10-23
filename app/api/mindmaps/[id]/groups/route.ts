import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";

// GET /api/mindmaps/[id]/groups - Get all groups for a mind map
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mindMapId = params.id;

    // Verify user owns this mind map
    const { data: mindMap } = await supabase
      .from("mind_maps")
      .select("id")
      .eq("id", mindMapId)
      .eq("user_id", userId)
      .single();

    if (!mindMap) {
      return NextResponse.json({ error: "Mind map not found" }, { status: 404 });
    }

    // Get all groups for this mind map
    const { data: groups, error } = await supabase
      .from("mind_map_groups")
      .select("*")
      .eq("mind_map_id", mindMapId)
      .order("z_index", { ascending: true });

    if (error) {
      console.error("Error fetching groups:", error);
      return NextResponse.json(
        { error: "Failed to fetch groups" },
        { status: 500 }
      );
    }

    return NextResponse.json({ groups: groups || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/mindmaps/[id]/groups - Create a new group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mindMapId = params.id;
    const body = await request.json();
    const { label, color, position_x, position_y, width, height, z_index } = body;

    // Verify user owns this mind map
    const { data: mindMap } = await supabase
      .from("mind_maps")
      .select("id")
      .eq("id", mindMapId)
      .eq("user_id", userId)
      .single();

    if (!mindMap) {
      return NextResponse.json({ error: "Mind map not found" }, { status: 404 });
    }

    // Create the group
    const { data: group, error } = await supabase
      .from("mind_map_groups")
      .insert({
        mind_map_id: mindMapId,
        label: label || "New Group",
        color: color || "#94a3b8",
        position_x: position_x || 0,
        position_y: position_y || 0,
        width: width || 400,
        height: height || 300,
        z_index: z_index || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating group:", error);
      return NextResponse.json(
        { error: "Failed to create group" },
        { status: 500 }
      );
    }

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
