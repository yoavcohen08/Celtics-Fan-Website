// Function to update navigation based on auth status
function updateNavigation(isAuthenticated, user) {
    const nav = document.querySelector('nav');
    const existingAuthNav = nav.querySelector('.auth-nav');
    if (existingAuthNav) {
        existingAuthNav.remove();
    }

    // Get the regular nav buttons that should be hidden when logged in
    const navRight = nav.querySelector('.nav-right');
    
    if (isAuthenticated) {
        // Hide login/signup buttons when user is logged in
        if (navRight) {
            navRight.style.display = 'none';
        }
        
        const authNav = document.createElement('div');
        authNav.className = 'auth-nav';
        
        let adminLink = '';
        // Add admin link if user is an admin
        if (user.isAdmin) {
            // Store admin status in localStorage to prevent redirect loops
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('adminCheckTime', Date.now().toString());
            
            adminLink = `<a href="/admin.html" class="admin-btn" onclick="event.preventDefault(); navigateToAdmin(event)">Admin Dashboard</a>`;
        } else {
            localStorage.setItem('isAdmin', 'false');
            localStorage.setItem('adminCheckTime', Date.now().toString());
        }
        
        authNav.innerHTML = `
            <span class="welcome">Welcome, ${user.firstName}</span>
            <a href="/profile.html" class="profile-btn">
                <i class="fas fa-user"></i>
                My Profile
            </a>
            ${adminLink}
            <a href="#" class="logout-btn" onclick="handleLogout(event)">Logout</a>
        `;
        
        // Insert auth nav into the nav-container instead of appending to nav
        const navContainer = nav.querySelector('.nav-container');
        if (navContainer) {
            // Look for nav-right in the container
            const navRight = navContainer.querySelector('.nav-right');
            if (navRight) {
                // Replace nav-right with auth-nav
                navRight.replaceWith(authNav);
            } else {
                // Append to the container if nav-right not found
                navContainer.appendChild(authNav);
            }
            
            // Apply necessary styles
            navContainer.style.display = 'flex';
            navContainer.style.alignItems = 'center';
            navContainer.style.justifyContent = 'space-between';
        } else {
            // Fallback if nav-container not found
            nav.appendChild(authNav);
        }
    } else {
        // Show login/signup buttons when user is not logged in
        if (navRight) {
            navRight.style.display = 'flex';
        }
        
        // Clear admin status
        localStorage.removeItem('isAdmin');
    }
}

// Function to handle smooth navigation to admin page
function navigateToAdmin(event) {
    // If we're already on the admin page, don't navigate
    if (window.location.pathname === '/admin.html') {
        return;
    }
    
    window.location.href = '/admin.html';
}

// Function to check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const data = await response.json();
        updateNavigation(data.isAuthenticated, data.user);
        return data;
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateNavigation(false, null);
        return { isAuthenticated: false, user: null };
    }
}

// Function to handle logout
async function handleLogout(event) {
    event.preventDefault();
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            // Clear any session data
            console.log('Logout successful');
            
            // Redirect to home page
            window.location.href = '/MYweb.html';
        } else {
            const data = await response.json();
            console.error('Logout failed:', data.message);
        }
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Function to logout without page navigation
async function logout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log('Logout successful');
            return { success: true };
        } else {
            const data = await response.json();
            console.error('Logout failed:', data.message);
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error('Error logging out:', error);
        return { success: false, message: 'Network error' };
    }
}

