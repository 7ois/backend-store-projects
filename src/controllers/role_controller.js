const pool = require("../config/db_config");

const getRoles = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM roles");
    res.status(200).json({
      seccess: true,
      data: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Database error",
    });
  }
};

const postRole = async (req, res) => {
  const { role_name } = req.body;

  if (!role_name) {
    return res.status(400).json({
      success: false,
      message: "Role name is required",
    });
  }

  try {
    const result = await pool.query(
      "INSERT INTO roles (role_name) VALUES ($1) RETURNING *",
      [role_name],
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

module.exports = { getRoles, postRole };
