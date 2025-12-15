/**
 * Socket.IO Drawing Handler Tests
 * Tests per SPEC FR-DRAW module requirements
 */

const {
  handleDrawStroke,
  handleDrawComplete,
  handleDrawErase,
  handleDrawUpdate,
  handleDrawClear,
  handleDrawUndo,
  handleDrawRedo,
  handleDrawReorder,
  handleCursorMove
} = require('../../socket/drawingHandlers');

// Mock dependencies
jest.mock('../../socket/roomState', () => ({
  getRoomState: jest.fn(),
  setRoomState: jest.fn(),
  hasRoomState: jest.fn()
}));

jest.mock('../../socket/autoSave', () => ({
  scheduleAutoSave: jest.fn(),
  markRoomDirty: jest.fn()
}));

jest.mock('../../libs/stroke-optimization.lib', () => ({
  processIncomingStroke: jest.fn((stroke) => stroke)
}));

const { getRoomState, setRoomState } = require('../../socket/roomState');
const { scheduleAutoSave } = require('../../socket/autoSave');

describe('Drawing Handlers (FR-DRAW)', () => {
  let mockSocket;
  let mockIo;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock socket
    mockSocket = {
      id: 'socket-123',
      roomCode: 'TESTROOM',
      user: {
        _id: 'user-123',
        id: 'user-123',
        username: 'TestUser'
      },
      isGuest: false,
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      broadcast: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      }
    };

    // Mock io
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    // Default room state
    getRoomState.mockReturnValue({
      strokes: [],
      strokesMap: new Map(),
      undoStack: new Map(),
      redoStack: new Map(),
      version: 1,
      sequence: 0
    });
  });

  describe('FR-DRAW-01: Drawing Tools', () => {
    const validTools = ['pen', 'eraser', 'line', 'rectangle', 'circle', 'triangle', 'arrow', 'diamond', 'text', 'image'];

    validTools.forEach(tool => {
      it(`should accept ${tool} tool strokes`, () => {
        const stroke = createValidStroke(tool);
        
        handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

        // Should not emit error
        expect(mockSocket.emit).not.toHaveBeenCalledWith('error', expect.anything());
      });
    });

    it('should reject invalid tool type', () => {
      const stroke = {
        id: 'stroke-1',
        tool: 'invalid-tool',
        startPoint: { x: 0, y: 0 }
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Invalid tool')
      }));
    });
  });

  describe('FR-DRAW-02: Stroke Data Structure', () => {
    it('should require stroke id', () => {
      const stroke = {
        tool: 'pen',
        startPoint: { x: 0, y: 0 }
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('stroke ID')
      }));
    });

    it('should require startPoint', () => {
      const stroke = {
        id: 'stroke-1',
        tool: 'pen'
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('startPoint')
      }));
    });

    it('should require endPoint for shape tools', () => {
      const shapeTools = ['line', 'rectangle', 'circle', 'triangle', 'arrow', 'diamond'];
      
      shapeTools.forEach(tool => {
        const stroke = {
          id: `stroke-${tool}`,
          tool,
          startPoint: { x: 0, y: 0 }
          // missing endPoint
        };

        handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

        expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
          message: expect.stringContaining('endPoint')
        }));
      });
    });

    it('should require text content for text tool', () => {
      const stroke = {
        id: 'stroke-text',
        tool: 'text',
        startPoint: { x: 100, y: 100 }
        // missing text
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Text content required')
      }));
    });

    it('should require imageData for image tool', () => {
      const stroke = {
        id: 'stroke-image',
        tool: 'image',
        startPoint: { x: 100, y: 100 }
        // missing imageData
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Image data required')
      }));
    });
  });

  describe('FR-DRAW-03: Stroke Validation', () => {
    it('should reject stroke with > 10000 points', () => {
      const tooManyPoints = Array(10001).fill({ x: 0, y: 0 });
      const stroke = {
        id: 'stroke-1',
        tool: 'pen',
        startPoint: { x: 0, y: 0 },
        points: tooManyPoints
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Too many points')
      }));
    });

    it('should reject image > 2MB', () => {
      // Create base64 string larger than 2MB (2MB * 4/3 for base64 encoding)
      const largeImageData = 'A'.repeat(3 * 1024 * 1024); // ~2.25MB decoded
      const stroke = {
        id: 'stroke-image',
        tool: 'image',
        startPoint: { x: 100, y: 100 },
        imageData: largeImageData
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Image too large')
      }));
    });

    it('should reject text > 5000 characters', () => {
      const longText = 'A'.repeat(5001);
      const stroke = {
        id: 'stroke-text',
        tool: 'text',
        startPoint: { x: 100, y: 100 },
        text: longText
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Text too long')
      }));
    });

    it('should reject strokeWidth < 1', () => {
      const stroke = {
        id: 'stroke-1',
        tool: 'pen',
        startPoint: { x: 0, y: 0 },
        strokeWidth: 0
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Invalid stroke width')
      }));
    });

    it('should reject strokeWidth > 100', () => {
      const stroke = {
        id: 'stroke-1',
        tool: 'pen',
        startPoint: { x: 0, y: 0 },
        strokeWidth: 101
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Invalid stroke width')
      }));
    });

    it('should reject fontSize < 8', () => {
      const stroke = {
        id: 'stroke-text',
        tool: 'text',
        startPoint: { x: 100, y: 100 },
        text: 'Hello',
        fontSize: 7
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Invalid font size')
      }));
    });

    it('should reject fontSize > 200', () => {
      const stroke = {
        id: 'stroke-text',
        tool: 'text',
        startPoint: { x: 100, y: 100 },
        text: 'Hello',
        fontSize: 201
      };

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Invalid font size')
      }));
    });

    it('should accept valid hex color #RGB', () => {
      const stroke = createValidStroke('pen');
      stroke.color = '#F00';

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).not.toHaveBeenCalledWith('error', expect.anything());
    });

    it('should accept valid hex color #RRGGBB', () => {
      const stroke = createValidStroke('pen');
      stroke.color = '#FF0000';

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).not.toHaveBeenCalledWith('error', expect.anything());
    });

    it('should accept valid rgba color', () => {
      const stroke = createValidStroke('pen');
      stroke.color = 'rgba(255, 0, 0, 0.5)';

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).not.toHaveBeenCalledWith('error', expect.anything());
    });

    it('should reject invalid color format', () => {
      const stroke = createValidStroke('pen');
      stroke.color = 'invalid-color';

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: false });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('Invalid color format')
      }));
    });
  });

  describe('FR-DRAW-04: Undo/Redo', () => {
    it('should undo last stroke by user', () => {
      const existingStroke = createValidStroke('pen');
      existingStroke.userId = 'user-123';
      
      getRoomState.mockReturnValue({
        strokes: [existingStroke],
        strokesMap: new Map([[existingStroke.id, existingStroke]]),
        undoStack: new Map(),
        redoStack: new Map(),
        version: 1
      });

      handleDrawUndo(mockSocket, mockIo);

      // Should emit draw:erase for the undone stroke
      expect(mockIo.to).toHaveBeenCalledWith('TESTROOM');
    });

    it('should remove stroke from strokesMap when undoing (consistency fix)', () => {
      // This test verifies fix #3: strokesMap must be updated when undoing
      const existingStroke = createValidStroke('pen');
      existingStroke.id = 'stroke-to-undo';
      existingStroke.userId = 'user-123';
      
      const strokesMap = new Map([[existingStroke.id, existingStroke]]);
      const roomState = {
        strokes: [existingStroke],
        strokesMap,
        undoStack: new Map(),
        redoStack: new Map(),
        version: 1
      };
      
      getRoomState.mockReturnValue(roomState);

      handleDrawUndo(mockSocket, mockIo);

      // After undo, strokesMap should NOT contain the undone stroke
      expect(roomState.strokesMap.has('stroke-to-undo')).toBe(false);
      // And strokes array should also not contain it
      expect(roomState.strokes.find(s => s.id === 'stroke-to-undo')).toBeUndefined();
    });

    it('should add stroke to strokesMap when redoing (consistency fix)', () => {
      // This test verifies fix #4: strokesMap must be updated when redoing
      const undoneStroke = createValidStroke('pen');
      undoneStroke.id = 'stroke-to-redo';
      undoneStroke.userId = 'user-123';
      
      const redoStack = new Map();
      redoStack.set('user-123', [undoneStroke]);
      
      const roomState = {
        strokes: [],
        strokesMap: new Map(),
        undoStack: new Map(),
        redoStack,
        version: 1
      };
      
      getRoomState.mockReturnValue(roomState);

      handleDrawRedo(mockSocket, mockIo);

      // After redo, strokesMap should contain the redone stroke
      expect(roomState.strokesMap.has('stroke-to-redo')).toBe(true);
      // And strokes array should also contain it
      expect(roomState.strokes.find(s => s.id === 'stroke-to-redo')).toBeDefined();
    });

    it('should do nothing if user has no strokes to undo', () => {
      getRoomState.mockReturnValue({
        strokes: [],
        strokesMap: new Map(),
        undoStack: new Map(),
        redoStack: new Map(),
        version: 1
      });

      handleDrawUndo(mockSocket, mockIo);

      // Should not crash, no emit
      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('should redo previously undone stroke', () => {
      const undoneStroke = createValidStroke('pen');
      undoneStroke.userId = 'user-123';
      
      const redoStack = new Map();
      redoStack.set('user-123', [undoneStroke]);
      
      getRoomState.mockReturnValue({
        strokes: [],
        strokesMap: new Map(),
        undoStack: new Map(),
        redoStack,
        version: 1
      });

      handleDrawRedo(mockSocket, mockIo);

      expect(mockIo.to).toHaveBeenCalledWith('TESTROOM');
    });

    it('should do nothing if redo stack is empty', () => {
      getRoomState.mockReturnValue({
        strokes: [],
        strokesMap: new Map(),
        undoStack: new Map(),
        redoStack: new Map(),
        version: 1
      });

      handleDrawRedo(mockSocket, mockIo);

      expect(mockIo.emit).not.toHaveBeenCalled();
    });
  });

  describe('FR-DRAW-05: Canvas Clear', () => {
    it('should broadcast draw:clear to room', () => {
      handleDrawClear(mockSocket, mockIo);

      expect(mockIo.to).toHaveBeenCalledWith('TESTROOM');
      expect(mockIo.emit).toHaveBeenCalledWith('draw:clear');
    });

    it('should not clear if socket not in room', () => {
      mockSocket.roomCode = null;

      handleDrawClear(mockSocket, mockIo);

      expect(mockIo.to).not.toHaveBeenCalled();
    });

    it('should reject guest user from clearing canvas', () => {
      // Guest users should NOT be able to clear the canvas (owner/member only action)
      mockSocket.isGuest = true;

      handleDrawClear(mockSocket, mockIo);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: 'Guests cannot clear the canvas'
      }));
      expect(mockIo.to).not.toHaveBeenCalled();
    });
  });

  describe('FR-DRAW-06: Stroke Reorder', () => {
    it('should reorder strokes and broadcast', () => {
      const stroke1 = createValidStroke('pen');
      stroke1.id = 'stroke-1';
      const stroke2 = createValidStroke('line');
      stroke2.id = 'stroke-2';

      getRoomState.mockReturnValue({
        strokes: [stroke1, stroke2],
        strokesMap: new Map([['stroke-1', stroke1], ['stroke-2', stroke2]]),
        version: 1
      });

      handleDrawReorder(mockSocket, mockIo, { strokeIds: ['stroke-2', 'stroke-1'] });

      expect(mockIo.to).toHaveBeenCalledWith('TESTROOM');
      expect(mockIo.emit).toHaveBeenCalledWith('draw:reorder', { strokeIds: ['stroke-2', 'stroke-1'] });
    });

    it('should reject invalid strokeIds', () => {
      handleDrawReorder(mockSocket, mockIo, { strokeIds: 'not-array' });

      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('should reject guest user from reordering strokes', () => {
      // Guest users should NOT be able to reorder strokes (member only action)
      mockSocket.isGuest = true;

      handleDrawReorder(mockSocket, mockIo, { strokeIds: ['stroke-1', 'stroke-2'] });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: 'Only room members can reorder strokes'
      }));
      expect(mockIo.to).not.toHaveBeenCalled();
    });
  });

  describe('FR-REALTIME-01: Cursor Move', () => {
    it('should broadcast cursor position to room', () => {
      handleCursorMove(mockSocket, { x: 100, y: 200, tool: 'pen' });

      expect(mockSocket.to).toHaveBeenCalledWith('TESTROOM');
    });

    it('should not broadcast if not in room', () => {
      mockSocket.roomCode = null;

      handleCursorMove(mockSocket, { x: 100, y: 200, tool: 'pen' });

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('FR-REALTIME-02: Live Drawing Preview', () => {
    it('should handle preview strokes with isPreview flag', () => {
      const stroke = createValidStroke('pen');

      handleDrawStroke(mockSocket, mockIo, { stroke, isPreview: true });

      // Preview strokes broadcast to OTHER users only via socket.to()
      // NOT io.to() - this is correct behavior per SPEC
      expect(mockSocket.to).toHaveBeenCalledWith('TESTROOM');
    });
  });

  describe('Draw Complete', () => {
    it('should handle stroke completion', () => {
      handleDrawComplete(mockSocket, { strokeId: 'stroke-123' });

      // draw:complete broadcasts to other users
      // Note: Auto-save is called in handleDrawStroke, not in handleDrawComplete
      expect(mockSocket.to).toHaveBeenCalledWith('TESTROOM');
    });
  });

  describe('Draw Erase', () => {
    it('should erase stroke and broadcast', () => {
      const stroke = createValidStroke('pen');
      stroke.id = 'stroke-to-erase';

      getRoomState.mockReturnValue({
        strokes: [stroke],
        strokesMap: new Map([[stroke.id, stroke]]),
        version: 1
      });

      handleDrawErase(mockSocket, mockIo, { strokeId: 'stroke-to-erase' });

      expect(mockIo.to).toHaveBeenCalledWith('TESTROOM');
      expect(mockIo.emit).toHaveBeenCalledWith('draw:erase', { strokeId: 'stroke-to-erase' });
    });

    it('should NOT broadcast erase if strokeId not found (fixed behavior)', () => {
      // FIX: Implementation now correctly checks if stroke exists before broadcasting
      // This prevents unnecessary network traffic and client-side processing
      getRoomState.mockReturnValue({
        strokes: [],
        strokesMap: new Map(),
        version: 1
      });

      handleDrawErase(mockSocket, mockIo, { strokeId: 'non-existent' });

      // Fixed behavior: does NOT broadcast if stroke doesn't exist
      expect(mockIo.to).not.toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalled();
    });
  });
});

// Helper function to create valid strokes for different tools
function createValidStroke(tool) {
  const base = {
    id: `stroke-${tool}-${Date.now()}`,
    tool,
    startPoint: { x: 100, y: 100 },
    color: '#000000',
    strokeWidth: 2
  };

  switch (tool) {
    case 'pen':
    case 'eraser':
      return { ...base, points: [{ x: 100, y: 100 }, { x: 150, y: 150 }] };
    
    case 'line':
    case 'rectangle':
    case 'circle':
    case 'triangle':
    case 'arrow':
    case 'diamond':
      return { ...base, endPoint: { x: 200, y: 200 } };
    
    case 'text':
      return { ...base, text: 'Test text', fontSize: 16, fontFamily: 'Arial' };
    
    case 'image':
      return { ...base, imageData: 'data:image/png;base64,ABC123', width: 100, height: 100 };
    
    default:
      return base;
  }
}
