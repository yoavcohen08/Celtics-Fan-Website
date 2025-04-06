/**
 * NBA Standings Page - JavaScript
 * 
 * This script handles:
 * 1. Fetching standings data from the API-NBA endpoint
 * 2. Processing and organizing standings data
 * 3. Populating the standings tables
 * 4. Tab switching functionality
 * 5. Sorting functionality for table columns
 * 
 * API Reference: NBA API v1 (RapidAPI)
 */

document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const SEASON = '2024'; // 2024-2025 season
    const CURRENT_STANDINGS_API_ENDPOINT = '/api/standings'; // Server-side endpoint
    const PLAYOFF_THRESHOLD = 6; // Top 6 make playoffs directly
    const PLAYIN_THRESHOLD = 10; // 7-10 seeds make play-in
    
    // DOM Elements
    const standingsContent = document.getElementById('standings-content');
    const loadingContainer = document.getElementById('loading-container');
    const errorContainer = document.getElementById('error-container');
    const retryButton = document.getElementById('retry-button');
    const tabButtons = document.querySelectorAll('.standings-tab');
    const tabContents = document.querySelectorAll('.standings-content');
    const leagueTableBody = document.getElementById('league-table-body');
    const eastTableBody = document.getElementById('east-table-body');
    const westTableBody = document.getElementById('west-table-body');
    const tankingTableBody = document.getElementById('tanking-table-body');
    const atlanticTableBody = document.getElementById('atlantic-table-body');
    const centralTableBody = document.getElementById('central-table-body');
    const southeastTableBody = document.getElementById('southeast-table-body');
    const northwestTableBody = document.getElementById('northwest-table-body');
    const pacificTableBody = document.getElementById('pacific-table-body');
    const southwestTableBody = document.getElementById('southwest-table-body');
    
    // Team Data
    let allTeams = [];
    let eastTeams = [];
    let westTeams = [];
    let tankingTeams = [];
    let atlanticTeams = [];
    let centralTeams = [];
    let southeastTeams = [];
    let northwestTeams = [];
    let pacificTeams = [];
    let southwestTeams = [];
    
    // Logo URL mapping
    const teamLogos = {
        'Boston Celtics': 'images/teams/celtics.png',
        'Philadelphia 76ers': 'images/teams/76ers.png',
        'New York Knicks': 'images/teams/knicks.png',
        'Brooklyn Nets': 'images/teams/nets.png',
        'Toronto Raptors': 'images/teams/raptors.png',
        'Milwaukee Bucks': 'images/teams/bucks.png',
        'Cleveland Cavaliers': 'images/teams/cavaliers.png',
        'Chicago Bulls': 'images/teams/bulls.png',
        'Detroit Pistons': 'images/teams/pistons.png',
        'Indiana Pacers': 'images/teams/pacers.png',
        'Miami Heat': 'images/teams/heat.png',
        'Atlanta Hawks': 'images/teams/hawks.png',
        'Charlotte Hornets': 'images/teams/hornets.png',
        'Washington Wizards': 'images/teams/wizards.png',
        'Orlando Magic': 'images/teams/magic.png',
        'Los Angeles Lakers': 'images/teams/lakers.png',
        'LA Clippers': 'images/teams/clippers.png',
        'Golden State Warriors': 'images/teams/warriors.png',
        'Phoenix Suns': 'images/teams/suns.png',
        'Sacramento Kings': 'images/teams/kings.png',
        'Dallas Mavericks': 'images/teams/mavericks.png',
        'Memphis Grizzlies': 'images/teams/grizzlies.png',
        'San Antonio Spurs': 'images/teams/spurs.png',
        'Houston Rockets': 'images/teams/rockets.png',
        'New Orleans Pelicans': 'images/teams/pelicans.png',
        'Denver Nuggets': 'images/teams/nuggets.png',
        'Utah Jazz': 'images/teams/jazz.png',
        'Portland Trail Blazers': 'images/teams/blazers.png',
        'Minnesota Timberwolves': 'images/teams/timberwolves.png',
        'Oklahoma City Thunder': 'images/teams/thunder.png'
    };
    
    /**
     * Initializes the page by fetching standings data and setting up event listeners
     */
    function init() {
        // Fetch standings data
        fetchStandings();
        
        // Set up tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                switchTab(tabId);
                
                // Reset the currently visible table to default sort
                restoreDefaultSort(tabId);
            });
        });
        
        // Set up retry button
        retryButton.addEventListener('click', fetchStandings);
        
        // Set up sortable columns
        setupSortingListeners();
    }
    
    /**
     * Fetches standings data from the API
     */
    async function fetchStandings() {
        showLoading();
        
        try {
            // Using server-side endpoint to proxy the API call
            // This helps keep API keys secure
            const response = await fetch(CURRENT_STANDINGS_API_ENDPOINT, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data)) {
                throw new Error('Invalid data format received');
            }
            
            processStandingsData(data);
            showContent();
        } catch (error) {
            console.error('Error fetching standings:', error);
            showError();
        }
    }
    
    /**
     * Processes raw standings data and organizes it into teams
     * @param {Array} data - Raw standings data from API
     */
    function processStandingsData(data) {
        console.log("[Standings] Processing raw data:", JSON.stringify(data[0], null, 2)); // Log first raw team
        const processedTeams = data.map((teamData, index) => {
            // Helper for safe navigation, ensuring numeric defaults where needed
            const getSafe = (obj, path, defaultValue = null) => {
                const value = path.split('.').reduce((o, k) => (o && typeof o === 'object' && k in o) ? o[k] : undefined, obj);
                return value ?? defaultValue;
            };
            const getSafeNum = (obj, path, defaultValue = 0) => Number(getSafe(obj, path, defaultValue)) || defaultValue;
            const getSafeStr = (obj, path, defaultValue = 'N/A') => String(getSafe(obj, path, defaultValue));
            const getSafeBool = (obj, path, defaultValue = false) => Boolean(getSafe(obj, path, defaultValue));

            const team = getSafe(teamData, 'team', {});
            const conference = getSafe(teamData, 'conference', {});
            const division = getSafe(teamData, 'division', {});
            const win = getSafe(teamData, 'win', {}); // Directly under teamData
            const loss = getSafe(teamData, 'loss', {}); // Directly under teamData
            
            // Correctly extract stats based on raw data log
            const wins = getSafeNum(win, 'total');
            const losses = getSafeNum(loss, 'total');
            const gamesPlayed = wins + losses; // Calculate GP
            const winPct = parseFloat(getSafe(win, 'percentage', '0') || '0'); // Parse string percentage

            const last10Win = getSafeNum(win, 'lastTen');
            const last10Loss = getSafeNum(loss, 'lastTen');

            const streakCount = getSafeNum(teamData, 'streak'); // Directly under teamData
            const isWinStreak = getSafeBool(teamData, 'winStreak'); // Directly under teamData
            let streakType = 'none';
            if (streakCount > 0) {
                streakType = isWinStreak ? 'W' : 'L';
            }

            const homeWins = getSafeNum(win, 'home');
            const homeLosses = getSafeNum(loss, 'home');
            const awayWins = getSafeNum(win, 'away');
            const awayLosses = getSafeNum(loss, 'away');
            
            // PPG/OPPG/Net Rating are NOT available in the provided raw data
            const ppg = 0; 
            const oppg = 0;
            const netRating = 0;

            const gamesBehind = getSafe(teamData, 'gamesBehind'); // Can be null or string

            const processed = {
                id: getSafeNum(team, 'id'),
                name: getSafeStr(team, 'name', 'Unknown Team'),
                nickname: getSafeStr(team, 'nickname'),
                code: getSafeStr(team, 'code'),
                logo: teamLogos[getSafeStr(team, 'name')] || getSafeStr(team, 'logo') || `https://cdn.nba.com/logos/nba/${getSafeNum(team, 'id')}/global/L/logo.svg`,
                conference: getSafeStr(conference, 'name'),
                division: getSafeStr(division, 'name'),
                rank: getSafeNum(conference, 'rank', 99),
                games_played: gamesPlayed,
                wins: wins,
                losses: losses,
                win_pct: winPct,
                last10: { wins: last10Win, losses: last10Loss },
                streak: { count: streakCount, type: streakType },
                home: { wins: homeWins, losses: homeLosses },
                away: { wins: awayWins, losses: awayLosses },
                ppg: ppg, // Keep placeholder, but data isn't there
                oppg: oppg, // Keep placeholder
                net_rating: netRating, // Keep placeholder
                games_behind: gamesBehind === null ? '-' : gamesBehind // Format for display
            };
            
            // Log the first team's processed data for detailed inspection
            if(index === 0) {
                console.log("[Standings] First team processed:", JSON.stringify(processed, null, 2));
            }
            
            return processed;
        });
        
        // console.log("[Standings] All Processed Teams:", processedTeams); // Keep this commented unless needed

        // Sort by win percentage for all teams
        allTeams = processedTeams.sort((a, b) => b.win_pct - a.win_pct || a.losses - b.losses); // Tie-breaker: fewer losses
        
        // --- Calculate League Games Behind --- 
        if (allTeams.length > 0) {
            const leagueLeader = allTeams[0];
            allTeams = allTeams.map(team => {
                if (team.id === leagueLeader.id) {
                    team.league_games_behind = '-'; // Leader is 0 GB
                } else {
                    const gbValue = ((leagueLeader.wins - team.wins) + (team.losses - leagueLeader.losses)) / 2;
                    // Format to one decimal place if not integer, otherwise no decimal
                    team.league_games_behind = gbValue % 1 === 0 ? gbValue.toString() : gbValue.toFixed(1);
                }
                return team;
            });
            console.log("[Standings] Calculated League GB. Leader:", leagueLeader.name, "First team GB:", allTeams[0].league_games_behind, "Second team GB:", allTeams[1].league_games_behind); 
        }
        // -------------------------------------

        // Filter and sort East/West teams by conference rank
        eastTeams = processedTeams
            .filter(team => team.conference.toLowerCase() === 'east' || team.conference.toLowerCase() === 'eastern')
            .sort((a, b) => a.rank - b.rank);
            
        westTeams = processedTeams
            .filter(team => team.conference.toLowerCase() === 'west' || team.conference.toLowerCase() === 'western')
            .sort((a, b) => a.rank - b.rank);
        
        console.log("[Standings] Eastern Conference teams:", eastTeams.length, "| Western Conference teams:", westTeams.length);
        
        // Filter teams by division
        atlanticTeams = processedTeams
            .filter(team => team.division.toLowerCase() === 'atlantic')
            .sort((a, b) => a.rank - b.rank);
            
        centralTeams = processedTeams
            .filter(team => team.division.toLowerCase() === 'central')
            .sort((a, b) => a.rank - b.rank);
            
        southeastTeams = processedTeams
            .filter(team => team.division.toLowerCase() === 'southeast')
            .sort((a, b) => a.rank - b.rank);
            
        northwestTeams = processedTeams
            .filter(team => team.division.toLowerCase() === 'northwest')
            .sort((a, b) => a.rank - b.rank);
            
        pacificTeams = processedTeams
            .filter(team => team.division.toLowerCase() === 'pacific')
            .sort((a, b) => a.rank - b.rank);
            
        southwestTeams = processedTeams
            .filter(team => team.division.toLowerCase() === 'southwest')
            .sort((a, b) => a.rank - b.rank);
            
        console.log("[Standings] Divisions - Atlantic:", atlanticTeams.length, 
                   "| Central:", centralTeams.length, 
                   "| Southeast:", southeastTeams.length,
                   "| Northwest:", northwestTeams.length,
                   "| Pacific:", pacificTeams.length,
                   "| Southwest:", southwestTeams.length);
        
        // Calculate conference-specific Games Behind
        if (eastTeams.length > 0) {
            const eastLeader = eastTeams[0]; // First team is the leader
            eastTeams = eastTeams.map(team => {
                if (team.id === eastLeader.id) {
                    team.conference_games_behind = '-'; // Leader is 0 GB
                } else {
                    const gbValue = ((eastLeader.wins - team.wins) + (team.losses - eastLeader.losses)) / 2;
                    // Format to one decimal place if not integer, otherwise no decimal
                    team.conference_games_behind = gbValue % 1 === 0 ? gbValue.toString() : gbValue.toFixed(1);
                }
                return team;
            });
        }
        
        if (westTeams.length > 0) {
            const westLeader = westTeams[0]; // First team is the leader
            westTeams = westTeams.map(team => {
                if (team.id === westLeader.id) {
                    team.conference_games_behind = '-'; // Leader is 0 GB
                } else {
                    const gbValue = ((westLeader.wins - team.wins) + (team.losses - westLeader.losses)) / 2;
                    // Format to one decimal place if not integer, otherwise no decimal
                    team.conference_games_behind = gbValue % 1 === 0 ? gbValue.toString() : gbValue.toFixed(1);
                }
                return team;
            });
        }
        
        // Get bottom 10 teams sorted by most losses (or fewest wins if losses are equal)
        tankingTeams = [...processedTeams].sort((a, b) => {
            if (b.losses !== a.losses) return b.losses - a.losses;
            return a.wins - b.wins; // Fewer wins ranks higher in tanking
        }).slice(0, 10);
        
        // Calculate Tanking Games Behind - in this case, "behind" the worst team
        if (tankingTeams.length > 0) {
            const worstTeam = tankingTeams[0]; // First team is the tanking leader
            tankingTeams = tankingTeams.map((team, index) => {
                // Set tanking rank (1-10) for display purposes
                team.tanking_rank = index + 1;
                
                if (index === 0) {
                    team.tanking_games_behind = '-'; // Worst team is the "leader" for tanking
                } else {
                    // Calculate how far "behind" in the tank race (opposite of normal GB)
                    const gbValue = ((team.wins - worstTeam.wins) + (worstTeam.losses - team.losses)) / 2;
                    // Format to one decimal place if not integer, otherwise no decimal
                    team.tanking_games_behind = gbValue % 1 === 0 ? gbValue.toString() : gbValue.toFixed(1);
                }
                return team;
            });
        }
        
        // Calculate division-specific Games Behind
        const calculateDivisionGB = (teams) => {
            if (teams.length > 0) {
                const divisionLeader = teams[0]; // First team is the leader
                teams = teams.map(team => {
                    if (team.id === divisionLeader.id) {
                        team.division_games_behind = '-'; // Leader is 0 GB
                    } else {
                        const gbValue = ((divisionLeader.wins - team.wins) + (team.losses - divisionLeader.losses)) / 2;
                        // Format to one decimal place if not integer, otherwise no decimal
                        team.division_games_behind = gbValue % 1 === 0 ? gbValue.toString() : gbValue.toFixed(1);
                    }
                    return team;
                });
            }
            return teams;
        };
        
        // Calculate GB for each division
        atlanticTeams = calculateDivisionGB(atlanticTeams);
        centralTeams = calculateDivisionGB(centralTeams);
        southeastTeams = calculateDivisionGB(southeastTeams);
        northwestTeams = calculateDivisionGB(northwestTeams);
        pacificTeams = calculateDivisionGB(pacificTeams);
        southwestTeams = calculateDivisionGB(southwestTeams);
        
        // Populate tables
        try {
            populateTableData('league', allTeams);
            populateTableData('east', eastTeams);
            populateTableData('west', westTeams);
            populateTableData('tanking', tankingTeams);
            populateTableData('atlantic', atlanticTeams);
            populateTableData('central', centralTeams);
            populateTableData('southeast', southeastTeams);
            populateTableData('northwest', northwestTeams);
            populateTableData('pacific', pacificTeams);
            populateTableData('southwest', southwestTeams);
        } catch (populateError) {
            console.error("Error during table population:", populateError);
            throw populateError; // Re-throw to be caught by fetchStandings catch block
        }
    }
    
    /**
     * Populates a standings table with team data
     * @param {string} tableType - The type of table (league, east, west, tanking)
     * @param {Array} teams - Array of team data objects
     */
    function populateTableData(tableType, teams) {
        const tableBody = document.getElementById(`${tableType}-table-body`);
        if (!tableBody) {
            console.error(`Table body not found for type: ${tableType}`);
            return;
        }
        tableBody.innerHTML = '';
        
        teams.forEach((team, index) => {
            const row = document.createElement('tr');
            
            let rankToShow = tableType === 'league' 
                ? index + 1 
                : tableType === 'tanking'
                    ? team.tanking_rank
                    : team.rank;
            // Ensure rank is a valid number
            rankToShow = (typeof rankToShow === 'number' && rankToShow <= 30) ? rankToShow : '-'; 
            
            // Determine playoff/play-in status
            let statusBadge = '';
            if (tableType !== 'tanking' && typeof team.rank === 'number') {
                if (team.rank <= PLAYOFF_THRESHOLD) {
                    statusBadge = '<span class="team-badge playoff">Playoff</span>';
                } else if (team.rank <= PLAYIN_THRESHOLD) {
                    statusBadge = '<span class="team-badge play-in">Play-In</span>';
                }
            } else if (tableType === 'tanking') {
                // For tanking table, show lottery badge for top teams
                statusBadge = '<span class="team-badge tanking">Lottery</span>';
            }
            
            // Format streak
            const streakText = team.streak.count > 0 && team.streak.type !== 'none' ? 
                `<span class="${team.streak.type === 'W' ? 'positive' : 'negative'}">${team.streak.type}${team.streak.count}</span>` : 
                '<span class="neutral">-</span>';
            
            const homeRecord = `<span>${team.home.wins}-${team.home.losses}</span>`;
            const awayRecord = `<span>${team.away.wins}-${team.away.losses}</span>`;
            const last10HTML = `<span>${team.last10.wins}-${team.last10.losses}</span>`;
            
            // Format numbers, showing '0' instead of '0.0' for zero values
            const formatStat = (value, decimals = 1) => {
                const num = Number(value);
                if (isNaN(num)) return '-';
                return num === 0 ? '0' : num.toFixed(decimals);
            };
            
            const winPctFormatted = (team.win_pct * 100).toFixed(1);
            
            // Select the correct GB value based on table type
            const gamesBehindDisplay = tableType === 'league' 
                ? (team.league_games_behind ?? '-') 
                : (tableType === 'east' || tableType === 'west') 
                    ? (team.conference_games_behind || '-') 
                    : (tableType === 'atlantic' || tableType === 'central' || tableType === 'southeast' ||
                       tableType === 'northwest' || tableType === 'pacific' || tableType === 'southwest')
                        ? (team.division_games_behind || '-')
                        : (tableType === 'tanking')
                            ? (team.tanking_games_behind || '-')
                            : (team.games_behind || '-');
            
            const ppgFormatted = formatStat(team.ppg);
            const oppgFormatted = formatStat(team.oppg);
            
            // Format net rating with + sign
            const netRatingFormatted = team.net_rating === 0 ? '<span class="neutral">0.0</span>' : 
                (team.net_rating > 0 ? 
                    `<span class="positive">+${team.net_rating.toFixed(1)}</span>` : 
                    `<span class="negative">${team.net_rating.toFixed(1)}</span>`);

            // Log first row data just before rendering
            if(index === 0 && tableType === 'league') {
                 console.log("[Standings] Rendering first league row with data:", team);
            }

            row.innerHTML = `
                <td class="rank">${rankToShow}</td>
                <td>
                    <div class="team-cell">
                        <img src="${team.logo}" alt="${team.name}" class="team-logo" onerror="this.style.display='none'"> <!-- Hide img if broken -->
                        <span class="team-name">${team.name}</span>
                    </div>
                </td>
                <td class="status-column">${statusBadge}</td>
                <td class="stat-number">${team.games_played || 0}</td>
                <td class="stat-number">${team.wins || 0}</td>
                <td class="stat-number">${team.losses || 0}</td>
                <td class="stat-number">${winPctFormatted}</td>
                <td class="stat-number">${homeRecord}</td>
                <td class="stat-number">${awayRecord}</td>
                <td class="stat-number">${last10HTML}</td>
                <td class="stat-number">${streakText}</td>
                <td class="stat-number"><span class="gb-value">${gamesBehindDisplay}</span></td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Sorts teams in the specified table by the given key
     * @param {string} tableType - The type of table (league, east, west, tanking, etc.)
     * @param {string} sortKey - The key to sort by
     * @param {boolean} ascending - Whether to sort in ascending order
     */
    function sortTeams(tableType, sortKey, ascending) {
        let teamList;
        
        // Get the correct team list based on tableType
        switch(tableType) {
            case 'east': 
                teamList = [...eastTeams]; 
                break;
            case 'west': 
                teamList = [...westTeams]; 
                break;
            case 'tanking': 
                teamList = [...tankingTeams]; 
                break;
            case 'atlantic': 
                teamList = [...atlanticTeams]; 
                break;
            case 'central': 
                teamList = [...centralTeams]; 
                break;
            case 'southeast': 
                teamList = [...southeastTeams]; 
                break;
            case 'northwest': 
                teamList = [...northwestTeams]; 
                break;
            case 'pacific': 
                teamList = [...pacificTeams]; 
                break;
            case 'southwest': 
                teamList = [...southwestTeams]; 
                break;
            case 'league':
            default: 
                teamList = [...allTeams];
                break;
        }
        
        console.log(`[Sort] Sorting ${tableType} table with ${teamList.length} teams by ${sortKey} (${ascending ? 'ascending' : 'descending'})`);
        
        // Sort the team list
        teamList.sort((a, b) => {
            let valA, valB;
            
            // Special handling for specific keys
            switch (sortKey) {
                case 'win_pct':
                    valA = a.win_pct;
                    valB = b.win_pct;
                    break;
                case 'gb': // Games Behind
                    // Use the appropriate Games Behind value based on table type
                    let gbKey;
                    if (tableType === 'league') {
                        gbKey = 'league_games_behind';
                    } else if (tableType === 'east' || tableType === 'west') {
                        gbKey = 'conference_games_behind';
                    } else if (tableType === 'atlantic' || tableType === 'central' || tableType === 'southeast' ||
                              tableType === 'northwest' || tableType === 'pacific' || tableType === 'southwest') {
                        gbKey = 'division_games_behind';
                    } else if (tableType === 'tanking') {
                        gbKey = 'tanking_games_behind';
                    } else {
                        gbKey = 'games_behind';
                    }

                    // Handle '-' as 0 for sorting purposes but display as '-'
                    valA = a[gbKey] === '-' ? 0 : parseFloat(a[gbKey]);
                    valB = b[gbKey] === '-' ? 0 : parseFloat(b[gbKey]);
                    
                    // Invert logic for GB: Ascending means smaller GB is better (higher rank)
                    // For tanking, smaller GB is worse (lower in tanking rank)
                    if (tableType === 'tanking') {
                        // For tanking, we want the opposite ordering
                        return ascending ? valB - valA : valA - valB;
                    } else {
                        return ascending ? valA - valB : valB - valA;
                    }
                case 'home':
                case 'away':
                    // Sort by win percentage for home/away records
                    const recordA = a[sortKey];
                    const recordB = b[sortKey];
                    valA = (recordA.wins + recordA.losses) === 0 ? 0 : recordA.wins / (recordA.wins + recordA.losses);
                    valB = (recordB.wins + recordB.losses) === 0 ? 0 : recordB.wins / (recordB.wins + recordB.losses);
                    break;
                case 'last10':
                    // Sort by wins in last 10
                    valA = a.last10.wins;
                    valB = b.last10.wins;
                    break;
                case 'streak':
                    // Sort by streak type (W > L) then count
                    valA = a.streak.type === 'W' ? a.streak.count : (a.streak.type === 'L' ? -a.streak.count : -Infinity);
                    valB = b.streak.type === 'W' ? b.streak.count : (b.streak.type === 'L' ? -b.streak.count : -Infinity);
                    break;
                default:
                    // Default: Access property directly (works for wins, losses, games_played, etc.)
                    valA = a[sortKey] ?? (ascending ? Infinity : -Infinity); // Handle potential undefined
                    valB = b[sortKey] ?? (ascending ? Infinity : -Infinity);
            }

            // Ensure consistent numeric comparison
            valA = Number(valA) || (ascending ? Infinity : -Infinity);
            valB = Number(valB) || (ascending ? Infinity : -Infinity);

            // Return comparison based on direction
            return ascending ? valA - valB : valB - valA;
        });
        
        // Update the table
        populateTableData(tableType, teamList);
    }
    
    /**
     * Switches active tab
     * @param {string} tabId - ID of the tab to switch to
     */
    function switchTab(tabId) {
        console.log(`[Tab] Switching to tab: ${tabId}`);
        
        // Update tab buttons
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update tab content
        tabContents.forEach(content => {
            if (content.id === `${tabId}-content`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        // Reset sorting indicators in non-active tables
        document.querySelectorAll('.standings-table:not(.active) th.sortable').forEach(header => {
            if (!header.closest('.standings-content').classList.contains('active')) {
                header.classList.remove('sorted', 'asc');
                delete header.dataset.direction;
            }
        });
    }
    
    /**
     * Shows loading state
     */
    function showLoading() {
        loadingContainer.style.display = 'block';
        errorContainer.style.display = 'none';
        standingsContent.style.display = 'none';
    }
    
    /**
     * Shows content
     */
    function showContent() {
        loadingContainer.style.display = 'none';
        errorContainer.style.display = 'none';
        standingsContent.style.display = 'block';
    }
    
    /**
     * Shows error state
     */
    function showError() {
        loadingContainer.style.display = 'none';
        errorContainer.style.display = 'block';
        standingsContent.style.display = 'none';
    }
    
    // Add event listeners to table headers for sorting
    function setupSortingListeners() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const sortKey = this.dataset.sort;
                const tableType = this.closest('table').id.replace('-table', '');
                const tableBody = document.getElementById(`${tableType}-table-body`);
                
                // Only proceed if the table is currently visible
                const isVisible = document.getElementById(`${tableType}-content`).classList.contains('active');
                if (!isVisible) {
                    console.log(`[Sort] Table ${tableType} is not visible, skipping sort`);
                    return;
                }
                
                console.log(`[Sort] Sorting ${tableType} table by ${sortKey}`);
                
                // Get all headers in this specific table
                const headers = this.closest('table').querySelectorAll('th.sortable');
                
                // Remove sorted class from all headers in this table
                headers.forEach(h => {
                    h.classList.remove('sorted', 'asc');
                });
                
                // Add sorted class to the clicked header
                this.classList.add('sorted');
                
                // Toggle sort direction if clicking the same header again
                let sortDirection = 'desc';
                if (this.dataset.direction === 'desc') {
                    sortDirection = 'asc';
                    this.classList.add('asc');
                }
                this.dataset.direction = sortDirection;
                
                // Call sortTeams with the appropriate parameters
                sortTeams(tableType, sortKey, sortDirection === 'asc');
            });
        });
    }
    
    /**
     * Restores the default sort for the specified table type
     * @param {string} tableType - The type of table to restore default sort for
     */
    function restoreDefaultSort(tableType) {
        const tableId = `${tableType}-table`;
        const table = document.getElementById(tableId);
        
        if (!table) return;
        
        // Find the default sorted column (has 'sorted' class in HTML)
        const defaultSortedHeader = table.querySelector('th.sortable.sorted');
        
        if (defaultSortedHeader) {
            // Remove sorted class from all headers
            table.querySelectorAll('th.sortable').forEach(header => {
                header.classList.remove('sorted', 'asc');
                delete header.dataset.direction;
            });
            
            // Add sorted class to default header
            defaultSortedHeader.classList.add('sorted');
            
            // Default sort direction is descending
            defaultSortedHeader.dataset.direction = 'desc';
            
            // Sort the table with default column and direction
            const sortKey = defaultSortedHeader.dataset.sort;
            sortTeams(tableType, sortKey, false); // false = descending
        }
    }
    
    // Initialize the page
    init();
    
    // For development/testing - fall back to mock data if needed
    function loadMockData() {
        // Mock data for development and testing
        const mockStandings = [
            {
                team: { id: 2, name: "Boston Celtics", nickname: "Celtics", code: "BOS" },
                conference: { name: "East", rank: 1 },
                division: { name: "Atlantic", rank: 1 },
                games: { 
                    played: 82, 
                    win: { total: 64, home: 33, away: 31, percentage: 0.780 }, 
                    loss: { total: 18, home: 8, away: 10 },
                    last_10: { win: 8, loss: 2 }
                },
                streak: { count: 6, type: "W" },
                points: { for: 120.5, against: 109.5 }
            },
            // Add more mock teams here...
        ];
        
        // Process mock data if API fails
        processStandingsData(mockStandings);
        showContent();
    }
    
    // Fallback to mock data if needed (commented out)
    // setTimeout(loadMockData, 1000);
}); 