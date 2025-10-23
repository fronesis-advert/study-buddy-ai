import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";

// PUT /api/mindmaps/[id]/groups/[groupId] - Update a group
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: mindMapId, groupId } = params;
    const body = await request.json();

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

    // Update the group
    const { data: group, error } = await supabase
      .from("mind_map_groups")
      .update(body)
      .eq("id", groupId)
      .eq("mind_map_id", mindMapId)
      .select()
      .single();

    if (error) {
      console.error("Error updating group:", error);
      return NextResponse.json(
        { error: "Failed to update group" },
        { status: 500 }
      );
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/mindmaps/[id]/groups/[groupId] - Delete a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: mindMapId, groupId } = params;

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

    // Delete the group (nodes will have group_id set to null automatically)
    const { error } = await supabase
      .from("mind_map_groups")
      .delete()
      .eq("id", groupId)
      .eq("mind_map_id", mindMapId);

    if (error) {
      console.error("Error deleting group:", error);
      return NextResponse.json(
        { error: "Failed to delete group" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
