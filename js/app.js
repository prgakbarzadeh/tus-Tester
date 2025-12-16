// app.js - Simple and Reliable Tus Upload App
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing app...");

  // Global state
  const app = {
    currentFile: null,
    isUploading: false,
    uploader: null,
    jwtToken: null,
    tusServerInfo: null,

    init: function () {
      console.log("Initializing app...");

      // Setup event listeners
      this.setupEventListeners();

      // Load saved token
      this.loadSavedToken();

      // Update UI state
      this.updateUploadButton();

      // Initialize time
      this.updateTime();
      setInterval(() => this.updateTime(), 1000);

      console.log("App initialized successfully");
      logger.add("Application initialized successfully", "success");
    },

    setupEventListeners: function () {
      console.log("Setting up event listeners...");

      // File selection button
      document
        .getElementById("selectFileBtn")
        .addEventListener("click", (e) => {
          e.preventDefault();
          document.getElementById("fileInput").click();
        });

      // File input change
      document.getElementById("fileInput").addEventListener("change", (e) => {
        this.handleFileSelect(e);
      });

      // Drag and drop area
      const dropArea = document.getElementById("dropArea");

      dropArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropArea.classList.add("dragover");
      });

      dropArea.addEventListener("dragleave", () => {
        dropArea.classList.remove("dragover");
      });

      dropArea.addEventListener("drop", (e) => {
        e.preventDefault();
        dropArea.classList.remove("dragover");

        if (e.dataTransfer.files.length) {
          this.handleFileDrop(e.dataTransfer.files[0]);
        }
      });

      // Click on upload area to browse
      dropArea.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("fileInput").click();
      });

      // Server URL enter key
      document.getElementById("serverUrl").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.testServerConnection();
        }
      });

      console.log("Event listeners setup complete");
    },

    loadSavedToken: function () {
      try {
        const savedToken = localStorage.getItem("jwtToken");
        if (savedToken) {
          document.getElementById("jwtTokenInput").value = savedToken;
          this.setToken();
        }
      } catch (error) {
        console.error("Error loading saved token:", error);
      }
    },

    handleFileSelect: function (event) {
      const file = event.target.files[0];
      if (file) {
        this.setSelectedFile(file);
      }
    },

    handleFileDrop: function (file) {
      if (file) {
        this.setSelectedFile(file);
      }
    },

    setSelectedFile: function (file) {
      // Validate file
      const maxSize = 1024 * 1024 * 1024; // 1GB
      if (file.size > maxSize) {
        const message = `File size too large (max ${this.formatFileSize(
          maxSize
        )})`;
        logger.add(message, "error");
        toastManager.error(message);
        return;
      }

      // Check file extension
      const blockedExtensions = [
        ".exe",
        ".bat",
        ".dll",
        ".jar",
        ".apk",
        ".ps1",
        ".vbs",
        ".js",
        ".msi",
        ".com",
        ".scr",
        ".pif",
        ".cmd",
        ".lnk",
      ];
      const fileExt = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));

      if (blockedExtensions.includes(fileExt)) {
        const message = `Blocked file type: ${fileExt}`;
        logger.add(message, "error");
        toastManager.error(message);
        return;
      }

      this.currentFile = file;

      // Update UI
      document.getElementById("fileName").textContent = file.name;
      document.getElementById("fileSize").textContent = this.formatFileSize(
        file.size
      );
      document.getElementById("fileType").textContent =
        file.type || this.getFileTypeFromExtension(fileExt);

      // Show file info and hide drop area
      document.getElementById("fileInfo").classList.remove("d-none");
      document.getElementById("dropArea").classList.add("d-none");

      // Update upload button
      this.updateUploadButton();

      // Log and show toast
      const message = i18n.t("messages.fileSelected", { filename: file.name });
      logger.add(message, "success");
      toastManager.success(message);
    },

    clearFile: function () {
      this.currentFile = null;

      // Reset UI
      document.getElementById("fileInput").value = "";
      document.getElementById("fileName").textContent = "-";
      document.getElementById("fileSize").textContent = "-";
      document.getElementById("fileType").textContent = "-";

      document.getElementById("fileInfo").classList.add("d-none");
      document.getElementById("dropArea").classList.remove("d-none");
      document.getElementById("progressContainer").classList.add("d-none");
      document.getElementById("progressBar").style.width = "0%";
      document.getElementById("progressBar").textContent = "0%";
      document.getElementById("progressPercent").textContent = "0%";

      // Stop any ongoing upload
      if (this.uploader && this.isUploading) {
        this.stopUpload();
      }

      // Update buttons
      this.updateUploadButton();

      // Log and show toast
      const message = i18n.t("messages.fileCleared");
      logger.add(message, "info");
      toastManager.info(message);
    },

    setToken: function () {
      const tokenInput = document.getElementById("jwtTokenInput").value.trim();

      if (!tokenInput) {
        const message = i18n.t("messages.tokenInvalid");
        logger.add(message, "error");
        toastManager.error(message);
        return;
      }

      this.jwtToken = tokenInput;

      // Update UI
      const tokenStatus = document.getElementById("tokenStatus");
      tokenStatus.classList.remove("invalid");
      tokenStatus.classList.add("valid");
      tokenStatus.textContent = i18n.t("token.validToken");

      // Update upload button
      this.updateUploadButton();

      // Log and show toast
      const message = i18n.t("messages.tokenSet");
      logger.add(message, "success");
      toastManager.success(message);

      // Save to localStorage
      try {
        localStorage.setItem("jwtToken", tokenInput);
      } catch (error) {
        console.error("Could not save token to localStorage:", error);
      }
    },

    clearToken: function () {
      this.jwtToken = null;
      document.getElementById("jwtTokenInput").value = "";

      // Update UI
      const tokenStatus = document.getElementById("tokenStatus");
      tokenStatus.classList.remove("valid");
      tokenStatus.classList.add("invalid");
      tokenStatus.textContent = i18n.t("token.noToken");

      // Update upload button
      this.updateUploadButton();

      // Log and show toast
      const message = i18n.t("messages.tokenCleared");
      logger.add(message, "info");
      toastManager.info(message);

      // Remove from localStorage
      try {
        localStorage.removeItem("jwtToken");
      } catch (error) {
        console.error("Could not remove token from localStorage:", error);
      }
    },

    pasteToken: function () {
      try {
        // Focus on the token input
        const tokenInput = document.getElementById("jwtTokenInput");
        tokenInput.focus();

        logger.add("Please paste using Ctrl+V in the token field", "info");
        toastManager.info("Please paste using Ctrl+V in the token field");
      } catch (error) {
        console.error("Error in pasteToken:", error);
        toastManager.error("Please paste manually using Ctrl+V");
      }
    },

    copyToken: function () {
      try {
        const token = document.getElementById("jwtTokenInput").value;
        if (!token || token.trim() === "") {
          logger.add("No token to copy", "warning");
          toastManager.warning("No token to copy");
          return;
        }

        // Use modern Clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(token)
            .then(() => {
              logger.add("Token copied to clipboard", "success");
              toastManager.success("Token copied to clipboard");
            })
            .catch((err) => {
              // Fallback to execCommand
              this.copyTokenFallback(token);
            });
        } else {
          // Fallback to execCommand
          this.copyTokenFallback(token);
        }
      } catch (error) {
        console.error("Error in copyToken:", error);
        logger.add("Failed to copy token", "error");
        toastManager.error("Failed to copy token");
      }
    },

    copyTokenFallback: function (token) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = token;
        textarea.style.position = "fixed";
        textarea.style.left = "-999999px";
        textarea.style.top = "-999999px";
        document.body.appendChild(textarea);

        textarea.select();
        textarea.setSelectionRange(0, 99999);

        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (successful) {
          logger.add("Token copied to clipboard", "success");
          toastManager.success("Token copied to clipboard");
        } else {
          throw new Error("Copy command failed");
        }
      } catch (error) {
        throw error;
      }
    },

    testServerConnection: async function () {
      const serverUrl = document.getElementById("serverUrl").value.trim();

      if (!serverUrl) {
        logger.add("Please enter a server URL", "error");
        toastManager.error("Please enter a server URL");
        return;
      }

      try {
        new URL(serverUrl);
      } catch {
        logger.add("Invalid URL format", "error");
        toastManager.error("Invalid URL format");
        return;
      }

      const tusEndpoint = serverUrl + "/tus";
      logger.add(`Testing connection to: ${tusEndpoint}`, "info");

      try {
        const response = await fetch(tusEndpoint, {
          method: "OPTIONS",
          headers: {
            "Tus-Resumable": "1.0.0",
          },
        });

        if (response.ok) {
          const tusResumable = response.headers.get("Tus-Resumable");
          const tusMaxSize = response.headers.get("Tus-Max-Size");

          this.tusServerInfo = {
            resumableVersion: tusResumable || "1.0.0",
            maxSize: tusMaxSize ? parseInt(tusMaxSize) : null,
          };

          logger.add("Server connection successful", "success");
          toastManager.success("Server connection successful");

          // Update connection status
          const connectionStatus = document.getElementById("connectionStatus");
          connectionStatus.classList.remove("bg-secondary");
          connectionStatus.classList.add("bg-success");
          connectionStatus.textContent = i18n.t("status.online");
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        logger.add(`Server test failed: ${error.message}`, "error");
        toastManager.error("Cannot connect to server");

        // Update connection status
        const connectionStatus = document.getElementById("connectionStatus");
        connectionStatus.classList.remove("bg-success");
        connectionStatus.classList.add("bg-secondary");
        connectionStatus.textContent = i18n.t("status.offline");

        this.tusServerInfo = null;
      }

      this.updateUploadButton();
    },

    updateUploadButton: function () {
      const hasServer =
        document.getElementById("serverUrl").value.trim().length > 0;
      const hasToken = this.jwtToken !== null;
      const hasFile = this.currentFile !== null;
      const isUploading = this.isUploading;

      const canUpload = hasServer && hasToken && hasFile && !isUploading;

      document.getElementById("uploadBtn").disabled = !canUpload;
      document.getElementById("stopBtn").disabled = !isUploading;
    },

    startUpload: function () {
      if (!this.currentFile) {
        logger.add("No file selected", "error");
        toastManager.error("No file selected");
        return;
      }

      if (!this.jwtToken) {
        logger.add("No authentication token set", "error");
        toastManager.error("No authentication token set");
        return;
      }

      const serverUrl = document.getElementById("serverUrl").value.trim();
      if (!serverUrl) {
        logger.add("No server URL entered", "error");
        toastManager.error("No server URL entered");
        return;
      }

      if (typeof tus === "undefined") {
        logger.add("TUS library not loaded", "error");
        toastManager.error("TUS library not loaded");
        return;
      }

      this.isUploading = true;
      this.updateUploadButton();

      // Show progress UI
      document.getElementById("progressContainer").classList.remove("d-none");

      logger.add("Upload started", "info");
      logger.add(
        `Uploading: ${this.currentFile.name} (${this.formatFileSize(
          this.currentFile.size
        )})`,
        "info"
      );

      try {
        const metadata = {
          filename: btoa(encodeURIComponent(this.currentFile.name)),
          contentType: btoa(
            this.currentFile.type || "application/octet-stream"
          ),
        };

        const metadataStr = Object.entries(metadata)
          .map(([key, value]) => `${key} ${value}`)
          .join(",");

        this.uploader = new tus.Upload(this.currentFile, {
          endpoint: serverUrl + "/tus",
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            Authorization: `Bearer ${this.jwtToken}`,
            "Upload-Metadata": metadataStr,
            "Tus-Resumable": "1.0.0",
          },
          chunkSize: 5 * 1024 * 1024,
          onError: (error) => {
            logger.add(`Upload error: ${error.message}`, "error");
            toastManager.error(`Upload failed: ${error.message}`);

            this.isUploading = false;
            this.updateUploadButton();
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
            const progressBar = document.getElementById("progressBar");
            progressBar.style.width = percentage + "%";
            progressBar.textContent = percentage + "%";
            document.getElementById("progressPercent").textContent =
              percentage + "%";
          },
          onSuccess: () => {
            logger.add("Upload completed successfully", "success");
            toastManager.success("Upload completed successfully");

            this.isUploading = false;
            this.updateUploadButton();

            // Auto-clear after 3 seconds
            setTimeout(() => {
              if (!this.isUploading) {
                this.clearFile();
              }
            }, 3000);
          },
        });

        this.uploader.start();
      } catch (error) {
        logger.add(`Failed to start upload: ${error.message}`, "error");
        toastManager.error(`Failed to start upload: ${error.message}`);

        this.isUploading = false;
        this.updateUploadButton();
      }
    },

    stopUpload: function () {
      if (this.uploader && this.isUploading) {
        this.uploader.abort();
        logger.add("Upload stopped", "warning");
        toastManager.warning("Upload stopped");

        this.isUploading = false;
        this.updateUploadButton();
      }
    },

    updateTime: function () {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      document.getElementById("currentTime").textContent = timeString;
    },

    formatFileSize: function (bytes) {
      if (bytes === 0) return "0 Bytes";

      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },

    getFileTypeFromExtension: function (extension) {
      const typeMap = {
        ".jpg": "Image (JPEG)",
        ".jpeg": "Image (JPEG)",
        ".png": "Image (PNG)",
        ".gif": "Image (GIF)",
        ".pdf": "PDF Document",
        ".doc": "Word Document",
        ".docx": "Word Document",
        ".xls": "Excel Spreadsheet",
        ".xlsx": "Excel Spreadsheet",
        ".zip": "Archive (ZIP)",
        ".rar": "Archive (RAR)",
        ".mp4": "Video (MP4)",
        ".avi": "Video (AVI)",
        ".mov": "Video (MOV)",
        ".mkv": "Video (MKV)",
        ".mp3": "Audio (MP3)",
        ".wav": "Audio (WAV)",
        ".ogg": "Audio (OGG)",
        ".txt": "Text File",
      };

      const lowerExt = (extension || "").toLowerCase();
      return typeMap[lowerExt] || "Unknown File Type";
    },
  };

  // Make app globally available
  window.app = app;

  // Initialize the app after a short delay to ensure all scripts are loaded
  setTimeout(() => {
    app.init();
  }, 100);
});

