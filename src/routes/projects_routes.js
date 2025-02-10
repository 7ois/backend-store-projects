const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projects_controller');
const upload = require('../middlewares/uploadMiddleware');

router.post('/postProjects', upload.single("file"), projectController.postProject);
router.get('/getProjects', projectController.getProjects);
router.get('/getMyProjects', projectController.getMyProjects);

module.exports = router;