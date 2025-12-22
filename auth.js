// ================================
// AUTHENTICATION SYSTEM
// ================================
// Robust authentication with signup/login functionality

// Storage keys
const USERS_KEY = 'svr_users';
const SESSION_KEY = 'svr_session';

// ================================
// USER MANAGEMENT
// ================================

// Ensure default admin exists - called immediately on load
function ensureDefaultAdmin() {
    let users = getUsers();

    // Check if default admin exists
    const adminExists = users.some(u => u.username === 'admin' && u.isDefault);

    if (!adminExists) {
        const defaultAdmin = {
            id: 'admin_' + Date.now(),
            username: 'admin',
            password: 'admin123',
            fullName: 'System Administrator',
            role: 'Admin',
            status: 'Active',
            isDefault: true,
            createdAt: new Date().toISOString()
        };

        users.push(defaultAdmin);
        saveUsers(users);
        console.log('✅ Default admin account created');
    }
}

// Get all users from localStorage
function getUsers() {
    try {
        const data = localStorage.getItem(USERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}

// Save users to localStorage
function saveUsers(users) {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
}

// ================================
// VALIDATION FUNCTIONS
// ================================

function validateUsername(username) {
    if (!username || username.length < 3) {
        return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (username.length > 20) {
        return { valid: false, error: 'Username must be less than 20 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }
    return { valid: true };
}

function validatePassword(password) {
    if (!password || password.length < 6) {
        return { valid: false, error: 'Password must be at least 6 characters' };
    }
    return { valid: true };
}

function validateFullName(fullName) {
    if (!fullName || fullName.trim().length < 2) {
        return { valid: false, error: 'Full name must be at least 2 characters' };
    }
    if (fullName.length > 50) {
        return { valid: false, error: 'Full name must be less than 50 characters' };
    }
    return { valid: true };
}

function isUsernameTaken(username) {
    const users = getUsers();
    return users.some(u => u.username.toLowerCase() === username.toLowerCase());
}

// ================================
// SIGNUP FUNCTIONALITY
// ================================

function registerUser(username, password, confirmPassword, fullName) {
    // Validate inputs
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
        return { success: false, error: usernameValidation.error };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.error };
    }

    if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' };
    }

    const nameValidation = validateFullName(fullName);
    if (!nameValidation.valid) {
        return { success: false, error: nameValidation.error };
    }

    // Check if username already exists
    if (isUsernameTaken(username)) {
        return { success: false, error: 'Username already exists' };
    }

    // Create new user
    const newUser = {
        id: 'user_' + Date.now(),
        username: username.trim(),
        password: password, // In production, hash this
        fullName: fullName.trim(),
        role: 'User', // Default role for new signups
        status: 'Active',
        isDefault: false,
        createdAt: new Date().toISOString()
    };

    // Save user
    const users = getUsers();
    users.push(newUser);

    if (saveUsers(users)) {
        console.log('✅ New user registered:', username);
        return { success: true, user: newUser };
    } else {
        return { success: false, error: 'Failed to save user. Please try again.' };
    }
}

// ================================
// LOGIN FUNCTIONALITY
// ================================

function authenticateUser(username, password) {
    if (!username || !password) {
        return { success: false, error: 'Please enter both username and password' };
    }

    const users = getUsers();
    const user = users.find(u =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password &&
        u.status === 'Active'
    );

    if (user) {
        console.log('✅ Login successful:', username);
        return { success: true, user: user };
    } else {
        console.log('❌ Login failed:', username);
        return { success: false, error: 'Invalid username or password' };
    }
}

// ================================
// SESSION MANAGEMENT
// ================================

// Check if Remember Me was used (stored in localStorage)
function isRememberedSession() {
    return localStorage.getItem(SESSION_KEY) !== null;
}

function createSession(user, rememberMe = false) {
    // 30 days for Remember Me, 24 hours for regular session
    const expiryDays = rememberMe ? 30 : 1;
    const session = {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
        remembered: rememberMe
    };

    try {
        if (rememberMe) {
            // Use localStorage for persistent session
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            console.log('✅ Persistent session created for:', user.username);
        } else {
            // Use sessionStorage for temporary session
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
            console.log('✅ Session created for:', user.username);
        }
        return true;
    } catch (error) {
        console.error('Error creating session:', error);
        return false;
    }
}

function getSession() {
    try {
        // Check localStorage first (Remember Me), then sessionStorage
        let data = localStorage.getItem(SESSION_KEY);
        let isRemembered = true;

        if (!data) {
            data = sessionStorage.getItem(SESSION_KEY);
            isRemembered = false;
        }

        if (!data) return null;

        const session = JSON.parse(data);

        // Check if session expired
        if (new Date(session.expiresAt) < new Date()) {
            clearSession();
            return null;
        }

        return session;
    } catch (error) {
        console.error('Error reading session:', error);
        return null;
    }
}

function validateSession() {
    const session = getSession();
    return session !== null;
}

function clearSession() {
    try {
        // Clear from both storage locations
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        console.log('✅ Session cleared');
        return true;
    } catch (error) {
        console.error('Error clearing session:', error);
        return false;
    }
}

function getCurrentUser() {
    const session = getSession();
    return session;
}

// ================================
// LOGIN/SIGNUP HANDLERS
// ================================

function handleLogin(event) {
    if (event) event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';

    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>🔄</span> Logging in...';
    }

    // Authenticate
    const result = authenticateUser(username, password);

    if (result.success) {
        // Create session with Remember Me option
        if (createSession(result.user, rememberMe)) {
            // Hide login page, show dashboard
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';

            // Show welcome message
            if (typeof showToast === 'function') {
                const rememberMsg = rememberMe ? ' (You\'ll stay logged in)' : '';
                showToast(`Welcome back, ${result.user.fullName}!${rememberMsg}`, 'success');
            }

            // Load dashboard
            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
        } else {
            errorDiv.textContent = 'Failed to create session. Please try again.';
            errorDiv.style.display = 'block';

            // Reset button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>🔓</span> Login';
            }
        }
    } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';

        // Shake animation for error
        errorDiv.style.animation = 'shake 0.5s';
        setTimeout(() => {
            errorDiv.style.animation = '';
        }, 500);

        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>🔓</span> Login';
        }
    }
}

