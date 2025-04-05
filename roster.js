document.addEventListener('DOMContentLoaded', () => {
    console.log('[Roster] DOM Loaded. Initializing...'); // Log 1
    const rosterTableBody = document.getElementById('roster-table-body');
    const rosterErrorMessage = document.getElementById('roster-error-message');

    // Set initial loading message
    if (rosterTableBody) {
        rosterTableBody.innerHTML = `<tr><td colspan="9" class="loading-cell" style="text-align: center; padding: 20px;">Loading Celtics roster for 2024-2025 season...</td></tr>`; 
    } else {
        console.error("[Roster] Critical Error: Cannot find element with ID 'roster-table-body'.");
        if(rosterErrorMessage) rosterErrorMessage.textContent = "Error initializing roster table.";
        if(rosterErrorMessage) rosterErrorMessage.style.display = 'block';
        return; // Stop script execution
    }

    const SEASON = '2024'; // 2024-2025 season identifier for API
    const clientSideDelay = 1600; // Delay between stats API calls

    // --- Helper function to check if a local image exists --- 
    function checkImageExists(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true); // Image loaded successfully
            img.onerror = () => resolve(false); // Image failed to load (doesn't exist or error)
            img.src = url;
        });
    }

    // Function to fetch player stats from our server endpoint
    async function fetchPlayerStats(playerId) {
        console.log(`[Roster] Fetching 2024-2025 stats for Player ID: ${playerId}`); 
        try {
            const response = await fetch(`/api/player/${playerId}/stats`); // Season is handled server-side
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); 
                console.error(`[Roster] Error fetching stats for player ${playerId}: ${response.status}`, errorData);
                return { 
                    playerName: errorData.playerName || 'Player', 
                    playerTeam: errorData.playerTeam || 'Team', 
                    error: errorData.error || `HTTP error ${response.status}` 
                };
            }
            const stats = await response.json();
            console.log(`[Roster] Received 2024-2025 stats for Player ID: ${playerId}`, stats); 
            return stats;
        } catch (error) {
            console.error(`[Roster] Network or other error fetching stats for player ${playerId}:`, error);
            return { playerName: 'Player', playerTeam: 'Team', error: 'Network error fetching stats' };
        }
    }

    // Function to create a player row in the table
    function createPlayerRow(player) {
        const row = document.createElement('tr');
        row.id = `player-row-${player.id}`; 
        row.innerHTML = `
            <td class="player-img-cell"><img src="${player.image}" alt="${player.name || 'Player'}"></td>
            <td>${player.name || 'Fetching name...'}</td>
            <td>${player.position || 'N/A'}</td>
            <td class="stat-col loading-cell" id="ppg-${player.id}">...</td>
            <td class="stat-col loading-cell" id="rpg-${player.id}">...</td>
            <td class="stat-col loading-cell" id="apg-${player.id}">...</td>
            <td class="stat-col loading-cell" id="spg-${player.id}">...</td>
            <td class="stat-col loading-cell" id="bpg-${player.id}">...</td>
            <td class="stat-col loading-cell" id="gp-${player.id}">...</td>
        `;
        return row;
    }

    // Function to update stats in the player row
    function updatePlayerStats(playerId, statsData) {
        const playerRow = document.getElementById(`player-row-${playerId}`);
        if (!playerRow) {
            console.warn(`[Roster] Could not find table row for player ${playerId}`);
            return;
        }
        
        // Update name if provided by API and different from default
        const nameCell = playerRow.cells[1]; // Second cell is Player name
        if (nameCell && statsData.playerName && statsData.playerName !== 'Player') {
            nameCell.textContent = statsData.playerName;
        }
        
        // Update stats cells
        const ppgCell = document.getElementById(`ppg-${playerId}`);
        const rpgCell = document.getElementById(`rpg-${playerId}`);
        const apgCell = document.getElementById(`apg-${playerId}`);
        const spgCell = document.getElementById(`spg-${playerId}`);
        const bpgCell = document.getElementById(`bpg-${playerId}`);
        const gpCell = document.getElementById(`gp-${playerId}`);

        // Clear loading class
         [ppgCell, rpgCell, apgCell, spgCell, bpgCell, gpCell].forEach(cell => {
             if (cell) cell.classList.remove('loading-cell');
         });

        if (statsData.error) {
            // Display error across stat cells
             const errorText = `Error: ${statsData.error}`;
             [ppgCell, rpgCell, apgCell, spgCell, bpgCell, gpCell].forEach(cell => {
                 if(cell) {
                     cell.textContent = '-';
                     cell.classList.add('error-cell'); 
                     cell.title = errorText; // Show full error on hover
                 }
             });
             // Make GP cell show the error explicitly
             if (gpCell) gpCell.textContent = 'Error';
             
        } else if (statsData.gamesPlayed > 0) {
            // Populate stats
            if (ppgCell) ppgCell.textContent = statsData.ppg || 'N/A';
            if (rpgCell) rpgCell.textContent = statsData.rpg || 'N/A';
            if (apgCell) apgCell.textContent = statsData.apg || 'N/A';
            if (spgCell) spgCell.textContent = statsData.spg || 'N/A';
            if (bpgCell) bpgCell.textContent = statsData.bpg || 'N/A';
            if (gpCell) gpCell.textContent = statsData.gamesPlayed;
        } else {
            // Handle case where games played is 0 (or stats object was valid but empty)
             const noGamesText = `No games in ${SEASON}`;
             [ppgCell, rpgCell, apgCell, spgCell, bpgCell].forEach(cell => {
                 if(cell) {
                     cell.textContent = '0.0'; // Or '-', depending on preference
                     cell.classList.add('error-cell');
                     cell.title = noGamesText;
                 }
             });
            if(gpCell) {
                 gpCell.textContent = '0';
                 gpCell.classList.add('error-cell');
                 gpCell.title = noGamesText;
             }
        }
    }
    
    // --- Main Logic --- 
    async function loadAndDisplayRoster() {
        try {
            // 1. Fetch ALL Celtics players from API
            console.log('[Roster] Fetching Celtics players list from API.');
            const response = await fetch('/api/players/celtics');
            console.log('[Roster] Player list API response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status} fetching Celtics players`);
            }
            const allPlayers = await response.json();
            console.log(`[Roster] Received ${allPlayers.length} players from API.`);

            if (!Array.isArray(allPlayers)) {
                throw new Error("Invalid player data received from API.");
            }

            // 2. Check local image existence for each player
            console.log('[Roster] Checking for local images...');
            const imageChecks = allPlayers.map(async (player) => {
                 // Construct expected image path based on API data mapping in server.js
                 const expectedImagePath = `images/players/${player.name.split(' ').pop().toLowerCase()}.jpg`; 
                 const hasImage = await checkImageExists(expectedImagePath);
                 return hasImage ? { ...player, image: expectedImagePath } : null; // Return player data only if image exists
            });
            
            const results = await Promise.allSettled(imageChecks);
            const playersWithImages = results
                .filter(result => result.status === 'fulfilled' && result.value !== null)
                .map(result => result.value);
                
            console.log(`[Roster] Found ${playersWithImages.length} players with local images.`);

            // 3. Display table and fetch stats for filtered players
            rosterTableBody.innerHTML = ''; // Clear loading message

            if (playersWithImages.length === 0) {
                 rosterTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No Celtics players found with available local images.</td></tr>';
                 return;
            }
            
            // Display initial rows for players with images
            playersWithImages.forEach(player => {
                const playerRow = createPlayerRow(player);
                rosterTableBody.appendChild(playerRow);
            });
            
            // Sequentially fetch and update stats for players with images
            console.log('[Roster] Starting loop to fetch stats for players with images...'); 
            for (const player of playersWithImages) {
                console.log(`[Roster] Fetching stats for: ${player.name} (ID: ${player.id})`); 
                const stats = await fetchPlayerStats(player.id);
                updatePlayerStats(player.id, stats);
                
                console.log(`[Roster] Waiting ${clientSideDelay}ms...`); 
                await new Promise(resolve => setTimeout(resolve, clientSideDelay)); 
            }
            console.log('[Roster] Finished fetching player stats.');

        } catch (error) {
            console.error('[Roster] Failed to load roster:', error);
            if(rosterTableBody) rosterTableBody.innerHTML = ''; // Clear any partial rows
            if(rosterErrorMessage) rosterErrorMessage.textContent = `Failed to load roster data: ${error.message}`;
            if(rosterErrorMessage) rosterErrorMessage.style.display = 'block';
        }
    }

    // Initial load
    loadAndDisplayRoster();

}); 