// Dashboard Script - UPDATED for your actual API
class DashboardManager {
    constructor() {
        this.API_BASE_URL = 'https://api-happy-production.up.railway.app';
        this.userToken = null;
        this.userData = null;
        this.servers = [];
        this.currentServer = null;
        
        this.init();
    }

    async init() {
        // Get token from URL
        this.userToken = this.getTokenFromURL();
        
        if (!this.userToken) {
            this.showError('No authentication token found. Please login again.');
            setTimeout(() => window.location.href = '/', 3000);
            return;
        }

        try {
            // Verify token with backend first
            const isValid = await this.verifyToken();
            if (!isValid) {
                this.showError('Invalid or expired token. Please login again.');
                setTimeout(() => window.location.href = '/', 3000);
                return;
            }

            // Load user data and servers
            await this.loadUserData();
            await this.loadServers();
            
            // Hide loading screen
            setTimeout(() => {
                document.getElementById('loadingOverlay').style.display = 'none';
                document.getElementById('dashboardContainer').style.display = 'block';
            }, 500);
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to connect to server. Please try again.');
        }
    }

    async verifyToken() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/verify-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.userToken}`
                },
                body: JSON.stringify({ token: this.userToken })
            });
            return response.ok;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }

    getTokenFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || localStorage.getItem('dashboard_token');
        if (token) {
            localStorage.setItem('dashboard_token', token);
        }
        return token;
    }

    async loadUserData() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                // Try alternative endpoint
                const altResponse = await fetch(`${this.API_BASE_URL}/api/user`, {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!altResponse.ok) {
                    throw new Error('Failed to fetch user data from API');
                }
                
                this.userData = await altResponse.json();
            } else {
                this.userData = await response.json();
            }

            // Ensure avatar URL is properly formatted
            this.formatUserAvatar();
            this.displayUserData();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Failed to load user profile. Trying fallback...');
            
            // Fallback - try to get basic info from token
            this.userData = this.getFallbackUserData();
            this.displayUserData();
        }
    }

    formatUserAvatar() {
        if (!this.userData) return;
        
        if (this.userData.avatar_url) {
            // Already has full URL
            return;
        } else if (this.userData.avatar) {
            // Has Discord avatar hash
            if (this.userData.avatar.startsWith('http')) {
                this.userData.avatar_url = this.userData.avatar;
            } else if (this.userData.id) {
                this.userData.avatar_url = `https://cdn.discordapp.com/avatars/${this.userData.id}/${this.userData.avatar}.png`;
            }
        } else if (this.userData.discriminator) {
            // Use default Discord avatar
            const defaultAvatar = parseInt(this.userData.discriminator) % 5;
            this.userData.avatar_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
        }
    }

    getFallbackUserData() {
        // Extract username from token if possible
        let username = 'User';
        try {
            const tokenParts = this.userToken.split('.');
            if (tokenParts[1]) {
                const payload = JSON.parse(atob(tokenParts[1]));
                if (payload.username) username = payload.username;
            }
        } catch (e) {
            console.log('Could not parse token');
        }
        
        return {
            id: 'unknown_' + Date.now(),
            username: username,
            discriminator: '0000',
            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
            email: 'user@example.com'
        };
    }

    displayUserData() {
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');

        if (this.userData) {
            const displayName = this.userData.global_name || 
                               this.userData.username || 
                               'Discord User';
            
            const discriminator = this.userData.discriminator ? 
                                 `#${this.userData.discriminator}` : '';
            
            userName.textContent = `${displayName}${discriminator}`;
            userEmail.textContent = this.userData.email || 
                                   this.userData.username || 
                                   'Bot Dashboard User';
            
            // Set avatar with error handling
            const avatarUrl = this.userData.avatar_url || 
                             this.userData.avatar || 
                             'https://cdn.discordapp.com/embed/avatars/0.png';
            
            userAvatar.innerHTML = `
                <img src="${avatarUrl}" 
                     alt="User Avatar" 
                     onerror="this.onerror=null; 
                             this.src='https://cdn.discordapp.com/embed/avatars/0.png';
                             this.style.opacity='0.7'">
            `;
        }
    }

    async loadServers() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/guilds`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                // Try alternative endpoints
                const endpoints = ['/api/guilds', '/servers', '/api/servers'];
                for (const endpoint of endpoints) {
                    const altResponse = await fetch(`${this.API_BASE_URL}${endpoint}`, {
                        headers: {
                            'Authorization': `Bearer ${this.userToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (altResponse.ok) {
                        this.servers = await altResponse.json();
                        this.formatServerIcons();
                        this.displayServers();
                        return;
                    }
                }
                throw new Error('No valid servers endpoint found');
            }

            this.servers = await response.json();
            this.formatServerIcons();
            this.displayServers();
            
        } catch (error) {
            console.error('Error loading servers:', error);
            this.showError('Could not load servers. Using demo data...');
            this.servers = this.getMockServers();
            this.displayServers();
        }
    }

    formatServerIcons() {
        this.servers = this.servers.map(server => {
            if (!server.icon_url && server.icon) {
                if (server.icon.startsWith('http')) {
                    server.icon_url = server.icon;
                } else if (server.id) {
                    server.icon_url = `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`;
                }
            } else if (!server.icon_url) {
                server.icon_url = null;
            }
            return server;
        });
    }

    displayServers() {
        const serversList = document.getElementById('serversList');
        if (!serversList) return;
        
        serversList.innerHTML = '';

        if (!this.servers || this.servers.length === 0) {
            serversList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #888;">
                    <p>No servers available</p>
                    <small>Make sure you have server management permissions</small>
                </div>
            `;
            return;
        }

        this.servers.forEach((server, index) => {
            const serverElement = document.createElement('div');
            serverElement.className = 'server-item';
            serverElement.dataset.serverId = server.id;
            serverElement.title = server.name;
            
            if (index === 0) {
                serverElement.classList.add('active');
                this.selectServer(server);
            }

            // Server avatar with fallback
            let avatarHTML = '🏠';
            if (server.icon_url) {
                avatarHTML = `
                    <img src="${server.icon_url}" 
                         alt="${server.name}"
                         onerror="this.onerror=null; 
                                 this.parentElement.innerHTML='🏠';
                                 this.parentElement.style.fontSize='20px'">
                `;
            }

            const botStatus = server.botJoined !== false ? 
                '<div style="color: #57F287; font-size: 12px;">✓</div>' : 
                '<div style="color: #ED4245; font-size: 12px;">✗</div>';

            serverElement.innerHTML = `
                <div class="server-avatar" style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #2f3136;">
                    ${avatarHTML}
                </div>
                <div class="server-name" style="flex: 1; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${server.name}
                </div>
                ${botStatus}
            `;

            serverElement.addEventListener('click', () => {
                document.querySelectorAll('.server-item').forEach(item => {
                    item.classList.remove('active');
                });
                serverElement.classList.add('active');
                this.selectServer(server);
            });

            serversList.appendChild(serverElement);
        });
    }

    selectServer(server) {
        this.currentServer = server;
        
        // Show server content
        const noServerSelected = document.getElementById('noServerSelected');
        const serverContent = document.getElementById('serverContent');
        
        if (noServerSelected) noServerSelected.style.display = 'none';
        if (serverContent) serverContent.style.display = 'block';
        
        // Update server stats
        const memberCountEl = document.getElementById('memberCount');
        const onlineCountEl = document.getElementById('onlineCount');
        
        if (memberCountEl) memberCountEl.textContent = server.member_count || server.memberCount || 'N/A';
        if (onlineCountEl) onlineCountEl.textContent = server.online_count || server.onlineCount || 'N/A';
        
        // Load server-specific settings
        this.updateServerSettings(server);
    }

    async updateServerSettings(server) {
        if (!server.id) return;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/guild/${server.id}/settings`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const settings = await response.json();
                this.updateSettingsUI(settings);
            }
        } catch (error) {
            console.log('Could not load server settings:', error);
        }
    }

    updateSettingsUI(settings) {
        // Update toggle switches based on loaded settings
        if (settings.welcomeEnabled !== undefined) {
            const toggle = document.getElementById('welcomeToggle');
            if (toggle) toggle.checked = settings.welcomeEnabled;
        }
        // Add more settings updates as needed
    }

    getMockServers() {
        return [
            {
                id: 'demo_1',
                name: 'Gaming Community',
                icon_url: null,
                member_count: 2500,
                online_count: 850,
                botJoined: true
            },
            {
                id: 'demo_2',
                name: 'Development Hub',
                icon_url: null,
                member_count: 1200,
                online_count: 320,
                botJoined: true
            }
        ];
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) {
            // Create error div if it doesn't exist
            const newErrorDiv = document.createElement('div');
            newErrorDiv.id = 'errorMessage';
            newErrorDiv.style.cssText = `
                background: #ED4245;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                margin: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0 0 0 10px;
            `;
            closeBtn.onclick = () => newErrorDiv.style.display = 'none';
            
            newErrorDiv.innerHTML = `<span>${message}</span>`;
            newErrorDiv.appendChild(closeBtn);
            
            document.body.prepend(newErrorDiv);
            setTimeout(() => newErrorDiv.style.display = 'none', 5000);
        } else {
            errorDiv.querySelector('span').textContent = message;
            errorDiv.style.display = 'flex';
            setTimeout(() => errorDiv.style.display = 'none', 5000);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing dashboard...');
    window.dashboard = new DashboardManager();
});

