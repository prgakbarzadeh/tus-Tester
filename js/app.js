// app.js - Pure JavaScript Tus Tester
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Tus Tester - Pure JS Version Started');
    log('=== Tus Tester (Pure JS) Started ===', 'success');
    
    // Initialize everything
    initializePureJS();
    
    // Update clock
    updateClock();
    setInterval(updateClock, 1000);
});

// ========== GLOBAL STATE ==========
let currentFile = null;
let currentToken = '';
let serverUrl = 'https://localhost:7010/tus';
let isUploading = false;
let fileInputElement = null; // ذخیره refrence عنصر فایل

// ========== MAIN INITIALIZATION ==========
function initializePureJS() {
    console.log('🔄 Initializing Pure JS version...');
    
    try {
        // 1. Setup file selection (MOST IMPORTANT - Pure JS)
        setupFileSelectionPureJS();
        
        // 2. Setup server URL
        setupServerURL();
        
        // 3. Setup token handling
        setupTokenHandling();
        
        // 4. Setup button event listeners
        setupButtonListeners();
        
        // 5. Initial UI update
        updateUIState();
        updateStatus('✅ System Ready - Select a file to begin', 'ready');
        
        console.log('✅ Pure JS initialization complete');
        log('Application initialized successfully', 'success');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        log(`Initialization error: ${error.message}`, 'error');
    }
}

// ========== 1. FILE SELECTION - PURE JS (GUARANTEED) ==========
function setupFileSelectionPureJS() {
    console.log('🔄 Setting up file selection (Pure JS)...');
    
    // Get elements
    const dropArea = document.getElementById('dropArea');
    const selectBtn = document.getElementById('selectFileBtn');
    
    // Verify elements exist
    if (!dropArea || !selectBtn) {
        console.error('❌ Critical: File selection elements not found!');
        alert('ERROR: File selection elements missing. Check HTML.');
        return;
    }
    
    console.log('✅ File selection elements found');
    
    // 🔥 CRITICAL FIX: Create a hidden file input element
    createHiddenFileInput();
    
    // 🔥 METHOD 1: Select button click (MAIN)
    selectBtn.addEventListener('click', function(e) {
        console.log('🖱️ Select button clicked');
        e.preventDefault();
        e.stopPropagation();
        
        // Trigger click on the hidden file input
        if (fileInputElement) {
            console.log('📁 Opening file dialog...');
            fileInputElement.click();
        }
    });
    
    // 🔥 METHOD 2: Drop area click
    dropArea.addEventListener('click', function(e) {
        console.log('🖱️ Drop area clicked');
        e.preventDefault();
        e.stopPropagation();
        
        if (fileInputElement) {
            console.log('📁 Opening file dialog...');
            fileInputElement.click();
        }
    });
    
    // 🔥 METHOD 3: File input change (THIS IS WHAT MATTERS)
    if (fileInputElement) {
        fileInputElement.addEventListener('change', function(e) {
            console.log('📁 File input changed event fired');
            
            if (this.files && this.files.length > 0) {
                const file = this.files[0];
                console.log(`📄 File selected: ${file.name} (${file.size} bytes)`);
                handleFileSelected(file);
            } else {
                console.log('⚠️ No file selected');
            }
        });
    }
    
    // 🔥 METHOD 4: Drag and drop (BONUS)
    dropArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });
    
    dropArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });
    
    dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            console.log(`📄 File dropped: ${file.name}`);
            handleFileSelected(file);
        }
    });
    
    console.log('✅ File selection setup complete');
}

// ایجاد یک input فایل مخفی که واقعا در DOM وجود دارد
function createHiddenFileInput() {
    console.log('🔄 Creating hidden file input...');
    
    // حذف عنصر قبلی اگر وجود دارد
    const existingInput = document.querySelector('input[type="file"][id="hiddenFileInput"]');
    if (existingInput) {
        existingInput.remove();
    }
    
    // ایجاد عنصر جدید
    fileInputElement = document.createElement('input');
    fileInputElement.type = 'file';
    fileInputElement.id = 'hiddenFileInput';
    fileInputElement.style.position = 'fixed';
    fileInputElement.style.left = '-9999px';
    fileInputElement.style.top = '-9999px';
    fileInputElement.style.opacity = '0';
    fileInputElement.style.zIndex = '-1000';
    fileInputElement.style.pointerEvents = 'none';
    
    // اضافه کردن به بدنه
    document.body.appendChild(fileInputElement);
    
    console.log('✅ Hidden file input created');
    return fileInputElement;
}

function handleFileSelected(file) {
    console.log(`🔄 Handling selected file: ${file.name}`);
    
    currentFile = file;
    
    // Update file info display
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');
    
    fileInfo.classList.remove('d-none');
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    fileType.textContent = file.type || 'Unknown';
    
    // Reset progress
    document.getElementById('progressContainer').classList.add('d-none');
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressBar').textContent = '0%';
    document.getElementById('progressPercent').textContent = '0%';
    
    // Log and notify
    log(`✅ File selected: ${file.name} (${formatBytes(file.size)})`, 'success');
    showNotification('File Selected', `${file.name} is ready for upload`, 'success');
    
    // Update UI
    updateUIState();
}

