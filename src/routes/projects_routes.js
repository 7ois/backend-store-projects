const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projects_controller");
const upload = require("../middlewares/uploadMiddleware");

router.post(
  "/postProjects",
  upload.single("file"),
  projectController.postProject,
);
router.get("/getAllProjects", projectController.getAllProjects);
router.get("/getProject/:project_id", projectController.getProject);
router.get("/getMyProjects", projectController.getMyProjects);
router.put(
  "/updateProject/:project_id",
  upload.single("file"),
  projectController.updateProject,
);
router.delete("/deleteProject/:project_id", projectController.deleteProject);

module.exports = router;
