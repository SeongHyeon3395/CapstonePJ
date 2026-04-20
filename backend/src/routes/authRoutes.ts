import { Router } from 'express';
import { loginController, signupController, updateProfileController } from '../controllers/authController';

export const authRoutes = Router();

authRoutes.post('/signup', signupController);
authRoutes.post('/login', loginController);
authRoutes.put('/profile', updateProfileController);
