// State Management
const state = {
    products: [],
    movements: [],
    views: {
        dashboard: document.getElementById('dashboardView'),
        products: document.getElementById('productsView'),
        movements: document.getElementById('movementsView')
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupNavigation();
    setupModals();
    setupForms();
    setupFilters();
    setupExportImport();
    updateDashboard();
    renderProducts();
    renderMovements();
});

// Data Persistence
function loadData() {
    const savedProducts = localStorage.getItem('products');
    const savedMovements = localStorage.getItem('movements');

    if (savedProducts) state.products = JSON.parse(savedProducts);
    if (savedMovements) state.movements = JSON.parse(savedMovements);
}

function saveData() {
    localStorage.setItem('products', JSON.stringify(state.products));
    localStorage.setItem('movements', JSON.stringify(state.movements));
    updateDashboard();
}

// Navigation
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update buttons
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update views
            const viewName = btn.dataset.view;
            Object.values(state.views).forEach(view => view.classList.remove('active'));
            state.views[viewName].classList.add('active');
        });
    });
}

// Modals
function setupModals() {
    // Product Modal
    const productModal = document.getElementById('productModal');
    const addProductBtn = document.getElementById('addProductBtn');
    const closeProductModal = document.getElementById('closeProductModal');
    const cancelProductBtn = document.getElementById('cancelProductBtn');

    function openProductModal() {
        document.getElementById('productForm').reset();
        document.getElementById('productModalTitle').textContent = 'Adicionar Produto';
        document.getElementById('profitMarginDisplay').textContent = '0%';
        document.getElementById('profitMarginDisplay').style.color = '#718096';

        // Show initial stock field for new products
        document.getElementById('productInitialStock').parentElement.style.display = 'block';
        document.getElementById('productInitialStock').value = '0';

        delete document.getElementById('productForm').dataset.editId;
        productModal.classList.add('active');
    }

    function closeProductModalFunc() {
        productModal.classList.remove('active');
    }

    addProductBtn.addEventListener('click', openProductModal);
    closeProductModal.addEventListener('click', closeProductModalFunc);
    cancelProductBtn.addEventListener('click', closeProductModalFunc);

    // Movement Modal
    const movementModal = document.getElementById('movementModal');
    const addEntryBtn = document.getElementById('addEntryBtn');
    const addExitBtn = document.getElementById('addExitBtn');
    const closeMovementModal = document.getElementById('closeMovementModal');
    const cancelMovementBtn = document.getElementById('cancelMovementBtn');

    function openMovementModal(type) {
        const form = document.getElementById('movementForm');
        form.reset();
        document.getElementById('movementType').value = type;
        document.getElementById('movementModalTitle').textContent = type === 'entry' ? 'Registrar Entrada' : 'Registrar Saída';

        // Populate product select
        const select = document.getElementById('movementProduct');
        select.innerHTML = '<option value="">Selecione um produto...</option>';
        state.products.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.code} - ${p.name} (Estoque: ${p.stock})</option>`;
        });

        movementModal.classList.add('active');
    }

    function closeMovementModalFunc() {
        movementModal.classList.remove('active');
    }

    addEntryBtn.addEventListener('click', () => openMovementModal('entry'));
    addExitBtn.addEventListener('click', () => openMovementModal('exit'));
    closeMovementModal.addEventListener('click', closeMovementModalFunc);
    cancelMovementBtn.addEventListener('click', closeMovementModalFunc);

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === productModal) closeProductModalFunc();
        if (e.target === movementModal) closeMovementModalFunc();
    });
}

// Forms
function setupForms() {
    // Product Form
    const purchaseInput = document.getElementById('productPurchasePrice');
    const saleInput = document.getElementById('productSalePrice');

    function updateMargin() {
        const purchase = parseFloat(purchaseInput.value) || 0;
        const sale = parseFloat(saleInput.value) || 0;
        const display = document.getElementById('profitMarginDisplay');

        if (purchase > 0) {
            const margin = ((sale - purchase) / purchase) * 100;
            display.textContent = `${margin.toFixed(1)}%`;

            if (margin > 0) display.style.color = '#48bb78'; // Green
            else if (margin < 0) display.style.color = '#f56565'; // Red
            else display.style.color = '#718096'; // Gray
        } else {
            display.textContent = '0%';
            display.style.color = '#718096';
        }
    }

    purchaseInput.addEventListener('input', updateMargin);
    saleInput.addEventListener('input', updateMargin);

    document.getElementById('productForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = {
            code: document.getElementById('productCode').value,
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            minStock: parseInt(document.getElementById('productMinStock').value),
            purchasePrice: parseFloat(document.getElementById('productPurchasePrice').value) || 0,
            salePrice: parseFloat(document.getElementById('productSalePrice').value) || 0,
            description: document.getElementById('productDescription').value
        };

        const editId = e.target.dataset.editId;

        if (editId) {
            // Edit existing
            const index = state.products.findIndex(p => p.id === parseInt(editId));
            if (index !== -1) {
                // Preserve existing stock
                const currentStock = state.products[index].stock;
                state.products[index] = {
                    ...state.products[index],
                    ...formData,
                    stock: currentStock
                };
            }
        } else {
            // Add new
            const initialStock = parseInt(document.getElementById('productInitialStock').value) || 0;

            const newProduct = {
                id: Date.now(),
                ...formData,
                stock: initialStock,
                createdAt: new Date().toISOString()
            };
            state.products.push(newProduct);

            // If initial stock > 0, create a movement record
            if (initialStock > 0) {
                const movement = {
                    id: Date.now() + 1, // Ensure unique ID
                    type: 'entry',
                    productId: newProduct.id,
                    productName: newProduct.name,
                    quantity: initialStock,
                    notes: 'Estoque Inicial',
                    date: new Date().toISOString()
                };
                state.movements.unshift(movement);
            }
        }

        saveData();
        renderProducts();
        renderMovements(); // Update movements in case we added initial stock
        document.getElementById('productModal').classList.remove('active');
    });

    // Movement Form
    document.getElementById('movementForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const type = document.getElementById('movementType').value;
        const productId = parseInt(document.getElementById('movementProduct').value);
        const quantity = parseInt(document.getElementById('movementQuantity').value);
        const notes = document.getElementById('movementNotes').value;

        const product = state.products.find(p => p.id === productId);

        if (!product) return;

        if (type === 'exit' && product.stock < quantity) {
            alert('Estoque insuficiente!');
            return;
        }

        // Update stock
        if (type === 'entry') {
            product.stock += quantity;
        } else {
            product.stock -= quantity;
        }

        // Record movement
        const movement = {
            id: Date.now(),
            type,
            productId,
            productName: product.name,
            quantity,
            notes,
            date: new Date().toISOString()
        };

        state.movements.unshift(movement); // Add to beginning

        saveData();
        renderProducts();
        renderMovements();
        document.getElementById('movementModal').classList.remove('active');
    });

    // Search
    document.getElementById('searchProducts').addEventListener('input', (e) => {
        renderProducts(e.target.value);
    });
}

// Filters
function setupFilters() {
    const filterInputs = ['filterType', 'filterDateFrom', 'filterDateTo'];
    filterInputs.forEach(id => {
        document.getElementById(id).addEventListener('change', renderMovements);
    });
}

// Rendering
function renderProducts(searchTerm = '') {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    const filtered = state.products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.forEach(p => {
        const tr = document.createElement('tr');

        // Calculate margin for display
        let margin = 0;
        let marginColor = '#718096'; // Default gray
        if (p.purchasePrice > 0) {
            margin = ((p.salePrice - p.purchasePrice) / p.purchasePrice) * 100;
            if (margin > 0) marginColor = '#48bb78'; // Green
            else if (margin < 0) marginColor = '#f56565'; // Red
        }

        tr.innerHTML = `
            <td>${p.code}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>
                <span class="badge ${getStockBadgeClass(p.stock, p.minStock)}">
                    ${p.stock}
                </span>
            </td>
            <td>R$ ${(p.purchasePrice || 0).toFixed(2)}</td>
            <td>R$ ${(p.salePrice || 0).toFixed(2)}</td>
            <td style="font-weight: bold; color: ${marginColor}">
                ${margin.toFixed(1)}%
            </td>
            <td>
                <button class="action-btn" onclick="editProduct(${p.id})" title="Editar">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                </button>
                <button class="action-btn delete" onclick="deleteProduct(${p.id})" title="Excluir">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMovements() {
    const tbody = document.getElementById('movementsTableBody');
    tbody.innerHTML = '';

    const type = document.getElementById('filterType').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;

    let filtered = state.movements;

    if (type !== 'all') {
        filtered = filtered.filter(m => m.type === type);
    }

    if (dateFrom) {
        filtered = filtered.filter(m => m.date >= dateFrom);
    }

    if (dateTo) {
        filtered = filtered.filter(m => m.date.split('T')[0] <= dateTo);
    }

    filtered.forEach(m => {
        const tr = document.createElement('tr');
        const date = new Date(m.date).toLocaleString('pt-BR');
        const typeLabel = m.type === 'entry' ? 'Entrada' : 'Saída';
        const typeClass = m.type === 'entry' ? 'badge-success' : 'badge-danger';

        tr.innerHTML = `
            <td>${date}</td>
            <td><span class="badge ${typeClass}">${typeLabel}</span></td>
            <td>${m.productName}</td>
            <td>${m.quantity}</td>
            <td>${m.notes || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateDashboard() {
    // Stats
    document.getElementById('totalProducts').textContent = state.products.length;
    document.getElementById('totalStock').textContent = state.products.reduce((acc, p) => acc + p.stock, 0);

    const currentMonth = new Date().getMonth();
    const monthlyEntries = state.movements
        .filter(m => m.type === 'entry' && new Date(m.date).getMonth() === currentMonth)
        .reduce((acc, m) => acc + m.quantity, 0);

    const monthlyExits = state.movements
        .filter(m => m.type === 'exit' && new Date(m.date).getMonth() === currentMonth)
        .reduce((acc, m) => acc + m.quantity, 0);

    document.getElementById('monthlyEntries').textContent = monthlyEntries;
    document.getElementById('monthlyExits').textContent = monthlyExits;

    // Low Stock List
    const lowStockList = document.getElementById('lowStockList');
    lowStockList.innerHTML = '';

    const lowStockProducts = state.products
        .filter(p => p.stock <= p.minStock)
        .slice(0, 5);

    if (lowStockProducts.length === 0) {
        lowStockList.innerHTML = '<p class="text-light">Nenhum produto com estoque baixo.</p>';
    } else {
        lowStockProducts.forEach(p => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div class="list-item-info">
                    <h4>${p.name}</h4>
                    <p>Mínimo: ${p.minStock}</p>
                </div>
                <span class="badge badge-danger">${p.stock}</span>
            `;
            lowStockList.appendChild(div);
        });
    }

    // Recent Movements
    const recentList = document.getElementById('recentMovements');
    recentList.innerHTML = '';

    state.movements.slice(0, 5).forEach(m => {
        const div = document.createElement('div');
        div.className = 'list-item';
        const typeClass = m.type === 'entry' ? 'badge-success' : 'badge-danger';
        const icon = m.type === 'entry' ? '+' : '-';

        div.innerHTML = `
            <div class="list-item-info">
                <h4>${m.productName}</h4>
                <p>${new Date(m.date).toLocaleDateString('pt-BR')}</p>
            </div>
            <span class="badge ${typeClass}">${icon}${m.quantity}</span>
        `;
        recentList.appendChild(div);
    });
}

