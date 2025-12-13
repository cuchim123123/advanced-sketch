# Advanced Sketch - Feature Documentation

## Overview
Advanced Sketch is a real-time collaborative drawing application built with React, Socket.io, and Canvas API. It supports multiple users drawing simultaneously with live cursor tracking and automatic synchronization.

---

## 🎨 Drawing Tools

### Basic Tools
| Tool | Shortcut | Description | Testable Criteria |
|------|----------|-------------|-------------------|
| **Select** | `V` | Select and move existing strokes (text, images, shapes) | Can select any stroke, text, or image by clicking; selected element shows handles; can drag to move; selection persists until deselected or another is selected. |
| **Pen** | `P` | Freehand drawing with customizable color and stroke width | Drawing with mouse/finger creates a visible path; color and width match toolbar settings; path is added to stroke list. |
| **Eraser** | `E` | Erase strokes by clicking on them | Clicking a stroke removes it from canvas and stroke list; cannot erase locked/hidden strokes. |
| **Hand** | `H` | Pan around the canvas without drawing | Dragging with hand tool moves the visible canvas; no new strokes are created. |

### Shape Tools
| Tool | Shortcut | Description | Testable Criteria |
|------|----------|-------------|-------------------|
| **Line** | `L` | Draw straight lines | Mouse down and drag creates a line; line endpoints match drag start/end; color/width match toolbar. |
| **Rectangle** | `R` | Draw rectangles/squares | Mouse drag creates a rectangle; can draw squares with shift; color/width match toolbar. |
| **Circle** | `C` | Draw circles/ellipses | Mouse drag creates ellipse; shift constrains to circle; color/width match toolbar. |
| **Triangle** | - | Draw triangles | Mouse drag creates triangle; vertices calculated from drag; color/width match toolbar. |
| **Arrow** | - | Draw arrows with arrowheads | Mouse drag creates arrow; arrowhead present at end; color/width match toolbar. |
| **Diamond** | - | Draw diamond/rhombus shapes | Mouse drag creates diamond; shape centered between drag points; color/width match toolbar. |

### Content Tools
| Tool | Shortcut | Description | Testable Criteria |
|------|----------|-------------|-------------------|
| **Text** | `T` | Add text to the canvas with customizable font size | Clicking adds text input; can type and edit; font size matches toolbar; text is selectable and movable. |
| **Image** | `I` | Upload and place images on the canvas | Upload dialog opens; image appears at click location; can resize/rotate; image is selectable and movable. |

---

## 🎯 Drawing Features

### Color Palette
- 16 preset colors available
- Colors: Black, White, Gray, Red, Orange, Amber, Yellow, Lime, Green, Emerald, Cyan, Sky, Blue, Indigo, Purple, Pink
- Color picker displays all options; selecting a color updates the active tool; drawn strokes/images/text use selected color.

### Stroke Customization
**Stroke Width**: Adjustable from 1-20px for drawing tools. Changing width updates preview and new strokes. Existing strokes retain their width unless edited.
**Font Size**: Adjustable from 12-72px for text tool. Changing font size updates preview and new text. Existing text retains size unless edited.

### Selection & Transform
| Feature | Description | Testable Criteria |
|---------|-------------|-------------------|
| **Select Tool** | Click to select shapes, text, or images | Clicking a stroke/image/text highlights it; selection box/handles appear; only one element selected at a time. |
| **Move** | Drag selected elements to reposition | Dragging inside selection moves element; position updates in real time; released at new location. |
| **Resize** | Drag corner handles to resize elements | Dragging a corner handle resizes; aspect ratio preserved with shift; size updates visually. |
| **Rotate** | Drag rotation handle (circle above selection) to rotate | Dragging rotation handle rotates element; angle updates visually; released at new angle. |
| **Transform Shapes** | Lines, rectangles, circles, arrows, diamonds can be resized and rotated | All shape types support resize/rotate; handles appear on selection; transform updates shape data. |
| **Transform Images** | Resize and rotate uploaded images | Image selection shows handles; can resize/rotate; image updates visually and in data. |

### Canvas Controls
| Action | Shortcut/Gesture | Description | Testable Criteria |
|--------|------------------|-------------|-------------------|
| **Zoom In** | Scroll Up / `+` button | Zoom into the canvas | Canvas scale increases; content appears larger; zoom level indicator updates. |
| **Zoom Out** | Scroll Down / `-` button | Zoom out of the canvas | Canvas scale decreases; content appears smaller; zoom level indicator updates. |
| **Reset Zoom** | Click percentage | Reset to 100% zoom | Clicking zoom indicator resets scale to 100%; content returns to original size. |
| **Pan** | Space + Drag / Middle Mouse | Move around the canvas | Holding space or using middle mouse drags canvas; content moves under cursor. |
| **Pinch Zoom** | Two-finger pinch (touch) | Zoom on touch devices | Pinching on touch device zooms in/out; scale updates smoothly. |

### Canvas Size
Virtual canvas: 3000 x 1500 pixels. Drawing area matches these dimensions; cannot draw outside bounds.
Retina display support (2x scale): On high-DPI screens, canvas renders at double resolution for sharpness.

