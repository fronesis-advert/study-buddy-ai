# Quick Start: Mind Maps Feature

## 🚀 Start the App

```bash
npm run dev
```

Then visit: http://localhost:3000

## 📍 Access Mind Maps

1. Click the **"Mind Maps"** tab in the main navigation
2. Desktop/tablet only (automatically disabled on mobile)

## 🎯 Quick Test Workflow

### Test 1: Create with Template
1. Click **"New Mind Map"**
2. Enter title: "Test Mind Map"
3. Select template: **"Brainstorm"**
4. Click **"Create"**
5. You'll see a pre-built mind map with central node and 4 branches
6. Double-click any node to edit it
7. Try dragging nodes around
8. Auto-saves every 2 seconds

### Test 2: AI Generation (requires documents)
1. First, go to **Documents** tab
2. Upload a PDF or paste some text
3. Return to **Mind Maps** tab
4. Click **"AI Generate"**
5. Select your document
6. Click **"Generate"**
7. Wait ~5-10 seconds for AI to create the mind map

### Test 3: Export to Documents
1. Open any mind map
2. Click **"Export to Docs"** button
3. Check **Documents** tab - you'll see a new entry: "Mind Map: [title]"
4. Now you can use it in Chat/Quiz modes!

## 🎨 Canvas Controls

- **Add Node**: Toolbar button → Fill form → Create
- **Edit Node**: Double-click any node
- **Connect**: Drag from node edge to another node
- **Move**: Click and drag nodes
- **Delete**: Select items → Click Delete button
- **Zoom**: +/- buttons or mouse wheel
- **Pan**: Click and drag background
- **Fit View**: 📐 button to center all nodes

## 🤖 AI Features

### AI Suggest Connections
1. Open mind map with 3+ nodes
2. Click **"AI Suggest"** button
3. Review suggestions in popup
4. Manually add connections you like

## ⚙️ Node Types

- **Root** (purple) - Main topic
- **Topic** (blue) - Key concepts  
- **Subtopic** (green) - Supporting details
- **Note** (yellow) - Quick annotations

## 📝 Markdown in Nodes

Content field supports:
- **Bold**, *italic*, `code`
- Lists, links, headings
- Any markdown formatting

## 💾 Auto-Save

- Saves 2 seconds after last change
- Watch for "Saved Xm ago" in toolbar
- No manual save needed!

## 🐛 Troubleshooting

**Mind Maps tab disabled?**
- Check screen width (needs 768px+)
- Use desktop or tablet device

**AI Generate not working?**
- Ensure you have documents uploaded
- Check OpenAI API key in `.env.local`

**Auto-save not working?**
- Check browser console for errors
- Verify Supabase connection

**TypeScript warnings?**
- "Props must be serializable" warnings are safe to ignore
- They're false positives for client components

## 📊 Database Tables Created

Via Supabase MCP:
- `mind_maps` - Mind map metadata
- `mind_map_nodes` - Individual nodes
- `mind_map_edges` - Connections

Check in Supabase dashboard → Table Editor

---

**Happy Mind Mapping! 🧠✨**
