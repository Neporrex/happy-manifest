// Dashboard Script
class DashboardManager {
    constructor() {
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
            this.showError('Failed to load dashboard data. Please try again.');
        }
    }

    getTokenFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token');
    }

    async loadUserData() {
        try {
            // Replace this with your actual API endpoint
            const response = await fetch('/api/user', {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            this.userData = await response.json();
            this.displayUserData();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            // Fallback to mock data for demonstration
            this.userData = {
                id: '123456789',
                username: 'DemoUser',
                discriminator: '0001',
                email: 'user@example.com',
                avatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
            };
            this.displayUserData();
        }
    }

    displayUserData() {
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');

        if (this.userData) {
            userName.textContent = `${this.userData.username}#${this.userData.discriminator}`;
            userEmail.textContent = this.userData.email || 'Discord User';
            
            // Set avatar
            if (this.userData.avatar) {
                const avatarUrl = this.userData.avatar.startsWith('http') 
                    ? this.userData.avatar 
                    : `https://cdn.discordapp.com/avatars/${this.userData.id}/${this.userData.avatar}.png`;
                
                userAvatar.innerHTML = `<img src="${avatarUrl}" alt="User Avatar" onerror="this.onerror=null; this.parentElement.innerHTML='👤';">`;
            } else {
                userAvatar.innerHTML = '👤';
            }
        }
    }

    async loadServers() {
        try {
            // Replace this with your actual API endpoint
            const response = await fetch('/api/servers', {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.servers = await response.json();
            } else {
                // Fallback to mock data for demonstration
                this.servers = this.getMockServers();
            }

            this.displayServers();
            
        } catch (error) {
            console.error('Error loading servers:', error);
            this.servers = this.getMockServers();
            this.displayServers();
        }
    }

    displayServers() {
        const serversList = document.getElementById('serversList');
        serversList.innerHTML = '';

        if (this.servers.length === 0) {
            serversList.innerHTML = '<p style="color: #888; text-align: center;">No servers found</p>';
            return;
        }

        this.servers.forEach((server, index) => {
            const serverElement = document.createElement('div');
            serverElement.className = 'server-item';
            serverElement.dataset.serverId = server.id;
            
            if (index === 0) {
                serverElement.classList.add('active');
                this.selectServer(server);
            }

            // Server avatar with fallback
            let avatarHTML;
            if (server.icon) {
                const iconUrl = server.icon.startsWith('http') 
                    ? server.icon 
                    : `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`;
                avatarHTML = `<img src="${iconUrl}" alt="${server.name}" onerror="this.onerror=null; this.parentElement.innerHTML='🏠';">`;
            } else {
                avatarHTML = '🏠';
            }

            serverElement.innerHTML = `
                <div class="server-avatar">${avatarHTML}</div>
                <div class="server-name">${server.name}</div>
                <div style="color: #57F287; font-size: 12px;">✓</div>
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
        document.getElementById('noServerSelected').style.display = 'none';
        document.getElementById('serverContent').style.display = 'block';
        
        // Update server stats
        document.getElementById('memberCount').textContent = server.memberCount || '2500';
        document.getElementById('onlineCount').textContent = server.onlineCount || '850';
        
        // Update server-specific settings
        this.updateServerSettings(server);
    }

    updateServerSettings(server) {
        // You can load server-specific settings here
        console.log('Selected server:', server);
        
        // Example: Load server settings from API
        // fetch(`/api/server/${server.id}/settings`, {...})
    }

    getMockServers() {
        return [
            {
                id: '1',
                name: 'Gaming Community',
                icon: null,
                memberCount: 2500,
                onlineCount: 850,
                botJoined: true
            },
            {
                id: '2',
                name: 'Development Hub',
                icon: 'development_icon',
                memberCount: 1200,
                onlineCount: 320,
                botJoined: true
            },
            {
                id: '3',
                name: 'Music Lovers',
                icon: null,
                memberCount: 800,
                onlineCount: 150,
                botJoined: true
            },
            {
                id: '4',
                name: 'Artists Collective',
                icon: 'art_icon',
                memberCount: 500,
                onlineCount: 90,
                botJoined: false
            }
        ];
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
});

// Logout function
function logout() {
    // Clear token and redirect
    localStorage.removeItem('discord_token');
    sessionStorage.clear();
    window.location.href = '/';
}

// Handle toggle switches
document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.id.includes('Toggle')) {
        const setting = e.target.id.replace('Toggle', '');
        const value = e.target.checked;
        
        console.log(`Setting ${setting} changed to: ${value}`);
        
        // Here you would typically send this to your API
        // fetch('/api/settings', {
        //     method: 'POST',
        //     headers: {'Content-Type': 'application/json'},
        //     body: JSON.stringify({ setting, value })
        // });
    }
});