// Add styles for auth elements
const style = document.createElement('style');
style.textContent = `
    .auth-nav {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-left: auto;
        padding-right: 20px;
    }
    .auth-nav a {
        color: var(--white);
        text-decoration: none;
        padding: 8px 16px;
        border-radius: 4px;
        transition: all 0.3s ease;
        font-weight: 500;
        font-size: 0.95rem;
    }
    .auth-nav a:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
    }
    .auth-nav .welcome {
        color: var(--celtics-gold);
        margin-right: 20px;
        font-weight: 500;
        white-space: nowrap;
    }
    .auth-nav .profile-btn {
        background: rgba(186, 150, 83, 0.1);
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(186, 150, 83, 0.2);
        white-space: nowrap;
    }
    .auth-nav .profile-btn:hover {
        background: rgba(186, 150, 83, 0.2);
        border-color: rgba(186, 150, 83, 0.3);
    }
    .auth-nav .profile-btn i {
        font-size: 16px;
        color: var(--celtics-gold);
    }
    .auth-nav .admin-btn {
        background: rgba(26, 35, 126, 0.1);
        color: #1a237e;
        border: 1px solid rgba(26, 35, 126, 0.2);
        font-weight: 600;
        white-space: nowrap;
    }
    .auth-nav .admin-btn:hover {
        background: rgba(26, 35, 126, 0.2);
        color: #1a237e;
    }
    .auth-nav .tickets-btn {
        background: var(--celtics-gold);
        color: var(--black);
        font-weight: 600;
        white-space: nowrap;
    }
    .auth-nav .tickets-btn:hover {
        background: #d4a74a;
        color: var(--black);
    }
    .auth-nav .logout-btn {
        background: rgba(220, 53, 69, 0.1);
        color: #dc3545;
        border: 1px solid rgba(220, 53, 69, 0.2);
        white-space: nowrap;
    }
    .auth-nav .logout-btn:hover {
        background: rgba(220, 53, 69, 0.2);
        color: #dc3545;
    }
    
    /* Page transition styles */
    html.smooth-transitions {
        scroll-behavior: smooth;
    }
    
    body {
        opacity: 1;
        transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    body.fade-out {
        opacity: 0;
        transform: translateY(8px);
    }
    
    body.fade-in {
        animation: fadeIn 0.5s ease forwards;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Preloader for smoother experience */
    .page-transition-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
    }
    
    .page-transition-overlay.active {
        opacity: 1;
        pointer-events: all;
    }
    
    .page-loader {
        width: 48px;
        height: 48px;
        border: 4px solid rgba(186, 150, 83, 0.4);
        border-left-color: var(--celtics-gold);
        border-radius: 50%;
        animation: loader-spin 1s linear infinite;
    }
    
    @keyframes loader-spin {
        to {
            transform: rotate(360deg);
        }
    }
    
    /* Responsive styles for auth nav */
    @media (max-width: 992px) {
        .auth-nav {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
            width: 100%;
            padding: 10px 0;
        }
        
        .auth-nav .welcome {
            margin-right: 0;
            margin-bottom: 10px;
        }
        
        .auth-nav a {
            width: 100%;
            text-align: center;
        }
    }
`;
document.head.appendChild(style);

// Create and append the preloader overlay
function createPreloader() {
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    overlay.innerHTML = '<div class="page-loader"></div>';
    document.body.appendChild(overlay);
    return overlay;
}

// Check auth status when the page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupPageTransitions();
    
    // Add smooth scroll behavior
    document.documentElement.classList.add('smooth-transitions');
    
    // Apply fade-in animation to the body when page loads
    document.body.classList.add('fade-in');
});

// Page transition handler
function setupPageTransitions() {
    // Create the preloader
    const preloader = createPreloader();
    
    // Check if this page was just loaded with a transition
    if (sessionStorage.getItem('pageIsLoading') === 'true') {
        // Clear the loading flag
        sessionStorage.removeItem('pageIsLoading');
    }

    // Add click handlers to all internal links
    document.querySelectorAll('a').forEach(link => {
        // Skip links that should not have transitions
        if (link.hostname === window.location.hostname && 
            !link.hasAttribute('data-no-transition') &&
            !link.getAttribute('href').startsWith('#')) {
            
            // Skip links with onclick handlers but allow our own logout handler
            const onclickAttr = link.getAttribute('onclick');
            if (onclickAttr && !onclickAttr.includes('handleLogout')) {
                return;
            }
            
            link.addEventListener('click', e => {
                // Skip the transition if the user is holding a modifier key
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    return;
                }
                
                // Don't intercept if it has an onclick handler other than our logout
                if (onclickAttr && !onclickAttr.includes('handleLogout')) {
                    return;
                }
                
                // Don't apply transitions to logout functionality
                if (onclickAttr && onclickAttr.includes('handleLogout')) {
                    return;
                }
                
                e.preventDefault();
                const target = link.getAttribute('href');
                
                // Set loading flag for next page
                sessionStorage.setItem('pageIsLoading', 'true');
                
                // Show the preloader
                preloader.classList.add('active');
                
                // Fade out body
                document.body.classList.add('fade-out');
                
                // Navigate after the transition
                setTimeout(() => {
                    window.location.href = target;
                }, 300);
            });
        }
    });
    
    // Add a special handler for forms to make them fade out before submitting
    document.querySelectorAll('form:not([data-no-transition])').forEach(form => {
        const submitHandler = form.getAttribute('onsubmit');
        
        // Skip forms with custom submit handlers like login/register
        if (submitHandler) {
            return;
        }
        
        form.addEventListener('submit', e => {
            // Set the loading flag for next page
            sessionStorage.setItem('pageIsLoading', 'true');
            
            // Show the preloader
            preloader.classList.add('active');
            
            // Fade out the page
            document.body.classList.add('fade-out');
            
            // Allow short delay for the fade effect
            if (!form.action) {
                e.preventDefault();
                setTimeout(() => {
                    form.submit();
                }, 300);
            }
        });
    });
} 