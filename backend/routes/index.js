const express = require('express');
const router = express.Router();

router.use('/customers', require('./customers'));
router.use('/products', require('./products'));
router.use('/inventory', require('./inventory'));
router.use('/employees', require('./employees'));
router.use('/orders', require('./orders'));
router.use('/production', require('./production'));
router.use('/invoices', require('./invoices'));
router.use('/dashboard', require('./dashboard'));

module.exports = router;
