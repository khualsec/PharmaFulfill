PharmaFulfill — Pharmacy Database Management System

A Flask and MySQL web application designed to manage pharmacy operations efficiently.
This system allows patients to activate accounts, log in, and view dashboards,
and enables staff (technicians, pharmacists, admins) to log in securely and access internal tools.

Requirements
Python 3.10 or newer
MySQL Server (Workbench recommended)
Required Python libraries:
pip install flask flask_sqlalchemy pymysql werkzeug

MySQL Setup
Open MySQL Workbench and create a database:

CREATE DATABASE pharmacy_database;
USE pharmacy_database;

Run the provided schema file (for example, pharmacy_schema.sql) to create all tables.
Verify that your database includes the following tables:
Patient
Insurance
Staff
Prescription
Drug
Inventory
Store
Fill
Billing

Configuration
In your app.py, update this line to match your MySQL credentials:
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:YOUR_PASSWORD@127.0.0.1:3306/pharmacy_database'

If your MySQL root user has no password, use:
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@127.0.0.1:3306/pharmacy_database'

Running the Application
From the project directory, run:
python app.py


Then open a browser and visit:
http://127.0.0.1:5000/

Creating a Demo Staff Account
Visit:http://127.0.0.1:5000/create_demo_staff
This will automatically generate:
Field	Value
StaffID:	1
FullName	John Doe
Role:	Pharmacist
Email:	john@example.com
Password:	StrongPass123 (stored as a secure hash)

Check that the record exists in MySQL:
SELECT * FROM pharmacy_database.Staff;


Database Notes:
All passwords are stored securely using Werkzeug’s PBKDF2-SHA256 hashing.

Common Issues
OperationalError: Can't connect to MySQL server on 'Host'

Cause: Your connection string still uses 'Host' instead of 127.0.0.1.
Fix: Update app.py to:
'mysql+pymysql://root:YOUR_PASSWORD@127.0.0.1:3306/pharmacy_database'

ValueError: Invalid hash method ''

Cause: A staff password was inserted manually using the wrong hash format.
Fix: Delete the bad row from Staff and recreate it via:
http://127.0.0.1:5000/create_demo_staff

Security Notes:
Passwords are hashed with PBKDF2-SHA256 before being stored.
Flask sessions are protected using app.secret_key.
Always use a strong secret key in production:
app.secret_key = 'your-secure-production-key'