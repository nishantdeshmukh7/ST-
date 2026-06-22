const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'conductor', 'passenger'),
    defaultValue: 'passenger'
  },
  stCoins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  walletBalance: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
});

module.exports = User;
