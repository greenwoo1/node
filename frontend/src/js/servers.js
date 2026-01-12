class ServersPage {
    constructor() {
        this.currentPage = 1;
        this.limit = 50;
        this.searchQuery = '';
        this.servers = [];
        this.init();
    }

    init() {
        this.loadServers();
        this.setupEventListeners();
    }

    async loadServers() {
        try {
            this.showLoading();
            const data = await window.api.getServers(this.searchQuery, this.currentPage, this.limit);
            this.servers = data;
            this.renderServers();
            this.renderPagination();
        } catch (error) {
            this.showError('Помилка завантаження серверів');
        } finally {
            this.hideLoading();
        }
    }

    renderServers() {
        const tbody = document.getElementById('serversTableBody');
        if (!tbody) return;

        if (this.servers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state">
                        <i class="fas fa-server"></i>
                        <h3>Сервери не знайдені</h3>
                        <p>${this.searchQuery ? 'Спробуйте змінити пошуковий запит' : 'Додайте перший сервер'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.servers.map(server => `
            <tr>
                <td>${server.os || '-'}</td>
                <td><strong>${server.id}</strong></td>
                <td>${server.ip_address}</td>
                <td>${server.additional_ips || '-'}</td>
                <td>${server.comments || '-'}</td>
                <td>${server.hoster || '-'}</td>
                <td>
                    <span class="status-badge status-${server.status}">
                        ${this.getStatusText(server.status)}
                    </span>
                </td>
                <td>${server.group_id ? `GRP_${server.group_id}` : '-'}</td>
                <td>${server.project || '-'}</td>
                <td>${server.country || '-'}</td>
                <td>
                    <div class="dropdown">
                        <button class="action-btn dropdown-toggle" data-id="${server.id}">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="#" class="dropdown-item" onclick="serversPage.showUpdateModal(${server.id})">
                                <i class="fas fa-edit"></i> Редагувати
                            </a>
                            <a href="#" class="dropdown-item" onclick="serversPage.showDetailsModal(${server.id})">
                                <i class="fas fa-info-circle"></i> Деталі
                            </a>
                            <a href="#" class="dropdown-item" onclick="serversPage.showHistoryModal(${server.id})">
                                <i class="fas fa-history"></i> Історія
                            </a>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        // Initialize dropdowns
        this.initDropdowns();
    }

    getStatusText(status) {
        const statusMap = {
            'running': 'Running',
            'stoped': 'Stopped',
            'reserv': 'Reserv',
            'abuse': 'Abuse',
            'maintaince': 'Maintenance'
        };
        return statusMap[status] || status;
    }

    initDropdowns() {
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = toggle.nextElementSibling;
                dropdown.classList.toggle('show');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        });
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        // Simple pagination for now
        pagination.innerHTML = `
            <button class="btn btn-secondary ${this.currentPage === 1 ? 'disabled' : ''}"
                    onclick="serversPage.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Попередня
            </button>
            <span class="page-info">Сторінка ${this.currentPage}</span>
            <button class="btn btn-secondary"
                    onclick="serversPage.changePage(${this.currentPage + 1})">
                Наступна <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadServers();
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value;
                    this.currentPage = 1;
                    this.loadServers();
                }, 500);
            });
        }

        // Add Server button
        const addBtn = document.getElementById('addServerBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('show');
            });
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    }

    showAddModal() {
        const modal = document.getElementById('addServerModal');
        if (!modal) return;

        const form = modal.querySelector('form');
        form.reset();
        modal.classList.add('show');
    }

    async showUpdateModal(serverId) {
        try {
            const server = await window.api.getServer(serverId);
            const modal = document.getElementById('updateServerModal');
            if (!modal) return;

            const form = modal.querySelector('form');
            form.reset();

            // Populate form
            Object.keys(server).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && server[key] !== null) {
                    input.value = server[key];
                }
            });

            modal.classList.add('show');
        } catch (error) {
            this.showError('Помилка завантаження даних сервера');
        }
    }

    async showDetailsModal(serverId) {
        try {
            const server = await window.api.getServer(serverId);
            const modal = document.getElementById('serverDetailsModal');
            if (!modal) return;

            const content = modal.querySelector('.modal-body');
            content.innerHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label><i class="fas fa-user"></i> SSH Username</label>
                        <div class="copy-field">
                            <input type="text" class="form-control" value="${server.ssh_username || 'root'}" readonly>
                            <button class="btn btn-sm btn-secondary copy-btn" data-text="${server.ssh_username || 'root'}">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-lock"></i> SSH Password</label>
                        <div class="copy-field">
                            <input type="password" class="form-control" value="${server.ssh_password || ''}" readonly>
                            <button class="btn btn-sm btn-secondary copy-btn" data-text="${server.ssh_password || ''}">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-server"></i> Container Password</label>
                        <div class="copy-field">
                            <input type="password" class="form-control" value="${server.container_password || ''}" readonly>
                            <button class="btn btn-sm btn-secondary copy-btn" data-text="${server.container_password || ''}">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-network-wired"></i> SSH Port</label>
                        <input type="text" class="form-control" value="${server.ssh_port || 22}" readonly>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-globe"></i> IP Address</label>
                        <div class="copy-field">
                            <input type="text" class="form-control" value="${server.ip_address}" readonly>
                            <button class="btn btn-sm btn-secondary copy-btn" data-text="${server.ip_address}">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Initialize copy buttons
            this.initCopyButtons();
            modal.classList.add('show');
        } catch (error) {
            this.showError('Помилка завантаження деталей сервера');
        }
    }

    async showHistoryModal(serverId) {
        try {
            const history = await window.api.getServerHistory(serverId);
            const modal = document.getElementById('historyModal');
            if (!modal) return;

            const content = modal.querySelector('.modal-body');
            if (history.length === 0) {
                content.innerHTML = '<p class="empty-state">Історія змін відсутня</p>';
            } else {
                content.innerHTML = `
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Дата</th>
                                    <th>Користувач</th>
                                    <th>Дія</th>
                                    <th>Зміни</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${history.map(record => `
                                    <tr>
                                        <td>${new Date(record.timestamp).toLocaleString()}</td>
                                        <td>${record.user_id || 'System'}</td>
                                        <td>${record.action}</td>
                                        <td>
                                            ${this.formatChanges(record.changes)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            modal.classList.add('show');
        } catch (error) {
            this.showError('Помилка завантаження історії');
        }
    }

    formatChanges(changes) {
        if (!changes || changes.all === 'created') {
            return '<span class="text-muted">Запис створено</span>';
        }

        if (changes.all === 'deleted') {
            return '<span class="text-danger">Запис видалено</span>';
        }

        return Object.entries(changes).map(([field, values]) => {
            return `<div><strong>${field}:</strong> ${values.old} → ${values.new}</div>`;
        }).join('');
    }

    initCopyButtons() {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                navigator.clipboard.writeText(text).then(() => {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                    }, 2000);
                });
            });
        });
    }

    showLoading() {
        const tbody = document.getElementById('serversTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 50px;">
                        <div class="loading-spinner"></div>
                    </td>
                </tr>
            `;
        }
    }

    hideLoading() {
        // Loading is hidden when table is rendered
    }

    showError(message) {
        alert(message); // In production, use a proper notification system
    }
}

// Initialize servers page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('serversTableBody')) {
        window.serversPage = new ServersPage();
    }
});