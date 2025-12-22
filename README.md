# SVR Manufacturing Dashboard

A comprehensive invoice management, employee tracking, and expense management system designed for SVR Manufacturing Company - Sheet Metal Components.

![Dashboard](https://img.shields.io/badge/Status-Production--Ready-brightgreen)
![PWA](https://img.shields.io/badge/PWA-Enabled-blue)
![License](https://img.shields.io/badge/License-Private-red)

## 🚀 Features

### Core Modules
- **📊 Dashboard** - Business overview with pending payments and expense summary
- **📤 Outward Invoices** - GST-compliant tax invoice generation with PDF export
- **📥 Inward Invoices** - Track materials received from suppliers
- **🏢 Customer Management** - Manage customer database with products & PO tracking
- **👥 Employee Management** - Workforce database with department tracking
- **✅ Attendance Tracking** - Daily attendance with history
- **💰 Expense Tracking** - Monitor operational costs with analytics

### Advanced Features
- 📄 **PDF Invoice Generation** - Professional GST-compliant invoices
- 📊 **Excel Export** - Export data to Excel spreadsheets
- 📈 **Charts & Analytics** - Visual business insights
- 🔍 **Global Search** - Search across all modules
- 💾 **Backup System** - JSON export/import with reminders
- 📱 **PWA Support** - Install as app, works offline

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: Browser localStorage (no server required)
- **PDF Generation**: jsPDF + AutoTable
- **Excel Export**: SheetJS (XLSX)
- **Charts**: Chart.js
- **Hosting**: GitHub Pages compatible

## 📦 Installation

### Option 1: GitHub Pages (Recommended)
1. Fork this repository
2. Go to Settings → Pages
3. Select `main` branch as source
4. Your dashboard will be live at `https://yourusername.github.io/SVR-dashboard/`

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/RR024/SVR-dashboard.git

# Navigate to directory
cd SVR-dashboard

# Open in browser (no build required!)
# Just open index.html in your browser
# Or use a local server:
npx http-server -p 8080
```

## 🔐 Default Login

| Username | Password |
|----------|----------|
| admin | admin123 |

> ⚠️ Change the default password after first login for security

## 💾 Data Backup

> **IMPORTANT**: All data is stored in your browser's localStorage. 

### Backup Best Practices:
1. **Export weekly** - Go to Settings → Export All Data (JSON)
2. **Watch the indicator** - Sidebar shows backup status
3. **Don't clear browser data** without exporting first

### Export/Import:
- **Settings → Export**: Download JSON backup file
- **Settings → Import**: Restore from JSON backup
- **Quick Backup**: Copy to clipboard for emergency backup

## 📱 PWA Installation

Install as a standalone app for easier access:

1. Open the dashboard in Chrome/Edge
2. Click the "📱 Install App" button in sidebar
3. Or use browser's install option in address bar
4. Access offline after first load!

## 📁 Project Structure

```
svr-dashboard/
├── index.html          # Main HTML file
├── styles.css          # All CSS styles
├── app.js              # Core application logic
├── auth.js             # Authentication system
├── customers.js        # Customer management
├── expenses.js         # Expense tracking
├── advanced-features.js # Export/import, reports
├── production-features.js # Backup reminders, PWA
├── manifest.json       # PWA manifest
├── sw.js               # Service worker for offline
└── README.md           # This file
```

## 🔄 Updates

The service worker automatically checks for updates. When a new version is available, you'll see a notification to refresh.

## ⚠️ Important Notes

- **Single User**: Designed for single-user deployment
- **Browser Specific**: Data is tied to the specific browser used
- **No Cloud Sync**: Data doesn't sync between devices
- **Regular Backups**: Essential to prevent data loss

## 📄 License

This is a private project for SVR Manufacturing Company.

---

Made with ❤️ for SVR Manufacturing