---

## 🔄 Actions & History

| Action | Shortcut | Description | Testable Criteria |
|--------|----------|-------------|-------------------|
| **Undo** | `Ctrl+Z` | Undo last action | Pressing Ctrl+Z reverts last change; canvas and stroke list update; redo becomes available. |
| **Redo** | `Ctrl+Y` | Redo undone action | Pressing Ctrl+Y reapplies last undone change; canvas and stroke list update. |
| **Clear** | 🗑️ button | Clear entire canvas (with confirmation) | Clicking clear shows confirmation; confirming erases all strokes; canvas is empty. |
| **Export PNG** | `Ctrl+E` | Export canvas as PNG image | Exporting creates PNG file; file matches current canvas content and size. |
| **Export SVG** | Export menu | Export as scalable vector graphics | Exporting creates SVG file; file contains all visible strokes as SVG elements. |
| **Export PDF** | Export menu | Export as PDF document | Exporting creates PDF file; file contains all visible strokes as vector graphics. |
| **Save** | `Ctrl+S` | Save current state to server | Pressing Ctrl+S triggers save; server receives current state; save confirmation shown. |

---

## 👥 Real-time Collaboration

### Live Features
- **Multi-user Drawing**: Multiple users can draw simultaneously. All users see each other's strokes in real time; no lag or desync.
- **Live Cursors**: See other users' cursor positions in real-time. Cursors update as users move; each cursor is labeled and colored.
- **Tool Indicators**: See which tool each collaborator is currently using (emoji icons). Tool icon updates instantly as users switch tools.
- **Cursor Labels**: Display usernames above cursors. Each cursor shows correct username; label is always visible.
- **Shape Previews**: See shapes being drawn by others before completion. In-progress shapes are visible to all; preview updates as user drags.
- **Instant Sync**: All strokes synchronized across all participants. Any change (draw, erase, move) is reflected for all users within 100ms.

### Presence Indicators
Each user has a unique color assigned. Color is consistent across session.
Cursors display with user's assigned color. No two users have the same color in a room.
Participant list shows all active users. List updates as users join/leave; usernames and avatars shown.

### Performance Optimizations
Socket emit throttling (50ms intervals): No more than 1 update per 50ms; prevents network flooding.
Path simplification using Douglas-Peucker algorithm: Drawn paths are simplified for performance; visual fidelity is preserved.
Delta compression for efficient data transfer: Only changed points are sent; reduces bandwidth.
RAF batching for cursor updates: Cursor updates are batched per animation frame for smoothness.

---

## 🏠 Room Management

### Room Features
| Feature | Description | Testable Criteria |
|---------|-------------|-------------------|
| **Create Room** | Create a new collaborative room | Clicking create generates a new room code; user is redirected to new room; room appears in list. |
| **Join Room** | Join existing room via code or invite link | Entering code or clicking link joins room; user appears in participant list. |
| **Room Settings** | Configure room name and settings (owner only) | Owner can open settings; can change name; changes are saved and reflected for all. |
| **Invite Link** | Copy shareable invite link | Clicking copy copies link to clipboard; link works for joining room. |
| **Kick Users** | Room owner can remove participants | Owner can remove any user; kicked user is disconnected and notified. |
| **Leave Room** | Exit the room | Clicking leave removes user from room; user is redirected to home. |

### Room Permissions
**Owner**: Full control (settings, kick, save, restore, clear). Owner actions are restricted to owner only.
**Participant**: Draw, chat, view history. Cannot access owner-only features.

### Auto-save
Automatic save every 2 minutes. State is saved to server; no data loss on disconnect.
Manual save available via button or `Ctrl+S`. User can trigger save at any time; confirmation shown.

---

## 📜 Version History

### Snapshot System
- **Save Snapshots**: Create versioned snapshots of canvas state. Clicking save snapshot stores current state; snapshot appears in history list.
- **View History**: Browse previous versions (owner only). Owner can view list of snapshots; each shows timestamp and summary.
- **Restore**: Revert to any previous snapshot version. Clicking restore reverts canvas to selected version; all users see update instantly.
- All participants see restored state in real-time. No lag or desync after restore.

---

## 💬 Chat System

Real-time chat within rooms. Sending a message broadcasts to all users; messages appear instantly.
Message history during session. All messages sent in session are visible; scrollable chat window.
Toggle chat panel visibility. Chat can be opened/closed; unread message badge appears when closed and new messages arrive.

---

## 🔐 Authentication

### User Types
| Type | Features | Testable Criteria |
|------|----------|-------------------|
| **Registered User** | Full access, persistent profile, room ownership | Can register/login; profile persists across sessions; can own rooms. |
| **Guest User** | Join rooms, draw, no account required | Can join via invite/code; no registration required; cannot own rooms. |

### Auth Features
**Register**: Email-based registration. User can register with email; receives verification email.
**Login**: Email/password authentication. User can login with valid credentials; invalid login shows error.
**Email Verification**: OTP-based email verification. User receives OTP; entering correct OTP verifies account.
**Forgot Password**: Password reset via email. User can request reset; receives email; can set new password.
**Profile Management**: Update username and settings. User can change username; changes persist and are shown in UI.

