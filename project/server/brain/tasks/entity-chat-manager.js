'use strict';

const crypto = require('crypto');

class EntityChatManager {
  constructor() {
    this._sessions = new Map();
  }

  _newSessionId() {
    if (typeof crypto.randomUUID === 'function') return 'echat_' + crypto.randomUUID();
    return 'echat_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  }

  createSession({ sessionType = 'planning', prompt = '', entityIds = [] } = {}) {
    const id = this._newSessionId();
    const now = Date.now();
    const session = {
      id,
      sessionType,
      prompt,
      entityIds: [...new Set((entityIds || []).filter(Boolean))],
      messages: [],
      artifacts: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      closedAt: null
    };
    this._sessions.set(id, session);
    return session;
  }

  getSession(sessionId) {
    return this._sessions.get(sessionId) || null;
  }

  addEntity(sessionId, entityId) {
    const s = this.getSession(sessionId);
    if (!s || s.status !== 'active') return null;
    if (entityId && !s.entityIds.includes(entityId)) {
      s.entityIds.push(entityId);
      s.updatedAt = Date.now();
    }
    return s;
  }

  removeEntity(sessionId, entityId) {
    const s = this.getSession(sessionId);
    if (!s || s.status !== 'active') return null;
    s.entityIds = s.entityIds.filter((id) => id !== entityId);
    s.updatedAt = Date.now();
    return s;
  }

  routeMessage(sessionId, message) {
    const s = this.getSession(sessionId);
    if (!s || s.status !== 'active') return null;

    const payload = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      content: String(message && message.content ? message.content : ''),
      from: String(message && message.from ? message.from : 'system'),
      timestamp: Date.now()
    };
    s.messages.push(payload);
    s.updatedAt = Date.now();
    return payload;
  }

  closeSession(sessionId, artifact = null) {
    const s = this.getSession(sessionId);
    if (!s) return null;
    if (artifact) {
      s.artifacts.push({
        ...artifact,
        timestamp: Date.now()
      });
    }
    s.status = 'closed';
    s.closedAt = Date.now();
    s.updatedAt = s.closedAt;
    return s;
  }

  listSessions(limit = 50) {
    return Array.from(this._sessions.values())
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .slice(0, Math.max(1, Number(limit || 50)));
  }
}

module.exports = new EntityChatManager();
