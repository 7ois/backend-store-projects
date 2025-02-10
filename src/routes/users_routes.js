const express = require('express');
const router = express.Router();
const userController = require('../controllers/users_controller');

router.get('/getUsers', userController.getUsers);
router.post('/register', userController.register);
router.post('/login', userController.login);
// router.get('/searchUsers', userController.searchUsers);

module.exports = router;