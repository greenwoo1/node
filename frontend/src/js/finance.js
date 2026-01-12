class FinancePage {
    constructor() {
        this.currentPage = 1;
        this.limit = 50;
        this.searchQuery = '';
        this.accounts = [];
        this.init();
    }

    init() {
        if (!window.auth.hasPermission('Admin 2L') && window.auth.user.role !== 'Service Manager') {
            window.location.href = '/';
            return;
        }

        this.loadAccounts();
        this.setupEventListeners();
    }

    async loadAccounts() {
        try {
            this.showLoading();
            const data = await window.api.getFinanceAccounts(this.searchQuery, this.currentPage, this.limit);
            this.accounts = data;
            this.renderAccounts();
            this.renderPagination();
        } catch (error) {
            this.showError('Помилка завантаження фінансових записів');
        } finally {
            this.hideLoading();
        }
    }

    async renderAccounts() {
        const tbody = document.getElementById('financeTableBody');
        if (!tbody) return;

        if (this.accounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-money-bill-wave"></i>
                        <h3>Фінансові записи не знайдені</h3>
                        <p>${this.searchQuery ? 'Спробуйте змінити пошуковий запит' : 'Додайте перший запис'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Get server statuses for each account
        const accountsWithStatus = await Promise.all(this.accounts.map(async account => {
            try {
                const server = await window.api.getServer(account.server_id);
                return {
                    ...account,
                    server_status: server.status,
                    server_group: server.group_id
                };
            } catch (error) {
                return {
                    ...account,
                    server_status: 'unknown',
                    server_group: null
                };
            }
        }));

        tbody.innerHTML = accountsWithStatus.map(account => `
            <tr>
                <td>${account.id}</td>
                <td>${account.server_id}</td>
                <td>
                    <span class="status-badge status-${account.server_status}">
                        ${this.getStatusText(account.server_status)}
                    </span>
                </td>
                <td>${account.price ? `${account.price.toFixed(2)} ${account.currency}` : '-'}</td>
                <td>
                    <span class="status-badge status-${account.account_status.toLowerCase()}">
                        ${account.account_status}
                    </span>
                </td>
                <td>${account.payment_date ? new Date(account.payment_date).toLocaleDateString() : '-'}</td>
                <td>${account.server_group ? `GRP_${account.server_group}` : '-'}</td>
                <td>
                    <div class="dropdown">
                        <button class="action-btn dropdown-toggle" data-id="${account.id}">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="#" class="dropdown-item" onclick="financePage.showUpdateModal(${account.id})">
                                <i class="fas fa-edit"></i> Редагувати
                            </a>
                            <a href="#" class="dropdown-item" onclick="financePage.showHistoryModal(${account.id})">
                                <i class="fas fa-history"></i> Історія
                            </a>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        this.initDropdowns();
    }

    getStatusText(status) {
        const statusMap = {
            'running': 'Running',
            'stoped': 'Stopped',
            'reserv': 'Reserv',
            'abuse': 'Abuse',
            'maintaince': 'Maintenance',
            'unknown': 'Unknown'
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

        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        });
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        pagination.innerHTML = `
            <button class="btn btn-secondary ${this.currentPage === 1 ? 'disabled' : ''}"
                    onclick="financePage.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Попередня
            </button>
            <span class="page-info">Сторінка ${this.currentPage}</span>
            <button class="btn btn-secondary"
                    onclick="financePage.changePage(${this.currentPage + 1})">
                Наступна <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadAccounts();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value;
                    this.currentPage = 1;
                    this.loadAccounts();
                }, 500);
            });
        }

        const addBtn = document.getElementById('addFinanceBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('show');
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    }

    showAddModal() {
        const modal = document.getElementById('addFinanceModal');
        if (!modal) return;

        const form = modal.querySelector('form');
        form.reset();
        modal.classList.add('show');
    }

    async showUpdateModal(accountId) {
        try {
            const account = this.accounts.find(a => a.id === accountId);
            if (!account) return;

            const modal = document.getElementById('updateFinanceModal');
            if (!modal) return;

            const form = modal.querySelector('form');
            form.reset();

            Object.keys(account).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && account[key] !== null) {
                    if (key === 'payment_date' && account[key]) {
                        input.value = new Date(account[key]).toISOString().split('T')[0];
                    } else {
                        input.value = account[key];
                    }
                }
            });

            modal.classList.add('show');
        } catch (error) {
            this.showError('Помилка завантаження даних запису');
        }
    }

    async showHistoryModal(accountId) {
        try {
            const history = await window.api.getFinanceHistory(accountId);
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

        return Object.entries(changes).map(([field, values]) => {
            return `<div><strong>${field}:</strong> ${values.old} → ${values.new}</div>`;
        }).join('');
    }

    showLoading() {
        const tbody = document.getElementById('financeTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 50px;">
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
        alert(message);
    }
}

// Initialize finance page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('financeTableBody')) {
        window.financePage = new FinancePage();
    }
});