---

## 🖥️ User Interface

### Glassmorphism Design
- Modern glass-effect UI components. All panels and modals have glassmorphism style; consistent look.
- Gradient backgrounds. Backgrounds use gradients; visually appealing.
- Smooth animations and transitions. UI elements animate on open/close; transitions are smooth.

### Responsive Layout
Desktop-optimized drawing experience. UI fits large screens; controls are accessible.
Touch support for mobile/tablet devices. Can draw, pan, zoom with touch; gestures work as expected.
Collapsible panels (participants, chat, history). Panels can be opened/closed; state persists until changed.

### Error Handling
**Error Boundaries**: Graceful error recovery. UI shows fallback on error; app does not crash.
**Toast Notifications**: Success, error, warning messages. Toasts appear for key actions; correct color and icon.
**Connection Status**: Visual indicator for socket connection. Status icon updates on connect/disconnect; tooltip shows details.

### Accessibility
Keyboard shortcuts for all major tools. Pressing shortcut switches tool; tool is highlighted.
Shortcut help modal (`?` key). Pressing ? shows modal with all shortcuts; modal can be closed.
Clear visual feedback for selected tools. Selected tool is visually distinct; feedback updates instantly.

---

## ⌨️ Keyboard Shortcuts Reference

### Tools
| Key | Action | Testable Criteria |
|-----|--------|-------------------|
| `P` | Pen tool | Pressing P switches to pen; pen UI is active. |
| `E` | Eraser tool | Pressing E switches to eraser; eraser UI is active. |
| `V` | Select tool | Pressing V switches to select; select UI is active. |
| `L` | Line tool | Pressing L switches to line; line UI is active. |
| `R` | Rectangle tool | Pressing R switches to rectangle; rectangle UI is active. |
| `C` | Circle tool | Pressing C switches to circle; circle UI is active. |
| `T` | Text tool | Pressing T switches to text; text UI is active. |
| `I` | Image tool | Pressing I switches to image; image UI is active. |
| `H` | Hand (pan) tool | Pressing H switches to hand; hand UI is active. |

### Actions
| Key | Action | Testable Criteria |
|-----|--------|-------------------|
| `Ctrl+Z` | Undo | Pressing Ctrl+Z undoes last action; canvas updates. |
| `Ctrl+Y` | Redo | Pressing Ctrl+Y redoes last undone action; canvas updates. |
| `Ctrl+S` | Save | Pressing Ctrl+S saves state; confirmation shown. |
| `Ctrl+E` | Export as PNG | Pressing Ctrl+E exports PNG; file is downloaded. |
| `Space` | Hold to pan | Holding space enables pan; dragging moves canvas. |
| `Escape` | Close modals | Pressing Escape closes any open modal. |
| `?` | Show shortcuts help | Pressing ? opens shortcut modal. |

---

## 🔧 Technical Features

### Canvas Rendering
- HTML5 Canvas 2D API. All drawing is rendered on HTML5 canvas; no SVG overlays.
- 2x resolution for retina displays. On retina screens, canvas is double-sized for sharpness.
- Efficient redraw on stroke changes. Only changed regions are redrawn; performance is smooth for 1000+ strokes.
- ImageData snapshots for shape previews. Shape previews use ImageData for fast rendering.

### Network Optimization
WebSocket-based real-time communication. All collaboration uses WebSocket; no polling.
Automatic reconnection handling. If disconnected, app reconnects automatically; user is notified.
Stroke point batching. Multiple points are sent in a single message for efficiency.
Delta encoding for positions. Only changed positions are sent; reduces bandwidth.

### State Management
Zustand for global state. All app state is managed by Zustand; no Redux or Context API.
React Router for navigation. Page navigation uses React Router; URLs update correctly.
Optimistic UI updates. UI updates immediately on action; server confirmation may arrive later.

---

## 📱 Platform Support

**Desktop Browsers**: Chrome, Firefox, Safari, Edge. All features work in these browsers; no major bugs.
**Touch Devices**: iPad, tablets (pinch zoom, touch drawing). Drawing, panning, zooming work with touch; gestures are smooth.
**Mobile**: Responsive design (optimized for larger screens). UI adapts to small screens; all features accessible.

---

## 🚀 Future Considerations

Potential features for future development:
- Layer support: Add support for multiple layers; users can reorder, hide, and lock layers.
- More shape tools (star, polygon): Add star and polygon drawing tools; test by drawing and editing these shapes.
- Room templates: Allow rooms to be created from templates; test by creating and joining template-based rooms.
- Voice/video chat integration: Add voice/video chat; test by joining call and verifying audio/video streams.
- Infinite canvas mode: Allow canvas to expand infinitely; test by drawing beyond current bounds.
- Stroke color/width editing after creation: After selecting a stroke, user can change its color and width; changes are reflected instantly and synced to all users.
- Copy/paste functionality: User can copy and paste strokes; pasted strokes appear at offset location.
- Grid and snapping: Add grid overlay and snapping for precise alignment; test by moving/placing shapes and verifying snap behavior.
