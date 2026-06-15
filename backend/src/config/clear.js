import { User, ShortUrl, ClickAnalytics, sequelize } from '../models/index.js';

async function clear() {
  try {
    console.log('Connecting to database...');
    await sequelize.sync();
    console.log('Clearing database tables...');
    
    // Clear in child-to-parent order to satisfy foreign key constraints
    await ClickAnalytics.destroy({ where: {} });
    await ShortUrl.destroy({ where: {} });
    await User.destroy({ where: {} });
    
    console.log('Database cleared successfully.');
  } catch (error) {
    console.error('Failed to clear database:', error);
  } finally {
    process.exit(0);
  }
}

clear();
