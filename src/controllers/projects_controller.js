const pool = require('../config/db_config');
const jwt = require('jsonwebtoken');

const postProject = async (req, res) => {
    const {
        type_id,
        project_name,
        description,
        keywords,
        date,
        role_group
    } = req.body;

    // ตรวจสอบข้อมูลที่รับเข้ามา
    console.log("Received request body:", req.body);
    console.log("Received role_group:", role_group);

    // ตรวจสอบว่ามีไฟล์ที่อัพโหลดมาหรือไม่
    if (!req.file) {
        return res.status(400).json({
            error: "No file uploaded"
        });
    }

    // ตรวจสอบว่า role_group เป็น string แล้วแปลงเป็น array ถ้าจำเป็น
    let parsedRoleGroup = role_group;
    if (typeof role_group === 'string') {
        try {
            parsedRoleGroup = JSON.parse(role_group); // แปลงจาก string เป็น array
        } catch (error) {
            return res.status(400).json({
                error: "role_group is not a valid JSON string"
            });
        }
    }

    // ตรวจสอบว่า role_group มีข้อมูลหรือไม่
    if (!parsedRoleGroup || !Array.isArray(parsedRoleGroup) || parsedRoleGroup.length === 0) {
        return res.status(400).json({
            error: "No users provided in role_group"
        });
    }

    for (const user of parsedRoleGroup) {
        console.log("Checking user:", user);
        if (!user.user_id || !user.role_group) {
            return res.status(400).json({
                error: "Each user in role_group must have user_id and role_group"
            });
        }
    }

    try {
        const filePath = `/uploads/${req.file.filename}`;
        const fileName = req.file.originalname;
        const values = [type_id, project_name, description || null, keywords || null, date, fileName, filePath];

        // เพิ่มโปรเจกต์ใหม่ลงในตาราง projects และรับ project_id
        const result = await pool.query(
            `INSERT INTO projects (type_id, project_name, description, keywords, date, file_name, file_path) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING project_id`, values
        );
        const projectId = result.rows[0].project_id;

        // ใช้ Promise.all สำหรับการเพิ่มข้อมูลใน userprojectmapping
        const userMappingPromises = parsedRoleGroup.map(user =>
            pool.query(
                `INSERT INTO user_project_mapping (user_id, project_id, role_group) VALUES ($1, $2, $3) RETURNING *`,
                [user.user_id, projectId, user.role_group]
            )
        );

        // รอให้ทุกคำสั่งเสร็จสมบูรณ์
        await Promise.all(userMappingPromises);

        // ส่งข้อมูลกลับไปที่ client
        res.status(200).json({
            message: "Project added successfully",
            project_id: projectId
        });

    } catch (err) {
        console.error('Error adding project:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Please try again later'
        });
    }
};

const getProjects = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects');
        res.status(200).json({
            success: true,
            data: result.rows
        })
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
            message: "Database error"
        })
    }
}

const getMyProjects = async (req, res) => {
    // ดึง token จาก Authorization header
    const token = req.headers.authorization?.split(' ')[1]; // คาดว่าเป็นรูปแบบ Bearer <token>

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        // ตรวจสอบและ decode token
        const decoded = jwt.verify(token, 'SECRET_KEY');
        const user_id = decoded.user_id; // ดึง user_id จาก token
        console.log(user_id)

        // คำสั่ง SQL ที่ใช้ JOIN ระหว่าง table user_project_mapping และ projects
        const result = await pool.query(`
            SELECT p.* 
            FROM projects p
            JOIN user_project_mapping upm ON p.project_id = upm.project_id
            WHERE upm.user_id = $1
        `, [user_id]); // ใช้ user_id ที่ดึงจาก token

        // ส่งข้อมูลโปรเจกต์ทั้งหมดที่เกี่ยวข้องกับ user_id
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        // ถ้ามีข้อผิดพลาดในการดึงข้อมูลหรือในการตรวจสอบ token
        res.status(500).json({
            success: false,
            error: err.message,
            message: "Database error or token verification failed"
        });
    }
};

module.exports = { postProject, getProjects, getMyProjects }