import sequelize from '../config/db.js';
import User from './User.js';
import ShortUrl from './ShortUrl.js';
import ClickAnalytics from './ClickAnalytics.js';

// Setup relationships
User.hasMany(ShortUrl, {
  foreignKey: 'userId',
  as: 'shortUrls',
  onDelete: 'CASCADE',
});

ShortUrl.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

ShortUrl.hasMany(ClickAnalytics, {
  foreignKey: 'shortUrlId',
  as: 'analytics',
  onDelete: 'CASCADE',
});

ClickAnalytics.belongsTo(ShortUrl, {
  foreignKey: 'shortUrlId',
  as: 'shortUrl',
});

export {
  sequelize,
  User,
  ShortUrl,
  ClickAnalytics
};
