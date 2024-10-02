let db;
const request = indexedDB.open('schoolInventory', 2);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('inventory')) {
        const store = db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
        store.createIndex('itemDescription', 'itemDescription', { unique: true });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadInventory();
};

let editingId = null;

// Add or Update Inventory
document.getElementById('inventoryForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const itemDescription = document.getElementById('itemDescription').value;
    const stockPage = document.getElementById('stockPage').value;
    const purchaseDate = document.getElementById('purchaseDate').value;
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const receiptNumber = document.getElementById('receiptNumber').value;
    const supplierName = document.getElementById('supplierName').value;
    const quantityReceived = parseInt(document.getElementById('quantityReceived').value);
    const quantityIssued = parseInt(document.getElementById('quantityIssued').value);
    const remainingQuantity = quantityReceived - quantityIssued;

    const transaction = db.transaction(['inventory'], 'readwrite');
    const store = transaction.objectStore('inventory');

    const item = {
        itemDescription,
        stockPage,
        purchaseDate,
        invoiceNumber,
        receiptNumber,
        supplierName,
        quantityReceived,
        quantityIssued,
        remainingQuantity
    };

    if (editingId) {
        item.id = editingId;
    }

    const request = editingId ? store.put(item) : store.add(item);

    request.onerror = function(event) {
        if (event.target.error.name === 'ConstraintError') {
            alert('අයිතමය දැනටමත් පවතී. කරුණාකර වෙනත් විස්තරයක් භාවිතා කරන්න.');
        }
    };

    request.onsuccess = function() {
        loadInventory();
        document.getElementById('inventoryForm').reset();
        editingId = null;
    };
});

// Load Inventory
function loadInventory() {
    const transaction = db.transaction(['inventory'], 'readonly');
    const store = transaction.objectStore('inventory');
    const request = store.getAll();

    request.onsuccess = function(event) {
        const inventory = event.target.result;
        const tableBody = document.querySelector('#inventoryTable tbody');
        tableBody.innerHTML = '';
        inventory.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.itemDescription}</td>
                <td>${item.stockPage}</td>
                <td>${item.purchaseDate}</td>
                <td>${item.invoiceNumber}</td>
                <td>${item.receiptNumber}</td>
                <td>${item.supplierName}</td>
                <td>${item.quantityReceived}</td>
                <td>${item.quantityIssued}</td>
                <td>${item.remainingQuantity}</td>
                <td>
                    <button onclick="editItem(${item.id})">සංස්කරණය</button>
                    <button onclick="deleteItem(${item.id})">ඉවත් කරන්න</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    };
}

// Edit an Inventory Item
function editItem(id) {
    const transaction = db.transaction(['inventory'], 'readonly');
    const store = transaction.objectStore('inventory');
    const request = store.get(id);

    request.onsuccess = function(event) {
        const item = event.target.result;
        document.getElementById('itemDescription').value = item.itemDescription;
        document.getElementById('stockPage').value = item.stockPage;
        document.getElementById('purchaseDate').value = item.purchaseDate;
        document.getElementById('invoiceNumber').value = item.invoiceNumber;
        document.getElementById('receiptNumber').value = item.receiptNumber;
        document.getElementById('supplierName').value = item.supplierName;
        document.getElementById('quantityReceived').value = item.quantityReceived;
        document.getElementById('quantityIssued').value = item.quantityIssued;

        editingId = id;
    };
}

// Delete an Inventory Item
function deleteItem(id) {
    if (confirm('ඔබට මෙම අයිතමය ඉවත් කිරීමට අවශ්‍ය බව විශ්වාසද?')) {
        const transaction = db.transaction(['inventory'], 'readwrite');
        const store = transaction.objectStore('inventory');
        const request = store.delete(id);

        request.onsuccess = function() {
            loadInventory();
        };
    }
}

// Search Inventory
document.getElementById('search').addEventListener('input', function() {
    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll('#inventoryTable tbody tr');
    rows.forEach(row => {
        const itemDescription = row.querySelector('td:first-child').textContent.toLowerCase();
        if (itemDescription.includes(searchValue)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

// Print Inventory
function printInventory() {
    window.print();
}

// Backup Inventory Data
function exportBackup() {
    const transaction = db.transaction(['inventory'], 'readonly');
    const store = transaction.objectStore('inventory');
    const request = store.getAll();

    request.onsuccess = function(event) {
        const inventory = event.target.result;
        const jsonString = JSON.stringify(inventory);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = "inventory_backup.json";
        link.click();
    };
}

// Restore Inventory Data
function importBackup(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = JSON.parse(e.target.result);
        const transaction = db.transaction(['inventory'], 'readwrite');
        const store = transaction.objectStore('inventory');

        // Clear existing data
        store.clear();

        let addedCount = 0;
        data.forEach(item => {
            const request = store.add(item);
            request.onsuccess = function() {
                addedCount++;
                if (addedCount === data.length) {
                    loadInventory();
                    alert('දත්ත සාර්ථකව ප්‍රතිස්ථාපනය කරන ලදී.');
                }
            };
        });
    };
    reader.readAsText(file);
}