// Helpers
function getStockBadgeClass(current, min) {
    if (current === 0) return 'badge-danger';
    if (current <= min) return 'badge-warning';
    return 'badge-success';
}

// Global functions for HTML onclick events
window.editProduct = function (id) {
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('productCode').value = product.code;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productMinStock').value = product.minStock;
    document.getElementById('productPurchasePrice').value = product.purchasePrice || 0;
    document.getElementById('productSalePrice').value = product.salePrice || 0;
    document.getElementById('productDescription').value = product.description;

    // Hide initial stock field when editing
    document.getElementById('productInitialStock').parentElement.style.display = 'none';

    // Trigger margin calculation
    const event = new Event('input');
    document.getElementById('productPurchasePrice').dispatchEvent(event);

    document.getElementById('productForm').dataset.editId = id;
    document.getElementById('productModalTitle').textContent = 'Editar Produto';
    document.getElementById('productModal').classList.add('active');
};

window.deleteProduct = function (id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        state.products = state.products.filter(p => p.id !== id);
        saveData();
        renderProducts();
    }
};

// Export/Import
function setupExportImport() {
    document.getElementById('exportBtn').addEventListener('click', () => {
        const data = {
            products: state.products,
            movements: state.movements,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-estoque-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    const fileInput = document.getElementById('importFileInput');
    document.getElementById('importBtn').addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.products && data.movements) {
                    if (confirm('Isso irá substituir todos os dados atuais. Deseja continuar?')) {
                        state.products = data.products;
                        state.movements = data.movements;
                        saveData();
                        renderProducts();
                        renderMovements();
                        alert('Dados importados com sucesso!');
                    }
                } else {
                    alert('Arquivo inválido!');
                }
            } catch (err) {
                alert('Erro ao ler arquivo!');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });
}