// ========== 2. SERVER CONFIGURATION ==========
function setupServerURL() {
    const serverUrlInput = document.getElementById('serverUrl');
    
    if (serverUrlInput) {
        serverUrlInput.value = serverUrl;
        
        serverUrlInput.addEventListener('input', function() {
            serverUrl = this.value.trim();
            console.log(`🌐 Server URL updated: ${serverUrl}`);
            updateUIState();
        });
    }
}

// ========== 3. TOKEN HANDLING ==========
function setupTokenHandling() {
    const tokenInput = document.getElementById('jwtTokenInput');
    
    if (tokenInput) {
        tokenInput.addEventListener('input', function() {
            updateUIState();
        });
    }
}

// ========== 4. BUTTON EVENT LISTENERS ==========
function setupButtonListeners() {
    console.log('🔄 Setting up button listeners...');
    
    // Set Token Button
    const setTokenBtn = document.querySelector('button[onclick*="setToken"]');
    if (setTokenBtn) {
        setTokenBtn.addEventListener('click', setToken);
    }
    
    // Clear Token Button
    const clearTokenBtn = document.querySelector('button[onclick*="clearToken"]');
    if (clearTokenBtn) {
        clearTokenBtn.addEventListener('click', clearToken);
    }
    
    // Test Connection Button
    const testConnBtn = document.querySelector('button[onclick*="testServerConnection"]');
    if (testConnBtn) {
        testConnBtn.addEventListener('click', testServerConnection);
    }
    
    // Start Upload Button
    const startUploadBtn = document.getElementById('uploadBtn');
    if (startUploadBtn) {
        startUploadBtn.addEventListener('click', startUpload);
    }
    
    // Stop Upload Button
    const stopUploadBtn = document.getElementById('stopBtn');
    if (stopUploadBtn) {
        stopUploadBtn.addEventListener('click', stopUpload);
    }
    
    // Clear File Button
    const clearFileBtn = document.querySelector('button[onclick*="clearFile"]');
    if (clearFileBtn) {
        clearFileBtn.addEventListener('click', clearFile);
    }
    
    console.log('✅ Button listeners setup complete');
}

// ========== TOKEN FUNCTIONS ==========
function setToken() {
    const tokenInput = document.getElementById('jwtTokenInput');
    const tokenStatus = document.getElementById('tokenStatus');
    
    currentToken = tokenInput.value.trim();
    
    if (!currentToken) {
        showNotification('Error', 'Please enter a JWT token', 'error');
        return;
    }
    
    tokenStatus.classList.remove('invalid');
    tokenStatus.classList.add('valid');
    tokenStatus.textContent = 'Token Set ✓';
    
    log('✅ JWT token set successfully', 'success');
    showNotification('Success', 'Token saved', 'success');
    
    updateUIState();
}

function clearToken() {
    const tokenInput = document.getElementById('jwtTokenInput');
    const tokenStatus = document.getElementById('tokenStatus');
    
    currentToken = '';
    tokenInput.value = '';
    tokenStatus.classList.remove('valid');
    tokenStatus.classList.add('invalid');
    tokenStatus.textContent = 'No Token';
    
    log('Token cleared', 'info');
    updateUIState();
}

function pasteToken() {
    navigator.clipboard.readText()
        .then(text => {
            document.getElementById('jwtTokenInput').value = text.trim();
            log('Token pasted', 'info');
            showNotification('Success', 'Token pasted', 'success');
        })
        .catch(err => {
            console.error('Clipboard error:', err);
            showNotification('Error', 'Cannot access clipboard', 'error');
        });
}

function copyToken() {
    const token = document.getElementById('jwtTokenInput').value.trim();
    if (!token) {
        showNotification('Error', 'No token to copy', 'error');
        return;
    }
    
    navigator.clipboard.writeText(token)
        .then(() => showNotification('Success', 'Token copied', 'success'))
        .catch(err => console.error('Copy error:', err));
}

// ========== SERVER CONNECTION TEST ==========
function testServerConnection() {
    if (!serverUrl) {
        showNotification('Error', 'Please enter server URL', 'error');
        return;
    }
    
    log(`🌐 Testing connection to: ${serverUrl}`, 'info');
    updateStatus('Testing connection...', 'info');
    
    const connStatus = document.getElementById('connectionStatus');
    connStatus.textContent = 'Testing...';
    connStatus.className = 'badge bg-warning';
    
    fetch(serverUrl, {
        method: 'OPTIONS',
        headers: { 'Tus-Resumable': '1.0.0' }
    })
    .then(response => {
        console.log('Server response:', response.status);
        log(`✅ Server connected - Status: ${response.status}`, 'success');
        
        connStatus.textContent = 'Online';
        connStatus.className = 'badge bg-success';
        updateStatus('Server is ready', 'success');
        showNotification('Connected', 'Server is online', 'success');
    })
    .catch(error => {
        console.error('Connection error:', error);
        log(`❌ Connection failed: ${error.message}`, 'error');
        
        connStatus.textContent = 'Offline';
        connStatus.className = 'badge bg-danger';
        updateStatus('Connection failed', 'error');
        showNotification('Error', 'Server not responding', 'error');
    });
}

