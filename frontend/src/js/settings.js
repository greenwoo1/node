class SettingsPage {
    constructor() {
        this.profile = null;
        this.settings = null;
        this.init();
    }

    async init() {
        await this.loadProfile();
        await this.loadSettings();
        this.renderProfile();
        this.setupEventListeners();
    }

    async loadProfile() {
        try {
            this.profile = await window.api.getProfile();
        } catch (error) {
            this.showError('Помилка завантаження профілю');
        }
    }

    async loadSettings() {
        try {
            this.settings = await window.api.getSettings();
        } catch (error) {
            this.showError('Помилка завантаження налаштувань');
        }
    }

    renderProfile() {
        if (!this.profile) return;

        const profileForm = document.getElementById('profileForm');
        if (!profileForm) return;

        Object.keys(this.profile).forEach(key => {
            const input = profileForm.querySelector(`[name="${key}"]`);
            if (input && this.profile[key] !== null && this.profile[key] !== undefined) {
                if (key === 'allowed_ips' && Array.isArray(this.profile[key])) {
                    input.value = this.profile[key].join(', ');
                } else {
                    input.value = this.profile[key];
                }
            }
        });
    }

    setupEventListeners() {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updateProfile();
            });
        }

        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updatePassword();
            });
        }

        // IP restriction toggle
        const ipRestrictionToggle = document.getElementById('ipRestrictionToggle');
        if (ipRestrictionToggle) {
            ipRestrictionToggle.addEventListener('change', (e) => {
                const ipField = document.getElementById('allowedIps');
                if (e.target.checked) {
                    ipField.disabled = false;
                    ipField.placeholder = 'Введіть IP адреси через кому';
                } else {
                    ipField.disabled = true;
                    ipField.value = '0.0.0.0/0';
                }
            });
        }

        // Initialize IP restriction toggle
        if (this.profile && this.profile.allowed_ips) {
            const ipRestrictionToggle = document.getElementById('ipRestrictionToggle');
            const ipField = document.getElementById('allowedIps');

            if (ipRestrictionToggle && ipField) {
                const hasRestriction = !(this.profile.allowed_ips.length === 1 && this.profile.allowed_ips[0] === '0.0.0.0/0');
                ipRestrictionToggle.checked = hasRestriction;
                ipField.disabled = !hasRestriction;
            }
        }
    }

    async updateProfile() {
        const form = document.getElementById('profileForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (value.trim() !== '') {
                if (key === 'allowed_ips') {
                    data[key] = value.split(',').map(ip => ip.trim()).filter(ip => ip);
                } else {
                    data[key] = value;
                }
            }
        }

        try {
            await window.api.updateSettings(data);
            await this.loadProfile();
            this.renderProfile();
            this.showSuccess('Профіль успішно оновлено');
        } catch (error) {
            this.showError('Помилка оновлення профілю');
        }
    }

    async updatePassword() {
        const form = document.getElementById('passwordForm');
        if (!form) return;

        const currentPassword = form.querySelector('[name="current_password"]').value;
        const newPassword = form.querySelector('[name="new_password"]').value;
        const confirmPassword = form.querySelector('[name="confirm_password"]').value;

        if (newPassword !== confirmPassword) {
            this.showError('Новий пароль та підтвердження не співпадають');
            return;
        }

        if (newPassword.length < 8) {
            this.showError('Пароль повинен містити принаймні 8 символів');
            return;
        }

        const data = {
            password: newPassword
        };

        try {
            await window.api.updateSettings(data);
            form.reset();
            this.showSuccess('Пароль успішно змінено');
        } catch (error) {
            this.showError('Помилка зміни паролю');
        }
    }

    showError(message) {
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.remove();
        }, 5000);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    showSuccess(message) {
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.remove();
        }, 5000);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Initialize settings page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('profileForm')) {
        window.settingsPage = new SettingsPage();
    }
});