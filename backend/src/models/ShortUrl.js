import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ShortUrl = sequelize.define('ShortUrl', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  originalUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isUrl: { msg: 'Must be a valid URL (include http:// or https://)' },
      notEmpty: { msg: 'Original URL cannot be empty' },
    },
  },
  shortCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  alias: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  qrCodeDataUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['shortCode']
    },
    {
      unique: true,
      fields: ['alias']
    }
  ]
});

export default ShortUrl;
