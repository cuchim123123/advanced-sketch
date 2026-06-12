/**
 * Redis-Ready State Adapter
 * Implements ISketchStatePort
 * 
 * Provides an asynchronous interface for Sketch state management.
 * Currently backed by an in-memory Map, but designed to be trivially
 * swappable with `ioredis` for a distributed microservice architecture.
 */
const SketchEntity = require('../domain/sketch.entity');

class RedisReadyStateAdapter {
  constructor() {
    // In-memory fallback: Map<roomCode, object>
    this.store = new Map();
  }

  /**
   * Retrieves the sketch state for a room.
   * @param {string} roomId 
   * @returns {Promise<SketchEntity|null>}
   */
  async getSketch(roomId) {
    const rawData = this.store.get(roomId);
    if (!rawData) return null;
    return new SketchEntity(roomId, rawData);
  }

  /**
   * Saves the entire sketch state back to the store.
   * @param {SketchEntity} sketch 
   */
  async saveSketch(sketch) {
    this.store.set(sketch.roomId, sketch.toJSON());
  }

  /**
   * Checks if a sketch exists in the store.
   * @param {string} roomId 
   * @returns {Promise<boolean>}
   */
  async hasSketch(roomId) {
    return this.store.has(roomId);
  }

  /**
   * Deletes a sketch from the store.
   * @param {string} roomId 
   */
  async deleteSketch(roomId) {
    this.store.delete(roomId);
  }

  // --- Lock Mechanisms (Simulating Distributed Locks) ---

  /**
   * Tries to acquire an initialization lock for a room.
   * @param {string} roomId 
   * @returns {Promise<boolean>} True if lock acquired, false if already locked.
   */
  async acquireInitLock(roomId) {
    const lockKey = `lock:init:${roomId}`;
    if (this.store.has(lockKey)) return false;
    
    this.store.set(lockKey, true);
    return true;
  }

  /**
   * Releases an initialization lock.
   * @param {string} roomId 
   */
  async releaseInitLock(roomId) {
    const lockKey = `lock:init:${roomId}`;
    this.store.delete(lockKey);
  }

  /**
   * Checks if a room is currently being initialized.
   * @param {string} roomId 
   * @returns {Promise<boolean>}
   */
  async isInitializing(roomId) {
    return this.store.has(`lock:init:${roomId}`);
  }
  
  /**
   * Wait for room to be ready
   */
  async waitForRoomReady(roomId) {
    return new Promise(resolve => {
      const check = async () => {
        const isLocked = await this.isInitializing(roomId);
        if (!isLocked) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}

module.exports = RedisReadyStateAdapter;
