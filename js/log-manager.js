// log-manager.js - Log Management System
class LogManager {
    constructor() {
        this.container = $('#logContainer');
        this.maxLogs = 1000; // Maximum number of logs to keep
        this.logs = [];
        
        // Initialize log container
        this.initialize();
    }

    initialize() {
        // Clear any existing logs
        this.container.empty();
        
        // Add initial log message
        this.add('Log system initialized', 'info');
    }

    add(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Store log
        const logEntry = {
            timestamp,
            message,
            type,
            id: Date.now() + Math.random()
        };
        
        this.logs.push(logEntry);
        
        // Keep only maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Create and add log element
        const logElement = $(`
            <div class="log-entry" data-log-id="${logEntry.id}">
                <span class="log-timestamp">[${timestamp}]</span>
                <span class="log-message log-${type}">${message}</span>
            </div>
        `);
        
        this.container.append(logElement);
        
        // Auto-scroll to bottom
        this.scrollToBottom();
        
        // Also log to console
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        
        return logEntry.id;
    }

    scrollToBottom() {
        this.container.scrollTop(this.container[0].scrollHeight);
    }

    clear() {
        this.container.empty();
        this.logs = [];
        
        // Don't log "Logs cleared" message to avoid recursion
        console.log('Logs cleared');
    }

    copy() {
        let logText = '';
        
        // Build log text from stored logs
        this.logs.forEach(log => {
            logText += `[${log.timestamp}] ${log.message}\n`;
        });
        
        if (!logText.trim()) {
            logText = 'No logs available.';
        }
        
        // Use Clipboard API
        navigator.clipboard.writeText(logText).then(() => {
            if (window.toast) {
                const message = window.i18n ? i18n.t('messages.logsCopied') : 'Logs copied to clipboard';
                toast.success(message);
            }
        }).catch(err => {
            console.error('Failed to copy logs:', err);
            if (window.toast) {
                toast.error('Failed to copy logs');
            }
        });
    }

    getLogs() {
        return this.logs;
    }

    getLogCount() {
        return this.logs.length;
    }

    filterByType(type) {
        return this.logs.filter(log => log.type === type);
    }

    search(keyword) {
        return this.logs.filter(log => 
            log.message.toLowerCase().includes(keyword.toLowerCase()) ||
            log.timestamp.includes(keyword)
        );
    }
}

// Create global log manager instance
const logger = new LogManager();