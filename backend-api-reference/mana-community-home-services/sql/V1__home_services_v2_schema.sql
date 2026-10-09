-- Home Services v2 Schema — Domestic Staff, Attendance, Packages, Job Board

CREATE TABLE IF NOT EXISTS domestic_staff (
    id BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL, -- MAID, COOK, DRIVER, NANNY, GARDENER, WATCHMAN, HELPER
    phone VARCHAR(20),
    photo VARCHAR(500),
    verified BOOLEAN DEFAULT FALSE,
    police_verified BOOLEAN DEFAULT FALSE,
    aadhaar_on_file BOOLEAN DEFAULT FALSE,
    rating DOUBLE PRECISION DEFAULT 4.0,
    review_count INT DEFAULT 0,
    experience VARCHAR(50),
    monthly_salary NUMERIC(10, 2),
    working_flats TEXT, -- JSON array
    working_towers VARCHAR(200),
    shift_time VARCHAR(50),
    joining_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_attendance (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES domestic_staff(id),
    staff_name VARCHAR(150),
    role VARCHAR(20),
    date DATE NOT NULL,
    check_in_time TIME,
    check_in_gate VARCHAR(100),
    check_out_time TIME,
    check_out_gate VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_MARKED',
    marked_by VARCHAR(150),
    photo_url VARCHAR(500)
);

CREATE INDEX idx_staff_attendance_date ON staff_attendance(staff_id, date);

CREATE TABLE IF NOT EXISTS service_packages (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES domestic_staff(id),
    staff_name VARCHAR(150),
    role VARCHAR(20),
    user_id BIGINT NOT NULL,
    flat_number VARCHAR(20),
    package_type VARCHAR(10) NOT NULL DEFAULT 'MONTHLY',
    services TEXT, -- JSON array
    monthly_salary NUMERIC(10, 2),
    last_paid_date DATE,
    next_due_date DATE,
    payment_status VARCHAR(10) NOT NULL DEFAULT 'DUE',
    start_date DATE,
    end_date DATE
);

CREATE TABLE IF NOT EXISTS staff_job_posts (
    id BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL,
    posted_by_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL,
    description TEXT,
    requirements TEXT, -- JSON array
    salary_range VARCHAR(50),
    shift_preference VARCHAR(50),
    tower VARCHAR(50),
    flat_number VARCHAR(20),
    posted_by VARCHAR(150),
    status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    applicant_count INT DEFAULT 0,
    posted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
