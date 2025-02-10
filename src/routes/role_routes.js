const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role_controller');

router.get('/getRoles', roleController.getRoles)

module.exports = router;