import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { openaiClient } from "@/lib/openai";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import type { Json } from "@/types/database";

const GenerateRequestSchema = z.object({
  documentId: z.string().uuid(),
  mode: z.enum(["suggest", "create"]).default("suggest"), // suggest = AI-assisted, create = auto-generate (deprecated)
  title: z.string().optional(),
  template: z.enum(["brainstorm", "hierarchy", "studyplan", "memorization", "process", "comparison"]).optional(),
});

type ConceptSuggestion = {
  label: string;
  description: string;
  importance: number; // 1-5
  suggestedType: "root" | "topic" | "subtopic" | "note";
  suggestedIcon?: string;
};

// POST /api/mindmaps/generate - AI-assisted concept extraction from document
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

    const { documentId, title, template, mode } = validation.data;

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

    // AI suggests concepts for manual node creation (learning-focused approach)
    const systemPrompt = mode === "suggest" 
      ? `You are a learning assistant that helps students extract key concepts from text.

Analyze the content and suggest 8-15 important concepts that should become mind map nodes.
For EACH concept, provide:
- A concise label (1-3 words MAX - force brevity)
- Brief description of why it's important
- Importance rating (1=minor detail, 3=key concept, 5=critical backbone idea)
- Suggested node type (root for main theme, topic for major concepts, subtopic for details)
- Optional icon name from common symbols (book, lightbulb, alert-circle, trending-up, users, etc.)

Return ONLY valid JSON:
{
  "title": "Suggested Mind Map Title",
  "concepts": [
    {
      "label": "Brief Label",
      "description": "Why this concept matters",
      "importance": 3,
      "suggestedType": "topic",
      "suggestedIcon": "book"
    }
  ]
}

Remember: Labels must be 1-3 words. Longer labels defeat the purpose of mind mapping.`
      : `You are an expert at creating mind maps from text content. Extract key concepts, topics, and their relationships.

Create a hierarchical mind map with:
- 1 root node (main topic) - label must be 1-3 words
- 3-6 topic nodes (key concepts) - labels must be 1-3 words
- 2-4 subtopic nodes per topic - labels must be 1-3 words
- Clear connections between related concepts

IMPORTANT: All node labels MUST be 1-3 words maximum. Use content field for longer descriptions.

Return ONLY valid JSON in this exact structure:
{
  "title": "Mind Map Title",
  "nodes": [
    {
      "id": "unique-id",
      "label": "Brief Label",
      "content": "Longer explanation goes here",
      "type": "root|topic|subtopic|note",
      "importance": 3,
      "icon": "optional-icon-name",
      "position": { "x": 0, "y": 0 },
      "color": "#hex-color"
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "label": "Optional description",
      "relationshipType": "causal|hierarchical|temporal|contrast|support|neutral"
    }
  ]
}`;

    const userPrompt = mode === "suggest"
      ? `Extract key concepts from this text for a student to manually create mind map nodes:\n\n${textToProcess}`
      : `Create a complete mind map from this text:\n\n${textToProcess}`;

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from AI");
    }

    const mindMapData = JSON.parse(result);

    // If mode is "suggest", return concepts without creating nodes
    if (mode === "suggest") {
      return NextResponse.json({
        success: true,
        mode: "suggest",
        title: mindMapData.title || `Concepts from ${document.title}`,
        concepts: mindMapData.concepts || [],
        message: "AI has analyzed the document and suggested concepts. Manually create nodes to engage in active learning.",
      });
    }

    // Mode "create" continues with auto-generation (for backwards compatibility)

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
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    const isValidUuid = (value: unknown): value is string =>
      typeof value === "string" && uuidRegex.test(value.trim());

    const nodeIdMap = new Map<string, string>();

    const nodesToInsert = (mindMapData.nodes ?? []).map((node: any, index: number) => {
      const rawId =
        typeof node.id === "string" && node.id.trim().length > 0
          ? node.id.trim()
          : `node-${index}`;
      const normalizedId = isValidUuid(rawId) ? rawId : uuid();
      nodeIdMap.set(rawId, normalizedId);
      nodeIdMap.set(rawId.toLowerCase(), normalizedId);

      const position = node.position ?? {};

      return {
        id: normalizedId,
        mind_map_id: mindMap.id,
        label: node.label ?? `Node ${index + 1}`,
        content: node.content || null,
        node_type: node.type ?? "topic",
        importance: typeof node.importance === "number" ? Math.min(5, Math.max(1, node.importance)) : 3,
        icon: node.icon || null,
        position_x:
          typeof position.x === "number" && Number.isFinite(position.x)
            ? position.x
            : index * 120,
        position_y:
          typeof position.y === "number" && Number.isFinite(position.y)
            ? position.y
            : 0,
        style: { color: node.color || "#3b82f6" },
      };
    });

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
      const edgesToInsert = mindMapData.edges
        .map((edge: any, index: number) => {
          const rawSource = typeof edge.source === "string" ? edge.source.trim() : "";
          const rawTarget = typeof edge.target === "string" ? edge.target.trim() : "";
          const source_node_id =
            nodeIdMap.get(rawSource) ?? nodeIdMap.get(rawSource.toLowerCase());
          const target_node_id =
            nodeIdMap.get(rawTarget) ?? nodeIdMap.get(rawTarget.toLowerCase());

          if (!source_node_id || !target_node_id) {
            console.warn("Skipping edge with unknown nodes", edge);
            return null;
          }

          const rawEdgeId =
            typeof edge.id === "string" && edge.id.trim().length > 0
              ? edge.id.trim()
              : `edge-${index}`;

          const validRelationshipTypes = ["causal", "hierarchical", "temporal", "contrast", "support", "neutral"];
          const relationship_type = validRelationshipTypes.includes(edge.relationshipType) 
            ? edge.relationshipType 
            : "neutral";

          return {
            id: isValidUuid(rawEdgeId) ? rawEdgeId : uuid(),
            mind_map_id: mindMap.id,
            source_node_id,
            target_node_id,
            label: edge.label || null,
            relationship_type,
            style: {},
          };
        })
        .filter(Boolean) as Array<{
          id: string;
          mind_map_id: string;
          source_node_id: string;
          target_node_id: string;
          label: string | null;
          relationship_type: string;
          style: Json;
        }>;

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

