// ── Brain · Memory Images ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This brain module implements cognitive/runtime behavior used by
// orchestration or memory systems.
//
// WHAT USES THIS:
// Primary dependencies in this module include: fs, path, ../../entityPaths.
// Keep import and call-site contracts aligned during refactors.
//
// EXPORTS:
// No explicit CommonJS exports detected; module may be IIFE/side-effect
// based.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const entityPaths = require('../../entityPaths');

class MemoryImages {
  // constructor()
  // WHAT THIS DOES: constructor is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call constructor(...) where this helper behavior is needed.
  constructor(options = {}) {
    this.entityId = options.entityId;
    if (!this.entityId) throw new Error('MemoryImages requires entityId');

    this.imagesDir = entityPaths.getMemoryImagesPath(this.entityId);
    this.indexPath = path.join(this.imagesDir, 'index.json');
    this._index = this._loadIndex();
  }

  // _loadIndex()
  // WHAT THIS DOES: _loadIndex reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call _loadIndex(...), then use the returned value in your next step.
  _loadIndex() {
    try {
      if (!fs.existsSync(this.indexPath)) return {};
      const raw = fs.readFileSync(this.indexPath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  // _saveIndex()
  // WHAT THIS DOES: _saveIndex changes saved state or updates data.
  // WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
  // HOW TO USE IT: call _saveIndex(...) with the new values you want to persist.
  _saveIndex() {
    fs.writeFileSync(this.indexPath, JSON.stringify(this._index, null, 2), 'utf8');
  }

  // setImagePath()
  // WHAT THIS DOES: setImagePath changes saved state or updates data.
  // WHY IT EXISTS: centralizing updates prevents inconsistent writes in multiple places.
  // HOW TO USE IT: call setImagePath(...) with the new values you want to persist.
  setImagePath(memoryId, imagePath, metadata = {}) {
    if (!memoryId || !imagePath) return;
    this._index[memoryId] = {
      path: imagePath,
      prompt: metadata.prompt || '',
      backend: metadata.backend || 'unknown',
      createdAt: new Date().toISOString()
    };
    this._saveIndex();
  }

  // getImagePath()
  // WHAT THIS DOES: getImagePath reads or finds data and gives it back.
  // WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
  // HOW TO USE IT: call getImagePath(...), then use the returned value in your next step.
  getImagePath(memoryId) {
    if (!memoryId) return null;
    const rec = this._index[memoryId];
    if (!rec || !rec.path) return null;
    if (!fs.existsSync(rec.path)) return null;
    return rec.path;
  }

  getMetadata(memoryId) {
    if (!memoryId) return null;
    const rec = this._index[memoryId];
    if (!rec) return null;
    if (!rec.path || !fs.existsSync(rec.path)) return null;
    return rec;
  }

  hasImage(memoryId) {
    return !!this.getImagePath(memoryId);
  }
}

module.exports = MemoryImages;
