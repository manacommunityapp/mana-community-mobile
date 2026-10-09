-- Personal Finance Module Schema

CREATE TABLE IF NOT EXISTS personal_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'SAVINGS',
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    credit_limit NUMERIC(15, 2),
    currency VARCHAR(5) NOT NULL DEFAULT 'INR',
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    billing_day INT,
    payment_due_day INT,
    color VARCHAR(20),
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personal_categories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    type VARCHAR(10) NOT NULL, -- INCOME, EXPENSE
    parent_id BIGINT REFERENCES personal_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS personal_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(15) NOT NULL, -- INCOME, EXPENSE, TRANSFER
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(5) NOT NULL DEFAULT 'INR',
    category_id BIGINT REFERENCES personal_categories(id),
    category_name VARCHAR(100),
    category_icon VARCHAR(50),
    category_color VARCHAR(20),
    subcategory_name VARCHAR(100),
    account_id BIGINT NOT NULL REFERENCES personal_accounts(id),
    account_name VARCHAR(150),
    to_account_id BIGINT REFERENCES personal_accounts(id),
    to_account_name VARCHAR(150),
    description VARCHAR(255) NOT NULL,
    notes TEXT,
    receipt_url VARCHAR(500),
    tags VARCHAR(500),
    split_details TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_mana_projection BOOLEAN NOT NULL DEFAULT FALSE,
    source_module VARCHAR(50),
    source_type VARCHAR(50),
    source_id VARCHAR(50),
    source_label VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pf_txn_user_date ON personal_transactions(user_id, date DESC);
CREATE INDEX idx_pf_txn_user_type ON personal_transactions(user_id, type);

CREATE TABLE IF NOT EXISTS personal_budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category_id BIGINT REFERENCES personal_categories(id),
    category_name VARCHAR(100),
    category_icon VARCHAR(50),
    category_color VARCHAR(20),
    period VARCHAR(15) NOT NULL DEFAULT 'MONTHLY',
    limit_amount NUMERIC(15, 2) NOT NULL,
    spent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    alert_threshold INT NOT NULL DEFAULT 80,
    month VARCHAR(7) NOT NULL -- YYYY-MM
);

CREATE TABLE IF NOT EXISTS personal_recurring (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(15) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    category_id BIGINT REFERENCES personal_categories(id),
    account_id BIGINT NOT NULL REFERENCES personal_accounts(id),
    frequency VARCHAR(15) NOT NULL DEFAULT 'MONTHLY',
    next_due_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS personal_bills (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    category_id BIGINT REFERENCES personal_categories(id),
    category_name VARCHAR(100),
    category_icon VARCHAR(50),
    category_color VARCHAR(20),
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_days_before INT NOT NULL DEFAULT 3,
    is_mana_invoice BOOLEAN NOT NULL DEFAULT FALSE,
    invoice_id VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS personal_installments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    monthly_emi NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2),
    total_tenor_months INT NOT NULL,
    remaining_tenor_months INT,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    next_due_date DATE,
    account_id BIGINT REFERENCES personal_accounts(id),
    category_id BIGINT REFERENCES personal_categories(id),
    is_auto_deduct BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS personal_goals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL,
    current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    target_date DATE,
    icon VARCHAR(50),
    color VARCHAR(20),
    category_id BIGINT REFERENCES personal_categories(id),
    notes TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE
);
