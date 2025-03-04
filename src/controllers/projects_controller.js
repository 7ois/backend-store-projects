require("dotenv").config();

const pool = require("../config/db_config");
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY;

const postProject = async (req, res) => {
  const {
    type_id,
    project_name_th,
    project_name_en,
    abstract_th,
    abstract_en,
    keywords,
    date,
    role_group,
  } = req.body;

  if (!req.file) {
    return res.status(400).json({
      error: "No file uploaded",
    });
  }

  let parsedRoleGroup = role_group;
  if (typeof role_group === "string") {
    try {
      parsedRoleGroup = JSON.parse(role_group);
    } catch (error) {
      return res.status(400).json({
        error: "role_group is not a valid JSON string",
      });
    }
  }

  if (
    !parsedRoleGroup ||
    !Array.isArray(parsedRoleGroup) ||
    parsedRoleGroup.length === 0
  ) {
    return res.status(400).json({
      error: "No users provided in role_group",
    });
  }

  for (const user of parsedRoleGroup) {
    if (!user.user_id || !user.role_group) {
      return res.status(400).json({
        error: "Each user in role_group must have user_id and role_group",
      });
    }
  }

  try {
    const filePath = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;

    const formattedDate = date ? new Date(date) : null;

    const values = [
      type_id,
      project_name_th,
      project_name_en,
      abstract_th || null,
      abstract_en || null,
      keywords || null,
      formattedDate,
      fileName,
      filePath,
    ];

    const result = await pool.query(
      `INSERT INTO projects (type_id, project_name_th, project_name_en, abstract_th, abstract_en, keywords, date, file_name, file_path) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING project_id`,
      values,
    );

    const projectId = result.rows[0].project_id;

    const userMappingPromises = parsedRoleGroup.map((user) =>
      pool.query(
        `INSERT INTO user_project_mapping (user_id, project_id, role_group) VALUES ($1, $2, $3) RETURNING *`,
        [user.user_id, projectId, user.role_group],
      ),
    );

    await Promise.all(userMappingPromises);

    res.status(200).json({
      message: "Project added successfully",
      project_id: projectId,
    });
  } catch (err) {
    console.error("Error adding project:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Please try again later",
    });
  }
};

