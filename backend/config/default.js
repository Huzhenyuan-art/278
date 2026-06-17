require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5160,
  db: {
    host: process.env.DB_HOST || 'db', // Docker service name
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'it_platform',
    port: process.env.DB_PORT || 3306,
  },
  jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_should_be_changed',
  jwtExpiresIn: '24h',
};
