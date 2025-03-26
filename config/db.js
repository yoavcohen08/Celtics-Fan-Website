const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Try an alternative connection string
        const conn = await mongoose.connect('mongodb://127.0.0.1:27017/celtics_fan_page');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        console.error('Please make sure MongoDB is running on your system');
        process.exit(1);
    }
};

module.exports = connectDB; 