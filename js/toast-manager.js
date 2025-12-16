// Toast Notification Manager
class ToastManager {
    constructor() {
        this.toastElement = $('#notificationToast');
        this.toast = new bootstrap.Toast(this.toastElement, {
            autohide: true,
            delay: 3000
        });
    }

    show(title, message, type = 'info') {
        const toastHeader = this.toastElement.find('.toast-header');
        
        // Set type-based styling
        toastHeader.removeClass('bg-primary bg-success bg-danger bg-warning bg-info');
        switch(type) {
            case 'success':
                toastHeader.addClass('bg-success');
                break;
            case 'error':
                toastHeader.addClass('bg-danger');
                break;
            case 'warning':
                toastHeader.addClass('bg-warning');
                break;
            case 'info':
                toastHeader.addClass('bg-info');
                break;
            default:
                toastHeader.addClass('bg-primary');
        }

        // Set content
        $('#toastTitle').text(title);
        $('#toastMessage').text(message);
        
        // Set current time
        const now = new Date();
        $('#toastTime').text(now.toLocaleTimeString('fa-IR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }));

        // Show toast
        this.toast.show();
    }
}

// Initialize toast manager globally
let toastManager;
$(document).ready(function() {
    toastManager = new ToastManager();
});

// Global function to show notifications
function showNotification(title, message, type = 'info') {
    if (toastManager) {
        toastManager.show(title, message, type);
    }
}