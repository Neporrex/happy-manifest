// Constants
const API_URL = 'https://fastapi-production-bca7.up.railway.app';

// Interfaces
interface User {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
    discriminator: string;
    email?: string;
}

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    features: string[];
}

interface Channel {
    id: string;
    name: string;
    type: number;
}

interface GuildConfig {
    welcome_enabled: number;
    welcome_channel_id: string | null;
    welcome_message: string;
    leave_enabled: number;
    leave_channel_id: string | null;
    log_enabled: number;
    log_channel_id: string | null;
    ticket_enabled: number;
    ticket_category_id: string | null;
}

// App State Manager
class HappyBotApp {
    private token: string | null = null;
    private user: User | null = null;
    private guilds: Guild[] = [];
    private currentGuild: Guild | null = null;
    private config: GuildConfig | null = null;
    private channels: Channel[] = [];

    constructor() {
        this.init();
    }

    // Initialize app
    private async init(): Promise<void> {
        console.log('Initializing Happy Bot App...');
        
        // Get token from URL or localStorage
        this.token = this.getTokenFromURL() || localStorage.getItem('token');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check authentication
        if (this.token) {
            await this.loadUserData();
        } else {
            this.showLoginScreen();
        }
    }

    // Get token from URL query parameter
    private getTokenFromURL(): string | null {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            localStorage.setItem('token', token);
        }
        
