require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await mongoose.connection.db.collection('users').updateOne(
    { email: 'ngbao2485@gmail.com' },
    { $set: { isEmailVerified: true } }
  );
  console.log('Updated:', result.modifiedCount, 'user(s)');
  mongoose.disconnect();
});