// Global functions called from HTML
function testServerConnection() {
  if (window.app && window.app.testServerConnection) {
    window.app.testServerConnection();
  }
}

function setToken() {
  if (window.app && window.app.setToken) {
    window.app.setToken();
  }
}

function clearToken() {
  if (window.app && window.app.clearToken) {
    window.app.clearToken();
  }
}

function pasteToken() {
  if (window.app && window.app.pasteToken) {
    window.app.pasteToken();
  }
}

function copyToken() {
  if (window.app && window.app.copyToken) {
    window.app.copyToken();
  }
}

function startUpload() {
  if (window.app && window.app.startUpload) {
    window.app.startUpload();
  }
}

function stopUpload() {
  if (window.app && window.app.stopUpload) {
    window.app.stopUpload();
  }
}

function clearFile() {
  if (window.app && window.app.clearFile) {
    window.app.clearFile();
  }
}

function copyLog() {
  if (logger && logger.copy) {
    logger.copy();
    const message = i18n.t("messages.logsCopied");
    toastManager.success(message);
    logger.add(message, "success");
  }
}

function clearLog() {
  if (logger && logger.clear) {
    logger.clear();
    const message = i18n.t("messages.logsCleared");
    toastManager.info(message);
    logger.add(message, "info");
  }
}
