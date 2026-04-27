const mysql = require('mysql2/promise');

let pool = null;

const config = {
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT) || 3306,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

async function initDatabase() {
  // First connect without database to create it if needed
  const tempPool = mysql.createPool({
    ...config,
    database: undefined
  });

  try {
    await tempPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.RDS_DB}`);
    await tempPool.end();
  } catch (error) {
    console.log('Database creation skipped or already exists');
  }

  // Create main pool with database
  pool = mysql.createPool(config);

  // Create tables
  await createTables();
}

async function createTables() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(50),
      avatar_url VARCHAR(500),
      user_secret_key VARCHAR(255),
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      INDEX idx_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;

  const createContactsTable = `
    CREATE TABLE IF NOT EXISTS contacts (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      friend_id VARCHAR(36) NOT NULL,
      friend_name VARCHAR(50),
      friend_phone VARCHAR(20),
      friend_avatar VARCHAR(500),
      created_at BIGINT NOT NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_friend_id (friend_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      contact_id VARCHAR(36) NOT NULL,
      friend_id VARCHAR(36) NOT NULL,
      type ENUM('text','image','voice') NOT NULL,
      content TEXT NOT NULL,
      is_cloud TINYINT(1) DEFAULT 0,
      cloud_url VARCHAR(500),
      burn_after_read TINYINT(1) DEFAULT 0,
      burn_duration BIGINT,
      read_at BIGINT,
      created_at BIGINT NOT NULL,
      INDEX idx_user_contact (user_id, contact_id),
      INDEX idx_user_cloud (user_id, is_cloud),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;

  const createFilesTable = `
    CREATE TABLE IF NOT EXISTS files (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      contact_id VARCHAR(36),
      type ENUM('image','voice','other') NOT NULL,
      original_name VARCHAR(255),
      oss_key VARCHAR(500) NOT NULL,
      oss_bucket VARCHAR(100) NOT NULL,
      file_size BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      INDEX idx_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;

  const createVerificationCodesTable = `
    CREATE TABLE IF NOT EXISTS verification_codes (
      id VARCHAR(36) PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      INDEX idx_phone (phone),
      INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;

  await pool.query(createUsersTable);
  await pool.query(createContactsTable);
  await pool.query(createMessagesTable);
  await pool.query(createFilesTable);
  await pool.query(createVerificationCodesTable);

  console.log('All tables created successfully');
}

function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

async function query(sql, params) {
  const [results] = await getPool().query(sql, params);
  return results;
}

async function getConnection() {
  return getPool().getConnection();
}

module.exports = {
  initDatabase,
  query,
  getConnection,
  getPool
};
