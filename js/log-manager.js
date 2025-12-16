// log-manager.js - Log Management System (English logs + Global log function)

class LogManager {
    constructor() {
        this.container = $('#logContainer');
        this.maxLogs = 1000;
        this.logs = [];
        
        this.initialize();
    }

    initialize() {
        this.container.empty();
        
        this.add('=== Tus Client Tester v1.0 Started ===', 'success');
        this.add('Log system ready - All operations will be logged', 'info');
    }

    add(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const logEntry = {
            timestamp,
            message,
            type,
            id: Date.now() + Math.random()
        };
        
        this.logs.push(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        const logElement = $(`
            <div class="log-entry" data-log-id="${logEntry.id}">
                <span class="log-timestamp">[${timestamp}]</span>
                <span class="log-message log-${type}">${message}</span>
            </div>
        `);
        
        this.container.append(logElement);
        this.scrollToBottom();
        
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        
        return logEntry.id;
    }

    scrollToBottom() {
        this.container.scrollTop(this.container[0].scrollHeight);
    }

    clear() {
        this.container.empty();
        this.logs = [];
        console.log('Logs cleared');
        this.add('Log panel cleared by user', 'info');
    }

    copy() {
        let logText = 'Tus Tester Logs:\n\n';
        this.logs.forEach(log => {
            logText += `[${log.timestamp}] ${log.message}\n`;
        });
        
        if (!logText.trim()) {
            logText = 'No logs available.';
        }
        
        navigator.clipboard.writeText(logText).then(() => {
            showNotification('Copied', 'Logs copied to clipboard', 'success');
        }).catch(() => {
            showNotification('Error', 'Failed to copy logs', 'error');
        });
    }
}

// Global instance
const logger = new LogManager();

// === IMPORTANT: Make log() globally available ===
window.log = function(message, type = 'info') {
    if (logger && typeof logger.add === 'function') {
        logger.add(message, type);
    } else {
        console.log('[LOG FALLBACK] ' + message);
    }
};

// Global functions for buttons
function copyLog() {
    logger.copy();
}

function clearLog() {
    logger.clear();
}