-- QueryWise Seed Script (Sample snippet for manual SQL runners)
-- The application also includes an automated programmatic seeder with 3000+ realistic rows.

INSERT INTO demo_users (username, email, full_name, role, country) VALUES
('alex_dev', 'alex@example.com', 'Alex Rivera', 'developer', 'United States'),
('sarah_m', 'sarah@example.com', 'Sarah Miller', 'admin', 'Canada'),
('chen_wei', 'chen@example.com', 'Wei Chen', 'user', 'Singapore'),
('elena_r', 'elena@example.com', 'Elena Rostova', 'user', 'Germany'),
('david_k', 'david@example.com', 'David Kim', 'manager', 'South Korea')
ON CONFLICT DO NOTHING;

INSERT INTO demo_products (sku, name, category, price, stock_quantity, rating) VALUES
('PROD-KB-001', 'Ergonomic Mechanical Keyboard', 'Electronics', 129.99, 45, 4.8),
('PROD-MO-002', 'Wireless Precision Mouse', 'Electronics', 79.50, 110, 4.6),
('PROD-MN-003', '4K UltraHD Developer Monitor 32-inch', 'Displays', 499.00, 24, 4.9),
('PROD-CH-004', 'High-Back Mesh Desk Chair', 'Furniture', 320.00, 15, 4.4),
('PROD-DS-005', 'Motorized Standing Desk 60x30', 'Furniture', 650.00, 8, 4.7)
ON CONFLICT DO NOTHING;

