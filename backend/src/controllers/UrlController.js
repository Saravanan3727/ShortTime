import crypto from 'crypto';
import QRCode from 'qrcode';
import { ShortUrl, ClickAnalytics, User } from '../models/index.js';
import { getIo } from '../config/socket.js';
import dotenv from 'dotenv';
import { Op } from 'sequelize';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Slugify utility
function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')          // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

// Fetch webpage title using native fetch
async function fetchUrlTitle(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const html = await response.text();
      // Look for <title> tag
      const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (match && match[1]) {
        // Decode simple HTML entities if any
        return match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      }
    }
  } catch (err) {
    console.error('Failed to fetch webpage title:', err.message);
  }
  
  // Fallback to domain name
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (_) {
    return 'Short Link';
  }
}

// Generate base64 QR code helper
async function generateQRCode(shortLink) {
  try {
    return await QRCode.toDataURL(shortLink, {
      color: {
        dark: '#1e293b', // Sleek dark slate
        light: '#ffffff',
      },
      width: 300,
      margin: 2
    });
  } catch (err) {
    console.error('QR Code generation error:', err);
    return null;
  }
}

export const createShortUrl = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ message: 'Access denied. Administrators cannot shorten URLs.' });
    }
    if (req.user.role !== 'midleuser' && req.user.role !== 'user') {
      return res.status(403).json({ message: 'Access denied. You do not have permission to shorten URLs.' });
    }
    const { originalUrl, customAlias, expiresAt, name } = req.body;
    const userId = req.user.id;

    if (!originalUrl) {
      return res.status(400).json({ message: 'Original URL is required.' });
    }

    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({ message: 'Invalid URL format. Please include http:// or https://' });
    }

    let shortCode = '';
    let alias = null;
    let finalName = name ? name.trim() : '';

    // If no custom alias and no name is provided, fetch the URL title
    if ((!customAlias || customAlias.trim() === '') && (!finalName || finalName.trim() === '')) {
      finalName = await fetchUrlTitle(originalUrl);
    }

    if (customAlias && customAlias.trim() !== '') {
      alias = customAlias.trim();
      
      // Validation for alias: alphanumeric and dashes only
      if (!/^[a-zA-Z0-9-_]+$/.test(alias)) {
        return res.status(400).json({ message: 'Custom alias can only contain alphanumeric characters, hyphens, and underscores.' });
      }

      // Check if alias is a reserved path
      const reserved = ['api', 's', 'login', 'register', 'dashboard', 'static', 'assets'];
      if (reserved.includes(alias.toLowerCase())) {
        return res.status(400).json({ message: 'This alias is reserved and cannot be used.' });
      }

      // Check if alias already exists
      const existingAlias = await ShortUrl.findOne({ where: { alias } });
      if (existingAlias) {
        return res.status(400).json({ message: 'Custom alias is already in use.' });
      }

      // Check if alias conflicts with an existing shortCode
      const conflictingShortCode = await ShortUrl.findOne({ where: { shortCode: alias } });
      if (conflictingShortCode) {
        return res.status(400).json({ message: 'Custom alias is already in use as a short code.' });
      }

      shortCode = alias;
    } else {
      // Generate shortcode based on slugified finalName
      let slug = slugify(finalName);
      if (!slug || slug.trim() === '') {
        slug = 'link';
      }
      slug = slug.substring(0, 30); // limit length

      let unique = false;
      let attempts = 0;
      while (!unique && attempts < 10) {
        let candidate = slug;
        if (attempts > 0) {
          const suffix = Math.random().toString(36).substring(2, 5); // 3 chars
          candidate = `${slug}-${suffix}`;
        }
        
        const checkCode = await ShortUrl.findOne({ where: { shortCode: candidate } });
        const checkAlias = await ShortUrl.findOne({ where: { alias: candidate } });
        
        if (!checkCode && !checkAlias) {
          shortCode = candidate;
          unique = true;
        }
        attempts++;
      }

      if (!unique) {
        return res.status(500).json({ message: 'Could not generate a unique short code. Please try again.' });
      }
    }

    // Process expiry date
    let expirationDate = null;
    if (expiresAt) {
      expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expiry date format.' });
      }
      if (expirationDate <= new Date()) {
        return res.status(400).json({ message: 'Expiry date must be in the future.' });
      }
    }

    // Create the final link format for QR code
    const shortLink = `${BASE_URL}/${shortCode}`;
    const qrCodeDataUrl = await generateQRCode(shortLink);

    // Save in DB
    const newShortUrl = await ShortUrl.create({
      originalUrl,
      shortCode,
      alias,
      name: finalName || null,
      qrCodeDataUrl,
      expiresAt: expirationDate,
      userId,
    });

    const populatedUrl = await ShortUrl.findOne({
      where: { id: newShortUrl.id },
      include: [{ model: User, as: 'user', attributes: ['username'] }]
    });

    try {
      const io = getIo();
      io.emit('url_created', populatedUrl);
    } catch (socketErr) {
      console.error('Socket emission error:', socketErr);
    }

    return res.status(201).json(populatedUrl);
  } catch (error) {
    console.error('Error creating short URL:', error);
    return res.status(500).json({ message: error.message || 'Error creating short URL.' });
  }
};

