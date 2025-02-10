# Projects Library API

## 📌 Overview

Projects Library API เป็นระบบที่ช่วยจัดการข้อมูลผู้ใช้ โครงการ และประเภทโครงการ โดยใช้ **PostgreSQL** และ **Knex.js** เป็นเครื่องมือจัดการฐานข้อมูล

## 🚀 Features

- จัดการผู้ใช้ (Users)
- จัดการบทบาท (Roles)
- จัดการประเภทโครงการ (Type Projects)
- จัดการโครงการ (Projects)
- จัดการสิทธิ์ของผู้ใช้ในโครงการ (User-Project Mapping)

---

## 📂 Installation & Setup

### 1️⃣ **Clone Repository**

```sh
git clone <your-repo-url>
cd projects-library-api
mkdir uploads
```

### 2️⃣ **ติดตั้ง Dependencies**

```sh
npm install
```

### 3️⃣ **ตั้งค่า Environment Variables**

สร้างไฟล์ `.env` ที่ root ของโปรเจค และเพิ่มค่าต่อไปนี้:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=projects_library
PORT=3001
```

### 4️⃣ **Run Database Migration**

```sh
npx knex migrate:latest
```

### 5️⃣ **Run Seed (ถ้าต้องการเพิ่มข้อมูลเริ่มต้น)**

```sh
npx knex seed:run
```

### 6️⃣ **Start Server**

```sh
npm run dev
```

หรือถ้าต้องการรันแบบ production:

```sh
npm start
```

## 🛠 Technologies Used

- **Node.js** + **Express.js** (Backend)
- **PostgreSQL** (Database)
- **Knex.js** (Query Builder & Migration Tool)
- **dotenv** (Environment Variable Management)

---

## 📝 License

BAS
