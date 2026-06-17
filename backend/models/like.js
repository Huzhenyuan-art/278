const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');

const Like = sequelize.define('like', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user',
      key: 'id',
    }
  },
  articleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'article',
      key: 'id',
    }
  }
}, {
  tableName: 'like',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'articleId']
    }
  ]
});

module.exports = Like;
