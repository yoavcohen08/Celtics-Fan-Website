const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    game: {
        type: String,
        required: true
    },
    sectionType: {
        type: String,
        enum: ['floor', 'vip', 'lower', 'mid', 'upper', 'special'],
        required: true
    },
    section: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    priceRange: {
        type: String
    },
    basePrice: {
        type: Number
    },
    serviceFee: {
        type: Number
    },
    processingFee: {
        type: Number
    },
    totalPrice: {
        type: Number
    },
    specialRequests: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    adminNotes: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Ticket', TicketSchema); 