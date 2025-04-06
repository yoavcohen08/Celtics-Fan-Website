// Load environment variables
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const connectDB = require('./config/db');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const fetch = require('node-fetch');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'celtics_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Create necessary JSON files if they don't exist
const submissionsFile = path.join(__dirname, '../data/submissions.json');
const usersFile = path.join(__dirname, '../data/users.json');
const gamesFile = path.join(__dirname, '../data/games.json');

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
        console.log('Login attempt with email:', req.body.email);
        const { email, password } = req.body;

        // Find user
        console.log('Searching for user in database...');
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found with email:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        console.log('User found:', user._id);

        // Check password
        console.log('Verifying password...');
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            console.log('Password verification failed for user:', user._id);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        console.log('Password verified successfully');

        // Set session
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            isAdmin: user.isAdmin
        };
        console.log('Session created for user:', user._id);

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
        if (!user) {
            // Although isAuthenticated should prevent this, handle it just in case
            return res.status(404).json({ message: 'User not found' });
        }
        // Ensure the response includes isAuthenticated
        const userProfile = user.toObject(); // Convert Mongoose doc to plain object
        res.json({ ...userProfile, isAuthenticated: true });
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

// Use the WORKING API key found in schedule/standings
const NBA_API_KEY = 'd0b0505031msh7b0c1ca8afc775dp1696a9jsn1bc13e5477df';
const NBA_API_HOST = 'api-nba-v1.p.rapidapi.com';

// Function to make API calls (already uses the constants above)
async function callNbaApi(endpoint, queryParams = {}) {
    let url = `https://${NBA_API_HOST}/${endpoint}`;
    if (Object.keys(queryParams).length > 0) {
        url += `?${new URLSearchParams(queryParams).toString()}`;
    }
    
    console.log(`[API] Calling NBA API: ${url}`)
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': NBA_API_KEY,
                'X-RapidAPI-Host': NBA_API_HOST
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API] Error fetching from RapidAPI NBA (${response.status}): ${errorText}`);
            throw new Error(`API call failed with status ${response.status}`);
        }
        
        console.log("[API] Successfully fetched data from RapidAPI NBA");
        return await response.json();
    } catch (error) {
        console.error(`[API] Error during fetch to RapidAPI NBA: ${error.message}`);
        throw error; // Re-throw the error to be handled by the calling function
    }
}

// Endpoint to get roster and player stats
app.get('/api/roster', async (req, res) => {
    // Expect playerIds (comma-separated) and season
    const { season, playerIds } = req.query; 
    console.log(`[API] Roster endpoint called. Season: ${season}, PlayerIds: ${playerIds}`);

    // Validate params
    if (!season || !playerIds) {
        return res.status(400).json({ error: 'Season and PlayerIds parameters are required' });
    }
    
    const requestedPlayerIds = playerIds.split(',').map(id => id.trim()).filter(id => id); // Ensure no empty IDs
    if (requestedPlayerIds.length === 0) {
         return res.status(400).json({ error: 'PlayerIds parameter cannot be empty' });
    }
    
    console.log(`[API] Processing ${requestedPlayerIds.length} requested player IDs:`, requestedPlayerIds);

    try {
        // Fetch player info and statistics concurrently for each requested ID
        const playerPromises = requestedPlayerIds.map(playerId => {
            // Fetch both player info and stats in parallel for this ID
            const playerInfoPromise = axios.get(`https://api-nba-v1.p.rapidapi.com/players?id=${playerId}`, {
                headers: {
                    'X-RapidAPI-Key': NBA_API_KEY,
                    'X-RapidAPI-Host': NBA_API_HOST
                }
            });

            // Use the requested season parameter (2024 for 2024-2025 season)
            console.log(`[API] Fetching stats for player ${playerId} for season ${season}`);
            const playerStatsPromise = axios.get(`https://api-nba-v1.p.rapidapi.com/players/statistics?id=${playerId}&season=${season}`, {
                headers: {
                    'X-RapidAPI-Key': NBA_API_KEY,
                    'X-RapidAPI-Host': NBA_API_HOST
                }
            });

            // Resolve when both calls are done for this player
            return Promise.all([playerInfoPromise, playerStatsPromise])
                .then(([infoResponse, statsResponse]) => ({
                    playerId: playerId,
                    playerData: infoResponse.data.response[0] || { id: playerId, error: 'Info not found' }, // Player Info
                    statsData: statsResponse.data // Full Stats Response Object
                }))
                .catch(error => {
                    console.error(`[API] Error fetching data for player ID ${playerId}:`, error.message);
                    // Return error structure for this player
                    return {
                        playerId: playerId,
                        playerData: { id: playerId, error: 'Info fetch failed' },
                        statsData: { response: [], error: `Failed to fetch data: ${error.message}` }
                    };
                });
        });

        // Wait for all player data requests to complete
        const results = await Promise.all(playerPromises);
        console.log(`[API] Finished fetching data for ${results.length} players.`);

        // Combine into the desired format
        const playersData = results.map(result => {
            return {
                player: result.playerData,
                statistics: {
                    response: (result.statsData && Array.isArray(result.statsData.response))
                                ? result.statsData.response 
                                : [],
                    error: result.statsData.error || null 
                }
            };
        });

        console.log(`[API] Returning combined data for ${playersData.length} players.`);
        res.json(playersData);

    } catch (error) {
        // Handle unexpected errors during the process
        console.error('[API] Roster endpoint unexpected error:', error.message);
        res.status(500).json({ error: 'Failed to process roster request' });
    }
});

