-- Safety, ANPR, and Patrol Module Schema

CREATE TABLE IF NOT EXISTS anpr_gate_events (
    id BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL,
    gate_id VARCHAR(50) NOT NULL,
    direction VARCHAR(5) NOT NULL, -- IN, OUT
    plate_number VARCHAR(20) NOT NULL,
    confidence DOUBLE PRECISION,
    anpr_status VARCHAR(20) NOT NULL, -- MATCH, NO_MATCH, PARTIAL_MATCH
    barrier_action VARCHAR(10) NOT NULL, -- OPEN, HOLD, DENY
    matched_resident_name VARCHAR(150),
    matched_vehicle_id BIGINT,
    matched_visitor_pass_id BIGINT,
    processing_ms INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anpr_community_ts ON anpr_gate_events(community_id, created_at DESC);

CREATE TABLE IF NOT EXISTS patrol_rounds (
    id BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL,
    guard_id BIGINT NOT NULL,
    guard_name VARCHAR(150),
    route_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    total_checkpoints INT NOT NULL,
    completed_checkpoints INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patrol_checkpoints (
    id BIGSERIAL PRIMARY KEY,
    round_id BIGINT NOT NULL REFERENCES patrol_rounds(id) ON DELETE CASCADE,
    checkpoint_name VARCHAR(100) NOT NULL,
    nfc_tag_id VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    scanned_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_incidents (
    id BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL,
    reported_by BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(15) NOT NULL DEFAULT 'OPEN',
    assigned_to VARCHAR(150),
    resolution_notes TEXT,
    reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);
