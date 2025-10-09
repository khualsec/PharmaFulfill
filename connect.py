# To run this you need to install first python and then;pymysql, flask, and flask-SQLAlchemy 
# Once you have python to install it is python3 -m pip install Flask  
# To install the other ones just change where Flask is to the name pymysql or flask-SQLAlchemy
# If after you install these it won't let you run just use command + shift + p to change the interperator to the python interperator 


from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__) # initalizes the flask app

app.config['SQLALCHEMY_DATABASE_URI'] ='mysql+pymysql://root:Password@Host/Database'
# root should stay the same but password should be your password for your server 
# host is the host name of your server that you can find on mysql workbench when you go to server status it should show the host just copy and paste
# And then database is the name of the database in your mysql which would be Pharmacy_Database
db = SQLAlchemy(app)

class Doctor(db.Model):
    __tablename__ = "Doctor"
    Doc_id = db.Column(db.Integer, primary_key=True)
    Doc_feedback = db.Column(db.String(255))

@app.route("/doctors")
def get_doctors():
    doctor = Doctor.query.all()
    result = [{'Doc_id': d.Doc_id, 'Doc_feedback': d.Doc_feedback} for d in doctor]
    return jsonify(result)

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

if __name__=='__main__':
    app.run(debug=True)

@app.route("/")
def home():
    return render_template('dashboard.html')  

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')

    patient = Patient.query.filter_by(Email=email, password=password).first()
    if patient:
        return redirect(url_for('dashboard'))
    else:
        return "Invalid credentials", 401

@app.route('/dashboard')
def dashboard():
    return render_template('Pdashboard.html')

@app.route('/Logout')
def Logout():
    return render_template('dummydashboard.html')

@app.route('/activate', methods=['GET', 'POST'])
def activate():
    if request.method == 'POST':
        # Get form data
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        dob = request.form.get('dob')
        email = request.form.get('email')
        address = request.form.get('address')
        phone = request.form.get('phone')
        insurance_id = request.form.get('insurance_id')
        password = request.form.get('password')  # We should hash this!

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

        return render_template('activation_success.html')  # Create this page
    return render_template('activate.html')
