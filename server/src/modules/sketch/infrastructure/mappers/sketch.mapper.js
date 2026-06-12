/**
 * Sketch Mapper
 * Anti-Corruption Layer translating raw JSON from Redis/Mongo into Sketch Entities.
 */
const SketchEntity = require('../../domain/sketch.entity');
const StrokeEntity = require('../../domain/stroke.entity');

class SketchMapper {
  /**
   * Maps raw data to a SketchEntity.
   * Ensures all inner strokes are instantiated as proper StrokeEntities.
   * 
   * @param {string} roomId 
   * @param {Object} rawData 
   * @returns {SketchEntity}
   */
  static toDomain(roomId, rawData) {
    if (!rawData) return new SketchEntity(roomId);

    // Hydrate strokes
    const strokes = (rawData.strokes || []).map(strokeData => {
      return new StrokeEntity(strokeData);
    });

    return new SketchEntity(roomId, {
      ...rawData,
      strokes
    });
  }
}

module.exports = SketchMapper;
