const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const connectDB = require('./config/db');
const User = require('./models/User');
const Ticket = require('./models/Ticket');

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use(session({
    secret: 'celtics-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // set to true if using https
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Create necessary JSON files if they don't exist
const submissionsFile = path.join(__dirname, 'submissions.json');
const usersFile = path.join(__dirname, 'users.json');
const gamesFile = path.join(__dirname, 'games.json');

[submissionsFile, usersFile, gamesFile].forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '[]');
    }
});

// Initialize games data if empty
const games = JSON.parse(fs.readFileSync(gamesFile, 'utf8'));
if (games.length === 0) {
    const defaultGames = [
        {
            id: '1',
            date: '2024-03-28',
            opponent: 'Milwaukee Bucks',
            location: 'TD Garden',
            time: '7:30 PM ET'
        },
        {
            id: '2',
            date: '2024-03-30',
            opponent: 'Philadelphia 76ers',
            location: 'TD Garden',
            time: '7:00 PM ET'
        },
        {
            id: '3',
            date: '2024-04-01',
            opponent: 'Charlotte Hornets',
            location: 'Spectrum Center',
            time: '7:00 PM ET'
        }
    ];
    fs.writeFileSync(gamesFile, JSON.stringify(defaultGames, null, 2));
}

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ message: 'Please log in to continue' });
    }
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        next();
    } catch (error) {
        console.error('Admin authorization error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Add this before the Auth routes
app.get('/api/auth/status', (req, res) => {
    if (req.session.user) {
        const user = { ...req.session.user };
        delete user.password;
        res.json({ 
            isAuthenticated: true, 
            user: user
        });
    } else {
        res.json({ 
            isAuthenticated: false, 
            user: null 
        });
    }
});

// Auth routes
app.post('/auth/register', async (req, res) => {
    try {
        console.log('Registration attempt with data:', req.body);
        
        // Check if all required fields are present
        if (!req.body || !req.body.firstName || !req.body.lastName || !req.body.email || !req.body.password) {
            console.error('Missing required fields in registration request');
            return res.status(400).json({ message: 'Missing required fields. Please fill out all required fields.' });
        }
        
        const { firstName, lastName, email, password, phone, location } = req.body;
        
        // Check if user already exists
        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                console.log('Registration failed: Email already exists', email);
                return res.status(400).json({ message: 'Email already registered. Please use a different email or login.' });
            }
        } catch (findError) {
            console.error('Error checking for existing user:', findError);
            return res.status(500).json({ message: 'Error checking user database. Please try again.' });
        }
        
        // Create new user
        const user = new User({
            firstName,
            lastName,
            email,
            password,
            phone: phone || '',
            location: location || ''
        });
        
        console.log('Attempting to save user to database');
        try {
            await user.save();
            console.log('User saved successfully:', user._id);
            
            // Set session
            req.session.user = {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isAdmin: user.isAdmin
            };
            
            return res.status(200).json({ message: 'Registration successful' });
        } catch (saveError) {
            console.error('Error saving user to database:', saveError);
            if (saveError.code === 11000) {
                return res.status(400).json({ message: 'Email already registered. Please use a different email or login.' });
            } else {
                return res.status(500).json({ message: 'Error saving to database: ' + saveError.message });
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'An error occurred during registration: ' + error.message });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Set session
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            isAdmin: user.isAdmin
        };

        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.post('/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// User profile routes
app.get('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

app.put('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
        const { firstName, lastName, phone, location } = req.body;
        const user = await User.findById(req.session.user.id);

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;
        if (location) user.location = location;

        await user.save();
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// Games routes
app.get('/api/games', (req, res) => {
    try {
        const games = JSON.parse(fs.readFileSync(gamesFile, 'utf8'));
        res.json(games);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ message: 'Error fetching games' });
    }
});

// Ticket request routes
app.post('/api/tickets', isAuthenticated, async (req, res) => {
    try {
        const { game, section, sectionType, quantity } = req.body;
        
        // Create new ticket with required fields
        const ticket = new Ticket({
            userId: req.session.user.id,
            game,
            section,
            sectionType,
            quantity
        });
        
        // Price will be calculated automatically via pre-save middleware
        await ticket.save();
        
        res.status(201).json({
            message: 'Ticket request submitted successfully',
            ticket: ticket
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ message: 'Error submitting ticket request' });
    }
});

// Get user's ticket history
app.get('/api/tickets/history', isAuthenticated, async (req, res) => {
    try {
        // Get tickets from MongoDB
        const tickets = await Ticket.find({ userId: req.session.user.id }).sort({ timestamp: -1 });
        
        // If no tickets in MongoDB, check submissions.json file
        if (tickets.length === 0) {
            try {
                const submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
                const userTickets = submissions.filter(sub => sub.userId === req.session.user.id);
                
                // If we found tickets in submissions.json, migrate them to MongoDB
                if (userTickets.length > 0) {
                    const ticketsToCreate = userTickets.map(sub => ({
                        userId: sub.userId,
                        game: sub.game,
                        section: sub.section,
                        quantity: sub.quantity,
                        status: sub.status || 'Pending',
                        timestamp: new Date(sub.timestamp),
                        lastUpdated: new Date()
                    }));
                    
                    // Create tickets in MongoDB
                    await Ticket.insertMany(ticketsToCreate);
                    
                    // Return the newly created tickets
                    return res.json(await Ticket.find({ userId: req.session.user.id }).sort({ timestamp: -1 }));
                }
                
                return res.json(userTickets);
            } catch (fileError) {
                console.error('Error reading submissions file:', fileError);
                return res.json([]);
            }
        }
        
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching ticket history:', error);
        res.status(500).json({ message: 'Error fetching ticket history' });
    }
});

// Admin routes
app.get('/api/admin/submissions', isAdmin, (req, res) => {
    try {
        const submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        
        const enrichedSubmissions = submissions.map(sub => {
            const user = users.find(u => u.id === sub.userId);
            return {
                ...sub,
                userDetails: user ? {
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    phone: user.phone,
                    location: user.location
                } : null
            };
        });

        res.json(enrichedSubmissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Error fetching submissions' });
    }
});

// Get all users (admin only)
app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ firstName: 1 });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users. Please try again.' });
    }
});

