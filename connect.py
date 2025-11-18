# To run this you need to install first python and then; pymysql, flask, and flask-SQLAlchemy 
# Once you have python to install it is python3 -m pip install Flask  
# To install the other ones just change where Flask is to the name pymysql or flask-SQLAlchemy
# If after you install these it won't let you run just use command + shift + p to change the interperator to the python interperator 

from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__) # initalizes the flask app

app.config['SQLALCHEMY_DATABASE_URI'] ='mysql+pymysql://root:Password@host/database'
# root should stay the same but password should be your password for your server 
# host is the host name of your server that you can find on mysql workbench when you go to server status it should show the host just copy and paste
# And then database is the name of the database in your mysql which would be Pharmacy_Database
db = SQLAlchemy(app)

#Decorators&Wrappers
from functools import wraps 

#decorator to limit page acces based on roles 
def role_required(allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            role = session.get('role') #Get's user role from session
            if role not in allowed_roles:
                #Redirects
                return redirect(url_for('home'))
            return fn(*args, **kwargs) #If role is allowed then it procceds 
        return wrapper
    return decorator

#Required login decorator for staff pages 
def login_required(fn):
    wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get('patient_id'):
            return redirect(url_for("home"))
        return fn(*args, *kwargs)
    return wrapper
        

#Required login decorator for staff pages 
def staff_login_required(fn):
    wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("staff_id"):
            return redirect(url_for("staff_login"))
        return fn(*args, **kwargs)
    return wrapper


#Models 
class Doctor(db.Model):
    __tablename__ = "Doctor"
    Doc_id = db.Column(db.Integer, primary_key=True)
    Doc_feedback = db.Column(db.String(255))


class Patient(db.Model):
    __tablename__ = 'Patient'
    PatientID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    FirstName = db.Column(db.String(50), nullable=False)
    LastName = db.Column(db.String(50), nullable=False)
    DOB = db.Column(db.Date, nullable=False)
    Phone = db.Column(db.String(21))
    Email = db.Column(db.String(250), unique=True)
    Address = db.Column(db.String(300))
    password = db.Column(db.String(255))
    InsuranceID = db.Column(db.Integer, db.ForeignKey('Insurance.InsuranceID')) 

class Insurance(db.Model):
    __tablename__ = 'Insurance'

    InsuranceID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Provider = db.Column(db.String(80))
    Plan = db.Column(db.String(80))
    Deductible = db.Column(db.Numeric(8, 2))
    Notes = db.Column(db.String(255))

class Staff(db.Model):
    __tablename__ = 'Staff'

    StaffID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    FullName = db.Column(db.String(100), nullable=False)
    Role = db.Column(db.Enum('Tech', 'Pharmacist', 'Admin'), nullable=False)
    Email = db.Column(db.String(120), unique=True, nullable=False)
    PwdHash = db.Column(db.LargeBinary(60), nullable=False)

    def __repr__(self):
        return f"<Staff {self.StaffID} - {self.FullName} ({self.Role})>"

class Prescription(db.Model):
    __tablename__ = 'Prescription'

    RxID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    PatientID = db.Column(db.Integer, db.ForeignKey('Patient.PatientID'), nullable=False)
    PrescriberID = db.Column(db.Integer, db.ForeignKey('Prescriber.PrescriberID'), nullable=False)
    DrugID = db.Column(db.Integer, db.ForeignKey('Drug.DrugID'), nullable=False)
    Dosage = db.Column(db.String(120))
    Qty = db.Column(db.Integer)
    RefillsTotal = db.Column(db.Integer)
    RefillsUsed = db.Column(db.Integer, default=0)
    DateIssued = db.Column(db.Date)
    LastFillDate = db.Column(db.DateTime, nullable=True)
    Status = db.Column(db.Enum('Pending', 'Printed', 'Filled', 'Ready', 'Sold', 'PendingRenewal', 'Denied'), default='Pending')
    Instructions = db.Column(db.String(256))

    def __repr__(self):
        return f"<Prescription {self.RxID} - Status: {self.Status}>"
    
class Prescriber(db.Model):
    __tablename__ = 'Prescriber'

    PrescriberID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Name = db.Column(db.String(100), nullable=False)
    LicenseNo = db.Column(db.String(40), unique=True, nullable=False)
    Specialty = db.Column(db.String(60), nullable=True)

    def __repr__(self):
        return f"<Prescriber {self.PrescriberID} - {self.Name} ({self.Specialty})>"
    

class Drug(db.Model):
    __tablename__ = 'Drug'

    DrugID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    NDC = db.Column(db.String(12), unique=True, nullable=False)
    Name = db.Column(db.String(120), nullable=False)
    Strength = db.Column(db.String(40), nullable=True)
    Form = db.Column(db.String(40), nullable=True)

    def __repr__(self):
        return f"<Drug {self.DrugID} - {self.Name} ({self.Strength} {self.Form})>"


if __name__=='__main__':
    app.run(debug=True)

#Inital screen (homepage)
@app.route("/")
def home():
    return render_template('home.html')  

#To route user to login
@app.rout("/to_dash")
def to_dash():
    return render_template('dashboard.html')

#Route when logging in to be taken to patient dashbard 
@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')

    patient = Patient.query.filter_by(Email=email, password=password).first()
    if patient:
        session['email'] = patient.Email # store the email in session
        session['patient_id'] = patient.PatientID #store patient id in session 
        return redirect(url_for('dashboard'))
    else:
        return "Invalid credentials", 401

#Route for staff logging in to be taken to staff dashboard 
@app.route('/staff_login', methods=['GET', 'POST'])
def staff_login():
    if request.method == 'POST':
        staffid = request.form['staffid']
        password = request.form['password']
        role = request.form['role']

        staff = Staff.query.filter_by(StaffID=staffid, Role=role).first()

        if staff and staff.PwdHash.decode() == password:
            session['staff_id'] = staff.StaffID
            session['staff_name'] = staff.FullName
            session['role'] = staff.Role
            return redirect(url_for('staff_dashboard'))
        else:
            return render_template('staff_login.html', error="Invalid credentials")
        
    return render_template('staff_login.html')
    
#Route displays the staff dashboard for the staff in current session
@app.route('/staff_dashboard')
@staff_login_required
@role_required(['Admin', 'Tech', 'Pharmacist'])
def staff_dashboard():
    if 'staff_id' not in session:
        return redirect(url_for('staff_login'))

    prescriptions = Prescription.query.filter_by(Status='Pending').all()
    return render_template('staff_dashboard.html',
                           staff_name=session['staff_name'],
                           role=session['role'],
                           prescriptions=prescriptions)

#Route to create prescriptions for patients 
@app.route('/add_prescription', methods=['GET', 'POST'])
@staff_login_required
@role_required(['Admin', 'Tech', 'Pharmacist'])
def add_prescription():
    if request.method == 'POST':
        try:
            new_rx = Prescription(
                PatientID=request.form['patientid'],
                PrescriberID=request.form['prescriberid'],
                DrugID=request.form['drugid'],
                Dosage=request.form['dosage'],
                Qty=request.form['qty'],
                RefillsTotal=request.form['refills'],
                DateIssued=request.form['dateissued'],
                Status=request.form['status']
            )
            db.session.add(new_rx)
            db.session.commit()
            return render_template('add_prescription.html', success="Prescription added successfully.")
        except Exception as e:
            return render_template('add_prescription.html', error=f"Error: {str(e)}")
    return render_template('add_prescription.html')

import os
app.secret_key = os.urandom(24) #used for session keys

#Shows patient in seesion their dashboard 
@app.route('/dashboard')
@login_required
def dashboard():
    # Get patient email from session
    email = session.get('email')
    
    # Query patient record
    patient = Patient.query.filter_by(Email=email).first()
    if not patient:
        return "Patient not found", 404

    # Query prescriptions for patient
    prescriptions = Prescription.query\
        .filter_by(PatientID=patient.PatientID)\
        .join(Drug, Prescription.DrugID == Drug.DrugID)\
        .add_columns(
            Prescription.RxID,
            Drug.Name.label('DrugName'),
            Prescription.Dosage,
            Prescription.Qty,
            Prescription.RefillsUsed,
            Prescription.RefillsTotal,
            Prescription.Status
        ).all()

    full_name = f"{patient.FirstName} {patient.LastName}"
    return render_template('Pdashboard.html',
                           patient_name=full_name,
                           prescriptions=prescriptions)

#Route for whenever you logout it will clear your session 
@app.route('/Logout')
def Logout():
    session.clear()
    return render_template('logout.html')

#Route to create a new patient record 
@app.route('/activate_patient', methods=['GET', 'POST'])
def activate_patient():
    if request.method == 'POST':
        # Get form data
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        dob = request.form.get('dob')
        email = request.form.get('email')
        address = request.form.get('address')
        phone = request.form.get('phone')
        insurance_id = request.form.get('insurance_id')
        password = request.form.get('password')  # We should hash this

        # Convert DOB to date object
        dob_obj = datetime.strptime(dob, '%Y-%m-%d').date()

        # Save to database
        new_patient = Patient(
            FirstName=first_name,
            LastName=last_name,
            DOB=dob_obj,
            Email=email,
            Phone=phone,
            Address=address,
            password =password,
            InsuranceID=insurance_id if insurance_id else None
        )
        db.session.add(new_patient)
        db.session.commit()

        return render_template('activation_success.html')  
    return render_template('activate.html')

#Route to create new staff account 
@app.route('/activate_staff', methods=['GET', 'POST'])
def activate_staff():
    if request.method == 'POST':
        try:
            # Get form data
            fullname = request.form['fullname']
            role = request.form['role']
            email = request.form['email']
            password = request.form['password']

            # Convert password to binary (no hashing for testing)
            pwd_binary = password.encode()

            # Create new staff record
            new_staff = Staff(
                FullName=fullname,
                Role=role,
                Email=email,
                PwdHash=pwd_binary
            )

            # Save to database
            db.session.add(new_staff)
            db.session.commit()

            return render_template('activate_staff.html', success="Staff account activated successfully.")
        except Exception as e:
            return render_template('activate_staff.html', error=f"Error: {str(e)}")

    return render_template('activate_staff.html')

#Route to display the two options for creating an account 
@app.route('/activate_options')
def activate_options():
    return render_template('activate_options.html')

#Route to add medications to database 
@app.route('/add_medication', methods=['GET', 'POST'])
@role_required(['Admin'])
def add_medication():
    if request.method == 'POST':
        ndc = request.form.get('ndc')
        name = request.form.get('name')
        strength = request.form.get('strength')
        form = request.form.get('form')

        # Basic validation
        if not ndc or not name:
            error = "NDC and Name are required fields."
            return render_template('add_Med.html', error=error)

        # Check for duplicate NDC
        existing = Drug.query.filter_by(NDC=ndc).first()
        if existing:
            error = f"A drug with NDC {ndc} already exists."
            return render_template('add_Med.html', error=error)

        # Create and save new Drug
        new_drug = Drug(NDC=ndc, Name=name, Strength=strength, Form=form)
        db.session.add(new_drug)
        db.session.commit()

        success = f"Medication '{name}' added successfully."
        return render_template('add_Med.html', success=success)

    return render_template('add_Med.html')


### These routes are still in testing as of now they work but limitedly 
#Route for handling who is able to verify based on role
@app.route("/handle_action", methods=["POST"])
def handle_action():
    rxid = request.form.get("rxid")
    patient = request.form.get("patient")
    action = request.form.get("action")
    role = session.get("role")   

    # Admins and Pharmacists can go directly
    if role in ["Admin", "Pharmacist"]:
        if action == "verify":
            return redirect(url_for("verify_page", rxid=rxid, patient=patient))
        elif action == "ready":
            return redirect(url_for("markready", rxid=rxid, patient=patient))
        else:
            error = ("Unknown action requested.")
            return redirect(url_for("dashboard"))

    # Other roles (e.g. Techs) must go through code verification
    else:
        return redirect(url_for("code_verification", rxid=rxid, patient=patient, action=action))
    
#Route to handle marking a presciption ready or not 
@app.route("/markready")
def markready():
    patient_id = request.args.get("patient")
    rxid = request.args.get("rxid")

    
    patient = Patient.query.get(patient_id)
    prescription = Prescription.query.get(rxid)
    medication = Drug.query.get(prescription.DrugID)
    instructions = Prescription.query.get(prescription.Instructions)

    full_name = f"{patient.FirstName} {patient.LastName}"

    return render_template("markready.html", patient = patient, prescription = prescription, medication = medication, full_name = full_name, Instruction = instructions )



#Route to handle if they need to have a code to be able to verify a presciption
@app.route("/code_verification")
def code_verification():
    patient = request.args.get("patient")
    action = request.args.get("action")
    return render_template("code_verification.html", patient=patient, action=action)

#Dummy route to check verification code 
@app.route("/submit_code", methods=["POST"])
def submit_code():
    code = request.form["code"]
    patient = request.form["patient"]
    action = request.form["action"]

    # Replace with real validation
    if code == "1234":
        return redirect(url_for("verify_page", patient=patient, action=action))
    else:
        error = "Invalid code, try again."
        return redirect(url_for("code_verification", patient=patient, action=action))
    
#Route that shows the verifying page
@app.route("/verify")
@staff_login_required
def verify_page():
    patient_id = request.args.get("patient")
    rxid = request.args.get("rxid")

    patient = Patient.query.get(patient_id)
    prescription = Prescription.query.get(rxid)
    medication = Drug.query.get(prescription.DrugID)
    instructions = Prescription.query.get(prescription.Instructions)

    full_name = f"{patient.FirstName} {patient.LastName}"

    return render_template("verify.html", patient=patient , staff_name = session['staff_name'], role=session['role'], prescription = prescription, medication = medication, Instruction = instructions, full_name = full_name)



