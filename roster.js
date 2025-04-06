document.addEventListener('DOMContentLoaded', () => {
    const rosterTableBody = document.getElementById('roster-table-body');
    const rosterTableHead = document.getElementById('roster-table-head');
    const loadingContainer = document.getElementById('loading-container');
    const errorContainer = document.getElementById('error-container');
    const rosterTableContainer = document.getElementById('roster-table-container');
    const retryButton = document.getElementById('retry-button');

    // Store the original player data
    let allPlayers = [];
    let currentSortColumn = 3; // Default sort by PPG
    let currentSortDirection = 'desc'; // Default sort direction
    
    // Define columns with their display names and sortable status
    const columns = [
        { name: 'PLAYER', sortable: true, key: 'name' },
        { name: 'POS', sortable: true, key: 'position' },
        { name: 'GP', sortable: true, key: 'gp' },
        { name: 'PPG', sortable: true, key: 'ppg' },
        { name: 'RPG', sortable: true, key: 'rpg' },
        { name: 'APG', sortable: true, key: 'apg' },
        { name: 'FG%', sortable: true, key: 'fg_pct' },
        { name: '3P%', sortable: true, key: 'tp_pct' },
        { name: 'FT%', sortable: true, key: 'ft_pct' },
        { name: 'FGM/FGA', sortable: true, key: 'fgm_fga' },
        { name: '3PM/3PA', sortable: true, key: 'tpm_tpa' },
        { name: 'STL', sortable: true, key: 'stl' },
        { name: 'BLK', sortable: true, key: 'blk' },
        { name: 'TOV', sortable: true, key: 'tov' },
        { name: '+/-', sortable: true, key: 'plus_minus' }
    ];

    // Define players with known images (lowercase for easier matching)
    const playersWithImages = [
        'tatum', 'brown', 'white', 'holiday', 'porzingis', 'horford', 
        'hauser', 'pritchard', 'kornet', 'queta', 'walsh', 'scheierman'
    ];

    // Map of player names to IDs (used to filter which players to display)
    const playerIdsToFetch = {
        'tatum': 882, 
        'brown': 75,
        'white': 897,
        'holiday': 242,
        'porzingis': 432,
        'horford': 248, 
        'hauser': 2812,
        'pritchard': 2635,
        'kornet': 819,
        'queta': 2844,
        'walsh': 3943,
        'scheierman': 4092 // Include the rookie if needed
    };

    async function fetchAndDisplayRoster() {
        try {
            // Construct the playerIds query parameter
            const playerIdsString = Object.values(playerIdsToFetch).join(',');
            const currentSeason = '2024'; // Fetching 2024 season data
            
            console.log(`[Roster] Fetching roster data for season ${currentSeason}, player IDs: ${playerIdsString}`);
            const response = await fetch(`/api/roster?season=${currentSeason}&playerIds=${playerIdsString}`); 
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Try to get error details
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log("[Roster] Received data for", data ? data.length : 0, "players");
            
            if (!data || !Array.isArray(data)) { // Check if data is valid array
                 throw new Error("Invalid data received from server.");
            }
            
            // Process data: Calculate stats, format, sort, filter by date
            const processedPlayers = processPlayerData(data);
            console.log("[Roster] Processed", processedPlayers.length, "players with valid games successfully");
            
            // Populate table, even if processedPlayers is empty after filtering
            populateTable(processedPlayers);
            showTable();

        } catch (error) {
            console.error('[Roster] Error fetching or displaying roster:', error.message);
            showError(); // Show the generic error message container
        }
    }

    function processPlayerData(apiData) {
        console.log("[Roster] Processing API data...");
        
        return apiData
            .map(item => {
                // Basic player info
                const player = item.player || {};
                const firstName = player.firstname || 'Unknown';
                const lastName = player.lastname || 'Player';
                const fullName = `${firstName} ${lastName}`;
                const lastNameLower = lastName.toLowerCase();

                // Set image URL (use default if specific image not found)
                const photoUrl = playersWithImages.includes(lastNameLower)
                    ? `images/players/${lastNameLower}.jpg`
                    : 'images/players/default.jpg';

                // Extract jersey number with enhanced debugging and fallbacks
                let jerseyNumber = '';
                if (player.leagues?.standard?.jersey) {
                    jerseyNumber = player.leagues.standard.jersey;
                } else if (player.jersey) {
                    jerseyNumber = player.jersey;
                } else if (player.leagues?.nba?.jersey) {
                    jerseyNumber = player.leagues.nba.jersey;
                }
                
                // Manual override for specific players
                if (lastNameLower === 'tatum') {
                    jerseyNumber = '0';
                    console.log(`[Roster] Applied manual jersey number for ${fullName}`);
                } else if (lastNameLower === 'scheierman') { // Assuming Scheierman is Baylor
                    jerseyNumber = '55';
                    console.log(`[Roster] Applied manual jersey number for ${fullName}`);
                }
                
                console.log(`[Roster] Jersey number for ${fullName}: ${jerseyNumber || 'NOT FOUND'}`);
                
                // Basic details
                const position = player.leagues?.standard?.pos || 'N/A';

                // Extract the statistics array (ensure it's always an array)
                const statsResponse = (item.statistics && Array.isArray(item.statistics.response))
                    ? item.statistics.response
                    : [];
                
                // Calculate season stats using the filtered game data
                const seasonStats = calculateSeasonStats(statsResponse);
                
                // Get games played (GP)
                const gamesPlayed = seasonStats.games;
                
                // Return formatted player data object
                return {
                    id: player.id,
                    name: fullName,
                    photo: photoUrl,
                    position: position,
                    jersey: jerseyNumber,
                    gp: gamesPlayed || '-', // Games played
                    ppg: formatStat(seasonStats.points, gamesPlayed),
                    rpg: formatStat(seasonStats.totReb, gamesPlayed),
                    apg: formatStat(seasonStats.assists, gamesPlayed),
                    fg_pct: formatPercentage(seasonStats.fgp),
                    tp_pct: formatPercentage(seasonStats.tpp),
                    ft_pct: formatPercentage(seasonStats.ftp),
                    fgm_fga: formatShooting(seasonStats.fgm, seasonStats.fga, gamesPlayed),
                    tpm_tpa: formatShooting(seasonStats.tpm, seasonStats.tpa, gamesPlayed),
                    stl: formatStat(seasonStats.steals, gamesPlayed),
                    blk: formatStat(seasonStats.blocks, gamesPlayed),
                    tov: formatStat(seasonStats.turnovers, gamesPlayed),
                    plus_minus: formatPlusMinus(seasonStats.plusMinus, gamesPlayed)
                };
            })
            .filter(player => player.gp > 0) // Filter out players with 0 GP after calculations
            .sort((a, b) => { // Sort by PPG (descending)
                const ppgA = a.ppg === '-' ? -1 : parseFloat(a.ppg);
                const ppgB = b.ppg === '-' ? -1 : parseFloat(b.ppg);
                return ppgB - ppgA;
            });
    }
    
    function calculateSeasonStats(games) {
        // Comment out the date filtering for now since 2024-2025 season data is not yet available
        // const regularSeasonStartDate = new Date('2024-10-22'); 
        console.log(`[Stats] Processing all ${games.length} game entries for 2024 season`);
        
        let gamesPlayed = 0;
        let totalPoints = 0, totalAssists = 0, totalRebounds = 0;
        let totalSteals = 0, totalBlocks = 0, totalTurnovers = 0;
        let totalPlusMinus = 0;
        let fgMade = 0, fgAttempted = 0;
        let tpMade = 0, tpAttempted = 0;
        let ftMade = 0, ftAttempted = 0;
        
        const processedGameIds = new Set();
        const validGames = [];
        
        games.forEach(game => {
            // Basic Validity Checks
            if (!game || !game.game) {
                console.log('[Stats] Skipping game - missing game data');
                return; // Skip if essential data is missing
            }
            
            // Skip DNP games
            const minutes = safeParseInt(game.min);
            if (minutes <= 0) {
                console.log('[Stats] Skipping game - DNP (0 minutes)');
                return;
            }

            // Removed date filtering - temporarily show all 2024 season games

            // Skip duplicate games
            const gameId = game.game.id;
            if (processedGameIds.has(gameId)) {
                console.log(`[Stats] Skipping duplicate game ID: ${gameId}`);
                return; 
            }
            
            // Valid game - count it
            processedGameIds.add(gameId);
            validGames.push(game);
            
            // Count this game
            gamesPlayed++;
            
            // Accumulate statistics
            totalPoints += safeParseInt(game.points);
            totalAssists += safeParseInt(game.assists);
            totalRebounds += safeParseInt(game.totReb);
            totalSteals += safeParseInt(game.steals);
            totalBlocks += safeParseInt(game.blocks);
            totalTurnovers += safeParseInt(game.turnovers);
            if (game.plusMinus !== undefined) totalPlusMinus += safeParseInt(game.plusMinus);
            fgMade += safeParseInt(game.fgm);
            fgAttempted += safeParseInt(game.fga);
            tpMade += safeParseInt(game.tpm);
            tpAttempted += safeParseInt(game.tpa);
            ftMade += safeParseInt(game.ftm);
            ftAttempted += safeParseInt(game.fta);
        });
        
        console.log(`[Stats] Found ${gamesPlayed} valid 2024 season games`);
        
        // Calculate averages and percentages (handle division by zero)
        const calculateAverage = (total, gp) => gp > 0 ? total / gp : 0;
        const calculatePercentage = (made, attempted) => attempted > 0 ? (made / attempted) : 0; // Returns decimal 0-1

        return {
            games: gamesPlayed,
            points: calculateAverage(totalPoints, gamesPlayed),
            assists: calculateAverage(totalAssists, gamesPlayed),
            totReb: calculateAverage(totalRebounds, gamesPlayed),
            steals: calculateAverage(totalSteals, gamesPlayed),
            blocks: calculateAverage(totalBlocks, gamesPlayed),
            turnovers: calculateAverage(totalTurnovers, gamesPlayed),
            plusMinus: calculateAverage(totalPlusMinus, gamesPlayed),
            fgm: fgMade, fga: fgAttempted, 
            tpm: tpMade, tpa: tpAttempted,
            ftm: ftMade, fta: ftAttempted,
            fgp: calculatePercentage(fgMade, fgAttempted), // Field Goal Percentage (decimal)
            tpp: calculatePercentage(tpMade, tpAttempted), // Three Point Percentage (decimal)
            ftp: calculatePercentage(ftMade, ftAttempted)  // Free Throw Percentage (decimal)
        };
    }
    
    // Helper parsing functions
    function safeParseInt(value) {
        if (value === null || value === undefined || value === "") return 0;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    
    function safeParseFloat(value) {
        if (value === null || value === undefined || value === "") return 0;
        // Handle percentage strings (e.g., "40.0")
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    // Helper formatting functions for display
    function formatStat(value, gamesPlayed) {
        if (!gamesPlayed || typeof value !== 'number' || isNaN(value)) return '-';
        return value.toFixed(1);
    }
    
    function formatPercentage(value) { // Expects decimal 0-1
        if (typeof value !== 'number' || isNaN(value)) return '-';
        return (value * 100).toFixed(1); // Convert to percentage string
    }
    
    function formatShooting(makes, attempts, gamesPlayed) {
        if (!gamesPlayed || typeof makes !== 'number' || typeof attempts !== 'number') return '-';
        const makesPerGame = gamesPlayed > 0 ? makes / gamesPlayed : 0;
        const attemptsPerGame = gamesPlayed > 0 ? attempts / gamesPlayed : 0;
        return `${makesPerGame.toFixed(1)}/${attemptsPerGame.toFixed(1)}`;
    }
    
    function formatPlusMinus(value, gamesPlayed) {
        if (!gamesPlayed || typeof value !== 'number' || isNaN(value)) return '-';
        const formatted = value.toFixed(1);
        return value > 0 ? `+${formatted}` : formatted;
    }

    function populateTable(players) {
        console.log(`[Roster] Populating table with ${players.length} players`);
        rosterTableBody.innerHTML = ''; // Clear existing rows
        
        // Store the full player list for filtering
        allPlayers = [...players];
        
        if (players.length === 0) {
            // Updated message for all 2024 season data
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `<td colspan="15" class="no-data">No player statistics available for the 2024 season.</td>`;
            rosterTableBody.appendChild(noDataRow);
            return; // Stop here if no players to display
        }
        
        players.forEach(player => {
            const row = document.createElement('tr');
            // Use template literals for cleaner HTML construction
            row.innerHTML = `
                <td class="player-cell">
                    <img src="${player.photo}" alt="${player.name}" class="player-photo" onerror="this.src='images/players/default.jpg'; this.style.marginLeft='0';">
                    <span style="margin-left: 10px;">
                       ${player.jersey ? `<span class="player-number">#${player.jersey}</span>` : ''}
                       <span class="player-name">${player.name}</span>
                    </span>
                </td>
                <td><span class="position-badge">${player.position || 'N/A'}</span></td>
                <td>${player.gp}</td>
                <td class="stat-highlight">${player.ppg}</td>
                <td>${player.rpg}</td>
                <td>${player.apg}</td>
                <td>${player.fg_pct}%</td>
                <td>${player.tp_pct}%</td>
                <td>${player.ft_pct}%</td> 
                <td>${player.fgm_fga}</td>
                <td>${player.tpm_tpa}</td>
                <td>${player.stl}</td>
                <td>${player.blk}</td>
                <td>${player.tov}</td>
                <td>${player.plus_minus}</td>
            `;
            rosterTableBody.appendChild(row);
        });
    }

    // Add sort headers to the table
    function setupTableFilters() {
        // Create header row
        const headerRow = document.createElement('tr');
        
        // For each column, create a th with sort arrows if sortable
        columns.forEach((column, index) => {
            const th = document.createElement('th');
            
            // Set appropriate class for stats columns
            if (index >= 2) {
                th.className = 'stat-number';
            }
            
            if (column.sortable) {
                th.className += ' sortable';
                th.textContent = column.name;
                
                if (index === currentSortColumn) {
                    th.className += ' sorted';
                    if (currentSortDirection === 'asc') {
                        th.className += ' asc';
                    }
                }
                
                th.dataset.sortKey = column.key;
                th.addEventListener('click', () => sortTable(index, column.key));
            } else {
                th.textContent = column.name;
            }
            
            headerRow.appendChild(th);
        });
        
        // Add the header row to the table head
        if (rosterTableHead) {
            rosterTableHead.innerHTML = '';
            rosterTableHead.appendChild(headerRow);
        }
    }
    
    // Sort the table based on column clicked
    function sortTable(columnIndex, sortKey) {
        // Update sort direction
        if (currentSortColumn === columnIndex) {
            // Toggle direction if same column clicked
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New column, default to descending for numeric columns, ascending for text
            currentSortDirection = columnIndex === 0 || columnIndex === 1 ? 'asc' : 'desc';
            currentSortColumn = columnIndex;
        }
        
        console.log(`[Roster] Sorting by column ${sortKey} in ${currentSortDirection} order`);
        
        // Clone the array to avoid mutating the original
        const sortedPlayers = [...allPlayers];
        
        // Sort based on column type
        sortedPlayers.sort((a, b) => {
            let valueA, valueB;
            
            // Special handling for player name column
            if (columnIndex === 0) {
                valueA = a.name.toLowerCase();
                valueB = b.name.toLowerCase();
                return currentSortDirection === 'asc' 
                    ? valueA.localeCompare(valueB)
                    : valueB.localeCompare(valueA);
            }
            
            // Special handling for position column
            if (columnIndex === 1) {
                valueA = a.position.toLowerCase();
                valueB = b.position.toLowerCase();
                return currentSortDirection === 'asc' 
                    ? valueA.localeCompare(valueB)
                    : valueB.localeCompare(valueA);
            }
            
            // Special handling for shooting columns (FGM/FGA and 3PM/3PA)
            if (columnIndex === 9 || columnIndex === 10) {
                // Extract first number (makes) from the string (e.g., "9.0/20.1" -> 9.0)
                valueA = parseFloat(a[sortKey].split('/')[0]);
                valueB = parseFloat(b[sortKey].split('/')[0]);
                
                // Handle non-numeric values
                if (isNaN(valueA)) valueA = -9999;
                if (isNaN(valueB)) valueB = -9999;
                
                return currentSortDirection === 'asc' 
                    ? valueA - valueB
                    : valueB - valueA;
            }
            
            // Regular numeric columns
            valueA = parseFloat(a[sortKey]);
            valueB = parseFloat(b[sortKey]);
            
            // Handle non-numeric values
            if (isNaN(valueA)) valueA = -9999;
            if (isNaN(valueB)) valueB = -9999;
            
            return currentSortDirection === 'asc' 
                ? valueA - valueB
                : valueB - valueA;
        });
        
        // Update the table with sorted players
        updateFilteredTable(sortedPlayers);
        
        // Update arrow styling
        updateSortArrows();
    }
    
    // Update the sort arrow styling
    function updateSortArrows() {
        // Clear all sorted classes
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sorted', 'asc');
        });
        
        // Set sorted class on the active header
        const activeHeader = document.querySelector(`th.sortable[data-sort-key="${columns[currentSortColumn].key}"]`);
        if (activeHeader) {
            activeHeader.classList.add('sorted');
            if (currentSortDirection === 'asc') {
                activeHeader.classList.add('asc');
            }
        }
    }

    // UI related functions
    function showTable() {
        loadingContainer.style.display = 'none';
        errorContainer.style.display = 'none';
        rosterTableContainer.style.display = 'block';
        setupTableFilters(); // Setup filters after the table is displayed
    }
    
    function showError() {
        loadingContainer.style.display = 'none';
        errorContainer.style.display = 'block';
        rosterTableContainer.style.display = 'none';
    }
    
    function showLoading() {
        loadingContainer.style.display = 'block';
        errorContainer.style.display = 'none';
        rosterTableContainer.style.display = 'none';
    }

    // Add timeout for loading
    async function fetchAndDisplayRosterWithTimeout() {
        showLoading();
        const timeoutDuration = 20000; // Increased timeout to 20 seconds
        let fetchTimeout = null;

        const fetchPromise = fetchAndDisplayRoster();
        const timeoutPromise = new Promise((_, reject) => {
            fetchTimeout = setTimeout(() => {
                console.error(`[Roster] Fetch timeout after ${timeoutDuration}ms`);
                reject(new Error("Loading roster data took too long."));
            }, timeoutDuration);
        });

        try {
            await Promise.race([fetchPromise, timeoutPromise]);
            clearTimeout(fetchTimeout); // Clear timeout if fetch completes first
        } catch (error) {
            console.error("[Roster] Error during fetch or timeout:", error.message);
            showError(); // Show error UI
            clearTimeout(fetchTimeout); // Ensure timeout is cleared on error
        }
    }

    // Setup event handlers
    if (retryButton) {
        retryButton.addEventListener('click', fetchAndDisplayRosterWithTimeout);
    }
    
    // Initial fetch on page load
    fetchAndDisplayRosterWithTimeout();

    // Update table with sorted players
    function updateFilteredTable(sortedPlayers) {
        rosterTableBody.innerHTML = ''; // Clear existing rows
        
        if (sortedPlayers.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `<td colspan="15" class="no-data">No players match your criteria.</td>`;
            rosterTableBody.appendChild(noDataRow);
            return;
        }
        
        sortedPlayers.forEach(player => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="player-cell">
                    <img src="${player.photo}" alt="${player.name}" class="player-photo" onerror="this.src='images/players/default.jpg'; this.style.marginLeft='0';">
                    <span style="margin-left: 10px;">
                       ${player.jersey ? `<span class="player-number">#${player.jersey}</span>` : ''}
                       <span class="player-name">${player.name}</span>
                    </span>
                </td>
                <td><span class="position-badge">${player.position || 'N/A'}</span></td>
                <td>${player.gp}</td>
                <td class="stat-highlight">${player.ppg}</td>
                <td>${player.rpg}</td>
                <td>${player.apg}</td>
                <td>${player.fg_pct}%</td>
                <td>${player.tp_pct}%</td>
                <td>${player.ft_pct}%</td> 
                <td>${player.fgm_fga}</td>
                <td>${player.tpm_tpa}</td>
                <td>${player.stl}</td>
                <td>${player.blk}</td>
                <td>${player.tov}</td>
                <td>${player.plus_minus}</td>
            `;
            rosterTableBody.appendChild(row);
        });
    }
}); 