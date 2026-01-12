class Auth {
    constructor() {
        this.token = localStorage.getItem('cn_token');
        this.user = JSON.parse(localStorage.getItem('cn_user') || 'null');
        this.apiUrl = window.API_URL || '/api';
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const data = await response.json();
            this.token = data.access_token;
            localStorage.setItem('cn_token', this.token);

            // Get user info
            const user = await this.getUserInfo();
            if (!user) {
                throw new Error('Failed to get user info after login');
            }

            return true;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async getUserInfo() {
        if (!this.token) return null;

        try {
            const response = await fetch(`${this.apiUrl}/check-auth`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.user = await response.json();
                localStorage.setItem('cn_user', JSON.stringify(this.user));
                return this.user;
            }
        } catch (error) {
            console.error('Get user info error:', error);
        }
        return null;
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('cn_token');
        localStorage.removeItem('cn_user');
        window.location.href = '/login.html';
    }

    async checkAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }

        try {
            const response = await fetch(`${this.apiUrl}/check-auth`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                this.logout();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Auth check error:', error);
            this.logout();
            return false;
        }
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    hasPermission(requiredRole) {
        if (!this.user) return false;

        const roleHierarchy = {
            'Service Manager': 1,
            'Admin 1L': 2,
            'Admin 2L': 3,
            'Super Admin': 4
        };

        const userRole = this.user.role;
        const requiredLevel = roleHierarchy[requiredRole] || 0;
        const userLevel = roleHierarchy[userRole] || 0;

        return userLevel >= requiredLevel;
    }
}

// Initialize auth globally
window.auth = new Auth();

// Login page handler
if (window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('loginForm');
        const loginError = document.getElementById('loginError');

        // Redirect if already logged in
        if (window.auth.isAuthenticated()) {
            window.location.href = '/';
        }

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            loginError.style.display = 'none';
            loginError.textContent = '';

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Завантаження...';
            submitBtn.disabled = true;

            try {
                const loggedIn = await window.auth.login(username, password);
                if (loggedIn) {
                    window.location.href = '/';
                    return;
                }
            } catch (error) {
                loginError.textContent = 'Невірне ім\'я користувача або пароль';
                loginError.style.display = 'block';
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    });
} else {
    // Check authentication on other pages
    document.addEventListener('DOMContentLoaded', async function() {
        const isAuthenticated = await window.auth.checkAuth();
        if (!isAuthenticated) return;

        // Update user info in sidebar
        const userInfoElement = document.querySelector('.user-info');
        if (userInfoElement && window.auth.user) {
            const usernameElement = userInfoElement.querySelector('.username');
            const roleElement = userInfoElement.querySelector('.role');

            if (usernameElement) {
                usernameElement.textContent = window.auth.user.username;
            }
            if (roleElement) {
                roleElement.textContent = window.auth.user.role;
            }
        }

        // Setup logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                window.auth.logout();
            });
        }

        // Setup sidebar toggle for mobile
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('show');
            });

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', function(event) {
                if (window.innerWidth <= 1024) {
                    if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                        sidebar.classList.remove('show');
                    }
                }
            });
        }

        // Highlight current page in sidebar
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                item.classList.add('active');
            }
        });
    });
}