        return token;
    }

    // Setup all event listeners
    private setupEventListeners(): void {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.login());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Guild selection
        document.addEventListener('click', (e) => {
            const guildCard = (e.target as HTMLElement).closest('.guild-card');
            if (guildCard) {
                const guildId = guildCard.getAttribute('data-guild-id');
                if (guildId) {
                    this.selectGuild(guildId);
                }
            }
        });

        // Back to guilds button
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showGuildsScreen());
        }

        // Save config button
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfig());
        }
    }

    // Discord OAuth2 login
    private login(): void {
        // Redirect to your backend's OAuth2 endpoint
        window.location.href = `${API_URL}/api/auth/login`;
    }

    // Logout
    private logout(): void {
        this.token = null;
        this.user = null;
        this.guilds = [];
        this.currentGuild = null;
        this.config = null;
        
        localStorage.removeItem('token');
        localStorage.removeItem('lastGuildId');
        
        this.showLoginScreen();
        this.showNotification('Logged out successfully', 'success');
    }

    // Show login screen
    private showLoginScreen(): void {
        this.showSection('loginSection');
        this.hideSection('guildsSection');
        this.hideSection('configSection');
    }

    // Show guilds screen
    private showGuildsScreen(): void {
        this.showSection('guildsSection');
        this.hideSection('configSection');
        this.renderGuilds();
    }

    // Show config screen
    private showConfigScreen(): void {
        this.showSection('configSection');
        this.hideSection('guildsSection');
    }

    // Show/hide sections
    private showSection(sectionId: string): void {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.remove('hidden');
            section.classList.add('active');
        }
    }

    private hideSection(sectionId: string): void {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('hidden');
            section.classList.remove('active');
        }
    }

    // Load user data
    private async loadUserData(): Promise<void> {
        try {
            // Get user info
            this.user = await this.fetchAPI<User>('/api/auth/me');
            this.renderUserInfo();
            
            // Get user's guilds
            this.guilds = await this.fetchAPI<Guild[]>('/api/auth/guilds');
            this.showGuildsScreen();
            
            // Try to load last selected guild
            const lastGuildId = localStorage.getItem('lastGuildId');
            if (lastGuildId) {
                const guild = this.guilds.find(g => g.id === lastGuildId);
                if (guild) {
                    await this.selectGuild(guild.id);
                }
            }
            
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.showNotification('Failed to load user data', 'error');
            this.showLoginScreen();
        }
    }

    // Render user info
    private renderUserInfo(): void {
        if (!this.user) return;

        // Avatar
        const avatarEl = document.getElementById('userAvatar') as HTMLImageElement;
        if (avatarEl && this.user.avatar) {
            avatarEl.src = `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png`;
            avatarEl.onerror = () => {
                avatarEl.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
            };
        }

        // Username
        const usernameEl = document.getElementById('userName');
        if (usernameEl) {
            usernameEl.textContent = this.user.global_name || this.user.username;
        }

        // Tag
        const tagEl = document.getElementById('userTag');
        if (tagEl) {
            tagEl.textContent = this.user.discriminator === '0' 
                ? `@${this.user.username}`
                : `${this.user.username}#${this.user.discriminator}`;
        }
    }

    // Render guilds list
    private renderGuilds(): void {
        const guildsList = document.getElementById('guildsList');
        if (!guildsList) return;

        if (this.guilds.length === 0) {
            guildsList.innerHTML = `
                <div class="no-guilds">
                    <p>No servers available</p>
                    <p class="text-sm">Make sure the bot is added to your servers</p>
                </div>
            `;
            return;
        }

        guildsList.innerHTML = this.guilds.map(guild => `
            <div class="guild-card" data-guild-id="${guild.id}">
                <div class="guild-icon">
                    ${guild.icon 
                        ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png" 
                             alt="${guild.name}"
                             onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">`
                        : `<div class="guild-icon-fallback">${guild.name.charAt(0)}</div>`
                    }
                </div>
                <div class="guild-info">
                    <h3 class="guild-name">${guild.name}</h3>
                    <div class="guild-badges">
                        ${guild.owner ? '<span class="badge owner">Owner</span>' : ''}
                        ${guild.permissions.includes('8') ? '<span class="badge admin">Admin</span>' : ''}
                    </div>
                </div>
                <div class="guild-arrow">→</div>
            </div>
        `).join('');
    }

    // Select a guild
    private async selectGuild(guildId: string): Promise<void> {
        const guild = this.guilds.find(g => g.id === guildId);
        if (!guild) return;

        this.currentGuild = guild;
        localStorage.setItem('lastGuildId', guildId);

        // Show loading
        this.showConfigScreen();
        const configSection = document.getElementById('configSection');
        if (configSection) {
            configSection.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading ${guild.name} configuration...</p>
                </div>
            `;
        }

        try {
            // Load guild config and channels
            [this.config, this.channels] = await Promise.all([
                this.fetchAPI<GuildConfig>(`/api/config/${guildId}`),
                this.fetchAPI<Channel[]>(`/api/guilds/${guildId}/channels`)
            ]);

            this.renderConfigForm();
            this.showNotification(`Loaded ${guild.name} configuration`, 'success');

        } catch (error) {
            console.error('Failed to load guild config:', error);
            this.showNotification('Failed to load configuration', 'error');
            this.showGuildsScreen();
        }
    }

    // Render configuration form
    private renderConfigForm(): void {
        if (!this.currentGuild || !this.config) return;

        const configSection = document.getElementById('configSection');
        if (!configSection) return;

        const textChannels = this.channels.filter(c => c.type === 0); // GUILD_TEXT
        const categories = this.channels.filter(c => c.type === 4); // GUILD_CATEGORY

        configSection.innerHTML = `
            <div class="config-header">
                <button id="backBtn" class="back-btn">← Back</button>
                <h2>${this.currentGuild.name} Configuration</h2>
            </div>

            <div class="config-form">
                <!-- Welcome Settings -->
                <div class="config-section">
                    <h3>Welcome Settings</h3>
                    <div class="toggle-group">
                        <label class="toggle">
                            <input type="checkbox" id="welcomeEnabled" ${this.config.welcome_enabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            Enable Welcome Messages
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="welcomeChannel">Welcome Channel</label>
                        <select id="welcomeChannel" ${!this.config.welcome_enabled ? 'disabled' : ''}>
                            <option value="">Select a channel...</option>
                            ${textChannels.map(ch => `
                                <option value="${ch.id}" ${ch.id === this.config!.welcome_channel_id ? 'selected' : ''}>
                                    #${ch.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="welcomeMessage">Welcome Message</label>
                        <textarea id="welcomeMessage" rows="3" 
                                  ${!this.config.welcome_enabled ? 'disabled' : ''}
                                  placeholder="Welcome {user} to {server}!">${this.config.welcome_message || ''}</textarea>
                        <small>Available variables: {user}, {server}, {member_count}</small>
                    </div>
                </div>

                <!-- Leave Settings -->
                <div class="config-section">
                    <h3>Leave Settings</h3>
                    <div class="toggle-group">
                        <label class="toggle">
                            <input type="checkbox" id="leaveEnabled" ${this.config.leave_enabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            Enable Leave Messages
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="leaveChannel">Leave Channel</label>
                        <select id="leaveChannel" ${!this.config.leave_enabled ? 'disabled' : ''}>
                            <option value="">Select a channel...</option>
                            ${textChannels.map(ch => `
                                <option value="${ch.id}" ${ch.id === this.config!.leave_channel_id ? 'selected' : ''}>
                                    #${ch.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- Log Settings -->
                <div class="config-section">
                    <h3>Log Settings</h3>
                    <div class="toggle-group">
                        <label class="toggle">
                            <input type="checkbox" id="logEnabled" ${this.config.log_enabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            Enable Logging
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="logChannel">Log Channel</label>
                        <select id="logChannel" ${!this.config.log_enabled ? 'disabled' : ''}>
                            <option value="">Select a channel...</option>
                            ${textChannels.map(ch => `
                                <option value="${ch.id}" ${ch.id === this.config!.log_channel_id ? 'selected' : ''}>
                                    #${ch.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- Ticket Settings -->
                <div class="config-section">
                    <h3>Ticket Settings</h3>
                    <div class="toggle-group">
                        <label class="toggle">
                            <input type="checkbox" id="ticketEnabled" ${this.config.ticket_enabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            Enable Tickets
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="ticketCategory">Ticket Category</label>
                        <select id="ticketCategory" ${!this.config.ticket_enabled ? 'disabled' : ''}>
                            <option value="">Select a category...</option>
                            ${categories.map(cat => `
                                <option value="${cat.id}" ${cat.id === this.config!.ticket_category_id ? 'selected' : ''}>
                                    📁 ${cat.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- Save Button -->
                <div class="form-actions">
                    <button id="saveBtn" class="save-btn">
                        Save Configuration
                    </button>
                </div>
            </div>
        `;

        // Enable/disable form fields based on toggles
        this.setupFormToggles();
    }

    // Setup form toggle interactions
    private setupFormToggles(): void {
        const toggles = ['welcomeEnabled', 'leaveEnabled', 'logEnabled', 'ticketEnabled'];
        
        toggles.forEach(toggleId => {
            const toggle = document.getElementById(toggleId) as HTMLInputElement;
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    const section = target.id.replace('Enabled', '');
                    
                    // Enable/disable related fields
                    const relatedFields = document.querySelectorAll(`[id^="${section}"]:not(#${toggleId})`);
                    relatedFields.forEach(field => {
                        (field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).disabled = !target.checked;
                    });
                });
            }
        });
    }

    // Save configuration
    private async saveConfig(): Promise<void> {
        if (!this.currentGuild || !this.config) return;

        const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
        const originalText = saveBtn.innerHTML;
        
        try {
            // Show loading
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<div class="spinner small"></div> Saving...';

            // Get form values
            const updatedConfig: GuildConfig = {
                welcome_enabled: (document.getElementById('welcomeEnabled') as HTMLInputElement).checked ? 1 : 0,
                welcome_channel_id: (document.getElementById('welcomeChannel') as HTMLSelectElement).value || null,
                welcome_message: (document.getElementById('welcomeMessage') as HTMLTextAreaElement).value,
                leave_enabled: (document.getElementById('leaveEnabled') as HTMLInputElement).checked ? 1 : 0,
                leave_channel_id: (document.getElementById('leaveChannel') as HTMLSelectElement).value || null,
                log_enabled: (document.getElementById('logEnabled') as HTMLInputElement).checked ? 1 : 0,
                log_channel_id: (document.getElementById('logChannel') as HTMLSelectElement).value || null,
                ticket_enabled: (document.getElementById('ticketEnabled') as HTMLInputElement).checked ? 1 : 0,
                ticket_category_id: (document.getElementById('ticketCategory') as HTMLSelectElement).value || null,
            };

            // Send update
            await this.fetchAPI(`/api/config/${this.currentGuild.id}`, {
                method: 'POST',
                body: JSON.stringify(updatedConfig),
            });

            this.config = updatedConfig;
            this.showNotification('Configuration saved successfully!', 'success');

        } catch (error) {
            console.error('Failed to save config:', error);
            this.showNotification('Failed to save configuration', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // Generic fetch API helper
    private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
        
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
            ...options?.headers,
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
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
            throw error instanceof Error ? error : new Error('Network error');
        }
    }

    // Show notification
    private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="close-btn">×</button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Close button
        notification.querySelector('.close-btn')?.addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new HappyBotApp();
    
    // Expose app for debugging (optional)
    (window as any).HappyBotApp = app;
});
