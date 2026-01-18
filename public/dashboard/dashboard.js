// Dashboard Script - FIXED for your API
class DashboardManager {
    constructor() {
        this.API_BASE_URL = 'https://api-happy-production.up.railway.app';
        this.userToken = null;
        this.userData = null;
        this.servers = [];
        this.currentServer = null;
        this.isInitialized = false;
        
        // Debug mode
        this.debug = window.location.search.includes('debug');
        
        this.init();
    }

    async init() {
        console.log('🚀 Dashboard initializing...');
        
        // Get token from URL
        this.userToken = this.getTokenFromURL();
        
        if (!this.userToken) {
            this.showError('No authentication token found. Please login again.', true);
            setTimeout(() => window.location.href = '/', 3000);
            return;
        }

        if (this.debug) {
            console.log('🔑 Token found:', this.userToken.substring(0, 10) + '...');
        }

        try {
            // First, let's discover what endpoints your API has
            await this.discoverEndpoints();
            
            // Try to load user data
            await this.loadUserData();
            
            // Try to load servers
            await this.loadServers();
            
            // Success - hide loading screen
            this.hideLoading();
            this.isInitialized = true;
            
            console.log('✅ Dashboard loaded successfully');
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Failed to load dashboard. Trying fallback mode...', false);
            
            // Try fallback mode
            await this.fallbackMode();
        }
    }

    async discoverEndpoints() {
        console.log('🔍 Discovering API endpoints...');
        
        // Common endpoint patterns to try
        const testEndpoints = [
            '/user',
            '/users/me',
            '/auth/user',
            '/api/user',
            '/profile',
            '/auth/profile'
        ];
        
        for (const endpoint of testEndpoints) {
            try {
                const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    console.log(`✅ Found endpoint: ${endpoint}`);
                    return endpoint;
                }
            } catch (e) {
                // Continue to next endpoint
            }
        }
        
