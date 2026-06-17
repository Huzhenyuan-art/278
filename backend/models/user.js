const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');

const User = sequelize.define('user', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user', // 'admin' or 'user'
  }
}, {
  tableName: 'user', // Explicit singular table name
});

module.exports = User;
