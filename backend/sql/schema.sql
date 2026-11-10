-- QueryWise Database Schema
-- Supports PostgreSQL 14+ / AWS RDS PostgreSQL and PGlite

-- 1. Query History Table
CREATE TABLE IF NOT EXISTS query_history (
    id VARCHAR(36) PRIMARY KEY,
    query_text TEXT NOT NULL,
    normalized_query TEXT,
    execution_time_ms NUMERIC(20, 3),
    planning_time_ms NUMERIC(20, 3),
    estimated_cost NUMERIC(20, 2),
    rows_returned INTEGER,
    performance_status VARCHAR(20) NOT NULL DEFAULT 'optimal',
    issues_count INTEGER DEFAULT 0,
    high_severity_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for dashboard metrics and history queries
CREATE INDEX IF NOT EXISTS idx_query_history_created_at ON query_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_history_status ON query_history(performance_status);

-- 2. Query Analysis Results Table
CREATE TABLE IF NOT EXISTS query_analysis_results (
    id VARCHAR(36) PRIMARY KEY,
    query_id VARCHAR(36) REFERENCES query_history(id) ON DELETE CASCADE,
    execution_plan JSONB NOT NULL,
    raw_plan_text TEXT,
    detected_issues JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    ai_explanation JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_query_analysis_query_id ON query_analysis_results(query_id);

-- 3. Demo Dataset Tables for Query Analysis Evaluation

CREATE TABLE IF NOT EXISTS demo_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    country VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS demo_products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 4.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: We intentionally omit an index on orders(status, created_at) and orders(user_id) initially
-- so users can observe Seq Scan bottlenecks vs Index Scans!
CREATE TABLE IF NOT EXISTS demo_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(40) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES demo_users(id),
    status VARCHAR(30) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    shipping_country VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS demo_transactions (
    id SERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    order_id INTEGER REFERENCES demo_orders(id),
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    payment_gateway_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

