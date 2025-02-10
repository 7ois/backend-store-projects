const pool = require('../config/db_config');

const getRoles = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roles');
        res.status(200).json({
            seccess: true,
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

module.exports = { getRoles }