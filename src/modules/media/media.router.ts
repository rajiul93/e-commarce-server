import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { mediaController } from './media.controller';
import { uploadMiddleware } from './multer.config';
import { uploadImageSchema } from './media.validation';

const router = Router();

router.post(
  '/',
  auth,
  uploadMiddleware,
  validateRequest(uploadImageSchema),
  mediaController.upload,
);

router.get('/all', auth, mediaController.getAllImages);

router.get('/:id', auth, mediaController.getImageById);

router.patch(
  '/:id',
  auth,
  uploadMiddleware,
  validateRequest(uploadImageSchema),
  mediaController.update,
);

router.delete('/:id', auth, mediaController.remove);

export const MediaRoutes = router;
