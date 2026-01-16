// main.ts - Clean, working Discord bot dashboard
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://api-happy-production.up.railway.app:';

console.log('API Base URL:', API_BASE);

// Types
interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    email?: string;
}

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
}

// Simple state
let currentUser: User | null = null;
let userGuilds: Guild[] = [];
let selectedGuildId: string | null = null;

// DOM elements cache
const elements = {
    loginSection: () => document.getElementById('loginSection'),
    dashboardSection: () => document.getElementById('dashboardSection'),
    configSection: () => document.getElementById('configSection'),
    userAvatar: () => document.getElementById('userAvatar') as HTMLImageElement,
    userName: () => document.getElementById('userName'),
    guildsList: () => document.getElementById('guildsList'),
    currentGuildName: () => document.getElementById('currentGuildName'),
    logoutBtn: () => document.getElementById('logoutBtn'),
    loginBtn: () => document.getElementById('loginBtn'),
    backBtn: () => document.getElementById('backBtn'),
    saveBtn: () => document.getElementById('saveBtn'),
};

// Show/hide helpers
function showSection(sectionId: string) {
    const sections = ['loginSection', 'dashboardSection', 'configSection'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = id === sectionId ? 'block' : 'none';
        }
    });
}

function showError(message: string) {
    console.error('Error:', message);
    alert(`Error: ${message}`);
}

// API fetch helper
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    console.log('Fetching:', url);
    
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options?.headers,
    };

    // Add token from localStorage if available
    const token = localStorage.getItem('discord_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired
                localStorage.removeItem('discord_token');
                showSection('loginSection');
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response data:', data);
        return data;

    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Check if we have a token in URL
function checkURLToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
        console.log('Found token in URL');
        localStorage.setItem('discord_token', token);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }
    
    return false;
}

// Load current user
async function loadCurrentUser() {
    try {
        console.log('Loading user...');
        currentUser = await fetchAPI<User>('/api/auth/me');
        console.log('User loaded:', currentUser);
        
        // Update UI
        if (elements.userAvatar() && currentUser.avatar) {
            elements.userAvatar().src = `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`;
        }
        if (elements.userName()) {
            elements.userName().textContent = currentUser.username;
        }
        
        // Load guilds
        await loadUserGuilds();
        
        // Show dashboard
        showSection('dashboardSection');
        
    } catch (error) {
        console.error('Failed to load user:', error);
        showSection('loginSection');
    }
}

// Load user's guilds
async function loadUserGuilds() {
    try {
        console.log('Loading guilds...');
        userGuilds = await fetchAPI<Guild[]>('/api/auth/guilds');
        console.log('Guilds loaded:', userGuilds.length);
        
        renderGuildsList();
        
    } catch (error) {
        console.error('Failed to load guilds:', error);
        userGuilds = [];
        renderGuildsList();
    }
}

// Render guilds list
function renderGuildsList() {
    const container = elements.guildsList();
    if (!container) return;
    
    if (userGuilds.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No servers available</p>
                <p class="text-sm">Make sure the bot is added to your servers</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userGuilds.map(guild => `
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
                ${guild.owner ? '<span class="badge owner">Owner</span>' : ''}
            </div>
            <div class="guild-arrow">→</div>
        </div>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.guild-card').forEach(card => {
        card.addEventListener('click', () => {
            const guildId = card.getAttribute('data-guild-id');
            if (guildId) {
                loadGuildConfig(guildId);
            }
        });
    });
}

// Load guild configuration
async function loadGuildConfig(guildId: string) {
    selectedGuildId = guildId;
    
    const guild = userGuilds.find(g => g.id === guildId);
    if (guild && elements.currentGuildName()) {
        elements.currentGuildName().textContent = guild.name;
    }
    
    try {
        showSection('configSection');
        
        // Load config data
        const config = await fetchAPI<any>(`/api/config/${guildId}`);
        console.log('Guild config:', config);
        
        // For now, just show we loaded it
        alert(`Loaded config for ${guild?.name || 'server'}`);
        
    } catch (error) {
        console.error('Failed to load guild config:', error);
        showError('Could not load server configuration');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login button
    if (elements.loginBtn()) {
        elements.loginBtn().addEventListener('click', () => {
            window.location.href = `${API_BASE}/api/auth/login`;
        });
    }
    
    // Logout button
    if (elements.logoutBtn()) {
        elements.logoutBtn().addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('discord_token');
                currentUser = null;
                userGuilds = [];
                selectedGuildId = null;
                showSection('loginSection');
            }
        });
    }
    
    // Back button
    if (elements.backBtn()) {
        elements.backBtn().addEventListener('click', () => {
            showSection('dashboardSection');
        });
    }
    
    // Save button
    if (elements.saveBtn()) {
        elements.saveBtn().addEventListener('click', () => {
            alert('Save functionality would go here!');
        });
    }
}

// Initialize the app
async function initializeApp() {
    console.log('Initializing app...');
    console.log('Window location:', window.location.href);
    
    setupEventListeners();
    
    // Check for token in URL first
    checkURLToken();
    
    // Check if we have a token stored
    const token = localStorage.getItem('discord_token');
    console.log('Stored token exists:', !!token);
    
    if (token) {
        console.log('Token found, loading user...');
        await loadCurrentUser();
    } else {
        console.log('No token found, showing login');
        showSection('loginSection');
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for debugging
(window as any).App = {
    currentUser,
    userGuilds,
    selectedGuildId,
    reload: loadCurrentUser,
    logout: () => {
        localStorage.removeItem('discord_token');
        showSection('loginSection');
    }
};
