require("dotenv").config();

const pool = require("../config/db_config");
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY;

const postProject = async (req, res) => {
  const { type_id, project_name, description, keywords, date, role_group } =
    req.body;

  // ตรวจสอบว่ามีไฟล์ที่อัพโหลดมาหรือไม่
  if (!req.file) {
    return res.status(400).json({
      error: "No file uploaded",
    });
  }

  let parsedRoleGroup = role_group;
  if (typeof role_group === "string") {
    try {
      parsedRoleGroup = JSON.parse(role_group); // แปลงจาก string เป็น array
    } catch (error) {
      return res.status(400).json({
        error: "role_group is not a valid JSON string",
      });
    }
  }

  // ตรวจสอบว่า role_group มีข้อมูลหรือไม่
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
    const values = [
      type_id,
      project_name,
      description || null,
      keywords || null,
      date,
      fileName,
      filePath,
    ];

    // เพิ่มโปรเจกต์ใหม่ลงในตาราง projects และรับ project_id
    const result = await pool.query(
      `INSERT INTO projects (type_id, project_name, description, keywords, date, file_name, file_path) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING project_id`,
      values,
    );
    const projectId = result.rows[0].project_id;

    // ใช้ Promise.all สำหรับการเพิ่มข้อมูลใน userprojectmapping
    const userMappingPromises = parsedRoleGroup.map((user) =>
      pool.query(
        `INSERT INTO user_project_mapping (user_id, project_id, role_group) VALUES ($1, $2, $3) RETURNING *`,
        [user.user_id, projectId, user.role_group],
      ),
    );

    // รอให้ทุกคำสั่งเสร็จสมบูรณ์
    await Promise.all(userMappingPromises);

    // ส่งข้อมูลกลับไปที่ client
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
  try {
    const result = await pool.query("SELECT * FROM projects");
    res.status(200).json({
      success: true,
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

const getProject = async (req, res) => {
  const { project_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT p.*,u.user_id,u.first_name,u.last_name,u.email,up.role_group 
      From projects p 
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

    const project = {
      project_id: projectData.project_id,
      type_id: projectData.type_id,
      project_name: projectData.project_name,
      description: projectData.description,
      keywords: projectData.keywords,
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
  // ดึง token จาก Authorization header
  const token = req.headers.authorization?.split(" ")[1]; // คาดว่าเป็นรูปแบบ Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  try {
    // ตรวจสอบและ decode token
    const decoded = jwt.verify(token, SECRET_KEY);
    const user_id = decoded.user_id; // ดึง user_id จาก token

    const result = await pool.query(
      `
            SELECT p.* 
            FROM projects p
            JOIN user_project_mapping upm ON p.project_id = upm.project_id
            WHERE upm.user_id = $1
        `,
      [user_id],
    );

    // ส่งข้อมูลโปรเจกต์ทั้งหมดที่เกี่ยวข้องกับ user_id
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    // ถ้ามีข้อผิดพลาดในการดึงข้อมูลหรือในการตรวจสอบ token
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Database error or token verification failed",
    });
  }
};

module.exports = { postProject, getAllProjects, getProject, getMyProjects };
