# Advanced Sketch - Feature Documentation

## Overview
Advanced Sketch is a real-time collaborative drawing application built with React, Socket.io, and Canvas API. It supports multiple users drawing simultaneously with live cursor tracking and automatic synchronization.

**Last Updated**: December 15, 2025

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
| **Image** | `I` | Upload and place images on the canvas (max 2MB) |

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
| **Transform Shapes** | Lines, rectangles, circles, arrows, diamonds, triangles can be resized and rotated |
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
- **Multi-user Drawing**: Multiple users can draw simultaneously with instant sync
- **Live Cursors**: See other users' cursor positions in real-time
- **Tool Indicators**: See which tool each collaborator is using (emoji icons)
- **Cursor Labels**: Display usernames above cursors
- **Shape Previews**: See shapes being drawn by others before completion
- **Instant Sync**: All strokes synchronized within 100ms

### Presence Indicators
- Each user has a unique color assigned (consistent across session)
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
| **Create Room** | Create a new collaborative room (public or private) |
| **Join Room** | Join existing room via code or invite link |
| **Room Settings** | Configure room name, visibility, and max participants (owner only) |
| **Public/Private Toggle** | Set room visibility on creation |
| **Invite Link** | Copy shareable invite link |
| **Kick Users** | Room owner can remove participants |
| **Leave Room** | Exit the room |

### Dashboard Features
| Feature | Description |
|---------|-------------|
| **My Rooms** | View rooms you own with participant count and visibility status |
| **Public Rooms** | Browse all public rooms from all users |
| **Participant Count** | Real-time participant count on room cards (registered + guests) |
| **Smart Polling** | Auto-refresh every 10s only when tab is visible |
| **Manual Refresh** | RefreshButton component for manual data refresh |

### Room Permissions
- **Owner**: Full control (settings, kick, save, restore, clear)
- **Participant**: Draw, chat, view history

### Auto-save
- Automatic save every 2 minutes
- Manual save available via button or `Ctrl+S`
- Empty canvas save supported (after undo all)

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
- Unread message badge when chat is closed

---

## 🔐 Authentication

### User Types
| Type | Features |
|------|----------|
| **Registered User** | Full access, persistent profile, room ownership |
| **Guest User** | Join rooms, draw, no account required, cannot own rooms |

### Auth Features
| Feature | Description |
|---------|-------------|
| **Register** | Email-based registration with validation |
| **Login** | Email/username/phone + password authentication |
| **Email Verification** | Link-based email verification (OTP endpoint available) |
| **Forgot Password** | Password reset via email link |
| **Reset Password** | Set new password with token validation |
| **Profile Management** | Update username, avatar, phone |
| **Change Password** | Change password (requires current password) |

### Password Requirements
- Minimum 6 characters

### Rate Limiting
- Auth endpoints protected with rate limiting
- Strict rate limiting on sensitive routes (forgot-password, reset-password, OTP)

---

## 🛡️ Admin Panel

### Admin Dashboard
- **User Stats**: Total users, guests, registered users
- **Room Stats**: Total rooms, active rooms, public rooms
- **System Overview**: Dashboard with key metrics

### User Management
| Feature | Description |
|---------|-------------|
| **View Users** | Paginated list with search (by name/email) |
| **User Details** | View user information (username, email, role, status) |
| **Delete User** | Remove user account (cannot delete self) |
| **Email Verification Status** | Shows Verified/Pending badge |
| **Skeleton Loading** | Shimmer effect while loading |
| **Auto-Polling** | Refresh every 10s when tab visible |
| **Manual Refresh** | RefreshButton for instant refresh |

### Room Management
| Feature | Description |
|---------|-------------|
| **View Rooms** | Paginated grid view with search |
| **Room Cards** | Display room info, owner, active participants |
| **Active Participants** | Count from SessionParticipant collection |
| **Delete Room** | Remove room and cleanup state |
| **View Room Details** | Modal with full room information |
| **Skeleton Loading** | Card skeletons while loading |
| **Auto-Polling** | Refresh every 10s when tab visible |
| **Manual Refresh** | RefreshButton for instant refresh |

### Admin Access Control
- Role-based access (admin only)
- Protected routes with middleware

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
- **Toast Notifications**: Success, error, warning messages (using Sonner)
- **Connection Status**: Visual indicator for socket connection

### Loading States
- **Skeleton Loading**: Shimmer animation for data loading
- **Loading Spinners**: Consistent LoadingSpinner component
- **RefreshButton**: Reusable component with spinning animation

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

### Canvas Architecture
- **Orchestrator Pattern**: Canvas.jsx acts as pure orchestrator, delegating logic to `useCanvas` hook
- **Hook Separation**: Drawing, transform, text, image handlers in dedicated hooks
- HTML5 Canvas 2D API
- 2x resolution for retina displays
- Efficient redraw on stroke changes
- ImageData snapshots for shape previews

### Network Optimization
- WebSocket-based real-time communication
- Automatic reconnection handling
- Stroke point batching
- Delta encoding for positions
- Dashboard polling optimization (visibility-aware)

### State Management
- **Zustand**: Global state with persist middleware
- **React Router**: Client-side navigation
- Optimistic UI updates
- Room state in memory for guests, DB for registered users

### Data Validation
- Stroke tool validation (only valid tools saved)
- Non-drawing tools filtered (hand, select never create strokes)
- Image size limit (2MB client-side)

### Reusable Components
| Component | Description |
|-----------|-------------|
| `RefreshButton` | Glass-style button with spinning refresh icon |
| `usePolling` | Hook for visibility-aware auto-polling |
| `LoadingSpinner` | Consistent loading indicator |
| `Toast` | Toast notification system |
| `ConfirmModal` | Confirmation dialog |
| `ErrorBoundary` | Error boundary with fallback UI |

---

## 📱 Platform Support

- **Desktop Browsers**: Chrome, Firefox, Safari, Edge
- **Touch Devices**: iPad, tablets (pinch zoom, touch drawing)
- **Mobile**: Responsive design (optimized for larger screens)

---

## ⚠️ Known Limitations

### Data & Network
| Issue | Description |
|-------|-------------|
| **Network partition data loss** | Strokes drawn while disconnected may be lost |
| **No offline queue** | Strokes not queued for retry on reconnection |
| **Auto-save silent failure** | Save errors logged but users may not be notified |

### Security
| Issue | Description |
|-------|-------------|
| **No server-side stroke validation** | Strokes accepted without full bounds/size checks |
| **No server-side image size limit** | Client limits 2MB but server accepts any size |
| **Chat XSS** | Chat messages only trimmed, not fully sanitized |
| **Guest ID spoofing** | Guest IDs trusted from client |

### UX
| Issue | Description |
|-------|-------------|
| **Undo/redo conflicts** | Multi-user undo/redo can cause confusing states |
| **Memory growth** | In-memory room state grows with activity |

---

## 🚀 Future Considerations

Potential features for future development:
- Layer support with reorder, hide, and lock
- More shape tools (star, polygon)
- Room templates
- Voice/video chat integration
- Infinite canvas mode
- Stroke color/width editing after creation
- Copy/paste functionality
- Grid and snapping for precise alignment
