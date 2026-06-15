import { User, ShortUrl, ClickAnalytics, sequelize } from '../models/index.js';

async function clear() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    
    console.log('Deleting all click analytics records...');
    await ClickAnalytics.destroy({ where: {} });
    
    console.log('Deleting all shortened URL records...');
    await ShortUrl.destroy({ where: {} });
    
    console.log('Deleting all user records...');
    await User.destroy({ where: {} });
    
    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Failed to clear database:', error);
  } finally {
    process.exit(0);
  }
}

clear();