function handleSignup(event) {
    if (event) event.preventDefault();

    const fullName = document.getElementById('signupFullName').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const errorDiv = document.getElementById('signupError');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';

    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>🔄</span> Creating Account...';
    }

    // Register user
    const result = registerUser(username, password, confirmPassword, fullName);

    if (result.success) {
        // Auto-login after signup
        if (createSession(result.user)) {
            // Hide login page, show dashboard
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';

            // Show welcome message
            if (typeof showToast === 'function') {
                showToast(`Welcome, ${result.user.fullName}! Your account has been created.`, 'success');
            }

            // Load dashboard
            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
        } else {
            errorDiv.textContent = 'Account created but failed to log in. Please try logging in manually.';
            errorDiv.style.display = 'block';

            // Reset button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>✨</span> Create Account';
            }
        }
    } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';

        // Shake animation for error
        errorDiv.style.animation = 'shake 0.5s';
        setTimeout(() => {
            errorDiv.style.animation = '';
        }, 500);

        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>✨</span> Create Account';
        }
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        clearSession();

        // Hide dashboard, show login
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';

        // Reset forms
        document.getElementById('loginForm').reset();
        if (document.getElementById('signupForm')) {
            document.getElementById('signupForm').reset();
        }

        // Show login tab
        if (document.getElementById('loginTab')) {
            switchAuthTab('login');
        }

        if (typeof showToast === 'function') {
            showToast('Logged out successfully', 'info');
        }
    }
}

// ================================
// TAB SWITCHING
// ================================

function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginFormContainer');
    const signupForm = document.getElementById('signupFormContainer');

    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';

        // Clear errors
        document.getElementById('loginError').style.display = 'none';
        document.getElementById('loginError').textContent = '';
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';

        // Clear errors
        document.getElementById('signupError').style.display = 'none';
        document.getElementById('signupError').textContent = '';
    }
}

// ================================
// REAL-TIME VALIDATION
// ================================

function setupRealTimeValidation() {
    // Username validation
    const signupUsername = document.getElementById('signupUsername');
    if (signupUsername) {
        signupUsername.addEventListener('input', function () {
            const validation = validateUsername(this.value);
            if (!validation.valid && this.value.length > 0) {
                this.style.borderColor = '#ef4444';
            } else if (this.value.length > 0) {
                this.style.borderColor = '#10b981';
            } else {
                this.style.borderColor = '';
            }
        });
    }

    // Password match validation
    const signupPassword = document.getElementById('signupPassword');
    const signupConfirmPassword = document.getElementById('signupConfirmPassword');

    if (signupConfirmPassword) {
        signupConfirmPassword.addEventListener('input', function () {
            if (this.value.length > 0) {
                if (this.value === signupPassword.value) {
                    this.style.borderColor = '#10b981';
                } else {
                    this.style.borderColor = '#ef4444';
                }
            } else {
                this.style.borderColor = '';
            }
        });
    }
}

// ================================
// INITIALIZATION
// ================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    console.log('🔐 Auth system initializing...');

    // CRITICAL: Always ensure default admin exists
    ensureDefaultAdmin();

    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Setup signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Setup real-time validation
    setupRealTimeValidation();

    // Check if already logged in
    if (validateSession()) {
        console.log('✅ Valid session found');
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
    } else {
        console.log('ℹ️ No valid session, showing login page');
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }

    console.log('🔐 Auth system ready');
});