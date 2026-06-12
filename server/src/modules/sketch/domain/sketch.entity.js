/**
 * Sketch Entity
 * Aggregate Root for the collaborative drawing session.
 */
class SketchEntity {
  constructor(roomId, initialState = {}) {
    this.roomId = roomId;
    this.version = initialState.version || 0;
    this.sequenceCounter = initialState.sequenceCounter || 0;
    
    // Core state
    this.strokes = initialState.strokes || [];
    this.strokesMap = new Map(this.strokes.map(s => [s.id, s]));
    
    // User-specific redo stacks: Map<userId, Stroke[]>
    this.redoStack = initialState.redoStack || new Map();
  }

  /**
   * Adds or updates a stroke using Last-Write-Wins (LWW) sequence resolution.
   */
  addStroke(strokeEntity, userId) {
    this.sequenceCounter++;
    
    const stroke = {
      ...strokeEntity.toJSON(),
      userId: userId,
      timestamp: new Date(),
      sequence: this.sequenceCounter
    };

    // Clear user's redo stack on new action
    this.clearRedoStack(userId);

    const existingStroke = this.strokesMap.get(stroke.id);
    if (existingStroke) {
      // Conflict Resolution: Only update if sequence is higher (or if it has no sequence)
      if (!existingStroke.sequence || stroke.sequence > existingStroke.sequence) {
        this.strokesMap.set(stroke.id, stroke);
        const idx = this.strokes.findIndex(s => s.id === stroke.id);
        if (idx >= 0) this.strokes[idx] = stroke;
      }
    } else {
      this.strokesMap.set(stroke.id, stroke);
      this.strokes.push(stroke);
    }

    return stroke;
  }

  /**
   * Removes a stroke by ID.
   * Returns true if deleted, false if not found.
   */
  eraseStroke(strokeId) {
    if (!this.strokesMap.has(strokeId)) return false;

    this.strokesMap.delete(strokeId);
    this.strokes = this.strokes.filter(s => s.id !== strokeId);
    return true;
  }

  /**
   * Updates an existing stroke using LWW resolution.
   * Returns the updated stroke or null if not found.
   */
  updateStroke(strokeEntity) {
    const existingStroke = this.strokesMap.get(strokeEntity.id);
    if (!existingStroke) {
      // If updating a non-existent stroke, some clients might have lag. 
      // We accept it but mark it with new sequence.
      this.sequenceCounter++;
      const newStroke = {
        ...strokeEntity.toJSON(),
        timestamp: new Date(),
        sequence: this.sequenceCounter
      };
      this.strokesMap.set(newStroke.id, newStroke);
      this.strokes.push(newStroke);
      return newStroke;
    }

    this.sequenceCounter++;
    const updatedStroke = {
      ...existingStroke,
      ...strokeEntity.toJSON(),
      timestamp: new Date(),
      sequence: this.sequenceCounter
    };

    this.strokesMap.set(updatedStroke.id, updatedStroke);
    const existingIndex = this.strokes.findIndex(s => s.id === updatedStroke.id);
    if (existingIndex >= 0) {
      this.strokes[existingIndex] = updatedStroke;
    }
    
    return updatedStroke;
  }

  /**
   * Undoes the last stroke for a specific user.
   * Returns the stroke that was undone, or null if nothing to undo.
   */
  undo(userId) {
    const userStrokes = this.strokes.filter(
      s => (s.userId?.toString() || s.userId) === userId
    );

    if (userStrokes.length === 0) return null;

    const lastStroke = userStrokes[userStrokes.length - 1];
    
    if (!this.redoStack.has(userId)) {
      this.redoStack.set(userId, []);
    }
    this.redoStack.get(userId).push(lastStroke);
    
    this.eraseStroke(lastStroke.id);
    return lastStroke;
  }

  /**
   * Redoes the last undone stroke for a specific user.
   * Returns the redone stroke, or null if nothing to redo.
   */
  redo(userId) {
    const userRedoStack = this.redoStack.get(userId);
    if (!userRedoStack || userRedoStack.length === 0) return null;

    const strokeToRedo = userRedoStack.pop();
    this.strokes.push(strokeToRedo);
    this.strokesMap.set(strokeToRedo.id, strokeToRedo);
    
    return strokeToRedo;
  }

  /**
   * Clears all strokes.
   */
  clear() {
    this.strokes = [];
    this.strokesMap.clear();
  }

  /**
   * Reorders strokes based on a provided array of IDs.
   */
  reorder(strokeIds) {
    if (!strokeIds || !Array.isArray(strokeIds)) return;

    const reorderedStrokes = strokeIds
      .map(id => this.strokesMap.get(id))
      .filter(Boolean);
    
    this.strokes = reorderedStrokes;
    this.strokesMap = new Map(reorderedStrokes.map(s => [s.id, s]));
  }

  clearRedoStack(userId) {
    if (this.redoStack.has(userId)) {
      this.redoStack.set(userId, []);
    }
  }

  toJSON() {
    return {
      roomId: this.roomId,
      version: this.version,
      sequenceCounter: this.sequenceCounter,
      strokes: this.strokes,
      redoStack: this.redoStack
    };
  }
}

module.exports = SketchEntity;
