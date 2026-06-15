import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ClickAnalytics = sequelize.define('ClickAnalytics', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  clickedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  browser: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Unknown',
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Unknown',
  },
  device: {
    type: DataTypes.STRING, // Mobile, Tablet, Desktop
    allowNull: true,
    defaultValue: 'Desktop',
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Unknown',
  },
  referrer: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Direct',
  },
}, {
  timestamps: false,
});

export default ClickAnalytics;
