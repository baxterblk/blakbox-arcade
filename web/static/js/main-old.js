class GameServer {
    constructor() {
        this.currentUser = null;
        this.games = [];
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
        systemEl.textContent = `System: ${game.system}`;

        const playBtn = document.createElement('button');
        playBtn.className = 'btn btn-game';
        playBtn.textContent = 'Play Game';
        playBtn.onclick = () => this.launchGame(game);

        cardEl.appendChild(titleEl);
        cardEl.appendChild(systemEl);
        cardEl.appendChild(playBtn);

        return cardEl;
    }

    launchGame(game) {
        const modal = document.getElementById('game-modal');
        const gameTitle = document.getElementById('game-title');
        const emulatorEl = document.getElementById('emulator');

        gameTitle.textContent = game.title;
        modal.style.display = 'flex';

        // For now, show a placeholder message
        // EmulatorJS integration will be added in the next phase
        emulatorEl.innerHTML = `
            <div style="text-align: center; color: white; padding: 50px;">
                <h3>Game: ${game.title}</h3>
                <p>System: ${game.system}</p>
                <p>EmulatorJS integration will be available in the next phase.</p>
                <p>ROM file: ${game.filename}</p>
            </div>
        `;

        // Record play session start
        this.recordPlaySession(game.id);
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
            document.getElementById('game-modal').style.display = 'none';
        });

        // Close modal when clicking outside
        document.getElementById('game-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                document.getElementById('game-modal').style.display = 'none';
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('game-modal').style.display = 'none';
            }
        });
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GameServer();
});