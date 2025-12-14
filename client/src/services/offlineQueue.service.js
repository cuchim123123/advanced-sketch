/**
 * Offline Queue Service
 * Queues socket emissions when disconnected and replays them on reconnect
 */

class OfflineQueueService {
  constructor() {
    this.queue = []
    this.maxQueueSize = 100 // Prevent memory bloat
    this.isOnline = true
  }

  /**
   * Set online status
   */
  setOnline(status) {
    this.isOnline = status
    console.log(`[offline-queue] Status: ${status ? 'online' : 'offline'}`)
  }

  /**
   * Check if we're online
   */
  getOnlineStatus() {
    return this.isOnline
  }

  /**
   * Add event to queue (only when offline)
   */
  enqueue(event, data) {
    if (this.isOnline) return false

    // Limit queue size to prevent memory issues
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('[offline-queue] Queue full, dropping oldest event')
      this.queue.shift()
    }

    this.queue.push({
      event,
      data,
      timestamp: Date.now()
    })

    console.log(`[offline-queue] Queued: ${event}, queue size: ${this.queue.length}`)
    return true
  }

  /**
   * Replay all queued events to socket
   */
  async replay(socket) {
    if (this.queue.length === 0) return

    console.log(`[offline-queue] Replaying ${this.queue.length} queued events`)

    const eventsToReplay = [...this.queue]
    this.queue = [] // Clear queue

    for (const { event, data, timestamp } of eventsToReplay) {
      // Skip events older than 5 minutes (probably stale)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        console.log(`[offline-queue] Skipping stale event: ${event}`)
        continue
      }

      try {
        socket.emit(event, data)
        // Small delay to avoid flooding server
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`[offline-queue] Failed to replay: ${event}`, error)
      }
    }

    console.log('[offline-queue] Replay complete')
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue = []
  }

  /**
   * Get queue size
   */
  size() {
    return this.queue.length
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueService()
