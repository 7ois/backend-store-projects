const pool = require("../config/db_config");

const getAllTypeProjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          tp.*,
          COUNT(p.project_id) AS project_count
      FROM type_projects tp
      LEFT JOIN projects p ON tp.type_id = p.type_id AND p.deleted_at IS NULL
      WHERE tp.deleted_at IS NULL
      GROUP BY tp.type_id`,
    );

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
    const checkUserQuery =
      "SELECT EXISTS(SELECT 1 FROM users WHERE user_id = $1)";
    const userCheck = await pool.query(checkUserQuery, [user_id]);

    if (!userCheck.rows[0].exists) {
      return res.status(400).json({
        error: "Invalid user",
        message: "User does not exist",
      });
    }

    const checkTypeNameQuery =
      "SELECT * FROM type_projects WHERE type_name = $1 AND deleted_at IS NULL";
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

const deleteTypeProject = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the type project exists
    const result = await pool.query(
      "UPDATE type_projects SET deleted_at = $1 WHERE type_id = $2 AND deleted_at IS NULL RETURNING type_id, type_name, deleted_at",
      [new Date(), id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Type project not found or already deleted",
        message: `No active type project found with id ${id}`,
      });
    }

    res.status(200).json({
      message: "Type project soft-deleted successfully",
      deleted_type_project: result.rows[0],
    });
  } catch (err) {
    console.error("Error soft-deleting type_project:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Could not delete type project",
    });
  }
};

module.exports = {
  getAllTypeProjects,
  postTypeProjects,
  updateTypeProjects,
  deleteTypeProject,
};
