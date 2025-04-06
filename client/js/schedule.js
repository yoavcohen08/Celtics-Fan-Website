document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    console.log('[Schedule] DOM loaded, initializing schedule page');
    const scheduleContent = document.getElementById('schedule-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const retryButton = document.getElementById('retry-button');
    const filterButtons = document.querySelectorAll('.filter-buttons button');
    
    console.log('[Schedule] Found filter buttons:', filterButtons.length);
    
    // Constants
    const CELTICS_TEAM_ID = '2'; // API-NBA (RapidAPI) uses 2 for Boston Celtics
    const CURRENT_SEASON = '2024'; // API expects year like 2024 for 2024-25 season

    // --- Data Processing Functions (Adapted for RapidAPI /games structure) ---

    function formatDate(dateString) {
        try {
            const date = new Date(dateString); // e.g., "2024-10-24T00:00:00.000Z"
            if (isNaN(date)) throw new Error('Invalid date');
            return {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
        } catch (e) {
            console.error("[Schedule] Error formatting date:", dateString, e);
            return { day: 'N/A', date: 'N/A' };
        }
    }
    
    function getMonthName(dateString) {
         try {
            const date = new Date(dateString);
            if (isNaN(date)) throw new Error('Invalid date');
            return date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
        } catch (e) {
            console.error("[Schedule] Error getting month name:", dateString, e);
            return 'unknown';
        }
    }
    
    function getGameStatus(game) {
        const statusLong = game.status.long;
        const scores = game.scores;
        const homeTeamId = game.teams.home.id.toString(); // Ensure string comparison
        const visitorsTeamId = game.teams.visitors.id.toString();

        if (statusLong === 'Finished') {
            const homeScore = scores.home.points ?? 0;
            const visitorsScore = scores.visitors.points ?? 0;
            const isCelticsWin = (homeTeamId === CELTICS_TEAM_ID && homeScore > visitorsScore) || 
                                 (visitorsTeamId === CELTICS_TEAM_ID && visitorsScore > homeScore);
            return {
                isCompleted: true,
                text: `Final: ${scores.home.points}-${scores.visitors.points}`,
                isCelticsWin: isCelticsWin
            };
        } else if (statusLong === 'In Play') {
             // API might not provide live scores reliably here, adjust if needed
            return {
                isCompleted: false,
                text: `Live`,
                isCelticsWin: false
            };
        } else { // Scheduled, Postponed, Cancelled etc.
            try {
                const gameTime = new Date(game.date.start);
                if (isNaN(gameTime)) throw new Error('Invalid date');
                const formattedTime = gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
                return {
                    isCompleted: false,
                    text: formattedTime,
                    isCelticsWin: false
                };
            } catch (e) {
                 console.error("[Schedule] Error formatting game time:", game.date.start, e);
                 return {
                    isCompleted: false,
                    text: statusLong, // Fallback to status if time formatting fails
                    isCelticsWin: false
                };
            }
        }
    }
    
    // Uses RapidAPI Team IDs
    function getTeamLogoUrl(teamId) {
        const idStr = teamId.toString(); // Ensure string comparison
        const teamLogos = {
            '1': 'images/teams/hawks.png',      // Atlanta Hawks
            '2': 'images/teams/celtics.png',    // Boston Celtics
            '4': 'images/teams/nets.png',       // Brooklyn Nets
            '5': 'images/teams/hornets.png',    // Charlotte Hornets
            '6': 'images/teams/bulls.png',      // Chicago Bulls
            '7': 'images/teams/cavaliers.png',  // Cleveland Cavaliers
            '8': 'images/teams/mavericks.png',  // Dallas Mavericks
            '9': 'images/teams/nuggets.png',    // Denver Nuggets
            '10': 'images/teams/pistons.png',   // Detroit Pistons
            '11': 'images/teams/warriors.png',  // Golden State Warriors
            '14': 'images/teams/rockets.png',   // Houston Rockets
            '15': 'images/teams/pacers.png',    // Indiana Pacers
            '16': 'images/teams/clippers.png',  // LA Clippers
            '17': 'images/teams/lakers.png',    // Los Angeles Lakers
            '19': 'images/teams/grizzlies.png', // Memphis Grizzlies
            '20': 'images/teams/heat.png',      // Miami Heat
            '21': 'images/teams/bucks.png',     // Milwaukee Bucks
            '22': 'images/teams/timberwolves.png', // Minnesota Timberwolves
            '23': 'images/teams/pelicans.png',  // New Orleans Pelicans
            '24': 'images/teams/knicks.png',    // New York Knicks
            '25': 'images/teams/thunder.png',   // Oklahoma City Thunder
            '26': 'images/teams/magic.png',     // Orlando Magic
            '27': 'images/teams/76ers.png',    // Philadelphia 76ers
            '28': 'images/teams/suns.png',      // Phoenix Suns
            '29': 'images/teams/blazers.png',   // Portland Trail Blazers
            '30': 'images/teams/kings.png',     // Sacramento Kings
            '31': 'images/teams/spurs.png',     // San Antonio Spurs
            '38': 'images/teams/raptors.png',   // Toronto Raptors
            '40': 'images/teams/jazz.png',      // Utah Jazz
            '41': 'images/teams/wizards.png'    // Washington Wizards
        };
        return teamLogos[idStr] || 'images/teams/default.png'; 
    }
    
    function createGameCard(game) {
        try {
            const gameDate = game.date.start;
            const formattedDate = formatDate(gameDate);
            const monthName = getMonthName(gameDate);
            
            const homeTeam = game.teams.home;
            const visitorsTeam = game.teams.visitors;
            const isCelticsHome = homeTeam.id.toString() === CELTICS_TEAM_ID;
            
            const opponentData = isCelticsHome ? visitorsTeam : homeTeam;
            
            const gameStatus = getGameStatus(game);
            const venue = game.arena.name || 'TBD';
            
            const opponentLogo = getTeamLogoUrl(opponentData.id);
            const celticsLogo = getTeamLogoUrl(CELTICS_TEAM_ID);
            
            let cardClasses = 'game-card';
            cardClasses += isCelticsHome ? ' home' : ' away';
            if (gameStatus.isCompleted) {
                 cardClasses += ' completed';
                 cardClasses += gameStatus.isCelticsWin ? ' win' : ' loss';
            }
            
            const gameActionsHTML = !gameStatus.isCompleted ? `
                <div class="game-actions">
                    <a href="/getTickets?gameId=${game.id}" class="btn-ticket">Get Tickets</a>
                </div>` : ''; 

            // Determine HTML for left and right teams based on home/away
            let teamLeftHTML, teamRightHTML, separator;
            if (isCelticsHome) {
                teamLeftHTML = `
                    <div class="team opponent">
                        <img src="${opponentLogo}" alt="${opponentData.name}" class="team-logo">
                        <span>${opponentData.name}</span>
                    </div>
                `;
                separator = 'vs';
                teamRightHTML = `
                    <div class="team celtics">
                        <img src="${celticsLogo}" alt="Boston Celtics" class="team-logo">
                        <span>Celtics</span>
                    </div>
                `;
            } else { // Celtics are away
                teamLeftHTML = `
                    <div class="team celtics">
                        <img src="${celticsLogo}" alt="Boston Celtics" class="team-logo">
                        <span>Celtics</span>
                    </div>
                `;
                separator = '@';
                teamRightHTML = `
                    <div class="team opponent">
                        <img src="${opponentLogo}" alt="${opponentData.name}" class="team-logo">
                        <span>${opponentData.name}</span>
                    </div>
                `;
            }

            return `
                <div class="${cardClasses}" data-date="${gameDate}" data-month="${monthName}">
                    <div class="game-date">
                        <span class="day">${formattedDate.day}</span>
                        <span class="date">${formattedDate.date}</span>
                    </div>
                    <div class="game-teams">
                        ${teamLeftHTML}
                        <span class="game-separator">${separator}</span>
                        ${teamRightHTML}
                    </div>
                    <div class="game-info">
                        <div class="game-venue"><i class="fas fa-map-marker-alt"></i> ${venue}</div>
                        <div class="game-${gameStatus.isCompleted ? 'result' : 'time'} ${gameStatus.isCelticsWin ? 'win' : (gameStatus.isCompleted ? 'loss' : '')}">
                            ${gameStatus.text}
                        </div>
                    </div>
                    ${gameActionsHTML}
                </div>
            `;
        } catch (e) {
             console.error("[Schedule] Error creating card for game:", game, e);
             return '<div class="game-card error">Error displaying game</div>';
        }
    }
    
    function groupGamesByMonth(games) {
        const months = {};
        games.forEach(game => {
             try {
                const monthName = getMonthName(game.date.start);
                if (!months[monthName]) months[monthName] = [];
                months[monthName].push(game);
            } catch (e) {
                 console.error("[Schedule] Error grouping game by month:", game, e);
            }
        });
        return months;
    }
    
    function renderSchedule(games) {
        console.log('[Schedule] Rendering schedule with', games.length, 'games from API');
        try {
            games.sort((a, b) => new Date(a.date.start) - new Date(b.date.start));
            const gamesByMonth = groupGamesByMonth(games);
            scheduleContent.innerHTML = '';
            
            if (Object.keys(gamesByMonth).length === 0) {
                 scheduleContent.innerHTML = '<p class="no-games-message">No games found for the current season.</p>';
                 return;
            }
            
             // Define correct month order
             const monthOrder = ['october', 'november', 'december', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september'];

            Object.keys(gamesByMonth).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b)).forEach(month => {
                const monthContainer = document.createElement('div');
                monthContainer.className = 'month-container';
                monthContainer.id = month;
                
                const monthHeading = document.createElement('h2');
                monthHeading.className = 'month-heading';
                // Get year from the first game of the month
                const year = gamesByMonth[month][0] ? new Date(gamesByMonth[month][0].date.start).getFullYear() : CURRENT_SEASON;
                monthHeading.textContent = `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
                monthContainer.appendChild(monthHeading);
                
                const gameGrid = document.createElement('div');
                gameGrid.className = 'game-grid';
                
                gamesByMonth[month].forEach(game => {
                    gameGrid.innerHTML += createGameCard(game);
                });
                
                monthContainer.appendChild(gameGrid);
                scheduleContent.appendChild(monthContainer);
            });
            
            initializeFilters(); 
        } catch (renderError) {
            console.error('[Schedule] Error during schedule rendering:', renderError);
            displayError('Error displaying schedule.');
        }
    }
    
    function initializeFilters() {
        // ... (Filter logic can remain similar if needed, ensure it interacts with rendered DOM) ...
         filterButtons.forEach(button => {
             button.addEventListener('click', function() {
                 filterButtons.forEach(btn => btn.classList.remove('active'));
                 this.classList.add('active');
                 const filterValue = this.getAttribute('data-filter'); // e.g., 'all', 'october', 'november'

                 const allMonthContainers = scheduleContent.querySelectorAll('.month-container');
                 allMonthContainers.forEach(container => {
                     if (filterValue === 'all' || container.id === filterValue) {
                         container.style.display = 'block';
                     } else {
                         container.style.display = 'none';
                     }
                 });
             });
         });
          // Activate the 'all' filter by default if it exists
         const allButton = document.querySelector('.filter-buttons button[data-filter="all"]');
         if (allButton) allButton.click(); 
    }

    function displayError(message) {
        scheduleContent.innerHTML = ''; // Clear content
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }

    // --- Main Function to Load Schedule --- 
    async function loadSchedule() {
        console.log('[Schedule] Attempting to load schedule from API...');
        if(loadingIndicator) loadingIndicator.style.display = 'flex';
        if(errorMessage) errorMessage.style.display = 'none';
        scheduleContent.innerHTML = '';

        try {
            // Fetch uses the endpoint defined in server.js (which calls RapidAPI)
            const fetchUrl = `/api/schedule`; 
            console.log('[Schedule] Fetching schedule from URL:', fetchUrl);
            
            // Manual fetch troubleshooting
            console.log('[Schedule] Before fetch call');
            
            const response = await fetch(fetchUrl);
            console.log('[Schedule] After fetch call, response status:', response.status);
            
            if (!response.ok) {
                 // Attempt to get error message from server JSON response
                 let errorMsg = `Server error: ${response.status}`;
                 try {
                     const errorData = await response.json();
                     errorMsg = errorData.error || errorMsg;
                 } catch (jsonError) { /* Ignore if response isn't JSON */ }
                 throw new Error(errorMsg);
            }
            
            console.log('[Schedule] Response OK, getting JSON');
            const games = await response.json();
            console.log('[Schedule] Received games data:', games);

            if (!Array.isArray(games)) {
                 console.error('[Schedule] Invalid data format - not an array:', typeof games);
                 throw new Error('Invalid data format received from server.');
            }

            if (games.length === 0) {
                console.warn('[Schedule] Games array is empty');
                scheduleContent.innerHTML = '<p class="no-games-message">No games found for the current season.</p>';
                if(loadingIndicator) loadingIndicator.style.display = 'none';
                return;
            }

            console.log('[Schedule] Hiding loading indicator and calling renderSchedule with', games.length, 'games');
            if(loadingIndicator) loadingIndicator.style.display = 'none';
            
            // As a fallback, if games data isn't working, try with hardcoded sample data
            if (games.length === 0 || !Array.isArray(games)) {
                console.warn('[Schedule] Using fallback data');
                const fallbackGames = getSampleGames();
                renderSchedule(fallbackGames);
            } else {
                renderSchedule(games);
            }

        } catch (error) {
            console.error('[Schedule] Error loading schedule:', error);
            displayError(error.message || 'Failed to load schedule. Please try again.');
        }
    }
    
    // Fallback sample data in case API fails
    function getSampleGames() {
        return [
            {
                id: "1",
                date: {
                    start: "2024-03-28T17:30:00.000Z"
                },
                teams: {
                    home: {
                        id: "2",
                        name: "Boston Celtics"
                    },
                    visitors: {
                        id: "21",
                        name: "Milwaukee Bucks"
                    }
                },
                scores: {
                    home: { points: null },
                    visitors: { points: null }
                },
                status: {
                    long: "Scheduled"
                },
                arena: {
                    name: "TD Garden"
                }
            }
        ];
    }
    
    // Add event listener for the retry button
    if (retryButton) {
        retryButton.addEventListener('click', loadSchedule);
    }
    
    // Initial load
    loadSchedule();
}); 