const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    try {
        // Only hash the password if it's modified (or new)
        if (!this.isModified('password')) {
            return next();
        }
        
        // Generate a salt
        const salt = await bcrypt.genSalt(10);
        
        // Hash the password along with the new salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        console.error('Error hashing password:', error);
        next(error);
    }
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
    try {
        return await bcrypt.compare(enteredPassword, this.password);
    } catch (error) {
        console.error('Error comparing passwords:', error);
        throw error;
    }
};

module.exports = mongoose.model('User', userSchema); 