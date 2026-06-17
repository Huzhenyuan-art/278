const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');

const Tag = sequelize.define('tag', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#3b82f6',
  },
}, {
  tableName: 'tag',
});

module.exports = Tag;
