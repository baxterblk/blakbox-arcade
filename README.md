![Blakbox Arcade Banner](web/static/branding/banner.png)

# Blakbox Arcade

A self-hosted retro gaming platform with a stunning cyberpunk aesthetic, built for nostalgic gamers who want to experience classic console games in their browser.

## ✨ Features

- 🎮 **Multi-console emulation** - Support for NES, SNES, Game Boy, N64, Genesis, and more
- 🎨 **Retro cyberpunk/synthwave UI** - Beautiful animated interface with neon effects
- 👥 **Multi-user support** - User registration, authentication, and role-based access
- 💾 **Per-user save states** - 3 save slots per game per user with screenshot previews
- 🔐 **Complete admin panel** - User management, game uploads, and system administration
- 📱 **Mobile responsive** - Play on desktop, tablet, or mobile devices
- 🚀 **Browser-based gaming** - No downloads required, runs entirely in the browser
- ⚡ **Session management** - Secure authentication with automatic session handling
- 🗄️ **SQLite database** - Lightweight, self-contained data storage

## 🛠️ Tech Stack

- **Backend**: Node.js 18+ with Express
- **Database**: SQLite with custom async wrapper
- **Frontend**: Vanilla JavaScript with ES6 modules
- **Emulation**: EmulatorJS integration
- **Styling**: Custom CSS with synthwave animations
- **Process Management**: PM2 for production deployment
- **Authentication**: bcrypt password hashing with sessions

## 🎯 Quick Start

### Prerequisites
- Node.js 18 or higher
- PM2 (for production)
- Modern web browser

### Installation

1. Clone the repository:
```bash
git clone https://git.blakbox.vip/baxterblk/blakbox-arcade.git
cd blakbox-arcade
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Start the application:
```bash
# Development
npm start

# Production with PM2
npm run pm2:start
```

5. Visit http://localhost:3000 in your browser

### Default Admin Credentials

- **Username**: admin2
- **Password**: admin123

⚠️ **Change these credentials immediately after first login\!**

## 📁 Project Structure

```
blakbox-arcade/
├── app.js                 # Main application server
├── database.js            # Database connection and utilities
├── package.json           # Node.js dependencies
├── web/                   # Frontend assets
│   ├── views/            # HTML templates
│   │   ├── login.html    # Login page
│   │   ├── games.html    # Games library
│   │   ├── admin.html    # Admin panel
│   │   └── register.html # User registration
│   └── static/           # Static assets
│       ├── css/          # Stylesheets
│       ├── js/           # JavaScript modules
│       └── emulatorjs/   # Emulator assets
├── data/                 # Database and user data
└── docs/                 # Documentation
```

## 🎮 Supported Consoles

- **Nintendo Entertainment System (NES)**
- **Super Nintendo (SNES)**
- **Game Boy / Game Boy Color**
- **Game Boy Advance**
- **Nintendo 64**
- **Sega Genesis / Mega Drive**
- **Sega Master System**
- **Sega Game Gear**

## 🔧 Configuration

The application uses environment variables for configuration:

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./data/gameserver.db

# Session Security
SESSION_SECRET=your-secure-random-secret-here
```

## 👤 User Management

### Admin Features
- Create and manage user accounts
- Enable/disable user access
- Reset user passwords
- View user statistics and activity
- Upload and manage ROM files
- Configure game series and metadata

### User Features
- Secure registration and login
- Personal save state management (3 slots per game)
- Game library browsing with search
- Mobile-responsive gameplay
- User profile management

## 🎨 UI Themes

The interface features a custom cyberpunk/synthwave aesthetic with:
- Animated neon text effects
- Gradient backgrounds with motion
- Retro-futuristic button designs
- Responsive grid layouts
- Mobile-optimized controls

## 🔒 Security Features

- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Secure HTTP-only session cookies
- **Input Validation**: Server-side validation for all user inputs
- **Role-Based Access**: Admin and user role separation
- **CSRF Protection**: Session-based request validation
- **File Upload Security**: ROM file type validation and size limits

## 📱 Mobile Support

Full mobile experience with:
- Touch-optimized controls
- Responsive design for all screen sizes
- Virtual gamepad support
- Gesture navigation
- Portrait and landscape orientations

## 🚀 Deployment

### Production Setup

1. **System Requirements**:
   - Ubuntu 20.04+ or CentOS 8+
   - Node.js 18+
   - 2GB+ RAM
   - 10GB+ storage

2. **PM2 Process Management**:
```bash
npm install -g pm2
pm2 start app.js --name "blakbox-arcade"
pm2 startup
pm2 save
```

3. **Nginx Reverse Proxy** (recommended):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host ;
        proxy_set_header X-Real-IP ;
    }
}
```

### Docker Support

```dockerfile
# Dockerfile included for containerized deployment
docker build -t blakbox-arcade .
docker run -d -p 3000:3000 --name arcade blakbox-arcade
```

## 📊 Database Schema

The application uses SQLite with these main tables:
- **users** - User accounts and authentication
- **games** - ROM metadata and file information
- **series** - Game console/series organization
- **save_states** - User save data with screenshots
- **play_sessions** - Gaming activity tracking

## 🤝 Contributing

This is a private project. For feature requests or bug reports, please contact the administrator.

## 📄 License

All rights reserved. This is proprietary software.

## 🎯 Roadmap

- [ ] Additional console support (Atari, NeoGeo)
- [ ] Multiplayer gaming sessions
- [ ] Achievement system
- [ ] Social features and user profiles
- [ ] Advanced statistics and analytics
- [ ] Mobile app companion
- [ ] Cloud save synchronization

## ⚡ Performance

- **Startup Time**: < 2 seconds
- **Memory Usage**: ~50MB base, +20MB per active session
- **Database**: Optimized SQLite with indexing
- **Caching**: Static asset caching with ETags
- **Compression**: Gzip compression for all text assets

## 🎮 Gaming Experience

Experience retro gaming like never before with:
- **Authentic Emulation**: Pixel-perfect rendering
- **Save States**: Never lose progress again
- **Fast Loading**: Optimized ROM loading and caching
- **Customizable Controls**: Remap controls to your preference
- **Full Screen**: Immersive gaming experience
- **Multiple Save Slots**: Experiment with different playthroughs

---

**Blakbox Arcade** - Where retro meets the future\! 🚀✨
