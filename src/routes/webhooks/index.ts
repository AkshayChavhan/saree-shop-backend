import { Router } from 'express';
import clerkRoutes from './clerk.routes';
import stripeRoutes from './stripe.routes';
import razorpayRoutes from './razorpay.routes';

const router = Router();

router.use('/clerk', clerkRoutes);
router.use('/stripe', stripeRoutes);
router.use('/razorpay', razorpayRoutes);

export default router;
