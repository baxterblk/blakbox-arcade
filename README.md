# BlakBox Game Server 🎮

A self-hosted retro gaming server with a stunning cyberpunk aesthetic. Play classic console games directly in your browser with authentic emulation and modern convenience.

![BlakBox Game Server](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Linux-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

### 🎨 **Retro-Gaming Aesthetic**
- **Synthwave UI**: Dark backgrounds with neon cyan, pink, and purple accents
- **Animated Elements**: Glowing borders, smooth transitions, and loading animations
- **Mobile Responsive**: Touch-friendly interface that works on all devices
- **Accessibility**: High contrast mode support and keyboard navigation

### 🎮 **Gaming Features**
- **Multi-Console Support**: NES, SNES, Game Boy/Color/Advance, N64, Genesis, and more
- **Browser-Based**: No downloads required - play instantly in any modern browser
- **EmulatorJS Integration**: High-quality emulation with save states and controls
- **Game Library**: Organized by series with search and filtering capabilities

### 🔧 **Administration**
- **Easy Upload**: Drag-and-drop ROM file uploads with automatic system detection
- **User Management**: Role-based access control with admin and player accounts
- **Statistics Dashboard**: Real-time usage analytics and system monitoring
- **Game Management**: Enable/disable games, organize into series, bulk operations

### 🛡️ **Security & Performance**
- **Authentication**: Secure session-based login system
- **File Validation**: ROM file type checking and size limits (500MB max)
- **Rate Limiting**: Protection against abuse and excessive uploads
- **PM2 Process Management**: Auto-restart, monitoring, and clustering support

## 📋 Quick Start

### Access Information
- **URL**: `http://192.168.50.18`
- **Admin Username**: `admin`
- **Admin Password**: `BlakBox2025!`

### Default Game Series
The server comes pre-configured with these game categories:
- **Classic Arcade**: Arcade classics from the golden age
- **NES Classics**: Nintendo Entertainment System games
- **SNES Collection**: Super Nintendo favorites
- **Game Boy**: Portable gaming classics
- **Homebrew Games**: Community-created games and demos

## 🎯 Usage Guide

### For Players
1. **Login**: Navigate to the server URL and login with your credentials
2. **Browse Games**: Explore the game library organized by console and series
3. **Play Games**: Click "Play Game" to launch games instantly in your browser
4. **Controls**: Use keyboard or touch controls (mobile) to play
5. **Save Progress**: Games support save states for resuming later

### For Administrators
1. **Access Admin Panel**: Login as admin and click "Admin Panel"
2. **View Statistics**: Monitor user activity, game library size, and usage
3. **Create Series**: Organize games into logical categories
4. **Upload ROMs**: Add new games via the upload interface
5. **Manage Games**: Enable/disable games and moderate content

### Supported File Formats
- **NES**: `.nes`
- **SNES**: `.snes`, `.smc`, `.sfc`
- **Game Boy**: `.gb`, `.gbc`, `.gba`
- **N64**: `.n64`, `.z64`, `.v64`
- **Genesis**: `.md`, `.gen`, `.smd`
- **Compressed**: `.zip`, `.7z`, `.rar`

## 🔧 Technical Details

### System Requirements
- **OS**: Ubuntu 22.04 LTS (LXC Container)
- **RAM**: 4GB allocated
- **Storage**: 32GB allocated
- **CPU**: 2 cores allocated
- **Network**: Nginx reverse proxy on port 80

### Technology Stack
- **Backend**: Node.js 18.20.6 + Express 5.1.0
- **Database**: SQLite 3.37.2
- **Frontend**: Vanilla JavaScript + CSS3
- **Emulation**: EmulatorJS (libretro cores)
- **Process Manager**: PM2
- **Web Server**: Nginx 1.18.0

### Architecture
```
Internet → Nginx (Port 80) → Express App (Port 3000) → SQLite Database
                ↓
            Static Files (CSS, JS, ROMs)
                ↓
            EmulatorJS (Browser Emulation)
```

## 📁 Directory Structure

```
/opt/blakbox-gameserver/
├── app.js                  # Main Express application
├── database.js             # SQLite database wrapper
├── package.json            # Node.js dependencies
├── data/                   # SQLite database files
├── games/                  # Game metadata and ROMs
│   ├── metadata/          # Game information
│   └── roms/             # Uploaded ROM files
├── uploads/               # Temporary upload storage
├── web/                   # Web interface files
│   ├── views/            # HTML templates
│   └── static/           # CSS, JS, and assets
├── scripts/              # Utility scripts
└── logs/                 # Application logs
```

## 🛠️ Administration Commands

### PM2 Process Management
```bash
# View status
pm2 status

# Restart application
pm2 restart gameserver

# View logs
pm2 logs gameserver

# Monitor performance
pm2 monit
```

### Database Operations
```bash
# Add demo content
cd /opt/blakbox-gameserver
node scripts/add-demo-content.js

# Backup database
cp data/gameserver.db data/gameserver.db.backup
```

### System Maintenance
```bash
# Restart all services
systemctl restart nginx
pm2 restart gameserver

# Check disk usage
df -h /opt/blakbox-gameserver

# View nginx logs
tail -f /var/log/nginx/gameserver-access.log
```

## 🔒 Security Features

### Authentication
- Session-based authentication with secure cookies
- Password hashing using bcrypt
- Role-based access control (admin/user)
- Automatic session timeout

### File Security
- File type validation for uploads
- Size limits (500MB per file)
- Path sanitization to prevent directory traversal
- Virus scanning integration ready

### Network Security
- Nginx reverse proxy configuration
- Rate limiting on API endpoints
- CORS protection
- Security headers implementation

## 🎨 Customization

### Themes
The server uses a custom retro-gaming CSS theme with:
- CSS Custom Properties for easy color changes
- Responsive design breakpoints
- Animation and transition controls
- Dark/light mode toggle ready

### Adding New Consoles
1. Update `systemMapping` in `app.js`
2. Add corresponding EmulatorJS core
3. Update file type validation
4. Add system icon/styling

## 📊 Monitoring

### Built-in Analytics
- User login tracking
- Game play session recording
- Upload statistics
- System resource monitoring
- Error logging and reporting

### Performance Metrics
- Response time monitoring
- Database query optimization
- Memory usage tracking
- Concurrent user handling

## 🔄 Backup & Recovery

### Automated Backups
```bash
# Daily database backup (add to crontab)
0 2 * * * cp /opt/blakbox-gameserver/data/gameserver.db /opt/blakbox-gameserver/data/backup-$(date +\%Y\%m\%d).db

# Weekly full backup
0 1 * * 0 tar -czf /backup/blakbox-$(date +\%Y\%m\%d).tar.gz /opt/blakbox-gameserver/
```

### Recovery Process
1. Stop the application: `pm2 stop gameserver`
2. Restore database: `cp backup.db data/gameserver.db`
3. Restore files: `tar -xzf backup.tar.gz`
4. Start application: `pm2 start gameserver`

## 🐛 Troubleshooting

### Common Issues

**CSS Not Loading**
- Check nginx static file configuration
- Verify file permissions: `chown -R gameserver:gameserver /opt/blakbox-gameserver/web/static/`
- Clear browser cache

**Game Upload Fails**
- Check file size (500MB limit)
- Verify file format is supported
- Check disk space: `df -h`
- Review upload logs: `pm2 logs gameserver`

**EmulatorJS Not Working**
- Verify ROM file integrity
- Check browser console for JavaScript errors
- Ensure EmulatorJS files are present in `/web/static/emulators/`

### Performance Issues
- Monitor PM2: `pm2 monit`
- Check database size: `ls -lh data/gameserver.db`
- Review nginx logs: `tail -f /var/log/nginx/gameserver-error.log`

## 📞 Support

### Getting Help
- Check the troubleshooting section above
- Review application logs: `pm2 logs gameserver`
- Monitor system resources: `htop` or `pm2 monit`

### Reporting Issues
Please include:
- Error messages from logs
- Steps to reproduce the issue
- Browser/device information
- Screenshots if applicable

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **EmulatorJS**: Browser-based emulation framework
- **Libretro**: Emulation cores and APIs
- **Express.js**: Web application framework
- **SQLite**: Embedded database engine
- **PM2**: Production process manager

---

**BlakBox Game Server** - Bringing retro gaming into the future with style! 🚀🎮