import useragent from 'useragent';
import { ShortUrl, ClickAnalytics, User } from '../models/index.js';
import { getIo } from '../config/socket.js';

export const handleRedirect = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Search by shortCode or custom alias
    const shortUrl = await ShortUrl.findOne({
      where: {
        shortCode
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username']
        }
      ]
    });

    if (!shortUrl) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Not Found</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; text-align: center; padding: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; }
            h1 { font-size: 3rem; color: #f43f5e; margin-bottom: 1rem; }
            p { font-size: 1.25rem; color: #94a3b8; max-width: 500px; margin-bottom: 2rem; }
            a { background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; transition: background-color 0.2s; }
            a:hover { background-color: #2563eb; }
          </style>
        </head>
        <body>
          <h1>404</h1>
          <h2>Link Not Found</h2>
          <p>The shortened link you are trying to access does not exist or has been deleted.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Go to Dashboard</a>
        </body>
        </html>
      `);
    }

    // Check if url is expired
    if (shortUrl.expiresAt && new Date(shortUrl.expiresAt) <= new Date()) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Expired</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; text-align: center; padding: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; }
            h1 { font-size: 3rem; color: #e11d48; margin-bottom: 1rem; }
            p { font-size: 1.25rem; color: #94a3b8; max-width: 500px; margin-bottom: 2rem; }
            a { background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; transition: background-color 0.2s; }
            a:hover { background-color: #2563eb; }
          </style>
        </head>
        <body>
          <h1>410</h1>
          <h2>Link Expired</h2>
          <p>This shortened link has expired and is no longer active.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Go to Dashboard</a>
        </body>
        </html>
      `);
    }

    // Parse user agent
    const uaString = req.headers['user-agent'] || '';
    const agent = useragent.parse(uaString);
    const browser = agent.family === 'Other' ? 'Unknown Browser' : `${agent.family} ${agent.major}`;
    const os = agent.os.family === 'Other' ? 'Unknown OS' : `${agent.os.family} ${agent.os.major}`;

    // Basic device detection
    let device = 'Desktop';
    const lowercaseUa = uaString.toLowerCase();
    if (lowercaseUa.includes('mobile') || lowercaseUa.includes('android') || lowercaseUa.includes('iphone')) {
      device = 'Mobile';
    } else if (lowercaseUa.includes('tablet') || lowercaseUa.includes('ipad') || lowercaseUa.includes('playbook')) {
      device = 'Tablet';
    }

    // Referrer parsing
    const referrerHeader = req.headers['referer'] || req.headers['referrer'] || 'Direct';
    let referrer = 'Direct';
    if (referrerHeader !== 'Direct') {
      try {
        const refUrl = new URL(referrerHeader);
        referrer = refUrl.hostname;
      } catch (_) {
        referrer = referrerHeader;
      }
    }

    // Get IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Mock country for local IP or general dev environment
    let country = 'Localhost';
    if (ipAddress !== '127.0.0.1' && ipAddress !== '::1' && ipAddress !== '::ffff:127.0.0.1') {
      // Typically we could usegeoip-lite, but for simplicity, we mock country mapping
      // or just label it as "Unknown" / "Remote Visitor"
      country = 'Remote Visitor';
    }

    // Log Click Analytics
    await ClickAnalytics.create({
      shortUrlId: shortUrl.id,
      ipAddress: ipAddress.toString(),
      browser,
      os,
      device,
      country,
      referrer,
    });

    // Increment click count on the ShortUrl
    shortUrl.clicks = (shortUrl.clicks || 0) + 1;
    await shortUrl.save();

    // Broadcast the click event to all clients in real-time
    try {
      const io = getIo();
      io.emit('url_clicked', {
        urlId: shortUrl.id,
        clicksCount: shortUrl.clicks,
        newClick: {
          id: shortUrl.id,
          shortUrlId: shortUrl.id,
          clickedAt: new Date(),
          ipAddress: ipAddress.toString(),
          browser,
          os,
          device,
          country,
          referrer,
          shortUrl: {
            shortCode: shortUrl.shortCode,
            originalUrl: shortUrl.originalUrl,
            user: {
              username: shortUrl.user?.username || 'System'
            }
          }
        }
      });
    } catch (socketErr) {
      console.error('Socket emission error:', socketErr);
    }

    // Redirect to original destination
    return res.redirect(302, shortUrl.originalUrl);
  } catch (error) {
    console.error('Redirect error:', error);
    return res.status(500).send('Server error during redirect redirection.');
  }
};
