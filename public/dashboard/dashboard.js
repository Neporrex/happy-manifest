// Dashboard Configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://your-api-domain.vercel.app';

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
        // Get token from URL or localStorage
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        
        if (urlToken) {
            this.token = urlToken;
            localStorage.setItem('discord_token', urlToken);
            
            // Clean URL
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.pathname);
        } else {
            this.token = localStorage.getItem('discord_token');
        }

        if (!this.token) {
            // Redirect to login if no token
            window.location.href = '/?redirect=dashboard';
            return;
        }

        this.setupEventListeners();
        await this.loadUser();
        await this.loadGuilds();
    }

    setupEventListeners() {
        // User dropdown
        const dropdownButton = document.getElementById('userDropdownButton');
        const dropdownMenu = document.getElementById('userDropdownMenu');
        
        dropdownButton?.addEventListener('click', (e) => {
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
            dropdownMenu?.classList.remove('opacity-100', 'visible', 'translate-y-0');
            dropdownMenu?.classList.add('opacity-0', 'invisible', 'translate-y-2');
        });

        // Logout button
        document.getElementById('logoutButton')?.addEventListener('click', () => {
            this.logout();
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
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            ...options.headers,
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    throw new Error('Session expired. Please login again.');
                }
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showNotification(error.message || 'An error occurred', 'error');
            throw error;
        }
    }

    async loadUser() {
        try {
            this.user = await this.fetchAPI('/api/auth/me');
            this.updateUserUI();
        } catch (error) {
            console.error('Failed to load user:', error);
            this.logout();
        }
    }

    updateUserUI() {
        if (!this.user) return;

        const avatar = document.getElementById('userAvatar');
        const name = document.getElementById('userName');
        const fullName = document.getElementById('userFullName');

        if (avatar && this.user.avatar) {
            avatar.src = this.user.avatar;
        }

        const displayName = this.user.global_name || this.user.username;
        
        if (name) {
            name.textContent = displayName;
        }
        
        if (fullName) {
            fullName.textContent = displayName;
        }
    }

    async loadGuilds() {
        try {
            this.guilds = await this.fetchAPI('/api/auth/guilds');
            this.renderGuilds();
        } catch (error) {
            console.error('Failed to load guilds:', error);
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
            
            card.innerHTML = `
                <div class="flex items-start gap-4">
                    ${guild.icon 
                        ? `<img src="${guild.icon}" alt="${guild.name}" class="w-12 h-12 rounded-xl border border-white/10">`
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

            card.addEventListener('click', () => this.loadGuildConfig(guild.id, guild.name, guild.icon));
            guildsGrid.appendChild(card);
        });
    }

    showEmptyState() {
        document.getElementById('emptyState')?.classList.remove('hidden');
        document.getElementById('guildsSection')?.classList.add('hidden');
    }

    async loadGuildConfig(guildId, guildName, guildIcon) {
        this.currentGuild = guildId;
        
        // Show config section, hide guilds
        document.getElementById('guildsSection')?.classList.add('hidden');
        document.getElementById('configSection')?.classList.remove('hidden');
        document.getElementById('emptyState')?.classList.add('hidden');

        // Update guild header
        const guildIconEl = document.getElementById('guildIcon');
        const guildNameEl = document.getElementById('guildName');
        const guildIdEl = document.getElementById('guildId');

        if (guildIconEl && guildIcon) {
            guildIconEl.src = guildIcon;
        } else if (guildIconEl) {
            guildIconEl.src = '';
            guildIconEl.parentElement?.removeChild(guildIconEl);
            const textIcon = document.createElement('div');
            textIcon.className = 'w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center';
            textIcon.innerHTML = `<span class="text-2xl font-bold">${guildName.charAt(0)}</span>`;
            document.querySelector('#configSection .flex.items-center.gap-4')?.prepend(textIcon);
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

            this.channels = channels;
            this.populateChannelSelects();
            this.setFormValues(config);
            
            this.showNotification('Configuration loaded', 'success');
        } catch (error) {
            console.error('Failed to load config:', error);
            this.showNotification('Failed to load configuration', 'error');
        }
    }

    populateChannelSelects() {
        const textChannels = this.channels.filter(ch => ch.type === 0);
        const categories = this.channels.filter(ch => ch.type === 4);

        this.populateSelect('welcomeChannel', textChannels);
        this.populateSelect('leaveChannel', textChannels);
        this.populateSelect('logChannel', textChannels);
        this.populateSelect('ticketCategory', categories);
    }

    populateSelect(selectId, items) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Keep current selection
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select a channel...</option>';
        
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.type === 4 ? `📁 ${item.name}` : `# ${item.name}`;
            select.appendChild(option);
        });

        // Restore selection if it exists
        if (currentValue && items.some(item => item.id === currentValue)) {
            select.value = currentValue;
        }
    }

    setFormValues(config) {
        document.getElementById('welcomeEnabled').checked = config.welcome_enabled === 1;
        document.getElementById('welcomeChannel').value = config.welcome_channel_id || '';
        document.getElementById('welcomeMessage').value = config.welcome_message || 'Welcome {user} to {server}!';
        document.getElementById('leaveEnabled').checked = config.leave_enabled === 1;
        document.getElementById('leaveChannel').value = config.leave_channel_id || '';
        document.getElementById('logEnabled').checked = config.log_enabled === 1;
        document.getElementById('logChannel').value = config.log_channel_id || '';
        document.getElementById('ticketEnabled').checked = config.ticket_enabled === 1;
        document.getElementById('ticketCategory').value = config.ticket_category_id || '';
    }

    getFormValues() {
        return {
            welcome_enabled: document.getElementById('welcomeEnabled').checked ? 1 : 0,
            welcome_channel_id: document.getElementById('welcomeChannel').value || null,
            welcome_message: document.getElementById('welcomeMessage').value,
            leave_enabled: document.getElementById('leaveEnabled').checked ? 1 : 0,
            leave_channel_id: document.getElementById('leaveChannel').value || null,
            log_enabled: document.getElementById('logEnabled').checked ? 1 : 0,
            log_channel_id: document.getElementById('logChannel').value || null,
            ticket_enabled: document.getElementById('ticketEnabled').checked ? 1 : 0,
            ticket_category_id: document.getElementById('ticketCategory').value || null,
        };
    }

    async saveConfig() {
        if (!this.currentGuild) return;

        const saveButton = document.getElementById('saveButton');
        const originalText = saveButton.textContent;
        
        try {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            
            const config = this.getFormValues();
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
            console.error('Failed to save config:', error);
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
        window.location.href = '/';
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
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('opacity-0', 'translate-x-4');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});