# Customer Management Module - Integration Guide

## Files Created

1. **customers.js** - Complete JavaScript for customer module
2. **customers_module.html** - Customer table section  
3. **customer_modal.html** - Customer edit/add form modal

## Integration Steps Completed

### ✅ 1. Navigation Added
- Added "Customers" link to sidebar (between Outward Invoices and Employees)
- Icon: 🏢

### ✅ 2. Outward Invoice Updated
- Added customer dropdown before Buyer Name field
- Dropdown calls `fillCustomerDetails()` on change
- Auto-fills: Company Name, Address, GST Number, Contact
- Payment Terms default set to "45 days"

### ✅ 3. JavaScript Functions Created

**Customer CRUD:**
- `getCustomers()` - Get from localStorage
- `loadCustomers()` - Display in table
- `openCustomerModal(id)` - Open form (add/edit)
- `closeCustomerModal()` - Close form
- `saveCustomer()` - Create or update
- `editCustomer(id)` - Edit existing
- `deleteCustomer(id)` - Delete customer

**Auto-fill Integration:**
- `loadCustomerDropdown()` - Populate dropdown
- `fillCustomerDetails()` - Auto-fill on selection

**Payment Tracking:**
- `calculateDaysFromInvoice(date, terms)` - Returns days passed, days left, overdue status
- `formatPaymentStatus(invoice)` - Returns formatted badge with status

## Manual Steps Required

### Step 1: Insert Customer Module HTML

Insert content from `customers_module.html` into `index.html` **before line 262** (before Employee Module):

```html
<!-- Line 262: before this -->
<!-- Employee Module -->

<!-- Insert customers_module.html content here -->
```

### Step 2: Insert Customer Modal HTML

Insert content from `customer_modal.html` into `index.html` **before line 616** (before Employee Modal):

```html
<!-- Line 616: before this -->
<!-- Employee Modal -->

<!-- Insert customer_modal.html content here -->
```

### Step 3: Add Script Reference

Add `customers.js` script reference in `index.html` before closing `</body>` tag:

```html
<script src="customers.js"></script>
<script src="advanced-features.js"></script>
<script src="app.js"></script>
</body>
```

### Step 4: Update app.js Navigation Handler

In `app.js`, find the navigation module loader and add:

```javascript
// Around line 50-70 in app.js where modules are loaded
function loadModuleData(moduleId) {
    switch(moduleId) {
        // ... existing cases ...
        case 'customers':  // ADD THIS
            loadCustomers();
            break;
        // ... other cases ...
    }
}
```

### Step 5: Update Outward Invoice Open Function

In `app.js`, find `openOutwardModal()` function and add customer dropdown loading:

```javascript
function openOutwardModal(invoiceId = null) {
    // ... existing code ...
    
    // ADD THIS LINE:
    loadCustomerDropdown();
    
    // ... rest of existing code ...
    modal.classList.add('active');
}
```

### Step 6: Update Dashboard Pending Payments

In `app.js`, find where pending payment cards are created (in `loadDashboard()`) and update to show days info:

```javascript
// Replace the payment status badge generation with:
html += formatPaymentStatus(invoice);
```

## Testing Checklist

- [ ] Customers link appears in navigation
- [ ] Customer list page loads
- [ ] Can add new customer (all fields save correctly)
- [ ] Can edit existing customer
- [ ] Can delete customer
- [ ] Outward invoice shows customer dropdown
- [ ] Selecting customer auto-fills all buyer fields
- [ ] Payment terms defaults to "45 days"
- [ ] Dashboard shows days pending/overdue for invoices
- [ ] Customer data persists after page reload

## Screenshot Reference

The uploaded screenshot shows the expected layout for the outward invoice form with:
- DC No and DC Date fields
- State and State Code
- Payment Terms field (should show "45 days")
- Vehicle Number
- Customer Details section (where dropdown is now added)

## Data Structure

Customer object stored in localStorage:
```javascript
{
    id: "1671234567890",
    companyName: "M/s. ABC Industries Pvt Ltd",
    gstin: "33AASCM7320A1ZQ",
    address: "123 Industrial Area, Chennai, TN - 600001",
    contactPerson: "John Doe",
    phone: "+91 9876543210",
    email: "info@abcindustries.com",
    city: "Chennai",
    notes: "Regular client",
    createdAt: "2025-12-20T15:47:44.727Z",
    updatedAt: "2025-12-20T15:47:44.727Z"
}
```

## Payment Tracking

The dashboard will now show:
- **"X days left"** - if within payment terms (badge-info or badge-warning if <= 7 days)
- **"Overdue by X days"** - if exceeded payment terms (badge-danger)
- **"Paid"** - if already paid (badge-success)

Example: Invoice dated Dec 1, payment terms 45 days, on Dec 20:
- Days passed: 19
- Days left: 26  
- Status: "26 days left" (blue badge)

Example: Invoice dated Nov 1, payment terms 45 days, on Dec 20:
- Days passed: 49
- Days left: -4
- Status: "Overdue by 4 days" (red badge)
