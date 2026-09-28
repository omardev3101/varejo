const DB_NAME = 'VarejoProOffline';
const DB_VERSION = 1;

let dbInstance = null;

export const initDB = () => {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('products')) {
                db.createObjectStore('products', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('customers')) {
                db.createObjectStore('customers', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('salesQueue')) {
                db.createObjectStore('salesQueue', { keyPath: 'localId', autoIncrement: true });
            }
            
            if (!db.objectStoreNames.contains('cashierSessions')) {
                db.createObjectStore('cashierSessions', { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: 'email' });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error('IndexedDB open error:', event.target.error);
            reject(event.target.error);
        };
    });
};

const getStore = async (storeName, mode = 'readonly') => {
    const db = await initDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
};

// --- PRODUCTS ---
export const saveProducts = async (products) => {
    const db = await initDB();
    const transaction = db.transaction('products', 'readwrite');
    const store = transaction.objectStore('products');
    
    // Clear old products first
    store.clear();
    
    products.forEach(product => {
        store.put(product);
    });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
};

export const searchProductsLocal = async (term) => {
    const store = await getStore('products', 'readonly');
    
    return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const products = request.result || [];
            if (!term) {
                resolve(products);
                return;
            }
            
            const normalizedTerm = term.toLowerCase().trim();
            const filtered = products.filter(p => 
                (p.name && p.name.toLowerCase().includes(normalizedTerm)) ||
                (p.ean && p.ean.includes(normalizedTerm)) ||
                (p.ms_registry && p.ms_registry.includes(normalizedTerm))
            );
            resolve(filtered);
        };
        request.onerror = () => resolve([]);
    });
};

export const updateProductStockLocal = async (productId, qtyToDeduct) => {
    const db = await initDB();
    const transaction = db.transaction('products', 'readwrite');
    const store = transaction.objectStore('products');
    
    return new Promise((resolve, reject) => {
        const getReq = store.get(Number(productId));
        getReq.onsuccess = () => {
            const product = getReq.result;
            if (product) {
                product.stock_qty = Math.max(0, (product.stock_qty || 0) - qtyToDeduct);
                store.put(product);
            }
            resolve(true);
        };
        getReq.onerror = () => reject(getReq.error);
    });
};

// --- CUSTOMERS ---
export const saveCustomers = async (customers) => {
    const db = await initDB();
    const transaction = db.transaction('customers', 'readwrite');
    const store = transaction.objectStore('customers');
    
    store.clear();
    
    customers.forEach(customer => {
        store.put(customer);
    });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
};

export const searchCustomersLocal = async (term) => {
    const store = await getStore('customers', 'readonly');
    
    return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const customers = request.result || [];
            if (!term) {
                resolve([]);
                return;
            }
            const normalizedTerm = term.toLowerCase().trim();
            const filtered = customers.filter(c => 
                (c.name && c.name.toLowerCase().includes(normalizedTerm)) ||
                (c.cpf && c.cpf.includes(normalizedTerm))
            );
            resolve(filtered);
        };
        request.onerror = () => resolve([]);
    });
};

// --- CASHIER SESSION ---
export const saveCashierSession = async (session) => {
    const db = await initDB();
    const transaction = db.transaction('cashierSessions', 'readwrite');
    const store = transaction.objectStore('cashierSessions');
    
    store.clear();
    if (session) {
        store.put(session);
    }
    
    return new Promise((resolve) => {
        transaction.oncomplete = () => resolve(true);
    });
};

export const getCashierSessionLocal = async () => {
    const store = await getStore('cashierSessions', 'readonly');
    return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const sessions = request.result;
            resolve(sessions && sessions.length > 0 ? sessions[0] : null);
        };
        request.onerror = () => resolve(null);
    });
};

// --- USERS (FOR OFFLINE AUTH) ---
export const saveUserLocal = async (user, password) => {
    const db = await initDB();
    const transaction = db.transaction('users', 'readwrite');
    const store = transaction.objectStore('users');
    // Store user data alongside the password hash or plain/obfuscated password for local verification
    // Since we don't have bcrypt on the frontend easily, we'll store basic authentication mapping
    store.put({
        email: user.email,
        userData: user,
        password: password // stored securely or plain (offline checkout on local machine)
    });
    return new Promise((resolve) => {
        transaction.oncomplete = () => resolve(true);
    });
};

export const verifyUserLocal = async (email, password) => {
    const store = await getStore('users', 'readonly');
    return new Promise((resolve) => {
        const request = store.get(email);
        request.onsuccess = () => {
            const userRecord = request.result;
            if (userRecord && userRecord.password === password) {
                resolve(userRecord.userData);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => resolve(null);
    });
};

// --- SALES QUEUE ---
export const queueSaleLocal = async (sale) => {
    const db = await initDB();
    const transaction = db.transaction(['salesQueue'], 'readwrite');
    const store = transaction.objectStore('salesQueue');
    
    store.add(sale);
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getQueuedSalesLocal = async () => {
    const store = await getStore('salesQueue', 'readonly');
    return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
};

export const removeQueuedSaleLocal = async (localId) => {
    const db = await initDB();
    const transaction = db.transaction('salesQueue', 'readwrite');
    const store = transaction.objectStore('salesQueue');
    
    store.delete(localId);
    
    return new Promise((resolve) => {
        transaction.oncomplete = () => resolve(true);
    });
};
