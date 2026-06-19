const { Sequelize } = require('sequelize');
const config = require('../config/default');

let sequelize;

if (process.env.NODE_ENV === 'test') {
  const testConfig = require('../config/test');
  sequelize = new Sequelize({
    dialect: testConfig.db.dialect,
    storage: testConfig.db.storage,
    logging: testConfig.db.logging || false,
    define: {
      freezeTableName: true,
      timestamps: true,
    }
  });
} else {
  sequelize = new Sequelize(
    config.db.database,
    config.db.user,
    config.db.password,
    {
      host: config.db.host,
      port: config.db.port,
      dialect: 'mysql',
      logging: msg => console.log(msg),
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        freezeTableName: true,
        timestamps: true,
      }
    }
  );
}

module.exports = sequelize;