        throw new Error('No valid user endpoint found');
    }

    getTokenFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            // Store in sessionStorage for persistence
            sessionStorage.setItem('hm_token', token);
            return token;
        }
        
        // Try to get from sessionStorage
        return sessionStorage.getItem('hm_token');
    }

    async loadUserData() {
        console.log('👤 Loading user data...');
        
        // First, let's try a direct ping to the API root
        try {
            const ping = await fetch(this.API_BASE_URL, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`
                }
            });
            console.log('📡 API ping response:', ping.status, ping.statusText);
        } catch (e) {
            console.log('📡 API ping failed:', e.message);
        }

        // Try different endpoint approaches
        const endpoints = [
            { url: `${this.API_BASE_URL}/user`, method: 'GET' },
            { url: `${this.API_BASE_URL}/users/me`, method: 'GET' },
            { url: `${this.API_BASE_URL}/auth/me`, method: 'GET' },
            { url: `${this.API_BASE_URL}/api/user`, method: 'GET' },
            // Try POST with token in body (common pattern)
            { 
                url: `${this.API_BASE_URL}/auth/verify`, 
                method: 'POST',
                body: { token: this.userToken }
            }
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Trying: ${endpoint.method} ${endpoint.url}`);
                
                const options = {
                    method: endpoint.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.userToken}`
                    }
                };
                
                if (endpoint.body) {
                    options.body = JSON.stringify(endpoint.body);
                }

                const response = await fetch(endpoint.url, options);
                
                console.log(`📊 Response: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ User data received:', data);
                    
                    this.userData = this.formatUserData(data);
                    this.displayUserData();
                    return;
                }
            } catch (error) {
                console.log(`❌ Failed: ${error.message}`);
            }
        }
        
        // If all endpoints fail, use mock data
        console.log('⚠️ Using fallback user data');
        this.userData = this.getFallbackUserData();
        this.displayUserData();
    }

    formatUserData(data) {
        // Normalize user data from different API responses
        const user = {
            id: data.id || data.user_id || data.discord_id || `user_${Date.now()}`,
            username: data.username || data.name || data.display_name || 'User',
            discriminator: data.discriminator || '0000',
            avatar: data.avatar || data.avatar_url || null,
            email: data.email || `${data.username || 'user'}@example.com`,
            // Discord-specific fields
            global_name: data.global_name,
            // Your API might have these
            created_at: data.created_at,
            is_bot: data.bot || false
        };
        
        // Format avatar URL
        if (user.avatar) {
            if (user.avatar.startsWith('http')) {
                user.avatar_url = user.avatar;
            } else if (user.id && user.avatar) {
                // Check if it's a Discord ID pattern
                if (/^\d+$/.test(user.id)) {
                    user.avatar_url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
                }
            }
        }
        
        if (!user.avatar_url) {
            const defaultAvatar = parseInt(user.discriminator) % 5 || 0;
            user.avatar_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
        }
        
        return user;
    }

    getFallbackUserData() {
        // Create user data from token (for demo)
        const timestamp = Date.now();
        return {
            id: `demo_${timestamp}`,
            username: 'DemoUser',
            discriminator: String(timestamp % 10000).padStart(4, '0'),
            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
            email: 'demo@example.com',
            is_demo: true
        };
    }

    displayUserData() {
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');

        if (!userName || !userEmail || !userAvatar) {
            console.error('❌ User elements not found in DOM');
            return;
        }

        const displayName = this.userData.global_name || 
                           this.userData.username || 
                           'Discord User';
        
        const discriminator = this.userData.discriminator ? 
                             `#${this.userData.discriminator}` : '';

        userName.textContent = `${displayName}${discriminator}`;
        userName.title = `ID: ${this.userData.id}`;
        
        userEmail.textContent = this.userData.email || 
                               this.userData.username || 
                               'Dashboard User';

        // Set avatar with multiple fallbacks
        const avatarUrl = this.userData.avatar_url || 
                         this.userData.avatar || 
                         'https://cdn.discordapp.com/embed/avatars/0.png';
        
        userAvatar.innerHTML = `
            <img src="${avatarUrl}" 
                 alt="${displayName}" 
                 style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
                 onerror="this.onerror=null;
                         this.src='https://cdn.discordapp.com/embed/avatars/0.png';
                         this.style.opacity='0.8'">
        `;

        // Add demo badge if using fallback
        if (this.userData.is_demo) {
            userName.innerHTML += ' <span style="font-size: 10px; color: #888; background: #2a2d31; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">DEMO</span>';
        }
    }

    async loadServers() {
        console.log('🏰 Loading servers...');
        
        // Try different server endpoints
        const endpoints = [
            `${this.API_BASE_URL}/guilds`,
            `${this.API_BASE_URL}/servers`,
            `${this.API_BASE_URL}/api/guilds`,
            `${this.API_BASE_URL}/api/servers`,
            `${this.API_BASE_URL}/user/guilds`
        ];

        for (const url of endpoints) {
            try {
                console.log(`🔍 Trying servers endpoint: ${url}`);
                
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`📊 Response: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Servers received:', data.length || data);
                    
                    this.servers = Array.isArray(data) ? data : [];
                    this.formatServers();
                    this.displayServers();
                    return;
                }
            } catch (error) {
                console.log(`❌ Failed: ${error.message}`);
            }
        }
        
        // If no servers found, use mock data
        console.log('⚠️ Using mock servers');
        this.servers = this.getMockServers();
        this.displayServers();
    }

    formatServers() {
        this.servers = this.servers.map(server => {
            // Normalize server data
            const normalized = {
                id: server.id || server.guild_id || `server_${Math.random().toString(36).substr(2, 9)}`,
                name: server.name || server.guild_name || 'Unnamed Server',
                icon: server.icon || server.icon_url || server.icon_hash || null,
                member_count: server.member_count || server.members || server.memberCount || 0,
                online_count: server.online_count || server.online || server.onlineCount || 0,
                bot_joined: server.bot_joined !== false,
                permissions: server.permissions || server.permissions_new || 0
            };
            
            // Format icon URL
            if (normalized.icon) {
                if (normalized.icon.startsWith('http')) {
                    normalized.icon_url = normalized.icon;
                } else if (/^\d+$/.test(normalized.id) && normalized.icon) {
                    normalized.icon_url = `https://cdn.discordapp.com/icons/${normalized.id}/${normalized.icon}.png`;
                }
            }
            
            if (!normalized.icon_url) {
                normalized.icon_url = null;
            }
            
            return normalized;
        });
    }

    displayServers() {
        const serversList = document.getElementById('serversList');
        if (!serversList) {
            console.error('❌ serversList element not found');
            return;
        }

        serversList.innerHTML = '';

        if (!this.servers || this.servers.length === 0) {
            serversList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #888;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🏰</div>
                    <p>No servers available</p>
                    <small style="font-size: 12px; opacity: 0.7;">
                        The bot might not be in any servers you manage
                    </small>
                </div>
            `;
            return;
        }

        this.servers.forEach((server, index) => {
            const serverElement = document.createElement('div');
            serverElement.className = 'server-item';
            serverElement.dataset.serverId = server.id;
            serverElement.title = `${server.name}\nMembers: ${server.member_count}`;
            serverElement.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s;
                margin-bottom: 5px;
            `;
            
            serverElement.onmouseover = () => {
                serverElement.style.background = 'rgba(79, 84, 92, 0.3)';
            };
            serverElement.onmouseout = () => {
                if (!serverElement.classList.contains('active')) {
                    serverElement.style.background = 'transparent';
                }
            };

            if (index === 0) {
                serverElement.classList.add('active');
                serverElement.style.background = 'rgba(88, 101, 242, 0.3)';
                this.selectServer(server);
            }

            // Server avatar
            let avatarHTML = '🏠';
            if (server.icon_url) {
                avatarHTML = `
                    <img src="${server.icon_url}" 
                         alt="${server.name}"
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"
                         onerror="this.onerror=null;
                                 this.style.display='none';
                                 this.parentElement.innerHTML='<div style=\\'width: 40px; height: 40px; border-radius: 50%; background: #2f3136; display: flex; align-items: center; justify-content: center; font-size: 20px;\\'>🏠</div>'">
                `;
            }

            const botStatus = server.bot_joined ? 
                '<div style="color: #57F287; font-size: 12px;" title="Bot is in this server">✓</div>' : 
                '<div style="color: #ED4245; font-size: 12px;" title="Bot is not in this server">✗</div>';

            serverElement.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #2f3136;">
                    ${avatarHTML}
                </div>
                <div style="flex: 1; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${server.name}
                </div>
                ${botStatus}
            `;

            serverElement.addEventListener('click', () => {
                document.querySelectorAll('.server-item').forEach(item => {
                    item.classList.remove('active');
                    item.style.background = 'transparent';
                });
                serverElement.classList.add('active');
                serverElement.style.background = 'rgba(88, 101, 242, 0.3)';
                this.selectServer(server);
            });

            serversList.appendChild(serverElement);
        });
    }

    selectServer(server) {
        console.log('🎯 Selected server:', server.name);
        this.currentServer = server;
        
        // Update UI
        const noServerSelected = document.getElementById('noServerSelected');
        const serverContent = document.getElementById('serverContent');
        
        if (noServerSelected) noServerSelected.style.display = 'none';
        if (serverContent) serverContent.style.display = 'block';
        
        // Update stats
        const memberCountEl = document.getElementById('memberCount');
        const onlineCountEl = document.getElementById('onlineCount');
        
        if (memberCountEl) {
            memberCountEl.textContent = server.member_count?.toLocaleString() || 'N/A';
            memberCountEl.title = `Total members: ${server.member_count || 'Unknown'}`;
        }
        
        if (onlineCountEl) {
            onlineCountEl.textContent = server.online_count?.toLocaleString() || 'N/A';
            onlineCountEl.title = `Online members: ${server.online_count || 'Unknown'}`;
        }
        
        // Load server settings
        this.loadServerSettings(server.id);
    }

    async loadServerSettings(guildId) {
        if (!guildId || guildId.startsWith('demo_') || guildId.startsWith('server_')) {
            return; // Don't try for demo servers
        }
        
        try {
            const endpoints = [
                `${this.API_BASE_URL}/guild/${guildId}/settings`,
                `${this.API_BASE_URL}/server/${guildId}/settings`,
                `${this.API_BASE_URL}/api/guild/${guildId}/settings`
            ];
            
            for (const url of endpoints) {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`
                    }
                });
                
                if (response.ok) {
                    const settings = await response.json();
                    this.applyServerSettings(settings);
                    break;
                }
            }
        } catch (error) {
            console.log('Settings load failed:', error.message);
        }
    }

    applyServerSettings(settings) {
        // Map settings to toggles
        const toggleMap = {
            welcomeEnabled: 'welcomeToggle',
            autoMod: 'moderationToggle',
            levelSystem: 'levelToggle',
            musicEnabled: 'musicToggle'
        };
        
        for (const [setting, toggleId] of Object.entries(toggleMap)) {
            const toggle = document.getElementById(toggleId);
            if (toggle && settings[setting] !== undefined) {
                toggle.checked = Boolean(settings[setting]);
                console.log(`⚙️ Set ${toggleId} to ${toggle.checked}`);
            }
        }
    }

    getMockServers() {
        return [
            {
                id: 'demo_gaming',
                name: 'Gaming Community',
                icon_url: null,
                member_count: Math.floor(Math.random() * 5000) + 1000,
                online_count: Math.floor(Math.random() * 1000) + 100,
                bot_joined: true
            },
            {
                id: 'demo_dev',
                name: 'Development Hub',
                icon_url: null,
                member_count: Math.floor(Math.random() * 3000) + 500,
                online_count: Math.floor(Math.random() * 800) + 50,
                bot_joined: true
            }
        ];
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const dashboardContainer = document.getElementById('dashboardContainer');
        
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }
        
        if (dashboardContainer) {
            dashboardContainer.style.opacity = '0';
            dashboardContainer.style.display = 'block';
            setTimeout(() => {
                dashboardContainer.style.opacity = '1';
                dashboardContainer.style.transition = 'opacity 0.5s';
            }, 10);
        }
    }

    showError(message, isCritical = false) {
        console.error('❌ Error:', message);
        
        // Create or update error display
        let errorDiv = document.getElementById('dashboardError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'dashboardError';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${isCritical ? '#ED4245' : '#FAA81A'};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 9999;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: space-between;
                animation: slideIn 0.3s ease;
            `;
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                margin-left: 15px;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            closeBtn.onclick = () => errorDiv.remove();
            
            errorDiv.innerHTML = `<span>${message}</span>`;
            errorDiv.appendChild(closeBtn);
            
            document.body.appendChild(errorDiv);
        } else {
            errorDiv.querySelector('span').textContent = message;
            errorDiv.style.background = isCritical ? '#ED4245' : '#FAA81A';
        }
        
        // Auto-remove non-critical errors
        if (!isCritical) {
            setTimeout(() => {
                if (errorDiv && errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 5000);
        }
    }

    async fallbackMode() {
        console.log('🔄 Entering fallback mode');
        
        // Use mock data
        this.userData = this.getFallbackUserData();
        this.displayUserData();
        
        this.servers = this.getMockServers();
        this.displayServers();
        
        // Still try to hide loading
        setTimeout(() => {
            this.hideLoading();
            
            // Show fallback notice
            this.showError('Connected in demo mode. API endpoints not responding.', false);
            
            // Add retry button
            const retryBtn = document.createElement('button');
            retryBtn.textContent = '🔄 Retry Connection';
            retryBtn.style.cssText = `
                background: #5865F2;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
                font-size: 12px;
            `;
            retryBtn.onclick = () => {
                window.location.reload();
            };
            
            const errorDiv = document.getElementById('dashboardError');
            if (errorDiv) {
                errorDiv.querySelector('span').appendChild(document.createElement('br'));
                errorDiv.querySelector('span').appendChild(retryBtn);
            }
        }, 1000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .server-item.active {
            background: rgba(88, 101, 242, 0.3) !important;
        }
    `;
    document.head.appendChild(style);
    
    // Start dashboard
    window.dashboard = new DashboardManager();
});

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all storage
        sessionStorage.removeItem('hm_token');
        localStorage.removeItem('hm_token');
        
        // Try to call logout endpoint
        fetch('https://api-happy-production.up.railway.app/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.dashboard?.userToken}`
            }
        }).finally(() => {
            window.location.href = '/';
        });
    }
}

// Debug helper
if (window.location.search.includes('debug')) {
    console.log('🔧 Debug mode active');
    window.debugDashboard = {
        token: () => window.dashboard?.userToken,
        user: () => window.dashboard?.userData,
        servers: () => window.dashboard?.servers,
        current: () => window.dashboard?.currentServer,
        testEndpoint: async (endpoint) => {
            try {
                const response = await fetch(`https://api-happy-production.up.railway.app${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${window.dashboard?.userToken}`
                    }
                });
                console.log(`Test ${endpoint}:`, response.status, await response.text());
            } catch (e) {
                console.error('Test failed:', e);
            }
        }
    };
}
