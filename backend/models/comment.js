const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');

const Comment = sequelize.define('comment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
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
  tableName: 'comment', // Explicit singular table name
});

module.exports = Comment;
