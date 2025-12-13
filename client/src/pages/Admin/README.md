# Admin Dashboard

A comprehensive admin panel for managing users, rooms, and system settings in Advanced Sketch.

## Features

### 📊 Dashboard Overview
- Real-time statistics (Total Users, Rooms, Active Sessions, Guests)
- Animated stat cards with gradients
- Quick action buttons
- Clean glassmorphism design

### 👥 User Management
- View all registered users with pagination
- Search users by name or email
- User details modal (username, email, role, verification status)
- Delete users with confirmation
- Role-based badges (Admin/User)
- Verification status indicators

### 🏠 Room Management
- Grid view of all rooms
- Room statistics (participants, creation date)
- Public/Private room indicators
- View room details (owner, participants, settings)
- Delete rooms with confirmation
- Search rooms by name or owner

### ⚙️ Settings
- General application settings
- Security configurations (2FA, email verification)
- Room settings (auto-save, chat, public rooms)
- Toggle switches for boolean settings
- Input fields for numeric/text settings

## Routes

```
/admin              → Dashboard Overview
/admin/users        → User Management
/admin/rooms        → Room Management
/admin/settings     → System Settings
```

## Access Control

### Admin Route Guard
Only users with `role: 'admin'` can access the admin panel. Non-admin users are redirected to the dashboard.

### Backend Middleware
```javascript
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    })
  }
  next()
}
```

## API Endpoints

### User Management
- `GET /api/admin/users/stats` - Get user statistics
- `GET /api/admin/users?page=1&limit=10&search=query` - Get paginated users
- `DELETE /api/admin/users/:userId` - Delete a user

### Room Management
- `GET /api/admin/rooms/stats` - Get room statistics
- `GET /api/admin/rooms?page=1&limit=10&search=query` - Get paginated rooms
- `DELETE /api/admin/rooms/:roomId` - Delete a room

## Components Structure

```
src/pages/Admin/
├── index.jsx                    # Admin panel container with sidebar
├── Admin.css                    # Glassmorphism styling
├── components/
│   ├── AdminSidebar.jsx        # Navigation sidebar
│   └── index.js                # Component exports
├── Dashboard/
│   ├── Dashboard.jsx           # Dashboard overview page
│   └── index.js
├── Users/
│   ├── Users.jsx               # User management page
│   └── index.js
├── Rooms/
│   ├── Rooms.jsx               # Room management page
│   └── index.js
└── Settings/
    ├── Settings.jsx            # Settings page
    └── index.js
```

## Design System

### Colors
- Background: Dark gradient with glassmorphism
- Primary: `#667eea` to `#764ba2` (Purple gradient)
- Success: `#10b981` (Green)
- Warning: `#fbbf24` (Yellow)
- Danger: `#ef4444` (Red)
- Info: `#3b82f6` (Blue)

### Components
- **Stat Cards**: Gradient backgrounds, hover animations, icons
- **Tables**: Zebra striping, hover effects, responsive
- **Modals**: Backdrop blur, dark overlay, slide-in animation
- **Buttons**: Gradient on primary, glass effect on secondary
- **Badges**: Color-coded by status/role

## Mobile Responsive

- Sidebar converts to overlay on mobile (<768px)
- Hamburger menu button for mobile navigation
- Card grids adapt to smaller screens
- Tables scroll horizontally on mobile

## Creating an Admin User

To create an admin user, manually update the user document in MongoDB:

```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Or during registration, modify the auth controller to set role:

```javascript
const user = await User.create({
  username,
  email,
  password,
  role: 'admin' // Add this for admin users
})
```

## Security Considerations

1. **Authentication Required**: All admin routes require valid JWT token
2. **Role-Based Access**: `adminMiddleware` verifies user role
3. **Self-Protection**: Admins cannot delete their own account
4. **Cascade Deletes**: Deleting users also removes their rooms
5. **Input Validation**: Search queries are sanitized with regex

## Future Enhancements

- [ ] Analytics dashboard with charts
- [ ] Activity logs and audit trail
- [ ] Bulk user operations
- [ ] Export data to CSV/JSON
- [ ] Real-time notifications
- [ ] User suspension/ban system
- [ ] Advanced filtering and sorting
- [ ] Role management (create custom roles)

## Dependencies

```json
{
  "sonner": "^1.4.0",           // Toast notifications
  "lucide-react": "^0.263.1",   // Icon library
  "react-router-dom": "^6.x"    // Routing with nested routes
}
```

## License

MIT
