const pool = require("../config/db_config");

const getAllTypeProjects = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM type_projects");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Database error",
    });
  }
};

const postTypeProjects = async (req, res) => {
  const { user_id, type_name } = req.body;

  try {
    const checkTypeNameQuery =
      "SELECT * FROM type_projects WHERE type_name = $1";
    const typeNameCheck = await pool.query(checkTypeNameQuery, [type_name]);

    if (typeNameCheck.rows.length > 0) {
      return res.status(401).json({
        error: "Duplicate typename",
        message: "TypeName already exists",
      });
    }

    const result = await pool.query(
      "INSERT INTO type_projects (user_id, type_name) VALUES ($1, $2) RETURNING type_id,type_name",
      [user_id, type_name],
    );
    res.status(200).json({
      message: "Type added successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error adding typeProjects:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Please try again later",
    });
  }
};

const updateTypeProjects = async (req, res) => {
  const { id } = req.params;
  const { type_name } = req.body;

  if (!type_name) {
    return res.status(400).json({
      error: "Missing required field: type_name",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE type_projects SET type_name = $1 , updated_at = $2 WHERE type_id = $3 RETURNING type_id, type_name`,
      [type_name, new Date(), id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Type project not found",
      });
    }

    res.status(200).json({
      message: "Type project updated successfully",
      update_type_project: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating type_project:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Could not update type project",
    });
  }
};

module.exports = { getAllTypeProjects, postTypeProjects, updateTypeProjects };
