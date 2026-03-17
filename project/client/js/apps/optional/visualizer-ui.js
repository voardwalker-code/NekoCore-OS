/* Visualizer UI helpers extracted from app.js - P3-S4 */

/* eslint-disable no-undef */

function showMemoryDetail(memId, panelId) {
  var panel = document.getElementById(panelId);
  if (!panel) return;

  panel.innerHTML = '<div class="mini-viz-loading">Loading...</div>';
  panel.style.display = 'block';

  fetch('/api/memory/summary?id=' + encodeURIComponent(memId))
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.ok && data.summary) {
        var summary = data.summary.length > 200 ? data.summary.substring(0, 200) + '...' : data.summary;
        var accessInfo = data.access_count > 0 ? ('Accessed ' + data.access_count + ' times') : 'Never accessed';
        var typeLabel = data.type ? (data.type.charAt(0).toUpperCase() + data.type.slice(1)) : 'Unknown';
        panel.innerHTML =
          '<div class="mini-detail-id" title="' + escapeHtmlAttr(memId) + '">' + escapeHtmlInner(memId) + '</div>' +
          '<div class="mini-detail-summary">' + escapeHtmlInner(summary) + '</div>' +
          '<div class="mini-detail-meta">' + typeLabel + ' &middot; ' + accessInfo +
            (data.created ? ' &middot; ' + new Date(data.created).toLocaleDateString() : '') +
          '</div>';
      } else {
        panel.innerHTML = '<div class="mini-detail-empty">No summary available</div>';
      }
    })
    .catch(function() {
      panel.innerHTML = '<div class="mini-detail-empty">Failed to load</div>';
    });
}

function showMiniMemoryDetail(memId) {
  showMemoryDetail(memId, 'miniVizDetail');
  var status = document.getElementById('miniVizStatus');
  if (status) status.textContent = memId;

  showMemoryDetail(memId, 'vizContextDetail');
  addVizActivityItem(memId);

  if (typeof NeuralViz !== 'undefined' && NeuralViz.isInitialized) {
    NeuralViz.selectNodeById(memId);
  }
}

function addVizActivityItem(memId) {
  var list = document.getElementById('vizContextActivityList');
  if (!list) return;
  var placeholder = list.querySelector('.mini-detail-empty');
  if (placeholder) placeholder.remove();
  var item = document.createElement('div');
  item.className = 'viz-activity-item';
  item.onclick = function() {
    showMemoryDetail(memId, 'vizContextDetail');
    if (typeof NeuralViz !== 'undefined' && NeuralViz.isInitialized) {
      NeuralViz.selectNodeById(memId);
    }
  };
  var now = new Date();
  item.innerHTML =
    '<div class="viz-activity-item-id">' + escapeHtmlInner(memId) + '</div>' +
    '<div class="viz-activity-item-time">' + now.toLocaleTimeString() + '</div>';
  list.insertBefore(item, list.firstChild);
  while (list.children.length > 20) list.removeChild(list.lastChild);
}

function escapeHtmlInner(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeHtmlAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setupVizSearch(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();
    if (!query || query.length < 3) {
      const results = document.getElementById('vizSearchResults');
      if (results) results.style.display = 'none';
      return;
    }

    if (typeof NeuralViz === 'undefined' || !NeuralViz.isInitialized) return;

    const allIds = NeuralViz.getNodeIds();
    const matches = allIds.filter(id => id.toLowerCase().includes(query)).slice(0, 8);

    const results = document.getElementById('vizSearchResults');
    if (results && matches.length > 0) {
      results.innerHTML = matches.map(id =>
        `<div class="viz-search-item" onclick="vizSearchSelect('${id}')">${id}</div>`
      ).join('');
      results.style.display = 'block';
    } else if (results) {
      results.style.display = 'none';
    }
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = this.value.trim();
      if (query && typeof NeuralViz !== 'undefined' && NeuralViz.isInitialized) {
        NeuralViz.selectNodeById(query);
        this.value = '';
        const results = document.getElementById('vizSearchResults');
        if (results) results.style.display = 'none';
      }
    }
  });

  document.addEventListener('mousedown', function(e) {
    if (!input.contains(e.target)) {
      const results = document.getElementById('vizSearchResults');
      if (results) results.style.display = 'none';
    }
  });
}

function vizSearchSelect(memId) {
  if (typeof NeuralViz !== 'undefined' && NeuralViz.isInitialized) {
    NeuralViz.selectNodeById(memId);
  }
  showMemoryDetail(memId, 'vizContextDetail');
  addVizActivityItem(memId);
  const results = document.getElementById('vizSearchResults');
  if (results) results.style.display = 'none';
  ['vizSearchInput', 'miniVizSearchInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function setupMiniVizSearch() {
  const input = document.getElementById('miniVizSearchInput');
  if (!input) return;
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = this.value.trim();
      if (query) {
        showMiniMemoryDetail(query);
        this.value = '';
      }
    }
  });
}

function setupVizContextSearch() {
  var input = document.getElementById('vizContextSearchInput');
  if (!input) return;
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var query = this.value.trim();
      if (query) {
        showMemoryDetail(query, 'vizContextDetail');
        addVizActivityItem(query);
        if (typeof NeuralViz !== 'undefined' && NeuralViz.isInitialized) {
          NeuralViz.selectNodeById(query);
        }
        this.value = '';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  setupVizSearch('vizSearchInput');
  setupMiniVizSearch();
  setupVizContextSearch();

  window.onNeuralNodeSelected = function(memId) {
    showMemoryDetail(memId, 'vizContextDetail');
    addVizActivityItem(memId);
  };
});