// Get single user (admin only)
app.get('/api/admin/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id, '-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }
        res.status(500).json({ error: 'Failed to fetch user. Please try again.' });
    }
});

// Update user (admin only)
app.put('/api/admin/users/:id', isAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, phone, location } = req.body;
        
        // Input validation
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'First name, last name, and email are required' });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if email is being changed and if it's already taken
        if (email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use by another user' });
            }
        }

        user.firstName = firstName;
        user.lastName = lastName;
        user.email = email;
        user.phone = phone;
        user.location = location;

        await user.save();
        res.json({ message: 'User updated successfully', user: { ...user.toObject(), password: undefined } });
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }
        res.status(500).json({ error: 'Failed to update user. Please try again.' });
    }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    try {
        // Check if trying to delete current user
        if (req.params.id === req.session.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own admin account' });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.deleteOne();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }
        res.status(500).json({ error: 'Failed to delete user. Please try again.' });
    }
});

// Create admin user
app.post('/api/admin/create', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Check if admin already exists
        const adminExists = await User.findOne({ isAdmin: true });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin user already exists' });
        }

        // Create admin user
        const admin = await User.create({
            firstName,
            lastName,
            email,
            password,
            isAdmin: true
        });

        res.status(201).json({ message: 'Admin user created successfully' });
    } catch (error) {
        console.error('Admin creation error:', error);
        res.status(500).json({ message: 'Error creating admin user' });
    }
});

// Make current user an admin (for testing purposes only, remove in production)
app.post('/api/make-admin', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isAdmin = true;
        await user.save();

        // Update session
        req.session.user.isAdmin = true;

        res.json({ message: 'You are now an admin', user: { ...user.toObject(), password: undefined } });
    } catch (error) {
        console.error('Make admin error:', error);
        res.status(500).json({ message: 'Error making user admin' });
    }
});

