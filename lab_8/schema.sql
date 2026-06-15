-- SSO application schema for lab_9_2_multi_agent
-- Tables: users, permissions, users_permissions, audit_login

-- Required for schema RAG (vector embeddings)
CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (reverse dependency order for clean rerun)
DROP TABLE IF EXISTS resource_booking;
DROP TABLE IF EXISTS resource;
DROP TABLE IF EXISTS audit_login;
DROP TABLE IF EXISTS users_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS users;

-- Users: core identity for SSO
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(255),
    password_hash   VARCHAR(255),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Permissions: granular permissions (e.g. read_reports, admin_users)
CREATE TABLE permissions (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_code ON permissions(code);

-- Users <-> Permissions: many-to-many
CREATE TABLE users_permissions (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (user_id, permission_id)
);

CREATE INDEX idx_users_permissions_user_id ON users_permissions(user_id);
CREATE INDEX idx_users_permissions_permission_id ON users_permissions(permission_id);
CREATE INDEX idx_users_permissions_granted_at ON users_permissions(granted_at);

-- Audit: login attempts (success/failure) for security
CREATE TABLE audit_login (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email_used VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    success    BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_login_user_id ON audit_login(user_id);
CREATE INDEX idx_audit_login_email ON audit_login(email_used);
CREATE INDEX idx_audit_login_success ON audit_login(success);
CREATE INDEX idx_audit_login_created_at ON audit_login(created_at);

-- Resource: sports facilities (football, tennis, basketball)
CREATE TABLE resource (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resource_type ON resource(type);
CREATE INDEX idx_resource_name ON resource(name);

-- Resource booking: user bookings for resources (start/end time)
CREATE TABLE resource_booking (
    id            SERIAL PRIMARY KEY,
    resource_id   INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time    TIMESTAMPTZ NOT NULL,
    end_time      TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resource_booking_resource_id ON resource_booking(resource_id);
CREATE INDEX idx_resource_booking_user_id ON resource_booking(user_id);
CREATE INDEX idx_resource_booking_start_time ON resource_booking(start_time);

-- Comment for RAG: tables and relationships
COMMENT ON TABLE users IS 'SSO users: email, display_name, active flag';
COMMENT ON TABLE permissions IS 'Permission definitions: code (e.g. admin_users), name, description';
COMMENT ON TABLE users_permissions IS 'Junction: which user has which permission; granted_at, granted_by';
COMMENT ON TABLE audit_login IS 'Login audit: user_id, email_used, ip, success, created_at';
COMMENT ON TABLE resource IS 'Sports resources: name, type (football, tennis, basketball)';
COMMENT ON TABLE resource_booking IS 'Bookings: resource_id, user_id, start_time, end_time';
