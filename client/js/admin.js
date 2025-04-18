// Admin Dashboard JavaScript

// Global variables
let allUsers = [];
let currentPage = 1;
const usersPerPage = 10;
let sortField = 'name';
let sortDirection = 'asc';
let activeTicketsUserId = null;
let allTickets = [];

// Check if server is already initialized to prevent duplicate tickets loading
let serverInitialized = false;

// Function to show notification messages
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '80px';
        container.style.right = '20px';
        container.style.zIndex = '1000';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `toast ${type}`;
    
    // Add icon based on type
    let icon;
    if (type === 'success') {
        icon = 'check-circle';
    } else if (type === 'error') {
        icon = 'exclamation-circle';
    } else if (type === 'warning') {
        icon = 'exclamation-triangle';
    } else {
        icon = 'info-circle';
    }
    
    notification.innerHTML = `
        <i class="fas fa-${icon}" aria-hidden="true"></i>
        <span>${message}</span>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Remove after timeout
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Check admin status on page load
document.addEventListener('DOMContentLoaded', function() {
    try {
        // This is a safer initialization method to make sure everything is loaded
        console.log("DOM Content Loaded - Initializing admin dashboard");
        
        if (serverInitialized) {
            console.log("Server already initialized, skipping duplicate initialization");
            return;
        }
        
        serverInitialized = true;
        
        // Setup tabs
        const userTab = document.querySelector('[data-tab="users"]');
        const ticketsTab = document.querySelector('[data-tab="tickets"]');
        
        if (userTab) {
            userTab.addEventListener('click', function() {
                switchTab('users');
            });
        }
        
        if (ticketsTab) {
            ticketsTab.addEventListener('click', function() {
                switchTab('tickets');
            });
        }
        
        // Initialize event listeners for user search and filter
        const userSearch = document.getElementById('user-search');
        const roleFilter = document.getElementById('role-filter');
        
        if (userSearch) {
            console.log("Setting up user search listener");
            userSearch.addEventListener('input', function() {
                filterUsers();
            });
        } else {
            console.error("User search element not found");
        }
        
        if (roleFilter) {
            console.log("Setting up role filter listener");
            roleFilter.addEventListener('change', function() {
                filterUsers();
            });
        } else {
            console.error("Role filter element not found");
        }
        
        // Initialize event listeners for ticket filters
        const ownerFilter = document.getElementById('ticket-owner-filter');
        const gameFilter = document.getElementById('ticket-game-filter');
        const sectionFilter = document.getElementById('ticket-section-filter');
        const statusFilter = document.getElementById('ticket-status-filter');
        
        if (ownerFilter) {
            ownerFilter.addEventListener('change', filterTickets);
        }
        
        if (gameFilter) {
            gameFilter.addEventListener('change', filterTickets);
        }
        
        if (sectionFilter) {
            sectionFilter.addEventListener('change', filterTickets);
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', filterTickets);
        }
        
        // Load tickets only if we're starting on the tickets tab
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'ticketsTab') {
            // Add a slight delay to ensure everything is properly initialized
            setTimeout(() => {
                loadTickets();
            }, 100);
        } else {
            // Otherwise, default to loading users
            checkAdminStatus();
        }
    } catch (error) {
        console.error("Error during initialization:", error);
        showNotification('Error initializing admin dashboard: ' + error.message, 'error');
    }
});

// Function to check admin status
async function checkAdminStatus() {
    try {
        const response = await fetch('/api/user/profile', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            const status = response.status;
            
            if (status === 401 || status === 403) {
                showNotification('Please log in to access admin panel', 'error');
                setTimeout(() => {
                    window.location.href = '/login?redirect=/admin';
                }, 1500);
            } else {
                showNotification(`Server error (${status}). Please try again later.`, 'error');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            }
            return;
        }
        
        const data = await response.json();
        
        if (!data.isAuthenticated) {
            showNotification('Please log in to access admin panel', 'error');
            setTimeout(() => {
                window.location.href = '/login?redirect=/admin';
            }, 1500);
            return;
        }
        
        if (!data.isAdmin) {
            showNotification('Access Denied: Admin privileges required', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            return;
        }
        
        // Store admin user id for later reference
        localStorage.setItem('adminId', data.userId);
        
        // User is admin, load users
        loadUsers();
        
    } catch (error) {
        console.error('Error checking admin status:', error);
        showNotification('Connection error. Please try again.', 'error');
    }
}

// Load users from the server
async function loadUsers() {
    try {
        // Update loading state in UI
        const userCountElement = document.querySelector('.user-count');
        if (userCountElement) {
            userCountElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading users...';
        }
        
        // Hide any existing loading elements
        const loadingElements = document.querySelectorAll('.loading-container, .loading-indicator, .loading-row');
        loadingElements.forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        const usersTableBody = document.getElementById('users-table-body');
        if (!usersTableBody) {
            console.error('Users table body element not found');
            showNotification('Error: Users table body element not found', 'error');
            return; // Exit early since we need this element
        }
        
        // Show loading indicator in table
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-row">
                    <i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading users...
                </td>
            </tr>
        `;
        
        const response = await fetch('/api/admin/users', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        // Store users in global array for filtering/sorting
        allUsers = await response.json();
        console.log(`Loaded ${allUsers.length} users successfully`);
        
        // Update user count safely
        if (userCountElement) {
            userCountElement.innerHTML = `<i class="fas fa-users"></i> ${allUsers.length} Users`;
        }
        
        // Clear loading indicator
        if (usersTableBody) {
            usersTableBody.innerHTML = '';
            
            // If no users, show message
            if (allUsers.length === 0) {
                usersTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="no-data-row">
                            No users found. They will appear here once users register on your site.
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Display the first page of users
            displayUsers(getCurrentPageUsers(allUsers));
            
            // Initialize pagination
            updatePagination(allUsers);
        }
        
        // Hide all loading elements
        document.querySelectorAll('.loading-container, #loading-users, .loading-indicator, .loading-row').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users: ' + error.message, 'error');
        
        const userCountElement = document.querySelector('.user-count');
        if (userCountElement) {
            userCountElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error loading users';
        }
        
        const usersTableBody = document.getElementById('users-table-body');
        if (usersTableBody) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="error-row">
                        <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
                        Error loading users: ${error.message}
                        <button onclick="loadUsers()" class="retry-btn" aria-label="Try loading users again">Try Again</button>
                    </td>
                </tr>
            `;
        }
        
        // Hide all loading animations
        document.querySelectorAll('.loading-container, #loading-users, .loading-indicator').forEach(el => {
            if (el) el.style.display = 'none';
        });
    }
}

// Sort users by field
function sortUsers(field, keepDirection = false) {
    // Update sort direction
    if (sortField === field && !keepDirection) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else if (!keepDirection) {
        sortDirection = 'asc';
    }
    
    sortField = field;
    
    // Update sort indicators in table headers
    const headers = document.querySelectorAll('.users-table th');
    headers.forEach(header => {
        header.classList.remove('sorted', 'asc', 'desc');
        if (header.onclick && header.onclick.toString().includes(`'${field}'`)) {
            header.classList.add('sorted');
            header.classList.add(sortDirection);
        }
    });
    
    // Filter and sort users
    const filteredUsers = filterUsersArray();
    
    // Sort users based on the selected field
    filteredUsers.sort((a, b) => {
        let valueA, valueB;
        
        if (field === 'name') {
            valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
            valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
        } else {
            valueA = (a[field] || '').toLowerCase();
            valueB = (b[field] || '').toLowerCase();
        }
        
        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Paginate and display
    updatePagination(filteredUsers);
    displayUsers(getCurrentPageUsers(filteredUsers));
}

// Filter users based on search query and role
function filterUsers() {
    try {
        const searchInput = document.getElementById('user-search');
        const roleFilter = document.getElementById('role-filter');
        
        if (!searchInput || !roleFilter) {
            console.error('Search input or role filter not found');
            return;
        }
        
        const query = searchInput.value || '';
        const role = roleFilter.value;
        
        console.log(`Filtering users with query: "${query}" and role: "${role}"`);
        
        // Get all user rows
        const userRows = document.querySelectorAll('#users-table-body tr');
        
        // Count how many users match the filter
        let matchCount = 0;
        const totalCount = userRows.length;
        
        userRows.forEach(row => {
            // Skip if it's a loading or message row
            if (row.classList.contains('loading-row') || row.querySelector('td[colspan]')) {
                return;
            }
            
            const name = row.querySelector('td:nth-child(1)')?.textContent || '';
            const email = row.querySelector('td:nth-child(2)')?.textContent || '';
            const phone = row.querySelector('td:nth-child(3)')?.textContent || '';
            const location = row.querySelector('td:nth-child(4)')?.textContent || '';
            
            // Determine if user is admin based on badge in name cell
            const isAdmin = row.querySelector('.admin-badge') !== null;
            const userRole = isAdmin ? 'admin' : 'user';
            
            // Check if user matches the search query
            const matchesQuery = !query || 
                name.toLowerCase().includes(query.toLowerCase()) || 
                email.toLowerCase().includes(query.toLowerCase()) || 
                phone.toLowerCase().includes(query.toLowerCase()) || 
                location.toLowerCase().includes(query.toLowerCase());
                
            // Check if user matches the role filter
            const matchesRole = role === 'all' || 
                (role === 'admin' && userRole === 'admin') || 
                (role === 'user' && userRole === 'user');
            
            // Show/hide row based on filter match
            if (matchesQuery && matchesRole) {
                row.style.display = '';
                matchCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update user count
        const userCountElement = document.querySelector('.user-count');
        if (userCountElement) {
            userCountElement.innerHTML = `
                <i class="fas fa-users"></i> ${matchCount} of ${totalCount} Users
            `;
        }
        
        // Show message if no users match
        const noUsersElement = document.getElementById('no-data');
        if (noUsersElement) {
            if (matchCount === 0 && !document.querySelector('.loading-row')) {
                noUsersElement.style.display = 'block';
                noUsersElement.innerHTML = `
                    <i class="fas fa-users"></i>
                    No users found matching your criteria.
                `;
            } else {
                noUsersElement.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error in filterUsers function:', error);
        showNotification(`Error filtering users: ${error.message}`, 'error');
    }
}

// Helper function to filter users array
function filterUsersArray() {
    const searchQuery = document.getElementById('user-search').value.toLowerCase();
    const roleFilter = document.getElementById('role-filter').value;
    
    return allUsers.filter(user => {
        // Match search query
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const phone = (user.phone || '').toLowerCase();
        const location = (user.location || '').toLowerCase();
        
        const matchesSearch = searchQuery === '' || 
            fullName.includes(searchQuery) || 
            email.includes(searchQuery) || 
            phone.includes(searchQuery) || 
            location.includes(searchQuery);
        
        // Match role filter
        const matchesRole = roleFilter === 'all' || 
            (roleFilter === 'admin' && user.isAdmin) || 
            (roleFilter === 'user' && !user.isAdmin);
        
        return matchesSearch && matchesRole;
    });
}

// Get users for current page
function getCurrentPageUsers(filteredUsers) {
    const startIndex = (currentPage - 1) * usersPerPage;
    return filteredUsers.slice(startIndex, startIndex + usersPerPage);
}

// Update pagination controls
function updatePagination(filteredUsers) {
    try {
        // Check if filteredUsers is valid
        if (!filteredUsers) {
            console.error('Cannot update pagination: filteredUsers is undefined');
            return;
        }
        
        // Calculate total pages
        const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
        
        // Ensure current page is valid
        if (currentPage > totalPages) {
            currentPage = totalPages || 1;
        }
        
        // Get pagination elements with null checks
        const pageStartElement = document.getElementById('page-start');
        if (!pageStartElement) {
            console.error('Cannot update pagination: page-start element not found');
        }
        
        const pageEndElement = document.getElementById('page-end');
        if (!pageEndElement) {
            console.error('Cannot update pagination: page-end element not found');
        }
        
        const totalItemsElement = document.getElementById('total-items');
        if (!totalItemsElement) {
            console.error('Cannot update pagination: total-items element not found');
        }
        
        const paginationControls = document.getElementById('pagination-controls');
        if (!paginationControls) {
            console.error('Cannot update pagination: pagination-controls element not found');
            showNotification('Error updating pagination', 'error');
            return;
        }
        
        // Calculate page info
        const startIndex = (currentPage - 1) * usersPerPage + 1;
        const endIndex = Math.min(startIndex + usersPerPage - 1, filteredUsers.length);
        
        // Update page info text safely
        if (pageStartElement) {
            pageStartElement.textContent = filteredUsers.length ? startIndex : 0;
        }
        
        if (pageEndElement) {
            pageEndElement.textContent = endIndex;
        }
        
        if (totalItemsElement) {
            totalItemsElement.textContent = filteredUsers.length;
        }
        
        // Remove existing page buttons safely
        const pageBtns = paginationControls.querySelectorAll('.page-btn:not(#prev-page):not(#next-page)');
        if (pageBtns && pageBtns.length > 0) {
            pageBtns.forEach(btn => {
                if (btn && btn.parentNode) {
                    btn.remove();
                }
            });
        }
        
        // Get navigation buttons
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        // Update prev/next button states
        if (prevBtn) {
            prevBtn.disabled = currentPage === 1;
            prevBtn.classList.toggle('disabled', currentPage === 1);
        }
        
        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages || totalPages === 0;
            nextBtn.classList.toggle('disabled', currentPage === totalPages || totalPages === 0);
        }
        
        // Skip adding page buttons if no pages
        if (totalPages === 0) {
            return;
        }
        
        // Configure visible page range
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Add first page button if needed
        if (startPage > 1 && nextBtn) {
            const firstPageBtn = createPageButton(1);
            if (firstPageBtn) {
                paginationControls.insertBefore(firstPageBtn, nextBtn);
                
                // Add ellipsis if there's a gap
                if (startPage > 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.style.margin = '0 5px';
                    paginationControls.insertBefore(ellipsis, nextBtn);
                }
            }
        }
        
        // Add page buttons
        for (let i = startPage; i <= endPage; i++) {
            if (nextBtn) {
                const pageBtn = createPageButton(i);
                if (pageBtn) {
                    paginationControls.insertBefore(pageBtn, nextBtn);
                }
            }
        }
        
        // Add last page button if needed
        if (endPage < totalPages && nextBtn) {
            // Add ellipsis if there's a gap
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.margin = '0 5px';
                paginationControls.insertBefore(ellipsis, nextBtn);
            }
            
            const lastPageBtn = createPageButton(totalPages);
            if (lastPageBtn) {
                paginationControls.insertBefore(lastPageBtn, nextBtn);
            }
        }
    } catch (error) {
        console.error('Error updating pagination:', error);
        showNotification(`Pagination error: ${error.message}`, 'error');
    }
}

// Create a page button for pagination
function createPageButton(pageNum) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${pageNum === currentPage ? 'active' : ''}`;
    btn.textContent = pageNum;
    btn.onclick = () => goToPage(pageNum);
    btn.title = `Go to page ${pageNum}`;
    return btn;
}

// Go to specific page
function goToPage(pageNum) {
    currentPage = pageNum;
    filterUsers();
}

// Change page (prev/next)
function changePage(delta) {
    goToPage(currentPage + delta);
}

// Function to display users in the table
function displayUsers(users) {
    try {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) {
            console.error('Users table body element not found');
            return;
        }
        
        // Clear table first
        tableBody.innerHTML = '';
        
        if (!users || users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data">
                        <i class="fas fa-user-slash"></i>
                        No users found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Add users to table
        users.forEach(user => {
            if (!user || !user._id) {
                console.error('Invalid user data:', user);
                return;
            }
            
            const userRow = document.createElement('tr');
            
            // Set data attribute for user ID
            userRow.setAttribute('data-userid', user._id);
            
            // Create user name cell with admin badge if applicable
            const nameCell = document.createElement('td');
            nameCell.className = 'user-name';
            
            // Handle potential undefined name values
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            nameCell.innerHTML = `${firstName} ${lastName}`;
            
            if (user.isAdmin) {
                nameCell.innerHTML += ' <span class="admin-badge">ADMIN</span>';
            }
            
            // Create email cell
            const emailCell = document.createElement('td');
            emailCell.textContent = user.email || '';
            
            // Create phone cell
            const phoneCell = document.createElement('td');
            phoneCell.textContent = user.phone || '';
            
            // Create location cell
            const locationCell = document.createElement('td');
            locationCell.textContent = user.location || '';
            
            // Create actions cell with edit and delete buttons
            const actionsCell = document.createElement('td');
            actionsCell.className = 'user-actions';
            
            // Edit button
            const editButton = document.createElement('button');
            editButton.className = 'action-btn edit-btn';
            editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editButton.addEventListener('click', () => openEditUserModal(user._id));
            
            // Add edit button to actions cell
            actionsCell.appendChild(editButton);
            
            // Only show delete button if not the current admin user
            const currentAdminId = localStorage.getItem('adminId');
            if (user._id !== currentAdminId) {
                // Delete button
                const deleteButton = document.createElement('button');
                deleteButton.className = 'action-btn delete-btn';
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
                deleteButton.addEventListener('click', () => confirmDeleteUser(user._id));
                
                // Add delete button to actions cell
                actionsCell.appendChild(deleteButton);
            }
            
            // Ticket history button
            const ticketButton = document.createElement('button');
            ticketButton.className = 'action-btn ticket-btn';
            ticketButton.innerHTML = '<i class="fas fa-ticket-alt"></i> Tickets';
            ticketButton.addEventListener('click', () => toggleTicketHistory(user._id));
            
            // Add ticket button to actions cell
            actionsCell.appendChild(ticketButton);
            
            // Add all cells to the row
            userRow.appendChild(nameCell);
            userRow.appendChild(emailCell);
            userRow.appendChild(phoneCell);
            userRow.appendChild(locationCell);
            userRow.appendChild(actionsCell);
            
            // Add row to table
            tableBody.appendChild(userRow);
        });
        
        // Update user count display
        updateUserCount(users.length);
        
    } catch (error) {
        console.error('Error displaying users:', error);
        showNotification('Error displaying users', 'error');
    }
}

// Function to update user count display
function updateUserCount(count) {
    const userCountElement = document.querySelector('.user-count');
    if (userCountElement) {
        userCountElement.innerHTML = `
            <i class="fas fa-users"></i>
            <span>${count} User${count !== 1 ? 's' : ''}</span>
        `;
    }
}

// Toggle ticket history panel for a user
function toggleTicketHistory(userId) {
    try {
        // Check if the user exists
        const user = allUsers.find(u => u._id === userId);
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }
        
        // Get the user's row
        const userRow = document.querySelector(`tr[data-userid="${userId}"]`);
        if (!userRow) {
            showNotification('User row not found', 'error');
            return;
        }
        
        // Check if ticket history is already open
        const existingHistoryRow = document.querySelector(`tr[data-ticket-history="${userId}"]`);
        
        // If history is already open, close it
        if (existingHistoryRow) {
            existingHistoryRow.remove();
            return;
        }
        
        // Create a new row for the ticket history
        const historyRow = document.createElement('tr');
        historyRow.className = 'ticket-history-row';
        historyRow.setAttribute('data-ticket-history', userId);
        
        // Create a cell that spans all columns
        const historyCell = document.createElement('td');
        historyCell.setAttribute('colspan', '5');
        
        // Create the ticket history panel
        historyCell.innerHTML = `
            <div class="ticket-history-panel">
                <div class="ticket-history-header">
                    <h3 class="ticket-history-title">
                        <i class="fas fa-ticket-alt"></i>
                        Ticket History for ${user.firstName} ${user.lastName}
                        <span class="ticket-count" id="ticket-count-${userId}">...</span>
                    </h3>
                    <button class="close-history-btn" onclick="toggleTicketHistory('${userId}')" title="Close ticket history">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="ticket-filter-buttons">
                    <button class="ticket-filter-btn active" data-filter="all" onclick="filterUserTickets('${userId}', 'all')">All Tickets</button>
                    <button class="ticket-filter-btn" data-filter="pending" onclick="filterUserTickets('${userId}', 'pending')">Pending</button>
                    <button class="ticket-filter-btn" data-filter="approved" onclick="filterUserTickets('${userId}', 'approved')">Approved</button>
                    <button class="ticket-filter-btn" data-filter="rejected" onclick="filterUserTickets('${userId}', 'rejected')">Rejected</button>
                </div>
                
                <!-- Loading indicator -->
                <div id="tickets-loading-${userId}" class="loading-container" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Loading tickets...</p>
                </div>
                
                <!-- No tickets message -->
                <div id="no-tickets-${userId}" class="no-data" style="display: none;">
                    <i class="fas fa-ticket-alt"></i>
                    No tickets found for this user.
                </div>
                
                <!-- Tickets grid -->
                <div id="tickets-grid-${userId}" class="tickets-grid" style="display: none;"></div>
            </div>
        `;
        
        // Add the cell to the row
        historyRow.appendChild(historyCell);
        
        // Insert after the user's row
        userRow.parentNode.insertBefore(historyRow, userRow.nextSibling);
        
        // Load the user's tickets
        loadUserTickets(userId);
        
    } catch (error) {
        console.error('Error toggling ticket history:', error);
        showNotification('Error showing ticket history', 'error');
    }
}

