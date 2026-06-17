const { Sequelize } = require('sequelize');
const config = require('../config/default');
const logger = require('koa-logger');

const sequelize = new Sequelize(
  config.db.database,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    logging: msg => console.log(msg), // Basic logging
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      freezeTableName: true, // Prevent pluralization
      timestamps: true,
    }
  }
);

module.exports = sequelize;
