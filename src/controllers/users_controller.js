require("dotenv").config();

const pool = require("../config/db_config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

const getAllUsers = async (req, res) => {
  const { search, role_id } = req.query;

  try {
    let query = `SELECT * FROM users`;
    const queryParams = [];
    const conditions = [];

    if (role_id) {
      conditions.push(`role_id = $${queryParams.length + 1}`);
      queryParams.push(role_id);
    }

    if (search) {
      const searchTerms = search
        .trim()
        .split(" ")
        .map((term) => `%${term}%`);

      if (searchTerms.length === 1) {
        conditions.push(
          `(first_name ILIKE $${queryParams.length + 1} OR last_name ILIKE $${
            queryParams.length + 2
          })`,
        );
        queryParams.push(searchTerms[0], searchTerms[0]);
      } else if (searchTerms.length === 2) {
        conditions.push(
          `first_name ILIKE $${queryParams.length + 1} AND last_name ILIKE $${
            queryParams.length + 2
          }`,
        );
        queryParams.push(searchTerms[0], searchTerms[1]);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows,
    });
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
    return res.status(400).json({ error: "role_id and email are required" });
  }

  try {
    // email ห้ามซ้ำ
    const checkEmailQuery = "SELECT * FROM users WHERE email = $1";
    const emailCheck = await pool.query(checkEmailQuery, [email]);

    if (emailCheck.rows.length > 0) {
      return res.status(401).json({
        error: "Duplicate email",
        message: "Email already exists",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertQuery =
      "INSERT INTO users (role_id, email, password, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING *";
    const values = [
      role_id,
      email,
      hashedPassword,
      first_name || null,
      last_name || null,
    ];
    const result = await pool.query(insertQuery, values);
    res
      .status(200)
      .json({ message: "User added successfully", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      message: "Please try again later",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // ตรวจสอบว่าอีเมลมีอยู่ในฐานข้อมูลหรือไม่
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid data" });
    }

    const user = result.rows[0];

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // สร้าง JWT Token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role_id: user.role_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      SECRET_KEY,
      { expiresIn: "2h" }, // Token หมดอายุใน 2 ชั่วโมง
    );

    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      message: "Please try again later",
    });
  }
};

const updateUser = async (req, res) => {
  const { user_id } = req.params;
  const { first_name, last_name } = req.body;

  try {
    const userQuery = "SELECT * FROM users WHERE user_id = $1";
    const userResult = await pool.query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (first_name === undefined && last_name === undefined) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update",
      });
    }

    const updateFields = [];
    const queryParams = [];

    if (first_name !== undefined) {
      queryParams.push(first_name);
      updateFields.push(`first_name = $${queryParams.length}`);
    }

    if (last_name !== undefined) {
      queryParams.push(last_name);
      updateFields.push(`last_name = $${queryParams.length}`);
    }

    queryParams.push(new Date());
    updateFields.push(`updated_at = $${queryParams.length}`);

    const updateQuery = `UPDATE users SET ${updateFields.join(
      ", ",
    )} WHERE user_id = $${queryParams.length + 1} RETURNING *`;
    queryParams.push(user_id);

    const updatedUser = await pool.query(updateQuery, queryParams);

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser.rows[0],
    });
  } catch (err) {
    console.error("Error updating user:", err);
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: err.message,
    });
  }
};

module.exports = { getAllUsers, register, login, updateUser };
