// Constants and Interfaces
const API_URL = '/api';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

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
    position: number;
    parent_id?: string;
}

interface GuildConfig {
    welcome_enabled: number;
    welcome_channel_id: number | null;
    welcome_message: string;
    leave_enabled: number;
    leave_channel_id: number | null;
    log_enabled: number;
    log_channel_id: number | null;
    ticket_enabled: number;
    ticket_category_id: number | null;
}

interface ConfigForm {
    welcomeEnabled: boolean;
    welcomeChannel: string;
    welcomeMessage: string;
    leaveEnabled: boolean;
    leaveChannel: string;
    logEnabled: boolean;
    logChannel: string;
    ticketEnabled: boolean;
    ticketCategory: string;
}

// State Management
class AppState {
    private _token: string | null = null;
    private _user: User | null = null;
    private _guilds: Guild[] = [];
    private _currentGuildId: string | null = null;
    private _lastActivity: number = Date.now();
    private _sessionTimer: number | null = null;

    constructor() {
        this.setupActivityListener();
    }

    get token(): string | null {
        return this._token;
    }

    set token(value: string | null) {
        this._token = value;
        if (value) {
            localStorage.setItem('discord_token', value);
            this.resetSessionTimer();
        } else {
            localStorage.removeItem('discord_token');
            this.clearSessionTimer();
        }
    }

    get user(): User | null {
        return this._user;
    }

    set user(value: User | null) {
        this._user = value;
        this.updateUserUI();
    }

    get guilds(): Guild[] {
        return this._guilds;
    }

    set guilds(value: Guild[]) {
        this._guilds = value;
        this.updateGuildsUI();
    }

    get currentGuildId(): string | null {
        return this._currentGuildId;
    }

    set currentGuildId(value: string | null) {
        this._currentGuildId = value;
        if (value) {
            localStorage.setItem('last_guild_id', value);
        }
    }

