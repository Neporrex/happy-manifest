// auth.js - Global Authentication Handler for Happy Bot Dashboard
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://api-happy-production.up.railway.app';

console.log('🔧 API URL:', API_URL);
console.log('📍 Current URL:', window.location.href);

class AuthManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.init();
    }

    async init() {
        console.log('🔄 Initializing AuthManager...');
        
        // Check for token in URL (OAuth callback)
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        
        if (urlToken) {
            console.log('✅ Token found in URL');
            this.token = urlToken;
            localStorage.setItem('discord_token', urlToken);
            
            // Clean URL
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            
            // Check for redirect parameter
            const redirect = params.get('redirect');
            if (redirect === 'dashboard') {
                console.log('🔄 Redirecting to dashboard...');
                window.history.replaceState({}, document.title, '/dashboard');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 500);
            } else {
                window.history.replaceState({}, document.title, url.pathname);
                console.log('🧹 URL cleaned:', url.pathname);
            }
        } else {
            this.token = localStorage.getItem('discord_token');
            console.log('🔍 Token from localStorage:', this.token ? 'Found' : 'Not found');
        }

        // Update UI based on auth state
        this.updateAuthUI();
        
        // Load user if token exists
        if (this.token) {
            console.log('👤 Loading user data...');
            await this.loadUser();
        }
    }

    async fetchAPI(endpoint, options = {}) {
        console.log('📡 Fetching:', `${API_URL}${endpoint}`);
        
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
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
                    console.log('❌ Unauthorized, logging out...');
                    this.logout();
                    throw new Error('Session expired. Please login again.');
                }
                if (response.status === 404) {
                    throw new Error('API endpoint not found');
                }
                throw new Error(`API Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Response data:', data);
            return data;
            
        } catch (error) {
            console.error('❌ API Error:', error);
            
            // Show user-friendly error
            this.showNotification(error.message || 'Network error', 'error');
            
            throw error;
        }
    }

    async loadUser() {
        try {
            console.log('👤 Loading user info...');
            this.user = await this.fetchAPI('/api/auth/me');
            console.log('✅ User loaded:', this.user);
            
            this.updateAuthUI();
            
            // Show success notification
            if (new URLSearchParams(window.location.search).get('token')) {
                this.showNotification(`Welcome, ${this.user.global_name || this.user.username}!`, 'success');
            }
            
        } catch (error) {
            console.error('❌ Failed to load user:', error);
            
            // Only logout if it's an auth error (not network error)
            if (error.message.includes('Session expired') || error.message.includes('401')) {
                this.logout();
            } else {
                this.showNotification('Failed to load user data. Please try again.', 'error');
            }
        }
    }

    updateAuthUI() {
        console.log('🎨 Updating auth UI...');
        
        const loginButton = document.getElementById('loginButton');
        const userDropdown = document.getElementById('userDropdownContainer');
        
        if (this.user && this.token) {
            // User is logged in
            console.log('👤 User is logged in:', this.user.username);
            
            if (loginButton) {
                loginButton.classList.add('hidden');
                loginButton.style.display = 'none';
            }
            
            if (userDropdown) {
                userDropdown.classList.remove('hidden');
                userDropdown.style.display = 'block';
            }
            
            // Update user info
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
                name.title = `ID: ${this.user.id}`;
            }
            
            if (fullName) {
                fullName.textContent = displayName;
            }
            
            // Setup dropdown
            this.setupDropdown();
            
        } else {
            // User is not logged in
            console.log('👤 User is NOT logged in');
            
            if (loginButton) {
                loginButton.classList.remove('hidden');
                loginButton.style.display = 'block';
                
                // Update login URL
                const loginUrl = `${API_URL}/api/auth/login`;
                loginButton.onclick = () => {
                    console.log('🔗 Redirecting to Discord login:', loginUrl);
                    window.location.href = loginUrl;
                };
                loginButton.href = loginUrl;
            }
            
            if (userDropdown) {
                userDropdown.classList.add('hidden');
                userDropdown.style.display = 'none';
            }
        }
    }

    setupDropdown() {
        const dropdownButton = document.getElementById('userDropdownButton');
        const dropdownMenu = document.getElementById('userDropdownMenu');
        const logoutButton = document.getElementById('logoutButton');
        
        if (!dropdownButton || !dropdownMenu || !logoutButton) {
            console.warn('⚠️ Dropdown elements not found');
            return;
        }
        
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
            if (confirm('Are you sure you want to logout?')) {
                this.logout();
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this.hideDropdown();
        });
        
        console.log('✅ Dropdown setup complete');
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
        console.log('🚪 Logging out...');
        
        localStorage.removeItem('discord_token');
        this.token = null;
        this.user = null;
        
        this.showNotification('Logged out successfully', 'info');
        
        // Update UI
        this.updateAuthUI();
        
        // Redirect to home if on dashboard
        if (window.location.pathname.includes('/dashboard')) {
            console.log('🔄 Redirecting to home page...');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.auth-notification');
        existing.forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = `auth-notification auth-notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="auth-notification-close">×</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        
        // Set colors based on type
        if (type === 'success') {
            notification.style.background = '#10B981';
        } else if (type === 'error') {
            notification.style.background = '#EF4444';
        } else if (type === 'info') {
            notification.style.background = '#3B82F6';
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
        
        // Close button
        notification.querySelector('.auth-notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Add CSS animations if not present
        if (!document.getElementById('auth-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'auth-notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
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
    
    // Helper for other scripts to check auth
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.showNotification('Please login to continue', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return false;
        }
        return true;
    }
}

// Create global auth instance
if (!window.Auth) {
    window.Auth = new AuthManager();
    console.log('🌐 Global Auth instance created');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, initializing auth...');
        window.Auth.init();
    });
} else {
    console.log('📄 DOM already loaded, initializing auth...');
    window.Auth.init();
}

// Export for debugging
window.authDebug = {
    API_URL,
    getToken: () => window.Auth?.getToken(),
    getUser: () => window.Auth?.getUser(),
    logout: () => window.Auth?.logout(),
    reload: () => window.Auth?.loadUser()
};