const getAllProjects = async (req, res) => {
  const { type_id, search, year, limit = 10, offset = 0 } = req.query;

  try {
    let query = "SELECT * FROM projects";
    let countQuery = "SELECT COUNT(*) FROM projects";
    let values = [];
    let conditions = [];
    let paramIndex = 1;

    const baseCondition = " WHERE deleted_at IS NULL";

    query += baseCondition;
    countQuery += baseCondition;

    if (type_id) {
      conditions.push(`type_id = $${paramIndex}`);
      values.push(parseInt(type_id, 10));
      paramIndex++;
    }

    if (search) {
      conditions.push(
        `(project_name_th ILIKE $${paramIndex} OR project_name_en ILIKE $${paramIndex} OR EXISTS (` +
          `SELECT 1 FROM jsonb_array_elements_text(keywords) AS keyword ` +
          `WHERE keyword ILIKE $${paramIndex}))`,
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (year) {
      const christianYear = parseInt(year, 10) - 543;
      conditions.push(`EXTRACT(YEAR FROM date) = $${paramIndex}`);
      values.push(christianYear);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += " AND " + conditions.join(" AND ");
      countQuery += " AND " + conditions.join(" AND ");
    }

    query += ` LIMIT $${paramIndex}`;
    values.push(parseInt(limit, 10));
    paramIndex++;

    query += ` OFFSET $${paramIndex}`;
    values.push(parseInt(offset, 10));
    paramIndex++;

    const dataPromise = pool.query(query, values);
    const countPromise = pool.query(countQuery, values.slice(0, -2));

    const [dataResult, countResult] = await Promise.all([
      dataPromise,
      countPromise,
    ]);

    const totalCount = countResult.rows[0].count;

    res.status(200).json({
      success: true,
      data: dataResult.rows,
      totalCount: totalCount,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Database error",
    });
  }
};

const getProject = async (req, res) => {
  const { project_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT p.*, tp.type_name, u.user_id, u.first_name, u.last_name, u.email, up.role_group 
      FROM projects p
      JOIN type_projects tp ON p.type_id = tp.type_id
      JOIN user_project_mapping up ON p.project_id = up.project_id
      JOIN users u ON up.user_id = u.user_id
      WHERE p.project_id = $1 AND p.deleted_at IS NULL`,
      [project_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    const projectData = result.rows[0];
    const users = result.rows.map((row) => ({
      user_id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      role_group: row.role_group,
    }));

    let keywords = [];
    if (projectData.keywords) {
      try {
        keywords =
          typeof projectData.keywords === "string"
            ? JSON.parse(projectData.keywords)
            : projectData.keywords;
      } catch (err) {
        console.error("Error parsing keywords:", err);
      }
    }

    const project = {
      project_id: projectData.project_id,
      type_id: projectData.type_id,
      type_name: projectData.type_name,
      project_name_th: projectData.project_name_th,
      project_name_en: projectData.project_name_en,
      abstract_th: projectData.abstract_th,
      abstract_en: projectData.abstract_en,
      keywords: keywords || [],
      date: projectData.date,
      file_name: projectData.file_name,
      file_path: projectData.file_path,
      created_at: projectData.created_at,
      updated_at: projectData.updated_at,
      deleted_at: projectData.deleted_at,
      users: users,
    };

    res.status(200).json({
      message: "Project retrieved successfully",
      project,
    });
  } catch (err) {
    console.error("Error fetching project:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Could not retrieve project",
    });
  }
};

const getMyProjects = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user_id = decoded.user_id;
    const { search, year, limit = 10, offset = 0 } = req.query;

    let query = `
      SELECT 
        p.*, 
        CASE 
          WHEN tp.deleted_at IS NOT NULL THEN NULL
          ELSE p.type_id 
        END AS type_id
      FROM projects p
      LEFT JOIN user_project_mapping upm ON p.project_id = upm.project_id
      LEFT JOIN type_projects tp ON p.type_id = tp.type_id
      WHERE upm.user_id = $1 AND p.deleted_at IS NULL
    `;

    let countQuery = `
      SELECT COUNT(*) 
      FROM projects p
      LEFT JOIN user_project_mapping upm ON p.project_id = upm.project_id
      LEFT JOIN type_projects tp ON p.type_id = tp.type_id
      WHERE upm.user_id = $1 AND p.deleted_at IS NULL
    `;

    let values = [user_id];
    let paramIndex = 2;

    if (search) {
      query += `
        AND (p.project_name_th ILIKE $${paramIndex} 
        OR p.project_name_en ILIKE $${paramIndex} 
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(p.keywords) AS keyword 
          WHERE keyword ILIKE $${paramIndex}
        ))
      `;
      countQuery += `
        AND (p.project_name_th ILIKE $${paramIndex} 
        OR p.project_name_en ILIKE $${paramIndex} 
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(p.keywords) AS keyword 
          WHERE keyword ILIKE $${paramIndex}
        ))
      `;
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (year) {
      const christianYear = parseInt(year, 10) - 543;
      query += `
        AND EXTRACT(YEAR FROM p.date) = $${paramIndex}
      `;
      countQuery += `
        AND EXTRACT(YEAR FROM p.date) = $${paramIndex}
      `;
      values.push(christianYear);
      paramIndex++;
    }

    query += ` LIMIT $${paramIndex}`;
    values.push(parseInt(limit, 10));
    paramIndex++;

    query += ` OFFSET $${paramIndex}`;
    values.push(parseInt(offset, 10));

    const dataPromise = pool.query(query, values);
    const countPromise = pool.query(countQuery, values.slice(0, -2));

    const [dataResult, countResult] = await Promise.all([
      dataPromise,
      countPromise,
    ]);

    const totalCount = countResult.rows[0].count;

    res.status(200).json({
      success: true,
      data: dataResult.rows,
      totalCount: totalCount,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Database error or token verification failed",
    });
  }
};

const updateProject = async (req, res) => {
  const { project_id } = req.params;
  const {
    type_id,
    project_name_th,
    project_name_en,
    abstract_th,
    abstract_en,
    keywords,
    date,
    role_group,
  } = req.body;

  try {
    const checkProject = await pool.query(
      "SELECT * FROM projects WHERE project_id = $1",
      [project_id],
    );

    if (checkProject.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    let parsedRoleGroup = role_group;
    if (typeof role_group === "string") {
      try {
        parsedRoleGroup = JSON.parse(role_group);
      } catch (error) {
        return res.status(400).json({
          error: "role_group is not a valid JSON string",
        });
      }
    }

    if (!parsedRoleGroup || !Array.isArray(parsedRoleGroup)) {
      return res.status(400).json({
        error: "Invalid role_group format",
      });
    }

    for (const user of parsedRoleGroup) {
      if (!user.user_id || !user.role_group) {
        return res.status(400).json({
          error: "Each user in role_group must have user_id and role_group",
        });
      }
    }

    let filePath = checkProject.rows[0].file_path;
    let fileName = checkProject.rows[0].file_name;

    if (req.file) {
      filePath = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    const values = [
      type_id,
      project_name_th,
      project_name_en,
      abstract_th || null,
      abstract_en || null,
      keywords || null,
      date,
      fileName,
      filePath,
      project_id,
    ];

    await pool.query(
      `UPDATE projects 
       SET type_id = $1, 
           project_name_th = $2,
           project_name_en = $3,
           abstract_th = $4,
           abstract_en = $5,
           keywords = $6,
           date = $7,
           file_name = $8,
           file_path = $9,
           updated_at = NOW()
       WHERE project_id = $10`,
      values,
    );

    await pool.query("DELETE FROM user_project_mapping WHERE project_id = $1", [
      project_id,
    ]);

    const userMappingPromises = parsedRoleGroup.map((user) =>
      pool.query(
        `INSERT INTO user_project_mapping (user_id, project_id, role_group) VALUES ($1, $2, $3) RETURNING *`,
        [user.user_id, project_id, user.role_group],
      ),
    );

    await Promise.all(userMappingPromises);

    res.status(200).json({
      message: "Project updated successfully",
      project_id,
    });
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Please try again later",
    });
  }
};

const deleteProject = async (req, res) => {
  const { project_id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE projects SET deleted_at = NOW() WHERE project_id = $1 RETURNING *`,
      [project_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Please try again later",
    });
  }
};

module.exports = {
  postProject,
  getAllProjects,
  getProject,
  getMyProjects,
  updateProject,
  deleteProject,
};
