/**
 * Navbar behavior for Boston Celtics website
 * Makes the navbar stick to the top and adds scroll effects
 */

// Function to handle navbar scroll effects
function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    // Initial state setup
    navbar.style.background = 'rgba(0, 0, 0, 0.95)';
    navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
    navbar.style.borderBottom = '1px solid rgba(186, 150, 83, 0.3)';
    navbar.style.position = 'fixed';
    navbar.style.width = '100%';
    navbar.style.top = '0';
    navbar.style.zIndex = '1000';
    
    // Add scroll event listener
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(0, 0, 0, 0.98)';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
            navbar.style.borderBottom = '1px solid rgba(186, 150, 83, 0.5)';
        } else {
            navbar.style.background = 'rgba(0, 0, 0, 0.95)';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
            navbar.style.borderBottom = '1px solid rgba(186, 150, 83, 0.3)';
        }
    });
}

// Function to ensure auth navigation displays correctly
function fixAuthNavDisplay() {
    const navbar = document.querySelector('.navbar');
    const authNav = document.querySelector('.auth-nav');
    
    if (navbar && authNav) {
        // Make sure navbar container is properly styled
        const navContainer = navbar.querySelector('.nav-container');
        if (navContainer) {
            navContainer.style.display = 'flex';
            navContainer.style.alignItems = 'center';
            navContainer.style.justifyContent = 'space-between';
        }
    }
}

// Function to adjust content position for fixed navbar
function adjustContentForFixedNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    // Calculate navbar height
    const navbarHeight = navbar.offsetHeight;
    
    // Add padding to the top of the content based on page type
    if (document.querySelector('.hero')) {
        // Home page - no margin needed for hero
        document.querySelector('.hero').style.marginTop = '0';
    } else if (document.querySelector('.auth-container')) {
        // Login/register pages
        document.querySelector('.auth-container').style.marginTop = (navbarHeight + 40) + 'px';
    } else if (document.querySelector('.admin-container')) {
        // Admin page
        document.querySelector('.admin-container').style.marginTop = (navbarHeight + 30) + 'px';
    } else if (document.querySelector('.content')) {
        // Other pages
        const content = document.querySelector('.content');
        content.style.marginTop = (navbarHeight + 30) + 'px';
    }
}

// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    handleNavbarScroll();
    
    // Fix auth nav after a delay to ensure auth.js has run
    setTimeout(() => {
        if (typeof checkAuthStatus === 'function') {
            checkAuthStatus();
        }
        fixAuthNavDisplay();
        adjustContentForFixedNavbar();
    }, 100);
    
    // Also check for changes in the DOM that might affect auth status
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // Check if any of the added nodes is the auth-nav
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.classList && node.classList.contains('auth-nav')) {
                        fixAuthNavDisplay();
                        adjustContentForFixedNavbar();
                        break;
                    }
                }
            }
        });
    });
    
    // Start observing the navbar for changes
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        observer.observe(navbar, { childList: true, subtree: true });
    }
}); 