// Schedule API endpoint - NOW USING callNbaApi
app.get('/api/schedule', async (req, res) => {
    const { season, team } = req.query;
    const currentSeason = season || '2024';
    const teamId = team || '2'; // Default to Celtics (ID 2)
    console.log(`[API] Schedule endpoint called for team: ${teamId}, season: ${currentSeason}`);
    
    try {
        // Add CORS headers
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        // Try to fetch from RapidAPI using the shared function
        try {
            const apiData = await callNbaApi('games', { season: currentSeason, team: teamId });
            
            if (apiData && apiData.response && Array.isArray(apiData.response)) {
                console.log(`[API] Found ${apiData.response.length} games from RapidAPI for team ${teamId}`);
                res.json(apiData.response);
                return;
            } else {
                console.warn('[API] RapidAPI schedule response missing expected format:', apiData);
            }
        } catch (apiError) {
            console.error('[API] Error fetching schedule from RapidAPI:', apiError);
        }
        
        // Fallback to local data if API fails
        console.log('[API] Falling back to local games.json data for schedule');
        const gamesData = JSON.parse(fs.readFileSync(gamesFile, 'utf8'));
        console.log('[API] Games data loaded from file:', JSON.stringify(gamesData));
        
        // Transform the data to the format expected by schedule.js
        const scheduledGames = gamesData.map(game => {
            // Create a date object from the date and time
            const [year, month, day] = game.date.split('-').map(num => parseInt(num));
            const [time, period] = game.time.split(' ');
            const [hour, minute] = time.split(':').map(num => parseInt(num));
            
            // Adjust hour for PM
            let adjustedHour = hour;
            if (period === 'PM' && hour < 12) {
                adjustedHour += 12;
            } else if (period === 'AM' && hour === 12) {
                adjustedHour = 0;
            }
            
            // Create ISO date string
            const gameDate = new Date(year, month - 1, day, adjustedHour, minute);
            
            return {
                id: game.id,
                date: {
                    start: gameDate.toISOString()
                },
                teams: {
                    home: {
                        id: game.location.includes('TD Garden') ? '2' : getOpponentTeamId(game.opponent),
                        name: game.location.includes('TD Garden') ? 'Boston Celtics' : game.opponent
                    },
                    visitors: {
                        id: game.location.includes('TD Garden') ? getOpponentTeamId(game.opponent) : '2',
                        name: game.location.includes('TD Garden') ? game.opponent : 'Boston Celtics'
                    }
                },
                scores: {
                    home: { points: null },
                    visitors: { points: null }
                },
                status: {
                    long: 'Scheduled'
                },
                arena: {
                    name: game.location
                }
            };
        });
        
        console.log('[API] Transformed local games data:', JSON.stringify(scheduledGames));
        res.json(scheduledGames);

    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: 'Failed to load schedule data' });
    }
});

