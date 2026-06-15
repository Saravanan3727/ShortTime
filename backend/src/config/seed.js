import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { User, ShortUrl, ClickAnalytics, sequelize } from '../models/index.js';

async function seed() {
  try {
    console.log('Syncing database for seeding...');
    await sequelize.sync();

    // Clean up database for fresh seed
    console.log('Cleaning up old records for a fresh seed...');
    await ClickAnalytics.destroy({ where: {} });
    await ShortUrl.destroy({ where: {} });
    await User.destroy({ where: {} });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 1. Create Users
    const admin = await User.create({
      username: 'admin_user',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    });

    const midleuser = await User.create({
      username: 'middle_user',
      email: 'middle@example.com',
      password: hashedPassword,
      role: 'midleuser'
    });

    const standard = await User.create({
      username: 'standard_user',
      email: 'user@example.com',
      password: hashedPassword,
      role: 'user'
    });

    const user = midleuser; // Alias for downstream URL assignments (assign to middle user)
    console.log('Users created successfully.');

    // Helper to generate QR
    const genQR = async (code) => {
      try {
        return await QRCode.toDataURL(`http://localhost:5001/${code}`, { width: 300 });
      } catch {
        return null;
      }
    };

    // 2. Create ShortUrls
    const hnUrl = await ShortUrl.create({
      originalUrl: 'https://news.ycombinator.com/',
      shortCode: 'hn-news',
      alias: 'hn-news',
      name: 'Hacker News',
      clicks: 14,
      qrCodeDataUrl: await genQR('hn-news'),
      expiresAt: null,
      userId: user.id
    });

    const ghUrl = await ShortUrl.create({
      originalUrl: 'https://github.com/trending',
      shortCode: 'gh-trends',
      alias: 'gh-trends',
      name: 'GitHub Trends',
      clicks: 28,
      qrCodeDataUrl: await genQR('gh-trends'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // Expires in 30 days
      userId: user.id
    });

    const expUrl = await ShortUrl.create({
      originalUrl: 'https://react.dev/',
      shortCode: 'react-docs',
      alias: 'react-docs',
      name: 'React Documentation',
      clicks: 2,
      qrCodeDataUrl: await genQR('react-docs'),
      expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // Expired yesterday
      userId: user.id
    });

    console.log('Short URLs created.');

    // 3. Create click history spread across the last 7 days
    const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
    const oss = ['Windows 11', 'macOS 14', 'Ubuntu Linux', 'iOS 17', 'Android 14'];
    const devices = ['Desktop', 'Mobile', 'Tablet'];
    const countries = ['United States', 'India', 'United Kingdom', 'Germany', 'Canada'];
    const referrers = ['t.co', 'reddit.com', 'news.ycombinator.com', 'google.com', 'Direct'];

    const createClicksFor = async (shortUrlId, count) => {
      const clicks = [];
      const now = new Date();
      
      for (let i = 0; i < count; i++) {
        // Distribute visits over the last 7 days
        const clickDate = new Date(now);
        clickDate.setDate(now.getDate() - Math.floor(Math.random() * 7));
        clickDate.setHours(Math.floor(Math.random() * 24));
        clickDate.setMinutes(Math.floor(Math.random() * 60));

        // Random selections
        const br = browsers[Math.floor(Math.random() * browsers.length)];
        const os = oss[Math.floor(Math.random() * oss.length)];
        const dev = os.includes('iOS') || os.includes('Android') ? 'Mobile' : (Math.random() > 0.85 ? 'Tablet' : 'Desktop');
        const country = countries[Math.floor(Math.random() * countries.length)];
        const ref = referrers[Math.floor(Math.random() * referrers.length)];
        const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;

        clicks.push({
          shortUrlId,
          clickedAt: clickDate,
          ipAddress: ip,
          browser: br,
          os: os,
          device: dev,
          country: country,
          referrer: ref
        });
      }

      await ClickAnalytics.bulkCreate(clicks);
    };

    await createClicksFor(hnUrl.id, 14);
    await createClicksFor(ghUrl.id, 28);
    await createClicksFor(expUrl.id, 2);

    console.log('Mock visit analytics records seeded successfully.');
    console.log('\nSeed Complete! You can now log in using:');
    console.log('1. Admin: admin@example.com / password123');
    console.log('2. Middle User: middle@example.com / password123');
    console.log('3. Standard User: user@example.com / password123');
    console.log('=============================================\n');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seed();
