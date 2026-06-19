const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');

const Notification = sequelize.define('notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  recipientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user',
      key: 'id',
    },
  },
  triggerUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user',
      key: 'id',
    },
  },
  articleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'article',
      key: 'id',
    },
  },
  articleTitle: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  commentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'comment',
      key: 'id',
    },
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'notification',
  indexes: [
    { fields: ['recipientId', 'isRead'] },
    { fields: ['recipientId'] },
  ],
});

module.exports = Notification;
