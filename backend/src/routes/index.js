import { Router } from 'express';
import authRouter from './auth.js';
import superAdminRouter from './superAdmin.js';
import hospitalRouter from './hospital.js';
import doctorRouter from './doctor.js';
import publicRouter from './public.js';
import displayRouter from './display.js'; // This line should already exist, ensure it's correct

const router = Router();

router.use('/auth', authRouter);
router.use('/super-admin', superAdminRouter);
router.use('/hospital', hospitalRouter);
router.use('/doctor', doctorRouter);
router.use('/public', publicRouter);
router.use('/display', displayRouter); // This line should already exist, ensure it's correct

export default router;