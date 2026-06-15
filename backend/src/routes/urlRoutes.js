import express from 'express';
import multer from 'multer';
import { 
  createShortUrl, 
  listUserUrls, 
  editDestinationUrl, 
  deleteShortUrl, 
  bulkShortenUrls,
  listAllClicks
} from '../controllers/UrlController.js';
import { getUrlAnalytics } from '../controllers/AnalyticsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.use(authenticateToken);

router.post('/', createShortUrl);
router.get('/', listUserUrls);
router.get('/all-clicks', listAllClicks);
router.put('/:id', editDestinationUrl);
router.delete('/:id', deleteShortUrl);
router.get('/:id/analytics', getUrlAnalytics);
router.post('/bulk', upload.single('file'), bulkShortenUrls);

export default router;
