module.exports = {
  port: process.env.PORT || 5161,
  db: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
  jwtSecret: 'test_jwt_secret_key_for_testing_only',
  jwtExpiresIn: '1h',
  upload: {
    baseDir: 'public/uploads',
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'],
  },
  seedAdmin: {
    username: 'admin',
    password: 'admin123',
    email: 'admin@example.com',
  },
  seedUser: {
    username: 'testuser',
    password: 'test123',
    email: 'test@example.com',
  },
};
