// dashboard.js - UPDATED FOR YOUR ACTUAL API
class DashboardManager {
    constructor() {
        this.API_BASE = 'https://api-happy-production.up.railway.app';
        this.userToken = null;
        this.userData = null;
        this.servers = [];
        this.currentServer = null;
        
        console.log('🚀 Dashboard Manager initialized');
        this.init();
    }

    async init() {
        console.log('🔍 Initializing dashboard...');
        
        // Get token from URL
        this.userToken = this.getTokenFromURL();
        console.log('🔑 Token:', this.userToken ? this.userToken.substring(0, 10) + '...' : 'No token');
        
        if (!this.userToken) {
            this.showError('❌ No authentication token found. Redirecting to login...');
            setTimeout(() => window.location.href = '/', 3000);
            return;
        }

        try {
            console.log('📡 Testing API connection...');
            
            // First verify API is reachable
            const apiCheck = await fetch(this.API_BASE);
            console.log('✅ API reachable:', apiCheck.status);
            
            // Load user data
            await this.loadUserData();
            
            // Load servers/guilds
            await this.loadGuilds();
            
            // Success - hide loading screen
            this.hideLoading();
            console.log('✅ Dashboard loaded successfully');
            
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.showError('Failed to load dashboard. Check console for details.');
            this.useFallbackData();
        }
    }

    getTokenFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            // Store in localStorage for persistence
            localStorage.setItem('hm_token', token);
            console.log('💾 Token saved to localStorage');
            return token;
        }
        
        // Try to get from localStorage
        const storedToken = localStorage.getItem('hm_token');
        if (storedToken) {
            console.log('📂 Using token from localStorage');
            return storedToken;
        }
        
        return null;
    }

    async loadUserData() {
        console.log('👤 Loading user data from /api/auth/me...');
        
        try {
            const response = await fetch(`${this.API_BASE}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📊 User endpoint response:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
            
            this.userData = await response.json();
            console.log('✅ User data received:', this.userData);
            
            // Format avatar URL
            this.formatUserAvatar();
            
            // Display user data
            this.displayUserData();
            
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            throw error; // Re-throw to be caught in init
        }
    }

    formatUserAvatar() {
        if (!this.userData) return;
        
        // Check if avatar URL is already provided
        if (this.userData.avatar_url) {
            return;
        }
        
        // Format Discord avatar URL
        if (this.userData.avatar && this.userData.id) {
            // Has Discord avatar hash
            this.userData.avatar_url = `https://cdn.discordapp.com/avatars/${this.userData.id}/${this.userData.avatar}.png?size=256`;
        } else if (this.userData.discriminator) {
            // Use default Discord avatar
            const avatarNum = parseInt(this.userData.discriminator) % 5;
            this.userData.avatar_url = `https://cdn.discordapp.com/embed/avatars/${avatarNum}.png`;
        } else {
            // Fallback
            this.userData.avatar_url = 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
        
        // Add global_name if not present
        if (!this.userData.global_name && this.userData.username) {
            this.userData.global_name = this.userData.username;
        }
    }

    displayUserData() {
        console.log('🖼️ Displaying user data...');
        
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');

        if (!userName || !userAvatar) {
            console.error('❌ DOM elements not found');
            return;
        }

        if (this.userData) {
            // Use global_name if available, otherwise username
            const displayName = this.userData.global_name || 
                               this.userData.username || 
                               'Discord User';
            
            // Add discriminator if available
            const discriminator = this.userData.discriminator ? 
                                 `#${this.userData.discriminator}` : '';
            
            userName.textContent = `${displayName}${discriminator}`;
            
            // Set email if available
            if (userEmail) {
                userEmail.textContent = this.userData.email || 
                                       this.userData.username || 
                                       'Discord User';
            }
            
            // Set avatar with error handling
            const avatarUrl = this.userData.avatar_url || 
                             'https://cdn.discordapp.com/embed/avatars/0.png';
            
            userAvatar.innerHTML = `
                <img src="${avatarUrl}" 
                     alt="${displayName}" 
                     style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
                     onerror="this.onerror=null;
                             console.error('Failed to load avatar:', this.src);
                             this.src='https://cdn.discordapp.com/embed/avatars/0.png';
                             this.style.opacity='0.8';">
            `;
            
            console.log('✅ User displayed:', displayName);
        }
    }

    async loadGuilds() {
        console.log('🏰 Loading guilds from /api/auth/guilds...');
        
        try {
            const response = await fetch(`${this.API_BASE}/api/auth/guilds`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📊 Guilds endpoint response:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`Guilds API returned ${response.status}`);
            }
            
            this.servers = await response.json();
            console.log(`✅ Received ${this.servers.length} guilds`);
            
            // Format guild data
            this.formatGuilds();
            
            // Display guilds
            this.displayGuilds();
            
        } catch (error) {
            console.error('❌ Failed to load guilds:', error);
            this.servers = this.getMockGuilds();
            this.displayGuilds();
        }
    }

    formatGuilds() {
        this.servers = this.servers.map(guild => {
            // Add icon URL if not present
            if (!guild.icon_url && guild.icon) {
                guild.icon_url = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`;
            }
            
            // Check if user can manage this guild
            if (guild.permissions !== undefined) {
                guild.can_manage = (guild.permissions & 0x20) !== 0 ||  // MANAGE_GUILD
                                   (guild.permissions & 0x8) !== 0;     // ADMINISTRATOR
            } else {
                guild.can_manage = true; // Assume yes if permissions not provided
            }
            
            return guild;
        });
        
        // Filter to only manageable guilds
        this.servers = this.servers.filter(guild => guild.can_manage);
        console.log(`📊 ${this.servers.length} manageable guilds after filtering`);
    }

    displayGuilds() {
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
                    <p>No servers available to manage</p>
                    <small style="font-size: 12px; opacity: 0.7;">
                        You need "Manage Server" permission in Discord
                    </small>
                </div>
            `;
            return;
        }

        console.log(`🖼️ Displaying ${this.servers.length} guilds...`);

        this.servers.forEach((guild, index) => {
            const guildElement = document.createElement('div');
            guildElement.className = 'server-item';
            guildElement.dataset.guildId = guild.id;
            guildElement.title = `${guild.name}\nID: ${guild.id}`;
            
            // Apply basic styling if CSS not loaded
            guildElement.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s;
                margin-bottom: 8px;
                background: transparent;
            `;

            // Make first guild active
            if (index === 0) {
                guildElement.classList.add('active');
                guildElement.style.background = 'rgba(88, 101, 242, 0.3)';
                setTimeout(() => this.selectGuild(guild), 100);
            }

            // Hover effects
            guildElement.onmouseenter = () => {
                if (!guildElement.classList.contains('active')) {
                    guildElement.style.background = 'rgba(79, 84, 92, 0.3)';
                }
            };
            guildElement.onmouseleave = () => {
                if (!guildElement.classList.contains('active')) {
                    guildElement.style.background = 'transparent';
                }
            };

            // Guild icon with fallback
            let iconHTML = '🏠';
            if (guild.icon_url) {
                iconHTML = `
                    <img src="${guild.icon_url}" 
                         alt="${guild.name}"
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"
                         onerror="this.onerror=null;
                                 console.error('Failed to load guild icon:', this.src);
                                 this.style.display='none';
                                 this.parentElement.innerHTML='<div style=\\"width: 40px; height: 40px; border-radius: 50%; background: #2f3136; display: flex; align-items: center; justify-content: center; font-size: 20px;\\">🏠</div>'">
                `;
            }

            guildElement.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #2f3136; flex-shrink: 0;">
                    ${iconHTML}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${guild.name}
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 2px;">
                        ${guild.member_count ? guild.member_count.toLocaleString() + ' members' : ''}
                    </div>
                </div>
                <div style="color: #57F287; font-size: 12px; flex-shrink: 0;" title="Bot is in this server">
                    ✓
                </div>
            `;

            // Click handler
            guildElement.addEventListener('click', () => {
                document.querySelectorAll('.server-item').forEach(item => {
                    item.classList.remove('active');
                    item.style.background = 'transparent';
                });
                guildElement.classList.add('active');
                guildElement.style.background = 'rgba(88, 101, 242, 0.3)';
                this.selectGuild(guild);
            });

            serversList.appendChild(guildElement);
        });
    }

    async selectGuild(guild) {
        console.log('🎯 Selected guild:', guild.name, guild.id);
        this.currentServer = guild;
        
        // Update UI
        const noServerSelected = document.getElementById('noServerSelected');
        const serverContent = document.getElementById('serverContent');
        
        if (noServerSelected) noServerSelected.style.display = 'none';
        if (serverContent) serverContent.style.display = 'block';
        
        // Update stats
        this.updateGuildStats(guild);
        
        // Load guild config and other data
        await this.loadGuildConfig(guild.id);
        await this.loadGuildChannels(guild.id);
    }

    updateGuildStats(guild) {
        const memberCountEl = document.getElementById('memberCount');
        const onlineCountEl = document.getElementById('onlineCount');
        
        if (memberCountEl) {
            memberCountEl.textContent = guild.member_count?.toLocaleString() || 'N/A';
        }
        
        if (onlineCountEl) {
            // Try to get online count from approximate_online_count if available
            const onlineCount = guild.approximate_presence_count || 
                               guild.online_count || 
                               Math.floor((guild.member_count || 0) * 0.3); // Estimate 30% online
            onlineCountEl.textContent = onlineCount.toLocaleString();
        }
    }

    async loadGuildConfig(guildId) {
        console.log(`⚙️ Loading config for guild ${guildId}...`);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/config/${guildId}`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`
                }
            });
            
            if (response.ok) {
                const config = await response.json();
                console.log('✅ Guild config loaded:', config);
                this.applyGuildConfig(config);
            } else {
                console.log('ℹ️ No config found or unauthorized');
            }
        } catch (error) {
            console.error('Failed to load guild config:', error);
        }
    }

    async loadGuildChannels(guildId) {
        console.log(`📢 Loading channels for guild ${guildId}...`);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/guilds/${guildId}/channels`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`
                }
            });
            
            if (response.ok) {
                const channels = await response.json();
                console.log(`✅ Loaded ${channels.length} channels`);
                // You could display these in your UI
            }
        } catch (error) {
            console.log('Failed to load channels:', error);
        }
    }

    applyGuildConfig(config) {
        console.log('⚙️ Applying guild config to UI...');
        
        // Map config to your toggle switches
        // Adjust these based on your actual config structure
        const toggleMap = {
            welcome_enabled: 'welcomeToggle',
            moderation_enabled: 'moderationToggle',
            level_system_enabled: 'levelToggle',
            music_enabled: 'musicToggle'
        };
        
        for (const [configKey, toggleId] of Object.entries(toggleMap)) {
            const toggle = document.getElementById(toggleId);
            if (toggle && config[configKey] !== undefined) {
                toggle.checked = Boolean(config[configKey]);
                console.log(`Set ${toggleId} to ${toggle.checked} from ${configKey}`);
            }
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const dashboardContainer = document.getElementById('dashboardContainer');
        
        if (loadingOverlay) {
            loadingOverlay.style.transition = 'opacity 0.5s ease';
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }
        
        if (dashboardContainer) {
            dashboardContainer.style.display = 'block';
            setTimeout(() => {
                dashboardContainer.style.transition = 'opacity 0.5s ease';
                dashboardContainer.style.opacity = '1';
            }, 10);
        }
        
        console.log('👋 Loading screen hidden');
    }

    showError(message) {
        console.error('❌ Dashboard Error:', message);
        
        // Create error display
        const errorDiv = document.createElement('div');
        errorDiv.id = 'dashboardError';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ED4245;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            margin-left: 10px;
            padding: 0;
            line-height: 1;
        `;
        closeBtn.onclick = () => errorDiv.remove();
        
        errorDiv.innerHTML = `<span>${message}</span>`;
        errorDiv.appendChild(closeBtn);
        
        // Add CSS animation
        if (!document.getElementById('errorStyles')) {
            const style = document.createElement('style');
            style.id = 'errorStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    useFallbackData() {
        console.log('🔄 Using fallback data...');
        
        // Fallback user data
        this.userData = {
            id: 'demo_' + Date.now(),
            username: 'DemoUser',
            discriminator: '0001',
            global_name: 'Demo User',
            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
            email: 'demo@example.com'
        };
        this.displayUserData();
        
        // Fallback guilds
        this.servers = this.getMockGuilds();
        this.displayGuilds();
        
        // Hide loading
        this.hideLoading();
        
        // Show demo notice
        this.showError('⚠️ Connected in demo mode. Using mock data.');
    }

    getMockGuilds() {
        return [
            {
                id: 'demo_1',
                name: 'Gaming Community',
                icon: null,
                member_count: 2540,
                approximate_presence_count: 720,
                permissions: 0x20,
                can_manage: true
            },
            {
                id: 'demo_2',
                name: 'Development Hub',
                icon: 'development_icon',
                icon_url: null,
                member_count: 1280,
                approximate_presence_count: 320,
                permissions: 0x8,
                can_manage: true
            }
        ];
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing dashboard...');
    window.dashboard = new DashboardManager();
});

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        const token = localStorage.getItem('hm_token');
        
        // Call logout endpoint if available
        if (token) {
            fetch('https://api-happy-production.up.railway.app/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).catch(() => {
                // Ignore errors on logout
            });
        }
        
        // Clear storage
        localStorage.removeItem('hm_token');
        sessionStorage.clear();
        
        // Redirect to home
        window.location.href = '/';
    }
}

// Toggle switch handlers
document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.id.includes('Toggle')) {
        const setting = e.target.id.replace('Toggle', '');
        const value = e.target.checked;
        
        if (window.dashboard?.currentServer?.id) {
            const guildId = window.dashboard.currentServer.id;
            
            // Send update to API
            fetch(`https://api-happy-production.up.railway.app/api/config/${guildId}`, {
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
                } else {
                    console.log(`✅ Setting ${setting} updated to ${value}`);
                }
            }).catch(error => {
                console.error('Network error:', error);
                e.target.checked = !value;
            });
        }
        
        console.log(`Setting ${setting} changed to: ${value}`);
    }
});

// Debug helper
if (window.location.search.includes('debug')) {
    console.log('🔧 Debug mode enabled');
    
    window.debug = {
        token: () => window.dashboard?.userToken,
        user: () => window.dashboard?.userData,
        guilds: () => window.dashboard?.servers,
        current: () => window.dashboard?.currentServer,
        testAuth: async () => {
            const token = window.dashboard?.userToken;
            if (!token) return 'No token';
            
            try {
                const res = await fetch('https://api-happy-production.up.railway.app/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return `Auth test: ${res.status} ${res.statusText}`;
            } catch (e) {
                return `Auth test failed: ${e.message}`;
            }
        },
        testGuilds: async () => {
            const token = window.dashboard?.userToken;
            if (!token) return 'No token';
            
            try {
                const res = await fetch('https://api-happy-production.up.railway.app/api/auth/guilds', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return `Guilds test: ${res.status} ${res.statusText}`;
            } catch (e) {
                return `Guilds test failed: ${e.message}`;
            }
        }
    };
    
    console.log('Use debug.token(), debug.user(), etc. in console');
}
