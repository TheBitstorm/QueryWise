import { query, exec } from './index.js';

export async function seedDatabase() {
  console.log('[Seed] Generating realistic dataset for QueryWise demo database...');

  // 1. Seed demo_users (500 users)
  const firstNames = ['James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Lucas', 'Mia', 'Oliver', 'Isabella', 'Leo', 'Amelia', 'Aria', 'Mateo', 'Zoe', 'Aiden', 'Chloe', 'Jack', 'Aarav', 'Diya', 'Priya', 'Rohan', 'Kenji', 'Yuki', 'Carlos', 'Sofia', 'Fatima', 'Tariq'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Patel', 'Sharma', 'Tanaka', 'Sato', 'Mueller', 'Schmidt', 'Dubois', 'Leroy'];
  const countries = ['United States', 'United Kingdom', 'Germany', 'Canada', 'India', 'Japan', 'France', 'Australia', 'Brazil', 'Singapore', 'Netherlands'];
  const roles = ['user', 'user', 'user', 'developer', 'developer', 'manager', 'admin'];

  const userValues = [];
  for (let i = 1; i <= 500; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const username = `${fn.toLowerCase()}_${ln.toLowerCase()}_${i}`;
    const email = `${username}@example.com`;
    const fullName = `${fn} ${ln}`;
    const role = roles[i % roles.length];
    const country = countries[i % countries.length];
    const isActive = i % 15 !== 0;
    userValues.push(`('${username}', '${email}', '${fullName}', '${role}', '${country}', ${isActive})`);
  }

  await exec(`
    INSERT INTO demo_users (username, email, full_name, role, country, is_active)
    VALUES ${userValues.join(',\n')}
    ON CONFLICT DO NOTHING;
  `);
  console.log('[Seed] Inserted 500 demo users.');

  // 2. Seed demo_products (150 products)
  const categories = ['Electronics', 'Displays', 'Peripherals', 'Furniture', 'Networking', 'Storage', 'Software'];
  const productAdjectives = ['Ultra', 'Pro', 'Ergonomic', 'Wireless', 'Mechanical', 'Compact', 'Titanium', 'Precision', 'High-Speed', 'Studio'];
  const productNouns = ['Keyboard', 'Mouse', 'Monitor', 'Desk', 'Chair', 'SSD Drive', 'Hub', 'Headphones', 'Webcam', 'Microphone', 'Router', 'Docking Station'];

  const productValues = [];
  for (let i = 1; i <= 150; i++) {
    const sku = `SKU-${1000 + i}`;
    const adj = productAdjectives[i % productAdjectives.length];
    const noun = productNouns[(i * 2) % productNouns.length];
    const name = `${adj} ${noun} Gen-${(i % 5) + 1}`;
    const cat = categories[i % categories.length];
    const price = ((i * 17.5 + 25) % 1200 + 19.99).toFixed(2);
    const stock = (i * 13) % 250;
    const rating = (3.5 + ((i % 15) / 10)).toFixed(1);
    productValues.push(`('${sku}', '${name}', '${cat}', ${price}, ${stock}, ${rating})`);
  }

  await exec(`
    INSERT INTO demo_products (sku, name, category, price, stock_quantity, rating)
    VALUES ${productValues.join(',\n')}
    ON CONFLICT DO NOTHING;
  `);
  console.log('[Seed] Inserted 150 demo products.');

  // 3. Seed demo_orders (3,000 orders)
  const statuses = ['completed', 'completed', 'completed', 'processing', 'pending', 'cancelled'];
  const orderValues = [];
  const now = Date.now();

  for (let i = 1; i <= 3000; i++) {
    const orderNum = `ORD-${20260000 + i}`;
    const userId = (i % 500) + 1;
    const status = statuses[i % statuses.length];
    const totalAmount = ((i * 43.7 + 15) % 3500 + 29.50).toFixed(2);
    const country = countries[(i * 2) % countries.length];
    // Past dates staggered across 365 days
    const daysAgo = (i % 365);
    const orderDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    orderValues.push(`('${orderNum}', ${userId}, '${status}', ${totalAmount}, '${country}', '${orderDate}')`);
  }

  // Insert in batches of 500 to keep queries clean
  for (let b = 0; b < orderValues.length; b += 500) {
    const batch = orderValues.slice(b, b + 500);
    await exec(`
      INSERT INTO demo_orders (order_number, user_id, status, total_amount, shipping_country, created_at)
      VALUES ${batch.join(',\n')}
      ON CONFLICT DO NOTHING;
    `);
  }
  console.log('[Seed] Inserted 3,000 demo orders.');

  // 4. Seed demo_transactions (3,000 transactions)
  const paymentMethods = ['credit_card', 'credit_card', 'paypal', 'bank_transfer', 'crypto'];
  const txStatuses = ['success', 'success', 'success', 'failed', 'refunded'];
  const txValues = [];

  for (let i = 1; i <= 3000; i++) {
    const txCode = `TXN-99${10000 + i}`;
    const orderId = i;
    const amount = ((i * 43.7 + 15) % 3500 + 29.50).toFixed(2);
    const method = paymentMethods[i % paymentMethods.length];
    const status = txStatuses[i % txStatuses.length];
    const gwResponse = `{"gateway":"stripe","code":"ch_${i}abc","auth_status":"${status}"}`;
    const daysAgo = (i % 365);
    const txDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    txValues.push(`('${txCode}', ${orderId}, ${amount}, '${method}', '${status}', '${gwResponse}', '${txDate}')`);
  }

  for (let b = 0; b < txValues.length; b += 500) {
    const batch = txValues.slice(b, b + 500);
    await exec(`
      INSERT INTO demo_transactions (transaction_code, order_id, amount, payment_method, status, payment_gateway_response, created_at)
      VALUES ${batch.join(',\n')}
      ON CONFLICT DO NOTHING;
    `);
  }
  console.log('[Seed] Inserted 3,000 demo transactions.');
}

