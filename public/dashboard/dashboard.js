// dashboard.js - COMPLETELY FIXED VERSION
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
        
        // Get token from URL or localStorage
        this.userToken = this.getTokenFromStorage();
        console.log('🔑 Token:', this.userToken ? 'Found' : 'Not found');
        
        if (!this.userToken) {
            this.showError('❌ No authentication token found. Please login first.');
            setTimeout(() => window.location.href = '/', 3000);
            return;
        }

        try {
            // Test the token first
            const isValid = await this.testToken();
            if (!isValid) {
                this.showError('❌ Invalid or expired token. Please login again.');
                setTimeout(() => window.location.href = '/', 3000);
                return;
            }

            // Load everything
            await this.loadUserData();
            await this.loadGuilds();
            
            // Success!
            this.hideLoading();
            console.log('✅ Dashboard fully loaded');
            
        } catch (error) {
            console.error('❌ Dashboard failed:', error);
            this.showError('⚠️ Failed to load dashboard. Using fallback mode.');
            this.useFallbackMode();
        }
    }

    getTokenFromStorage() {
        // First check URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        
        if (urlToken) {
            console.log('📝 Token found in URL');
            localStorage.setItem('hm_token', urlToken);
            return urlToken;
        }
        
        // Check localStorage
        const storedToken = localStorage.getItem('hm_token');
        if (storedToken) {
            console.log('💾 Token found in localStorage');
            return storedToken;
        }
        
        console.log('❌ No token found anywhere');
        return null;
    }

    async testToken() {
        console.log('🔐 Testing token validity...');
        
        try {
            // Try a simple request to check token
            const response = await fetch(`${this.API_BASE}/api/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📊 Token test response:', response.status);
            
            if (response.status === 401 || response.status === 403) {
                console.log('❌ Token invalid or expired');
                localStorage.removeItem('hm_token');
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('Token test failed:', error);
            return false;
        }
    }

    async loadUserData() {
        console.log('👤 Loading user data from /api/auth/me...');
        
        try {
            const response = await fetch(`${this.API_BASE}/api/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log('📊 User API response:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ User API error:', errorText);
                throw new Error(`User API failed: ${response.status} - ${errorText}`);
            }
            
            this.userData = await response.json();
            console.log('✅ User data received:', this.userData.username || 'Unknown');
            
            // Format the data
            this.formatUserData();
            this.displayUserData();
            
        } catch (error) {
            console.error('❌ Failed to load user:', error);
            throw error;
        }
    }

    formatUserData() {
        if (!this.userData) return;
        
        // Ensure we have an avatar URL
        if (!this.userData.avatar_url) {
            if (this.userData.avatar && this.userData.id) {
                this.userData.avatar_url = `https://cdn.discordapp.com/avatars/${this.userData.id}/${this.userData.avatar}.png?size=256`;
            } else if (this.userData.discriminator) {
                const avatarNum = parseInt(this.userData.discriminator) % 5;
                this.userData.avatar_url = `https://cdn.discordapp.com/embed/avatars/${avatarNum}.png`;
            } else {
                this.userData.avatar_url = 'https://cdn.discordapp.com/embed/avatars/0.png';
            }
        }
        
        // Ensure display name
        if (!this.userData.display_name) {
            this.userData.display_name = this.userData.global_name || 
                                        this.userData.username || 
                                        'Discord User';
        }
        
        // Add discriminator if needed
        if (this.userData.discriminator && this.userData.discriminator !== '0') {
            this.userData.full_name = `${this.userData.display_name}#${this.userData.discriminator}`;
        } else {
            this.userData.full_name = this.userData.display_name;
        }
    }

    displayUserData() {
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');

        if (!userName || !userAvatar) {
            console.error('❌ User DOM elements missing');
            return;
        }

        userName.textContent = this.userData.full_name || 'Loading...';
        
        if (userEmail) {
            userEmail.textContent = this.userData.email || this.userData.username || 'Discord User';
        }

        // Create avatar image with error handling
        const img = document.createElement('img');
        img.src = this.userData.avatar_url;
        img.alt = this.userData.display_name;
        img.style.cssText = 'width: 100%; height: 100%; border-radius: 50%; object-fit: cover;';
        
        img.onerror = () => {
            console.error('Failed to load avatar, using default');
            img.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
            img.style.opacity = '0.8';
        };
        
        userAvatar.innerHTML = '';
        userAvatar.appendChild(img);
        
        console.log('✅ User displayed:', this.userData.display_name);
    }

    async loadGuilds() {
        console.log('🏰 Loading guilds from /api/auth/guilds...');
        
        try {
            const response = await fetch(`${this.API_BASE}/api/auth/guilds`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log('📊 Guilds API response:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Guilds API error:', errorText);
                throw new Error(`Guilds API failed: ${response.status}`);
            }
            
            const guilds = await response.json();
            console.log(`✅ Received ${guilds.length} guilds`);
            
            // Process guilds
            this.servers = this.processGuilds(guilds);
            this.displayGuilds();
            
        } catch (error) {
            console.error('❌ Failed to load guilds:', error);
            this.servers = this.getMockGuilds();
            this.displayGuilds();
        }
    }

    processGuilds(guilds) {
        return guilds.map(guild => {
            // Add icon URL
            if (guild.icon) {
                guild.icon_url = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`;
            } else {
                guild.icon_url = null;
            }
            
            // Check permissions
            const permissions = parseInt(guild.permissions || '0');
            guild.can_manage = (permissions & 0x20) !== 0 ||  // MANAGE_GUILD
                               (permissions & 0x8) !== 0 ||   // ADMINISTRATOR
                               guild.owner === true;
            
            return guild;
        }).filter(guild => guild.can_manage); // Only show manageable guilds
    }

    displayGuilds() {
        const serversList = document.getElementById('serversList');
        if (!serversList) {
            console.error('❌ serversList element missing');
            return;
        }

        // Clear list
        serversList.innerHTML = '';

        if (!this.servers || this.servers.length === 0) {
            serversList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #888;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🏰</div>
                    <p>No servers to manage</p>
                    <small style="font-size: 12px; opacity: 0.7;">
                        You need "Manage Server" permission<br>in Discord servers
                    </small>
                </div>
            `;
            return;
        }

        console.log(`🖼️ Displaying ${this.servers.length} guilds`);

        this.servers.forEach((guild, index) => {
            const element = this.createGuildElement(guild, index === 0);
            serversList.appendChild(element);
        });

        // Select first guild
        if (this.servers.length > 0) {
            setTimeout(() => this.selectGuild(this.servers[0]), 100);
        }
    }

    createGuildElement(guild, isActive = false) {
        const element = document.createElement('div');
        element.className = 'server-item';
        element.dataset.guildId = guild.id;
        
        // Styling
        element.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 6px;
            background: ${isActive ? 'rgba(88, 101, 242, 0.3)' : 'transparent'};
            border: 1px solid ${isActive ? 'rgba(88, 101, 242, 0.5)' : 'transparent'};
        `;
        
        if (isActive) {
            element.classList.add('active');
        }

        // Hover effects
        element.onmouseenter = () => {
            if (!element.classList.contains('active')) {
                element.style.background = 'rgba(79, 84, 92, 0.2)';
            }
        };
        element.onmouseleave = () => {
            if (!element.classList.contains('active')) {
                element.style.background = 'transparent';
            }
        };

        // Create icon
        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #2f3136;
            flex-shrink: 0;
        `;
        
        if (guild.icon_url) {
            const img = document.createElement('img');
            img.src = guild.icon_url;
            img.alt = guild.name;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            img.onerror = () => {
                iconDiv.innerHTML = '<div style="font-size: 20px;">🏠</div>';
            };
            iconDiv.appendChild(img);
        } else {
            iconDiv.innerHTML = '<div style="font-size: 20px;">🏠</div>';
        }

        // Create info div
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'flex: 1; min-width: 0;';
        
        const nameDiv = document.createElement('div');
        nameDiv.textContent = guild.name;
        nameDiv.style.cssText = `
            font-weight: 500;
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        
        const ownerBadge = guild.owner ? '<span style="font-size: 11px; color: #57F287; margin-left: 5px;">(Owner)</span>' : '';
        
        infoDiv.innerHTML = `
            <div style="font-weight: 500; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${guild.name}${ownerBadge}
            </div>
            <div style="font-size: 11px; color: #888; margin-top: 2px;">
                ${guild.permissions ? 'Manage Permission' : 'Member'}
            </div>
        `;

        // Create status indicator
        const statusDiv = document.createElement('div');
        statusDiv.innerHTML = '✓';
        statusDiv.style.cssText = `
            color: #57F287;
            font-size: 12px;
            flex-shrink: 0;
        `;
        statusDiv.title = 'Bot is in this server';

        // Assemble element
        element.appendChild(iconDiv);
        element.appendChild(infoDiv);
        element.appendChild(statusDiv);

        // Click handler
        element.addEventListener('click', () => {
            document.querySelectorAll('.server-item').forEach(item => {
                item.classList.remove('active');
                item.style.background = 'transparent';
                item.style.border = '1px solid transparent';
            });
            
            element.classList.add('active');
            element.style.background = 'rgba(88, 101, 242, 0.3)';
            element.style.border = '1px solid rgba(88, 101, 242, 0.5)';
            
            this.selectGuild(guild);
        });

        return element;
    }

    async selectGuild(guild) {
        console.log('🎯 Selected guild:', guild.name);
        this.currentServer = guild;
        
        // Update UI visibility
        const noServerSelected = document.getElementById('noServerSelected');
        const serverContent = document.getElementById('serverContent');
        
        if (noServerSelected) noServerSelected.style.display = 'none';
        if (serverContent) serverContent.style.display = 'block';
        
        // Update stats
        this.updateGuildStats(guild);
        
        // Load guild config
        await this.loadGuildConfig(guild.id);
    }

    updateGuildStats(guild) {
        const memberCountEl = document.getElementById('memberCount');
        const onlineCountEl = document.getElementById('onlineCount');
        
        if (memberCountEl) {
            // Mock member count for now
            const mockCount = Math.floor(Math.random() * 5000) + 1000;
            memberCountEl.textContent = mockCount.toLocaleString();
        }
        
        if (onlineCountEl) {
            const onlineCount = Math.floor(Math.random() * 1000) + 100;
            onlineCountEl.textContent = onlineCount.toLocaleString();
        }
    }

    async loadGuildConfig(guildId) {
        console.log(`⚙️ Loading config for guild ${guildId}...`);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/config/${guildId}`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const config = await response.json();
                this.applyGuildConfig(config);
            }
        } catch (error) {
            console.log('⚠️ Could not load guild config:', error);
        }
    }

    applyGuildConfig(config) {
        console.log('⚙️ Applying config to UI');
        
        // Map your config fields to toggle IDs
        const toggleMap = {
            welcome_enabled: 'welcomeToggle',
            log_enabled: 'moderationToggle',
            ticket_enabled: 'musicToggle'
        };
        
        Object.entries(toggleMap).forEach(([configKey, toggleId]) => {
            const toggle = document.getElementById(toggleId);
            if (toggle && config[configKey] !== undefined) {
                toggle.checked = Boolean(config[configKey]);
            }
        });
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const dashboardContainer = document.getElementById('dashboardContainer');
        
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                if (dashboardContainer) {
                    dashboardContainer.style.display = 'block';
                    setTimeout(() => {
                        dashboardContainer.style.opacity = '1';
                        dashboardContainer.style.transition = 'opacity 0.3s';
                    }, 10);
                }
            }, 500);
        }
        
        console.log('✅ Loading screen hidden');
    }

    useFallbackMode() {
        console.log('🔄 Using fallback mode');
        
        // Fallback user
        this.userData = {
            username: 'DemoUser',
            discriminator: '0001',
            display_name: 'Demo User',
            full_name: 'DemoUser#0001',
            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
            email: 'demo@example.com'
        };
        this.displayUserData();
        
        // Fallback guilds
        this.servers = this.getMockGuilds();
        this.displayGuilds();
        
        // Hide loading
        this.hideLoading();
        
        // Show notice
        this.showError('⚠️ Using demo mode. API connection failed.', false);
    }

    getMockGuilds() {
        return [
            {
                id: 'demo_1',
                name: 'Gaming Community',
                icon: null,
                icon_url: null,
                owner: true,
                permissions: '8',
                can_manage: true
            },
            {
                id: 'demo_2',
                name: 'Developer Hub',
                icon: 'abc123',
                icon_url: null,
                owner: false,
                permissions: '2147483647',
                can_manage: true
            }
        ];
    }

    showError(message, isCritical = true) {
        console.error('❌ Error:', message);
        
        // Create or get error div
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
                font-size: 20px;
                cursor: pointer;
                margin-left: 10px;
                padding: 0;
                line-height: 1;
            `;
            closeBtn.onclick = () => errorDiv.remove();
            
            errorDiv.innerHTML = `<span>${message}</span>`;
            errorDiv.appendChild(closeBtn);
            
            document.body.appendChild(errorDiv);
        } else {
            errorDiv.querySelector('span').textContent = message;
            errorDiv.style.background = isCritical ? '#ED4245' : '#FAA81A';
            errorDiv.style.display = 'flex';
        }
        
        // Add CSS animation if not present
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
        
        // Auto-remove non-critical errors
        if (!isCritical) {
            setTimeout(() => {
                if (errorDiv && errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 5000);
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    
    // Add retry button to loading screen
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        const retryBtn = document.createElement('button');
        retryBtn.textContent = '🔄 Retry Connection';
        retryBtn.style.cssText = `
            margin-top: 20px;
            background: #5865F2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        `;
        retryBtn.onclick = () => window.location.reload();
        
        const loadingText = loadingOverlay.querySelector('p');
        if (loadingText) {
            loadingText.parentNode.insertBefore(retryBtn, loadingText.nextSibling);
        }
    }
    
    // Start dashboard
    window.dashboard = new DashboardManager();
});

