// ===================================
// DATA MIGRATION SYSTEM
// ===================================

/**
 * Manages data schema versions and automatic migrations
 * Prevents data corruption during app updates
 */

const CURRENT_VERSION = '2.0.0';
const VERSION_KEY = 'svr_data_version';
const MIGRATION_BACKUP_KEY = 'svr_migration_backup';

/**
 * Migration definitions
 * Each migration transforms data from one version to the next
 */
const migrations = {
    '1.0.0': {
        name: 'Initial schema',
        description: 'Base data structure',
        migrate: (data) => data // No changes needed
    },

    '1.1.0': {
        name: 'Add invoice locking',
        description: 'Added locked field to all invoices',
        migrate: (data) => {
            // Add locked field to outward invoices
            if (data.outwardInvoices) {
                data.outwardInvoices = data.outwardInvoices.map(inv => ({
                    ...inv,
                    locked: inv.locked !== undefined ? inv.locked : true
                }));
            }

            // Add locked field to inward invoices
            if (data.inwardInvoices) {
                data.inwardInvoices = data.inwardInvoices.map(inv => ({
                    ...inv,
                    locked: inv.locked !== undefined ? inv.locked : true
                }));
            }

            return data;
        }
    },

    '2.0.0': {
        name: 'Enhanced product tracking',
        description: 'Added detailed product information',
        migrate: (data) => {
            // Ensure all invoices have products array
            if (data.outwardInvoices) {
                data.outwardInvoices = data.outwardInvoices.map(inv => ({
                    ...inv,
                    products: inv.products || []
                }));
            }

            if (data.inwardInvoices) {
                data.inwardInvoices = data.inwardInvoices.map(inv => ({
                    ...inv,
                    products: inv.products || []
                }));
            }

            return data;
        }
    }
};

/**
 * Get all data from localStorage
 */
function getAllData() {
    const keys = [
        'outwardInvoices',
        'inwardInvoices',
        'customers',
        'employees',
        'attendanceRecords',
        'expenses',
        'productionRecords',
        'salaryRecords'
    ];

    const data = {};
    keys.forEach(key => {
        const item = localStorage.getItem(key);
        data[key] = item ? JSON.parse(item) : [];
    });

    return data;
}

/**
 * Save all data to localStorage
 */
function saveAllData(data) {
    Object.keys(data).forEach(key => {
        localStorage.setItem(key, JSON.stringify(data[key]));
    });
}

/**
 * Create backup of all data
 */
function createMigrationBackup() {
    const data = getAllData();
    const backup = {
        timestamp: new Date().toISOString(),
        version: localStorage.getItem(VERSION_KEY) || '1.0.0',
        data: data
    };

    try {
        localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(backup));
        return backup;
    } catch (error) {
        console.error('Failed to create backup:', error);
        return null;
    }
}

/**
 * Restore from backup
 */
function restoreMigrationBackup() {
    try {
        const backupStr = localStorage.getItem(MIGRATION_BACKUP_KEY);
        if (!backupStr) {
            console.warn('No backup found');
            return false;
        }

        const backup = JSON.parse(backupStr);
        saveAllData(backup.data);
        localStorage.setItem(VERSION_KEY, backup.version);

        console.log('✅ Restored from backup');
        return true;
    } catch (error) {
        console.error('Failed to restore backup:', error);
        return false;
    }
}

/**
 * Get versions between two version numbers
 */
function getVersionsBetween(fromVersion, toVersion) {
    const versions = Object.keys(migrations).sort();
    const fromIndex = versions.indexOf(fromVersion);
    const toIndex = versions.indexOf(toVersion);

    if (fromIndex === -1 || toIndex === -1) {
        return [];
    }

    return versions.slice(fromIndex + 1, toIndex + 1);
}

/**
 * Run migrations
 */
function runMigrations(fromVersion, toVersion) {
    console.log(`🔄 Migrating data from ${fromVersion} to ${toVersion}`);

    // Create backup first
    const backup = createMigrationBackup();
    if (!backup) {
        throw new Error('Failed to create backup before migration');
    }

    try {
        // Get versions to migrate through
        const versionsToMigrate = getVersionsBetween(fromVersion, toVersion);

        if (versionsToMigrate.length === 0) {
            console.log('No migrations needed');
            return;
        }

        // Get current data
        let data = getAllData();

        // Run each migration in sequence
        versionsToMigrate.forEach(version => {
            const migration = migrations[version];
            console.log(`  ↗ Running migration: ${migration.name} (${version})`);
            console.log(`    ${migration.description}`);

            data = migration.migrate(data);
        });

        // Save migrated data
        saveAllData(data);

        // Update version
        localStorage.setItem(VERSION_KEY, toVersion);

        console.log('✅ Migration completed successfully');
        showSuccessNotification('Data migrated to latest version!');

    } catch (error) {
        console.error('❌ Migration failed:', error);

        // Attempt to restore backup
        console.log('Attempting to restore backup...');
        const restored = restoreMigrationBackup();

        if (restored) {
            showErrorNotification('Migration failed. Data restored from backup.', 'warning');
        } else {
            showErrorNotification('Migration failed! Please contact support.', 'critical');
        }

        throw error;
    }
}

/**
 * Check and run migrations if needed
 */
function checkAndMigrate() {
    const currentDataVersion = localStorage.getItem(VERSION_KEY) || '1.0.0';

    console.log(`Current data version: ${currentDataVersion}`);
    console.log(`App version: ${CURRENT_VERSION}`);

    if (currentDataVersion === CURRENT_VERSION) {
        console.log('✅ Data is up to date');
        return;
    }

    if (currentDataVersion > CURRENT_VERSION) {
        console.warn('⚠️ Data version is newer than app version!');
        showErrorNotification(
            'Your data is from a newer version. Please update the app.',
            'warning'
        );
        return;
    }

    // Run migrations
    try {
        runMigrations(currentDataVersion, CURRENT_VERSION);
    } catch (error) {
        handleError(error, 'Data Migration');
    }
}

/**
 * Get migration history
 */
function getMigrationHistory() {
    const currentVersion = localStorage.getItem(VERSION_KEY) || '1.0.0';
    const versions = Object.keys(migrations).sort();
    const currentIndex = versions.indexOf(currentVersion);

    return versions.map((version, index) => ({
        version,
        ...migrations[version],
        applied: index <= currentIndex,
        current: version === currentVersion
    }));
}

/**
 * Force migration to specific version (dangerous!)
 */
function forceMigrateTo(targetVersion) {
    if (!migrations[targetVersion]) {
        console.error('Invalid target version:', targetVersion);
        return false;
    }

    const currentVersion = localStorage.getItem(VERSION_KEY) || '1.0.0';

    if (window.confirm(`Force migrate from ${currentVersion} to ${targetVersion}? This is dangerous!`)) {
        try {
            runMigrations(currentVersion, targetVersion);
            return true;
        } catch (error) {
            console.error('Force migration failed:', error);
            return false;
        }
    }

    return false;
}

// Auto-check migrations on app load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndMigrate);
} else {
    checkAndMigrate();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkAndMigrate,
        getMigrationHistory,
        createMigrationBackup,
        restoreMigrationBackup,
        CURRENT_VERSION
    };
}
