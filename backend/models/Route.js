const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Route = sequelize.define('Route', {
  busId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  busName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  direction: {
    type: DataTypes.STRING,
    allowNull: false
  },
  stops: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

module.exports = Route;
