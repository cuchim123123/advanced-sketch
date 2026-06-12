/**
 * Stroke Value Object
 * Encapsulates the validation and constraints of a drawing stroke.
 */
const { BadRequestError } = require('../../../../utils/errors');

const VALID_TOOLS = ['pen', 'eraser', 'line', 'rectangle', 'circle', 'triangle', 'arrow', 'diamond', 'text', 'image'];
const MAX_POINTS = 10000;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_TEXT_LENGTH = 5000;
const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 100;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 200;

class StrokeEntity {
  constructor(strokeData) {
    this.validate(strokeData);
    
    this.id = strokeData.id;
    this.tool = strokeData.tool;
    this.startPoint = strokeData.startPoint;
    
    // Optional/Tool-specific fields
    if (strokeData.points !== undefined) this.points = strokeData.points;
    if (strokeData.pointsOffset !== undefined) this.pointsOffset = strokeData.pointsOffset;
    if (strokeData.endPoint !== undefined) this.endPoint = strokeData.endPoint;
    if (strokeData.text !== undefined) this.text = strokeData.text;
    if (strokeData.fontSize !== undefined) this.fontSize = strokeData.fontSize;
    if (strokeData.imageData !== undefined) this.imageData = strokeData.imageData;
    if (strokeData.strokeWidth !== undefined) this.strokeWidth = strokeData.strokeWidth;
    if (strokeData.color !== undefined) this.color = strokeData.color;
    
    Object.freeze(this);
  }

  validate(stroke) {
    if (!stroke) throw new BadRequestError('Stroke is required');
    if (!stroke.id || typeof stroke.id !== 'string') throw new BadRequestError('Invalid stroke ID');
    if (!stroke.tool || !VALID_TOOLS.includes(stroke.tool)) throw new BadRequestError(`Invalid tool: ${stroke.tool}`);

    if (!stroke.startPoint || typeof stroke.startPoint.x !== 'number' || typeof stroke.startPoint.y !== 'number') {
      throw new BadRequestError('Invalid startPoint');
    }

    switch (stroke.tool) {
      case 'pen':
      case 'eraser':
        if (stroke.points && stroke.points.length > MAX_POINTS) {
          throw new BadRequestError(`Too many points: ${stroke.points.length} > ${MAX_POINTS}`);
        }
        break;

      case 'text':
        if (!stroke.text || typeof stroke.text !== 'string') throw new BadRequestError('Text content required for text tool');
        if (stroke.text.length > MAX_TEXT_LENGTH) throw new BadRequestError(`Text too long: ${stroke.text.length} > ${MAX_TEXT_LENGTH}`);
        if (stroke.fontSize && (stroke.fontSize < MIN_FONT_SIZE || stroke.fontSize > MAX_FONT_SIZE)) {
          throw new BadRequestError(`Invalid font size: ${stroke.fontSize}`);
        }
        break;

      case 'image':
        if (!stroke.imageData || typeof stroke.imageData !== 'string') throw new BadRequestError('Image data required for image tool');
        const imageSizeEstimate = stroke.imageData.length * 0.75;
        if (imageSizeEstimate > MAX_IMAGE_SIZE) {
          throw new BadRequestError(`Image too large: ${Math.round(imageSizeEstimate / 1024)}KB > ${MAX_IMAGE_SIZE / 1024}KB`);
        }
        break;

      case 'line':
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'arrow':
      case 'diamond':
        if (!stroke.endPoint || typeof stroke.endPoint.x !== 'number' || typeof stroke.endPoint.y !== 'number') {
          throw new BadRequestError('endPoint required for shape tools');
        }
        break;
    }

    if (stroke.strokeWidth !== undefined) {
      if (stroke.strokeWidth < MIN_STROKE_WIDTH || stroke.strokeWidth > MAX_STROKE_WIDTH) {
        throw new BadRequestError(`Invalid stroke width: ${stroke.strokeWidth}`);
      }
    }

    if (stroke.color) {
      const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(stroke.color);
      const isValidRgb = /^rgba?\([\d\s,.]+\)$/.test(stroke.color);
      if (!isValidHex && !isValidRgb) {
        throw new BadRequestError(`Invalid color format: ${stroke.color}`);
      }
    }
  }

  toJSON() {
    return { ...this };
  }
}

module.exports = StrokeEntity;
