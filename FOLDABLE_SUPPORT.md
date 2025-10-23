# 📱 Foldable Device Support - Mind Maps

## ✅ What's Been Added

Your Study Buddy mind maps now **fully support foldable devices** like Samsung Galaxy Fold, Surface Duo, and other dual-screen devices!

---

## 🎯 Supported Devices

### **Samsung Galaxy Fold Series**
- Galaxy Z Fold 3, 4, 5, 6
- Automatic detection of fold/unfold states
- Optimized layouts for both folded and unfolded modes

### **Microsoft Surface Duo**
- Surface Duo 1 & 2
- Dual-screen optimized layouts
- Intelligent content spanning

### **Other Foldables**
- Huawei Mate X series
- Motorola Razr (when unfolded)
- Any device with Window Segments API

---

## 🚀 Features

### **1. Automatic Detection**
- Detects when device is folded/unfolded
- Responds to screen posture changes in real-time
- No configuration needed - works automatically!

### **2. Optimized Layouts**

#### **Book Mode (Vertical Fold)** 📖
When device is unfolded with vertical hinge (e.g., Surface Duo):
- Mind map canvas on **left screen**
- Tools and sidebar on **right screen**
- Maximizes workspace on both screens

#### **Laptop Mode (Horizontal Fold)** 💻
When device is partially folded like a laptop:
- Mind map canvas on **top screen**
- Controls and tools on **bottom screen**
- Perfect for desk work

#### **Tablet Mode (Fully Unfolded)** 📱
- Standard layout with full canvas
- Sidebar visible
- Maximum screen real estate

### **3. Fold-Aware Spacing**
- Content avoids the physical hinge area
- No nodes or important UI hidden by fold
- Smart padding adjustments

### **4. Enhanced Touch Targets**
- Larger touch areas for foldable screens
- Optimized node sizes (min 180px width)
- Better gesture support

---

## 🎨 How It Works

### **Window Segments API**
Uses the modern **Window Segments API** to detect:
- Number of screen segments
- Fold orientation (horizontal/vertical)
- Fold size and position
- Screen posture

### **Fallback Support**
If Window Segments API isn't available:
- Uses CSS media queries
- Device-specific viewport detection
- Responsive breakpoints

---

## 🧪 Testing

### **On Samsung Galaxy Fold:**
1. Open Study Buddy mind map
2. **Folded**: Standard mobile layout
3. **Unfold**: Layout automatically expands
4. **Partial fold**: Switches to laptop mode
5. **Fully open**: Maximum canvas space

### **On Surface Duo:**
1. Open mind map
2. **Single screen**: Standard layout
3. **Span across screens**: Dual-screen layout activates
4. Canvas fills left screen, tools on right

### **On Desktop (Chrome DevTools):**
1. Open DevTools → Device Mode
2. Select "Surface Duo" or "Galaxy Fold"
3. Test fold/unfold animations
4. Verify layouts change correctly

---

## 📊 Layout Modes

| Posture | Fold Type | Canvas Position | Tools Position | Use Case |
|---------|-----------|----------------|----------------|----------|
| **No Fold** | None | Center | Right sidebar | Standard phone/tablet |
| **Book** | Vertical | Left screen | Right screen | Surface Duo unfolded |
| **Laptop** | Horizontal | Top screen | Bottom screen | Galaxy Fold tent mode |
| **Tablet** | Flat | Full screen | Sidebar | Fully unfolded |

---

## 🛠️ Technical Details

### **Files Modified:**

1. **`hooks/use-foldable.ts`** ✨ NEW
   - Custom React hook for foldable detection
   - Window Segments API integration
   - Layout recommendation logic

2. **`components/mindmap/mind-map-canvas.tsx`**
   - Integrated `useFoldableLayout` hook
   - Dynamic layout classes
   - Fold-aware rendering

3. **`app/globals.css`**
   - Foldable-specific CSS
   - Media queries for dual screens
   - Touch optimization styles

### **Key CSS Media Queries:**

```css
/* Vertical fold (book mode) */
@media (horizontal-viewport-segments: 2) {
  /* Dual screen side-by-side */
}

/* Horizontal fold (laptop mode) */
@media (vertical-viewport-segments: 2) {
  /* Dual screen top-bottom */
}

/* Device-specific breakpoints */
@media screen and (min-width: 653px) and (max-width: 717px) {
  /* Galaxy Fold specific */
}
```

### **React Hook API:**

```typescript
const foldableLayout = useFoldableLayout();

// Returns:
{
  isFoldable: boolean,
  posture: "no-fold" | "laptop" | "book",
  segments: number,
  isSpanned: boolean,
  foldOrientation: "horizontal" | "vertical" | "none",
  layout: "single" | "dual-vertical" | "dual-horizontal",
  suggestion: string
}
```

---

## 🎯 Benefits

### **For Samsung Galaxy Fold Users:**
- ✅ Mind map canvas fills entire unfolded screen
- ✅ No wasted space on inner display
- ✅ Smooth fold/unfold transitions
- ✅ Optimized for Flex Mode (partial fold)

### **For Surface Duo Users:**
- ✅ True dual-screen experience
- ✅ Canvas and tools separated perfectly
- ✅ Natural workflow across screens
- ✅ No content in the hinge gap

### **For All Foldable Users:**
- ✅ Automatic adaptation
- ✅ Works in any orientation
- ✅ Better touch targets
- ✅ Professional, polished experience

---

## 🔮 Future Enhancements

Possible additions:
- **Drag-and-drop across screens** - Move nodes between displays
- **Screen mirroring** - Show same content on both screens
- **Picture-in-Picture** - Mini toolbar on second screen
- **Dual canvas** - Work on two mind maps simultaneously
- **Smart suggestions** - AI suggestions on one screen, canvas on other

---

## 🐛 Troubleshooting

### **Layout not adapting?**
- Ensure device supports Window Segments API
- Check browser version (Chromium 85+)
- Try refreshing the page after folding

### **Content in fold area?**
- Zoom out slightly
- Use "Fit View" button to recenter
- Adjust node positions manually

### **Touch targets too small?**
- Nodes automatically increase size on foldables
- Try zooming in slightly
- Use pinch gestures for precision

---

## 📱 Browser Support

| Browser | Foldable Support | Notes |
|---------|-----------------|-------|
| **Chrome** | ✅ Full | Window Segments API |
| **Edge** | ✅ Full | Native on Surface Duo |
| **Samsung Internet** | ✅ Full | Optimized for Galaxy Fold |
| **Firefox** | ⚠️ Partial | Fallback CSS only |
| **Safari** | ❌ None | No foldable devices |

---

## 🎉 Try It Now!

1. **Open Study Buddy** on your foldable device
2. **Create or open** a mind map
3. **Fold/unfold** your device and watch the magic!
4. **Experiment** with different postures

---

## 📚 Resources

- [Window Segments API](https://developer.chrome.com/articles/window-segments-enumeration-api/)
- [Foldable Web Best Practices](https://docs.microsoft.com/en-us/dual-screen/web/)
- [Samsung Fold Development](https://developer.samsung.com/galaxy-fold)
- [Surface Duo Development](https://docs.microsoft.com/en-us/dual-screen/android/)

---

**Your mind maps are now foldable-ready! 🎉📱**

Perfect for students using cutting-edge devices to study smarter!