// Standings API endpoint - NOW USING callNbaApi
app.get('/api/standings', async (req, res) => {
    const { league, season } = req.query;
    const currentLeague = league || 'standard';
    const currentSeason = season || '2024';
    console.log(`[API] Standings endpoint called for league: ${currentLeague}, season: ${currentSeason}`);

    try {
        // Add CORS headers
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        // Try to fetch from RapidAPI using the shared function
        try {
            const apiData = await callNbaApi('standings', { league: currentLeague, season: currentSeason });

            if (apiData && apiData.response && Array.isArray(apiData.response)) {
                console.log('[API] Successfully fetched standings from RapidAPI NBA');
                res.json(apiData.response);
                return;
            } else {
                console.warn('[API] RapidAPI standings response missing expected format:', apiData);
            }
        } catch (apiError) {
            console.error('[API] Error fetching standings from RapidAPI:', apiError);
        }
        
        // If API fails, return mock data
        console.log('[API] Falling back to mock standings data');
        const mockStandings = generateMockStandings(); 
        res.json(mockStandings);
        
    } catch (error) {
        console.error('Error in standings endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch standings data' });
    }
});

// Helper function to generate mock standings data if API fails
function generateMockStandings() {
    const teams = [
        { id: 2, name: "Boston Celtics", nickname: "Celtics", code: "BOS", conference: "East", division: "Atlantic" },
        { id: 20, name: "Miami Heat", nickname: "Heat", code: "MIA", conference: "East", division: "Southeast" },
        { id: 24, name: "New York Knicks", nickname: "Knicks", code: "NYK", conference: "East", division: "Atlantic" },
        { id: 27, name: "Philadelphia 76ers", nickname: "76ers", code: "PHI", conference: "East", division: "Atlantic" },
        { id: 4, name: "Brooklyn Nets", nickname: "Nets", code: "BKN", conference: "East", division: "Atlantic" },
        { id: 21, name: "Milwaukee Bucks", nickname: "Bucks", code: "MIL", conference: "East", division: "Central" },
        { id: 7, name: "Cleveland Cavaliers", nickname: "Cavaliers", code: "CLE", conference: "East", division: "Central" },
        { id: 26, name: "Orlando Magic", nickname: "Magic", code: "ORL", conference: "East", division: "Southeast" },
        { id: 15, name: "Indiana Pacers", nickname: "Pacers", code: "IND", conference: "East", division: "Central" },
        { id: 1, name: "Atlanta Hawks", nickname: "Hawks", code: "ATL", conference: "East", division: "Southeast" },
        { id: 6, name: "Chicago Bulls", nickname: "Bulls", code: "CHI", conference: "East", division: "Central" },
        { id: 38, name: "Toronto Raptors", nickname: "Raptors", code: "TOR", conference: "East", division: "Atlantic" },
        { id: 5, name: "Charlotte Hornets", nickname: "Hornets", code: "CHA", conference: "East", division: "Southeast" },
        { id: 41, name: "Washington Wizards", nickname: "Wizards", code: "WAS", conference: "East", division: "Southeast" },
        { id: 10, name: "Detroit Pistons", nickname: "Pistons", code: "DET", conference: "East", division: "Central" },
        { id: 14, name: "Houston Rockets", nickname: "Rockets", code: "HOU", conference: "West", division: "Southwest" },
        { id: 9, name: "Denver Nuggets", nickname: "Nuggets", code: "DEN", conference: "West", division: "Northwest" },
        { id: 16, name: "LA Clippers", nickname: "Clippers", code: "LAC", conference: "West", division: "Pacific" },
        { id: 28, name: "Phoenix Suns", nickname: "Suns", code: "PHX", conference: "West", division: "Pacific" },
        { id: 17, name: "Los Angeles Lakers", nickname: "Lakers", code: "LAL", conference: "West", division: "Pacific" },
        { id: 8, name: "Dallas Mavericks", nickname: "Mavericks", code: "DAL", conference: "West", division: "Southwest" },
        { id: 40, name: "Utah Jazz", nickname: "Jazz", code: "UTA", conference: "West", division: "Northwest" },
        { id: 25, name: "Oklahoma City Thunder", nickname: "Thunder", code: "OKC", conference: "West", division: "Northwest" },
        { id: 22, name: "Minnesota Timberwolves", nickname: "Timberwolves", code: "MIN", conference: "West", division: "Northwest" },
        { id: 19, name: "Memphis Grizzlies", nickname: "Grizzlies", code: "MEM", conference: "West", division: "Southwest" },
        { id: 30, name: "Sacramento Kings", nickname: "Kings", code: "SAC", conference: "West", division: "Pacific" },
        { id: 11, name: "Golden State Warriors", nickname: "Warriors", code: "GSW", conference: "West", division: "Pacific" },
        { id: 23, name: "New Orleans Pelicans", nickname: "Pelicans", code: "NOP", conference: "West", division: "Southwest" },
        { id: 29, name: "Portland Trail Blazers", nickname: "Trail Blazers", code: "POR", conference: "West", division: "Northwest" },
        { id: 31, name: "San Antonio Spurs", nickname: "Spurs", code: "SAS", conference: "West", division: "Southwest" }
    ];
    
    return teams.map((team, index) => {
        // Generate random stats appropriate for team's strength
        const isEastern = team.conference === "East";
        const rank = isEastern ? 
            [2, 20, 24, 27, 4, 21, 7, 26, 15, 1, 6, 38, 5, 41, 10].indexOf(team.id) + 1 : 
            [14, 9, 16, 28, 17, 8, 40, 25, 22, 19, 30, 11, 23, 29, 31].indexOf(team.id) + 1;
        
        // Better teams have higher win percentage
        const winPct = Math.max(0.1, Math.min(0.9, 1 - (rank / (isEastern ? 16 : 16))));
        const gamesPlayed = 82;
        const wins = Math.round(gamesPlayed * winPct);
        const losses = gamesPlayed - wins;
        
        // Randomize home/away distribution
        const homeWins = Math.round(wins * (0.6 + Math.random() * 0.1));
        const homeLosses = Math.round(losses * (0.4 + Math.random() * 0.1));
        const awayWins = wins - homeWins;
        const awayLosses = losses - homeLosses;
        
        // Create last 10 games record
        const last10Wins = Math.min(wins, Math.round(Math.random() * 5) + (10 - rank) / 3);
        const last10Losses = 10 - last10Wins;
        
        // Generate streak
        const streakType = Math.random() > 0.5 ? "W" : "L";
        const streakCount = Math.floor(Math.random() * 5) + 1;
        
        // Generate points
        const ppg = Math.round((115 - rank * 0.5 + Math.random() * 10) * 10) / 10;
        const oppg = Math.round((108 + rank * 0.4 + Math.random() * 8) * 10) / 10;
        
        return {
            team: {
                id: team.id,
                name: team.name,
                nickname: team.nickname,
                code: team.code
            },
            conference: {
                name: team.conference,
                rank: rank
            },
            division: {
                name: team.division,
                rank: 0 // Not used in the UI
            },
            games: {
                played: gamesPlayed,
                win: {
                    total: wins,
                    percentage: winPct,
                    home: homeWins,
                    away: awayWins
                },
                loss: {
                    total: losses,
                    home: homeLosses,
                    away: awayLosses
                },
                last_10: {
                    win: last10Wins,
                    loss: last10Losses
                }
            },
            streak: {
                count: streakCount,
                type: streakType
            },
            points: {
                for: ppg,
                against: oppg
            }
        };
    });
}

