// toast-manager.js - Toast Notification Manager
class ToastManager {
    constructor() {
        this.toastElement = $('#notificationToast');
        this.toast = new bootstrap.Toast(this.toastElement[0], {
            delay: 3000,
            autohide: true
        });
        
        // Initialize toast
        this.initialize();
    }

    initialize() {
        // Add close button event listener
        this.toastElement.find('.btn-close').on('click', () => {
            this.toast.hide();
        });
    }

    show(message, type = 'info', title = null) {
        const colors = {
            success: { 
                bg: '#10b981', 
                icon: 'bi-check-circle',
                titleKey: 'Success'
            },
            error: { 
                bg: '#ef4444', 
                icon: 'bi-exclamation-circle',
                titleKey: 'Error'
            },
            warning: { 
                bg: '#f59e0b', 
                icon: 'bi-exclamation-triangle',
                titleKey: 'Warning'
            },
            info: { 
                bg: '#3b82f6', 
                icon: 'bi-info-circle',
                titleKey: 'Info'
            }
        };

        const config = colors[type] || colors.info;
        const time = new Date().toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        
        if (!title) {
            // Use i18n if available
            title = window.i18n ? i18n.t(`messages.${type}`) : config.titleKey;
        }

        $('#toastTitle').html(`<i class="bi ${config.icon} me-2"></i>${title}`);
        $('#toastTime').text(time);
        $('#toastMessage').text(message);
        $('.toast-header').css('background-color', config.bg);
        
        this.toast.show();
    }

    success(message, title = null) {
        this.show(message, 'success', title);
    }

    error(message, title = null) {
        this.show(message, 'error', title);
    }

    warning(message, title = null) {
        this.show(message, 'warning', title);
    }

    info(message, title = null) {
        this.show(message, 'info', title);
    }
}

// Create global toast instance
const toast = new ToastManager();