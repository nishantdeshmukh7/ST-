const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pass = sequelize.define('Pass', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  passId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  passengerUid: {
    type: DataTypes.STRING,
    allowNull: false
  },
  busId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  busName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('weekly', 'monthly'),
    allowNull: false
  },
  startDate: {
    type: DataTypes.STRING,
    allowNull: false
  },
  endDate: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    defaultValue: 'wallet'
  },
  qrToken: {
    type: DataTypes.TEXT
  }
}, {
  indexes: [
    { fields: ['passengerUid'] },
    { fields: ['passId'] }
  ]
});

module.exports = Pass;
