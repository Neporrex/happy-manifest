// auth.js - Global Authentication Handler
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://your-api-domain.vercel.app';

class AuthManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.init();
    }

    async init() {
        // Check for token in URL (OAuth callback)
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        
        if (urlToken) {
            this.token = urlToken;
            localStorage.setItem('discord_token', urlToken);
            
            // Clean URL
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            
            // Check for redirect parameter
            const redirect = params.get('redirect');
            if (redirect === 'dashboard') {
                window.history.replaceState({}, document.title, '/dashboard');
                window.location.href = '/dashboard';
            } else {
                window.history.replaceState({}, document.title, url.pathname);
            }
        } else {
            this.token = localStorage.getItem('discord_token');
        }

        // Update UI based on auth state
        this.updateAuthUI();
        
        // Load user if token exists
        if (this.token) {
            await this.loadUser();
        }
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
                    throw new Error('Session expired');
                }
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async loadUser() {
        try {
            this.user = await this.fetchAPI('/api/auth/me');
            this.updateAuthUI();
        } catch (error) {
            console.error('Failed to load user:', error);
            this.logout();
        }
    }

    updateAuthUI() {
        const loginButton = document.getElementById('loginButton');
        const userDropdown = document.getElementById('userDropdownContainer');
        
        if (this.user) {
            // User is logged in
            if (loginButton) loginButton.classList.add('hidden');
            if (userDropdown) userDropdown.classList.remove('hidden');
            
            // Update user info
            const avatar = document.getElementById('userAvatar');
            const name = document.getElementById('userName');
            const fullName = document.getElementById('userFullName');
            
            const displayName = this.user.global_name || this.user.username;
            
            if (avatar && this.user.avatar) {
                avatar.src = this.user.avatar;
            }
            
            if (name) {
                name.textContent = displayName;
            }
            
            if (fullName) {
                fullName.textContent = displayName;
            }
            
            // Setup dropdown
            this.setupDropdown();
        } else {
            // User is not logged in
            if (loginButton) loginButton.classList.remove('hidden');
            if (userDropdown) userDropdown.classList.add('hidden');
        }
    }

    setupDropdown() {
        const dropdownButton = document.getElementById('userDropdownButton');
        const dropdownMenu = document.getElementById('userDropdownMenu');
        const logoutButton = document.getElementById('logoutButton');
        
        if (!dropdownButton || !dropdownMenu || !logoutButton) return;
        
        // Toggle dropdown
        dropdownButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdownMenu.classList.contains('opacity-100');
            
            if (isVisible) {
                this.hideDropdown();
            } else {
                this.showDropdown();
            }
        });
        
        // Logout button
        logoutButton.addEventListener('click', () => {
            this.logout();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this.hideDropdown();
        });
    }
    
    showDropdown() {
        const dropdownMenu = document.getElementById('userDropdownMenu');
        if (dropdownMenu) {
            dropdownMenu.classList.remove('opacity-0', 'invisible', 'translate-y-2');
            dropdownMenu.classList.add('opacity-100', 'visible', 'translate-y-0');
        }
    }
    
    hideDropdown() {
        const dropdownMenu = document.getElementById('userDropdownMenu');
        if (dropdownMenu) {
            dropdownMenu.classList.remove('opacity-100', 'visible', 'translate-y-0');
            dropdownMenu.classList.add('opacity-0', 'invisible', 'translate-y-2');
        }
    }

    logout() {
        localStorage.removeItem('discord_token');
        this.token = null;
        this.user = null;
        this.updateAuthUI();
        
        // Redirect to home if on dashboard
        if (window.location.pathname.includes('/dashboard')) {
            window.location.href = '/';
        }
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }
}

// Create global auth instance
window.Auth = new AuthManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.Auth.init();
});