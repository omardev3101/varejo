-- FarmaBus ERP - Initial Database Schema
-- Focus: Multi-tenancy, PDV and SNGPC

CREATE DATABASE IF NOT EXISTS farmabus;
USE farmabus;

-- 1. Tenants (Stores)
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'seller', 'pharmacist') DEFAULT 'seller',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    ean VARCHAR(14),
    ncm VARCHAR(8),
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    stock_qty INT DEFAULT 0,
    is_controlled BOOLEAN DEFAULT FALSE, -- For SNGPC
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 4. Inventory Batches (Traceability for SNGPC)
CREATE TABLE IF NOT EXISTS inventory_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    batch_number VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 5. Sales
CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    payment_method ENUM('cash', 'credit_card', 'debit_card', 'pix', 'convenio') NOT NULL,
    status ENUM('completed', 'cancelled', 'pending') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 6. SNGPC Prescriptions (Medicamentos Controlados)
CREATE TABLE IF NOT EXISTS sngpc_prescriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    prescription_date DATE NOT NULL,
    prescription_type ENUM('A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5', 'AM') NOT NULL,
    prescriber_name VARCHAR(255) NOT NULL,
    prescriber_reg_number VARCHAR(20) NOT NULL, -- CRM/CRO/CRV
    prescriber_uf CHAR(2) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_document VARCHAR(20) NOT NULL,
    buyer_doc_type ENUM('CPF', 'RG') NOT NULL,
    patient_name VARCHAR(255),
    patient_age INT,
    patient_sex ENUM('M', 'F'),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
);
