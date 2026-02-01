
// Fill product details when a product is selected in inward invoice
function fillInwardProductDetails(selectElement) {
    const productId = selectElement.value;
    if (!productId) return;

    const customerDropdown = document.getElementById('inwardCustomerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;

    if (!customerId) return;

    if (typeof getCustomerProducts === 'function') {
        const products = getCustomerProducts(customerId);
        const product = products.find(p => p.id === productId);

        if (product) {
            const row = selectElement.closest('.inward-product-item');

            // Auto-fill Rate
            const rateInput = row.querySelector('.inward-product-rate');
            if (rateInput && product.price) {
                rateInput.value = product.price;
            }

            // Auto-fill UOM if possible (assuming product has uom/unit property)
            /* 
               Note: The product object structure typically has 'unit' or 'uom'. 
               We'll check for common property names.
            */
            const uomSelect = row.querySelector('.inward-product-unit');
            if (uomSelect && (product.unit || product.uom)) {
                uomSelect.value = product.unit || product.uom;
            }

            // Trigger calculation to update amount
            if (rateInput) {
                calculateInwardProductValue(rateInput);
            }
        }
    }
}
