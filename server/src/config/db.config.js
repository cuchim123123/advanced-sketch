const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.log('No MONGODB_URI environment variable detected in server/.env.');
      console.log('Starting in-memory MongoDB server (MongoMemoryServer) for development...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        console.log(`\n========================================`);
        console.log(`✅ In-memory MongoDB Server started at:`);
        console.log(`   ${uri}`);
        console.log(`========================================\n`);
        
        // Prevent process exit on memory server stop and save the reference
        global.__MONGO_MEMORY_SERVER__ = mongoServer;
      } catch (err) {
        console.error('❌ Failed to start MongoMemoryServer:', err);
        throw err;
      }
    }

    const conn = await mongoose.connect(uri, {
      // Mongoose 8 handles these automatically
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n❌ MongoDB Connection Error: ${error.message}`);
    console.error(`👉 Common fix: Make sure your current IP address is whitelisted in your MongoDB Atlas Network Access!`);
    console.error(`   Link to whitelist: https://cloud.mongodb.com -> Network Access -> Add IP Address.\n`);
    // Do not call process.exit(1) so nodemon remains alive and you don't have to manual-restart when IP is whitelisted!
  }
};

module.exports = connectDB;

