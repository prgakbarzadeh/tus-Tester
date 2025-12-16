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

        // Initialize toast first
        this.toast = new ToastManager();
        
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

    async createUploadSession() {
        try {
            const serverUrl = $('#serverUrl').val().trim();
            const baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
            
            console.log('Creating upload session...');
            console.log('   URL:', baseUrl + '/tus');
            console.log('   File:', this.state.selectedFile.name);
            console.log('   Size:', this.state.selectedFile.size);
            console.log('   Type:', this.state.selectedFile.type);

            // Encode filename for metadata
            const encodedFilename = btoa(unescape(encodeURIComponent(this.state.selectedFile.name)));
            console.log('   Encoded filename:', encodedFilename);

            // Headers – حذف Content-Type برای درخواست POST creation (body خالی است)
            const headers = {
                'Tus-Resumable': '1.0.0',
                'Upload-Length': this.state.selectedFile.size.toString(),
                'Upload-Metadata': `filename ${encodedFilename},contentType ${btoa(this.state.selectedFile.type || 'application/octet-stream')}`
            };

            // اگر JWT وجود دارد اضافه کن
            if (this.state.jwtToken) {
                headers['Authorization'] = `Bearer ${this.state.jwtToken}`;
            }

            console.log('   Headers:', headers);

            // Create upload session
            console.log('   Sending POST request...');
            const createResponse = await fetch(baseUrl + '/tus', {
                method: 'POST',
                headers: headers,
                mode: 'cors',
                credentials: 'include'
            });

            console.log('   Response status:', createResponse.status);
            console.log('   Response status text:', createResponse.statusText);

            // Log all response headers
            const responseHeaders = {};
            for (const [key, value] of createResponse.headers.entries()) {
                responseHeaders[key.toLowerCase()] = value;
                console.log(`   Header ${key}: ${value}`);
            }

            if (createResponse.status === 201) {
                let uploadUrl = responseHeaders['location'];

                if (!uploadUrl) {
                    throw new Error('No Location header returned from server');
                }

                // اگر URL نسبی باشد، به absolute تبدیل کن
                if (uploadUrl.startsWith('/')) {
                    uploadUrl = baseUrl + uploadUrl;
                }

                this.state.uploadUrl = uploadUrl;
                console.log('   Session created successfully:', uploadUrl);
                logger.add(`Upload session created: ${uploadUrl}`, 'success');
                return true;

            } else {
                const errorText = await createResponse.text();
                console.error('   Server error:', errorText);
                throw new Error(`Server returned ${createResponse.status}: ${errorText.substring(0, 200)}`);
            }
            
        } catch (error) {
            console.error('Session creation failed:', error);
            logger.add(`Failed to create upload session: ${error.message}`, 'error');
            this.toast.show(`Failed to create session: ${error.message}`, 'danger', 'Error');
            throw error;
        }
    }

    async startUpload() {
        if (!this.state.selectedFile) {
            this.toast.show('Please select a file first', 'warning');
            return;
        }

        if (this.state.isUploading) {
            this.toast.show('Upload already in progress', 'info');
            return;
        }

        try {
            // ایجاد session
            await this.createUploadSession();

            // شروع آپلود با PATCH
            this.state.isUploading = true;
            this.updateUI();

            const file = this.state.selectedFile;
            let offset = 0;
            const chunkSize = 5 * 1024 * 1024; // 5MB chunks

            logger.add('Starting chunked upload...', 'info');

            while (offset < file.size) {
                const chunk = file.slice(offset, offset + chunkSize);
                const chunkHeaders = {
                    'Tus-Resumable': '1.0.0',
                    'Upload-Offset': offset.toString(),
                    'Content-Type': 'application/offset+octet-stream'
                };

                if (this.state.jwtToken) {
                    chunkHeaders['Authorization'] = `Bearer ${this.state.jwtToken}`;
                }

                const patchResponse = await fetch(this.state.uploadUrl, {
                    method: 'PATCH',
                    headers: chunkHeaders,
                    body: chunk,
                    mode: 'cors',
                    credentials: 'include'
                });

                if (patchResponse.status !== 204) {
                    const errText = await patchResponse.text();
                    throw new Error(`PATCH failed (${patchResponse.status}): ${errText.substring(0, 200)}`);
                }

                // دریافت offset جدید از هدر
                const newOffset = parseInt(patchResponse.headers.get('Upload-Offset') || '0', 10);
                offset = newOffset;

                const progress = ((offset / file.size) * 100).toFixed(2);
                $('#progressPercent').text(`${progress}%`);
                $('#progressBar').css('width', `${progress}%`).text(`${progress}%`);

                logger.add(`Uploaded ${this.formatBytes(offset)} / ${this.formatBytes(file.size)} (${progress}%)`, 'info');
            }

            logger.add('Upload completed successfully!', 'success');
            this.toast.show('File uploaded successfully!', 'success', 'Success');
            this.updateStatus('Upload completed', 'success');

        } catch (error) {
            console.error('Upload failed:', error);
            logger.add(`Upload failed: ${error.message}`, 'error');
            this.toast.show(`Upload failed: ${error.message}`, 'danger', 'Error');
            this.updateStatus('Upload failed', 'danger');
        } finally {
            this.state.isUploading = false;
            this.updateUI();
        }
    }

    stopUpload() {
        if (this.state.currentRequest && this.state.currentRequest.abort) {
            this.state.currentRequest.abort();
        }
        this.state.isUploading = false;
        this.updateUI();
        logger.add('Upload stopped by user', 'warning');
        this.toast.show('Upload cancelled', 'info');
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.state.selectedFile = file;
        $('#fileName').text(file.name);
        $('#fileSize').text(this.formatBytes(file.size));
        $('#fileType').text(file.type || 'unknown');
        $('#progressContainer').addClass('d-none');

        logger.add(`File selected: ${file.name} (${this.formatBytes(file.size)})`, 'info');
        this.updateUI();
    }

    clearFile() {
        this.state.selectedFile = null;
        this.state.uploadUrl = null;
        $('#fileInput').val('');
        $('#fileName').text('-');
        $('#fileSize').text('-');
        $('#fileType').text('-');
        $('#progressContainer').addClass('d-none');
        this.updateUI();
        logger.add('Selected file cleared', 'info');
    }

    setToken() {
        const token = $('#jwtTokenInput').val().trim();
        if (token) {
            try {
                const payload = this.parseJwt(token);
                this.state.jwtToken = token;
                $('#tokenStatus').text('Valid').removeClass('invalid').addClass('valid');
                logger.add('JWT token set successfully', 'success');
                this.saveData();
            } catch (e) {
                $('#tokenStatus').text('Invalid').removeClass('valid').addClass('invalid');
                logger.add('Invalid JWT token format', 'error');
            }
        } else {
            this.state.jwtToken = null;
            $('#tokenStatus').text('None').removeClass('valid invalid');
        }
        this.updateUI();
    }

    async testServerConnection() {
        const serverUrl = $('#serverUrl').val().trim();
        if (!serverUrl) {
            this.toast.show('Please enter server URL', 'warning');
            return;
        }

        const baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
        try {
            const response = await fetch(baseUrl + '/tus', {
                method: 'OPTIONS',
                mode: 'cors'
            });

            if (response.status === 204 || response.status === 200) {
                const tusVersion = response.headers.get('Tus-Resumable');
                if (tusVersion === '1.0.0') {
                    logger.add('TUS server detected and reachable', 'success');
                    this.toast.show('Server connection successful', 'success');
                    this.updateConnectionStatus(true);
                    this.saveData();
                } else {
                    logger.add(`Invalid Tus-Resumable header: ${tusVersion}`, 'error');
                    this.toast.show('Not a valid TUS server', 'danger');
                }
            } else {
                throw new Error(`Status ${response.status}`);
            }
        } catch (err) {
            logger.add(`Connection failed: ${err.message}`, 'error');
            this.toast.show('Cannot connect to server', 'danger');
            this.updateConnectionStatus(false);
        }
    }

    updateUI() {
        const hasFile = !!this.state.selectedFile;
        const hasToken = !!this.state.jwtToken;
        const canUpload = hasFile && !this.state.isUploading;

        $('#uploadBtn').prop('disabled', !canUpload);
        $('#stopBtn').prop('disabled', !this.state.isUploading);

        if (this.state.isUploading) {
            $('#statusBox').removeClass('info success danger').addClass('warning');
            $('#statusBox .small').text('Uploading in progress...');
        }
    }

    updateStatus(title, type = 'info') {
        const box = $('#statusBox');
        box.removeClass('info success danger warning');
        box.addClass(type);
        box.find('.fw-bold').text(title);
    }

    setupEventListeners() {
        $('#selectFileBtn').click(() => $('#fileInput').click());
        $('#fileInput').change((e) => this.handleFileSelect(e));
        
        $('#serverUrl').on('change', () => {
            this.state.serverUrl = $('#serverUrl').val().trim();
            this.saveData();
        });
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
        const savedServerUrl = localStorage.getItem('tusServerUrl');
        if (savedServerUrl) {
            $('#serverUrl').val(savedServerUrl);
            this.state.serverUrl = savedServerUrl;
        }
        
        const savedToken = localStorage.getItem('tusToken');
        if (savedToken) {
            $('#jwtTokenInput').val(savedToken);
            this.state.jwtToken = savedToken;
            $('#tokenStatus').text('Valid').removeClass('invalid').addClass('valid');
        }
        
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
        window.copyLog = () => {
            logger.copy();
            const message = window.i18n ? i18n.t('messages.logsCopied') : 'Logs copied to clipboard';
            this.toast.show(message, 'success', 'Logs');
        };
        window.clearLog = () => {
            logger.clear();
            const message = window.i18n ? i18n.t('messages.logsCleared') : 'Logs cleared';
            this.toast.show(message, 'info', 'Logs');
        };
        window.startUpload = () => this.startUpload();
        window.stopUpload = () => this.stopUpload();
        window.clearFile = () => this.clearFile();
        window.testServerConnection = () => this.testServerConnection();
        window.setToken = () => this.setToken();
    }
}

// Initialize application when DOM is ready
$(document).ready(() => {
    new TusUploadApp();
});