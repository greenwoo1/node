class UsersPage {
    constructor() {
        this.currentPage = 1;
        this.limit = 50;
        this.searchQuery = '';
        this.users = [];
        this.init();
    }

    init() {
        if (!window.auth.hasPermission('Admin 2L')) {
            window.location.href = '/';
            return;
        }

        this.loadUsers();
        this.setupEventListeners();
    }

    async loadUsers() {
        try {
            this.showLoading();
            const data = await window.api.getUsers(this.searchQuery, this.currentPage, this.limit);
            this.users = data;
            this.renderUsers();
            this.renderPagination();
        } catch (error) {
            this.showError('Помилка завантаження користувачів');
        } finally {
            this.hideLoading();
        }
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>Користувачі не знайдені</h3>
                        <p>${this.searchQuery ? 'Спробуйте змінити пошуковий запит' : 'Додайте першого користувача'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td>••••••••</td>
                <td>${user.email}</td>
                <td>${user.last_login_ip || '-'}</td>
                <td>${user.phone_number || '-'}</td>
                <td>
                    <span class="status-badge status-${user.status}">
                        ${this.getStatusText(user.status)}
                    </span>
                </td>
                <td>
                    <div class="dropdown">
                        <button class="action-btn dropdown-toggle" data-id="${user.id}">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="#" class="dropdown-item" onclick="usersPage.showUpdateModal(${user.id})">
                                <i class="fas fa-edit"></i> Редагувати
                            </a>
                            ${user.role !== 'Super Admin' && user.id !== window.auth.user.id ? `
                                <a href="#" class="dropdown-item text-danger" onclick="usersPage.deleteUser(${user.id})">
                                    <i class="fas fa-trash"></i> Видалити
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        this.initDropdowns();
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'Active',
            'suspended': 'Suspended',
            'inactive': 'Inactive'
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
                    onclick="usersPage.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Попередня
            </button>
            <span class="page-info">Сторінка ${this.currentPage}</span>
            <button class="btn btn-secondary"
                    onclick="usersPage.changePage(${this.currentPage + 1})">
                Наступна <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadUsers();
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
                    this.loadUsers();
                }, 500);
            });
        }

        const addBtn = document.getElementById('addUserBtn');
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
        const modal = document.getElementById('addUserModal');
        if (!modal) return;

        const form = modal.querySelector('form');
        form.reset();
        modal.classList.add('show');
    }

    async showUpdateModal(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) return;

            const modal = document.getElementById('updateUserModal');
            if (!modal) return;

            const form = modal.querySelector('form');
            form.reset();

            // Populate form
            Object.keys(user).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && user[key] !== null && key !== 'password_hash') {
                    input.value = user[key];
                }
            });

            // Don't allow editing Super Admin role if not Super Admin
            if (user.role === 'Super Admin' && !window.auth.hasPermission('Super Admin')) {
                form.querySelector('[name="role"]').disabled = true;
            }

            modal.classList.add('show');
        } catch (error) {
            this.showError('Помилка завантаження даних користувача');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Ви впевнені, що хочете видалити цього користувача?')) {
            return;
        }

        try {
            await window.api.deleteUser(userId);
            this.loadUsers();
            this.showSuccess('Користувача видалено успішно');
        } catch (error) {
            this.showError('Помилка видалення користувача');
        }
    }

    showLoading() {
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 50px;">
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

    showSuccess(message) {
        alert(message);
    }
}

// Initialize users page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('usersTableBody')) {
        window.usersPage = new UsersPage();
    }
});