# Advanced Sketch - Feature Documentation

## Overview
Advanced Sketch is a real-time collaborative drawing application built with React, Socket.io, and Canvas API. It supports multiple users drawing simultaneously with live cursor tracking and automatic synchronization.

---

## 🎨 Drawing Tools

### Basic Tools
| Tool | Shortcut | Description |
|------|----------|-------------|
| **Select** | `V` | Select and move existing strokes (text, images, shapes) |
| **Pen** | `P` | Freehand drawing with customizable color and stroke width |
| **Eraser** | `E` | Erase strokes by clicking on them |
| **Hand** | `H` | Pan around the canvas without drawing |

### Shape Tools
| Tool | Shortcut | Description |
|------|----------|-------------|
| **Line** | `L` | Draw straight lines |
| **Rectangle** | `R` | Draw rectangles/squares |
| **Circle** | `C` | Draw circles/ellipses |
| **Triangle** | - | Draw triangles |
| **Arrow** | - | Draw arrows with arrowheads |
| **Diamond** | - | Draw diamond/rhombus shapes |

### Content Tools
| Tool | Shortcut | Description |
|------|----------|-------------|
| **Text** | `T` | Add text to the canvas with customizable font size |
| **Image** | `I` | Upload and place images on the canvas |

---

## 🎯 Drawing Features

### Color Palette
- 16 preset colors available
- Colors: Black, White, Gray, Red, Orange, Amber, Yellow, Lime, Green, Emerald, Cyan, Sky, Blue, Indigo, Purple, Pink

### Stroke Customization
- **Stroke Width**: Adjustable from 1-20px for drawing tools
- **Font Size**: Adjustable from 12-72px for text tool

### Selection & Transform
| Feature | Description |
|---------|-------------|
| **Select Tool** | Click to select shapes, text, or images |
| **Move** | Drag selected elements to reposition |
| **Resize** | Drag corner handles to resize elements |
| **Rotate** | Drag rotation handle (circle above selection) to rotate |
| **Transform Shapes** | Lines, rectangles, circles, arrows, diamonds can be resized and rotated |
| **Transform Images** | Resize and rotate uploaded images |

### Canvas Controls
| Action | Shortcut/Gesture | Description |
|--------|------------------|-------------|
| **Zoom In** | Scroll Up / `+` button | Zoom into the canvas |
| **Zoom Out** | Scroll Down / `-` button | Zoom out of the canvas |
| **Reset Zoom** | Click percentage | Reset to 100% zoom |
| **Pan** | Space + Drag / Middle Mouse | Move around the canvas |
| **Pinch Zoom** | Two-finger pinch (touch) | Zoom on touch devices |

### Canvas Size
- Virtual canvas: 3000 x 1500 pixels
- Retina display support (2x scale)

---

## 🔄 Actions & History

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Undo** | `Ctrl+Z` | Undo last action |
| **Redo** | `Ctrl+Y` | Redo undone action |
| **Clear** | 🗑️ button | Clear entire canvas (with confirmation) |
| **Export PNG** | `Ctrl+E` | Export canvas as PNG image |
| **Export SVG** | Export menu | Export as scalable vector graphics |
| **Export PDF** | Export menu | Export as PDF document |
| **Save** | `Ctrl+S` | Save current state to server |

---

## 👥 Real-time Collaboration

### Live Features
- **Multi-user Drawing**: Multiple users can draw simultaneously
- **Live Cursors**: See other users' cursor positions in real-time
- **Tool Indicators**: See which tool each collaborator is currently using (emoji icons)
- **Cursor Labels**: Display usernames above cursors
- **Shape Previews**: See shapes being drawn by others before completion
- **Instant Sync**: All strokes synchronized across all participants

### Presence Indicators
- Each user has a unique color assigned
- Cursors display with user's assigned color
- Participant list shows all active users

### Performance Optimizations
- Socket emit throttling (50ms intervals)
- Path simplification using Douglas-Peucker algorithm
- Delta compression for efficient data transfer
- RAF batching for cursor updates

---

## 🏠 Room Management

### Room Features
| Feature | Description |
|---------|-------------|
| **Create Room** | Create a new collaborative room |
| **Join Room** | Join existing room via code or invite link |
| **Room Settings** | Configure room name and settings (owner only) |
| **Invite Link** | Copy shareable invite link |
| **Kick Users** | Room owner can remove participants |
| **Leave Room** | Exit the room |

### Room Permissions
- **Owner**: Full control (settings, kick, save, restore, clear)
- **Participant**: Draw, chat, view history

### Auto-save
- Automatic save every 2 minutes
- Manual save available via button or `Ctrl+S`

---

## 📜 Version History

### Snapshot System
- **Save Snapshots**: Create versioned snapshots of canvas state
- **View History**: Browse previous versions (owner only)
- **Restore**: Revert to any previous snapshot version
- All participants see restored state in real-time

---

## 💬 Chat System

- Real-time chat within rooms
- Message history during session
- Toggle chat panel visibility

---

## 🔐 Authentication

### User Types
| Type | Features |
|------|----------|
| **Registered User** | Full access, persistent profile, room ownership |
| **Guest User** | Join rooms, draw, no account required |

### Auth Features
- **Register**: Email-based registration
- **Login**: Email/password authentication
- **Email Verification**: OTP-based email verification
- **Forgot Password**: Password reset via email
- **Profile Management**: Update username and settings

---

## 🖥️ User Interface

### Glassmorphism Design
- Modern glass-effect UI components
- Gradient backgrounds
- Smooth animations and transitions

### Responsive Layout
- Desktop-optimized drawing experience
- Touch support for mobile/tablet devices
- Collapsible panels (participants, chat, history)

### Error Handling
- **Error Boundaries**: Graceful error recovery
- **Toast Notifications**: Success, error, warning messages
- **Connection Status**: Visual indicator for socket connection

### Accessibility
- Keyboard shortcuts for all major tools
- Shortcut help modal (`?` key)
- Clear visual feedback for selected tools

---

## ⌨️ Keyboard Shortcuts Reference

### Tools
| Key | Action |
|-----|--------|
| `P` | Pen tool |
| `E` | Eraser tool |
| `V` | Select tool |
| `L` | Line tool |
| `R` | Rectangle tool |
| `C` | Circle tool |
| `T` | Text tool |
| `I` | Image tool |
| `H` | Hand (pan) tool |

### Actions
| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Save |
| `Ctrl+E` | Export as PNG |
| `Space` | Hold to pan |
| `Escape` | Close modals |
| `?` | Show shortcuts help |

---

## 🔧 Technical Features

### Canvas Rendering
- HTML5 Canvas 2D API
- 2x resolution for retina displays
- Efficient redraw on stroke changes
- ImageData snapshots for shape previews

### Network Optimization
- WebSocket-based real-time communication
- Automatic reconnection handling
- Stroke point batching
- Delta encoding for positions

### State Management
- Zustand for global state
- React Router for navigation
- Optimistic UI updates

---

## 📱 Platform Support

- **Desktop Browsers**: Chrome, Firefox, Safari, Edge
- **Touch Devices**: iPad, tablets (pinch zoom, touch drawing)
- **Mobile**: Responsive design (optimized for larger screens)

---

## 🚀 Future Considerations

Potential features for future development:
- Layer support
- More shape tools (star, polygon)
- Room templates
- Voice/video chat integration
- Infinite canvas mode
- Stroke color/width editing after creation
- Copy/paste functionality
- Grid and snapping
