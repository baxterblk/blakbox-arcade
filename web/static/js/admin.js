class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.series = [];
        this.games = [];
        this.users = [];
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        await this.loadStats();
        await this.loadSeries();
        await this.loadGames();
        await this.loadUsers();
        this.setupSeriesForm();
        loadSeries();
        setupFileAutoPopulate();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/user');
            if (response.ok) {
                this.currentUser = await response.json();
                if (this.currentUser.role !== 'admin') {
                    window.location.href = '/games';
                    return;
                }
                document.getElementById('username-display').textContent = `Welcome, ${this.currentUser.username}`;
            } else {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login';
        }
    }

    setupEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.admin-tab');
        
        tabs.forEach((tab) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

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

        // Series form
        document.getElementById('series-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createSeries();
        });

        // Upload form
        document.getElementById('upload-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadGame();
        });
    }

    switchTab(tabName) {
        // Update tab buttons with smooth transition
        const allTabs = document.querySelectorAll('.admin-tab');
        allTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTabButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTabButton) {
            activeTabButton.classList.add('active');
        }

        // Update tab content with fade effect
        const allContent = document.querySelectorAll('.tab-content');
        allContent.forEach(content => {
            content.style.opacity = '0';
            setTimeout(() => {
                content.classList.remove('active');
            }, 150);
        });
        
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            setTimeout(() => {
                activeContent.classList.add('active');
                activeContent.style.opacity = '1';
            }, 150);
        }

        // Load data if needed
        if (tabName === 'upload') {
            setTimeout(() => this.loadSeries(), 200);
        } else if (tabName === 'users') {
            setTimeout(() => this.loadUsers(), 200);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/stats');
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('stat-users').textContent = stats.totalUsers;
                document.getElementById('stat-series').textContent = stats.totalSeries;
                document.getElementById('stat-games').textContent = stats.totalGames;
                document.getElementById('stat-enabled').textContent = stats.enabledGames;
                document.getElementById('stat-sessions').textContent = stats.totalSessions;
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async loadSeries() {
        try {
            const response = await fetch('/api/admin/series');
            if (response.ok) {
                this.series = await response.json();
                this.renderSeries();
                this.populateSeriesSelect();
            }
        } catch (error) {
            console.error('Failed to load series:', error);
        }
    }

    renderSeries() {
        const seriesList = document.getElementById('series-list');
        
        if (this.series.length === 0) {
            seriesList.innerHTML = '<p>No series created yet.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'games-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Sort Order</th>
                    <th>Games Count</th>
                </tr>
            </thead>
            <tbody>
                ${this.series.map(series => `
                    <tr>
                        <td><strong>${series.name}</strong></td>
                        <td>${series.description || 'No description'}</td>
                        <td>${series.sort_order}</td>
                        <td>-</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        seriesList.innerHTML = '';
        seriesList.appendChild(table);
    }

    populateSeriesSelect() {
        const select = document.getElementById('game-series');
        select.innerHTML = '<option value="">Select Series...</option>';
        
        this.series.forEach(series => {
            const option = document.createElement('option');
            option.value = series.id;
            option.textContent = series.name;
            select.appendChild(option);
        });
    }

    async createSeries() {
        try {
            const formData = new FormData(document.getElementById('series-form'));
            const data = Object.fromEntries(formData);

            const response = await fetch('/api/admin/series', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('Series created successfully!', 'success');
                document.getElementById('series-form').reset();
                await this.loadSeries();
                await this.loadStats();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to create series', 'error');
            }
        } catch (error) {
            console.error('Create series error:', error);
            this.showAlert('Failed to create series', 'error');
        }
    }

    async uploadGame() {
        try {
            const form = document.getElementById('upload-form');
            const formData = new FormData(form);
            const progressBar = document.querySelector('.upload-progress');
            const progressFill = document.querySelector('.upload-progress-bar');

            progressBar.style.display = 'block';
            progressFill.style.width = '0%';

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressFill.style.width = percentComplete + '%';
                }
            });

            xhr.addEventListener('load', () => {
                progressBar.style.display = 'none';
                
                if (xhr.status === 200) {
                    const result = JSON.parse(xhr.responseText);
                    this.showAlert(`Game uploaded successfully! System detected: ${result.system}`, 'success');
                    form.reset();
                    this.loadStats();
                    this.loadGames();
                } else {
                    const error = JSON.parse(xhr.responseText);
                    this.showAlert(error.error || 'Upload failed', 'error');
                }
            });

            xhr.addEventListener('error', () => {
                progressBar.style.display = 'none';
                this.showAlert('Upload failed', 'error');
            });

            xhr.open('POST', '/api/games/upload');
            xhr.send(formData);

        } catch (error) {
            console.error('Upload error:', error);
            this.showAlert('Upload failed', 'error');
        }
    }

    async loadGames() {
        try {
            const response = await fetch('/api/games');
            if (response.ok) {
                this.games = await response.json();
                this.renderGames();
            }
        } catch (error) {
            console.error('Failed to load games:', error);
        }
    }

    renderGames() {
        const gamesList = document.getElementById('games-list');
        
        if (this.games.length === 0) {
            gamesList.innerHTML = '<p>No games uploaded yet.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'games-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Series</th>
                    <th>System</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${this.games.map(game => `
                    <tr>
                        <td><strong>${game.title}</strong></td>
                        <td>${game.series_name || 'No Series'}</td>
                        <td>${game.system.toUpperCase()}</td>
                        <td>
                            <span class="status-${game.enabled ? 'enabled' : 'disabled'}">
                                ${game.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </td>
                        <td>${new Date(game.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-small ${game.enabled ? 'btn-danger' : 'btn-success'}" 
                                    onclick="adminPanel.toggleGame(${game.id})">
                                ${game.enabled ? 'Disable' : 'Enable'}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        gamesList.innerHTML = '';
        gamesList.appendChild(table);
    }

    async toggleGame(gameId) {
        try {
            const response = await fetch(`/api/games/${gameId}/toggle`, {
                method: 'PATCH'
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert(`Game ${result.enabled ? 'enabled' : 'disabled'} successfully!`, 'success');
                await this.loadGames();
                await this.loadStats();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to toggle game', 'error');
            }
        } catch (error) {
            console.error('Toggle game error:', error);
            this.showAlert('Failed to toggle game', 'error');
        }
    }

    showAlert(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Add to body
        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    showLoading(element, text = 'Loading...') {
        const spinner = document.createElement('span');
        spinner.className = 'loading-spinner';
        element.innerHTML = `${text} `;
        element.appendChild(spinner);
    }

    // User Management Methods
    async loadUsers() {
        console.log("loadUsers called");
        try {
            const response = await fetch("/api/admin/users", { credentials: "include" });
            if (response.ok) {
                const data = await response.json();
                this.users = data.users;
                this.updateUserStats(data.stats);
                this.renderUsers();
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    updateUserStats(stats) {
        document.getElementById('total-users').textContent = stats.totalUsers;
        document.getElementById('active-today').textContent = stats.activeToday;
        document.getElementById('total-saves').textContent = stats.totalSaves;
        document.getElementById('total-sessions').textContent = stats.totalSessions;
    }

    renderUsers() {
        const usersList = document.getElementById('users-list');
        
        if (this.users.length === 0) {
            usersList.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No users found.</td></tr>';
            return;
        }

        usersList.innerHTML = this.users.map(user => `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>${user.email || 'N/A'}</td>
                <td>
                    <span class="role-badge ${user.role}">
                        ${user.role.toUpperCase()}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>${user.games_played || 0}</td>
                <td>${user.total_saves || 0}</td>
                <td>
                    <span class="status-badge ${user.enabled ? 'active' : 'disabled'}">
                        ${user.enabled ? 'Active' : 'Disabled'}
                    </span>
                </td>
                <td class="action-buttons">
                    <button onclick="adminPanel.toggleUser(${user.id})" class="btn btn-small ${user.enabled ? 'btn-danger' : 'btn-success'}">
                        ${user.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="adminPanel.resetPassword(${user.id})" class="btn btn-small btn-secondary">
                        Reset Pass
                    </button>
                    ${user.id !== this.currentUser.id ? `
                        <button onclick="adminPanel.deleteUser(${user.id}, '${user.username}')" class="btn btn-small btn-danger">
                            Delete
                        </button>
                    ` : '<span style="color: #666; font-size: 0.8em;">Current User</span>'}
                </td>
            </tr>
        `).join('');
    }

    async toggleUser(userId) {
        if (!confirm('Toggle user status? This will affect their ability to login.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}/toggle`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert(result.message, 'success');
                await this.loadUsers();
        this.setupSeriesForm();
        loadSeries();
        setupFileAutoPopulate();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to toggle user status', 'error');
            }
        } catch (error) {
            console.error('Toggle user error:', error);
            this.showAlert('Failed to toggle user status', 'error');
        }
    }

    async resetPassword(userId) {
        if (!confirm('Reset user password? This will generate a new temporary password.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                
                // Show password in a modal or alert
                const message = `Password reset for ${result.username}:\n\nTemporary Password: ${result.tempPassword}\n\nPlease provide this to the user and ask them to change it upon next login.`;
                alert(message);
                
                this.showAlert('Password reset successfully!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to reset password', 'error');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            this.showAlert('Failed to reset password', 'error');
        }
    }

    setupSeriesForm() {
        const seriesForm = document.getElementById("series-form");
        if (seriesForm) {
            seriesForm.addEventListener("submit", (e) => {
                e.preventDefault();
                createSeries();
            });
        }
    }

    async deleteUser(userId, username) {
        const confirmMessage = `DELETE USER: ${username}\n\nThis will permanently delete:\n- User account\n- All save states\n- All play session data\n\nThis action CANNOT be undone!\n\nType "DELETE" to confirm:`;
        
        const confirmation = prompt(confirmMessage);
        if (confirmation !== 'DELETE') {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert(result.message, 'success');
                await this.loadUsers();
        this.setupSeriesForm();
        loadSeries();
        setupFileAutoPopulate();
                await this.loadStats(); // Update overall stats
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to delete user', 'error');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            this.showAlert('Failed to delete user', 'error');
        }
    }
}

// Initialize admin panel
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
// Create User Modal Functions
function showCreateUserModal() {
    document.getElementById("create-user-modal").style.display = "block";
}

function closeCreateUserModal() {
    document.getElementById("create-user-modal").style.display = "none";
    document.getElementById("create-user-form").reset();
}

// Handle create user form submission
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("create-user-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const userData = {
            username: document.getElementById("new-username").value,
            email: document.getElementById("new-email").value,
            password: document.getElementById("new-password").value,
            role: document.getElementById("new-role").value
        };
        
        try {
            const response = await fetch("/api/admin/users/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(userData)
            });
            
            if (response.ok) {
                alert("User created successfully!");
                closeCreateUserModal();
                loadUsers(); // Reload user list
            } else {
                const error = await response.json();
                alert("Error: " + error.error);
            }
        } catch (error) {
            alert("Error creating user: " + error.message);
        }
    });
});

// Series Management Functions
async function createSeries() {
    const name = document.getElementById("series-name").value;
    const description = document.getElementById("series-description").value;
    const sort_order = document.getElementById("series-order").value;
    
    if (!name) {
        alert("Series name is required!");
        return;
    }
    
    try {
        const response = await fetch("/api/admin/series", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, description, sort_order: parseInt(sort_order) || 0 })
        });
        
        if (response.ok) {
            alert("Series created successfully!");
            document.getElementById("series-name").value = "";
            document.getElementById("series-description").value = "";
            document.getElementById("series-order").value = "0";
            loadSeries();
        } else {
            const error = await response.json();
            alert("Error: " + error.error);
        }
    } catch (error) {
        alert("Error creating series: " + error.message);
    }
}

// Load series into dropdown

async function loadSeries() {
    try {
        const response = await fetch("/api/series", { credentials: "include" });
        const series = await response.json();
        
        // Update series dropdown in upload tab
        const seriesSelect = document.getElementById("game-series");
        if (seriesSelect) {
            seriesSelect.innerHTML = "<option value=\"\">Select Series...</option>";
            series.forEach(s => {
                const option = document.createElement("option");
                option.value = s.id;
                option.textContent = s.name;
                seriesSelect.appendChild(option);
            });
        }
        
        // Update series list in series tab
        const seriesList = document.getElementById("series-list");
        if (seriesList) {
            if (series.length === 0) {
                seriesList.innerHTML = "<p>No series created yet.</p>";
            } else {
                seriesList.innerHTML = series.map(s => 
                    `<div class="series-item">
                        <strong>${s.name}</strong>
                        ${s.description ? ": " + s.description : ""}
                        <span class="series-order">(Order: ${s.sort_order || 0})</span>
                    </div>`
                ).join("");
            }
        }
    } catch (error) {
        console.error("Error loading series:", error);
        const seriesList = document.getElementById("series-list");
        if (seriesList) {
            seriesList.innerHTML = "<p>Error loading series. Please check console.</p>";
        }
    }
}
// Auto-populate from filename
function setupFileAutoPopulate() {
    const fileInput = document.getElementById("game-file");
    if (fileInput) {
        fileInput.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                let baseName = file.name.replace(/\.[^/.]+$/, "")
                    .replace(/\([^)]*\)/g, "")
                    .replace(/\[[^\]]*\]/g, "")
                    .replace(/_/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                
                // Clean up the title
                const titleInput = document.getElementById("game-title");
                if (!titleInput.value) {
                    titleInput.value = baseName.split(" ")
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(" ");
                }
                
                // Auto-detect series based on filename
                const seriesSelect = document.getElementById("game-series");
                if (seriesSelect) {
                    const lowerName = baseName.toLowerCase();
                    
                    // Auto-detect based on file extension and game name
                    if (file.name.toLowerCase().includes("n64") || file.name.toLowerCase().endsWith(".z64")) {
                        // Nintendo 64 games
                        Array.from(seriesSelect.options).forEach(option => {
                            if (option.text.toLowerCase().includes("nintendo")) {
                                seriesSelect.value = option.value;
                            }
                        });
                    }
                    
                    // GoldenEye specific detection
                    if (lowerName.includes("goldeneye") || lowerName.includes("007")) {
                        Array.from(seriesSelect.options).forEach(option => {
                            if (option.text.toLowerCase().includes("shoot")) {
                                seriesSelect.value = option.value;
                            }
                        });
                    }
                    
                    // Other series detection
                    if (lowerName.includes("mario") || lowerName.includes("zelda") || lowerName.includes("metroid")) {
                        Array.from(seriesSelect.options).forEach(option => {
                            if (option.text.toLowerCase().includes("nintendo")) {
                                seriesSelect.value = option.value;
                            }
                        });
                    }
                    
                    if (lowerName.includes("sonic") || lowerName.includes("streets of rage")) {
                        Array.from(seriesSelect.options).forEach(option => {
                            if (option.text.toLowerCase().includes("sega")) {
                                seriesSelect.value = option.value;
                            }
                        });
                    }
                    
                    if (lowerName.includes("street fighter") || lowerName.includes("mortal kombat") || lowerName.includes("tekken")) {
                        Array.from(seriesSelect.options).forEach(option => {
                            if (option.text.toLowerCase().includes("fighting")) {
                                seriesSelect.value = option.value;
                            }
                        });
                    }
                }
                
                // Auto-suggest description
                const descInput = document.getElementById("game-description");
                if (descInput && !descInput.value) {
                    let system = "Game";
                    if (file.name.toLowerCase().includes("n64") || file.name.toLowerCase().endsWith(".z64")) {
                        system = "Nintendo 64";
                    }
                    descInput.value = "Classic " + system + " game: " + titleInput.value;
                }
            }
        });
    }
}
