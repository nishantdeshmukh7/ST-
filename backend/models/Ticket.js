const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticketId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  busId: { type: DataTypes.STRING, allowNull: false },
  busName: { type: DataTypes.STRING, allowNull: false },
  direction: { type: DataTypes.STRING, allowNull: false },
  fromStation: { type: DataTypes.STRING, allowNull: false },
  toStation: { type: DataTypes.STRING, allowNull: false },
  distance: { type: DataTypes.FLOAT, allowNull: false },
  passengerCount: { type: DataTypes.INTEGER, defaultValue: 1 },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  paymentVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  paymentId: { type: DataTypes.STRING },
  orderId: { type: DataTypes.STRING },
  paymentMethod: { type: DataTypes.STRING },
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verifiedTime: { type: DataTypes.STRING },
  bookingTime: { type: DataTypes.STRING },
  passengerUid: { type: DataTypes.STRING },
  coinsEarned: { type: DataTypes.INTEGER, defaultValue: 0 },
  coinsAwarded: { type: DataTypes.BOOLEAN, defaultValue: false },
  couponCode: { type: DataTypes.STRING },
  signature: { type: DataTypes.STRING },
  qrToken: { type: DataTypes.TEXT }
}, {
  indexes: [
    { fields: ['passengerUid'] },
    { fields: ['ticketId'] }
  ]
});

module.exports = Ticket;