// Helper function to get team ID from opponent name
function getOpponentTeamId(opponentName) {
    const teamMap = {
        'Milwaukee Bucks': '21',
        'Philadelphia 76ers': '27',
        'Charlotte Hornets': '5',
        'Atlanta Hawks': '1',
        'Brooklyn Nets': '4',
        'Chicago Bulls': '6',
        'Cleveland Cavaliers': '7',
        'Dallas Mavericks': '8',
        'Denver Nuggets': '9',
        'Detroit Pistons': '10',
        'Golden State Warriors': '11',
        'Houston Rockets': '14',
        'Indiana Pacers': '15',
        'LA Clippers': '16',
        'Los Angeles Lakers': '17',
        'Memphis Grizzlies': '19',
        'Miami Heat': '20',
        'Minnesota Timberwolves': '22',
        'New Orleans Pelicans': '23',
        'New York Knicks': '24',
        'Oklahoma City Thunder': '25',
        'Orlando Magic': '26',
        'Phoenix Suns': '28',
        'Portland Trail Blazers': '29',
        'Sacramento Kings': '30',
        'San Antonio Spurs': '31',
        'Toronto Raptors': '38',
        'Utah Jazz': '40',
        'Washington Wizards': '41'
    };
    
    return teamMap[opponentName] || '0'; // Return '0' if team not found
}

