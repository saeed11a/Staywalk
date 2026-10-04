const express = require('express');
const router = express.Router();

router.get('/me', (req, res) => res.json(req.user));
router.use('/settings', require('./settings'));
router.use('/articles', require('./articles'));
const rawstock = require('./rawstock');
router.use('/raw-categories', rawstock.categories);
router.use('/raw-stock', rawstock.stock);
router.use('/ready-shoes', require('./readyshoes'));
router.use('/production', require('./production'));
router.use('/purchases', require('./purchases'));
router.use('/customers', require('./parties'));
router.use('/suppliers', require('./parties'));
router.use('/invoices', require('./invoices'));
router.use('/payments', require('./cashbook'));
router.use('/roznamcha', require('./cashbook'));
router.use('/kharcha', require('./cashbook'));
router.use('/dashboard', require('./dashboard'));
router.use('/reports', require('./reports'));
router.use('/recycle-bin', require('./recyclebin'));

module.exports = router;
