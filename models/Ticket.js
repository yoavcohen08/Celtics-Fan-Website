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
    section: {
        type: String,
        required: true
    },
    sectionType: {
        type: String,
        required: true,
        enum: ['Floor', 'VIP', 'Lower', 'Mid', 'Upper', 'Special']
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    basePrice: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    adminNotes: {
        type: String
    },
    serviceFee: {
        type: Number
    },
    processingFee: {
        type: Number
    },
    specialRequests: {
        type: String
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Add a method to calculate price based on section type and quantity
TicketSchema.methods.calculatePrice = function() {
    let basePrice;
    
    // Base price by section type
    switch(this.sectionType) {
        case 'Floor':
            basePrice = 500;
            break;
        case 'VIP':
            basePrice = 300;
            break;
        case 'Lower':
            basePrice = 200;
            break;
        case 'Mid':
            basePrice = 150;
            break;
        case 'Upper':
            basePrice = 100;
            break;
        case 'Special':
            basePrice = 250;
            break;
        default:
            basePrice = 100;
    }
    
    // Apply quantity discount
    let quantityMultiplier = 1;
    if (this.quantity >= 5) {
        quantityMultiplier = 0.9; // 10% discount for 5 or more tickets
    } else if (this.quantity >= 3) {
        quantityMultiplier = 0.95; // 5% discount for 3-4 tickets
    }
    
    this.basePrice = basePrice;
    this.totalPrice = (basePrice * this.quantity * quantityMultiplier).toFixed(2);
    
    return {
        basePrice: this.basePrice,
        totalPrice: this.totalPrice
    };
};

// Add a pre-save middleware to calculate prices
TicketSchema.pre('save', function(next) {
    if (!this.basePrice || !this.totalPrice) {
        const prices = this.calculatePrice();
        this.basePrice = prices.basePrice;
        this.totalPrice = prices.totalPrice;
    }
    next();
});

module.exports = mongoose.model('Ticket', TicketSchema); 