// Load tickets for a specific user
function loadUserTickets(userId) {
    try {
        console.log(`Loading tickets for user: ${userId}`);
        
        // Get elements
        const loadingElement = document.getElementById(`tickets-loading-${userId}`);
        const ticketsGrid = document.getElementById(`tickets-grid-${userId}`);
        const noTicketsElement = document.getElementById(`no-tickets-${userId}`);
        
        // Show loading indicator
        if (loadingElement) loadingElement.style.display = 'block';
        if (ticketsGrid) ticketsGrid.style.display = 'none';
        if (noTicketsElement) noTicketsElement.style.display = 'none';
        
        // Update ticket count with loading state
        const ticketCountElement = document.getElementById(`ticket-count-${userId}`);
        if (ticketCountElement) {
            ticketCountElement.textContent = 'Loading...';
        }
        
        // Make API request to fetch tickets for this user
        fetch(`/api/admin/tickets/${userId}`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch tickets (Status: ${response.status})`);
            }
            return response.json();
        })
        .then(tickets => {
            console.log(`Loaded ${tickets.length} tickets for user ${userId}:`, tickets);
            
            // Hide loading indicator
            if (loadingElement) loadingElement.style.display = 'none';
            
            // Show tickets grid if we have tickets
            if (ticketsGrid) {
                ticketsGrid.style.display = 'grid';
                
                // Clear previous tickets
                ticketsGrid.innerHTML = '';
                
                // Update ticket count
                if (ticketCountElement) {
                    ticketCountElement.textContent = tickets.length;
                }
                
                // Display tickets
                if (tickets.length === 0) {
                    if (noTicketsElement) {
                        noTicketsElement.style.display = 'block';
                    }
                    return;
                }
                
                // Add ticket cards to the grid
                tickets.forEach(ticket => {
                    // Format date
                    let ticketDate = 'N/A';
                    if (ticket.timestamp) {
                        ticketDate = new Date(ticket.timestamp).toLocaleDateString();
                    } else if (ticket.createdAt) {
                        ticketDate = new Date(ticket.createdAt).toLocaleDateString();
                    } else if (ticket.date) {
                        ticketDate = new Date(ticket.date).toLocaleDateString();
                    }
                    
                    // Create status badge class based on status
                    let statusClass = '';
                    let statusText = '';
                    
                    switch(ticket.status?.toLowerCase()) {
                        case 'pending':
                            statusClass = 'status-pending';
                            statusText = 'PENDING';
                            break;
                        case 'approved':
                            statusClass = 'status-approved';
                            statusText = 'APPROVED';
                            break;
                        case 'rejected':
                            statusClass = 'status-rejected';
                            statusText = 'REJECTED';
                            break;
                        default:
                            statusClass = 'status-pending';
                            statusText = 'PENDING';
                    }
                    
                    // Calculate the correct price using the same algorithm as the edit form
                    const sectionType = ticket.sectionType || '';
                    const section = ticket.section || '';
                    const quantity = parseInt(ticket.quantity) || 1;
                    
                    // Calculate base price based on section type
                    let basePrice = 0;
                    
                    // Determine base price based on section type
                    if (sectionType === 'Floor') {
                        basePrice = 750;
                    } else if (sectionType === 'VIP') {
                        basePrice = 600;
                    } else if (sectionType === 'Lower') {
                        basePrice = 350;
                    } else if (sectionType === 'Mid') {
                        basePrice = 225;
                    } else if (sectionType === 'Upper') {
                        basePrice = 120;
                    } else if (sectionType === 'Special') {
                        basePrice = 500;
                    }
                    
                    // Add price variations for premium sections
                    if (['FL20', 'FL21'].includes(section)) basePrice += 100;
                    if (['VIP12'].includes(section)) basePrice += 75;
                    if (['12', '21'].includes(section)) basePrice += 50;
                    if (['Garden Deck', 'Executive Suites'].includes(section)) basePrice += 150;
                    
                    // Apply quantity discount
                    let quantityMultiplier = 1;
                    if (quantity >= 5) {
                        quantityMultiplier = 0.9;
                    } else if (quantity >= 3) {
                        quantityMultiplier = 0.95;
                    }
                    
                    const serviceFee = basePrice * 0.15;
                    const processingFee = 5;
                    
                    // Calculate the total price correctly
                    const baseTotal = basePrice * quantity;
                    const serviceFeeTotal = serviceFee * quantity;
                    const processingFeeTotal = processingFee * quantity;
                    const totalBeforeDiscount = baseTotal + serviceFeeTotal + processingFeeTotal;
                    const calculatedTotalPrice = totalBeforeDiscount * quantityMultiplier;
                    
                    // Use the calculated price for consistency
                    const displayPrice = calculatedTotalPrice;
                    
                    // Create ticket card element
                    const ticketCard = document.createElement('div');
                    ticketCard.className = 'ticket-card';
                    ticketCard.setAttribute('data-ticket-id', ticket._id);
                    ticketCard.setAttribute('data-user-id', ticket.userId);
                    ticketCard.setAttribute('data-status', ticket.status || 'pending');
                    
                    ticketCard.innerHTML = `
                        <div class="ticket-header">
                            <h3>${ticket.game || 'No Game Specified'}</h3>
                            <div class="form-text text-muted ticket-date">${ticketDate}</div>
                        </div>
                        <div class="ticket-details">
                            <div class="status-badge ${statusClass}">${statusText}</div>
                            <div class="ticket-info-row">
                                <span class="info-label">Section Type:</span>
                                <span class="info-value">${ticket.sectionType || 'N/A'}</span>
                            </div>
                            <div class="ticket-info-row">
                                <span class="info-label">Section:</span>
                                <span class="info-value">${ticket.section || 'N/A'}</span>
                            </div>
                            <div class="ticket-info-row">
                                <span class="info-label">Quantity:</span>
                                <span class="info-value">${ticket.quantity || '1'}</span>
                            </div>
                            <div class="ticket-info-row price-row">
                                <span class="info-label">Price:</span>
                                <span class="info-value price">$${displayPrice.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="ticket-actions">
                            <button class="btn edit-btn" onclick="openEditTicketModal('${ticket._id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn delete-btn" onclick="confirmDeleteTicket('${ticket._id}')">
                                <i class="fas fa-trash-alt"></i> Delete
                            </button>
                        </div>
                    `;
                    
                    // Add ticket card to grid
                    ticketsGrid.appendChild(ticketCard);
                });
                
                // Apply current filter (if any)
                const activeFilterBtn = document.querySelector(`tr[data-ticket-history="${userId}"] .ticket-filter-btn.active`);
                if (activeFilterBtn) {
                    filterUserTickets(userId, activeFilterBtn.dataset.filter);
                }
            }
        })
        .catch(error => {
            console.error(`Error loading tickets for user ${userId}:`, error);
            
            // Hide loading indicator
            if (loadingElement) loadingElement.style.display = 'none';
            
            // Show error message
            if (noTicketsElement) {
                noTicketsElement.style.display = 'block';
                noTicketsElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading tickets: ${error.message}
                `;
            }
            
            // Update ticket count with error state
            if (ticketCountElement) {
                ticketCountElement.textContent = 'Error';
            }
            
            showNotification(`Error loading tickets: ${error.message}`, 'error');
        });
    } catch (error) {
        console.error(`Error in loadUserTickets function:`, error);
        showNotification(`Error loading tickets: ${error.message}`, 'error');
    }
}

