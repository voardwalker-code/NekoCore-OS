// ── Brain · Image Generator ────────────────────────────────────────────────────
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

class ImageGenerator {
  // constructor()
  // WHAT THIS DOES: constructor is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call constructor(...) where this helper behavior is needed.
  constructor(options = {}) {
    this.entityId = options.entityId;
    this.config = options.config || {};
  }

  // _isEnabled()
  // WHAT THIS DOES: _isEnabled answers a yes/no rule check.
  // WHY IT EXISTS: guard checks are kept readable and reusable in one place.
  // HOW TO USE IT: call _isEnabled(...) and branch logic based on true/false.
  _isEnabled() {
    return !!(this.config && this.config.enabled);
  }

  // _buildPrompt()
  // WHAT THIS DOES: _buildPrompt creates or initializes something needed by the flow.
  // WHY IT EXISTS: setup steps are grouped here so startup behavior stays predictable.
  // HOW TO USE IT: call _buildPrompt(...) before code that depends on this setup.
  _buildPrompt(memory) {
    const summary = String(memory.semantic || memory.summary || '').trim();
    const narrative = String(memory.narrative || '').trim();
    const topics = Array.isArray(memory.topics) ? memory.topics.join(', ') : '';
    const emotion = memory.emotion || memory.emotionalTag || 'neutral';

    return [
      'Create a vivid, symbolic memory snapshot illustration.',
      summary ? `Summary: ${summary}` : '',
      narrative ? `Narrative: ${narrative.slice(0, 400)}` : '',
      topics ? `Topics: ${topics}` : '',
      `Emotion: ${emotion}`,
      'Style: cinematic digital art, high detail, coherent composition, no text overlays.'
    ].filter(Boolean).join('\n');
  }

  async _fetchImage(prompt) {
    // endpoint()
    // Purpose: helper wrapper used by this module's main flow.
    // endpoint()
    // WHAT THIS DOES: endpoint is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call endpoint(...) where this helper behavior is needed.
    const endpoint = (this.config.endpoint || '').trim();
    const apiKey = (this.config.apiKey || '').trim();
    if (!endpoint) return null;

    const payload = {
      prompt,
      model: this.config.model || undefined,
      size: this.config.size || '1024x1024'
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Image API error ${resp.status}: ${text.slice(0, 200)}`);
    }

    const data = await resp.json();

    // Supports common response shapes:
    // { data:[{ b64_json }] } or { data:[{ url }] } or { imageBase64 } or { imageUrl }
    const b64 = data?.data?.[0]?.b64_json || data?.imageBase64 || null;
    if (b64) {
      return Buffer.from(b64, 'base64');
    }

    const url = data?.data?.[0]?.url || data?.imageUrl || null;
    if (url) {
      const imgResp = await fetch(url);
      if (!imgResp.ok) throw new Error(`Image download failed: ${imgResp.status}`);
      const arr = await imgResp.arrayBuffer();
      return Buffer.from(arr);
    }

    return null;
  }

  async generateForMemory(memory) {
    try {
      if (!this._isEnabled()) return null;
      if (!this.entityId) return null;

      const memoryId = memory.id || memory.memory_id;
      if (!memoryId) return null;

      const prompt = this._buildPrompt(memory);
      const bytes = await this._fetchImage(prompt);
      if (!bytes) return null;

      const imagesDir = entityPaths.getMemoryImagesPath(this.entityId);
      const outPath = path.join(imagesDir, `${memoryId}.png`);
      fs.writeFileSync(outPath, bytes);

      return {
        imagePath: outPath,
        prompt,
        backend: this.config.backend || 'custom'
      };
    } catch (err) {
      console.warn(`  ⚠ Image generation failed: ${err.message}`);
      return null;
    }
  }
}

module.exports = ImageGenerator;
