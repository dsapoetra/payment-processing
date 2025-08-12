// Authentication Management System

class AuthManager {
    constructor() {
        this.apiBase = '/api/v1';
        this.token = localStorage.getItem('authToken');

        // Safely parse JSON from localStorage
        try {
            const userStr = localStorage.getItem('user');
            this.user = userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.warn('Failed to parse user from localStorage:', e);
            this.user = null;
            localStorage.removeItem('user');
        }

        try {
            const tenantStr = localStorage.getItem('tenant');
            this.tenant = tenantStr ? JSON.parse(tenantStr) : null;
        } catch (e) {
            console.warn('Failed to parse tenant from localStorage:', e);
            this.tenant = null;
            localStorage.removeItem('tenant');
        }

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Demo account button
        const demoBtn = document.getElementById('demo-account-btn');
        if (demoBtn) {
            demoBtn.addEventListener('click', () => {
                this.createDemoAccount();
            });
        }

        // Auto-fill demo credentials on double-click
        const emailField = document.getElementById('email');
        if (emailField) {
            emailField.addEventListener('dblclick', () => {
                this.fillDemoCredentials();
            });
        }
    }

    async handleLogin() {
        const form = document.getElementById('login-form');
        const formData = new FormData(form);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        this.setLoading('login', true);
        this.clearAlerts();

        try {
            const response = await fetch(`${this.apiBase}/auth/public-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok) {
                this.handleLoginSuccess(result);
            } else {
                this.showAlert('danger', result.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('danger', 'Network error. Please try again.');
        } finally {
            this.setLoading('login', false);
        }
    }

    async createDemoAccount() {
        this.setLoading('demo-account', true);
        this.clearAlerts();

        try {
            // First, create a demo user and tenant
            const demoData = {
                email: `demo-${Date.now()}@example.com`,
                password: 'DemoPassword123!',
                firstName: 'Demo',
                lastName: 'User',
                organizationName: 'Demo Organization',
                organizationType: 'startup',
                industry: 'ecommerce',
                description: 'Demo organization for testing payment processing'
            };

            // Register the demo user
            const registerResponse = await fetch(`${this.apiBase}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(demoData)
            });

            if (registerResponse.ok) {
                const registerResult = await registerResponse.json();
                
                // Auto-login with demo credentials
                const loginResponse = await fetch(`${this.apiBase}/auth/public-login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: demoData.email,
                        password: demoData.password
                    })
                });

                if (loginResponse.ok) {
                    const loginResult = await loginResponse.json();
                    this.handleLoginSuccess(loginResult);
                    this.showAlert('success', 'Demo account created and logged in successfully!');
                } else {
                    this.showAlert('info', 'Demo account created. Please log in with the credentials provided.');
                    this.fillDemoCredentials(demoData.email, demoData.password);
                }
            } else {
                const error = await registerResponse.json();
                this.showAlert('danger', error.message || 'Failed to create demo account.');
            }
        } catch (error) {
            console.error('Demo account creation error:', error);
            this.showAlert('danger', 'Failed to create demo account. Please try manual registration.');
        } finally {
            this.setLoading('demo-account', false);
        }
    }

    handleLoginSuccess(result) {
        // Store authentication data
        this.token = result.accessToken;
        this.user = result.user;
        this.tenant = result.tenant;

        localStorage.setItem('authToken', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        localStorage.setItem('tenant', JSON.stringify(this.tenant));

        this.showAlert('success', 'Login successful! Redirecting...');

        // Redirect based on user role or intended destination
        setTimeout(() => {
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/ui/admin';
            window.location.href = redirectUrl;
        }, 1500);
    }

    fillDemoCredentials(email = 'demo@example.com', password = 'DemoPassword123!') {
        const emailField = document.getElementById('email');
        const passwordField = document.getElementById('password');
        
        if (emailField) emailField.value = email;
        if (passwordField) passwordField.value = password;
        
        this.showAlert('info', 'Demo credentials filled. Click "Sign In" to continue.');
    }

    async logout() {
        try {
            if (this.token) {
                await fetch(`${this.apiBase}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('tenant');
            
            this.token = null;
            this.user = null;
            this.tenant = null;
            
            // Redirect to login
            window.location.href = '/ui/auth/login.html';
        }
    }

    checkAuthStatus() {
        // Check if we're on a protected page
        const protectedPages = ['/ui/admin', '/ui/dashboard'];
        const currentPath = window.location.pathname;
        
        if (protectedPages.some(page => currentPath.startsWith(page))) {
            if (!this.isAuthenticated()) {
                window.location.href = `/ui/auth/login.html?redirect=${encodeURIComponent(currentPath)}`;
                return;
            }
        }

        // Update UI based on auth status
        this.updateAuthUI();
    }

    isAuthenticated() {
        return !!(this.token && this.user && this.tenant);
    }

    updateAuthUI() {
        // Update navigation and user info displays
        const userDisplays = document.querySelectorAll('[data-user-info]');
        userDisplays.forEach(element => {
            if (this.user) {
                const info = element.getAttribute('data-user-info');
                switch (info) {
                    case 'name':
                        element.textContent = `${this.user.firstName} ${this.user.lastName}`;
                        break;
                    case 'email':
                        element.textContent = this.user.email;
                        break;
                    case 'tenant':
                        element.textContent = this.tenant?.name || 'Unknown Organization';
                        break;
                }
            }
        });

        // Show/hide auth-dependent elements
        const authElements = document.querySelectorAll('[data-auth-required]');
        authElements.forEach(element => {
            if (this.isAuthenticated()) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });

        const noAuthElements = document.querySelectorAll('[data-no-auth-required]');
        noAuthElements.forEach(element => {
            if (!this.isAuthenticated()) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
    }

    getAuthHeaders() {
        if (!this.token) {
            return {};
        }
        
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    async apiCall(endpoint, options = {}) {
        const url = this.apiBase + endpoint;
        const defaultOptions = {
            headers: this.getAuthHeaders()
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (response.status === 401) {
            // Token expired or invalid
            this.logout();
            throw new Error('Authentication required');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API request failed');
        }

        return await response.json();
    }

    setLoading(buttonId, loading) {
        const button = document.getElementById(`${buttonId}-btn`);
        const spinner = document.getElementById(`${buttonId}-spinner`);
        
        if (button && spinner) {
            if (loading) {
                button.disabled = true;
                spinner.style.display = 'inline-block';
            } else {
                button.disabled = false;
                spinner.style.display = 'none';
            }
        }
    }

    showAlert(type, message) {
        const container = document.getElementById('alert-container');
        if (!container) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            danger: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    clearAlerts() {
        const container = document.getElementById('alert-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    // Utility method to get current user info
    getCurrentUser() {
        return {
            user: this.user,
            tenant: this.tenant,
            token: this.token,
            isAuthenticated: this.isAuthenticated()
        };
    }

    // Method to refresh token
    async refreshToken() {
        try {
            const response = await fetch(`${this.apiBase}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.token = result.accessToken;
                localStorage.setItem('authToken', this.token);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        
        return false;
    }
}

// Global auth manager instance
let authManager = null;

// Global logout function
function logout() {
    if (authManager) {
        authManager.logout();
    }
}

// Utility function to clear corrupted localStorage data
function clearCorruptedAuthData() {
    try {
        const items = ['authToken', 'user', 'tenant'];
        items.forEach(item => {
            const value = localStorage.getItem(item);
            if (value && item !== 'authToken') {
                JSON.parse(value); // Test if it's valid JSON
            }
        });
    } catch (e) {
        console.warn('Clearing corrupted localStorage data:', e);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tenant');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    clearCorruptedAuthData();
    authManager = new AuthManager();
    window.authManager = authManager;
});