    private setupActivityListener(): void {
        const activityEvents = ['mousemove', 'keypress', 'click', 'scroll'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this._lastActivity = Date.now();
            });
        });

        // Check session every minute
        setInterval(() => this.checkSession(), 60 * 1000);
    }

    private resetSessionTimer(): void {
        this._lastActivity = Date.now();
        this.clearSessionTimer();
        
        this._sessionTimer = window.setTimeout(() => {
            if (Date.now() - this._lastActivity > SESSION_TIMEOUT) {
                this.logout();
            }
        }, SESSION_TIMEOUT);
    }

    private clearSessionTimer(): void {
        if (this._sessionTimer) {
            clearTimeout(this._sessionTimer);
            this._sessionTimer = null;
        }
    }

    private checkSession(): void {
        if (this._token && Date.now() - this._lastActivity > SESSION_TIMEOUT) {
            this.logout();
        }
    }

    private updateUserUI(): void {
        const loginSection = document.getElementById('loginSection');
        const userSection = document.getElementById('userSection');
        
        if (!this._user) {
            loginSection?.classList.remove('hidden');
            userSection?.classList.add('hidden');
            return;
        }

        loginSection?.classList.add('hidden');
        userSection?.classList.remove('hidden');

        // Update user info
        const avatarEl = document.getElementById('userAvatar') as HTMLImageElement;
        const nameEl = document.getElementById('userName');
        const idEl = document.getElementById('userId');
        const emailEl = document.getElementById('userEmail');

        if (avatarEl && this._user.avatar) {
            avatarEl.src = `https://cdn.discordapp.com/avatars/${this._user.id}/${this._user.avatar}.png`;
            avatarEl.onerror = () => {
                avatarEl.src = '/assets/default-avatar.png';
            };
        }

        if (nameEl) {
            nameEl.textContent = this._user.global_name || this._user.username;
        }

        if (idEl) {
            idEl.textContent = this._user.discriminator !== '0' 
                ? `#${this._user.discriminator}` 
                : `@${this._user.username}`;
        }

        if (emailEl && this._user.email) {
            emailEl.textContent = this._user.email;
            emailEl.parentElement?.classList.remove('hidden');
        }
    }

    private updateGuildsUI(): void {
        const guildsList = document.getElementById('guildsList');
        if (!guildsList) return;

        guildsList.innerHTML = '';

        if (this._guilds.length === 0) {
            guildsList.innerHTML = `
                <div class="empty-state">
                    <p>No servers available</p>
                    <p class="text-sm text-gray-400">Make sure the bot is added to your servers</p>
                </div>
            `;
            return;
        }

        this._guilds.forEach(guild => {
            const card = document.createElement('div');
            card.className = 'guild-card group hover-lift';
            card.setAttribute('data-guild-id', guild.id);
            
            card.innerHTML = `
                <div class="guild-header">
                    ${guild.icon 
                        ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png" 
                             class="guild-icon rounded-xl"
                             alt="${guild.name}"
                             onerror="this.onerror=null; this.src='/assets/default-server.png'">` 
                        : `<div class="guild-icon bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                              <span class="text-lg font-bold">${guild.name.charAt(0)}</span>
                           </div>`
                    }
                    <div class="flex-1 min-w-0">
                        <h3 class="truncate font-semibold">${guild.name}</h3>
                        <div class="flex items-center gap-2 mt-1">
                            ${guild.owner 
                                ? `<span class="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Owner</span>` 
                                : ''
                            }
                            ${guild.permissions.includes('8') 
                                ? `<span class="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Admin</span>` 
                                : ''
                            }
                        </div>
                    </div>
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                </div>
            `;

            card.addEventListener('click', () => this.loadGuildConfig(guild.id, guild.name));
            guildsList.appendChild(card);
        });

        // Load last selected guild
        const lastGuildId = localStorage.getItem('last_guild_id');
        if (lastGuildId && this._guilds.some(g => g.id === lastGuildId)) {
            const guild = this._guilds.find(g => g.id === lastGuildId);
            if (guild) {
                this.loadGuildConfig(guild.id, guild.name);
            }
        }
    }

    private async loadGuildConfig(guildId: string, guildName: string): Promise<void> {
        this.currentGuildId = guildId;
        
        const guildNameEl = document.getElementById('guildName');
        if (guildNameEl) {
            guildNameEl.textContent = guildName;
        }

        this.showSection('configSection');
        
        try {
            const [config, channels] = await Promise.all([
                this.fetchAPI<GuildConfig>(`/api/config/${guildId}`),
                this.fetchAPI<Channel[]>(`/api/guilds/${guildId}/channels`)
            ]);

            const textChannels = channels.filter(ch => ch.type === 0);
            const categories = channels.filter(ch => ch.type === 4);

            this.populateSelect('welcomeChannel', textChannels, config.welcome_channel_id);
            this.populateSelect('leaveChannel', textChannels, config.leave_channel_id);
            this.populateSelect('logChannel', textChannels, config.log_channel_id);
            this.populateSelect('ticketCategory', categories, config.ticket_category_id);

            const form: ConfigForm = {
                welcomeEnabled: config.welcome_enabled === 1,
                welcomeChannel: config.welcome_channel_id?.toString() || '',
                welcomeMessage: config.welcome_message || '',
                leaveEnabled: config.leave_enabled === 1,
                leaveChannel: config.leave_channel_id?.toString() || '',
                logEnabled: config.log_enabled === 1,
                logChannel: config.log_channel_id?.toString() || '',
                ticketEnabled: config.ticket_enabled === 1,
                ticketCategory: config.ticket_category_id?.toString() || ''
            };

            this.setFormValues(form);
            
            // Show success notification
            this.showNotification('Configuration loaded successfully', 'success');
        } catch (error) {
            console.error('Failed to load guild config:', error);
            this.showNotification('Failed to load configuration', 'error');
        }
    }

    private populateSelect(selectId: string, items: Channel[], selectedId: number | null): void {
        const select = document.getElementById(selectId) as HTMLSelectElement;
        if (!select) return;
        
        select.innerHTML = '<option value="">Select...</option>';
        
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.type === 4 ? `📁 ${item.name}` : `# ${item.name}`;
            if (item.id === String(selectedId)) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    private setFormValues(form: ConfigForm): void {
        (document.getElementById('welcomeEnabled') as HTMLInputElement).checked = form.welcomeEnabled;
        (document.getElementById('welcomeChannel') as HTMLSelectElement).value = form.welcomeChannel;
        (document.getElementById('welcomeMessage') as HTMLTextAreaElement).value = form.welcomeMessage;
        (document.getElementById('leaveEnabled') as HTMLInputElement).checked = form.leaveEnabled;
        (document.getElementById('leaveChannel') as HTMLSelectElement).value = form.leaveChannel;
        (document.getElementById('logEnabled') as HTMLInputElement).checked = form.logEnabled;
        (document.getElementById('logChannel') as HTMLSelectElement).value = form.logChannel;
        (document.getElementById('ticketEnabled') as HTMLInputElement).checked = form.ticketEnabled;
        (document.getElementById('ticketCategory') as HTMLSelectElement).value = form.ticketCategory;
    }

    private getFormValues(): ConfigForm {
        return {
            welcomeEnabled: (document.getElementById('welcomeEnabled') as HTMLInputElement).checked,
            welcomeChannel: (document.getElementById('welcomeChannel') as HTMLSelectElement).value,
            welcomeMessage: (document.getElementById('welcomeMessage') as HTMLTextAreaElement).value,
            leaveEnabled: (document.getElementById('leaveEnabled') as HTMLInputElement).checked,
            leaveChannel: (document.getElementById('leaveChannel') as HTMLSelectElement).value,
            logEnabled: (document.getElementById('logEnabled') as HTMLInputElement).checked,
            logChannel: (document.getElementById('logChannel') as HTMLSelectElement).value,
            ticketEnabled: (document.getElementById('ticketEnabled') as HTMLInputElement).checked,
            ticketCategory: (document.getElementById('ticketCategory') as HTMLSelectElement).value
        };
    }

    async fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(this._token ? { 'Authorization': `Bearer ${this._token}` } : {}),
            ...options.headers,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    throw new Error('Session expired. Please login again.');
                }
                if (response.status === 403) {
                    throw new Error('You don\'t have permission to access this resource.');
                }
                if (response.status === 404) {
                    throw new Error('Resource not found.');
                }
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout. Please try again.');
                }
                throw error;
            }
            throw new Error('Network error. Please check your connection.');
        }
    }

    showSection(sectionId: string): void {
        const sections = ['guildsSection', 'configSection'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === sectionId) {
                    element.classList.remove('hidden');
                    element.classList.add('active');
                } else {
                    element.classList.add('hidden');
                    element.classList.remove('active');
                }
            }
        });
    }

    async loadUser(): Promise<void> {
        try {
            this.user = await this.fetchAPI<User>('/api/auth/me');
            this.guilds = await this.fetchAPI<Guild[]>('/api/auth/guilds');
        } catch (error) {
            console.error('Failed to load user:', error);
            this.user = null;
            this.guilds = [];
            this.showNotification(error instanceof Error ? error.message : 'Failed to load user data', 'error');
        }
    }

    async saveConfig(): Promise<void> {
        if (!this.currentGuildId) return;

        const form = this.getFormValues();
        const config: GuildConfig = {
            welcome_enabled: form.welcomeEnabled ? 1 : 0,
            welcome_channel_id: form.welcomeChannel ? parseInt(form.welcomeChannel) : null,
            welcome_message: form.welcomeMessage,
            leave_enabled: form.leaveEnabled ? 1 : 0,
            leave_channel_id: form.leaveChannel ? parseInt(form.leaveChannel) : null,
            log_enabled: form.logEnabled ? 1 : 0,
            log_channel_id: form.logChannel ? parseInt(form.logChannel) : null,
            ticket_enabled: form.ticketEnabled ? 1 : 0,
            ticket_category_id: form.ticketCategory ? parseInt(form.ticketCategory) : null,
        };

        const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
        const originalText = saveButton.textContent;
        
        try {
            saveButton.disabled = true;
            saveButton.innerHTML = '<span class="loading-spinner"></span>Saving...';
            
            await this.fetchAPI(`/api/config/${this.currentGuildId}`, {
                method: 'POST',
                body: JSON.stringify(config),
            });

            this.showNotification('Configuration saved successfully!', 'success');
            
            // Auto-save indicator
            const indicator = document.createElement('div');
            indicator.className = 'save-indicator';
            indicator.textContent = 'Saved';
            saveButton.appendChild(indicator);
            
            setTimeout(() => {
                indicator.remove();
            }, 2000);
        } catch (error) {
            console.error('Failed to save config:', error);
            this.showNotification(error instanceof Error ? error.message : 'Failed to save configuration', 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = originalText;
        }
    }

    logout(): void {
        this.token = null;
        this.user = null;
        this.guilds = [];
        this.currentGuildId = null;
        localStorage.removeItem('discord_token');
        localStorage.removeItem('last_guild_id');
        
        // Clear URL token if present
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.pathname);
        
        this.showSection('loginSection');
        this.showNotification('Logged out successfully', 'info');
    }

    showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">×</button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('notification-hide');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Close button
        notification.querySelector('.notification-close')?.addEventListener('click', () => {
            notification.classList.add('notification-hide');
            setTimeout(() => notification.remove(), 300);
        });
    }

    getTokenFromURL(): string | null {
        const params = new URLSearchParams(window.location.search);
        return params.get('token');
    }

    initialize(): void {
        // Get token from URL or localStorage
        const urlToken = this.getTokenFromURL();
        if (urlToken) {
            this.token = urlToken;
            // Clean URL
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.pathname);
        } else {
            this.token = localStorage.getItem('discord_token');
        }

        // Set up event listeners
        this.setupEventListeners();

        // Load user if token exists
        if (this.token) {
            this.loadUser();
        } else {
            this.showSection('loginSection');
        }
    }

    private setupEventListeners(): void {
        // Back button
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.showSection('guildsSection'));
        }

        // Save button
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveConfig());
        }

        // Logout button
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    this.logout();
                }
            });
        }

        // Form validation
        const formElements = document.querySelectorAll('input, select, textarea');
        formElements.forEach(el => {
            el.addEventListener('change', () => {
                const saveButton = document.getElementById('saveButton');
                if (saveButton) {
                    saveButton.classList.add('unsaved');
                }
            });
        });

        // Auto-save on form submission (Ctrl+S or Cmd+S)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveConfig();
            }
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new AppState();
    app.initialize();

    // Expose to window for debugging
    (window as any).App = app;
});