// Get user tickets for admin
app.get('/api/admin/tickets/:userId', async (req, res) => {
    try {
        // Check if authenticated and is admin
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const adminUser = await User.findById(req.session.user.id);
        if (!adminUser || !adminUser.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { userId } = req.params;
        
        // Find user to ensure they exist
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // First try to get tickets from Ticket model
        let tickets = await Ticket.find({ userId }).sort({ timestamp: -1 });
        
        // If no tickets in MongoDB, check the submissions.json file
        if (tickets.length === 0) {
            try {
                const submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
                const userSubmissions = submissions.filter(sub => sub.userId === userId);
                
                // If we found tickets in submissions.json, migrate them to MongoDB
                if (userSubmissions.length > 0) {
                    const ticketsToCreate = userSubmissions.map(sub => ({
                        userId: sub.userId,
                        game: sub.game,
                        section: sub.section,
                        quantity: sub.quantity,
                        status: sub.status || 'Pending',
                        timestamp: new Date(sub.timestamp),
                        lastUpdated: new Date()
                    }));
                    
                    // Create tickets in MongoDB
                    await Ticket.insertMany(ticketsToCreate);
                    
                    // Get the newly created tickets
                    tickets = await Ticket.find({ userId }).sort({ timestamp: -1 });
                }
            } catch (fileError) {
                console.error('Error reading submissions file:', fileError);
                // Continue with empty tickets array
            }
        }
        
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get specific ticket for admin
app.get('/api/admin/tickets/:userId/:ticketId', async (req, res) => {
    try {
        // Check if authenticated and is admin
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const adminUser = await User.findById(req.session.user.id);
        if (!adminUser || !adminUser.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { userId, ticketId } = req.params;
        
        // Find ticket
        const ticket = await Ticket.findOne({ _id: ticketId, userId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update ticket for admin
app.put('/api/admin/tickets/:userId/:ticketId', async (req, res) => {
    try {
        // Check if authenticated and is admin
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const adminUser = await User.findById(req.session.user.id);
        if (!adminUser || !adminUser.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { userId, ticketId } = req.params;
        const { game, section, quantity, status, adminNotes } = req.body;
        
        // Find and update ticket
        const updatedTicket = await Ticket.findOneAndUpdate(
            { _id: ticketId, userId },
            { 
                game, 
                section, 
                quantity, 
                status,
                adminNotes,
                lastUpdated: Date.now()
            },
            { new: true }
        );

        if (!updatedTicket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json(updatedTicket);
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete ticket for admin
app.delete('/api/admin/tickets/:userId/:ticketId', async (req, res) => {
    try {
        // Check if authenticated and is admin
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const adminUser = await User.findById(req.session.user.id);
        if (!adminUser || !adminUser.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { userId, ticketId } = req.params;
        
        // Find and delete ticket
        const deletedTicket = await Ticket.findOneAndDelete({ _id: ticketId, userId });
        if (!deletedTicket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update ticket for admin
app.put('/api/tickets/:id', isAdmin, async (req, res) => {
    try {
        const { game, section, sectionType, quantity, status, adminNotes } = req.body;
        const ticketId = req.params.id;
        
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        
        // Update ticket fields
        ticket.game = game || ticket.game;
        ticket.section = section || ticket.section;
        ticket.sectionType = sectionType || ticket.sectionType;
        ticket.quantity = quantity || ticket.quantity;
        ticket.status = status || ticket.status;
        ticket.adminNotes = adminNotes;
        
        // Recalculate prices if relevant fields changed
        if (sectionType || quantity) {
            const prices = ticket.calculatePrice();
            ticket.basePrice = prices.basePrice;
            ticket.totalPrice = prices.totalPrice;
        }
        
        await ticket.save();
        
        res.json({
            message: 'Ticket updated successfully',
            ticket: ticket
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ message: 'Error updating ticket' });
    }
});

// Get a single ticket by ID
app.get('/api/tickets/:id', isAuthenticated, async (req, res) => {
    try {
        const ticketId = req.params.id;
        
        // Find the ticket
        const ticket = await Ticket.findById(ticketId);
        
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        
        // Check if the user is allowed to view this ticket
        if (ticket.userId.toString() !== req.session.user.id.toString() && !req.session.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to view this ticket' });
        }
        
        res.json(ticket);
    } catch (error) {
        console.error('Error getting ticket:', error);
        res.status(500).json({ message: 'Error retrieving ticket details' });
    }
});

// Admin route to get all tickets
app.get('/api/admin/tickets', isAdmin, async (req, res) => {
    try {
        const tickets = await Ticket.find({}).sort({ timestamp: -1 });
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching all tickets:', error);
        res.status(500).json({ message: 'Error fetching tickets' });
    }
});

// Check if a user is authenticated and is an admin
app.get('/api/check-admin', (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ isAdmin: false, message: 'Not authenticated' });
        }
        
        // Check if user is an admin
        User.findById(req.session.user.id)
            .then(user => {
                if (!user) {
                    return res.status(404).json({ isAdmin: false, message: 'User not found' });
                }
                
                return res.json({
                    isAdmin: user.isAdmin === true,
                    userId: user._id.toString()
                });
            })
            .catch(error => {
                console.error('Error checking admin status:', error);
                res.status(500).json({ isAdmin: false, message: 'Server error checking admin status' });
            });
    } catch (error) {
        console.error('Exception in admin check:', error);
        res.status(500).json({ isAdmin: false, message: 'Server error' });
    }
});

// Route handlers for serving HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/getTickets', (req, res) => {
    res.sendFile(path.join(__dirname, 'getTickets.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 