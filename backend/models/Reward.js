const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reward = sequelize.define('Reward', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cost: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('ticket_discount', 'wallet_recharge', 'merchant_voucher'),
    allowNull: false
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  partnerName: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  indexes: [
    { fields: ['category'] }
  ]
});

module.exports = Reward;