// Ticket request routes
app.post('/api/tickets', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ error: 'You must be logged in to create a ticket request' });
        }
        
        // Get user info from database
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const { game, section, sectionType, quantity } = req.body;
        
        // Validate input
        if (!game || !section || !sectionType || !quantity) {
            return res.status(400).json({ error: 'Please provide all required information' });
        }
        
        // Format section type to match the enum values
        let formattedSectionType;
        switch(sectionType.toLowerCase()) {
            case 'floor':
                formattedSectionType = 'Floor';
                break;
            case 'vip':
                formattedSectionType = 'VIP';
                break;
            case 'lower':
                formattedSectionType = 'Lower';
                break;
            case 'mid':
                formattedSectionType = 'Mid';
                break;
            case 'upper':
                formattedSectionType = 'Upper';
                break;
            case 'special':
                formattedSectionType = 'Special';
                break;
            default:
                formattedSectionType = 'Special'; // Default to Special if unknown type
        }
        
        // Calculate base price based on section type
        let basePrice = 0;
        switch(formattedSectionType) {
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
                basePrice = 200;
        }
        
        // Apply quantity discount
        let quantityMultiplier = 1;
        if (quantity >= 5) {
            quantityMultiplier = 0.9; // 10% discount for 5+ tickets
        } else if (quantity >= 3) {
            quantityMultiplier = 0.95; // 5% discount for 3-4 tickets
        }
        
        const serviceFee = basePrice * 0.15;
        const processingFee = 5;
        const totalPrice = (basePrice + serviceFee + processingFee) * quantity * quantityMultiplier;
        
        // Create ticket with user reference
        const ticket = new Ticket({
            userId: user._id, // Use userId instead of user
            userName: `${user.firstName} ${user.lastName}`,
            game,
            section,
            sectionType: formattedSectionType,
            quantity: parseInt(quantity),
            status: "pending",
            basePrice: basePrice,
            totalPrice: totalPrice,
            serviceFee: serviceFee,
            processingFee: processingFee
        });
        
        await ticket.save();
        res.status(201).json({
            message: "Ticket request submitted successfully!",
            ticket
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket request. Please try again.' });
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
        // Log the full error object for more details
        console.error('Detailed error fetching users:', error);
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
        const { firstName, lastName, email, phone, location, isAdmin } = req.body;
        
        console.log('Updating user with data:', req.body);
        
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

        // Prevent admin from demoting themselves
        if (req.session.user.id === user._id.toString() && isAdmin === false && user.isAdmin === true) {
            return res.status(403).json({ 
                error: 'You cannot remove your own admin privileges', 
                user: { ...user.toObject(), password: undefined }
            });
        }

        user.firstName = firstName;
        user.lastName = lastName;
        user.email = email;
        user.phone = phone;
        user.location = location;
        
        // Only update isAdmin if it's explicitly included in the request
        if (isAdmin !== undefined) {
            console.log(`Updating isAdmin status to: ${isAdmin}`);
            user.isAdmin = isAdmin;
        }

        await user.save();
        console.log('User updated successfully:', { id: user._id, isAdmin: user.isAdmin });
        res.json({ 
            message: 'User updated successfully', 
            user: { 
                ...user.toObject(), 
                password: undefined 
            } 
        });
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

        // Find and delete all tickets belonging to this user
        const deletedTickets = await Ticket.deleteMany({ userId: req.params.id });
        console.log(`Deleted ${deletedTickets.deletedCount} tickets for user ${req.params.id}`);
        
        // Delete the user
        await user.deleteOne();
        
        res.json({ 
            message: 'User deleted successfully', 
            ticketsDeleted: deletedTickets.deletedCount 
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }
        res.status(500).json({ error: 'Failed to delete user. Please try again.' });
    }
});

