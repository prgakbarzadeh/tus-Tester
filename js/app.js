// app.js - Main Application Logic
class TusUploadApp {
    constructor() {
        this.state = {
            jwtToken: null,
            selectedFile: null,
            uploadUrl: null,
            isUploading: false,
            currentRequest: null,
            serverUrl: 'https://localhost:7010'
        };

        this.initialize();
    }

    initialize() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateUI();
        
        // Start clock
        this.startClock();
        
        // Check connectivity
        this.checkConnectivity();
        
        // Load saved data
        this.loadSavedData();
        
        // Add initial log
        logger.add('Application initialized', 'info');
        
        // Expose methods to global scope
        this.exposeMethods();
    }

    setupEventListeners() {
        // File input change
        $('#selectFileBtn').click(() => $('#fileInput').click());
        
        $('#fileInput').change((e) => this.handleFileSelect(e));
        
        // Server URL change
        $('#serverUrl').on('input', () => {
            this.state.serverUrl = $('#serverUrl').val().trim();
        });
        
        // Token input change
        $('#jwtTokenInput').on('input', () => {
            this.updateTokenStatus();
        });
        
        // Drag and drop
        this.setupDragAndDrop();
        
        // Online/offline detection
        window.addEventListener('online', () => this.updateConnectionStatus(true));
        window.addEventListener('offline', () => this.updateConnectionStatus(false));
        
        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.state.isUploading) {
                e.preventDefault();
                e.returnValue = 'Upload in progress. Are you sure you want to leave?';
            }
        });
    }

    setupDragAndDrop() {
        const dropArea = $('#dropArea');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.on(eventName, this.preventDefaults);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.on(eventName, () => dropArea.addClass('dragover'));
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.on(eventName, () => dropArea.removeClass('dragover'));
        });

        dropArea.on('drop', (e) => this.handleFileDrop(e));
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // File Management
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.state.selectedFile = file;
            this.showFileInfo(file);
            this.updateUI();
            
            const message = window.i18n ? 
                i18n.t('messages.fileSelected', { filename: file.name }) : 
                `File selected: ${file.name}`;
            
            logger.add(message, 'success');
            toast.success(message);
        }
    }

    handleFileDrop(event) {
        const files = event.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            $('#fileInput').prop('files', files);
            $('#fileInput').trigger('change');
        }
    }

    showFileInfo(file) {
        $('#fileInfo').removeClass('d-none');
        $('#fileName').text(file.name);
        $('#fileSize').text(this.formatBytes(file.size));
        $('#fileType').text(file.type || 'Unknown');
    }

    clearFile() {
        if (this.state.selectedFile) {
            const fileName = this.state.selectedFile.name;
            this.state.selectedFile = null;
            $('#fileInput').val('');
            $('#fileInfo').addClass('d-none');
            $('#progressContainer').addClass('d-none');
            $('#progressBar').css('width', '0%').text('0%');
            this.updateUI();
            
            const message = window.i18n ? 
                i18n.t('messages.fileCleared') : 
                `File cleared: ${fileName}`;
            
            logger.add(message, 'info');
            toast.info(message);
        }
    }

    // Token Management
    async setToken() {
        const tokenInput = $('#jwtTokenInput').val().trim();
        
        if (!tokenInput) {
            toast.warning('Please enter a token', 'Token');
            return;
        }
        
        try {
            // Validate token format
            const parts = tokenInput.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }
            
            this.state.jwtToken = tokenInput;
            
            // Update UI with animation
            $('#tokenStatus')
                .text('Valid')
                .removeClass('invalid')
                .addClass('valid')
                .css('transform', 'scale(1.1)');
            
            setTimeout(() => {
                $('#tokenStatus').css('transform', 'scale(1)');
            }, 300);
            
            // Log token info
            try {
                const payload = this.parseJwt(tokenInput);
                const userId = payload.sub || payload.UserID || payload.email || 'Unknown';
                const message = window.i18n ? 
                    i18n.t('messages.tokenSet') : 
                    `Token set for user: ${userId}`;
                
                logger.add(message, 'success');
                toast.success(message);
            } catch {
                const message = window.i18n ? 
                    i18n.t('messages.tokenSet') : 
                    'Token set successfully';
                
                logger.add(message, 'info');
                toast.success(message);
            }
            
            this.updateUI();
            
        } catch (error) {
            const message = window.i18n ? 
                i18n.t('messages.tokenInvalid') : 
                'Invalid token format';
            
            logger.add(`${message}: ${error.message}`, 'error');
            toast.error(message, 'Token Error');
            this.clearToken();
        }
    }

    clearToken() {
        this.state.jwtToken = null;
        $('#jwtTokenInput').val('');
        $('#tokenStatus').text('No Token').removeClass('valid').addClass('invalid');
        
        const message = window.i18n ? 
            i18n.t('messages.tokenCleared') : 
            'Token cleared';
        
        logger.add(message, 'info');
        this.updateUI();
    }

    async pasteToken() {
        try {
            const text = await navigator.clipboard.readText();
            if (text.trim()) {
                $('#jwtTokenInput').val(text.trim());
                toast.info('Token pasted from clipboard', 'Paste');
            }
        } catch (error) {
            console.error('Failed to read clipboard:', error);
            toast.error('Failed to read clipboard. Please paste manually.', 'Paste Error');
        }
    }

    copyToken() {
        const token = $('#jwtTokenInput').val().trim();
        if (!token) {
            toast.warning('No token to copy', 'Copy');
            return;
        }
        
        navigator.clipboard.writeText(token).then(() => {
            toast.success('Token copied to clipboard', 'Copy');
        }).catch(error => {
            console.error('Failed to copy token:', error);
            toast.error('Failed to copy token', 'Copy Error');
        });
    }

    updateTokenStatus() {
        const token = $('#jwtTokenInput').val().trim();
        if (!token) {
            $('#tokenStatus').text('No Token').removeClass('valid').addClass('invalid');
        } else {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    $('#tokenStatus').text('Valid').removeClass('invalid').addClass('valid');
                } else {
                    $('#tokenStatus').text('Invalid').removeClass('valid').addClass('invalid');
                }
            } catch {
                $('#tokenStatus').text('Invalid').removeClass('valid').addClass('invalid');
            }
        }
    }

    // Server Connection
    async testServerConnection() {
        const serverUrl = $('#serverUrl').val().trim();
        if (!serverUrl) {
            toast.warning('Please enter server URL', 'Server');
            return;
        }
        
        logger.add(`Testing connection to: ${serverUrl}`, 'info');
        
        try {
            const response = await fetch(serverUrl + '/tus', {
                method: 'HEAD',
                headers: { 'Tus-Resumable': '1.0.0' }
            });
            
            if (response.ok || response.status === 405) {
                this.state.serverUrl = serverUrl;
                
                const message = window.i18n ? 
                    i18n.t('messages.serverTestSuccess') : 
                    'Server connection successful';
                
                logger.add(message, 'success');
                toast.success(message, 'Connection');
                this.updateConnectionStatus(true);
                
                // Save server URL
                localStorage.setItem('tusServerUrl', serverUrl);
                
            } else {
                const message = window.i18n ? 
                    i18n.t('messages.serverTestError') : 
                    `Server error: ${response.status}`;
                
                logger.add(message, 'warning');
                toast.warning(message, 'Connection');
                this.updateConnectionStatus(false);
            }
        } catch (error) {
            const message = window.i18n ? 
                i18n.t('messages.serverTestError') : 
                `Connection failed: ${error.message}`;
            
            logger.add(message, 'error');
            toast.error(message, 'Connection Error');
            this.updateConnectionStatus(false);
        }
    }

    // Upload Functions
    async startUpload() {
        if (!this.state.selectedFile || !this.state.jwtToken || this.state.isUploading) return;
        
        this.state.isUploading = true;
        $('#uploadBtn').prop('disabled', true);
        $('#stopBtn').prop('disabled', false);
        $('#progressContainer').removeClass('d-none');
        $('#progressBar').css('width', '0%').text('0%');
        $('#progressPercent').text('0%');
        
        $('#statusBox').removeClass('success error warning').addClass('info');
        $('#statusBox').html(`
            <div class="fw-bold mb-1">Upload Initializing</div>
            <div class="small">Creating upload session...</div>
        `);
        
        const message = window.i18n ? 
            i18n.t('messages.uploadStarted') : 
            'Starting upload process...';
        
        logger.add(message, 'info');
        
        try {
            const serverUrl = $('#serverUrl').val().trim();
            const baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
            
            logger.add(`Creating upload session at: ${baseUrl}/tus`, 'info');
            
            // Create upload session
            const createResponse = await fetch(baseUrl + '/tus', {
                method: 'POST',
                headers: {
                    'Tus-Resumable': '1.0.0',
                    'Upload-Length': this.state.selectedFile.size.toString(),
                    'Upload-Metadata': `filename ${btoa(encodeURIComponent(this.state.selectedFile.name))}`,
                    'Authorization': `Bearer ${this.state.jwtToken}`
                }
            });

            if (createResponse.status === 201 || createResponse.status === 204) {
                let uploadUrl = createResponse.headers.get('Location');
                if (uploadUrl) {
                    if (uploadUrl.startsWith('/')) {
                        uploadUrl = baseUrl + uploadUrl;
                    }
                    this.state.uploadUrl = uploadUrl;
                    logger.add(`Session created: ${uploadUrl}`, 'success');
                    
                    // Upload chunks
                    await this.uploadChunks();
                    
                    // Verify completion
                    await this.verifyUploadCompletion();
                    
                    $('#statusBox').removeClass('info').addClass('success');
                    $('#statusBox').html(`
                        <div class="fw-bold mb-1">Upload Complete</div>
                        <div class="small">File successfully uploaded to server.</div>
                    `);
                    
                    const successMessage = window.i18n ? 
                        i18n.t('messages.uploadComplete') : 
                        'Upload completed successfully';
                    
                    toast.success(successMessage, 'Upload');
                    
                } else {
                    throw new Error('No Location header in response');
                }
            } else {
                const errorText = await createResponse.text();
                throw new Error(`Server error ${createResponse.status}: ${errorText}`);
            }
            
        } catch (error) {
            $('#statusBox').removeClass('info').addClass('error');
            $('#statusBox').html(`
                <div class="fw-bold mb-1">Upload Failed</div>
                <div class="small">${error.message}</div>
            `);
            
            const errorMessage = window.i18n ? 
                i18n.t('messages.uploadError', { error: error.message }) : 
                `Upload failed: ${error.message}`;
            
            logger.add(errorMessage, 'error');
            toast.error(errorMessage, 'Upload Error');
        } finally {
            this.state.isUploading = false;
            $('#uploadBtn').prop('disabled', false);
            $('#stopBtn').prop('disabled', true);
        }
    }

    async uploadChunks() {
        let offset = 0;
        const chunkSize = 1024 * 1024; // 1MB
        const totalChunks = Math.ceil(this.state.selectedFile.size / chunkSize);
        
        logger.add(`Uploading ${totalChunks} chunks (${this.formatBytes(this.state.selectedFile.size)})`, 'info');
        
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            if (!this.state.isUploading) {
                logger.add('Upload stopped by user', 'warning');
                break;
            }
            
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, this.state.selectedFile.size);
            const chunk = this.state.selectedFile.slice(start, end);
            
            try {
                const response = await fetch(this.state.uploadUrl, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/offset+octet-stream',
                        'Upload-Offset': offset.toString(),
                        'Tus-Resumable': '1.0.0',
                        'Authorization': `Bearer ${this.state.jwtToken}`,
                        'Content-Length': (end - start).toString()
                    },
                    body: chunk
                });

                if (!response.ok) {
                    throw new Error(`Chunk ${chunkIndex + 1} failed: ${response.status}`);
                }

                offset = parseInt(response.headers.get('Upload-Offset') || offset + (end - start));
                
                // Update progress
                const progress = Math.round((offset / this.state.selectedFile.size) * 100);
                $('#progressBar').css('width', `${progress}%`).text(`${progress}%`);
                $('#progressPercent').text(`${progress}%`);
                
                if (chunkIndex % 5 === 0 || chunkIndex === totalChunks - 1) {
                    logger.add(`Progress: ${progress}% (${chunkIndex + 1}/${totalChunks} chunks)`, 'info');
                }
                
            } catch (error) {
                logger.add(`Chunk ${chunkIndex + 1} error: ${error.message}`, 'error');
                throw error;
            }
        }
    }

    async verifyUploadCompletion() {
        logger.add('Verifying upload completion...', 'info');
        
        const response = await fetch(this.state.uploadUrl, {
            method: 'HEAD',
            headers: {
                'Tus-Resumable': '1.0.0',
                'Authorization': `Bearer ${this.state.jwtToken}`
            }
        });

        if (response.ok) {
            const uploadLength = response.headers.get('Upload-Length');
            const uploadOffset = response.headers.get('Upload-Offset');
            
            if (uploadLength && uploadOffset && parseInt(uploadLength) === parseInt(uploadOffset)) {
                logger.add('Upload verified: 100% complete', 'success');
                return true;
            }
        }
        logger.add('Upload verification incomplete', 'warning');
        return false;
    }

    stopUpload() {
        if (this.state.isUploading) {
            this.state.isUploading = false;
            if (this.state.currentRequest) {
                this.state.currentRequest.abort();
                this.state.currentRequest = null;
            }
            
            const message = window.i18n ? 
                i18n.t('messages.uploadStopped') : 
                'Upload stopped by user';
            
            logger.add(message, 'warning');
            toast.warning(message, 'Upload');
            
            $('#statusBox').removeClass('info success').addClass('warning');
            $('#statusBox').html(`
                <div class="fw-bold mb-1">Upload Stopped</div>
                <div class="small">Upload process terminated by user.</div>
            `);
            
            $('#uploadBtn').prop('disabled', false);
            $('#stopBtn').prop('disabled', true);
        }
    }

    // UI Updates
    updateUI() {
        const uploadBtn = $('#uploadBtn');
        const statusBox = $('#statusBox');
        
        if (this.state.jwtToken && this.state.selectedFile) {
            statusBox.removeClass('info warning error').addClass('success');
            statusBox.html(`
                <div class="fw-bold mb-1">Ready to Upload</div>
                <div class="small">All requirements satisfied. Click "Start Upload" to proceed.</div>
            `);
            uploadBtn.prop('disabled', false);
            $('#stopBtn').prop('disabled', true);
        } else {
            uploadBtn.prop('disabled', true);
            $('#stopBtn').prop('disabled', true);
            
            let statusText = '';
            if (!this.state.jwtToken && !this.state.selectedFile) {
                statusBox.removeClass('success warning error').addClass('info');
                statusText = 'Enter token and select a file';
            } else if (!this.state.jwtToken) {
                statusBox.removeClass('success info error').addClass('warning');
                statusText = 'Authentication token required';
            } else {
                statusBox.removeClass('success info warning').addClass('info');
                statusText = 'Select a file to upload';
            }
            
            statusBox.html(`
                <div class="fw-bold mb-1">System Status</div>
                <div class="small">${statusText}</div>
            `);
        }
    }

    updateConnectionStatus(connected) {
        const badge = $('#connectionStatus');
        if (connected) {
            badge.removeClass('bg-secondary bg-danger').addClass('bg-success');
            badge.text('Online');
        } else {
            badge.removeClass('bg-secondary bg-success').addClass('bg-danger');
            badge.text('Offline');
        }
    }

    checkConnectivity() {
        this.updateConnectionStatus(navigator.onLine);
    }

    // Utility Functions
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch {
            throw new Error('Invalid token format');
        }
    }

    // Clock
    startClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateString = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        $('#currentTime').text(`${dateString} ${timeString}`);
    }

    // Data Persistence
    loadSavedData() {
        // Load server URL
        const savedServerUrl = localStorage.getItem('tusServerUrl');
        if (savedServerUrl) {
            $('#serverUrl').val(savedServerUrl);
            this.state.serverUrl = savedServerUrl;
        }
        
        // Load token
        const savedToken = localStorage.getItem('tusToken');
        if (savedToken) {
            $('#jwtTokenInput').val(savedToken);
            this.state.jwtToken = savedToken;
            $('#tokenStatus').text('Valid').removeClass('invalid').addClass('valid');
        }
        
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const serverParam = urlParams.get('server');
        if (serverParam) {
            $('#serverUrl').val(serverParam);
            this.state.serverUrl = serverParam;
        }
        
        const tokenParam = urlParams.get('token');
        if (tokenParam) {
            $('#jwtTokenInput').val(tokenParam);
            setTimeout(() => this.setToken(), 100);
        }
    }

    saveData() {
        if (this.state.serverUrl) {
            localStorage.setItem('tusServerUrl', this.state.serverUrl);
        }
        if (this.state.jwtToken) {
            localStorage.setItem('tusToken', this.state.jwtToken);
        }
    }

    // Expose methods to global scope
    exposeMethods() {
        window.app = this;
        window.copyLog = () => logger.copy();
        window.clearLog = () => logger.clear();
        window.pasteToken = () => this.pasteToken();
        window.copyToken = () => this.copyToken();
        window.setToken = () => this.setToken();
        window.clearToken = () => this.clearToken();
        window.testServerConnection = () => this.testServerConnection();
        window.startUpload = () => this.startUpload();
        window.stopUpload = () => this.stopUpload();
        window.clearFile = () => this.clearFile();
    }
}

// Initialize application when DOM is ready
$(document).ready(() => {
    new TusUploadApp();
});