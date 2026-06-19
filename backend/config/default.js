require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5160,
  db: {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'it_platform',
    port: process.env.DB_PORT || 3306,
  },
  jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_should_be_changed',
  jwtExpiresIn: '24h',
  upload: {
    baseDir: 'public/uploads',
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'],
  },
  seedAdmin: {
    username: process.env.SEED_ADMIN_USERNAME || 'admin',
    password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
  },
  seedUser: {
    username: process.env.SEED_USER_USERNAME || 'user',
    password: process.env.SEED_USER_PASSWORD || 'user123',
    email: process.env.SEED_USER_EMAIL || 'user@example.com',
  },
};
