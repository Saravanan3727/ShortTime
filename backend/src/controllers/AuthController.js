import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, ShortUrl } from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_url_shortener_jwt_token_2026';

export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email address already in use.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine role automatically by registration order
    const userCount = await User.count();
    let finalRole = 'user';
    if (userCount === 0) {
      finalRole = 'admin';
    } else if (userCount === 1) {
      finalRole = 'midleuser';
    }

    // Create user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: finalRole,
    });

    // Generate JWT
    const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: error.message || 'Something went wrong during registration.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: error.message || 'Something went wrong during login.' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Profile fetching error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch profile.' });
  }
};

export const listAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only administrators can view user details.' });
    }

    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'createdAt'],
      include: [{ model: ShortUrl, as: 'shortUrls', attributes: ['id'] }],
      order: [['createdAt', 'DESC']]
    });

    const formattedUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      linkCount: u.shortUrls ? u.shortUrls.length : 0
    }));

    return res.json(formattedUsers);
  } catch (error) {
    console.error('Error listing user details:', error);
    return res.status(500).json({ message: error.message || 'Error listing user details.' });
  }
};
