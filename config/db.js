const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Get MongoDB URI from environment variable or use local MongoDB as fallback
        const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/celtics_fan_page';
        
        console.log('Attempting to connect to MongoDB...');
        // For debugging - log URI without showing password
        const sanitizedUri = mongoURI.replace(/\/\/(.*):(.*)@/, '//\$1:****@');
        console.log(`Connection string: ${sanitizedUri}`);
        
        // Connect to MongoDB (Atlas or local)
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        console.error('Error details:', error);
        console.error('Please ensure MongoDB is running or the Atlas connection string is correct');
        // Don't exit the process for testing
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
        return null;
    }
};

module.exports = connectDB; 