// Filter user tickets by status
function filterUserTickets(userId, status) {
    try {
        // Get the elements
        const ticketHistory = document.querySelector(`tr[data-ticket-history="${userId}"]`);
        if (!ticketHistory) return; // Exit if element doesn't exist
        
        // Update active filter button
        const filterButtons = ticketHistory.querySelectorAll(`.ticket-filter-btn`);
        if (filterButtons.length === 0) return; // Exit if no filter buttons
        
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === status);
        });
        
        // Filter ticket cards
        const ticketsGrid = document.getElementById(`tickets-grid-${userId}`);
        if (!ticketsGrid) return; // Exit if tickets grid doesn't exist
        
        const ticketCards = ticketsGrid.querySelectorAll(`.ticket-card`);
        let visibleCount = 0;
        
        ticketCards.forEach(card => {
            const cardStatus = card.dataset.status;
            const shouldShow = status === 'all' || cardStatus === status;
            
            card.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) visibleCount++;
        });
        
        // Show no results message if needed
        const noTicketsElement = document.getElementById(`no-tickets-${userId}`);
        if (noTicketsElement) {
            if (visibleCount === 0 && ticketCards.length > 0) {
                noTicketsElement.style.display = 'block';
                noTicketsElement.textContent = `No ${status} tickets found for this user.`;
            } else {
                noTicketsElement.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error filtering tickets:', error);
        showNotification('Error filtering tickets', 'error');
    }
}