// Logout function
function logout() {
    localStorage.removeItem('dashboard_token');
    sessionStorage.clear();
    // Call logout endpoint if available
    fetch('https://api-happy-production.up.railway.app/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${window.dashboard?.userToken}`
        }
    }).finally(() => {
        window.location.href = '/';
    });
}

// Handle toggle switches - send updates to API
document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.id.includes('Toggle')) {
        const setting = e.target.id.replace('Toggle', '');
        const value = e.target.checked;
        
        if (window.dashboard?.currentServer?.id) {
            // Send setting update to API
            fetch(`https://api-happy-production.up.railway.app/guild/${window.dashboard.currentServer.id}/settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.dashboard.userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    [setting]: value
                })
            }).then(response => {
                if (!response.ok) {
                    console.error('Failed to update setting');
                    e.target.checked = !value; // Revert on error
                }
            });
        }
        
        console.log(`Setting ${setting} changed to: ${value}`);
    }
});

// Add this for debugging - shows API responses
if (window.location.search.includes('debug')) {
    window.debugDashboard = {
        getToken: () => window.dashboard?.userToken,
        getUser: () => window.dashboard?.userData,
        getServers: () => window.dashboard?.servers,
        getCurrentServer: () => window.dashboard?.currentServer
    };
    console.log('Debug mode enabled. Use debugDashboard in console.');
}
