class GameServer {
    constructor() {
        this.currentUser = null;
        this.games = [];
        this.currentGame = null;
        this.emulator = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadGames();
        this.setupEventListeners();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/user');
            if (response.ok) {
                this.currentUser = await response.json();
                document.getElementById('username-display').textContent = `Welcome, ${this.currentUser.username}`;
                
                // Show admin link if user is admin
                if (this.currentUser.role === 'admin') {
                    const adminLink = document.createElement('a');
                    adminLink.href = '/admin';
                    adminLink.className = 'btn btn-secondary';
                    adminLink.textContent = 'ADMIN PANEL';
                    adminLink.style.marginRight = '10px';
                    
                    const userInfo = document.querySelector('.user-info');
                    userInfo.insertBefore(adminLink, document.getElementById('logout-btn'));
                }
            } else {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login';
        }
    }

    async loadGames() {
        const loadingEl = document.getElementById('loading');
        const noGamesEl = document.getElementById('no-games');
        const gamesListEl = document.getElementById('games-list');

        try {
            const response = await fetch('/api/games');
            if (!response.ok) {
                throw new Error('Failed to load games');
            }

            this.games = await response.json();
            
            loadingEl.style.display = 'none';

            if (this.games.length === 0 || this.games.every(series => series.game_count === 0)) {
                noGamesEl.style.display = 'block';
            } else {
                this.renderGames();
                gamesListEl.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load games:', error);
            loadingEl.textContent = 'Error loading games. Please refresh the page.';
        }
    }

    renderGames() {
        const gamesListEl = document.getElementById('games-list');
        gamesListEl.innerHTML = '';

        this.games.forEach(series => {
            if (series.games && series.games.length > 0) {
                const seriesEl = this.createSeriesElement(series);
                gamesListEl.appendChild(seriesEl);
            }
        });
    }

    createSeriesElement(series) {
        const seriesEl = document.createElement('div');
        seriesEl.className = 'series-section';

        const titleEl = document.createElement('h2');
        titleEl.className = 'series-title';
        titleEl.textContent = series.name;

        const descEl = document.createElement('p');
        descEl.className = 'series-description';
        descEl.textContent = series.description || '';

        const gamesGridEl = document.createElement('div');
        gamesGridEl.className = 'games-grid';

        series.games.forEach(game => {
            const gameCardEl = this.createGameCard(game);
            gamesGridEl.appendChild(gameCardEl);
        });

        seriesEl.appendChild(titleEl);
        if (series.description) {
            seriesEl.appendChild(descEl);
        }
        seriesEl.appendChild(gamesGridEl);

        return seriesEl;
    }

    createGameCard(game) {
        const cardEl = document.createElement('div');
        cardEl.className = 'game-card';

        const titleEl = document.createElement('div');
        titleEl.className = 'game-title';
        titleEl.textContent = game.title;

        const systemEl = document.createElement('div');
        systemEl.className = 'game-system';
        systemEl.textContent = `System: ${game.system.toUpperCase()}`;

        const playBtn = document.createElement('button');
        playBtn.className = 'btn btn-game';
        playBtn.textContent = 'Play Game';
        playBtn.onclick = () => this.launchGame(game);

        cardEl.appendChild(titleEl);
        cardEl.appendChild(systemEl);
        cardEl.appendChild(playBtn);

        return cardEl;
    }

    async launchGame(game) {
        const modal = document.getElementById('game-modal');
        const gameTitle = document.getElementById('game-title');
        const emulatorEl = document.getElementById('emulator');

        this.currentGame = game;
        gameTitle.textContent = game.title;
        modal.style.display = 'flex';

        // Show loading
        emulatorEl.innerHTML = `
            <div style="text-align: center; color: white; padding: 50px;">
                <h3>Loading ${game.title}...</h3>
                <p>System: ${game.system.toUpperCase()}</p>
                <p>Please wait while the emulator initializes...</p>
            </div>
        `;

        try {
            // Record play session start
            await this.recordPlaySession(game.id);
            
            // Load EmulatorJS
            await this.initializeEmulator(game);
        } catch (error) {
            console.error('Failed to launch game:', error);
            emulatorEl.innerHTML = `
                <div style="text-align: center; color: white; padding: 50px;">
                    <h3>Error Loading Game</h3>
                    <p>Failed to initialize emulator for ${game.title}</p>
                    <p>Error: ${error.message}</p>
                    <p>Please try again or contact an administrator.</p>
                </div>
            `;
        }
    }

    async initializeEmulator(game) {
        const emulatorEl = document.getElementById('emulator');
        
        // Clear previous content
        emulatorEl.innerHTML = '';
        
        // Create emulator container
        const emulatorContainer = document.createElement('div');
        emulatorContainer.id = 'emulator-container';
        emulatorContainer.style.width = '100%';
        emulatorContainer.style.height = '100%';
        emulatorEl.appendChild(emulatorContainer);

        // Load EmulatorJS CSS if not already loaded
        if (!document.querySelector('link[href*="emulator.css"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/data/emulator.css';
            document.head.appendChild(cssLink);
        }

        // Map system to core with better N64 support
        const coreMapping = {
            'nes': 'fceumm',
            'snes': 'snes9x',
            'gb': 'gambatte',
            'gbc': 'gambatte',
            'gba': 'mgba',
            'n64': 'mupen64plus_next',
            'nintendo 64': 'mupen64plus_next',
            'genesis': 'genesis_plus_gx',
            'sms': 'genesis_plus_gx',
            'gg': 'genesis_plus_gx'
        };

        const core = coreMapping[game.system.toLowerCase()] || 'fceumm';

        try {
            // Test ROM availability first
            const romResponse = await fetch(`/api/games/${game.id}/rom`, { method: 'HEAD' });
            if (!romResponse.ok) {
                throw new Error(`ROM file not available (${romResponse.status}: ${romResponse.statusText})`);
            }

            // Configure EmulatorJS global variables
            window.EJS_player = '#emulator-container';
            window.EJS_gameUrl = `/api/games/${game.id}/rom`;
            window.EJS_core = core;
            window.EJS_pathtodata = '/data/';
            window.EJS_gameID = game.id;
            window.EJS_gameName = game.title;
            window.EJS_color = '#667eea';
            window.EJS_startOnLoaded = true;
            window.EJS_fullscreenOnLoaded = false;
            
            // Enhanced error handling
            window.EJS_onGameStart = () => {
                console.log('Game started successfully');
                this.showNotification(`${game.title} loaded successfully!`, 'success');
            };
            
            window.EJS_onLoadState = () => {
                console.log('Load state callback triggered');
            };
            
            window.EJS_onSaveState = () => {
                console.log('Save state callback triggered');
            };

            // Load EmulatorJS if not already loaded
            if (!window.EJS_player || typeof EJS === 'undefined') {
                await this.loadScript('/data/loader.js');
                
                // Wait for EJS to be available
                let attempts = 0;
                while (typeof EJS === 'undefined' && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (typeof EJS === 'undefined') {
                    throw new Error('EmulatorJS failed to load after 5 seconds');
                }
            }

            // Initialize the emulator
            console.log(`Initializing ${core} core for ${game.system} game: ${game.title}`);
            this.emulator = new EJS('#emulator-container');
            
        } catch (error) {
            console.error('EmulatorJS initialization error:', error);
            emulatorEl.innerHTML = `
                <div style="text-align: center; color: white; padding: 50px;">
                    <h3>Network Error</h3>
                    <p>Failed to load ${game.title}</p>
                    <p>Core: ${core} (${game.system.toUpperCase()})</p>
                    <p>Error: ${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
            throw error;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`Script loaded: ${src}`);
                resolve();
            };
            script.onerror = (error) => {
                console.error(`Failed to load script: ${src}`, error);
                reject(new Error(`Failed to load script: ${src}`));
            };
            document.head.appendChild(script);
        });
    }

    async recordPlaySession(gameId) {
        try {
            await fetch('/api/play-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gameId })
            });
        } catch (error) {
            console.error('Failed to record play session:', error);
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST'
                });

                if (response.ok) {
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });

        // Close game modal
        document.getElementById('close-game').addEventListener('click', () => {
            this.closeGame();
        });

        // Close modal when clicking outside
        document.getElementById('game-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeGame();
            }
        });

        // Escape key to close modal and hotkeys for save/load
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeGame();
            } else if (this.currentGame) {
                // F5 for quick save
                if (e.key === 'F5') {
                    e.preventDefault();
                    this.quickSave();
                }
                // F8 for quick load
                else if (e.key === 'F8') {
                    e.preventDefault();
                    this.quickLoad();
                }
            }
        });

        // Save/Load buttons
        document.getElementById('quick-save').addEventListener('click', () => {
            this.quickSave();
        });

        document.getElementById('quick-load').addEventListener('click', () => {
            this.quickLoad();
        });

        document.getElementById('save-menu').addEventListener('click', () => {
            this.toggleSaveMenu();
        });
    }

    closeGame() {
        // Stop emulator if running
        if (this.emulator && typeof this.emulator.destroy === 'function') {
            try {
                this.emulator.destroy();
            } catch (error) {
                console.log('Error destroying emulator:', error);
            }
        }

        // Clear emulator container
        const emulatorEl = document.getElementById('emulator');
        emulatorEl.innerHTML = '';

        // Clear global EJS variables
        delete window.EJS_player;
        delete window.EJS_gameUrl;
        delete window.EJS_core;
        delete window.EJS_pathtodata;
        delete window.EJS_gameID;
        delete window.EJS_gameName;

        // Hide modal and save menu
        document.getElementById('game-modal').style.display = 'none';
        document.getElementById('save-load-menu').style.display = 'none';
        
        this.currentGame = null;
        this.emulator = null;
    }

    // Save state functionality
    async quickSave() {
        if (!this.emulator || !this.currentGame) return;
        
        try {
            // Get save state from EmulatorJS
            const saveData = await this.getSaveState();
            if (!saveData) {
                this.showNotification('No save data available', 'error');
                return;
            }

            await this.saveToSlot(1, saveData);
            this.showNotification('Quick saved to slot 1!', 'success');
        } catch (error) {
            console.error('Quick save failed:', error);
            this.showNotification('Quick save failed', 'error');
        }
    }

    async quickLoad() {
        if (!this.emulator || !this.currentGame) return;
        
        try {
            await this.loadFromSlot(1);
            this.showNotification('Quick loaded from slot 1!', 'success');
        } catch (error) {
            console.error('Quick load failed:', error);
            this.showNotification('Quick load failed - no save found', 'error');
        }
    }

    toggleSaveMenu() {
        const menu = document.getElementById('save-load-menu');
        if (menu.style.display === 'none' || !menu.style.display) {
            menu.style.display = 'block';
            this.loadSaveSlots();
        } else {
            menu.style.display = 'none';
        }
    }

    async loadSaveSlots() {
        if (!this.currentGame) return;

        try {
            const response = await fetch(`/api/games/${this.currentGame.id}/saves`);
            const saves = await response.json();

            // Update slot display
            for (let slot = 1; slot <= 3; slot++) {
                const timeEl = document.getElementById(`slot-${slot}-time`);
                const slotEl = document.querySelector(`[data-slot="${slot}"]`);
                
                const save = saves.find(s => s.slot === slot);
                if (save) {
                    const date = new Date(save.updated_at);
                    timeEl.textContent = date.toLocaleString();
                    slotEl.classList.add('has-save');
                } else {
                    timeEl.textContent = 'Empty';
                    slotEl.classList.remove('has-save');
                }
            }
        } catch (error) {
            console.error('Failed to load save slots:', error);
        }
    }

    async getSaveState() {
        return new Promise((resolve) => {
            if (window.EJS_player && this.emulator) {
                // Try to use EmulatorJS save state API
                if (typeof this.emulator.saveState === 'function') {
                    resolve(this.emulator.saveState());
                } else {
                    // Fallback: trigger save and capture data
                    window.EJS_onSaveState = (data) => {
                        resolve(data);
                    };
                    
                    // Simulate save key press
                    const event = new KeyboardEvent('keydown', { 
                        key: 'F2', 
                        code: 'F2',
                        which: 113,
                        keyCode: 113
                    });
                    document.dispatchEvent(event);
                    
                    // Timeout after 5 seconds
                    setTimeout(() => resolve(null), 5000);
                }
            } else {
                resolve(null);
            }
        });
    }

    async saveToSlot(slot, saveData = null) {
        if (!this.currentGame) return;

        try {
            // Get save data if not provided
            if (!saveData) {
                saveData = await this.getSaveState();
                if (!saveData) {
                    throw new Error('No save data available');
                }
            }

            const response = await fetch(`/api/games/${this.currentGame.id}/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    saveData: saveData,
                    slot: slot
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification(`Saved to slot ${slot}!`, 'success');
                this.loadSaveSlots(); // Refresh the display
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } catch (error) {
            console.error('Save failed:', error);
            this.showNotification(`Save to slot ${slot} failed`, 'error');
        }
    }

    async loadFromSlot(slot) {
        if (!this.currentGame) return;

        try {
            const response = await fetch(`/api/games/${this.currentGame.id}/load/${slot}`);
            if (!response.ok) {
                throw new Error('Save not found');
            }

            const save = await response.json();
            
            // Load save state into EmulatorJS
            if (this.emulator && save.save_data) {
                if (typeof this.emulator.loadState === 'function') {
                    this.emulator.loadState(save.save_data);
                } else {
                    // Fallback: use EmulatorJS callback
                    window.EJS_onLoadState = () => {
                        return save.save_data;
                    };
                    
                    // Simulate load key press
                    const event = new KeyboardEvent('keydown', { 
                        key: 'F4', 
                        code: 'F4',
                        which: 115,
                        keyCode: 115
                    });
                    document.dispatchEvent(event);
                }
                
                this.showNotification(`Loaded from slot ${slot}!`, 'success');
            }
        } catch (error) {
            console.error('Load failed:', error);
            throw error;
        }
    }

    async deleteSlot(slot) {
        if (!this.currentGame) return;

        if (!confirm(`Delete save in slot ${slot}?`)) return;

        try {
            const response = await fetch(`/api/games/${this.currentGame.id}/save/${slot}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification(`Slot ${slot} deleted!`, 'success');
                this.loadSaveSlots(); // Refresh the display
            } else {
                throw new Error(result.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            this.showNotification(`Delete slot ${slot} failed`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    closeSaveMenu() {
        document.getElementById('save-load-menu').style.display = 'none';
    }
}

// Global instance for HTML button calls
let gameServerInstance = null;

// Global functions for HTML button calls
window.saveToSlot = (slot) => {
    if (gameServerInstance) {
        gameServerInstance.saveToSlot(slot);
    }
};

window.loadFromSlot = (slot) => {
    if (gameServerInstance) {
        gameServerInstance.loadFromSlot(slot);
    }
};

window.deleteSlot = (slot) => {
    if (gameServerInstance) {
        gameServerInstance.deleteSlot(slot);
    }
};

window.closeSaveMenu = () => {
    if (gameServerInstance) {
        gameServerInstance.closeSaveMenu();
    }
};

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    gameServerInstance = new GameServer();
});