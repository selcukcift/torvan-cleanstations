/**
 * Session Manager
 * Simple in-memory session storage for authentication
 */

const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up expired sessions every hour
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * Create a new session for a user
   */
  createSession(userId, userData) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.sessionTimeout;
    
    this.sessions.set(sessionId, {
      userId,
      userData,
      createdAt: Date.now(),
      expiresAt,
      lastAccessedAt: Date.now()
    });
    
    console.log(`Session created for user ${userId}: ${sessionId}`);
    return sessionId;
  }

  /**
   * Get session data by session ID
   */
  getSession(sessionId) {
    if (!sessionId) return null;
    
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      console.log(`Session expired and removed: ${sessionId}`);
      return null;
    }
    
    // Update last accessed time
    session.lastAccessedAt = Date.now();
    
    return session;
  }

  /**
   * Destroy a session
   */
  destroySession(sessionId) {
    if (this.sessions.delete(sessionId)) {
      console.log(`Session destroyed: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * Get all active sessions (for debugging)
   */
  getActiveSessions() {
    return this.sessions.size;
  }

  /**
   * Destroy all sessions for a specific user
   */
  destroyUserSessions(userId) {
    let destroyed = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        destroyed++;
      }
    }
    console.log(`Destroyed ${destroyed} sessions for user ${userId}`);
    return destroyed;
  }
}

// Export singleton instance
module.exports = new SessionManager();