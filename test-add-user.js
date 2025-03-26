const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

async function createTestUser() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB');

    // Create a test user
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'password123',
      phone: '555-1234',
      location: 'Boston'
    });

    // Save the user
    await testUser.save();
    console.log('Test user created successfully!');
    console.log('User details:', {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: testUser.email,
      _id: testUser._id
    });

    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

// Run the function
createTestUser(); 