class GroupsPage {
    constructor() {
        this.currentPage = 1;
        this.limit = 50;
        this.searchQuery = '';
        this.groups = [];
        this.init();
    }

    init() {
        this.loadGroups();
        this.setupEventListeners();
    }

    async loadGroups() {
        try {
            this.showLoading();
            const data = await window.api.getGroups(this.searchQuery, this.currentPage, this.limit);
            this.groups = data;
            this.renderGroups();
            this.renderPagination();
        } catch (error) {
            this.showError('Помилка завантаження груп');
        } finally {
            this.hideLoading();
        }
    }

    renderGroups() {
        const tbody = document.getElementById('groupsTableBody');
        if (!tbody) return;

        if (this.groups.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-layer-group"></i>
                        <h3>Групи не знайдені</h3>
                        <p>${this.searchQuery ? 'Спробуйте змінити пошуковий запит' : 'Додайте першу групу'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.groups.map(group => `
            <tr>
                <td>${group.id}</td>
                <td>${group.title}</td>
                <td>${this.formatArray(group.projects)}</td>
                <td>${group.assigned_servers || 0}</td>
                <td>
                    <span class="status-badge status-${group.status.toLowerCase()}">
                        ${group.status}
                    </span>
                </td>
                <td>${group.description || '-'}</td>
                <td>
                    <div class="dropdown">
                        <button class="action-btn dropdown-toggle" data-id="${group.id}">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="#" class="dropdown-item" onclick="groupsPage.showUpdateModal(${group.id})">
                                <i class="fas fa-edit"></i> Редагувати
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
                    onclick="groupsPage.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Попередня
            </button>
            <span class="page-info">Сторінка ${this.currentPage}</span>
            <button class="btn btn-secondary"
                    onclick="groupsPage.changePage(${this.currentPage + 1})">
                Наступна <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadGroups();
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
                    this.loadGroups();
                }, 500);
            });
        }

        const addBtn = document.getElementById('addGroupBtn');
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
        const modal = document.getElementById('addGroupModal');
        if (!modal) return;

        const form = modal.querySelector('form');
        form.reset();
        modal.classList.add('show');
    }

    async showUpdateModal(groupId) {
        try {
            const group = this.groups.find(g => g.id === groupId);
            if (!group) return;

            const modal = document.getElementById('updateGroupModal');
            if (!modal) return;

            const form = modal.querySelector('form');
            form.reset();

            Object.keys(group).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && group[key] !== null) {
                    if (key === 'projects' && Array.isArray(group[key])) {
                        input.value = group[key].join(', ');
                    } else {
                        input.value = group[key];
                    }
                }
            });

            modal.classList.add('show');
        } catch (error) {
            this.showError('Помилка завантаження даних групи');
        }
    }

    showLoading() {
        const tbody = document.getElementById('groupsTableBody');
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

// Initialize groups page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('groupsTableBody')) {
        window.groupsPage = new GroupsPage();
    }
});