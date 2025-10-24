# To run this you need to install first python and then; pymysql, flask, and flask-SQLAlchemy 
# Once you have python to install it is python3 -m pip install Flask  
# To install the other ones just change where Flask is to the name pymysql or flask-SQLAlchemy
# If after you install these it won't let you run just use Command + Shift + P to change the interpreter to the Python interpreter 

from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from functools import wraps

# Create Flask app and connect to MySQL database
app = Flask(__name__, template_folder='portal', static_folder='static')  # point to portal/
# IMPORTANT: set YOUR real MySQL root password and confirm db name is pharmacy_database
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:khual@127.0.0.1:3306/pharmacy_database'
# root = username (keep as root)
# YOUR_PASSWORD = the password you use to log into MySQL Workbench
# Host/Port = local MySQL
# Database = your database name (pharmacy_database)
app.secret_key = 'dev-secret'  # needed for session; set a stronger key in production
db = SQLAlchemy(app)

# Doctor table
class Doctor(db.Model):
    __tablename__ = "Doctor"
    Doc_id = db.Column(db.Integer, primary_key=True)
    Doc_feedback = db.Column(db.String(255))

# Return list of doctors in JSON format
@app.route("/doctors")
def get_doctors():
    doctor = Doctor.query.all()
    result = [{'Doc_id': d.Doc_id, 'Doc_feedback': d.Doc_feedback} for d in doctor]
    return jsonify(result)

# Patient table (maps to Patient.Password in DB; we store a HASH string there)
class Patient(db.Model):
    __tablename__ = 'Patient'
    PatientID   = db.Column(db.Integer, primary_key=True, autoincrement=True)
    FirstName   = db.Column(db.String(50), nullable=False)
    LastName    = db.Column(db.String(50), nullable=False)
    DOB         = db.Column(db.Date, nullable=False)
    Phone       = db.Column(db.String(21))
    Email       = db.Column(db.String(250), unique=True)
    Address     = db.Column(db.String(300))
    PasswordHash = db.Column('Password', db.String(255), nullable=False)  # store werkzeug hash
    InsuranceID = db.Column(db.Integer, db.ForeignKey('Insurance.InsuranceID'))

# Insurance table
class Insurance(db.Model):
    __tablename__ = 'Insurance'
    InsuranceID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Provider    = db.Column(db.String(80))
    Plan        = db.Column(db.String(80))
    Deductible  = db.Column(db.Numeric(8, 2))
    Notes       = db.Column(db.String(255))

# Staff table (matches your SQL: StaffID, FullName, Role, Email, PwdHash)
class Staff(db.Model):
    __tablename__ = 'Staff'
    StaffID  = db.Column(db.Integer, primary_key=True, autoincrement=True)
    FullName = db.Column(db.String(100))
    Role     = db.Column(db.Enum('Tech','Pharmacist','Admin'), nullable=False)
    Email    = db.Column(db.String(120), unique=True)
    PwdHash  = db.Column(db.String(255), nullable=False)

# simple login-required decorator for protected patient pages
def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("patient_id"):
            return redirect(url_for("home"))
        return fn(*args, **kwargs)
    return wrapper

# simple login-required decorator for staff pages
def staff_login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("staff_id"):
            return redirect(url_for("staff_login"))
        return fn(*args, **kwargs)
    return wrapper

# Home page → patient login
@app.route("/")
def home():
    return render_template('patient/index.html')

# Handle patient login (checks hashed password)
@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email', '').strip()
    password = request.form.get('password', '')

    if not email or not password:
        return "Missing credentials", 400

    patient = Patient.query.filter_by(Email=email).first()
    if patient and check_password_hash(patient.PasswordHash, password):
        session["patient_id"] = patient.PatientID
        session["patient_name"] = f"{patient.FirstName} {patient.LastName}"
        return redirect(url_for('dashboard'))
    else:
        return "Invalid credentials", 401

# Patient dashboard (protected)
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('patient/Pdashboard.html')

# Patient logout
@app.route('/Logout')
def Logout():
    session.pop("patient_id", None)
    session.pop("patient_name", None)
    return render_template('patient/dummydashboard.html')

# Account activation (register new patient)
@app.route('/activate', methods=['GET', 'POST'])
def activate():
    if request.method == 'POST':
        # Get form data
        first_name = request.form.get('first_name')
        last_name  = request.form.get('last_name')
        dob        = request.form.get('dob')
        email      = request.form.get('email')
        address    = request.form.get('address')
        phone      = request.form.get('phone')
        insurance_id = request.form.get('insurance_id')
        password   = request.form.get('password')  # will be hashed before saving

        if not (first_name and last_name and dob and email and password):
            return "Missing required fields", 400

        # Convert DOB string to date
        dob_obj = datetime.strptime(dob, '%Y-%m-%d').date()

        # Hash password before storing
        pw_hash = generate_password_hash(password)

        # Save new patient to database
        new_patient = Patient(
            FirstName=first_name,
            LastName=last_name,
            DOB=dob_obj,
            Email=email,
            Phone=phone,
            Address=address,
            PasswordHash=pw_hash,  # goes into Patient.Password column
            InsuranceID=int(insurance_id) if insurance_id else None
        )
        db.session.add(new_patient)
        db.session.commit()

        # After creating the account, show confirmation page
        return render_template('patient/activation_success.html')

    # If GET request, show the activation form
    return render_template('patient/activate.html')

# ---------------------- Staff Routes ----------------------

# Staff login page (GET)
@app.route('/staff_login', methods=['GET'])
def staff_login():
    return render_template('staff/staff_login.html')

# Handle staff login (POST) – expects StaffID (number), Role (Tech/Pharmacist/Admin), Password
@app.route('/staff_login', methods=['POST'])
def staff_login_post():
    staff_code = request.form.get('staffid', '').strip()
    role = request.form.get('role', '').strip()
    password = request.form.get('password', '')

    if not (staff_code and role and password):
        return "Missing credentials", 400

    try:
        staff_id_int = int(staff_code)
    except ValueError:
        return "Staff ID must be a number", 400

    staff = Staff.query.filter_by(StaffID=staff_id_int, Role=role).first()
    if staff and check_password_hash(staff.PwdHash, password):
        session["staff_id"] = staff.StaffID
        session["staff_role"] = staff.Role
        return redirect(url_for('staff_dashboard'))
    return "Invalid staff credentials", 401

# Staff dashboard (protected)
@app.route('/staff_dashboard')
@staff_login_required
def staff_dashboard():
    return render_template('staff/staff_dashboard.html')

# Staff logout
@app.route('/staff_logout')
def staff_logout():
    session.pop("staff_id", None)
    session.pop("staff_role", None)
    return redirect(url_for('staff_login'))

# Temporary route to create a demo staff account (delete after testing)
@app.route('/create_demo_staff')
def create_demo_staff():
    # Creates: FullName=John Doe, Role=Pharmacist, Email=john@example.com, Password=StrongPass123
    demo_email = "john@example.com"
    exists = Staff.query.filter_by(Email=demo_email).first()
    if exists:
        return "Demo staff already exists."

    demo = Staff(
        FullName="John Doe",
        Role="Pharmacist",  # must be one of: Tech / Pharmacist / Admin
        Email=demo_email,
        PwdHash=generate_password_hash("StrongPass123")
    )
    db.session.add(demo)
    db.session.commit()
    return "Demo staff created!"

# Start Flask app
if __name__ == '__main__':
    # For local dev you can auto-create tables (only if tables already defined in SQL; otherwise skip)
    # with app.app_context(): db.create_all()
    app.run(debug=True)
