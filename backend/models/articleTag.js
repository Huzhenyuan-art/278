const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');

const ArticleTag = sequelize.define('articleTag', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  articleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'article',
      key: 'id',
    },
  },
  tagId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tag',
      key: 'id',
    },
  },
}, {
  tableName: 'articleTag',
  indexes: [
    {
      unique: true,
      fields: ['articleId', 'tagId'],
    },
  ],
});

module.exports = ArticleTag;
