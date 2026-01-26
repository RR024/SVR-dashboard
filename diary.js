// Diary Management System - Multiple Activities Per Day
// Stores and manages daily activity logs with multiple entries per date

// Initialize diary data from localStorage
// Data structure: { "2026-01-24": [{id, category, priority, content, createdAt, updatedAt}, ...] }
let diaryEntries = JSON.parse(localStorage.getItem('diaryEntriesMulti')) || {};
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDate = new Date().toISOString().split('T')[0];
let editingActivityId = null;

// Open diary modal
function openDiaryModal() {
    const modal = document.getElementById('diaryModal');
    modal.style.display = 'flex';

    // Initialize with today's date
    goToToday();

    // Render calendar
    renderCalendar();

    // Update stats
    updateDiaryStats();
}

// Close diary modal
function closeDiaryModal() {
    const modal = document.getElementById('diaryModal');
    modal.style.display = 'none';
    cancelActivityForm();
}

// Go to today's date
function goToToday() {
    const today = new Date();
    selectedDate = today.toISOString().split('T')[0];
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    loadPageContent(selectedDate);
    renderCalendar();
}

// Load content for a specific date
function loadPageContent(dateStr) {
    selectedDate = dateStr;
    const activities = diaryEntries[dateStr] || [];

    // Update date display
    const dateObj = new Date(dateStr + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('leftPageDate').textContent = formattedDate;

    // Render activities
    renderActivitiesList(activities);

    // Update calendar highlighting
    renderCalendar();

    // Hide form if open
    cancelActivityForm();
}

// Render activities list
function renderActivitiesList(activities) {
    const container = document.getElementById('activitiesContainer');

    if (activities.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: #b8a898; padding: 2rem; font-style: italic;">
                No activities for this day yet.<br>Click "Add Activity" to start.
            </p>
        `;
        return;
    }

    // Sort by creation time (newest first)
    const sortedActivities = [...activities].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    container.innerHTML = sortedActivities.map(activity => createActivityCard(activity)).join('');
}

// Create activity card HTML
function createActivityCard(activity) {
    const categoryIcons = {
        'Production': '🏭',
        'Sales': '📈',
        'Meeting': '👥',
        'Issue': '⚠️',
        'Achievement': '🎯',
        'Maintenance': '🔧',
        'Finance': '💰',
        'Other': '📝'
    };

    const priorityIcons = {
        'Low': '🟢',
        'Medium': '🟡',
        'High': '🔴'
    };

    const priorityClass = `priority-${activity.priority.toLowerCase()}`;
    const timestamp = new Date(activity.updatedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <div class="activity-card ${priorityClass}" data-activity-id="${activity.id}">
            <div class="activity-card-header">
                <div class="activity-meta">
                    <span class="activity-category">
                        ${categoryIcons[activity.category]} ${activity.category}
                    </span>
                    <span class="activity-priority">
                        ${priorityIcons[activity.priority]}
                    </span>
                    ${activity.hasAlert && !activity.alertDismissed ? '<span class="activity-alert-badge" title="Alert set">🔔</span>' : ''}
                </div>
                <div class="activity-actions">
                    <button class="activity-action-btn" onclick="editActivity('${activity.id}')" title="Edit">
                        ✏️
                    </button>
                    <button class="activity-action-btn" onclick="deleteActivity('${activity.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="activity-content">${activity.content}</div>
            <div class="activity-timestamp">Updated at ${timestamp}</div>
            
            <!-- Edit Form (hidden by default) -->
            <div class="activity-edit-form">
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
                    <select id="editCategory_${activity.id}" class="diary-category-select" style="flex: 1;">
                        <option value="">-- Category --</option>
                        <option value="Production" ${activity.category === 'Production' ? 'selected' : ''}>🏭 Production</option>
                        <option value="Sales" ${activity.category === 'Sales' ? 'selected' : ''}>📈 Sales</option>
                        <option value="Meeting" ${activity.category === 'Meeting' ? 'selected' : ''}>👥 Meeting</option>
                        <option value="Issue" ${activity.category === 'Issue' ? 'selected' : ''}>⚠️ Issue</option>
                        <option value="Achievement" ${activity.category === 'Achievement' ? 'selected' : ''}>🎯 Achievement</option>
                        <option value="Maintenance" ${activity.category === 'Maintenance' ? 'selected' : ''}>🔧 Maintenance</option>
                        <option value="Finance" ${activity.category === 'Finance' ? 'selected' : ''}>💰 Finance</option>
                        <option value="Other" ${activity.category === 'Other' ? 'selected' : ''}>📝 Other</option>
                    </select>
                    <select id="editPriority_${activity.id}" class="diary-priority-select" style="flex: 0 0 100px;">
                        <option value="Low" ${activity.priority === 'Low' ? 'selected' : ''}>🟢 Low</option>
                        <option value="Medium" ${activity.priority === 'Medium' ? 'selected' : ''}>🟡 Medium</option>
                        <option value="High" ${activity.priority === 'High' ? 'selected' : ''}>🔴 High</option>
                    </select>
                </div>
                <textarea id="editContent_${activity.id}" class="activity-textarea" rows="4">${activity.content}</textarea>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                    <button class="page-action-btn save-btn" onclick="saveEditedActivity('${activity.id}')" style="flex: 1;">
                        💾 Save Changes
                    </button>
                    <button class="page-action-btn" onclick="cancelEdit('${activity.id}')" 
                        style="flex: 1; background: #6c757d; color: white;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Toggle activity form
function toggleActivityForm() {
    const form = document.getElementById('newActivityForm');
    const btn = document.getElementById('addActivityBtn');

    if (form.style.display === 'none') {
        form.style.display = 'block';
        btn.textContent = '✖️ Cancel';
        // Focus on category
        document.getElementById('newActivityCategory').focus();
    } else {
        cancelActivityForm();
    }
}

// Cancel activity form
function cancelActivityForm() {
    const form = document.getElementById('newActivityForm');
    const btn = document.getElementById('addActivityBtn');

    form.style.display = 'none';
    btn.textContent = '➕ Add Activity';

    // Clear form
    document.getElementById('newActivityCategory').value = '';
    document.getElementById('newActivityPriority').value = 'Low';
    document.getElementById('newActivityContent').value = '';
    document.getElementById('newActivityAlert').checked = false;
}

// Save new activity
function saveNewActivity() {
    const category = document.getElementById('newActivityCategory').value;
    const priority = document.getElementById('newActivityPriority').value;
    const content = document.getElementById('newActivityContent').value.trim();
    const hasAlert = document.getElementById('newActivityAlert').checked;

    if (!category) {
        showNotification('Please select a category!', 'error');
        return;
    }

    if (!content) {
        showNotification('Please write something before saving!', 'error');
        return;
    }

    // Create new activity
    const newActivity = {
        id: Date.now().toString(),
        category: category,
        priority: priority,
        content: content,
        hasAlert: hasAlert,
        alertDismissed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Add to entries
    if (!diaryEntries[selectedDate]) {
        diaryEntries[selectedDate] = [];
    }
    diaryEntries[selectedDate].push(newActivity);

    // Save to localStorage
    localStorage.setItem('diaryEntriesMulti', JSON.stringify(diaryEntries));

    showNotification('Activity added successfully! ✅', 'success');

    // Reload page content
    loadPageContent(selectedDate);

    // Update calendar and stats
    renderCalendar();
    updateDiaryStats();
}

// Edit activity
function editActivity(activityId) {
    const card = document.querySelector(`[data-activity-id="${activityId}"]`);
    if (card) {
        card.classList.add('editing');
        editingActivityId = activityId;
    }
}

// Cancel edit
function cancelEdit(activityId) {
    const card = document.querySelector(`[data-activity-id="${activityId}"]`);
    if (card) {
        card.classList.remove('editing');
        editingActivityId = null;
    }
}

// Save edited activity
function saveEditedActivity(activityId) {
    const category = document.getElementById(`editCategory_${activityId}`).value;
    const priority = document.getElementById(`editPriority_${activityId}`).value;
    const content = document.getElementById(`editContent_${activityId}`).value.trim();

    if (!category || !content) {
        showNotification('Category and content are required!', 'error');
        return;
    }

    // Find and update activity
    const activities = diaryEntries[selectedDate];
    const activityIndex = activities.findIndex(a => a.id === activityId);

    if (activityIndex !== -1) {
        activities[activityIndex] = {
            ...activities[activityIndex],
            category: category,
            priority: priority,
            content: content,
            updatedAt: new Date().toISOString()
        };

        // Save to localStorage
        localStorage.setItem('diaryEntriesMulti', JSON.stringify(diaryEntries));

        showNotification('Activity updated successfully! ✅', 'success');

        // Reload page content
        loadPageContent(selectedDate);
    }
}

// Delete activity
function deleteActivity(activityId) {
    if (!confirm('Are you sure you want to delete this activity? This cannot be undone.')) {
        return;
    }

    // Remove activity from array
    diaryEntries[selectedDate] = diaryEntries[selectedDate].filter(a => a.id !== activityId);

    // If no more activities, delete the date entry
    if (diaryEntries[selectedDate].length === 0) {
        delete diaryEntries[selectedDate];
    }

    // Save to localStorage
    localStorage.setItem('diaryEntriesMulti', JSON.stringify(diaryEntries));

    showNotification('Activity deleted successfully! 🗑️', 'success');

    // Reload page content
    loadPageContent(selectedDate);

    // Update calendar and stats
    renderCalendar();
    updateDiaryStats();
}

// Navigate to previous day
function previousDay() {
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    const newDate = date.toISOString().split('T')[0];

    // Update month/year if needed
    currentMonth = date.getMonth();
    currentYear = date.getFullYear();

    loadPageContent(newDate);
}

// Navigate to next day
function nextDay() {
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    const newDate = date.toISOString().split('T')[0];

    // Update month/year if needed
    currentMonth = date.getMonth();
    currentYear = date.getFullYear();

    loadPageContent(newDate);
}

// Navigate to previous month
function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

// Navigate to next month
function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

// Render calendar
function renderCalendar() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Update month/year display
    document.getElementById('calendarMonthYear').textContent =
        `${monthNames[currentMonth]} ${currentYear}`;

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Build calendar grid
    let html = '<div class="calendar-weekdays">';
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        html += `<div class="weekday">${day}</div>`;
    });
    html += '</div><div class="calendar-days">';

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEntry = diaryEntries[dateStr] && diaryEntries[dateStr].length > 0 ? 'has-entry' : '';
        const isSelected = dateStr === selectedDate ? 'selected' : '';
        const isToday = dateStr === new Date().toISOString().split('T')[0] ? 'today' : '';

        html += `<div class="calendar-day ${hasEntry} ${isSelected} ${isToday}" 
                      onclick="loadPageContent('${dateStr}')">${day}</div>`;
    }

    html += '</div>';
    document.getElementById('calendarGrid').innerHTML = html;
}

// Update diary stats
function updateDiaryStats() {
    // Count total activities (not dates)
    let totalActivities = 0;
    Object.values(diaryEntries).forEach(activities => {
        totalActivities += activities.length;
    });
    document.getElementById('totalEntriesCount').textContent = totalActivities;

    // This month's activities
    const thisMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    let monthActivities = 0;
    Object.keys(diaryEntries).forEach(date => {
        if (date.startsWith(thisMonthStr)) {
            monthActivities += diaryEntries[date].length;
        }
    });
    document.getElementById('monthEntriesCount').textContent = monthActivities;

    // This week's activities
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    let weekActivities = 0;
    Object.keys(diaryEntries).forEach(date => {
        const entryDate = new Date(date + 'T00:00:00');
        if (entryDate >= weekAgo && entryDate <= today) {
            weekActivities += diaryEntries[date].length;
        }
    });
    document.getElementById('weekEntriesCount').textContent = weekActivities;
}

// Search diary by text
function searchDiaryByText(searchTerm) {
    if (!searchTerm.trim()) {
        renderCalendar();
        return;
    }

    const term = searchTerm.toLowerCase();
    const matchingDates = [];

    Object.keys(diaryEntries).forEach(date => {
        const activities = diaryEntries[date];
        const hasMatch = activities.some(activity =>
            activity.content.toLowerCase().includes(term) ||
            activity.category.toLowerCase().includes(term)
        );
        if (hasMatch) {
            matchingDates.push(date);
        }
    });

    // Highlight matching dates in calendar
    highlightDatesInCalendar(matchingDates);
}

// Highlight specific dates in calendar
function highlightDatesInCalendar(dates) {
    renderCalendar();

    if (dates.length === 0) {
        showNotification('No entries found matching your search.', 'info');
        return;
    }

    // Add search-match class to matching dates
    dates.forEach(dateStr => {
        const [year, month, day] = dateStr.split('-');
        if (parseInt(year) === currentYear && parseInt(month) - 1 === currentMonth) {
            const dayElements = document.querySelectorAll('.calendar-day');
            dayElements.forEach(elem => {
                if (elem.textContent === String(parseInt(day)) && !elem.classList.contains('empty')) {
                    elem.classList.add('search-match');
                }
            });
        }
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#667eea'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Close modal when clicking outside
document.addEventListener('click', function (event) {
    const modal = document.getElementById('diaryModal');
    if (modal && event.target === modal) {
        closeDiaryModal();
    }
});

// Add keyboard navigation
document.addEventListener('keydown', function (event) {
    const modal = document.getElementById('diaryModal');
    if (!modal || modal.style.display !== 'flex') return;

    // Don't interfere if user is typing
    if (event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') return;

    if (event.key === 'ArrowLeft') {
        previousDay();
        event.preventDefault();
    } else if (event.key === 'ArrowRight') {
        nextDay();
        event.preventDefault();
    } else if (event.key === 'Escape') {
        closeDiaryModal();
        event.preventDefault();
    }
});

console.log('📖 Multi-Activity Diary system initialized');

// ============================================
// DASHBOARD ALERT SYSTEM
// ============================================

// Show active alerts on dashboard
function showDashboardAlerts() {
    const container = document.getElementById('diaryAlertsContainer');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const activeAlerts = [];

    // Find all activities with alerts for future dates
    Object.keys(diaryEntries).forEach(dateStr => {
        // Only show alerts for today or future dates
        if (dateStr >= today) {
            const activities = diaryEntries[dateStr];
            activities.forEach(activity => {
                if (activity.hasAlert && !activity.alertDismissed) {
                    activeAlerts.push({
                        ...activity,
                        date: dateStr
                    });
                }
            });
        }
    });

    // Sort by date (earliest first)
    activeAlerts.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Render alert popups
    container.innerHTML = activeAlerts.slice(0, 5).map(alert => createAlertPopup(alert)).join('');
}

// Create alert popup HTML
function createAlertPopup(alert) {
    const categoryIcons = {
        'Production': '🏭',
        'Sales': '📈',
        'Meeting': '👥',
        'Issue': '⚠️',
        'Achievement': '🎯',
        'Maintenance': '🔧',
        'Finance': '💰',
        'Other': '📝'
    };

    const dateObj = new Date(alert.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Calculate days until
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(alert.date + 'T00:00:00');
    const daysUntil = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    let daysText = '';
    if (daysUntil === 0) {
        daysText = 'Today';
    } else if (daysUntil === 1) {
        daysText = 'Tomorrow';
    } else {
        daysText = `In ${daysUntil} days`;
    }

    return `
        <div class="diary-alert-popup" data-alert-date="${alert.date}" data-alert-id="${alert.id}">
            <div class="diary-alert-header">
                <div class="diary-alert-title">
                    🔔 Reminder: ${daysText}
                </div>
                <button class="diary-alert-close-btn" onclick="dismissAlert('${alert.date}', '${alert.id}')" title="Dismiss">
                    ×
                </button>
            </div>
            <div class="diary-alert-date">
                📅 ${formattedDate}
            </div>
            <div class="diary-alert-category">
                ${categoryIcons[alert.category]} ${alert.category}
            </div>
            <div class="diary-alert-content">
                ${alert.content}
            </div>
        </div>
    `;
}

// Dismiss alert
function dismissAlert(dateStr, activityId) {
    const popup = document.querySelector(`[data-alert-date="${dateStr}"][data-alert-id="${activityId}"]`);

    if (popup) {
        // Add closing animation
        popup.classList.add('closing');

        // Update activity to mark alert as dismissed
        const activities = diaryEntries[dateStr];
        const activity = activities.find(a => a.id === activityId);
        if (activity) {
            activity.alertDismissed = true;
            localStorage.setItem('diaryEntriesMulti', JSON.stringify(diaryEntries));
        }

        // Remove after animation
        setTimeout(() => {
            popup.remove();
        }, 300);
    }
}

// Check and show alerts when dashboard loads
function initializeDashboardAlerts() {
    // Show alerts immediately
    showDashboardAlerts();

    // Refresh alerts every 5 minutes
    setInterval(showDashboardAlerts, 5 * 60 * 1000);
}

// Initialize alerts when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboardAlerts);
} else {
    initializeDashboardAlerts();
}