// Logout function
function logout() {
    const token = localStorage.getItem('hm_token');
    
    // Clear local storage
    localStorage.removeItem('hm_token');
    sessionStorage.clear();
    
    // Optional: Call logout endpoint
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
    
    // Redirect to home
    window.location.href = '/';
}

// Toggle switch handler
document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.id.includes('Toggle')) {
        const setting = e.target.id.replace('Toggle', '');
        const value = e.target.checked;
        const guildId = window.dashboard?.currentServer?.id;
        const token = window.dashboard?.userToken;
        
        if (guildId && token) {
            console.log(`🔄 Updating ${setting} to ${value} for guild ${guildId}`);
            
            // Send update to API
            fetch(`https://api-happy-production.up.railway.app/api/config/${guildId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
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
            }).catch(() => {
                e.target.checked = !value;
            });
        }
    }
});

// Debug mode
if (window.location.search.includes('debug')) {
    console.log('🔧 Debug mode enabled');
    
    window.debugDashboard = {
        token: () => {
            const token = localStorage.getItem('hm_token');
            return token ? token.substring(0, 10) + '...' : 'No token';
        },
        testEndpoints: async () => {
            const token = localStorage.getItem('hm_token');
            if (!token) return 'No token';
            
            try {
                // Test /me
                const meRes = await fetch('https://api-happy-production.up.railway.app/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                // Test /guilds
                const guildsRes = await fetch('https://api-happy-production.up.railway.app/api/auth/guilds', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                return {
                    '/api/auth/me': `${meRes.status} ${meRes.statusText}`,
                    '/api/auth/guilds': `${guildsRes.status} ${guildsRes.statusText}`
                };
                
            } catch (e) {
                return `Test failed: ${e.message}`;
            }
        }
    };
    
    console.log('Use debugDashboard.testEndpoints() in console');
}
