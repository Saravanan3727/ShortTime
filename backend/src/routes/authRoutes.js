import express from 'express';
import { register, login, getProfile, listAllUsers } from '../controllers/AuthController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getProfile);
router.get('/users', authenticateToken, listAllUsers);

export default router;
