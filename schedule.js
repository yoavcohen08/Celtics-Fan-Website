document.addEventListener('DOMContentLoaded', function() {
    // Initialize global variables
    const scheduleContent = document.getElementById('schedule-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const retryButton = document.getElementById('retry-button');
    const filterButtons = document.querySelectorAll('.filter-buttons button');
    
    // Team ID for Boston Celtics
    const CELTICS_TEAM_ID = '1610612738';
    
    // Current season (modify this each year)
    const CURRENT_SEASON = '2024-25';
    
    // Function to format date to readable format
    function formatDate(dateString) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const date = new Date(dateString);
        return {
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
    }
    
    // Function to get month name from date
    function getMonthName(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    }
    
    // Function to determine game status
    function getGameStatus(game) {
        if (game.statusNum === 3) {
            // Game completed
            return {
                isCompleted: true,
                result: `Final: ${game.hTeam.triCode} ${game.hTeam.score} - ${game.vTeam.triCode} ${game.vTeam.score}`,
                isCelticsWin: (game.hTeam.teamId === CELTICS_TEAM_ID && parseInt(game.hTeam.score) > parseInt(game.vTeam.score)) || 
                             (game.vTeam.teamId === CELTICS_TEAM_ID && parseInt(game.vTeam.score) > parseInt(game.hTeam.score))
            };
        } else if (game.statusNum === 2) {
            // Game in progress
            return {
                isCompleted: false,
                result: `In Progress: ${game.hTeam.triCode} ${game.hTeam.score} - ${game.vTeam.triCode} ${game.vTeam.score}`,
                isCelticsWin: false
            };
        } else {
            // Game not started
            const gameTime = new Date(game.startTimeUTC);
            const formattedTime = gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            return {
                isCompleted: false,
                result: `${formattedTime}`,
                isCelticsWin: false
            };
        }
    }
    
    // Function to get team logo URL
    function getTeamLogoUrl(teamId) {
        // Map NBA team IDs to your local team logo paths
        const teamLogos = {
            '1610612738': 'images/teams/celtics.png',    // Boston Celtics
            '1610612751': 'images/teams/nets.png',       // Brooklyn Nets
            '1610612752': 'images/teams/knicks.png',     // New York Knicks
            '1610612755': 'images/teams/sixers.png',     // Philadelphia 76ers
            '1610612761': 'images/teams/raptors.png',    // Toronto Raptors
            '1610612741': 'images/teams/bulls.png',      // Chicago Bulls
            '1610612739': 'images/teams/cavaliers.png',  // Cleveland Cavaliers
            '1610612765': 'images/teams/pistons.png',    // Detroit Pistons
            '1610612754': 'images/teams/pacers.png',     // Indiana Pacers
            '1610612749': 'images/teams/bucks.png',      // Milwaukee Bucks
            '1610612737': 'images/teams/hawks.png',      // Atlanta Hawks
            '1610612766': 'images/teams/hornets.png',    // Charlotte Hornets
            '1610612748': 'images/teams/heat.png',       // Miami Heat
            '1610612753': 'images/teams/magic.png',      // Orlando Magic
            '1610612764': 'images/teams/wizards.png',    // Washington Wizards
            '1610612743': 'images/teams/nuggets.png',    // Denver Nuggets
            '1610612750': 'images/teams/timberwolves.png', // Minnesota Timberwolves
            '1610612760': 'images/teams/thunder.png',    // Oklahoma City Thunder
            '1610612757': 'images/teams/blazers.png',    // Portland Trail Blazers
            '1610612762': 'images/teams/jazz.png',       // Utah Jazz
            '1610612744': 'images/teams/warriors.png',   // Golden State Warriors
            '1610612746': 'images/teams/clippers.png',   // LA Clippers
            '1610612747': 'images/teams/lakers.png',     // Los Angeles Lakers
            '1610612756': 'images/teams/suns.png',       // Phoenix Suns
            '1610612758': 'images/teams/kings.png',      // Sacramento Kings
            '1610612742': 'images/teams/mavericks.png',  // Dallas Mavericks
            '1610612745': 'images/teams/rockets.png',    // Houston Rockets
            '1610612763': 'images/teams/grizzlies.png',  // Memphis Grizzlies
            '1610612740': 'images/teams/pelicans.png',   // New Orleans Pelicans
            '1610612759': 'images/teams/spurs.png'       // San Antonio Spurs
        };
        
        return teamLogos[teamId] || 'images/teams/default.png';
    }
    
    // Function to get team abbreviation from team ID
    function getTeamAbbreviation(teamId) {
        // Map NBA team IDs to their abbreviations
        const teamAbbreviations = {
            '1610612738': 'Celtics',    // Boston Celtics
            '1610612751': 'Nets',       // Brooklyn Nets
            '1610612752': 'Knicks',     // New York Knicks
            '1610612755': 'Sixers',     // Philadelphia 76ers
            '1610612761': 'Raptors',    // Toronto Raptors
            '1610612741': 'Bulls',      // Chicago Bulls
            '1610612739': 'Cavaliers',  // Cleveland Cavaliers
            '1610612765': 'Pistons',    // Detroit Pistons
            '1610612754': 'Pacers',     // Indiana Pacers
            '1610612749': 'Bucks',      // Milwaukee Bucks
            '1610612737': 'Hawks',      // Atlanta Hawks
            '1610612766': 'Hornets',    // Charlotte Hornets
            '1610612748': 'Heat',       // Miami Heat
            '1610612753': 'Magic',      // Orlando Magic
            '1610612764': 'Wizards',    // Washington Wizards
            '1610612743': 'Nuggets',    // Denver Nuggets
            '1610612750': 'Wolves',     // Minnesota Timberwolves
            '1610612760': 'Thunder',    // Oklahoma City Thunder
            '1610612757': 'Blazers',    // Portland Trail Blazers
            '1610612762': 'Jazz',       // Utah Jazz
            '1610612744': 'Warriors',   // Golden State Warriors
            '1610612746': 'Clippers',   // LA Clippers
            '1610612747': 'Lakers',     // Los Angeles Lakers
            '1610612756': 'Suns',       // Phoenix Suns
            '1610612758': 'Kings',      // Sacramento Kings
            '1610612742': 'Mavericks',  // Dallas Mavericks
            '1610612745': 'Rockets',    // Houston Rockets
            '1610612763': 'Grizzlies',  // Memphis Grizzlies
            '1610612740': 'Pelicans',   // New Orleans Pelicans
            '1610612759': 'Spurs'       // San Antonio Spurs
        };
        
        return teamAbbreviations[teamId] || 'Team';
    }
    
    // Function to create game card HTML
    function createGameCard(game) {
        const formattedDate = formatDate(game.startDateEastern);
        const isCelticsHome = game.hTeam.teamId === CELTICS_TEAM_ID;
        const homeTeam = isCelticsHome ? game.hTeam : game.vTeam;
        const awayTeam = isCelticsHome ? game.vTeam : game.hTeam;
        const gameStatus = getGameStatus(game);
        const venue = game.arena.name || 'TBD';
        
        const homeTeamLogo = getTeamLogoUrl(homeTeam.teamId);
        const awayTeamLogo = getTeamLogoUrl(awayTeam.teamId);
        const homeTeamName = getTeamAbbreviation(homeTeam.teamId);
        const awayTeamName = getTeamAbbreviation(awayTeam.teamId);
        
        // Determine card classes
        let cardClasses = 'game-card';
        cardClasses += isCelticsHome ? ' home' : ' away';
        cardClasses += gameStatus.isCompleted ? (gameStatus.isCelticsWin ? ' win' : ' loss') : '';
        cardClasses += gameStatus.isCompleted ? ' completed' : '';
        
        return `
            <div class="${cardClasses}" data-date="${game.startDateEastern}" data-month="${getMonthName(game.startDateEastern)}">
                <div class="game-date">
                    <span class="day">${formattedDate.day}</span>
                    <span class="date">${formattedDate.date}</span>
                </div>
                <div class="game-teams">
                    <div class="team away">
                        <img src="${awayTeamLogo}" alt="${awayTeamName}" class="team-logo">
                        <span>${awayTeamName}</span>
                    </div>
                    <span class="vs">@</span>
                    <div class="team home">
                        <img src="${homeTeamLogo}" alt="${homeTeamName}" class="team-logo">
                        <span>${homeTeamName}</span>
                    </div>
                </div>
                <div class="game-info">
                    <div class="game-venue"><i class="fas fa-map-marker-alt"></i> ${venue}</div>
                    <div class="game-${gameStatus.isCompleted ? 'result' : 'time'} ${gameStatus.isCelticsWin ? 'win' : (gameStatus.isCompleted ? 'loss' : '')}">
                        ${gameStatus.result}
                    </div>
                </div>
                <div class="game-actions">
                    <a href="getTickets.html" class="btn-ticket">Get Tickets</a>
                </div>
            </div>
        `;
    }
    
    // Function to group games by month
    function groupGamesByMonth(games) {
        const months = {};
        
        games.forEach(game => {
            const monthName = getMonthName(game.startDateEastern);
            if (!months[monthName]) {
                months[monthName] = [];
            }
            months[monthName].push(game);
        });
        
        return months;
    }
    
    // Function to render the schedule
    function renderSchedule(games) {
        // Group games by month
        const gamesByMonth = groupGamesByMonth(games);
        
        // Clear the schedule content
        scheduleContent.innerHTML = '';
        
        // Create a container for each month and add games
        Object.keys(gamesByMonth).forEach(month => {
            const monthContainer = document.createElement('div');
            monthContainer.className = 'month-container';
            monthContainer.id = month;
            
            // Create month heading
            const monthHeading = document.createElement('h2');
            monthHeading.className = 'month-heading';
            monthHeading.textContent = month.charAt(0).toUpperCase() + month.slice(1);
            monthContainer.appendChild(monthHeading);
            
            // Create game grid
            const gameGrid = document.createElement('div');
            gameGrid.className = 'game-grid';
            
            // Add each game to the grid
            gamesByMonth[month].forEach(game => {
                const gameCardHTML = createGameCard(game);
                gameGrid.innerHTML += gameCardHTML;
            });
            
            monthContainer.appendChild(gameGrid);
            scheduleContent.appendChild(monthContainer);
        });
        
        // Re-initialize filter functionality
        initializeFilters();
    }
    
    // Function to initialize filter functionality
    function initializeFilters() {
        const monthContainers = document.querySelectorAll('.month-container');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');
                
                const filter = this.getAttribute('data-month');
                
                if (filter === 'all') {
                    // Show all months
                    monthContainers.forEach(container => {
                        container.style.display = 'block';
                    });
                } else {
                    // Hide all months
                    monthContainers.forEach(container => {
                        container.style.display = 'none';
                    });
                    // Show selected month
                    document.getElementById(filter)?.style.display = 'block';
                }
            });
        });
    }
    
    // Function to fetch and display the schedule
    function fetchSchedule() {
        // Show loading indicator
        loadingIndicator.style.display = 'flex';
        errorMessage.style.display = 'none';
        
        // Fetch from NBA API
        fetch(`https://data.nba.net/10s/prod/v1/${CURRENT_SEASON}/schedule.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Hide loading indicator
                loadingIndicator.style.display = 'none';
                
                // Check if data has the expected structure
                if (!data.league || !data.league.standard || data.league.standard.length === 0) {
                    throw new Error('No schedule data available for the 2024-25 season yet');
                }
                
                // Filter games for the Celtics
                const celticsGames = data.league.standard.filter(game => 
                    game.hTeam.teamId === CELTICS_TEAM_ID || game.vTeam.teamId === CELTICS_TEAM_ID
                );
                
                // Render the schedule
                renderSchedule(celticsGames);
            })
            .catch(error => {
                console.error('Error fetching schedule:', error);
                
                // Hide loading indicator and show error message
                loadingIndicator.style.display = 'none';
                errorMessage.style.display = 'block';
                
                // Update error message with specific details
                const errorParagraph = errorMessage.querySelector('p');
                if (errorParagraph) {
                    if (error.message.includes('2024-25 season')) {
                        errorParagraph.innerHTML = 
                            'The 2024-25 season schedule is not available yet. <br>' +
                            'The NBA typically releases the full schedule in August.';
                        
                        // Try fetching the previous season as fallback
                        tryFallbackSeason();
                    } else {
                        errorParagraph.textContent = 'There was an error loading the schedule. Please try again later.';
                    }
                }
            });
    }
    
    // Function to try loading the previous season as a fallback
    function tryFallbackSeason() {
        console.log('Trying fallback to previous season 2023-24');
        
        // Show loading indicator again
        loadingIndicator.style.display = 'flex';
        
        fetch(`https://data.nba.net/10s/prod/v1/2023-24/schedule.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Hide loading indicator
                loadingIndicator.style.display = 'none';
                
                // Filter games for the Celtics
                const celticsGames = data.league.standard.filter(game => 
                    game.hTeam.teamId === CELTICS_TEAM_ID || game.vTeam.teamId === CELTICS_TEAM_ID
                );
                
                // Render the schedule with a note
                renderSchedule(celticsGames);
                
                // Add a note that this is last season's schedule
                const noteElement = document.createElement('div');
                noteElement.className = 'schedule-note';
                noteElement.innerHTML = '<strong>Note:</strong> Displaying the 2023-24 season schedule until the 2024-25 schedule is released.';
                noteElement.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
                noteElement.style.color = '#856404';
                noteElement.style.padding = '10px';
                noteElement.style.borderRadius = '5px';
                noteElement.style.marginBottom = '20px';
                noteElement.style.textAlign = 'center';
                noteElement.style.border = '1px solid rgba(255, 193, 7, 0.3)';
                
                // Insert at the top of the schedule content
                scheduleContent.insertBefore(noteElement, scheduleContent.firstChild);
            })
            .catch(error => {
                console.error('Error fetching fallback schedule:', error);
                
                // Hide loading indicator and keep error message visible
                loadingIndicator.style.display = 'none';
            });
    }
    
    // Initialize retry button
    retryButton.addEventListener('click', fetchSchedule);
    
    // Initial load
    fetchSchedule();
}); 