// Get tickets for a specific user (for admin)
app.get('/api/admin/users/:userId/tickets', isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 });
        
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ error: 'Failed to fetch user tickets' });
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
        const { game, section, sectionType, quantity, status, adminNotes, totalPrice, basePrice, serviceFee, processingFee } = req.body;
        const ticketId = req.params.id;
        
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        
        console.log('Updating ticket:', ticketId);
        console.log('Current total price in DB:', ticket.totalPrice);
        console.log('Received calculated price from client:', totalPrice);
        
        // Update ticket fields
        ticket.game = game || ticket.game;
        ticket.section = section || ticket.section;
        ticket.sectionType = sectionType || ticket.sectionType;
        ticket.quantity = quantity || ticket.quantity;
        ticket.status = status || ticket.status;
        ticket.adminNotes = adminNotes;
        
        // Always use the prices sent from the client (calculateTicketPrice function)
        if (basePrice) ticket.basePrice = parseFloat(basePrice);
        if (serviceFee) ticket.serviceFee = parseFloat(serviceFee);
        if (processingFee) ticket.processingFee = parseFloat(processingFee);
        if (totalPrice) ticket.totalPrice = parseFloat(totalPrice);
        
        console.log('Final price being saved to DB:', ticket.totalPrice);
        
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
        console.log('Fetching all tickets for admin');
        
        // Fetch tickets and populate with user info
        const tickets = await Ticket.find({})
            .sort({ createdAt: -1 })
            .lean(); // Use lean to get plain JS objects which are easier to modify
        
        // Get user information for each ticket
        const ticketsWithUserInfo = await Promise.all(
            tickets.map(async (ticket) => {
                try {
                    if (ticket.userId) {
                        const user = await User.findById(ticket.userId).lean();
                        if (user) {
                            return {
                                ...ticket,
                                userName: `${user.firstName} ${user.lastName}`,
                                userEmail: user.email
                            };
                        }
                    }
                    return {
                        ...ticket,
                        userName: 'Unknown User',
                        userEmail: 'No email'
                    };
                } catch (err) {
                    console.error(`Error getting user for ticket ${ticket._id}:`, err);
                    return {
                        ...ticket,
                        userName: 'Error retrieving user',
                        userEmail: 'Error'
                    };
                }
            })
        );
        
        console.log(`Found ${ticketsWithUserInfo.length} tickets`);
        res.json(ticketsWithUserInfo);
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

// Route handler function for HTML pages
const sendHtmlPage = (page) => (req, res) => {
    res.sendFile(path.join(__dirname, `../client/pages/${page}`));
};

// HTML routes
app.get('/', sendHtmlPage('MYweb.html'));
app.get('/login', sendHtmlPage('login.html'));
app.get('/register', sendHtmlPage('register.html'));
app.get('/profile', sendHtmlPage('profile.html'));
app.get('/roster', sendHtmlPage('roster.html'));
app.get('/schedule', sendHtmlPage('schedule.html'));
app.get('/standings', sendHtmlPage('standings.html'));
app.get('/getTickets', sendHtmlPage('getTickets.html'));
app.get('/admin', sendHtmlPage('admin.html'));
app.get('/news', sendHtmlPage('MYweb.html'));

// Temporary route to create a test user (REMOVE IN PRODUCTION)
app.get('/dev/create-test-user', async (req, res) => {
    try {
        // Check if a test user already exists
        const existingUser = await User.findOne({ email: 'test@example.com' });
        if (existingUser) {
            return res.json({ 
                message: 'Test user already exists', 
                userId: existingUser._id,
                email: 'test@example.com',
                password: 'password123'
            });
        }
        
        // Create a new test user
        const testUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'password123',
            phone: '123-456-7890',
            location: 'Boston',
            isAdmin: true // Making this an admin user for testing
        });
        
        await testUser.save();
        console.log('Test user created with ID:', testUser._id);
        
        res.json({ 
            message: 'Test user created successfully', 
            userId: testUser._id,
            email: 'test@example.com',
            password: 'password123'
        });
    } catch (error) {
        console.error('Error creating test user:', error);
        res.status(500).json({ message: 'Error creating test user', error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 