// ========== UPLOAD FUNCTION ==========
function startUpload() {
    console.log('🚀 Starting upload...');
    
    // Validation
    if (!currentFile) {
        showNotification('Error', 'Please select a file first', 'error');
        return;
    }
    
    if (!serverUrl) {
        showNotification('Error', 'Please configure server URL', 'error');
        return;
    }
    
    if (isUploading) {
        showNotification('Warning', 'Upload already in progress', 'warning');
        return;
    }
    
    isUploading = true;
    
    // Show progress
    document.getElementById('progressContainer').classList.remove('d-none');
    updateStatus('Starting upload...', 'uploading');
    
    log(`📤 Uploading: ${currentFile.name} (${formatBytes(currentFile.size)})`, 'info');
    
    // Prepare upload
    const upload = new tus.Upload(currentFile, {
        endpoint: serverUrl,
        retryDelays: [0, 1000, 3000],
        headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {},
        metadata: {
            filename: currentFile.name,
            filetype: currentFile.type || ''
        },
        chunkSize: 2 * 1024 * 1024,
        
        onError: function(error) {
            console.error('Upload error:', error);
            log(`❌ Upload failed: ${error.message}`, 'error');
            
            isUploading = false;
            updateUIState();
            updateStatus('Upload failed', 'error');
        },
        
        onProgress: function(bytesUploaded, bytesTotal) {
            const percent = Math.round((bytesUploaded / bytesTotal) * 100);
            
            const progressBar = document.getElementById('progressBar');
            const progressPercent = document.getElementById('progressPercent');
            
            progressBar.style.width = percent + '%';
            progressBar.textContent = percent + '%';
            progressPercent.textContent = percent + '%';
            
            if (percent % 10 === 0) {
                console.log(`📊 Progress: ${percent}%`);
            }
            
            updateStatus(`Uploading: ${percent}%`, 'uploading');
        },
        
        onSuccess: function() {
            log('✅ Upload completed successfully!', 'success');
            showNotification('Success', 'File uploaded!', 'success');
            
            isUploading = false;
            updateUIState();
            updateStatus('Upload complete', 'success');
        }
    });
    
    // Start upload
    upload.start();
    updateUIState();
}

function stopUpload() {
    log('⏹️ Upload stop requested', 'warning');
    showNotification('Info', 'Refresh page to stop upload', 'info');
}

function clearFile() {
    currentFile = null;
    
    // Reset UI
    if (fileInputElement) {
        fileInputElement.value = '';
    }
    document.getElementById('fileInfo').classList.add('d-none');
    document.getElementById('progressContainer').classList.add('d-none');
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressBar').textContent = '0%';
    document.getElementById('progressPercent').textContent = '0%';
    
    log('🗑️ File cleared', 'info');
    updateUIState();
    updateStatus('Ready for new file', 'ready');
}

// ========== UI HELPER FUNCTIONS ==========
function updateUIState() {
    const hasFile = !!currentFile;
    const hasServer = !!serverUrl && serverUrl.trim().length > 0;
    const canUpload = hasFile && hasServer && !isUploading;
    
    const uploadBtn = document.getElementById('uploadBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (uploadBtn) {
        uploadBtn.disabled = !canUpload;
        uploadBtn.innerHTML = isUploading 
            ? '<i class="bi bi-hourglass"></i> Uploading...' 
            : '<i class="bi bi-play-circle"></i> Start Upload';
    }
    
    if (stopBtn) {
        stopBtn.disabled = !isUploading;
    }
}

function updateStatus(message, type = 'info') {
    const statusBox = document.getElementById('statusBox');
    if (!statusBox) return;
    
    // Remove all status classes
    statusBox.className = 'status-box';
    
    // Add type class
    statusBox.classList.add(type);
    
    // Update message
    const messageElement = statusBox.querySelector('.small');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

function updateClock() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('fa-IR');
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ========== GLOBAL FUNCTIONS (for onclick attributes) ==========
window.setToken = setToken;
window.clearToken = clearToken;
window.pasteToken = pasteToken;
window.copyToken = copyToken;
window.startUpload = startUpload;
window.stopUpload = stopUpload;
window.clearFile = clearFile;
window.testServerConnection = testServerConnection;

// ========== TEST FUNCTION ==========
window.testFileSelect = function() {
    console.log('🧪 Testing file selection...');
    console.log('currentFile:', currentFile);
    console.log('File input element:', fileInputElement);
    
    // Trigger file input click
    if (fileInputElement) {
        fileInputElement.click();
    }
    
    log('File selection test triggered', 'info');
};

// ========== FALLBACK LOG FUNCTION ==========
if (!window.log) {
    window.log = function(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-message log-${type}">${message}</span>
        `;
        
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    };
}

// Initial message
log('✅ Tus Tester (Pure JS) loaded successfully', 'success');