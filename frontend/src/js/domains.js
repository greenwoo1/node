class DomainsPage {
    constructor() {
        this.currentPage = 1;
        this.limit = 50;
        this.searchQuery = '';
        this.domains = [];
        this.init();
    }

    init() {
        this.loadDomains();
        this.setupEventListeners();
    }

    async loadDomains() {
        try {
            this.showLoading();
            const data = await window.api.getDomains(this.searchQuery, this.currentPage, this.limit);
            this.domains = data;
            this.renderDomains();
            this.renderPagination();
        } catch (error) {
            this.showError('Помилка завантаження доменів');
        } finally {
            this.hideLoading();
        }
    }

    renderDomains() {
        const tbody = document.getElementById('domainsTableBody');
        if (!tbody) return;

        if (this.domains.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-globe"></i>
                        <h3>Домени не знайдені</h3>
                        <p>${this.searchQuery ? 'Спробуйте змінити пошуковий запит' : 'Додайте перший домен'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.domains.map(domain => `
            <tr>
                <td>${domain.domain_name}</td>
                <td>${domain.group_id ? `GRP_${domain.group_id}` : '-'}</td>
                <td>
                    <span class="status-badge status-${domain.status.toLowerCase()}">
                        ${domain.status}
                    </span>
                </td>
                <td>${this.formatArray(domain.ns_records)}</td>
                <td>${this.formatArray(domain.a_records)}</td>
                <td>${this.formatArray(domain.aaaa_records)}</td>
                <td>
                    <div class="dropdown">
                        <button class="action-btn dropdown-toggle" data-id="${domain.id}">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="#" class="dropdown-item" onclick="domainsPage.showUpdateModal(${domain.id})">
                                <i class="fas fa-edit"></i> Редагувати
                            </a>
                            <a href="#" class="dropdown-item" onclick="domainsPage.showHistoryModal(${domain.id})">
                                <i class="fas fa-history"></i> Історія
                            </a>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        this.initDropdowns();
    }

    formatArray(arr) {
        if (!arr || arr.length === 0) return '-';
        return arr.join(', ');
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
                    onclick="domainsPage.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Попередня
            </button>
            <span class="page-info">Сторінка ${this.currentPage}</span>
            <button class="btn btn-secondary"
                    onclick="domainsPage.changePage(${this.currentPage + 1})">
                Наступна <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadDomains();
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
                    this.loadDomains();
                }, 500);
            });
        }

        const addBtn = document.getElementById('addDomainBtn');
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
        const modal = document.getElementById('addDomainModal');
        if (!modal) return;

        const form = modal.querySelector('form');
        form.reset();
        modal.classList.add('show');
    }

    async showUpdateModal(domainId) {
        try {
            const domain = await window.api.getDomain(domainId);
            const modal = document.getElementById('updateDomainModal');
            if (!modal) return;

            const form = modal.querySelector('form');
            form.reset();

            Object.keys(domain).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && domain[key] !== null) {
                    input.value = domain[key];
                }
            });

            modal.classList.add('show');
        } catch (error) {
            this.showError('Помилка завантаження даних домена');
        }
    }

    async showHistoryModal(domainId) {
        try {
            const history = await window.api.getDomainHistory(domainId);
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
        const tbody = document.getElementById('domainsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 50px;">
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

// Initialize domains page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('domainsTableBody')) {
        window.domainsPage = new DomainsPage();
    }
});