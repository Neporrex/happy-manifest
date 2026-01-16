// Dashboard Configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://api-happy-production.up.railway.app';

console.log('🌐 API URL:', API_URL);
console.log('🔑 Token in URL:', new URLSearchParams(window.location.search).get('token') ? 'Yes' : 'No');

class DashboardManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.guilds = [];
        this.currentGuild = null;
        this.channels = [];
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing dashboard...');
        
        // Get token from URL or localStorage
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        
        if (urlToken) {
            console.log('✅ Token found in URL');
            this.token = urlToken;
            localStorage.setItem('discord_token', urlToken);
            
            // Clean URL
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.pathname);
        } else {
            this.token = localStorage.getItem('discord_token');
            console.log('🔍 Token from localStorage:', this.token ? 'Found' : 'Not found');
        }

        if (!this.token) {
            console.log('❌ No token found, redirecting to login...');
            // Redirect to login if no token
            window.location.href = '/?redirect=dashboard';
            return;
        }

        this.setupEventListeners();
        
        try {
            await this.loadUser();
            await this.loadGuilds();
        } catch (error) {
            console.error('❌ Failed to load dashboard:', error);
            this.showNotification('Failed to load dashboard. Please try logging in again.', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        }
    }

    setupEventListeners() {
        // User dropdown
        const dropdownButton = document.getElementById('userDropdownButton');
        const dropdownMenu = document.getElementById('userDropdownMenu');
        
        if (dropdownButton && dropdownMenu) {
            dropdownButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = dropdownMenu.classList.contains('opacity-100');
                
                if (isVisible) {
                    dropdownMenu.classList.remove('opacity-100', 'visible', 'translate-y-0');
                    dropdownMenu.classList.add('opacity-0', 'invisible', 'translate-y-2');
                } else {
                    dropdownMenu.classList.remove('opacity-0', 'invisible', 'translate-y-2');
                    dropdownMenu.classList.add('opacity-100', 'visible', 'translate-y-0');
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdownMenu.classList.remove('opacity-100', 'visible', 'translate-y-0');
                dropdownMenu.classList.add('opacity-0', 'invisible', 'translate-y-2');
            });
        }

        // Logout button
        document.getElementById('logoutButton')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                this.logout();
            }
        });

        // Back button
        document.getElementById('backButton')?.addEventListener('click', () => {
            this.showGuilds();
        });

        // Save button
        document.getElementById('saveButton')?.addEventListener('click', () => {
            this.saveConfig();
        });
    }

    async fetchAPI(endpoint, options = {}) {
        console.log('📡 Fetching:', `${API_URL}${endpoint}`);
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            ...options.headers,
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
                credentials: 'include',
            });

            console.log('📊 Response status:', response.status, response.statusText);

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    throw new Error('Session expired. Please login again.');
                }
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Response data:', data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error);
            this.showNotification(error.message || 'An error occurred', 'error');
            throw error;
        }
    }

    async loadUser() {
        try {
            console.log('👤 Loading user info...');
            this.user = await this.fetchAPI('/api/auth/me');
            console.log('✅ User loaded:', this.user);
            this.updateUserUI();
        } catch (error) {
            console.error('❌ Failed to load user:', error);
            throw error;
        }
    }

    updateUserUI() {
        if (!this.user) return;

        const avatar = document.getElementById('userAvatar');
        const name = document.getElementById('userName');
        const fullName = document.getElementById('userFullName');

        const displayName = this.user.global_name || this.user.username;
        const avatarUrl = this.user.avatar 
            ? `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
        
        if (avatar) {
            avatar.src = avatarUrl;
            avatar.onerror = () => {
                avatar.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
            };
        }
        
        if (name) {
            name.textContent = displayName;
        }
        
        if (fullName) {
            fullName.textContent = displayName;
        }
    }

    async loadGuilds() {
        try {
            console.log('🏰 Loading guilds...');
            this.guilds = await this.fetchAPI('/api/auth/guilds');
            console.log(`✅ ${this.guilds.length} guilds loaded`);
            this.renderGuilds();
        } catch (error) {
            console.error('❌ Failed to load guilds:', error);
            this.showEmptyState();
        } finally {
            document.getElementById('loadingState')?.classList.add('hidden');
        }
    }

    renderGuilds() {
        const guildsSection = document.getElementById('guildsSection');
        const guildsGrid = guildsSection?.querySelector('.grid');
        
        if (!guildsGrid) return;

        if (this.guilds.length === 0) {
            this.showEmptyState();
            return;
        }

        guildsSection.classList.remove('hidden');
        
        this.guilds.forEach(guild => {
            const card = document.createElement('div');
            card.className = 'glass-card rounded-2xl p-6 hover-lift cursor-pointer border-2 border-white/5 hover:border-purple-500/30 transition-all group';
            card.dataset.guildId = guild.id;
            
            // Get proper Discord icon URL
            const iconUrl = guild.icon 
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                : null;
            
            card.innerHTML = `
                <div class="flex items-start gap-4">
                    ${iconUrl 
                        ? `<img src="${iconUrl}" 
                             alt="${guild.name}" 
                             class="w-12 h-12 rounded-xl border border-white/10"
                             onerror="this.onerror=null; this.src='https://cdn.discordapp.com/embed/avatars/0.png'">`
                        : `<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                            <span class="text-xl font-bold">${guild.name.charAt(0)}</span>
                          </div>`
                    }
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-lg truncate mb-1">${guild.name}</h3>
                        <div class="flex items-center gap-2">
                            ${guild.owner 
                                ? `<span class="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Owner</span>`
                                : ''
                            }
                            <span class="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Manage</span>
                        </div>
                    </div>
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </div>
            `;

            card.addEventListener('click', () => this.loadGuildConfig(guild.id, guild.name, iconUrl));
            guildsGrid.appendChild(card);
        });
    }

    showEmptyState() {
        document.getElementById('emptyState')?.classList.remove('hidden');
        document.getElementById('guildsSection')?.classList.add('hidden');
    }

    async loadGuildConfig(guildId, guildName, guildIcon) {
        console.log(`⚙️ Loading config for guild: ${guildName} (${guildId})`);
        
        this.currentGuild = guildId;
        
        // Show config section, hide guilds
        document.getElementById('guildsSection')?.classList.add('hidden');
        document.getElementById('configSection')?.classList.remove('hidden');
        document.getElementById('emptyState')?.classList.add('hidden');

        // Update guild header
        const guildIconContainer = document.querySelector('#configSection .flex.items-center.gap-4');
        const guildNameEl = document.getElementById('guildName');
        const guildIdEl = document.getElementById('guildId');

        // Clear existing icon
        const existingIcon = guildIconContainer?.querySelector('img, div');
        if (existingIcon) {
            existingIcon.remove();
        }

        // Add new icon
        if (guildIconContainer) {
            if (guildIcon) {
                const img = document.createElement('img');
                img.id = 'guildIcon';
                img.src = guildIcon;
                img.alt = guildName;
                img.className = 'w-16 h-16 rounded-xl border border-white/10';
                img.onerror = () => {
                    // Fallback if image fails to load
                    img.replaceWith(this.createTextIcon(guildName));
                };
                guildIconContainer.prepend(img);
            } else {
                guildIconContainer.prepend(this.createTextIcon(guildName));
            }
        }

        if (guildNameEl) {
            guildNameEl.textContent = guildName;
        }
        
        if (guildIdEl) {
            guildIdEl.textContent = `ID: ${guildId}`;
        }

        try {
            // Load config and channels
            const [config, channels] = await Promise.all([
                this.fetchAPI(`/api/config/${guildId}`),
                this.fetchAPI(`/api/guilds/${guildId}/channels`)
            ]);

            console.log('✅ Config loaded:', config);
            console.log('✅ Channels loaded:', channels.length);

            this.channels = channels;
            this.populateChannelSelects();
            this.setFormValues(config);
            
            this.showNotification(`Loaded configuration for ${guildName}`, 'success');
        } catch (error) {
            console.error('❌ Failed to load config:', error);
            this.showNotification('Failed to load configuration. Using default settings.', 'error');
            
            // Set default form values
            this.setFormValues({
                welcome_enabled: 0,
                welcome_channel_id: null,
                welcome_message: "Welcome {user} to {server}!",
                leave_enabled: 0,
                leave_channel_id: null,
                log_enabled: 0,
                log_channel_id: null,
                ticket_enabled: 0,
                ticket_category_id: null,
            });
        }
    }

    createTextIcon(guildName) {
        const div = document.createElement('div');
        div.className = 'w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center';
        div.innerHTML = `<span class="text-2xl font-bold">${guildName.charAt(0)}</span>`;
        return div;
    }

    populateChannelSelects() {
        const textChannels = this.channels.filter(ch => ch.type === 0);
        const categories = this.channels.filter(ch => ch.type === 4);

        console.log(`📊 Found ${textChannels.length} text channels and ${categories.length} categories`);

        this.populateSelect('welcomeChannel', textChannels, '#');
        this.populateSelect('leaveChannel', textChannels, '#');
        this.populateSelect('logChannel', textChannels, '#');
        this.populateSelect('ticketCategory', categories, '📁');
    }

    populateSelect(selectId, items, prefix = '') {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Keep current selection
        const currentValue = select.value;
        
        // Clear and add default option
        select.innerHTML = `<option value="">Select a channel...</option>`;
        
        // Add items
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${prefix} ${item.name}`;
            select.appendChild(option);
        });

        // Restore selection if it exists
        if (currentValue && items.some(item => item.id === currentValue)) {
            select.value = currentValue;
        }
    }

    setFormValues(config) {
        const elements = {
            welcomeEnabled: document.getElementById('welcomeEnabled'),
            welcomeChannel: document.getElementById('welcomeChannel'),
            welcomeMessage: document.getElementById('welcomeMessage'),
            leaveEnabled: document.getElementById('leaveEnabled'),
            leaveChannel: document.getElementById('leaveChannel'),
            logEnabled: document.getElementById('logEnabled'),
            logChannel: document.getElementById('logChannel'),
            ticketEnabled: document.getElementById('ticketEnabled'),
            ticketCategory: document.getElementById('ticketCategory')
        };

        if (elements.welcomeEnabled) elements.welcomeEnabled.checked = config.welcome_enabled === 1;
        if (elements.welcomeChannel) elements.welcomeChannel.value = config.welcome_channel_id || '';
        if (elements.welcomeMessage) elements.welcomeMessage.value = config.welcome_message || 'Welcome {user} to {server}!';
        if (elements.leaveEnabled) elements.leaveEnabled.checked = config.leave_enabled === 1;
        if (elements.leaveChannel) elements.leaveChannel.value = config.leave_channel_id || '';
        if (elements.logEnabled) elements.logEnabled.checked = config.log_enabled === 1;
        if (elements.logChannel) elements.logChannel.value = config.log_channel_id || '';
        if (elements.ticketEnabled) elements.ticketEnabled.checked = config.ticket_enabled === 1;
        if (elements.ticketCategory) elements.ticketCategory.value = config.ticket_category_id || '';
    }

    getFormValues() {
        return {
            welcome_enabled: document.getElementById('welcomeEnabled')?.checked ? 1 : 0,
            welcome_channel_id: document.getElementById('welcomeChannel')?.value || null,
            welcome_message: document.getElementById('welcomeMessage')?.value || '',
            leave_enabled: document.getElementById('leaveEnabled')?.checked ? 1 : 0,
            leave_channel_id: document.getElementById('leaveChannel')?.value || null,
            log_enabled: document.getElementById('logEnabled')?.checked ? 1 : 0,
            log_channel_id: document.getElementById('logChannel')?.value || null,
            ticket_enabled: document.getElementById('ticketEnabled')?.checked ? 1 : 0,
            ticket_category_id: document.getElementById('ticketCategory')?.value || null,
        };
    }

    async saveConfig() {
        if (!this.currentGuild) return;

        const saveButton = document.getElementById('saveButton');
        if (!saveButton) return;

        const originalText = saveButton.textContent;
        
        try {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            
            const config = this.getFormValues();
            console.log('💾 Saving config:', config);
            
            await this.fetchAPI(`/api/config/${this.currentGuild}`, {
                method: 'POST',
                body: JSON.stringify(config),
            });

            this.showNotification('Configuration saved successfully!', 'success');
            
            // Visual feedback
            saveButton.classList.add('bg-green-500');
            setTimeout(() => {
                saveButton.classList.remove('bg-green-500');
            }, 2000);
        } catch (error) {
            console.error('❌ Failed to save config:', error);
            this.showNotification('Failed to save configuration', 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = originalText;
        }
    }

    showGuilds() {
        document.getElementById('configSection')?.classList.add('hidden');
        document.getElementById('guildsSection')?.classList.remove('hidden');
        document.getElementById('emptyState')?.classList.toggle('hidden', this.guilds.length > 0);
        this.currentGuild = null;
    }

    logout() {
        localStorage.removeItem('discord_token');
        this.showNotification('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fixed top-4 right-4 px-6 py-3 rounded-lg glass-card border border-white/10 shadow-2xl z-50`;
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                <span class="font-medium">${message}</span>
                <button class="ml-4 text-gray-400 hover:text-white" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(20px)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, initializing dashboard...');
        new DashboardManager();
    });
} else {
    console.log('📄 DOM already loaded, initializing dashboard...');
    new DashboardManager();
}

// Export for debugging
window.dashboardDebug = {
    getToken: () => localStorage.getItem('discord_token'),
    clearToken: () => localStorage.removeItem('discord_token'),
    reload: () => window.location.reload(),
    testAPI: async () => {
        const token = localStorage.getItem('discord_token');
        if (!token) return 'No token';
        
        try {
            const response = await fetch('https://api-happy-production.up.railway.app/health');
            return await response.json();
        } catch (error) {
            return error.message;
        }
    }
};
