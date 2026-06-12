/**
 * Sketch Module Configuration (Composition Root)
 * Instantiates Sketch dependencies and wires them together
 */

// Adapters
const RedisReadyStateAdapter = require('./infrastructure/redis-ready-state.adapter');
const AutoSaveAdapter = require('./infrastructure/auto-save.adapter');
const SocketEventPublisher = require('../shared/infrastructure/socket-event-publisher.adapter');

// Application Handlers
const SyncStrokeHandler = require('./application/commands/sync-stroke.handler');
const EraseStrokeHandler = require('./application/commands/erase-stroke.handler');
const UpdateStrokeHandler = require('./application/commands/update-stroke.handler');
const UndoStrokeHandler = require('./application/commands/undo-stroke.handler');
const RedoStrokeHandler = require('./application/commands/redo-stroke.handler');
const ClearSketchHandler = require('./application/commands/clear-sketch.handler');
const ReorderStrokesHandler = require('./application/commands/reorder-strokes.handler');
const MoveCursorHandler = require('./application/commands/move-cursor.handler');

// Presentation Gateways
const SyncStrokeGateway = require('./presentation/socket/sync-stroke.gateway');
const EraseStrokeGateway = require('./presentation/socket/erase-stroke.gateway');
const UpdateStrokeGateway = require('./presentation/socket/update-stroke.gateway');
const UndoStrokeGateway = require('./presentation/socket/undo-stroke.gateway');
const RedoStrokeGateway = require('./presentation/socket/redo-stroke.gateway');
const ClearSketchGateway = require('./presentation/socket/clear-sketch.gateway');
const ReorderStrokesGateway = require('./presentation/socket/reorder-strokes.gateway');
const MoveCursorGateway = require('./presentation/socket/move-cursor.gateway');

/**
 * Bootstraps the Sketch Module and registers socket events.
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
function initializeSketchModule(io, socket) {
  // 1. Instantiate Adapters
  // In a real framework, these would be singletons injected via DI container.
  // We use a simple global singleton pattern for state/autosave.
  if (!global.__sketchStateAdapter) {
    global.__sketchStateAdapter = new RedisReadyStateAdapter();
    global.__autoSaveAdapter = new AutoSaveAdapter();
  }
  const stateAdapter = global.__sketchStateAdapter;
  const autoSaveAdapter = global.__autoSaveAdapter;
  const eventPublisher = new SocketEventPublisher(io);

  // 2. Instantiate Handlers
  const syncStrokeHandler = new SyncStrokeHandler(stateAdapter, eventPublisher, autoSaveAdapter);
  const eraseStrokeHandler = new EraseStrokeHandler(stateAdapter, eventPublisher, autoSaveAdapter);
  const updateStrokeHandler = new UpdateStrokeHandler(stateAdapter, eventPublisher, autoSaveAdapter);
  const undoStrokeHandler = new UndoStrokeHandler(stateAdapter, eventPublisher, autoSaveAdapter);
  const redoStrokeHandler = new RedoStrokeHandler(stateAdapter, eventPublisher, autoSaveAdapter);
  const clearSketchHandler = new ClearSketchHandler(stateAdapter, eventPublisher, autoSaveAdapter);
  const reorderStrokesHandler = new ReorderStrokesHandler(stateAdapter, eventPublisher, autoSaveAdapter);
  const moveCursorHandler = new MoveCursorHandler(eventPublisher);

  // 3. Instantiate Gateways
  const syncStrokeGateway = new SyncStrokeGateway(syncStrokeHandler);
  const eraseStrokeGateway = new EraseStrokeGateway(eraseStrokeHandler);
  const updateStrokeGateway = new UpdateStrokeGateway(updateStrokeHandler);
  const undoStrokeGateway = new UndoStrokeGateway(undoStrokeHandler);
  const redoStrokeGateway = new RedoStrokeGateway(redoStrokeHandler);
  const clearSketchGateway = new ClearSketchGateway(clearSketchHandler);
  const reorderStrokesGateway = new ReorderStrokesGateway(reorderStrokesHandler);
  const moveCursorGateway = new MoveCursorGateway(moveCursorHandler);

  // 4. Register Socket Events
  socket.on('draw:stroke', (payload) => syncStrokeGateway.handle(socket, payload));
  socket.on('draw:erase', (payload) => eraseStrokeGateway.handle(socket, payload));
  socket.on('draw:update', (payload) => updateStrokeGateway.handle(socket, payload));
  socket.on('draw:undo', () => undoStrokeGateway.handle(socket));
  socket.on('draw:redo', () => redoStrokeGateway.handle(socket));
  socket.on('draw:clear', () => clearSketchGateway.handle(socket));
  socket.on('draw:reorder', (payload) => reorderStrokesGateway.handle(socket, payload));
  socket.on('cursor:move', (payload) => moveCursorGateway.handle(socket, payload));
}

module.exports = {
  initializeSketchModule,
  // Expose adapters for testing or sharing with Room module if necessary
  getSketchStateAdapter: () => global.__sketchStateAdapter,
  getAutoSaveAdapter: () => global.__autoSaveAdapter
};
