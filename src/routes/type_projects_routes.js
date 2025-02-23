const express = require("express");
const router = express.Router();
const typeProjectsController = require("../controllers/type_projects_controller");

router.get("/getAllTypeProjects", typeProjectsController.getAllTypeProjects);
router.post("/postTypeProjects", typeProjectsController.postTypeProjects);
router.put(
  "/updateTypeProjects/:id",
  typeProjectsController.updateTypeProjects,
);
router.delete(
  "/deleteTypeProject/:id",
  typeProjectsController.deleteTypeProject,
);

module.exports = router;
