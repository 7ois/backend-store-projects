const express = require("express");
const router = express.Router();
const userController = require("../controllers/users_controller");

router.get("/getAllUsers", userController.getAllUsers);
router.post("/register", userController.register);
router.post("/login", userController.login);
router.put("/updateUser/:user_id", userController.updateUser);
router.delete("/deleteUser/:user_id", userController.deleteUser);
router.patch("/rollback/:user_id", userController.rollbackUser);

module.exports = router;
