import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { chunkText } from "@/lib/rag/chunk";
import { embedMany } from "@/lib/rag/embed";

// POST /api/mindmaps/[id]/export - Export mind map to documents
export async function POST(
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

    // Check if already exported
    if (mindMap.is_exported && mindMap.exported_document_id) {
      return NextResponse.json(
        {
          message: "Mind map already exported",
          documentId: mindMap.exported_document_id,
        },
        { status: 200 }
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
      .eq("mind_map_id", id);

    if (edgesError) {
      console.error("Error fetching edges:", edgesError);
      return NextResponse.json(
        { error: "Failed to fetch edges" },
        { status: 500 }
      );
    }

    // Convert mind map to markdown text
    const markdownText = convertMindMapToMarkdown(
      mindMap,
      nodes || [],
      edges || []
    );

    // Create document
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        title: `Mind Map: ${mindMap.title}`,
        source_type: "note",
        raw_text: markdownText,
      })
      .select()
      .single();

    if (docError || !document) {
      console.error("Error creating document:", docError);
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }

    // Chunk and embed the text
    const chunks = chunkText(markdownText);
    const embeddings = await embedMany(chunks);

    // Insert chunks with embeddings
    const chunksToInsert = chunks.map((content, idx) => ({
      document_id: document.id,
      content,
      embedding: embeddings[idx],
      token_count: Math.ceil(content.length / 4), // Rough estimate
    }));

    const { error: chunksError } = await supabase
      .from("chunks")
      .insert(chunksToInsert);

    if (chunksError) {
      console.error("Error inserting chunks:", chunksError);
      // Don't fail the whole operation, document is still created
    }

    // Update mind map to mark as exported
    await supabase
      .from("mind_maps")
      .update({
        is_exported: true,
        exported_document_id: document.id,
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      documentId: document.id,
      message: "Mind map exported to documents successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to convert mind map to markdown
function convertMindMapToMarkdown(
  mindMap: any,
  nodes: any[],
  edges: any[]
): string {
  let markdown = `# ${mindMap.title}\n\n`;

  if (mindMap.description) {
    markdown += `${mindMap.description}\n\n`;
  }

  markdown += `---\n\n`;

  // Find root nodes
  const rootNodes = nodes.filter((n) => n.node_type === "root");
  const topicNodes = nodes.filter((n) => n.node_type === "topic");
  const subtopicNodes = nodes.filter((n) => n.node_type === "subtopic");
  const noteNodes = nodes.filter((n) => n.node_type === "note");

  // Build adjacency list for relationships
  const childrenMap = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!childrenMap.has(edge.source_node_id)) {
      childrenMap.set(edge.source_node_id, []);
    }
    childrenMap.get(edge.source_node_id)!.push(edge.target_node_id);
  });

  // Process root nodes
  if (rootNodes.length > 0) {
    rootNodes.forEach((root) => {
      markdown += `## ${root.label}\n\n`;
      if (root.content) {
        markdown += `${root.content}\n\n`;
      }

      // Find children of root
      const rootChildren = childrenMap.get(root.id) || [];
      rootChildren.forEach((childId) => {
        const child = nodes.find((n) => n.id === childId);
        if (child) {
          markdown += `### ${child.label}\n\n`;
          if (child.content) {
            markdown += `${child.content}\n\n`;
          }

          // Find grandchildren
          const grandchildren = childrenMap.get(child.id) || [];
          grandchildren.forEach((grandchildId) => {
            const grandchild = nodes.find((n) => n.id === grandchildId);
            if (grandchild) {
              markdown += `- **${grandchild.label}**: ${
                grandchild.content || ""
              }\n`;
            }
          });

          if (grandchildren.length > 0) {
            markdown += `\n`;
          }
        }
      });
    });
  } else {
    // If no root nodes, just list all topics
    topicNodes.forEach((topic) => {
      markdown += `## ${topic.label}\n\n`;
      if (topic.content) {
        markdown += `${topic.content}\n\n`;
      }

      // Find children
      const children = childrenMap.get(topic.id) || [];
      children.forEach((childId) => {
        const child = nodes.find((n) => n.id === childId);
        if (child) {
          markdown += `- **${child.label}**: ${child.content || ""}\n`;
        }
      });

      if (children.length > 0) {
        markdown += `\n`;
      }
    });
  }

  // Add any unconnected notes
  const connectedNodeIds = new Set(edges.flatMap((e) => [e.source_node_id, e.target_node_id]));
  const unconnectedNodes = nodes.filter((n) => !connectedNodeIds.has(n.id));

  if (unconnectedNodes.length > 0) {
    markdown += `\n## Additional Notes\n\n`;
    unconnectedNodes.forEach((node) => {
      markdown += `- **${node.label}**: ${node.content || ""}\n`;
    });
  }

  return markdown;
}
