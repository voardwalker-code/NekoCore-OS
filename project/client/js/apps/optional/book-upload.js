// ============================================================
// NekoCore OS — Book Upload + Header File Menu
// Manages the "File" dropdown in the header bar and the
// Book-to-MA upload overlay.
// ============================================================
'use strict';

(function () {
  // ── File Menu Toggle ──────────────────────────────────────────────────────
  const fileBtn = document.getElementById('hdrFileBtn');
  const fileDrop = document.getElementById('hdrFileDropdown');

  if (fileBtn && fileDrop) {
    fileBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = fileDrop.classList.contains('open');
      closeFileMenu();
      if (!isOpen) {
        fileDrop.classList.add('open');
        fileBtn.setAttribute('aria-expanded', 'true');
        fileDrop.setAttribute('aria-hidden', 'false');
      }
    });

    document.addEventListener('click', function () { closeFileMenu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeFileMenu();
    });
  }

  function closeFileMenu() {
    if (!fileDrop) return;
    fileDrop.classList.remove('open');
    if (fileBtn) fileBtn.setAttribute('aria-expanded', 'false');
    fileDrop.setAttribute('aria-hidden', 'true');
  }

  // ── File Menu Actions ─────────────────────────────────────────────────────
  window.hdrFileAction = function (action) {
    closeFileMenu();
    if (action === 'docIngest') {
      if (typeof switchMainTab === 'function') {
        switchMainTab('documents');
      }
    } else if (action === 'bookToMA') {
      openBookUpload();
    }
  };

  // ── Book Upload Overlay ───────────────────────────────────────────────────
  const overlay = document.getElementById('bookUploadOverlay');
  const dropZone = document.getElementById('bookUploadDrop');
  const browseBtn = document.getElementById('bookUploadBrowseBtn');
  const fileInput = document.getElementById('bookUploadFileInput');
  const progressEl = document.getElementById('bookUploadProgress');
  const barEl = document.getElementById('bookUploadBar');
  const statusText = document.getElementById('bookUploadStatusText');
  const resultEl = document.getElementById('bookUploadResult');

  let uploading = false;

  function openBookUpload() {
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    // Reset state
    if (progressEl) progressEl.style.display = 'none';
    if (resultEl) { resultEl.style.display = 'none'; resultEl.innerHTML = ''; }
    if (barEl) barEl.style.width = '0%';
    if (dropZone) dropZone.style.display = '';
    uploading = false;
  }

  // Expose globally so Entity Creator's Novel Ingest can call it
  window.openBookUpload = openBookUpload;

  window.closeBookUpload = function () {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  };

  // Backdrop click closes
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && !uploading) closeBookUpload();
    });
  }

  // Drag & drop
  if (dropZone) {
    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', function (e) {
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) handleBookFile(e.dataTransfer.files[0]);
    });
  }

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) handleBookFile(fileInput.files[0]);
      fileInput.value = '';
    });
  }

  // ── Upload Logic ──────────────────────────────────────────────────────────
  async function handleBookFile(file) {
    if (uploading) return;

    if (!file.name.toLowerCase().endsWith('.txt')) {
      showBookNotice('Only .txt files are supported for book upload.', 'error');
      return;
    }

    uploading = true;
    if (dropZone) dropZone.style.display = 'none';
    if (progressEl) progressEl.style.display = 'block';
    if (statusText) statusText.textContent = 'Starting MA server…';
    if (barEl) barEl.style.width = '10%';

    try {
      // 1. Start MA server
      const startResp = await fetch('/api/servers/ma/start', { method: 'POST' });
      if (!startResp.ok) throw new Error('Failed to start MA server');
      if (statusText) statusText.textContent = 'Reading file…';
      if (barEl) barEl.style.width = '30%';

      // 2. Read file text
      const text = await readBookFileAsText(file);
      if (!text.trim()) throw new Error('File is empty');

      if (statusText) statusText.textContent = 'Uploading to MA…';
      if (barEl) barEl.style.width = '50%';

      // 3. POST to MA book upload endpoint
      const title = file.name.replace(/\.txt$/i, '');
      const uploadResp = await fetch('http://localhost:3850/api/book/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, title: title })
      });

      if (!uploadResp.ok) {
        const err = await uploadResp.json().catch(function () { return {}; });
        throw new Error(err.error || 'Upload failed: ' + uploadResp.status);
      }

      const data = await uploadResp.json();
      if (barEl) barEl.style.width = '100%';
      if (statusText) statusText.textContent = 'Upload complete';

      // 4. Show result
      showUploadResult(data, title);

    } catch (err) {
      console.error('[BookUpload] Error:', err);
      showBookNotice('Book upload failed: ' + err.message, 'error');
      if (dropZone) dropZone.style.display = '';
      if (progressEl) progressEl.style.display = 'none';
    } finally {
      uploading = false;
    }
  }

  function readBookFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = function () { reject(new Error('Failed to read file')); };
      reader.readAsText(file);
    });
  }

  function showUploadResult(data, title) {
    if (!resultEl) return;
    resultEl.style.display = 'block';

    var html = '<strong>\u2705 Book uploaded</strong><br>';
    html += '<span style="color:var(--text-secondary)">Title:</span> ' + escHtml(title) + '<br>';
    html += '<span style="color:var(--text-secondary)">Chunks:</span> ' + (data.totalChunks || '?') + '<br>';
    html += '<span style="color:var(--text-secondary)">Characters:</span> ' + ((data.totalChars || 0).toLocaleString()) + '<br>';
    html += '<span style="color:var(--text-secondary)">Book ID:</span> <code style="font-size:.8em;background:rgba(0,0,0,.2);padding:1px 5px;border-radius:4px">' + escHtml(data.bookId || '') + '</code><br><br>';
    html += '<button class="btn bp" onclick="openMAWithBook(\'' + escAttr(data.bookId || '') + '\',\'' + escAttr(title) + '\')">Open MA &rarr;</button>';
    html += ' <button class="btn bd" onclick="closeBookUpload()">Close</button>';
    resultEl.innerHTML = html;
  }

  window.openMAWithBook = function (bookId, title) {
    window.open('http://localhost:3850?bookId=' + encodeURIComponent(bookId) + '&title=' + encodeURIComponent(title), '_blank');
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escAttr(s) {
    return s.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
  }

  function showBookNotice(msg, type) {
    var notifyApi = window.notify;
    if (notifyApi && typeof notifyApi.show === 'function') {
      var map = { success: 'ok', error: 'error', info: 'info', warning: 'warn' };
      notifyApi.show(msg, map[type] || 'info');
    } else {
      console.log('[BookUpload:' + (type || 'info') + '] ' + msg);
    }
  }
})();
