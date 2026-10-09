-- Society Finance Module Schema

CREATE TABLE IF NOT EXISTS society_vendors (
    id BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL,
    vendor_name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(120),
    gstin VARCHAR(20),
    pan_number VARCHAR(15),
    bank_name VARCHAR(100),
    account_number VARCHAR(30),
    ifsc_code VARCHAR(15),
    tds_section VARCHAR(30) DEFAULT 'NONE',
    tds_rate NUMERIC(5, 2) DEFAULT 0,
    total_billed NUMERIC(15, 2) DEFAULT 0,
    total_paid NUMERIC(15, 2) DEFAULT 0,
    outstanding_balance NUMERIC(15, 2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_invoices (
    id BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    unit_number VARCHAR(20) NOT NULL,
    resident_name VARCHAR(150) NOT NULL,
    resident_email VARCHAR(120),
    resident_phone VARCHAR(20),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) DEFAULT 0,
    balance_due NUMERIC(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    notes TEXT,
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_invoice_line_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES society_invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    rate NUMERIC(15, 2) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    tax_rate NUMERIC(5, 2)
);

CREATE TABLE IF NOT EXISTS society_expenses (
    id BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL,
    voucher_number VARCHAR(30),
    category VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    account_id BIGINT,
    account_name VARCHAR(150),
    vendor_id BIGINT REFERENCES society_vendors(id),
    vendor_name VARCHAR(200),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_MAKER',
    maker_name VARCHAR(150),
    maker_date TIMESTAMP,
    checker_name VARCHAR(150),
    checker_date TIMESTAMP,
    checker_notes TEXT,
    approver_name VARCHAR(150),
    approver_date TIMESTAMP,
    approver_notes TEXT,
    receipt_url VARCHAR(500),
    payment_method VARCHAR(30),
    utr_reference VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
