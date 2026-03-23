# 💊 PharmaFulfill

A full-stack pharmacy management system that models how a modern retail pharmacy manages patients, prescriptions, refills, inventory, and staff workflows across multiple user roles.

## 👥 Roles

| Role | Description |
|---|---|
| Patient | View prescriptions, request refills |
| Pharmacy Technician | Process fills and refills, manage inventory |
| Pharmacist | Review and approve prescriptions |
| Admin | Manage staff, system oversight |

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, Vite, ShadCN UI, lucide-react, Sonner |
| Backend | Python, Flask, Flask-CORS, mysql-connector-python |
| Database | MySQL — normalized schema (patients, staff, prescriptions, fills, refills, inventory, billing) |
| Security | bcrypt password hashing, TLS email via smtplib + Gmail |
| Dev Tools | VS Code, MySQL Workbench, Node.js + npm, Git |

## 🚀 Getting Started

### Prerequisites

Download and install the following before running the project:

- [MySQL + MySQL Workbench](https://dev.mysql.com/downloads/)
- [Python](https://www.python.org/downloads/)
- [Node.js + npm](https://nodejs.org/)

### 1. Set up the database

Start your MySQL server and import `PharmaFulfill.sql` using MySQL Workbench to create and populate the database.

### 2. Start the Flask API

From your project folder, install dependencies and run the backend:

```bash
pip install flask flask-cors flask-sqlalchemy pymysql bcrypt python-dotenv reportlab cryptography
python connect.py
```

If successful, you should see:
```
Running on http://127.0.0.1:5000
```

### 3. Start the frontend

Open a new terminal and run:

```bash
npm install
npm run dev
```

You should see a local URL like:
```
http://localhost:5173
```
