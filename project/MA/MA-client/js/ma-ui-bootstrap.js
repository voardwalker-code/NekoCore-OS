// Runs after all MA UI scripts are loaded.
initializeMAUI();

// ── Auto-trigger book ingestion when opened with ?bookId= ────────────────
(function () {
  var params = new URLSearchParams(window.location.search);
  var bookId = params.get('bookId');
  var title = params.get('title');
  var projectFolder = params.get('projectFolder');
  if (!bookId) return;

  // Switch to Chat mode so the user sees progress
  if (typeof switchMode === 'function') switchMode('chat');

  // Pre-fill the chat input so the user can review/edit before sending
  setTimeout(function () {
    var msg = 'Ingest the uploaded book "' + (title || bookId) + '" (bookId: ' + bookId + '). ' +
              'Extract all major characters and create entities for them.';
    if (projectFolder) {
      msg += ' YOUR PROJECT FOLDER IS: "' + projectFolder + '/" — ALL output files (registries, memories, reports) MUST go inside this folder. NEVER write files to the workspace root.';
    }
    if (typeof inputEl !== 'undefined') {
      inputEl.value = msg;
      inputEl.focus();
    }
    // Clean URL params so refresh doesn't re-trigger
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, 500);
})();