// Load tickets from the API
function loadTickets() {
    try {
        console.log('Loading tickets for admin view');
        
        // Get container elements
        const ticketsContainer = document.getElementById('tickets-container');
        const ticketsGrid = document.getElementById('tickets-grid');
        const loadingElement = document.getElementById('tickets-loading');
        const noTicketsElement = document.getElementById('no-tickets');
        
        // Make sure we have all the elements we need
        if (!ticketsContainer || !ticketsGrid) {
            console.error('Tickets container or grid not found');
            showNotification('Error: Required elements not found on page', 'error');
            return;
        }
        
        // Prevent multiple simultaneous load attempts
        if (loadingElement && loadingElement.style.display === 'flex') {
            console.log('Ticket loading already in progress, skipping duplicate request');
            return;
        }
        
        // Update loading state
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
        
        // Hide no tickets message while loading
        if (noTicketsElement) {
            noTicketsElement.style.display = 'none';
        }
        
        // Clear existing tickets to prevent duplicates
        ticketsGrid.innerHTML = '';
        
        // Update ticket count with loading state
        const ticketCountElement = document.getElementById('ticket-count');
        if (ticketCountElement) {
            ticketCountElement.innerHTML = `
                <i class="fas fa-ticket-alt"></i>
                <span>Loading tickets...</span>
            `;
        }
        
        // Fetch tickets from the server
        fetch('/api/admin/tickets', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch tickets (Status: ${response.status})`);
            }
            return response.json();
        })
        .then(tickets => {
            console.log(`Loaded ${tickets.length} tickets:`, tickets);
            
            // Store tickets globally for filtering
            allTickets = tickets;
            
            // Hide loading indicator
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Update ticket count
            if (ticketCountElement) {
                ticketCountElement.innerHTML = `
                    <i class="fas fa-ticket-alt"></i>
                    <span>${tickets.length}</span> Tickets
                `;
            }
            
            // If no tickets, show message
            if (!tickets || tickets.length === 0) {
                if (noTicketsElement) {
                    noTicketsElement.style.display = 'block';
                    noTicketsElement.innerHTML = `
                        <i class="fas fa-ticket-alt"></i>
                        No tickets found. Create a ticket to get started.
                    `;
                }
                return;
            }
            
            // Recalculate prices for all tickets
            Promise.all(tickets.map(async (ticket) => {
                // Recalculate and update price in the database
                await recalculateAndUpdateTicketPrice(ticket);
                return ticket;
            }))
            .then(() => {
                console.log('All ticket prices recalculated');
                
                // Populate filter dropdowns with ticket data
                populateTicketFilters(tickets);
                
                // Display tickets
                displayTickets(tickets);
            })
            .catch(error => {
                console.error('Error recalculating ticket prices:', error);
                
                // Populate filter dropdowns with ticket data
                populateTicketFilters(tickets);
                
                // Display tickets anyway
                displayTickets(tickets);
            });
        })
        .catch(error => {
            console.error('Error loading tickets:', error);
            
            // Hide loading indicator
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Update ticket count
            if (ticketCountElement) {
                ticketCountElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Error</span>
                `;
            }
            
            // Show error message
            if (noTicketsElement) {
                noTicketsElement.style.display = 'block';
                noTicketsElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading tickets: ${error.message}
                `;
            }
            
            showNotification(`Error loading tickets: ${error.message}`, 'error');
        });
    } catch (error) {
        console.error('Error in loadTickets function:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Filter and display tickets based on search and status filter
function filterAndDisplayTickets() {
    try {
        if (!allTickets) {
            console.warn('Cannot filter tickets: allTickets array is not loaded yet');
            return;
        }
        
        // Get filter values
        const searchQuery = document.getElementById('ticket-search')?.value?.toLowerCase().trim() || '';
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        
        // Apply filters
        const filteredTickets = allTickets.filter(ticket => {
            // Status filter
            if (statusFilter !== 'all' && ticket.status?.toLowerCase() !== statusFilter) {
                return false;
            }
            
            // Search filter
            if (searchQuery) {
                const game = ticket.game?.toLowerCase() || '';
                const userName = ticket.userName?.toLowerCase() || '';
                const section = ticket.section?.toLowerCase() || '';
                const sectionType = ticket.sectionType?.toLowerCase() || '';
                
                return game.includes(searchQuery) ||
                       userName.includes(searchQuery) ||
                       section.includes(searchQuery) ||
                       sectionType.includes(searchQuery);
            }
            
            return true;
        });
        
        // Display filtered tickets
        displayTickets(filteredTickets);
        
        // Update filter buttons to show active state
        const filterButtons = document.querySelectorAll('#tickets-tab .filter-btn');
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === statusFilter);
        });
        
    } catch (error) {
        console.error('Error filtering tickets:', error);
        showNotification('Error filtering tickets', 'error');
    }
}

// Display tickets in the grid
function displayTickets(tickets) {
    try {
        const ticketsGrid = document.getElementById('tickets-grid');
        if (!ticketsGrid) {
            console.error('Tickets grid not found');
            return;
        }
        
        // Clear any existing tickets to prevent duplicates
        ticketsGrid.innerHTML = '';
        
        // Fetch user data to display owner names
        fetch('/api/admin/users', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            return response.json();
        })
        .then(users => {
            console.log(`Displaying ${tickets.length} tickets with ${users.length} users`);
            
            // If no tickets, show message
            if (tickets.length === 0) {
                const noTicketsElement = document.getElementById('no-tickets');
                if (noTicketsElement) {
                    noTicketsElement.style.display = 'block';
                }
                return;
            }
            
            // Track ticket IDs to prevent duplicates
            const addedTicketIds = new Set();
            
            // Display each ticket
            tickets.forEach(ticket => {
                // Skip if this ticket ID has already been added
                if (addedTicketIds.has(ticket._id)) {
                    console.log(`Skipping duplicate ticket: ${ticket._id}`);
                    return;
                }
                
                // Add ticket ID to tracking set
                addedTicketIds.add(ticket._id);
                
                // Find owner
                const owner = users.find(user => user._id === ticket.userId);
                const ownerName = owner 
                    ? `${owner.firstName} ${owner.lastName}` 
                    : 'Unknown User';
                
                // Format date
                let ticketDate = 'N/A';
                if (ticket.timestamp) {
                    ticketDate = new Date(ticket.timestamp).toLocaleDateString();
                } else if (ticket.createdAt) {
                    ticketDate = new Date(ticket.createdAt).toLocaleDateString();
                } else if (ticket.date) {
                    ticketDate = new Date(ticket.date).toLocaleDateString();
                }
                
                // Create status class
                let statusClass, statusText;
                switch(ticket.status?.toLowerCase()) {
                    case 'approved': 
                        statusClass = 'status-approved'; 
                        statusText = 'Approved'; 
                        break;
                    case 'rejected': 
                        statusClass = 'status-rejected'; 
                        statusText = 'Rejected'; 
                        break;
                    case 'completed':
                        statusClass = 'status-completed';
                        statusText = 'Completed';
                        break;
                    default:
                        statusClass = 'status-pending';
                        statusText = 'Pending';
                }
                
                // Calculate the correct price using the same algorithm as the edit form
                const sectionType = ticket.sectionType || '';
                const section = ticket.section || '';
                const quantity = parseInt(ticket.quantity) || 1;
                
                // Calculate base price based on section type
                let basePrice = 0;
                
                // Determine base price based on section type
                if (sectionType === 'Floor') {
                    basePrice = 750;
                } else if (sectionType === 'VIP') {
                    basePrice = 600;
                } else if (sectionType === 'Lower') {
                    basePrice = 350;
                } else if (sectionType === 'Mid') {
                    basePrice = 225;
                } else if (sectionType === 'Upper') {
                    basePrice = 120;
                } else if (sectionType === 'Special') {
                    basePrice = 500;
                }
                
                // Create ticket card element
                const ticketCard = document.createElement('div');
                ticketCard.className = 'ticket-card';
                ticketCard.setAttribute('data-ticket-id', ticket._id);
                ticketCard.setAttribute('data-user-id', ticket.userId);
                ticketCard.setAttribute('data-user-name', ownerName);
                ticketCard.setAttribute('data-status', ticket.status || 'pending');
                
                ticketCard.innerHTML = `
                    <div class="ticket-header">
                        <h3>${ticket.game || 'No Game Specified'}</h3>
                        <div class="form-text text-muted ticket-date">${ticketDate}</div>
                    </div>
                    <div class="ticket-details">
                        <div class="ticket-owner">
                            <span class="info-label"><i class="fas fa-user"></i> Owner:</span>
                            <span class="info-value owner-name">${ownerName}</span>
                        </div>
                        <div class="status-badge ${statusClass}">${statusText}</div>
                        <div class="ticket-info-row">
                            <span class="info-label">Section Type:</span>
                            <span class="info-value">${ticket.sectionType || 'N/A'}</span>
                        </div>
                        <div class="ticket-info-row">
                            <span class="info-label">Section:</span>
                            <span class="info-value">${ticket.section || 'N/A'}</span>
                        </div>
                        <div class="ticket-info-row">
                            <span class="info-label">Quantity:</span>
                            <span class="info-value">${ticket.quantity || '1'}</span>
                        </div>
                        <div class="ticket-info-row price-row">
                            <span class="info-label">Price:</span>
                            <span class="info-value price">$${ticket.totalPrice ? ticket.totalPrice.toFixed(2) : '0.00'}</span>
                        </div>
                    </div>
                    <div class="ticket-actions">
                        <button class="btn edit-btn" onclick="openEditTicketModal('${ticket._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn delete-btn" onclick="confirmDeleteTicket('${ticket._id}')">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                `;
                
                // Add ticket card to grid
                ticketsGrid.appendChild(ticketCard);
            });
        })
        .catch(error => {
            console.error('Error fetching user data for tickets:', error);
            showNotification('Error loading ticket owner information', 'error');
            
            // Display tickets without owner info
            displayTicketsWithoutOwners(tickets);
        });
    } catch (error) {
        console.error('Error displaying tickets:', error);
        showNotification('Error displaying tickets', 'error');
    }
}

// Fallback function to display tickets without owner info
function displayTicketsWithoutOwners(tickets) {
    try {
        const ticketsGrid = document.getElementById('tickets-grid');
        if (!ticketsGrid) return;
        
        tickets.forEach(ticket => {
            // Format date
            let ticketDate = 'N/A';
            if (ticket.timestamp) {
                ticketDate = new Date(ticket.timestamp).toLocaleDateString();
            } else if (ticket.createdAt) {
                ticketDate = new Date(ticket.createdAt).toLocaleDateString();
            } else if (ticket.date) {
                ticketDate = new Date(ticket.date).toLocaleDateString();
            }
            
            // Create status class
            let statusClass, statusText;
            switch(ticket.status?.toLowerCase()) {
                case 'pending': 
                    statusClass = 'status-pending'; 
                    statusText = 'Pending'; 
                    break;
                case 'approved': 
                    statusClass = 'status-approved'; 
                    statusText = 'Approved'; 
                    break;
                case 'rejected': 
                    statusClass = 'status-rejected'; 
                    statusText = 'Rejected'; 
                    break;
                default: 
                    statusClass = 'status-pending'; 
                    statusText = 'Pending';
            }
            
            // Calculate price
            const sectionType = ticket.sectionType || '';
            const section = ticket.section || '';
            const quantity = parseInt(ticket.quantity) || 1;
            
            let basePrice = 0;
            if (sectionType === 'Floor') basePrice = 750;
            else if (sectionType === 'VIP') basePrice = 600;
            else if (sectionType === 'Lower') basePrice = 350;
            else if (sectionType === 'Mid') basePrice = 225;
            else if (sectionType === 'Upper') basePrice = 120;
            else if (sectionType === 'Special') basePrice = 500;
            
            if (['FL20', 'FL21'].includes(section)) basePrice += 100;
            if (['VIP12'].includes(section)) basePrice += 75;
            if (['12', '21'].includes(section)) basePrice += 50;
            if (['Garden Deck', 'Executive Suites'].includes(section)) basePrice += 150;
            
            let quantityMultiplier = 1;
            if (quantity >= 5) quantityMultiplier = 0.9;
            else if (quantity >= 3) quantityMultiplier = 0.95;
            
            const serviceFee = basePrice * 0.15;
            const processingFee = 5;
            const baseTotal = basePrice * quantity;
            const serviceFeeTotal = serviceFee * quantity;
            const processingFeeTotal = processingFee * quantity;
            const totalBeforeDiscount = baseTotal + serviceFeeTotal + processingFeeTotal;
            const displayPrice = totalBeforeDiscount * quantityMultiplier;
            
            // Create ticket card
            const ticketCard = document.createElement('div');
            ticketCard.className = 'ticket-card';
            ticketCard.setAttribute('data-ticket-id', ticket._id);
            ticketCard.setAttribute('data-user-id', ticket.userId);
            ticketCard.setAttribute('data-status', ticket.status || 'pending');
            
            ticketCard.innerHTML = `
                <div class="ticket-header">
                    <h3>${ticket.game || 'No Game Specified'}</h3>
                    <div class="form-text text-muted ticket-date">${ticketDate}</div>
                </div>
                <div class="ticket-details">
                    <div class="ticket-owner">
                        <span class="info-label"><i class="fas fa-user"></i> Owner:</span>
                        <span class="info-value owner-name">User ID: ${ticket.userId || 'Unknown'}</span>
                    </div>
                    <div class="status-badge ${statusClass}">${statusText}</div>
                    <div class="ticket-info-row">
                        <span class="info-label">Section Type:</span>
                        <span class="info-value">${ticket.sectionType || 'N/A'}</span>
                    </div>
                    <div class="ticket-info-row">
                        <span class="info-label">Section:</span>
                        <span class="info-value">${ticket.section || 'N/A'}</span>
                    </div>
                    <div class="ticket-info-row">
                        <span class="info-label">Quantity:</span>
                        <span class="info-value">${ticket.quantity || '1'}</span>
                    </div>
                    <div class="ticket-info-row price-row">
                        <span class="info-label">Price:</span>
                        <span class="info-value price">$${displayPrice.toFixed(2)}</span>
                    </div>
                </div>
                <div class="ticket-actions">
                    <button class="btn edit-btn" onclick="openEditTicketModal('${ticket._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn delete-btn" onclick="confirmDeleteTicket('${ticket._id}')">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `;
            
            ticketsGrid.appendChild(ticketCard);
        });
    } catch (error) {
        console.error('Error displaying tickets without owners:', error);
    }
}

// Function to handle editing a user inline instead of in a modal
function openEditUserModal(userId) {
    try {
        // Find the user in our data
        const user = allUsers.find(u => u._id === userId);
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        // Get the user's row
        const userRow = document.querySelector(`tr[data-userid="${userId}"]`);
        if (!userRow) {
            showNotification('User row not found', 'error');
            return;
        }
        
        // Check if edit form is already open
        const existingEditRow = document.querySelector(`tr[data-edit-userid="${userId}"]`);
        
        // If edit form is already open, close it
        if (existingEditRow) {
            existingEditRow.remove();
            return;
        }
        
        // Check if editing your own account and you're an admin
        const isCurrentAdmin = localStorage.getItem('adminId') === userId && user.isAdmin;

        // Create a new row for the edit form
        const editRow = document.createElement('tr');
        editRow.className = 'edit-user-inline';
        editRow.setAttribute('data-edit-userid', userId);
        
        // Create the edit form HTML
        editRow.innerHTML = `
            <td colspan="5">
                <div class="user-edit-panel">
                    <div class="user-edit-header">
                        <h3 class="user-edit-title">
                            <i class="fas fa-user-edit"></i>
                            Edit User: ${user.firstName} ${user.lastName}
                        </h3>
                        <button class="close-edit-btn" onclick="cancelEditUser('${userId}')" title="Close edit form">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form class="inline-edit-form" id="edit-form-${userId}" onsubmit="event.preventDefault(); saveUserEdit('${userId}')">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-first-name-${userId}">First Name</label>
                                <input type="text" id="edit-first-name-${userId}" value="${user.firstName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-last-name-${userId}">Last Name</label>
                                <input type="text" id="edit-last-name-${userId}" value="${user.lastName || ''}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-email-${userId}">Email</label>
                                <input type="email" id="edit-email-${userId}" value="${user.email || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-phone-${userId}">Phone</label>
                                <input type="tel" id="edit-phone-${userId}" value="${user.phone || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-location-${userId}">Location</label>
                                <input type="text" id="edit-location-${userId}" value="${user.location || ''}">
                            </div>
                            <div class="form-group">
                                <label for="edit-admin-status-${userId}">Admin Status</label>
                                <select id="edit-admin-status-${userId}" ${isCurrentAdmin ? 'disabled' : ''}>
                                    <option value="false" ${!user.isAdmin ? 'selected' : ''}>Regular User</option>
                                    <option value="true" ${user.isAdmin ? 'selected' : ''}>Admin</option>
                                </select>
                                ${isCurrentAdmin ? '<div class="admin-status-note">You cannot remove your own admin status</div>' : ''}
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="cancel-btn" onclick="cancelEditUser('${userId}')">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button type="submit" class="save-btn">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </td>
        `;
        
        // Insert the edit row after the user row
        userRow.parentNode.insertBefore(editRow, userRow.nextSibling);
        
        // Keep the user row visible, similar to ticket history
        userRow.style.display = '';

    } catch (error) {
        console.error('Error setting up inline editing:', error);
        showNotification('Error setting up edit form', 'error');
    }
}

// Function to cancel inline user editing
function cancelEditUser(userId) {
    try {
        // Find and remove the edit row
        const editRow = document.querySelector(`tr[data-edit-userid="${userId}"]`);
        if (editRow) {
            editRow.remove();
        }
        
        // Ensure the user row is visible
        const userRow = document.querySelector(`tr[data-userid="${userId}"]`);
        if (userRow) {
            userRow.style.display = '';
        }
    } catch (error) {
        console.error('Error canceling edit:', error);
        showNotification('Error canceling edit', 'error');
    }
}

// Function to save user edit
async function saveUserEdit(userId) {
    try {
        // Get values from the inline edit form
        const firstName = document.getElementById(`edit-first-name-${userId}`).value.trim();
        const lastName = document.getElementById(`edit-last-name-${userId}`).value.trim();
        const email = document.getElementById(`edit-email-${userId}`).value.trim();
        const phone = document.getElementById(`edit-phone-${userId}`).value.trim();
        const location = document.getElementById(`edit-location-${userId}`).value.trim();
        
        // Check if editing your own account and you're an admin
        const user = allUsers.find(u => u._id === userId);
        const isCurrentAdmin = localStorage.getItem('adminId') === userId && user?.isAdmin;
        
        // If editing your own admin account, always set isAdmin to true
        const isAdmin = isCurrentAdmin ? true : document.getElementById(`edit-admin-status-${userId}`).value === 'true';
        
        console.log("Saving user with values:", { firstName, lastName, email, phone, location, isAdmin });
        
        // Validate required fields
        if (!firstName || !lastName || !email) {
            showNotification('First name, last name, and email are required', 'error');
            return;
        }
        
        // Update UI to show loading state
        const saveBtn = document.querySelector(`#edit-form-${userId} .save-btn`);
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;
        }
        
        // Create the data to send
        const userData = {
            firstName,
            lastName,
            email,
            phone,
            location,
            isAdmin
        };
        
        console.log("Sending data to server:", userData);
        
        // Send request to server
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Server returned ${response.status}`);
        }
        
        console.log('Updated user data received from server:', data);
        
        // Show success notification
        showNotification('User updated successfully', 'success');
        
        // Reload all users to ensure everything is up to date
        loadUsers();
        
    } catch (error) {
        console.error('Error saving user edit:', error);
        showNotification(`Error: ${error.message}`, 'error');
        
        // Restore save button
        const saveBtn = document.querySelector(`#edit-form-${userId} .save-btn`);
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            saveBtn.disabled = false;
        }
    }
}

