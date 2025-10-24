import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";

// GET /api/mindmaps - List all mind maps for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    // Build query with user filter
    let query = supabase
      .from("mind_maps")
      .select("*")
      .order("updated_at", { ascending: false });

    // Filter by user_id
    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.is("user_id", null);
    }

    const { data: mindMaps, error } = await query;

    if (error) {
      console.error("Error fetching mind maps:", error);
      return NextResponse.json(
        { error: "Failed to fetch mind maps" },
        { status: 500 }
      );
    }

    return NextResponse.json({ mindMaps: mindMaps || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/mindmaps - Create a new mind map
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    // Require authentication to create mind maps
    if (!userId) {
      return NextResponse.json(
        { 
          error: "Authentication required",
          message: "Please sign in to save mind maps."
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, template } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Create the mind map
    const { data: mindMap, error: insertError } = await supabase
      .from("mind_maps")
      .insert({
        user_id: userId,
        title,
        description: description || null,
      })
      .select()
      .single();

    if (insertError || !mindMap) {
      console.error("Error creating mind map:", insertError);
      return NextResponse.json(
        { error: "Failed to create mind map" },
        { status: 500 }
      );
    }

    // If template is specified, create template nodes
    if (template) {
      const templateNodes = getTemplateNodes(template, mindMap.id);
      if (templateNodes.nodes.length > 0) {
        const { error: nodesError } = await supabase
          .from("mind_map_nodes")
          .insert(templateNodes.nodes);

        if (nodesError) {
          console.error("Error creating template nodes:", nodesError);
        }

        if (templateNodes.edges.length > 0) {
          const { error: edgesError } = await supabase
            .from("mind_map_edges")
            .insert(templateNodes.edges);

          if (edgesError) {
            console.error("Error creating template edges:", edgesError);
          }
        }
      }
    }

    return NextResponse.json({ mindMap }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/mindmaps?id=uuid - Delete a mind map
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Mind map ID is required" },
        { status: 400 }
      );
    }

    // Build delete query
    let deleteQuery = supabase.from("mind_maps").delete().eq("id", id);

    // Filter by user_id
    if (userId) {
      deleteQuery = deleteQuery.eq("user_id", userId);
    } else {
      deleteQuery = deleteQuery.is("user_id", null);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error("Error deleting mind map:", error);
      return NextResponse.json(
        { error: "Failed to delete mind map" },
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

// Helper function to generate template nodes
function getTemplateNodes(template: string, mindMapId: string) {
  const templates: Record<
    string,
    {
      nodes: Array<{
        mind_map_id: string;
        label: string;
        content: string | null;
        node_type: "root" | "topic" | "subtopic" | "note";
        position_x: number;
        position_y: number;
        style: Record<string, any>;
      }>;
      edges: Array<{
        mind_map_id: string;
        source_node_id: string;
        target_node_id: string;
        label: string | null;
        style: Record<string, any>;
      }>;
    }
  > = {
    brainstorm: {
      nodes: [
        {
          mind_map_id: mindMapId,
          label: "Central Topic",
          content: "Start here - what's your main idea?",
          node_type: "root",
          position_x: 0,
          position_y: 0,
          style: { color: "#8b5cf6", size: "lg" },
        },
        {
          mind_map_id: mindMapId,
          label: "Idea 1",
          content: null,
          node_type: "topic",
          position_x: -200,
          position_y: -150,
          style: { color: "#3b82f6" },
        },
        {
          mind_map_id: mindMapId,
          label: "Idea 2",
          content: null,
          node_type: "topic",
          position_x: 200,
          position_y: -150,
          style: { color: "#10b981" },
        },
        {
          mind_map_id: mindMapId,
          label: "Idea 3",
          content: null,
          node_type: "topic",
          position_x: -200,
          position_y: 150,
          style: { color: "#f59e0b" },
        },
        {
          mind_map_id: mindMapId,
          label: "Idea 4",
          content: null,
          node_type: "topic",
          position_x: 200,
          position_y: 150,
          style: { color: "#ef4444" },
        },
      ],
      edges: [
        {
          mind_map_id: mindMapId,
          source_node_id: "0",
          target_node_id: "1",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "0",
          target_node_id: "2",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "0",
          target_node_id: "3",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "0",
          target_node_id: "4",
          label: null,
          style: {},
        },
      ],
    },
    hierarchy: {
      nodes: [
        {
          mind_map_id: mindMapId,
          label: "Main Concept",
          content: "Top-level concept",
          node_type: "root",
          position_x: 0,
          position_y: -200,
          style: { color: "#8b5cf6", size: "lg" },
        },
        {
          mind_map_id: mindMapId,
          label: "Category A",
          content: null,
          node_type: "topic",
          position_x: -200,
          position_y: 0,
          style: { color: "#3b82f6" },
        },
        {
          mind_map_id: mindMapId,
          label: "Category B",
          content: null,
          node_type: "topic",
          position_x: 200,
          position_y: 0,
          style: { color: "#10b981" },
        },
        {
          mind_map_id: mindMapId,
          label: "Detail A1",
          content: null,
          node_type: "subtopic",
          position_x: -300,
          position_y: 150,
          style: { color: "#60a5fa" },
        },
        {
          mind_map_id: mindMapId,
          label: "Detail A2",
          content: null,
          node_type: "subtopic",
          position_x: -100,
          position_y: 150,
          style: { color: "#60a5fa" },
        },
        {
          mind_map_id: mindMapId,
          label: "Detail B1",
          content: null,
          node_type: "subtopic",
          position_x: 100,
          position_y: 150,
          style: { color: "#34d399" },
        },
        {
          mind_map_id: mindMapId,
          label: "Detail B2",
          content: null,
          node_type: "subtopic",
          position_x: 300,
          position_y: 150,
          style: { color: "#34d399" },
        },
      ],
      edges: [
        {
          mind_map_id: mindMapId,
          source_node_id: "0",
          target_node_id: "1",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "0",
          target_node_id: "2",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "1",
          target_node_id: "3",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "1",
          target_node_id: "4",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "2",
          target_node_id: "5",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "2",
          target_node_id: "6",
          label: null,
          style: {},
        },
      ],
    },
    studyplan: {
      nodes: [
        {
          mind_map_id: mindMapId,
          label: "Study Goal",
          content: "What do you want to learn?",
          node_type: "root",
          position_x: 0,
          position_y: 0,
          style: { color: "#8b5cf6", size: "lg" },
        },
        {
          mind_map_id: mindMapId,
          label: "Week 1",
          content: "Foundation concepts",
          node_type: "topic",
          position_x: -250,
          position_y: -100,
          style: { color: "#3b82f6" },
        },
        {
          mind_map_id: mindMapId,
          label: "Week 2",
          content: "Intermediate topics",
          node_type: "topic",
          position_x: 0,
          position_y: -200,
          style: { color: "#10b981" },
        },
        {
          mind_map_id: mindMapId,
          label: "Week 3",
          content: "Advanced concepts",
          node_type: "topic",
          position_x: 250,
          position_y: -100,
          style: { color: "#f59e0b" },
        },
        {
          mind_map_id: mindMapId,
          label: "Practice & Review",
          content: "Test your knowledge",
          node_type: "topic",
          position_x: 0,
          position_y: 150,
          style: { color: "#ef4444" },
        },
      ],
      edges: [
        {
          mind_map_id: mindMapId,
          source_node_id: "0",
          target_node_id: "1",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "1",
          target_node_id: "2",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "2",
          target_node_id: "3",
          label: null,
          style: {},
        },
        {
          mind_map_id: mindMapId,
          source_node_id: "0",
          target_node_id: "4",
          label: null,
          style: {},
        },
      ],
    },
  };

  return templates[template] || { nodes: [], edges: [] };
}
