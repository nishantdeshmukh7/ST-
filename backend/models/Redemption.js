const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Redemption = sequelize.define('Redemption', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  passengerUid: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rewardId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('active', 'used'),
    defaultValue: 'active',
    allowNull: false
  },
  redeemedAt: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  indexes: [
    { fields: ['passengerUid'] },
    { fields: ['code'] }
  ]
});

module.exports = Redemption;
