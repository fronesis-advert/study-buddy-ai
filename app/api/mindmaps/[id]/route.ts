import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";

// GET /api/mindmaps/[id] - Get a specific mind map with nodes and edges
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();
    const { id } = params;

    // Build query with user filter
    let query = supabase.from("mind_maps").select("*").eq("id", id);

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.is("user_id", null);
    }

    const { data: mindMap, error: mapError } = await query.single();

    if (mapError || !mindMap) {
      return NextResponse.json(
        { error: "Mind map not found" },
        { status: 404 }
      );
    }

    // Fetch nodes
    const { data: nodes, error: nodesError } = await supabase
      .from("mind_map_nodes")
      .select("*")
      .eq("mind_map_id", id)
      .order("created_at", { ascending: true });

    if (nodesError) {
      console.error("Error fetching nodes:", nodesError);
      return NextResponse.json(
        { error: "Failed to fetch nodes" },
        { status: 500 }
      );
    }

    // Fetch edges
    const { data: edges, error: edgesError } = await supabase
      .from("mind_map_edges")
      .select("*")
      .eq("mind_map_id", id)
      .order("created_at", { ascending: true });

    if (edgesError) {
      console.error("Error fetching edges:", edgesError);
      return NextResponse.json(
        { error: "Failed to fetch edges" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mindMap,
      nodes: nodes || [],
      edges: edges || [],
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/mindmaps/[id] - Update mind map (including nodes and edges)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();
    const { id } = params;
    const body = await request.json();
    const { title, description, thumbnail_data, nodes, edges } = body;

    // Build verification query
    let verifyQuery = supabase.from("mind_maps").select("id").eq("id", id);

    if (userId) {
      verifyQuery = verifyQuery.eq("user_id", userId);
    } else {
      verifyQuery = verifyQuery.is("user_id", null);
    }

    const { data: mindMap, error: verifyError } = await verifyQuery.single();

    if (verifyError || !mindMap) {
      return NextResponse.json(
        { error: "Mind map not found" },
        { status: 404 }
      );
    }

    // Update mind map metadata
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (thumbnail_data !== undefined) updateData.thumbnail_data = thumbnail_data;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("mind_maps")
        .update(updateData)
        .eq("id", id);

      if (updateError) {
        console.error("Error updating mind map:", updateError);
        return NextResponse.json(
          { error: "Failed to update mind map" },
          { status: 500 }
        );
      }
    }

    // Handle nodes updates if provided
    if (nodes) {
      // Get existing nodes
      const { data: existingNodes } = await supabase
        .from("mind_map_nodes")
        .select("id")
        .eq("mind_map_id", id);

      const existingNodeIds = new Set(
        existingNodes?.map((n) => n.id) || []
      );
      const newNodeIds = new Set(nodes.map((n: any) => n.id).filter(Boolean));

      // Delete removed nodes
      const nodesToDelete = Array.from(existingNodeIds).filter(
        (nodeId) => !newNodeIds.has(nodeId)
      );
      if (nodesToDelete.length > 0) {
        await supabase
          .from("mind_map_nodes")
          .delete()
          .in("id", nodesToDelete);
      }

      // Upsert nodes (insert new, update existing)
      for (const node of nodes) {
        if (node.id && existingNodeIds.has(node.id)) {
          // Update existing node
          await supabase
            .from("mind_map_nodes")
            .update({
              label: node.label,
              content: node.content || null,
              node_type: node.node_type || "topic",
              position_x: node.position_x,
              position_y: node.position_y,
              style: node.style || {},
            })
            .eq("id", node.id);
        } else {
          // Insert new node
          await supabase.from("mind_map_nodes").insert({
            id: node.id || undefined,
            mind_map_id: id,
            label: node.label,
            content: node.content || null,
            node_type: node.node_type || "topic",
            position_x: node.position_x,
            position_y: node.position_y,
            style: node.style || {},
          });
        }
      }
    }

    // Handle edges updates if provided
    if (edges) {
      // Get existing edges
      const { data: existingEdges } = await supabase
        .from("mind_map_edges")
        .select("id")
        .eq("mind_map_id", id);

      const existingEdgeIds = new Set(
        existingEdges?.map((e) => e.id) || []
      );
      const newEdgeIds = new Set(edges.map((e: any) => e.id).filter(Boolean));

      // Delete removed edges
      const edgesToDelete = Array.from(existingEdgeIds).filter(
        (edgeId) => !newEdgeIds.has(edgeId)
      );
      if (edgesToDelete.length > 0) {
        await supabase
          .from("mind_map_edges")
          .delete()
          .in("id", edgesToDelete);
      }

      // Upsert edges
      for (const edge of edges) {
        if (edge.id && existingEdgeIds.has(edge.id)) {
          // Update existing edge
          await supabase
            .from("mind_map_edges")
            .update({
              source_node_id: edge.source_node_id,
              target_node_id: edge.target_node_id,
              label: edge.label || null,
              style: edge.style || {},
            })
            .eq("id", edge.id);
        } else {
          // Insert new edge
          await supabase.from("mind_map_edges").insert({
            id: edge.id || undefined,
            mind_map_id: id,
            source_node_id: edge.source_node_id,
            target_node_id: edge.target_node_id,
            label: edge.label || null,
            style: edge.style || {},
          });
        }
      }
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