export const editDestinationUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { originalUrl, name } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ message: 'Original URL is required.' });
    }

    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({ message: 'Invalid URL format. Please include http:// or https://' });
    }

    const shortUrl = await ShortUrl.findOne({ where: { id } });
    if (!shortUrl) {
      return res.status(404).json({ message: 'Shortened URL not found.' });
    }

    // Admins and Middle Users can edit anything. Regular users can only edit their own URLs.
    if (req.user.role !== 'admin' && req.user.role !== 'midleuser' && shortUrl.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not have permission to edit this URL.' });
    }

    shortUrl.originalUrl = originalUrl;
    if (name !== undefined) {
      shortUrl.name = name ? name.trim() : null;
    }
    await shortUrl.save();

    return res.json({ message: 'Destination URL and name updated successfully.', shortUrl });
  } catch (error) {
    console.error('Error editing short URL:', error);
    return res.status(500).json({ message: error.message || 'Error updating destination URL.' });
  }
};

export const deleteShortUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const shortUrl = await ShortUrl.findOne({ where: { id } });
    if (!shortUrl) {
      return res.status(404).json({ message: 'Shortened URL not found.' });
    }

    // Admins and Middle Users can delete anything. Regular users can only delete their own URLs.
    if (req.user.role !== 'admin' && req.user.role !== 'midleuser' && shortUrl.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not have permission to delete this URL.' });
    }

    await shortUrl.destroy();

    try {
      const io = getIo();
      io.emit('url_deleted', id);
    } catch (socketErr) {
      console.error('Socket emission error:', socketErr);
    }

    return res.json({ message: 'Shortened URL deleted successfully.' });
  } catch (error) {
    console.error('Error deleting short URL:', error);
    return res.status(500).json({ message: error.message || 'Error deleting short URL.' });
  }
};

export const listUserUrls = async (req, res) => {
  try {
    let queryOptions = {
      include: [{ model: User, as: 'user', attributes: ['username', 'role'] }],
      order: [['createdAt', 'DESC']],
    };

    if (req.user.role === 'user') {
      // Regular users only see admin/midleuser links OR their own links
      const adminsAndMiddles = await User.findAll({ 
        where: { 
          role: { [Op.in]: ['admin', 'midleuser'] } 
        }, 
        attributes: ['id'] 
      });
      const allowedCreatorIds = adminsAndMiddles.map(u => u.id);
      queryOptions.where = {
        [Op.or]: [
          { userId: req.user.id },
          { userId: { [Op.in]: allowedCreatorIds } }
        ]
      };
    } else if (req.user.role === 'midleuser') {
      // Middle users only see links created by admin or middle users
      const adminsAndMiddles = await User.findAll({ 
        where: { 
          role: { [Op.in]: ['admin', 'midleuser'] } 
        }, 
        attributes: ['id'] 
      });
      const allowedCreatorIds = adminsAndMiddles.map(u => u.id);
      queryOptions.where = {
        userId: { [Op.in]: allowedCreatorIds }
      };
    }

    const urls = await ShortUrl.findAll(queryOptions);
    return res.json(urls);
  } catch (error) {
    console.error('Error listing user URLs:', error);
    return res.status(500).json({ message: error.message || 'Error listing URLs.' });
  }
};

