const express = require('express');
const router = express.Router();
const typeProjectsController = require('../controllers/type_projects_controller');

router.get('/getTypeProjects', typeProjectsController.getTypeProjects);
router.post('/postTypeProjects', typeProjectsController.postTypeProjects);
router.put('/updateTypeProjects/:id', typeProjectsController.updateTypeProjects);

module.exports = router;