import { ShortUrl, ClickAnalytics } from '../models/index.js';
import { Op } from 'sequelize';

export const getUrlAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;

    // 1. Fetch the ShortUrl without userId check
    const shortUrl = await ShortUrl.findOne({
      where: { id }
    });

    if (!shortUrl) {
      return res.status(404).json({ message: 'Shortened URL not found.' });
    }

    // 2. Standard users can only view analytics for their own URLs
    if (role === 'user' && shortUrl.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only view analytics for your own URLs.' });
    }

    // 3. Fetch all analytics records for this URL
    const clicks = await ClickAnalytics.findAll({
      where: { shortUrlId: id },
      order: [['clickedAt', 'DESC']]
    });

    // Total clicks count
    const totalClicks = clicks.length;
    const lastVisited = clicks.length > 0 ? clicks[0].clickedAt : null;

    // 4. Admin role continues with full analytics compilation
    const recentHistory = clicks.slice(0, 20);

    // 4. Aggregations (Browser, OS, Device, Referrer)
    const browsers = {};
    const operatingSystems = {};
    const devices = {};
    const referrers = {};
    const dailyTrends = {};

    // Generate recent 7 days chart structure to ensure zero click days are displayed
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      dailyTrends[dateString] = 0;
    }

    clicks.forEach((click) => {
      // Browsers
      const br = click.browser || 'Unknown';
      browsers[br] = (browsers[br] || 0) + 1;

      // OS
      const system = click.os || 'Unknown';
      operatingSystems[system] = (operatingSystems[system] || 0) + 1;

      // Device
      const dev = click.device || 'Desktop';
      devices[dev] = (devices[dev] || 0) + 1;

      // Referrer
      const ref = click.referrer || 'Direct';
      referrers[ref] = (referrers[ref] || 0) + 1;

      // Daily trends (grouping by local date string YYYY-MM-DD)
      if (click.clickedAt) {
        const dateStr = new Date(click.clickedAt).toISOString().split('T')[0];
        // Only track daily trends if it falls into dailyTrends keys OR we can record it if it's within last 30 days
        if (dailyTrends[dateStr] !== undefined) {
          dailyTrends[dateStr]++;
        } else {
          // If click is older but we want it in trend, we can add it optionally.
          // Let's only track last 30 days. Let's check diff
          const diffDays = Math.ceil(Math.abs(today - new Date(click.clickedAt)) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) {
            dailyTrends[dateStr] = (dailyTrends[dateStr] || 0) + 1;
          }
        }
      }
    });

    // Format aggregations as arrays for frontend charts
    const formatData = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value }));

    const chartDailyTrends = Object.entries(dailyTrends)
      .map(([date, count]) => ({ date, clicks: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      urlDetails: {
        id: shortUrl.id,
        originalUrl: shortUrl.originalUrl,
        shortCode: shortUrl.shortCode,
        alias: shortUrl.alias,
        clicks: shortUrl.clicks,
        qrCodeDataUrl: shortUrl.qrCodeDataUrl,
        expiresAt: shortUrl.expiresAt,
        createdAt: shortUrl.createdAt,
      },
      analyticsSummary: {
        totalClicks,
        lastVisited,
        recentHistory,
        browsers: formatData(browsers),
        operatingSystems: formatData(operatingSystems),
        devices: formatData(devices),
        referrers: formatData(referrers),
        dailyTrends: chartDailyTrends
      }
    });
  } catch (error) {
    console.error('Error fetching url analytics:', error);
    return res.status(500).json({ message: error.message || 'Error fetching url analytics.' });
  }
};