// Function to switch between tabs
function switchTab(tabId) {
    try {
        console.log(`Switching to tab: ${tabId}`);
        
        // Only allow valid tabs
        if (tabId !== 'users' && tabId !== 'tickets') {
            console.error('Invalid tab ID:', tabId);
            return;
        }
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        let tabAlreadyActive = false;
        tabContents.forEach(content => {
            if (content.id === `${tabId}Tab`) {
                tabAlreadyActive = content.classList.contains('active');
                content.classList.add('active');
                content.style.display = 'block';
            } else {
                content.classList.remove('active');
                content.style.display = 'none';
            }
        });
        
        // Only load content if the tab wasn't already active
        if (!tabAlreadyActive) {
            // Load content based on tab
            if (tabId === 'users') {
                loadUsers();
            } else if (tabId === 'tickets') {
                loadTickets();
            }
        }
    } catch (error) {
        console.error('Error switching tabs:', error);
        showNotification('Error switching tabs', 'error');
    }
}

// Confirm user deletion
function confirmDeleteUser(userId) {
    try {
        // Find the user
        const user = allUsers.find(u => u._id === userId);
        if (!user) {
            console.error('User not found for deletion:', userId);
            showNotification('User not found', 'error');
            return;
        }
        
        // Confirm deletion
        if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
            deleteUser(userId);
        }
    } catch (error) {
        console.error('Error confirming deletion:', error);
        showNotification('Error preparing deletion', 'error');
    }
}

