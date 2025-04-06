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
            basePrice = 750;
            break;
        case 'VIP':
            basePrice = 600;
            break;
        case 'Lower':
            basePrice = 350;
            break;
        case 'Mid':
            basePrice = 225;
            break;
        case 'Upper':
            basePrice = 120;
            break;
        case 'Special':
            basePrice = 500;
            break;
        default:
            basePrice = 100;
    }
    
    // Add price variations for premium sections
    if (['FL20', 'FL21'].includes(this.section)) basePrice += 100;
    if (['VIP12'].includes(this.section)) basePrice += 75;
    if (['12', '21'].includes(this.section)) basePrice += 50;
    if (['Garden Deck', 'Executive Suites'].includes(this.section)) basePrice += 150;
    
    // Apply quantity discount
    let quantityMultiplier = 1;
    if (this.quantity >= 5) {
        quantityMultiplier = 0.9; // 10% discount for 5 or more tickets
    } else if (this.quantity >= 3) {
        quantityMultiplier = 0.95; // 5% discount for 3-4 tickets
    }
    
    const serviceFee = basePrice * 0.15;
    const processingFee = 5;
    
    const baseTotal = basePrice * this.quantity;
    const serviceFeeTotal = serviceFee * this.quantity;
    const processingFeeTotal = processingFee * this.quantity;
    const totalBeforeDiscount = baseTotal + serviceFeeTotal + processingFeeTotal;
    
    this.basePrice = basePrice;
    this.serviceFee = serviceFee;
    this.processingFee = processingFee;
    this.totalPrice = parseFloat((totalBeforeDiscount * quantityMultiplier).toFixed(2));
    
    return {
        basePrice: this.basePrice,
        serviceFee: this.serviceFee,
        processingFee: this.processingFee,
        totalPrice: this.totalPrice
    };
};

// Add a pre-save middleware to calculate prices ONLY for new tickets
TicketSchema.pre('save', function(next) {
    // Only calculate prices if this is a new ticket (not an update)
    if (this.isNew && (!this.basePrice || !this.totalPrice)) {
        const prices = this.calculatePrice();
        this.basePrice = prices.basePrice;
        this.totalPrice = prices.totalPrice;
    }
    next();
});

module.exports = mongoose.model('Ticket', TicketSchema); 