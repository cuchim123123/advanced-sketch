/**
 * Room Module Configuration (Composition Root)
 */
const RoomRepository = require('./infrastructure/room.repository');
const ParticipantRepository = require('./infrastructure/participant.repository');
const SocketEventPublisher = require('../shared/infrastructure/socket-event-publisher.adapter');
const { getSketchStateAdapter, getAutoSaveAdapter } = require('../sketch/sketch.module');

// Application Handlers
const JoinRoomHandler = require('./application/commands/join-room.handler');
const KickUserHandler = require('./application/commands/kick-user.handler');
const DisconnectHandler = require('./application/commands/disconnect.handler');
const ChatSendHandler = require('./application/commands/chat-send.handler');
const CreateSnapshotHandler = require('./application/commands/create-snapshot.handler');
const RestoreSnapshotHandler = require('./application/commands/restore-snapshot.handler');

// Gateways
const JoinRoomGateway = require('./presentation/socket/join-room.gateway');
const KickUserGateway = require('./presentation/socket/kick-user.gateway');
const DisconnectGateway = require('./presentation/socket/disconnect.gateway');
const ChatSendGateway = require('./presentation/socket/chat-send.gateway');
const CreateSnapshotGateway = require('./presentation/socket/create-snapshot.gateway');
const RestoreSnapshotGateway = require('./presentation/socket/restore-snapshot.gateway');

/**
 * Bootstraps the Room Module and registers socket events.
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
function initializeRoomModule(io, socket) {
  // 1. Adapters
  const roomRepo = new RoomRepository();
  const participantRepo = new ParticipantRepository();
  const eventPublisher = new SocketEventPublisher(io);
  const stateAdapter = getSketchStateAdapter(); // From sketch module
  const autoSaveAdapter = getAutoSaveAdapter(); // From sketch module

  // 2. Handlers
  const joinRoomHandler = new JoinRoomHandler(roomRepo, participantRepo, stateAdapter, eventPublisher);
  const kickUserHandler = new KickUserHandler(roomRepo, participantRepo, eventPublisher);
  const disconnectHandler = new DisconnectHandler(roomRepo, participantRepo, stateAdapter, eventPublisher, autoSaveAdapter);
  const chatSendHandler = new ChatSendHandler(eventPublisher);
  const createSnapshotHandler = new CreateSnapshotHandler(roomRepo, stateAdapter, eventPublisher);
  const restoreSnapshotHandler = new RestoreSnapshotHandler(roomRepo, stateAdapter, eventPublisher);

  // 3. Gateways
  const joinRoomGateway = new JoinRoomGateway(joinRoomHandler);
  const kickUserGateway = new KickUserGateway(kickUserHandler, io);
  const disconnectGateway = new DisconnectGateway(disconnectHandler);
  const chatSendGateway = new ChatSendGateway(chatSendHandler);
  const createSnapshotGateway = new CreateSnapshotGateway(createSnapshotHandler);
  const restoreSnapshotGateway = new RestoreSnapshotGateway(restoreSnapshotHandler);

  // 4. Register Events
  socket.on('room:join', (payload) => joinRoomGateway.handle(socket, payload));
  socket.on('user:kick', (payload) => kickUserGateway.handle(socket, payload));
  socket.on('chat:send', (payload) => chatSendGateway.handle(socket, payload));
  socket.on('room:createSnapshot', (payload) => createSnapshotGateway.handle(socket, payload));
  socket.on('room:restore', (payload) => restoreSnapshotGateway.handle(socket, payload));

  // Expose disconnect handler to be explicitly called by the global disconnect event
  socket.on('disconnect', () => disconnectGateway.handle(socket));
}

module.exports = {
  initializeRoomModule
};
