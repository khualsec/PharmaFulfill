# 💊 PharmaFulfill

PharmaFulfill is a **full-stack pharmacy management system** that models how a modern retail pharmacy could manage **patients, prescriptions, refills, inventory, and staff workflows** across multiple roles (Patient, Tech, Pharmacist, Admin).

It is built with:

- **Backend:** Python + Flask + MySQL  
- **Frontend:** React + TypeScript + ShadCN UI  
- **Database:** MySQL with a normalized schema (patients, staff, prescriptions, fills, refills, inventory, billing, etc.)

### 3. Requirements (Flask API)

- **Framework:** Flask (Python)
- **Database access:** `mysql-connector-python`
- **CORS:** `Flask-CORS`
- **Security:**
  - bcrypt hashing for all stored passwords.
- **Email Service:**
  - smtplib + TLS + Gmail app password
  - datetime, json, os

### 4. Frontend Requirements (React + TS)

- **Framework:** React + TypeScript
- **Build tool:** Vite
- **UI Library:** ShadCN UI
- **Icons:** lucide-react
- **Notifications:** sonner (toasts)

### Database & Dev Tools

- MySQL Server
- MySQL Workbench
- VS Code
- Node.js + npm
- Windows PowerShell / CMD

## 🚀 Running the Project

1. Download MySQL + MySQL Workbench from the official website
2. Download Python from the official website
3. Download Node.js from the official website
4. Start MySQL server and create the database using the PharmaFulfill.sql provided.
5. Installing dependencies from your project folder terminal:

   ```bash
   
   pip install flask flask-cors flask-sqlalchemy pymysql bcrypt python-dotenv reportlab cryptography
   ```

6. Run Flask API:
   ```bash
   python connect.py
   ```

If sucessful, you should see:
    - Running on http://127.0.0.1:5000

Open new terminal:
```bash
   >npm install
   >npm run dev
```
You should then see a URL like:
http://localhost:5173


