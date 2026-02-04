-- =====================================================
-- V1: Create Events and Orders Tables (H2 Compatible)
-- =====================================================

-- =====================================================
-- Events Table
-- =====================================================
CREATE TABLE events (
    id UUID PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,

    age_min INTEGER NOT NULL CHECK (age_min >= 1 AND age_min <= 18),
    age_max INTEGER NOT NULL CHECK (age_max >= 1 AND age_max <= 18),
    age_restriction_note VARCHAR(200),
    strict_age_enforcement BOOLEAN NOT NULL DEFAULT true,

    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    registration_deadline TIMESTAMP NOT NULL,

    location VARCHAR(100) NOT NULL,
    address VARCHAR(200),

    capacity INTEGER NOT NULL CHECK (capacity > 0),

    fee DECIMAL(10, 2) NOT NULL CHECK (fee >= 0),

    organizer VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_age_range CHECK (age_min <= age_max),
    CONSTRAINT chk_time_range CHECK (start_time < end_time),
    CONSTRAINT chk_registration_before_event CHECK (registration_deadline < start_time)
);

CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_location ON events(location);
CREATE INDEX idx_events_age_range ON events(age_min, age_max);
CREATE INDEX idx_events_registration_deadline ON events(registration_deadline);

-- =====================================================
-- Orders Table
-- =====================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY,

    event_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'COMPLETED')),

    parent_name VARCHAR(50) NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(10) NOT NULL,

    child_name VARCHAR(50) NOT NULL,
    child_birth_date DATE NOT NULL,
    child_gender VARCHAR(10) CHECK (child_gender IN ('MALE', 'FEMALE', 'OTHER')),
    child_age_at_event INTEGER NOT NULL,

    emergency_contact_name VARCHAR(50),
    emergency_contact_phone VARCHAR(10),
    emergency_contact_relationship VARCHAR(50),

    notes TEXT,

    fee DECIMAL(10, 2) NOT NULL CHECK (fee >= 0),
    payment_deadline TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_parent_email ON orders(parent_email);
CREATE INDEX idx_orders_created_at ON orders(created_at);
