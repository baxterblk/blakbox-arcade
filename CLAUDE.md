# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# PM2 production deployment
pm2 start app.js --name "blakbox-arcade"
```

### Database Management
```bash
# Create admin user
node scripts/create-admin.js

# Add demo content
node scripts/add-demo-content.js

# Run database migrations
node scripts/migrate-phase8.js
node scripts/migrate-user-enabled.js
```

### File Upload Testing
```bash
# Test file upload functionality
node test-upload.js
```

## Architecture Overview

### Core Components

**Backend (Node.js + Express)**
- `app.js` - Main application server with authentication, session management, and API routes
- `database.js` - SQLite database wrapper with async/await interface
- `email.js` - Email service for password resets and notifications
- `gameMetadata.js` - Game metadata detection and ROM file processing

**Frontend Architecture**
- `web/static/js/main.js` - Main game client (GameServer class)
- `web/static/js/admin.js` - Admin panel client (AdminPanel class)
- `web/views/` - HTML templates for different application views
- `web/static/css/` - Cyberpunk/synthwave themed CSS with animations

**Database Schema**
- `users` - User authentication and profile data
- `games` - ROM metadata and file storage information
- `series` - Game console/platform organization
- `save_states` - Per-user save data with screenshot previews
- `play_sessions` - User activity tracking

### Key Design Patterns

**Database Access**
- Custom SQLite wrapper with Promise-based interface
- Async/await throughout for database operations
- Automatic database initialization and migration handling

**Authentication & Security**
- bcrypt password hashing with salt rounds
- Express sessions with HTTP-only cookies
- Role-based access control (admin/user)
- File upload validation and size limits (500MB)

**Frontend State Management**
- Class-based JavaScript architecture
- Separate client classes for different views (GameServer, AdminPanel)
- Async/await for API communication
- Event-driven UI updates

## File Structure

### Backend Files
- `app.js` - Express server with routes and middleware
- `database.js` - Database connection and query methods
- `email.js` - Nodemailer email service
- `gameMetadata.js` - ROM file processing and metadata extraction

### Frontend Structure
```
web/
├── views/           # HTML templates
│   ├── games.html   # Main game library
│   ├── admin.html   # Admin panel
│   ├── login.html   # Authentication
│   └── register.html
├── static/
│   ├── js/          # JavaScript modules
│   ├── css/         # Cyberpunk-themed stylesheets
│   └── data/        # EmulatorJS integration
```

### EmulatorJS Integration
- `web/static/data/` - EmulatorJS core files and ROM handling
- `web/static/emulators/` - Emulator engine and console cores
- Supports NES, SNES, Game Boy, N64, Genesis, and more

## Development Guidelines

### Database Operations
- Use the Database class methods (get, all, run) with async/await
- Always handle database errors with try/catch blocks
- Run migrations in the scripts/ directory for schema changes

### File Uploads
- ROM files stored in `uploads/` directory
- Multer middleware handles file validation and storage
- Supported formats: .nes, .snes, .gb, .gba, .n64, .gen, .zip, .iso

### Session Management
- Express sessions with database storage
- Session secret from environment variables
- Automatic session cleanup and expiration

### API Endpoints
- RESTful API design with `/api/` prefix
- Authentication required for most endpoints
- Admin-only endpoints protected with middleware

## Environment Configuration

Required environment variables:
- `PORT` - Server port (default: 3000)
- `DB_PATH` - SQLite database path (default: ./data/gameserver.db)
- `SESSION_SECRET` - Session encryption key
- `NODE_ENV` - Environment mode (development/production)

## Testing

The application currently uses manual testing approaches:
- `test-upload.js` - File upload functionality testing
- Browser-based testing for emulator functionality
- Manual admin panel testing for user management

## Deployment Notes

### Production Setup
- Uses PM2 for process management
- SQLite database with automatic backup
- Nginx reverse proxy recommended
- File upload directory needs proper permissions

### Security Considerations
- All passwords hashed with bcrypt
- Session-based authentication
- File upload validation and size limits
- Admin role separation for sensitive operations

## Emulator Integration

The application integrates EmulatorJS for browser-based gaming:
- Core files in `web/static/data/src/`
- Console-specific cores and configuration
- Save state management with screenshot previews
- Mobile-responsive touch controls