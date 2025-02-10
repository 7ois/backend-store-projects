const pool = require('../config/db_config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'rmuti-key';

const getUsers = async (req, res) => {
    const { name } = req.query; // รับค่าชื่อจาก query parameters

    try {
        // ตรวจสอบว่ามีการส่งชื่อมาใน request หรือไม่
        if (name) {
            const result = await pool.query(
                `SELECT * FROM users WHERE first_name ILIKE $1 OR last_name ILIKE $1`,
                [`%${name}%`] // ใช้ ILIKE สำหรับการค้นหาชื่อที่ตรงหรือใกล้เคียง (case-insensitive)
            );
            res.status(200).json({
                success: true,
                data: result.rows,
            });
        } else {
            // ถ้าไม่มีการกรอกชื่อจะดึงข้อมูลผู้ใช้ทั้งหมด
            const result = await pool.query('SELECT * FROM users');
            res.status(200).json({
                success: true,
                data: result.rows,
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Database error",
            error: err.message,
        });
    }
};

const register = async (req, res) => {
    const { role_id, email, password, first_name, last_name } = req.body;

    if (!role_id || !email || !password) {
        return res.status(400).json({ error: 'role_id and email are required' });
    }

    try {
        // email ห้ามซ้ำ
        const checkEmailQuery = 'SELECT * FROM users WHERE email = $1';
        const emailCheck = await pool.query(checkEmailQuery, [email]);

        if (emailCheck.rows.length > 0) {
            return res.status(401).json({
                error: 'Duplicate email',
                message: 'Email already exists'
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const insertQuery = 'INSERT INTO users (role_id, email, password, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING *';
        const values = [role_id, email, hashedPassword, first_name || null, last_name || null];
        const result = await pool.query(insertQuery, values);
        res.status(200).json({ message: 'User added successfully', user: result.rows[0] });

    } catch (err) {
        console.error('Error adding user:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Please try again later'
        });
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // ตรวจสอบว่าอีเมลมีอยู่ในฐานข้อมูลหรือไม่
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid data' });
        }

        const user = result.rows[0];

        // ตรวจสอบรหัสผ่าน
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // สร้าง JWT Token
        const token = jwt.sign(
            { role_id: user.role_id, email: user.email, first_name: user.first_name, last_name: user.last_name },
            SECRET_KEY,
            { expiresIn: '2h' } // Token หมดอายุใน 2 ชั่วโมง
        );

        res.status(200).json({
            message: 'Login successful',
            token,
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error', message: 'Please try again later' });
    }
};

const searchUsers = async (req, res) => {
    try {
        const search = req.query.search || "";
        const { rows } = await pool.query(
            "SELECT * FROM users WHERE first_name || ' ' || last_name ILIKE $1",
            [`%${search}%`]
        );
        res.json({ data: rows });
    } catch (error) {
        res.status(500).json({ message: "Database error", error });
    }
}

module.exports = { getUsers, register, login }