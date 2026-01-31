import { Router } from 'express';
import dashboardRoutes from './dashboard.routes';
import usersRoutes from './users.routes';
import productsRoutes from './products.routes';
import ordersRoutes from './orders.routes';
import categoriesRoutes from './categories.routes';

const router = Router();

router.use('/dashboard', dashboardRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/categories', categoriesRoutes);

export default router;
