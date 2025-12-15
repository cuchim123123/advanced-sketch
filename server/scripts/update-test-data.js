/**
 * Migration Script: Update Test Data to Realistic Names
 * Run with: node scripts/update-test-data.js
 */

const mongoose = require('mongoose');
const { User } = require('../src/models');
const Room = require('../src/models/room.model');
require('dotenv').config();

const usernames = ['baongo', 'ngogiabao', 'ngobao'];
const roomNames = ['draw1', 'join me', 'random room', 'quick sketch', 'team collab', 'art space', 'creative hub', 'sketch time'];

async function updateTestData() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative-sketch';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Update test users
    console.log('\n📝 Updating test users...');
    const testUsers = await User.find({ 
      $or: [
        { username: /^testuser_/ },
        { email: /@example\.com$/ },
        { email: /@test\.com$/ }
      ]
    });
    
    console.log(`Found ${testUsers.length} test users to update`);
    
    let updated = 0;
    let skipped = 0;
    
    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      const baseName = usernames[i % usernames.length];
      const timestamp = Date.now();
      const number = (timestamp + i) % 10000; // Use timestamp to ensure uniqueness
      
      const oldUsername = user.username;
      const oldEmail = user.email;
      
      const newUsername = `${baseName}${number}`;
      const newEmail = `${baseName}${number}@gmail.com`;
      
      // Check if username already exists
      const existing = await User.findOne({ username: newUsername, _id: { $ne: user._id } });
      if (existing) {
        console.log(`  ⊘ Skipped: ${oldUsername} (${newUsername} exists)`);
        skipped++;
        await new Promise(resolve => setTimeout(resolve, 10));
        continue;
      }
      
      user.username = newUsername;
      user.email = newEmail;
      await user.save();
      updated++;
      
      console.log(`  ✓ Updated: ${oldUsername} → ${user.username}`);
      
      // Small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log(`\n  Updated: ${updated}, Skipped: ${skipped}`);

    // Update test rooms
    console.log('\n📝 Updating test rooms...');
    const testRooms = await Room.find({ 
      $or: [
        { name: /test/i },
        { name: /^AAA$/ },
        { name: /^n$/ },
        { name: /^33$/ },
        { name: /đ/ }
      ]
    });
    
    console.log(`Found ${testRooms.length} test rooms to update`);
    
    for (let i = 0; i < testRooms.length; i++) {
      const room = testRooms[i];
      const oldName = room.name;
      
      room.name = roomNames[i % roomNames.length];
      await room.save();
      
      console.log(`  ✓ Updated: "${oldName}" → "${room.name}"`);
    }
    
    console.log('\n✅ Migration completed successfully!');
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Users updated: ${testUsers.length}`);
    console.log(`   Rooms updated: ${testRooms.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
updateTestData();
