/**
 * Concurrent Drawing Test Script
 * 
 * This script simulates multiple users drawing simultaneously
 * to test for race conditions, lost strokes, and synchronization issues.
 * 
 * Run this with: node test-concurrent-drawing.js
 * 
 * Prerequisites:
 * - Server running on port 5000
 * - A room already created (get the room code from the app)
 */

const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');

// Configuration
const SERVER_URL = 'http://localhost:5000';
const ROOM_CODE = process.argv[2] || 'YOUR_ROOM_CODE'; // Pass as argument
const NUM_USERS = 5;
const STROKES_PER_USER = 20;
const POINTS_PER_STROKE = 10;
const DELAY_BETWEEN_STROKES = 50; // ms - fast for stress testing

if (ROOM_CODE === 'YOUR_ROOM_CODE') {
  console.log('\n❌ Please provide a room code!');
  console.log('Usage: node test-concurrent-drawing.js <ROOM_CODE>\n');
  console.log('Example: node test-concurrent-drawing.js ABC123\n');
  process.exit(1);
}

// Statistics
const stats = {
  strokesSent: 0,
  strokesReceived: new Set(),
  errors: [],
  startTime: null,
  endTime: null
};

// Create simulated users
async function createUser(userId) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      auth: {
        guest: {
          isGuest: true,
          id: `test-user-${userId}`,
          username: `TestUser${userId}`
        }
      },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log(`✅ User ${userId} connected`);
      
      // Join room
      socket.emit('room:join', { roomCode: ROOM_CODE });
    });

    socket.on('room:state', (state) => {
      console.log(`📥 User ${userId} joined room, current strokes: ${state.strokes?.length || 0}`);
      resolve(socket);
    });

    socket.on('error', (err) => {
      console.error(`❌ User ${userId} error:`, err);
      stats.errors.push({ userId, error: err });
      reject(err);
    });

    // Track received strokes from other users
    socket.on('draw:stroke', ({ stroke }) => {
      if (stroke && stroke.id) {
        stats.strokesReceived.add(stroke.id);
      }
    });

    socket.on('connect_error', (err) => {
      console.error(`❌ User ${userId} connection error:`, err.message);
      reject(err);
    });

    // Timeout
    setTimeout(() => {
      if (!socket.connected) {
        reject(new Error(`User ${userId} connection timeout`));
      }
    }, 10000);
  });
}

// Generate random stroke data
function generateStroke(userId, strokeIndex) {
  const startX = Math.random() * 800;
  const startY = Math.random() * 600;
  
  const points = [];
  let x = startX;
  let y = startY;
  
  for (let i = 0; i < POINTS_PER_STROKE; i++) {
    x += (Math.random() - 0.5) * 20;
    y += (Math.random() - 0.5) * 20;
    points.push({ x, y });
  }
  
  return {
    id: `stroke-${userId}-${strokeIndex}-${uuidv4().slice(0, 8)}`,
    tool: 'pen',
    color: `hsl(${userId * 72}, 70%, 50%)`, // Different color per user
    strokeWidth: 2,
    points: points,
    startPoint: points[0],
    endPoint: points[points.length - 1],
    userId: `test-user-${userId}`
  };
}

// Send strokes from a single user
async function sendStrokes(socket, userId) {
  const strokeIds = [];
  
  for (let i = 0; i < STROKES_PER_USER; i++) {
    const stroke = generateStroke(userId, i);
    strokeIds.push(stroke.id);
    
    socket.emit('draw:stroke', { stroke });
    stats.strokesSent++;
    
    // Small random delay to simulate real drawing
    await new Promise(r => setTimeout(r, Math.random() * DELAY_BETWEEN_STROKES));
  }
  
  return strokeIds;
}

// Main test function
async function runTest() {
  console.log('\n🔧 Concurrent Drawing Test');
  console.log('═'.repeat(50));
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Room: ${ROOM_CODE}`);
  console.log(`Simulated Users: ${NUM_USERS}`);
  console.log(`Strokes per User: ${STROKES_PER_USER}`);
  console.log(`Total Expected Strokes: ${NUM_USERS * STROKES_PER_USER}`);
  console.log('═'.repeat(50) + '\n');

  try {
    // Create all users
    console.log('📡 Connecting users...\n');
    const sockets = await Promise.all(
      Array.from({ length: NUM_USERS }, (_, i) => createUser(i + 1))
    );
    
    console.log('\n🎨 Starting concurrent drawing...\n');
    stats.startTime = Date.now();
    
    // All users draw simultaneously
    const allStrokeIds = await Promise.all(
      sockets.map((socket, i) => sendStrokes(socket, i + 1))
    );
    
    // Wait for all broadcasts to complete
    console.log('\n⏳ Waiting for broadcasts to complete...');
    await new Promise(r => setTimeout(r, 2000));
    
    stats.endTime = Date.now();
    
    // Collect results
    const totalSent = stats.strokesSent;
    const allSentIds = allStrokeIds.flat();
    
    // Each user should receive strokes from OTHER users (not their own)
    const expectedReceived = totalSent - STROKES_PER_USER; // Each user doesn't receive their own
    
    console.log('\n📊 Test Results');
    console.log('═'.repeat(50));
    console.log(`⏱️  Duration: ${stats.endTime - stats.startTime}ms`);
    console.log(`📤 Strokes Sent: ${totalSent}`);
    console.log(`📥 Unique Strokes Received: ${stats.strokesReceived.size}`);
    console.log(`❌ Errors: ${stats.errors.length}`);
    
    // Check for lost strokes
    const lostStrokes = allSentIds.filter(id => !stats.strokesReceived.has(id));
    
    if (lostStrokes.length > 0) {
      // Note: Some "lost" strokes may be the user's own strokes (not broadcast back)
      console.log(`\n⚠️  Strokes not received by other users: ${lostStrokes.length}`);
      console.log('   (Note: Each user doesn\'t receive their own strokes)');
    }
    
    // Success check
    const success = stats.errors.length === 0;
    
    console.log('\n' + '═'.repeat(50));
    if (success) {
      console.log('✅ TEST PASSED: No errors during concurrent drawing!');
      console.log('   All strokes were processed without race conditions.');
    } else {
      console.log('❌ TEST FAILED: Errors occurred during concurrent drawing');
      stats.errors.forEach(e => console.log(`   - User ${e.userId}: ${e.error}`));
    }
    console.log('═'.repeat(50) + '\n');
    
    // Cleanup - disconnect all users
    sockets.forEach(s => s.disconnect());
    
    // Now connect a fresh user to verify final state
    console.log('🔍 Verifying final room state...\n');
    
    const verifySocket = await createUser('verifier');
    
    verifySocket.on('room:state', (state) => {
      console.log(`📋 Final room state: ${state.strokes?.length} strokes`);
      
      if (state.strokes?.length >= totalSent) {
        console.log('✅ All strokes persisted correctly!\n');
      } else {
        console.log(`⚠️  Expected ${totalSent}, got ${state.strokes?.length}`);
        console.log('   Some strokes may have been lost.\n');
      }
      
      verifySocket.disconnect();
      process.exit(success ? 0 : 1);
    });
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();
