// Simple mobile menu functions
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    const toggle = document.getElementById('mobileMenuToggle');

    if (!sidebar || !overlay || !toggle) return;

    const isOpen = sidebar.classList.contains('active');

    if (isOpen) {
        sidebar.classList.remove('active');
        overlay.style.display = 'none';
        toggle.innerHTML = '☰';
        document.body.style.overflow = '';
    } else {
        sidebar.classList.add('active');
        overlay.style.display = 'block';
        toggle.innerHTML = '✕';
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    const toggle = document.getElementById('mobileMenuToggle');

    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.style.display = 'none';
    if (toggle) toggle.innerHTML = '☰';
    document.body.style.overflow = '';
}

// Show/hide hamburger based on screen size
function updateMobileToggle() {
    const toggle = document.getElementById('mobileMenuToggle');
    if (toggle) {
        toggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    }
}

// Auto-close menu when clicking nav links
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('nav-link') && window.innerWidth <= 768) {
        setTimeout(closeMobileMenu, 300);
    }
});

// Update on resize
window.addEventListener('resize', updateMobileToggle);

// Init on load
window.addEventListener('DOMContentLoaded', updateMobileToggle);
