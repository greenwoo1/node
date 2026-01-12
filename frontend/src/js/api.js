class API {
    constructor() {
        this.baseUrl = window.API_URL || 'http://localhost:8000/api';
        this.auth = window.auth;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            ...this.auth.getHeaders(),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                this.auth.logout();
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Request failed');
            }

            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Servers
    async getServers(search = '', page = 1, limit = 50) {
        const params = new URLSearchParams({
            skip: (page - 1) * limit,
            limit,
            ...(search && { search })
        });
        return this.request(`/servers?${params}`);
    }

    async getServer(id) {
        return this.request(`/servers/${id}`);
    }

    async createServer(data) {
        return this.request('/servers', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateServer(id, data) {
        return this.request(`/servers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async getServerHistory(id) {
        return this.request(`/servers/${id}/history`);
    }

    // Domains
    async getDomains(search = '', page = 1, limit = 50) {
        const params = new URLSearchParams({
            skip: (page - 1) * limit,
            limit,
            ...(search && { search })
        });
        return this.request(`/domains?${params}`);
    }

    async getDomain(id) {
        return this.request(`/domains/${id}`);
    }

    async createDomain(data) {
        return this.request('/domains', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateDomain(id, data) {
        return this.request(`/domains/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async getDomainHistory(id) {
        return this.request(`/domains/${id}/history`);
    }

    // Users
    async getUsers(search = '', page = 1, limit = 50) {
        const params = new URLSearchParams({
            skip: (page - 1) * limit,
            limit,
            ...(search && { search })
        });
        return this.request(`/users?${params}`);
    }

    async createUser(data) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateUser(id, data) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Finance
    async getFinanceAccounts(search = '', page = 1, limit = 50) {
        const params = new URLSearchParams({
            skip: (page - 1) * limit,
            limit,
            ...(search && { search })
        });
        return this.request(`/finance?${params}`);
    }

    async createFinanceAccount(data) {
        return this.request('/finance', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateFinanceAccount(id, data) {
        return this.request(`/finance/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async getFinanceHistory(id) {
        return this.request(`/finance/${id}/history`);
    }

    // Groups
    async getGroups(search = '', page = 1, limit = 50) {
        const params = new URLSearchParams({
            skip: (page - 1) * limit,
            limit,
            ...(search && { search })
        });
        return this.request(`/groups?${params}`);
    }

    async createGroup(data) {
        return this.request('/groups', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateGroup(id, data) {
        return this.request(`/groups/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Settings
    async getSettings() {
        return this.request('/settings');
    }

    async updateSettings(data) {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async getProfile() {
        return this.request('/settings/profile');
    }
}

// Initialize API globally
window.api = new API();