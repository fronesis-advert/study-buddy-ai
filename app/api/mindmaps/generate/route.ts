import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { openaiClient } from "@/lib/openai";
import { z } from "zod";

const GenerateRequestSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().optional(),
  template: z.enum(["brainstorm", "hierarchy", "studyplan"]).optional(),
});

// POST /api/mindmaps/generate - Generate mind map from document using AI
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    const body = await request.json();
    const validation = GenerateRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error },
        { status: 400 }
      );
    }

    const { documentId, title, template } = validation.data;

    // Build query with user filter
    let query = supabase.from("documents").select("*").eq("id", documentId);

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.is("user_id", null);
    }

    const { data: document, error: docError } = await query.single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Limit text length for AI processing
    const textToProcess = document.raw_text?.slice(0, 8000) || "";

    if (!textToProcess) {
      return NextResponse.json(
        { error: "Document has no text content" },
        { status: 400 }
      );
    }

    // Generate mind map structure using OpenAI
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating mind maps from text content. Extract key concepts, topics, and their relationships.
          
Create a hierarchical mind map with:
- 1 root node (main topic)
- 3-6 topic nodes (key concepts)
- 2-4 subtopic nodes per topic (supporting details)
- Clear connections between related concepts

Return ONLY valid JSON in this exact structure:
{
  "title": "Mind Map Title",
  "nodes": [
    {
      "id": "unique-id",
      "label": "Node Label",
      "content": "Optional detailed content in markdown",
      "type": "root|topic|subtopic|note",
      "position": { "x": 0, "y": 0 },
      "color": "#hex-color"
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "label": "Optional connection description"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Create a mind map from this text:\n\n${textToProcess}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from AI");
    }

    const mindMapData = JSON.parse(result);

    // Create mind map in database
    const { data: mindMap, error: createError } = await supabase
      .from("mind_maps")
      .insert({
        user_id: userId,
        title: title || mindMapData.title || `Mind Map: ${document.title}`,
        description: `Generated from document: ${document.title}`,
      })
      .select()
      .single();

    if (createError || !mindMap) {
      console.error("Error creating mind map:", createError);
      return NextResponse.json(
        { error: "Failed to create mind map" },
        { status: 500 }
      );
    }

    // Insert nodes
    const nodesToInsert = mindMapData.nodes.map((node: any) => ({
      id: node.id,
      mind_map_id: mindMap.id,
      label: node.label,
      content: node.content || null,
      node_type: node.type || "topic",
      position_x: node.position?.x || 0,
      position_y: node.position?.y || 0,
      style: { color: node.color || "#3b82f6" },
    }));

    const { error: nodesError } = await supabase
      .from("mind_map_nodes")
      .insert(nodesToInsert);

    if (nodesError) {
      console.error("Error inserting nodes:", nodesError);
      // Clean up mind map
      await supabase.from("mind_maps").delete().eq("id", mindMap.id);
      return NextResponse.json(
        { error: "Failed to create mind map nodes" },
        { status: 500 }
      );
    }

    // Insert edges
    if (mindMapData.edges && mindMapData.edges.length > 0) {
      const edgesToInsert = mindMapData.edges.map((edge: any) => ({
        id: edge.id,
        mind_map_id: mindMap.id,
        source_node_id: edge.source,
        target_node_id: edge.target,
        label: edge.label || null,
        style: {},
      }));

      const { error: edgesError } = await supabase
        .from("mind_map_edges")
        .insert(edgesToInsert);

      if (edgesError) {
        console.error("Error inserting edges:", edgesError);
        // Continue anyway, edges are less critical
      }
    }

    return NextResponse.json({
      success: true,
      mindMapId: mindMap.id,
      message: "Mind map generated successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