// Delete user
async function deleteUser(userId) {
    try {
        // Show deleting notification
        showNotification('Deleting user...', 'info');
        
        // Get user row
        const userRow = document.querySelector(`tr[data-userid="${userId}"]`);
        if (userRow) {
            // Add deleting class
            userRow.classList.add('deleting');
            
            // Add deleting indicator
            userRow.innerHTML = `
                <td colspan="5" class="deleting-row">
                    <i class="fas fa-spinner fa-spin"></i> Deleting user...
                </td>
            `;
        }
        
        // Send delete request
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete user');
        }
        
        // Get response data
        const responseData = await response.json();
        
        // Show success notification
        const ticketsMessage = responseData.ticketsDeleted > 0 
            ? ` and ${responseData.ticketsDeleted} associated ticket${responseData.ticketsDeleted === 1 ? '' : 's'}`
            : '';
        
        showNotification(`User${ticketsMessage} deleted successfully`, 'success');
        
        // Reload users to refresh the table
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user: ' + error.message, 'error');
        
        // Reload users to restore the table
        loadUsers();
    }
}

// Confirm delete ticket
function confirmDeleteTicket(ticketId) {
    try {
        if (!ticketId) {
            showNotification('Invalid ticket ID', 'error');
            return;
        }
        
        if (confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
            deleteTicket(ticketId);
        }
    } catch (error) {
        console.error('Error confirming ticket deletion:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Delete ticket
async function deleteTicket(ticketId) {
    try {
        // Show deleting notification
        showNotification('Deleting ticket...', 'info');
        
        // Get ticket element and add deleting class
        const ticketElement = document.querySelector(`.ticket-card[data-ticket-id="${ticketId}"]`);
        if (ticketElement) {
            ticketElement.classList.add('deleting');
            ticketElement.innerHTML = `
                <div class="deleting-indicator">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Deleting ticket...</p>
                </div>
            `;
        }
        
        // Get the userId from the ticket card
        const userId = ticketElement?.getAttribute('data-user-id');
        
        // Choose the correct API endpoint based on whether we have the userId
        let apiEndpoint = userId 
            ? `/api/admin/tickets/${userId}/${ticketId}` 
            : `/api/tickets/${ticketId}`;
            
        console.log(`Deleting ticket with ID: ${ticketId} using endpoint: ${apiEndpoint}`);
        
        // Send delete request
        const response = await fetch(apiEndpoint, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete ticket');
        }
        
        // Show success notification
        showNotification('Ticket deleted successfully', 'success');
        
        // If in tickets tab, reload all tickets
        if (document.getElementById('ticketsTab').classList.contains('active')) {
            loadTickets();
        } 
        // Otherwise, if viewing a specific user's tickets, reload those
        else {
            const userTicketRow = ticketElement?.closest('.ticket-history-row');
            if (userTicketRow) {
                const userId = userTicketRow.getAttribute('data-ticket-history');
                if (userId) {
                    loadUserTickets(userId);
                }
            }
        }
    } catch (error) {
        console.error('Error deleting ticket:', error);
        showNotification('Error deleting ticket: ' + error.message, 'error');
        
        // Reload tickets to restore state
        if (document.getElementById('ticketsTab').classList.contains('active')) {
            loadTickets();
        }
    }
}

// Function to open inline edit form for a ticket
function openEditTicketModal(ticketId) {
    try {
        console.log(`Opening edit for ticket: ${ticketId}`);
        
        // Show loading notification
        showNotification('Loading ticket details...', 'info');
        
        // Find the ticket card
        const ticketCard = document.querySelector(`.ticket-card[data-ticket-id="${ticketId}"]`);
        if (!ticketCard) {
            throw new Error('Ticket card not found');
        }
        
        // Get the ticket data from the server
        fetch(`/api/tickets/${ticketId}`, {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch ticket data');
            }
            return response.json();
        })
        .then(ticket => {
            console.log('Ticket data:', ticket);
            
            // Store original card HTML in a data attribute for canceling
            ticketCard.setAttribute('data-original-html', ticketCard.innerHTML);
            ticketCard.setAttribute('data-is-editing', 'true');
            
            // Format ticket date for display
            const ticketDate = ticket.timestamp ? new Date(ticket.timestamp).toLocaleDateString() : 'N/A';
            
            // Create inline edit form
            const editFormHTML = `
                <div class="ticket-edit-form">
                    <div class="edit-form-header">
                        <h3>Edit Ticket</h3>
                        <div class="edit-form-actions">
                            <button type="button" class="cancel-edit-btn" onclick="cancelTicketEdit('${ticketId}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <form id="inline-ticket-edit-${ticketId}" onsubmit="event.preventDefault(); saveTicketEdit('${ticketId}')">
                        <div class="edit-form-row">
                            <div class="edit-form-group">
                                <label for="edit-game-${ticketId}">Game</label>
                                <input type="text" id="edit-game-${ticketId}" name="game" value="${ticket.game || ''}" required>
                                <small class="form-text text-muted">Game date: ${ticketDate}</small>
                            </div>
                        </div>
                        
                        <div class="edit-form-row">
                            <div class="edit-form-group">
                                <label for="edit-section-type-${ticketId}">Section Type</label>
                                <select id="edit-section-type-${ticketId}" name="sectionType" onchange="updateTicketSections('${ticketId}'); calculateTicketPrice('${ticketId}');" required>
                                    <option value="Floor" ${ticket.sectionType === 'Floor' ? 'selected' : ''}>Floor</option>
                                    <option value="VIP" ${ticket.sectionType === 'VIP' ? 'selected' : ''}>VIP</option>
                                    <option value="Lower" ${ticket.sectionType === 'Lower' ? 'selected' : ''}>Lower</option>
                                    <option value="Mid" ${ticket.sectionType === 'Mid' ? 'selected' : ''}>Mid</option>
                                    <option value="Upper" ${ticket.sectionType === 'Upper' ? 'selected' : ''}>Upper</option>
                                    <option value="Special" ${ticket.sectionType === 'Special' ? 'selected' : ''}>Special</option>
                                </select>
                            </div>
                            
                            <div class="edit-form-group">
                                <label for="edit-section-${ticketId}">Section</label>
                                <select id="edit-section-${ticketId}" name="section" required onchange="calculateTicketPrice('${ticketId}');">
                                    <option value="${ticket.section}">${ticket.section}</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="edit-form-row">
                            <div class="edit-form-group">
                                <label for="edit-quantity-${ticketId}">Quantity</label>
                                <input type="number" id="edit-quantity-${ticketId}" name="quantity" value="${ticket.quantity || 1}" min="1" max="8" required onchange="calculateTicketPrice('${ticketId}');" onkeyup="calculateTicketPrice('${ticketId}');">
                            </div>
                            
                            <div class="edit-form-group">
                                <label for="edit-status-${ticketId}">Status</label>
                                <select id="edit-status-${ticketId}" name="status" required>
                                    <option value="pending" ${ticket.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="approved" ${ticket.status === 'approved' ? 'selected' : ''}>Approved</option>
                                    <option value="rejected" ${ticket.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="edit-form-row">
                            <div class="edit-form-group">
                                <label for="edit-price-details-${ticketId}">Price Details</label>
                                <div id="edit-price-details-${ticketId}" class="price-details">
                                    <div class="price-item">
                                        <span>Base Price:</span>
                                        <span id="edit-base-price-${ticketId}">$${ticket.basePrice ? ticket.basePrice.toFixed(2) : '0.00'}</span>
                                    </div>
                                    <div class="price-item">
                                        <span>Service Fee:</span>
                                        <span id="edit-service-fee-${ticketId}">$${ticket.serviceFee ? ticket.serviceFee.toFixed(2) : (ticket.basePrice * 0.15).toFixed(2)}</span>
                                    </div>
                                    <div class="price-item">
                                        <span>Processing Fee:</span>
                                        <span id="edit-processing-fee-${ticketId}">$5.00</span>
                                    </div>
                                    <div class="price-item total">
                                        <span>Total Price:</span>
                                        <span id="edit-total-price-${ticketId}">$${ticket.totalPrice ? ticket.totalPrice.toFixed(2) : '0.00'}</span>
                                        <input type="hidden" id="edit-total-price-input-${ticketId}" name="totalPrice" value="${ticket.totalPrice || 0}">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="edit-form-row">
                            <div class="edit-form-group full-width">
                                <label for="edit-notes-${ticketId}">Admin Notes</label>
                                <textarea id="edit-notes-${ticketId}" name="adminNotes" rows="2">${ticket.adminNotes || ''}</textarea>
                            </div>
                        </div>
                        
                        <div class="edit-form-actions">
                            <button type="button" class="cancel-btn" onclick="cancelTicketEdit('${ticketId}')">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button type="submit" class="save-btn">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            // Replace card content with edit form
            ticketCard.innerHTML = editFormHTML;
            
            // Populate sections dropdown
            updateTicketSections(ticketId);
            
            // Set the section value after populating options
            setTimeout(() => {
                const sectionSelect = document.getElementById(`edit-section-${ticketId}`);
                if (sectionSelect) {
                    // Make sure the section value exists in the dropdown
                    const sectionExists = Array.from(sectionSelect.options).some(option => option.value === ticket.section);
                    if (sectionExists) {
                        sectionSelect.value = ticket.section;
                    } else {
                        // If the section doesn't exist in the dropdown, add it
                        const option = document.createElement('option');
                        option.value = ticket.section;
                        option.textContent = ticket.section;
                        sectionSelect.appendChild(option);
                        sectionSelect.value = ticket.section;
                    }
                    
                    // Calculate initial price using our function to ensure consistency between card and edit form
                    const priceCalc = calculateTicketPrice(ticketId);
                    
                    // Update the ticket record's price to match what we calculate
                    if (priceCalc) {
                        ticket.totalPrice = priceCalc.totalPrice;
                        ticket.basePrice = priceCalc.basePrice;
                        ticket.serviceFee = priceCalc.serviceFee;
                        ticket.processingFee = priceCalc.processingFee;
                        
                        // Also update the original card's price display for when edit is canceled
                        const originalHtml = ticketCard.getAttribute('data-original-html');
                        if (originalHtml) {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = originalHtml;
                            const priceElement = tempDiv.querySelector('.price');
                            if (priceElement) {
                                priceElement.textContent = '$' + priceCalc.totalPrice.toFixed(2);
                                ticketCard.setAttribute('data-original-html', tempDiv.innerHTML);
                            }
                        }
                    }
                }
            }, 100);
            
            // Clear notification
            clearNotifications();
        })
        .catch(error => {
            console.error('Error opening ticket edit form:', error);
            showNotification('Error: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error setting up ticket edit form:', error);
        showNotification('Error setting up edit form', 'error');
    }
}

// Cancel ticket editing
function cancelTicketEdit(ticketId) {
    try {
        const ticketCard = document.querySelector(`.ticket-card[data-ticket-id="${ticketId}"]`);
        if (!ticketCard) {
            console.error('Ticket card not found');
            return;
        }
        
        // Restore original HTML
        const originalHTML = ticketCard.getAttribute('data-original-html');
        if (originalHTML) {
            ticketCard.innerHTML = originalHTML;
            ticketCard.removeAttribute('data-is-editing');
            ticketCard.removeAttribute('data-original-html');
        } else {
            console.error('Original HTML not found, refreshing data instead');
            loadTickets();
        }
    } catch (error) {
        console.error('Error canceling ticket edit:', error);
        showNotification('Error canceling edit', 'error');
    }
}

// Update sections dropdown based on selected section type
function updateTicketSections(ticketId) {
    const sectionTypeSelect = document.getElementById(`edit-section-type-${ticketId}`);
    const sectionSelect = document.getElementById(`edit-section-${ticketId}`);
    
    if (!sectionTypeSelect || !sectionSelect) return;
    
    const sectionType = sectionTypeSelect.value;
    
    // Clear existing options
    sectionSelect.innerHTML = '';
    
    // Add options based on section type
    if (sectionType === 'Floor') {
        // Floor sections
        const floorSections = ['F1', 'F2', 'F3', 'F4', 'FL2', 'FL3', 'FL6', 'FL7', 'FL17', 'FL18', 'FL20', 'FL21', 'Courtside'];
        floorSections.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            sectionSelect.appendChild(option);
        });
    } else if (sectionType === 'VIP') {
        // VIP sections
        const vipSections = ['VIP1', 'VIP2', 'VIP3', 'VIP11', 'VIP12', 'VIP13', 'VIP21'];
        vipSections.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            sectionSelect.appendChild(option);
        });
    } else if (sectionType === 'Lower') {
        // Lower sections (100s)
        for (let i = 1; i <= 22; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = `Section ${i}`;
            sectionSelect.appendChild(option);
        }
    } else if (sectionType === 'Mid') {
        // Mid sections
        const midSections = ['107', '109', '111', '113', '115', '137', '139', '141', '143', '145'];
        midSections.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = `Section ${section}`;
            sectionSelect.appendChild(option);
        });
    } else if (sectionType === 'Upper') {
        // Upper sections (300s)
        for (let i = 301; i <= 330; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = `Section ${i}`;
            sectionSelect.appendChild(option);
        }
    } else if (sectionType === 'Special') {
        // Special areas
        const specialSections = ['Suites', 'Lounge', 'Garden View', 'Executive Suites', 'Garden Deck', 'Lofts', 'Rafters'];
        specialSections.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            sectionSelect.appendChild(option);
        });
    }
    
    // After updating the section options, recalculate the price
    calculateTicketPrice(ticketId);
}

// Calculate ticket price
function calculateTicketPrice(ticketId) {
    const sectionTypeSelect = document.getElementById(`edit-section-type-${ticketId}`);
    const sectionSelect = document.getElementById(`edit-section-${ticketId}`);
    const quantityInput = document.getElementById(`edit-quantity-${ticketId}`);
    
    if (!sectionTypeSelect || !sectionSelect || !quantityInput) return;
    
    const sectionType = sectionTypeSelect.value;
    const section = sectionSelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    
    // Calculate base price based on section type
    let basePrice = 0;
    
    // Determine base price based on section type
    if (sectionType === 'Floor') {
        basePrice = 750; // Floor sections are most premium
    } else if (sectionType === 'VIP') {
        basePrice = 600; // VIP sections
    } else if (sectionType === 'Lower') {
        basePrice = 350; // Lower level
    } else if (sectionType === 'Mid') {
        basePrice = 225; // Mid level
    } else if (sectionType === 'Upper') {
        basePrice = 120; // Upper level
    } else if (sectionType === 'Special') {
        basePrice = 500; // Suites & special areas
    }
    
    // Add price variations for premium sections
    if (['FL20', 'FL21'].includes(section)) basePrice += 100; // Best floor seats
    if (['VIP12'].includes(section)) basePrice += 75; // Best VIP area
    if (['12', '21'].includes(section)) basePrice += 50; // Best lower level
    if (['Garden Deck', 'Executive Suites'].includes(section)) basePrice += 150; // Premium special areas
    
    // Apply quantity discount
    let quantityMultiplier = 1;
    if (quantity >= 5) {
        quantityMultiplier = 0.9; // 10% discount for 5+ tickets
    } else if (quantity >= 3) {
        quantityMultiplier = 0.95; // 5% discount for 3-4 tickets
    }
    
    const serviceFee = basePrice * 0.15;
    const processingFee = 5;
    
    // Calculate the total price correctly considering all factors
    const baseTotal = basePrice * quantity;
    const serviceFeeTotal = serviceFee * quantity;
    const processingFeeTotal = processingFee * quantity;
    const totalBeforeDiscount = baseTotal + serviceFeeTotal + processingFeeTotal;
    const totalPrice = totalBeforeDiscount * quantityMultiplier;
    
    // Update ticket card with calculated price
    const ticketCard = document.querySelector(`.ticket-card[data-ticket-id="${ticketId}"]`);
    if (ticketCard) {
        // Update price display in edit form
        const priceDetails = document.querySelector('.price-details');
        if (priceDetails) {
            const basePriceSpan = priceDetails.querySelector('#edit-base-price-' + ticketId);
            const serviceFeeSpan = priceDetails.querySelector('#edit-service-fee-' + ticketId);
            const processingFeeSpan = priceDetails.querySelector('#edit-processing-fee-' + ticketId);
            const totalPriceSpan = priceDetails.querySelector('#edit-total-price-' + ticketId);
            const totalPriceInput = priceDetails.querySelector('#edit-total-price-input-' + ticketId);
            
            if (basePriceSpan) basePriceSpan.textContent = '$' + basePrice.toFixed(2);
            if (serviceFeeSpan) serviceFeeSpan.textContent = '$' + serviceFee.toFixed(2);
            if (processingFeeSpan) processingFeeSpan.textContent = '$' + processingFee.toFixed(2);
            if (totalPriceSpan) totalPriceSpan.textContent = '$' + totalPrice.toFixed(2);
            if (totalPriceInput) totalPriceInput.value = totalPrice.toFixed(2);
        }
        
        // Also update the visible price on the ticket card itself for consistency
        const priceElement = ticketCard.querySelector('.price');
        if (priceElement) {
            priceElement.textContent = '$' + totalPrice.toFixed(2);
        }
    }
    
    return {
        basePrice: basePrice,
        serviceFee: serviceFee,
        processingFee: processingFee,
        totalPrice: totalPrice
    };
}

// Clear notifications
function clearNotifications() {
    const notifications = document.querySelectorAll('.toast');
    notifications.forEach(notification => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
}

// Initialize tickets section with event listeners
function initializeTicketsSection() {
    try {
        console.log('Initializing tickets section');
        
        // Add search input event listener
        const searchInput = document.getElementById('ticket-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                filterAndDisplayTickets();
            });
        }
        
        // Add status filter dropdown event listener
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                filterAndDisplayTickets();
            });
        }
        
        // Add filter buttons event listeners
        const filterButtons = document.querySelectorAll('.ticket-filter-buttons .filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update status filter dropdown value
                if (statusFilter) {
                    statusFilter.value = btn.dataset.filter;
                }
                filterAndDisplayTickets();
            });
        });
        
        // Load tickets initially
        loadTickets();
        
    } catch (error) {
        console.error('Error initializing tickets section:', error);
        showNotification('Error initializing tickets section', 'error');
    }
}

// Make sure to initialize tickets section when the tab is first shown
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're already on the tickets tab
    if (document.getElementById('ticketsTab').classList.contains('active')) {
        initializeTicketsSection();
    }
    
    // Add event listener for tab switching
    const ticketsTab = document.querySelector('[data-tab="ticketsTab"]');
    if (ticketsTab) {
        ticketsTab.addEventListener('click', function() {
            initializeTicketsSection();
        });
    }
});

// Save ticket edit
function saveTicketEdit(ticketId) {
    try {
        const form = document.getElementById(`inline-ticket-edit-${ticketId}`);
        if (!form) {
            showNotification('Edit form not found', 'error');
            return;
        }
        
        // Get form data
        const formData = new FormData(form);
        const ticketData = Object.fromEntries(formData.entries());
        
        // Validate required fields
        if (!ticketData.game || !ticketData.sectionType || !ticketData.section || 
            !ticketData.quantity || !ticketData.status) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Get the calculated prices directly from our function
        const priceCalculation = calculateTicketPrice(ticketId);
        if (!priceCalculation) {
            showNotification('Error calculating ticket price', 'error');
            return;
        }
        
        // Update ticket data with calculated values
        ticketData.basePrice = priceCalculation.basePrice;
        ticketData.serviceFee = priceCalculation.serviceFee;
        ticketData.processingFee = priceCalculation.processingFee;
        ticketData.totalPrice = priceCalculation.totalPrice;
        
        // Convert numeric fields
        ticketData.quantity = parseInt(ticketData.quantity);
        ticketData.totalPrice = parseFloat(ticketData.totalPrice);
        ticketData.basePrice = parseFloat(ticketData.basePrice);
        ticketData.serviceFee = parseFloat(ticketData.serviceFee);
        ticketData.processingFee = parseFloat(ticketData.processingFee);
        
        // Show saving indicator
        showNotification('Saving changes...', 'info');
        
        console.log('Saving ticket with data:', ticketData);
        
        // Send update request
        fetch(`/api/tickets/${ticketId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(ticketData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update ticket');
            }
            return response.json();
        })
        .then(result => {
            showNotification('Ticket updated successfully', 'success');
            
            // Also update the visible price on the card
            const ticketCard = document.querySelector(`.ticket-card[data-ticket-id="${ticketId}"]`);
            if (ticketCard) {
                const priceElement = ticketCard.querySelector('.price');
                if (priceElement) {
                    priceElement.textContent = '$' + ticketData.totalPrice.toFixed(2);
                }
            }
            
            // If in tickets tab, reload all tickets
            if (document.getElementById('ticketsTab').classList.contains('active')) {
                loadTickets();
            } else {
                // Try to find the user ID in case we're in a user's ticket history
                const ticketCard = document.querySelector(`.ticket-card[data-ticket-id="${ticketId}"]`);
                if (ticketCard) {
                    const historyRow = ticketCard.closest('[data-ticket-history]');
                    if (historyRow) {
                        const userId = historyRow.getAttribute('data-ticket-history');
                        if (userId) {
                            loadUserTickets(userId);
                        }
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error updating ticket:', error);
            showNotification('Error: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Error saving ticket changes:', error);
        showNotification('Error saving changes', 'error');
    }
} 

// Filter tickets based on filters
function filterTickets() {
    try {
        console.log('Filtering tickets');
        const ownerFilter = document.getElementById('ticket-owner-filter')?.value || 'all';
        const gameFilter = document.getElementById('ticket-game-filter')?.value || 'all';
        const sectionTypeFilter = document.getElementById('ticket-section-filter')?.value || 'all';
        const statusFilter = document.getElementById('ticket-status-filter')?.value?.toLowerCase() || 'all';
        
        console.log(`Filter values: owner=${ownerFilter}, game=${gameFilter}, sectionType=${sectionTypeFilter}, status=${statusFilter}`);
        
        // Get all ticket cards
        const ticketCards = document.querySelectorAll('#tickets-grid .ticket-card');
        console.log(`Found ${ticketCards.length} ticket cards to filter`);
        
        let visibleCount = 0;
        
        ticketCards.forEach((card, index) => {
            try {
                // Get ticket data using safe null checks
                const gameElement = card.querySelector('.ticket-header h3');
                const game = gameElement ? gameElement.textContent.toLowerCase() : '';
                
                // Find the section type - look for the info row that contains "Section Type:"
                let sectionType = '';
                const infoRows = card.querySelectorAll('.ticket-details .ticket-info-row');
                for (const row of infoRows) {
                    const label = row.querySelector('.info-label');
                    if (label && label.textContent.includes('Section Type:')) {
                        const valueElement = row.querySelector('.info-value');
                        sectionType = valueElement ? valueElement.textContent.toLowerCase() : '';
                        break;
                    }
                }
                
                const ownerElement = card.querySelector('.owner-name');
                const ownerName = ownerElement ? ownerElement.textContent.toLowerCase() : '';
                
                const cardStatus = card.getAttribute('data-status')?.toLowerCase() || 'pending';
                const userId = card.getAttribute('data-user-id') || '';
                
                // Debug the values extracted from this card
                console.log(`Card ${index + 1}: game=${game}, sectionType=${sectionType}, owner=${ownerName}, status=${cardStatus}, userId=${userId}`);
                
                // Check if ticket matches all filters
                const matchesOwner = ownerFilter === 'all' || userId === ownerFilter;
                const matchesGame = gameFilter === 'all' || game.includes(gameFilter.toLowerCase());
                const matchesSectionType = sectionTypeFilter === 'all' || sectionType === sectionTypeFilter.toLowerCase();
                const matchesStatus = statusFilter === 'all' || cardStatus === statusFilter;
                
                // Debug the match results
                console.log(`Card ${index + 1} matches: owner=${matchesOwner}, game=${matchesGame}, sectionType=${matchesSectionType}, status=${matchesStatus}`);
                
                // Show or hide ticket based on filters
                if (matchesOwner && matchesGame && matchesSectionType && matchesStatus) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            } catch (cardError) {
                console.error(`Error processing card ${index + 1}:`, cardError);
                // Don't hide the card if there was an error
                card.style.display = '';
                visibleCount++;
            }
        });
        
        console.log(`Filter results: ${visibleCount} of ${ticketCards.length} tickets visible`);
        
        // Update ticket count display
        const ticketCountElement = document.getElementById('ticket-count');
        if (ticketCountElement) {
            const totalTickets = ticketCards.length;
            ticketCountElement.innerHTML = `
                <i class="fas fa-ticket-alt"></i>
                <span>${visibleCount}</span> of ${totalTickets} Tickets
            `;
        }
        
        // Show/hide no tickets message
        const noTicketsElement = document.getElementById('no-tickets');
        if (noTicketsElement) {
            if (visibleCount === 0) {
                noTicketsElement.style.display = 'block';
                noTicketsElement.innerHTML = `
                    <i class="fas fa-ticket-alt"></i>
                    No tickets found matching your criteria.
                `;
            } else {
                noTicketsElement.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error filtering tickets:', error);
        showNotification('Error filtering tickets: ' + error.message, 'error');
    }
}

// Populate filter dropdowns with data from tickets
function populateTicketFilters(tickets) {
    try {
        console.log('Populating ticket filters');
        
        // Get unique users and games from tickets
        const users = new Map(); // Use Map to track both ID and name
        const games = new Set();
        
        // First fetch all users to get their names
        fetch('/api/admin/users', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch users for filter options');
            }
            return response.json();
        })
        .then(userData => {
            // Create a map of user IDs to user names
            const userMap = {};
            userData.forEach(user => {
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
                userMap[user._id] = fullName;
            });
            
            // Process tickets to extract unique values
            tickets.forEach(ticket => {
                // Add user if we have the name
                if (ticket.userId && userMap[ticket.userId]) {
                    users.set(ticket.userId, userMap[ticket.userId]);
                }
                
                // Add game
                if (ticket.game) {
                    games.add(ticket.game);
                }
            });
            
            // Populate the owner filter dropdown
            const ownerFilterEl = document.getElementById('ticket-owner-filter');
            if (ownerFilterEl) {
                // Clear existing options except for the "All" option
                while (ownerFilterEl.options.length > 1) {
                    ownerFilterEl.remove(1);
                }
                
                // Add sorted user options
                Array.from(users.entries())
                    .sort((a, b) => a[1].localeCompare(b[1])) // Sort by name
                    .forEach(([userId, userName]) => {
                        const option = document.createElement('option');
                        option.value = userId;
                        option.textContent = userName;
                        ownerFilterEl.appendChild(option);
                    });
            }
            
            // Populate the game filter dropdown
            const gameFilterEl = document.getElementById('ticket-game-filter');
            if (gameFilterEl) {
                // Clear existing options except for the "All" option
                while (gameFilterEl.options.length > 1) {
                    gameFilterEl.remove(1);
                }
                
                // Add sorted game options
                Array.from(games)
                    .sort() // Sort alphabetically
                    .forEach(game => {
                        const option = document.createElement('option');
                        option.value = game;
                        option.textContent = game;
                        gameFilterEl.appendChild(option);
                    });
            }
        })
        .catch(error => {
            console.error('Error populating filter dropdowns:', error);
            showNotification('Error loading filter options', 'error');
        });
    } catch (error) {
        console.error('Error in populateTicketFilters:', error);
    }
}

// Function to reset all ticket filters
function resetTicketFilters() {
    try {
        console.log('Resetting all ticket filters');
        
        // Reset all filter dropdowns to 'all'
        const ownerFilter = document.getElementById('ticket-owner-filter');
        const gameFilter = document.getElementById('ticket-game-filter');
        const sectionFilter = document.getElementById('ticket-section-filter');
        const statusFilter = document.getElementById('ticket-status-filter');
        
        if (ownerFilter) ownerFilter.value = 'all';
        if (gameFilter) gameFilter.value = 'all';
        if (sectionFilter) sectionFilter.value = 'all';
        if (statusFilter) statusFilter.value = 'all';
        
        // Apply the reset filters
        filterTickets();
        
        showNotification('Filters have been reset', 'success');
    } catch (error) {
        console.error('Error resetting filters:', error);
        showNotification('Error resetting filters', 'error');
    }
}

// Function to recalculate and update ticket price in the database
async function recalculateAndUpdateTicketPrice(ticket) {
    try {
        // Create a temporary element to pass to calculateTicketPrice
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = `<div class="ticket-card" data-ticket-id="${ticket._id}"></div>`;
        document.body.appendChild(tempDiv);
        
        // Setup needed fields for price calculation
        const sectionType = ticket.sectionType || '';
        const section = ticket.section || '';
        const quantity = parseInt(ticket.quantity) || 1;
        
        // Calculate price using the same algorithm
        let basePrice = 0;
        
        // Determine base price based on section type
        if (sectionType === 'Floor') {
            basePrice = 750;
        } else if (sectionType === 'VIP') {
            basePrice = 600;
        } else if (sectionType === 'Lower') {
            basePrice = 350;
        } else if (sectionType === 'Mid') {
            basePrice = 225;
        } else if (sectionType === 'Upper') {
            basePrice = 120;
        } else if (sectionType === 'Special') {
            basePrice = 500;
        }
        
        // Add price variations for premium sections
        if (['FL20', 'FL21'].includes(section)) basePrice += 100;
        if (['VIP12'].includes(section)) basePrice += 75;
        if (['12', '21'].includes(section)) basePrice += 50;
        if (['Garden Deck', 'Executive Suites'].includes(section)) basePrice += 150;
        
        // Apply quantity discount
        let quantityMultiplier = 1;
        if (quantity >= 5) {
            quantityMultiplier = 0.9; // 10% discount for 5+ tickets
        } else if (quantity >= 3) {
            quantityMultiplier = 0.95; // 5% discount for 3-4 tickets
        }
        
        const serviceFee = basePrice * 0.15;
        const processingFee = 5;
        
        const baseTotal = basePrice * quantity;
        const serviceFeeTotal = serviceFee * quantity;
        const processingFeeTotal = processingFee * quantity;
        const totalBeforeDiscount = baseTotal + serviceFeeTotal + processingFeeTotal;
        const calculatedTotal = totalBeforeDiscount * quantityMultiplier;
        
        console.log(`Recalculated price for ticket ${ticket._id}:`, {
            originalPrice: ticket.totalPrice,
            calculatedPrice: calculatedTotal.toFixed(2),
            basePrice,
            serviceFee,
            processingFee
        });
        
        // Only update if price is different
        if (Math.abs(parseFloat(ticket.totalPrice) - calculatedTotal) > 0.01) {
            console.log(`Updating price in database for ticket ${ticket._id}`);
            
            // Update price in database
            const response = await fetch(`/api/tickets/${ticket._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    basePrice: basePrice,
                    serviceFee: serviceFee,
                    processingFee: processingFee,
                    totalPrice: calculatedTotal
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update ticket price');
            }
            
            const result = await response.json();
            console.log(`Price updated successfully for ticket ${ticket._id}`);
            
            // Update the ticket object
            ticket.basePrice = basePrice;
            ticket.serviceFee = serviceFee;
            ticket.processingFee = processingFee;
            ticket.totalPrice = calculatedTotal;
        }
        
        // Clean up
        tempDiv.remove();
        
        return calculatedTotal;
    } catch (error) {
        console.error(`Error recalculating price for ticket ${ticket._id}:`, error);
        return null;
    }
}