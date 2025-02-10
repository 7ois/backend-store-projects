const express = require("express");
const router = express.Router();
const roleController = require("../controllers/role_controller");

router.get("/npm ", roleController.getRoles);
router.post("/postRole", roleController.postRole);

module.exports = router;
