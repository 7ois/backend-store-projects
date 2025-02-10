const multer = require("multer");
const path = require("path");

// ตั้งค่าการเก็บไฟล์
const storage = multer.diskStorage({
    destination: "uploads/", // โฟลเดอร์เก็บไฟล์
    filename: (req, file, cb) => {
        const fileExt = path.extname(file.originalname); // นามสกุลไฟล์
        const fileName = Date.now() + fileExt; // สร้างชื่อไฟล์ใหม่ เช่น 1706623945.pdf
        cb(null, fileName);
    },
});

const upload = multer({ storage });

module.exports = upload;
