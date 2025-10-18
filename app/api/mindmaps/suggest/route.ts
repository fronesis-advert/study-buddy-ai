import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { openaiClient } from "@/lib/openai";
import { z } from "zod";

const SuggestRequestSchema = z.object({
  mindMapId: z.string().uuid(),
  nodeId: z.string().uuid().optional(),
});

// POST /api/mindmaps/suggest - AI-powered connection suggestions
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    const body = await request.json();
    const validation = SuggestRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error },
        { status: 400 }
      );
    }

    const { mindMapId, nodeId } = validation.data;

    // Build query with user filter
    let query = supabase.from("mind_maps").select("*").eq("id", mindMapId);

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

    // Fetch all nodes
    const { data: nodes, error: nodesError } = await supabase
      .from("mind_map_nodes")
      .select("*")
      .eq("mind_map_id", mindMapId);

    if (nodesError || !nodes) {
      return NextResponse.json(
        { error: "Failed to fetch nodes" },
        { status: 500 }
      );
    }

    // Fetch existing edges
    const { data: edges, error: edgesError } = await supabase
      .from("mind_map_edges")
      .select("*")
      .eq("mind_map_id", mindMapId);

    if (edgesError) {
      return NextResponse.json(
        { error: "Failed to fetch edges" },
        { status: 500 }
      );
    }

    // Build context for AI
    const nodesContext = nodes.map(
      (n) => `Node "${n.label}" (${n.node_type}): ${n.content || "No description"}`
    ).join("\n");

    const existingConnections = (edges || [])
      .map((e) => {
        const source = nodes.find((n) => n.id === e.source_node_id);
        const target = nodes.find((n) => n.id === e.target_node_id);
        return `${source?.label} -> ${target?.label}`;
      })
      .join("\n");

    // If specific node provided, focus suggestions on that node
    const focusNode = nodeId ? nodes.find((n) => n.id === nodeId) : null;
    const prompt = focusNode
      ? `Suggest new connections for the node "${focusNode.label}" (${focusNode.content || "no description"}) to other existing nodes.`
      : `Suggest new meaningful connections between existing nodes in this mind map.`;

    // Ask AI for suggestions
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at identifying conceptual relationships and connections in mind maps.
          
Analyze the nodes and suggest 2-5 meaningful connections that would enhance understanding.
Consider semantic relationships, hierarchies, dependencies, and conceptual links.

Return ONLY valid JSON in this format:
{
  "suggestions": [
    {
      "sourceLabel": "Source Node Label",
      "targetLabel": "Target Node Label",
      "reason": "Brief explanation of why this connection makes sense",
      "connectionType": "relates to|supports|depends on|contrasts with"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Mind Map: ${mindMap.title}

Existing Nodes:
${nodesContext}

Current Connections:
${existingConnections || "None yet"}

${prompt}

Suggest new connections that don't already exist.`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from AI");
    }

    const suggestions = JSON.parse(result);

    // Match suggestions to actual node IDs
    const enhancedSuggestions = suggestions.suggestions
      .map((s: any) => {
        const source = nodes.find(
          (n) =>
            n.label.toLowerCase() === s.sourceLabel.toLowerCase() ||
            n.label.toLowerCase().includes(s.sourceLabel.toLowerCase())
        );
        const target = nodes.find(
          (n) =>
            n.label.toLowerCase() === s.targetLabel.toLowerCase() ||
            n.label.toLowerCase().includes(s.targetLabel.toLowerCase())
        );

        if (!source || !target) return null;

        // Check if edge already exists
        const edgeExists = edges?.some(
          (e) =>
            (e.source_node_id === source.id && e.target_node_id === target.id) ||
            (e.source_node_id === target.id && e.target_node_id === source.id)
        );

        if (edgeExists) return null;

        return {
          sourceId: source.id,
          sourceLabel: source.label,
          targetId: target.id,
          targetLabel: target.label,
          reason: s.reason,
          connectionType: s.connectionType,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      suggestions: enhancedSuggestions,
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