export const bulkShortenUrls = async (req, res) => {
  try {
    if (req.user.role !== 'midleuser') {
      return res.status(403).json({ message: 'Access denied. Only Middle Users can bulk shorten URLs.' });
    }
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file.' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length <= 1) {
      return res.status(400).json({ message: 'CSV file is empty or missing data rows.' });
    }

    // Parse header and look for columns
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const urlIdx = headers.indexOf('url') !== -1 ? headers.indexOf('url') : headers.indexOf('originalurl');
    const aliasIdx = headers.indexOf('alias');
    const expiryIdx = headers.indexOf('expiresat') !== -1 ? headers.indexOf('expiresat') : headers.indexOf('expiry');
    const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('title');

    const createdUrls = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      // Split keeping commas inside quotes if any, simple regex splitter
      const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || !cols[0]) continue;

      let rawUrl = urlIdx !== -1 && cols[urlIdx] ? cols[urlIdx] : cols[0];
      let rawAlias = aliasIdx !== -1 && cols[aliasIdx] ? cols[aliasIdx] : (cols[1] || null);
      let rawExpiry = expiryIdx !== -1 && cols[expiryIdx] ? cols[expiryIdx] : (cols[2] || null);
      let rawName = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : null;

      if (!rawUrl) {
        errors.push({ row: i + 1, error: 'URL is missing.' });
        continue;
      }

      if (!isValidUrl(rawUrl)) {
        errors.push({ row: i + 1, url: rawUrl, error: 'Invalid URL format.' });
        continue;
      }

      let shortCode = '';
      let alias = null;
      let finalName = rawName ? rawName.trim() : '';
      if (!finalName) {
        try {
          finalName = new URL(rawUrl).hostname.replace('www.', '');
        } catch (_) {
          finalName = 'Short Link';
        }
      }

      // Handle custom alias for row
      if (rawAlias && rawAlias.trim() !== '') {
        alias = rawAlias.trim();
        if (!/^[a-zA-Z0-9-_]+$/.test(alias)) {
          errors.push({ row: i + 1, url: rawUrl, error: `Invalid alias format: "${alias}"` });
          continue;
        }

        const existingAlias = await ShortUrl.findOne({ where: { alias } });
        const existingCode = await ShortUrl.findOne({ where: { shortCode: alias } });
        if (existingAlias || existingCode) {
          errors.push({ row: i + 1, url: rawUrl, error: `Alias "${alias}" is already taken.` });
          continue;
        }
        shortCode = alias;
      } else {
        // Generate unique code based on name slug
        let slug = slugify(finalName);
        if (!slug || slug.trim() === '') {
          slug = 'link';
        }
        slug = slug.substring(0, 30);

        let unique = false;
        let attempts = 0;
        while (!unique && attempts < 10) {
          let candidate = slug;
          if (attempts > 0) {
            const suffix = Math.random().toString(36).substring(2, 5);
            candidate = `${slug}-${suffix}`;
          }
          
          const checkCode = await ShortUrl.findOne({ where: { shortCode: candidate } });
          const checkAlias = await ShortUrl.findOne({ where: { alias: candidate } });
          if (!checkCode && !checkAlias) {
            shortCode = candidate;
            unique = true;
          }
          attempts++;
        }
        if (!unique) {
          errors.push({ row: i + 1, url: rawUrl, error: 'Could not generate unique short code.' });
          continue;
        }
      }

      // Expiry handling
      let expirationDate = null;
      if (rawExpiry && rawExpiry.trim() !== '') {
        expirationDate = new Date(rawExpiry.trim());
        if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
          expirationDate = null; // Ignore invalid / past date or set null
        }
      }

      const shortLink = `${BASE_URL}/${shortCode}`;
      const qrCodeDataUrl = await generateQRCode(shortLink);

      try {
        const newUrl = await ShortUrl.create({
          originalUrl: rawUrl,
          shortCode,
          alias,
          name: finalName || null,
          qrCodeDataUrl,
          expiresAt: expirationDate,
          userId,
        });

        const populatedUrl = await ShortUrl.findOne({
          where: { id: newUrl.id },
          include: [{ model: User, as: 'user', attributes: ['username'] }]
        });

        try {
          const io = getIo();
          io.emit('url_created', populatedUrl);
        } catch (_) {}

        createdUrls.push(populatedUrl);
      } catch (dbErr) {
        errors.push({ row: i + 1, url: rawUrl, error: dbErr.message });
      }
    }

    return res.json({
      message: `Successfully processed CSV. Shortened ${createdUrls.length} links.`,
      successCount: createdUrls.length,
      errorCount: errors.length,
      createdUrls,
      errors
    });
  } catch (error) {
    console.error('CSV processing error:', error);
    return res.status(500).json({ message: error.message || 'Error processing CSV file.' });
  }
};

export const listAllClicks = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only administrators can view all click records.' });
    }

    const clicks = await ClickAnalytics.findAll({
      include: [
        {
          model: ShortUrl,
          as: 'shortUrl',
          attributes: ['shortCode', 'originalUrl'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['username', 'email']
            }
          ]
        }
      ],
      order: [['clickedAt', 'DESC']]
    });

    return res.json(clicks);
  } catch (error) {
    console.error('Error fetching all clicks:', error);
    return res.status(500).json({ message: error.message || 'Error fetching all click records.' });
  }
};
