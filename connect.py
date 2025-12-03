from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import bcrypt
import secrets
from datetime import datetime, date, timedelta
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from decimal import Decimal, InvalidOperation
from sqlalchemy import and_, or_, func
from typing import Optional
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os
import smtplib
import ssl
from email.message import EmailMessage
from dotenv import load_dotenv
load_dotenv()

# FLASK APP SETUP
app = Flask(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465  # SSL port

EMAIL_USER = os.environ.get("PHARMA_EMAIL_USER", "pharmafulfill@gmail.com")
EMAIL_PASSWORD = os.environ.get("PHARMA_EMAIL_APP_PASSWORD")  # no default


def send_email(to_address: str, subject: str, body: str) -> bool:
    if not EMAIL_PASSWORD:
        print("Email password not configured; skipping send_email.")
        return False

    msg = EmailMessage()
    msg["From"] = EMAIL_USER
    msg["To"] = to_address
    msg["Subject"] = subject
    msg.set_content(body)

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
    return True


# Allow React dev servers to call this API
CORS(app, supports_credentials=True, origins=[
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
])

# Secret key for tokens, etc.
app.secret_key = secrets.token_hex(16)

# DATABASE CONFIG (LOCAL MYSQL WORKBENCH)
app.config["SQLALCHEMY_DATABASE_URI"] = (
    "mysql+pymysql://root:khual@localhost/pharmafulfill_database"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# For generating email verification tokens (used by /api/auth/verify)
serializer = URLSafeTimedSerializer(app.secret_key)

# Default store used for inventory deductions during verification
DEFAULT_STORE_ID = 1


# MODELS (MAPPED TO YOUR MYSQL SCHEMA)
class Insurance(db.Model):
    __tablename__ = "Insurance"
    InsuranceID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Provider = db.Column(db.String(80))
    Plan = db.Column(db.String(80))
    Deductible = db.Column(db.Numeric(8, 2))
    Notes = db.Column(db.String(255))


class Patient(db.Model):
    __tablename__ = "Patient"
    PatientID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    FirstName = db.Column(db.String(50), nullable=False)
    LastName = db.Column(db.String(50), nullable=False)
    DOB = db.Column(db.Date, nullable=False)
    Phone = db.Column(db.String(21))
    Email = db.Column(db.String(250), unique=True, nullable=False)
    Address = db.Column(db.String(300))
    Password = db.Column(db.String(255))  # bcrypt hash (utf-8 string)
    InsuranceID = db.Column(db.Integer, db.ForeignKey("Insurance.InsuranceID"))
    Verified = db.Column(db.Boolean, default=False)


class Prescriber(db.Model):
    __tablename__ = "Prescriber"
    PrescriberID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Name = db.Column(db.String(100))
    LicenseNo = db.Column(db.String(40), unique=True)
    Specialty = db.Column(db.String(60))


class Drug(db.Model):
    __tablename__ = "Drug"
    DrugID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    NDC = db.Column(db.String(12), unique=True)
    Name = db.Column(db.String(120))
    Strength = db.Column(db.String(40))
    Form = db.Column(db.String(40))


class Store(db.Model):
    __tablename__ = "Store"
    StoreID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Name = db.Column(db.String(80))
    Address = db.Column(db.String(160))


class Inventory(db.Model):
    __tablename__ = "Inventory"
    StoreID = db.Column(db.Integer, db.ForeignKey("Store.StoreID"), primary_key=True)
    DrugID = db.Column(db.Integer, db.ForeignKey("Drug.DrugID"), primary_key=True)
    StockQty = db.Column(db.Integer, default=0)
    ExpiresOn = db.Column(db.Date)
    UnitPrice = db.Column(db.Numeric(10, 2))


class Staff(db.Model):
    __tablename__ = "Staff"
    StaffID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    FullName = db.Column(db.String(100))
    Username = db.Column(db.String(60), unique=True)
    Role = db.Column(db.String(20), nullable=False)  # 'Tech','Pharmacist','Admin'
    Email = db.Column(db.String(120), unique=True, nullable=False)
    PwdHash = db.Column(db.LargeBinary(60), nullable=False)  # bcrypt hash bytes


class Prescription(db.Model):
    __tablename__ = "Prescription"
    RxID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    PatientID = db.Column(db.Integer, db.ForeignKey("Patient.PatientID"), nullable=False)
    PrescriberID = db.Column(db.Integer, db.ForeignKey("Prescriber.PrescriberID"), nullable=False)
    DrugID = db.Column(db.Integer, db.ForeignKey("Drug.DrugID"), nullable=False)
    Dosage = db.Column(db.String(120))
    Qty = db.Column(db.Integer)
    RefillsTotal = db.Column(db.Integer)
    RefillsUsed = db.Column(db.Integer, default=0)
    DateIssued = db.Column(db.Date)
    LastFillDate = db.Column(db.DateTime)
    Status = db.Column(db.String(30), default="Pending")
    Instructions = db.Column(db.String(256), nullable=False)

    # Queue + details fields
    Priority = db.Column(db.String(20))      # 'urgent', 'normal', 'routine', etc.
    EntryMethod = db.Column(db.String(20))   # 'paper', 'phone', 'fax', 'walkin', 'electronic'
    DaysSupply = db.Column(db.Integer)       # e.g., 30, 60, 90


class Fill(db.Model):
    __tablename__ = "Fill"
    FillID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    RxID = db.Column(db.Integer, db.ForeignKey("Prescription.RxID"), nullable=False)
    StaffID = db.Column(db.Integer, db.ForeignKey("Staff.StaffID"), nullable=False)
    DateFilled = db.Column(db.DateTime)
    QtyDispensed = db.Column(db.Integer)
    Stage = db.Column(db.String(20), default="Printed")  # Printed/Filling/Filled/Ready/Sold


class Billing(db.Model):
    __tablename__ = "Billing"
    BillID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    PatientID = db.Column(db.Integer, db.ForeignKey("Patient.PatientID"), nullable=False)
    RxID = db.Column(db.Integer, db.ForeignKey("Prescription.RxID"))
    Amount = db.Column(db.Numeric(10, 2))
    Covered = db.Column(db.Boolean)
    Status = db.Column(db.String(20))
    DateBilled = db.Column(db.Date)


class RefillRequest(db.Model):
    __tablename__ = "RefillRequest"
    RequestID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    RxID = db.Column(db.Integer, db.ForeignKey("Prescription.RxID"), nullable=False)
    PatientID = db.Column(db.Integer, db.ForeignKey("Patient.PatientID"), nullable=False)
    RequestedOn = db.Column(db.DateTime, default=datetime.utcnow)
    Status = db.Column(db.String(20), default="Pending")  # Pending/Approved/Denied
    Notes = db.Column(db.String(255))


# HELPER: EMAIL VERIFICATION TOKENS
def generate_verification_token(email: str) -> str:
    return serializer.dumps(email, salt="email-confirm")


def confirm_verification_token(token: str, max_age_seconds: int = 3600):
    try:
        email = serializer.loads(token, salt="email-confirm", max_age=max_age_seconds)
    except (SignatureExpired, BadSignature):
        return None
    return email

def parse_decimal(value):
    """
    Safely parse prices coming in as '12.5', '12.50', 12.5, etc.
    Returns Decimal or None.
    """
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def is_active_rx_status(status: Optional[str]) -> bool:
    """
    Treat these workflow statuses as 'active/current' for display.
    """
    if not status:
        return False
    s = status.lower()
    return s in {
        "pending",
        "new",
        "queued",
        "in progress",
        "filling",
        "pending verification",
        "printed",
        "ready",
    }


# SEED ADMIN ACCOUNT "KHUΑL"
def seed_admin():
    """
    Ensure at least one Admin staff account exists:
      FullName: Khual
      Username: khual
      Email: admin@pharmafulfill.test
      Password: Admin@123
    """
    with app.app_context():
        existing = Staff.query.filter_by(Username="khual", Role="Admin").first()
        if existing:
            print("Admin 'khual' already exists.")
            return

        pwd_hash = bcrypt.hashpw("Admin@123".encode("utf-8"), bcrypt.gensalt())

        admin = Staff(
            FullName="Khual",
            Username="khual",
            Role="Admin",
            Email="admin@pharmafulfill.test",
            PwdHash=pwd_hash,
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin account: username='khual', password='Admin@123'")


# BASIC HEALTH CHECK
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


# AUTH: PATIENT SIGNUP (DEV MODE: auto-verified, no email)
@app.route("/api/auth/signup/patient", methods=["POST"])
def signup_patient():
    data = request.get_json() or {}
    required = ["firstName", "lastName", "dob", "email", "password"]
    if any(field not in data or not data[field] for field in required):
        return jsonify({"error": "Missing required fields"}), 400

    # Check existing email
    existing = Patient.query.filter_by(Email=data["email"]).first()
    if existing:
        return jsonify({"error": "Email already in use"}), 400

    # Hash password
    pwd_hash = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt())

    try:
        dob = datetime.strptime(data["dob"], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid DOB format, use YYYY-MM-DD"}), 400

    new_patient = Patient(
        FirstName=data["firstName"],
        LastName=data["lastName"],
        DOB=dob,
        Email=data["email"],
        Password=pwd_hash.decode("utf-8"),
        Phone=data.get("phone"),
        Address=data.get("address"),
        InsuranceID=data.get("insuranceId"),
        Verified=True,  # DEV: auto-verify
    )
    db.session.add(new_patient)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Account created and verified (dev mode). You can log in now."
    }), 201


@app.route("/api/auth/change-password", methods=["POST"])
def change_password():
    """
    Change password for Patient or Staff.

    JSON body:
    {
      "userId": 1,
      "role": "Patient" | "Pharmacist" | "Tech" | "Admin",
      "currentPassword": "...",
      "newPassword": "..."
    }
    """
    data = request.get_json() or {}
    user_id = data.get("userId")
    role = data.get("role")
    current_password = data.get("currentPassword")
    new_password = data.get("newPassword")

    if not user_id or not role or not current_password or not new_password:
        return jsonify({"error": "Missing required fields"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters."}), 400

    # Patient passwords are stored in Patient.Password as a utf-8 string hash
    if role == "Patient":
        user = Patient.query.get(user_id)
        if not user or not user.Password:
            return jsonify({"error": "User not found"}), 404

        if not bcrypt.checkpw(current_password.encode("utf-8"),
                              user.Password.encode("utf-8")):
            return jsonify({"error": "Current password is incorrect."}), 401

        new_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
        user.Password = new_hash.decode("utf-8")
        db.session.commit()

        return jsonify({"success": True, "message": "Password updated."}), 200

    # Staff passwords are stored in Staff.PwdHash as bytes
    elif role in ("Pharmacist", "Tech", "Admin"):
        staff = Staff.query.get(user_id)
        if not staff or staff.Role != role:
            return jsonify({"error": "User not found"}), 404

        if not bcrypt.checkpw(current_password.encode("utf-8"), staff.PwdHash):
            return jsonify({"error": "Current password is incorrect."}), 401

        new_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
        staff.PwdHash = new_hash
        db.session.commit()

        return jsonify({"success": True, "message": "Password updated."}), 200

    else:
        return jsonify({"error": "Invalid role"}), 400


# AUTH: STAFF SIGNUP REQUEST (PHARMACIST / TECH ONLY)
@app.route("/api/auth/signup/staff-request", methods=["POST"])
def signup_staff_request():
    data = request.get_json() or {}
    full_name = data.get("fullName")
    role = data.get("role")
    email = data.get("email")
    password = data.get("password")

    # Basic validation
    if not full_name or not role or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    # Disallow Admin signup via frontend
    if role == "Admin":
        return jsonify({"error": "Admin accounts cannot be requested via this form."}), 403

    # Only allow Pharmacist or Tech
    if role not in ("Pharmacist", "Tech"):
        return jsonify({"error": "Invalid role for staff signup."}), 400

    # Check if email already exists in Staff
    existing = Staff.query.filter_by(Email=email).first()
    if existing:
        return jsonify({"error": "Email already in use."}), 400

    # Hash password (stored as bytes in PwdHash)
    pwd_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    new_staff = Staff(
        FullName=full_name,
        Username=None,
        Role=role,
        Email=email,
        PwdHash=pwd_hash,
    )

    db.session.add(new_staff)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Staff account created. An admin can manage your access.",
        "staffId": new_staff.StaffID,
    }), 201


# AUTH: EMAIL VERIFICATION
@app.route("/api/auth/verify/<token>", methods=["GET"])
def verify_email(token):
    email = confirm_verification_token(token, max_age_seconds=3600)
    if not email:
        return jsonify({"error": "Invalid or expired verification link"}), 400

    user = Patient.query.filter_by(Email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.Verified:
        return jsonify({"success": True, "message": "Account already verified."}), 200

    user.Verified = True
    db.session.commit()

    return jsonify({"success": True, "message": "Email verified successfully."}), 200


# AUTH: LOGIN (ALL ROLES)
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    identifier = data.get("identifier")
    password = data.get("password")
    role = data.get("role")

    if not identifier or not password or not role:
        return jsonify({"error": "identifier, password, and role are required"}), 400

    # Patients → Patient table, email-only
    if role == "Patient":
        user = Patient.query.filter_by(Email=identifier).first()
        if not user or not user.Password:
            return jsonify({"error": "Invalid credentials"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), user.Password.encode("utf-8")):
            return jsonify({"error": "Invalid credentials"}), 401

        if not user.Verified:
            return jsonify({"error": "Please verify your email before logging in."}), 403

        return jsonify({
            "user": {
                "id": user.PatientID,
                "name": f"{user.FirstName} {user.LastName}",
                "email": user.Email,
                "role": "Patient",
            }
        }), 200

    # Pharmacists → Staff table, email-only
    elif role == "Pharmacist":
        staff = Staff.query.filter_by(Email=identifier, Role="Pharmacist").first()
        if not staff:
            return jsonify({"error": "Invalid credentials"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), staff.PwdHash):
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({
            "user": {
                "id": staff.StaffID,
                "name": staff.FullName,
                "email": staff.Email,
                "role": "Pharmacist",
            }
        }), 200

    # Tech/Admin → Staff table, email OR username
    elif role in ("Tech", "Admin"):
        staff = Staff.query.filter(
            and_(
                Staff.Role == role,
                or_(Staff.Email == identifier, Staff.Username == identifier),
            )
        ).first()

        if not staff:
            return jsonify({"error": "Invalid credentials"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), staff.PwdHash):
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({
            "user": {
                "id": staff.StaffID,
                "name": staff.FullName,
                "email": staff.Email,
                "role": staff.Role,
                "username": staff.Username,
            }
        }), 200

    else:
        return jsonify({"error": "Invalid role"}), 400


# PATIENT PRESCRIPTIONS (patient view + shared with PatientPrescriptionHistory)
@app.route("/api/patient/prescriptions", methods=["GET"])
def get_patient_prescriptions():
    patient_id = request.args.get("patientId", type=int)
    if not patient_id:
        return jsonify({"error": "patientId is required"}), 400

    q = (
        db.session.query(
            Prescription.RxID,
            Drug.Name.label("DrugName"),
            Drug.Strength,
            Drug.Form,
            Prescription.Dosage,
            Prescription.Qty,
            Prescription.RefillsTotal,
            Prescription.RefillsUsed,
            Prescription.DateIssued,
            Prescription.LastFillDate,
            Prescription.Status,
            Prescription.Instructions,
            Prescription.Priority,
            Prescription.EntryMethod,
            Prescription.DaysSupply,
            Prescriber.Name.label("PrescriberName"),
        )
        .join(Drug, Prescription.DrugID == Drug.DrugID)
        .join(Prescriber, Prescription.PrescriberID == Prescriber.PrescriberID)
        .filter(Prescription.PatientID == patient_id)
        .order_by(Prescription.DateIssued.desc(), Prescription.RxID.desc())
    )

    rows = q.all()
    result = []
    for row in rows:
        result.append({
            "rxId": row.RxID,
            "drugName": row.DrugName,
            "strength": row.Strength,
            "form": row.Form,
            "dosage": row.Dosage,
            "quantity": row.Qty,
            "refillsTotal": row.RefillsTotal,
            "refillsUsed": row.RefillsUsed,
            "dateIssued": row.DateIssued.isoformat() if row.DateIssued else None,
            "lastFillDate": row.LastFillDate.isoformat() if row.LastFillDate else None,
            "status": row.Status,
            "instructions": row.Instructions,
            "priority": row.Priority,
            "entryMethod": row.EntryMethod,
            "daysSupply": row.DaysSupply,
            "prescriberName": row.PrescriberName,
        })

    return jsonify({"prescriptions": result}), 200


# STORES: LIST ALL PHARMACY LOCATIONS
@app.route("/api/stores", methods=["GET"])
def get_stores():
    stores = Store.query.order_by(Store.StoreID).all()
    result = [
        {
            "storeId": s.StoreID,
            "name": s.Name,
            "address": s.Address,
        }
        for s in stores
    ]
    return jsonify(result), 200


# REFILL REQUEST ROUTES
@app.route("/api/refill-requests", methods=["POST"])
def create_refill_request():
    data = request.get_json() or {}
    rx_id = data.get("rxId")
    patient_id = data.get("patientId")
    notes = data.get("notes")

    if not rx_id or not patient_id:
        return jsonify({"error": "rxId and patientId are required"}), 400

    req = RefillRequest(
        RxID=rx_id,
        PatientID=patient_id,
        Notes=notes,
    )
    db.session.add(req)
    db.session.commit()

    return jsonify({
        "requestId": req.RequestID,
        "status": req.Status,
        "requestedOn": req.RequestedOn.isoformat(),
    }), 201


@app.route("/api/refill-requests/patient", methods=["GET"])
def get_refill_requests_for_patient():
    patient_id = request.args.get("patientId", type=int)
    if not patient_id:
        return jsonify({"error": "patientId is required"}), 400

    reqs = (
        RefillRequest.query
        .filter_by(PatientID=patient_id)
        .order_by(RefillRequest.RequestedOn.desc())
        .all()
    )

    result = []
    for r in reqs:
        result.append({
            "requestId": r.RequestID,
            "rxId": r.RxID,
            "patientId": r.PatientID,
            "requestedOn": r.RequestedOn.isoformat(),
            "status": r.Status,
            "notes": r.Notes,
        })

    return jsonify({"requests": result}), 200


# ADMIN: INVENTORY LIST FOR DASHBOARD
@app.route("/api/inventory", methods=["GET"])
def get_inventory():
    rows = (
        db.session.query(
            Inventory.StoreID.label("storeId"),
            Inventory.DrugID.label("drugId"),
            Drug.Name.label("drugName"),
            Drug.NDC.label("ndc"),
            Store.Name.label("storeName"),
            Inventory.StockQty.label("stockQty"),
            Inventory.ExpiresOn.label("expiresOn"),
            Inventory.UnitPrice.label("unitPrice"),
        )
        .join(Drug, Inventory.DrugID == Drug.DrugID)
        .join(Store, Inventory.StoreID == Store.StoreID)
        .all()
    )

    result = []
    for row in rows:
        result.append(
            {
                "storeId": row.storeId,
                "drugId": row.drugId,
                "name": row.drugName,
                "ndc": row.ndc,
                "storeName": row.storeName,
                "stockQty": row.stockQty,
                "expiresOn": row.expiresOn.isoformat() if row.expiresOn else None,
                "unitPrice": float(row.unitPrice) if row.unitPrice is not None else None,
            }
        )

    return jsonify(result), 200


# ADMIN: CREATE or UPSERT INVENTORY ITEM
@app.route("/api/inventory", methods=["POST"])
def create_inventory_item():
    """
    Creates or updates an inventory record for (storeId, ndc).
    If the drug doesn't exist by NDC, it is created.

    JSON body:
    {
      "storeId": 1,
      "name": "Atorvastatin 10mg",
      "ndc": "123456789012",
      "stockQty": 100,
      "expiresOn": "2026-12-31" | null,
      "price": 12.5  // or "unitPrice"
    }
    """
    data = request.get_json() or {}

    store_id = data.get("storeId")
    ndc = (data.get("ndc") or "").strip()
    name = (data.get("name") or "").strip()
    stock_qty = data.get("stockQty", 0)
    expires_on = data.get("expiresOn")

    # accept either "price" or "unitPrice" from frontend
    unit_price_raw = data.get("price", data.get("unitPrice"))

    if not store_id or not ndc or not name:
        return jsonify({"error": "storeId, ndc, and name are required"}), 400

    # Ensure store exists
    store = Store.query.get(store_id)
    if not store:
        return jsonify({"error": "Store not found"}), 404

    # Find or create Drug by NDC
    drug = Drug.query.filter_by(NDC=ndc).first()
    if not drug:
        drug = Drug(NDC=ndc, Name=name)
        db.session.add(drug)
        db.session.flush()  # get DrugID

    # Find or create Inventory row
    inv = Inventory.query.filter_by(StoreID=store_id, DrugID=drug.DrugID).first()
    if not inv:
        inv = Inventory(StoreID=store_id, DrugID=drug.DrugID)
        db.session.add(inv)

    # Stock quantity
    try:
        inv.StockQty = int(stock_qty or 0)
    except (ValueError, TypeError):
        inv.StockQty = 0

    # Expiry date
    if expires_on:
        try:
            inv.ExpiresOn = datetime.strptime(expires_on, "%Y-%m-%d").date()
        except ValueError:
            inv.ExpiresOn = None
    else:
        inv.ExpiresOn = None

    # Price (store as Decimal in UnitPrice)
    inv.UnitPrice = parse_decimal(unit_price_raw)

    db.session.commit()

    return jsonify({
        "storeId": inv.StoreID,
        "drugId": inv.DrugID,
        "name": drug.Name,
        "ndc": drug.NDC,
        "storeName": store.Name,
        "stockQty": inv.StockQty,
        "expiresOn": inv.ExpiresOn.isoformat() if inv.ExpiresOn else None,
        "unitPrice": float(inv.UnitPrice) if inv.UnitPrice is not None else None,
    }), 201


# ADMIN: UPDATE INVENTORY ITEM
@app.route("/api/inventory/<int:store_id>/<int:drug_id>", methods=["PUT"])
def update_inventory_item(store_id, drug_id):
    """
    Update an existing inventory record.
    JSON body can include:
    {
      "name": "...",
      "ndc": "...",
      "stockQty": 120,
      "expiresOn": "2026-12-31" | "",
      "price": 15.0  // or "unitPrice"
    }
    """
    data = request.get_json() or {}
    inv = Inventory.query.filter_by(StoreID=store_id, DrugID=drug_id).first()
    if not inv:
        return jsonify({"error": "Inventory record not found"}), 404

    drug = Drug.query.get(drug_id)
    if not drug:
        return jsonify({"error": "Drug not found"}), 404

    name = (data.get("name") or "").strip()
    ndc = (data.get("ndc") or "").strip()

    if name:
        drug.Name = name
    if ndc:
        drug.NDC = ndc

    stock_qty = data.get("stockQty")
    if stock_qty is not None:
        try:
            inv.StockQty = int(stock_qty)
        except (ValueError, TypeError):
            pass

    expires_on = data.get("expiresOn")
    if expires_on is not None:
        if expires_on == "":
            inv.ExpiresOn = None
        else:
            try:
                inv.ExpiresOn = datetime.strptime(expires_on, "%Y-%m-%d").date()
            except ValueError:
                pass

    # accept either "price" or "unitPrice"
    unit_price_raw = data.get("price", data.get("unitPrice"))
    if unit_price_raw is not None:
        inv.UnitPrice = parse_decimal(unit_price_raw)

    db.session.commit()

    return jsonify({
        "success": True
    }), 200


# ADMIN: DELETE INVENTORY ITEM
@app.route("/api/inventory/<int:store_id>/<int:drug_id>", methods=["DELETE"])
def delete_inventory_item(store_id, drug_id):
    inv = Inventory.query.filter_by(StoreID=store_id, DrugID=drug_id).first()
    if not inv:
        return jsonify({"error": "Inventory record not found"}), 404

    db.session.delete(inv)
    db.session.commit()

    return jsonify({"success": True}), 200


# ADMIN: USER LIST FOR DASHBOARD
@app.route("/api/users", methods=["GET"])
def get_all_users():
    users = []

    patients = Patient.query.all()
    for p in patients:
        users.append(
            {
                "id": p.PatientID,
                "userType": "Patient",
                "name": f"{p.FirstName} {p.LastName}",
                "email": p.Email,
                "role": "Patient",
                "status": "Active" if p.Verified else "Inactive",
                "phone": p.Phone,
                "dob": p.DOB.isoformat() if p.DOB else None,
                "staffId": None,
                "joined": None,  # no created-at column yet
            }
        )

    staff_members = Staff.query.all()
    for s in staff_members:
        users.append(
            {
                "id": s.StaffID,
                "userType": "Staff",
                "name": s.FullName,
                "email": s.Email,
                "role": s.Role,
                "status": "Active",
                "phone": None,
                "dob": None,
                "staffId": s.Username,
                "joined": None,
            }
        )

    return jsonify(users), 200


@app.route("/api/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    """
    Admin update of basic profile fields for Patient or Staff.
    Expects JSON:
    {
      "userType": "Patient" | "Staff",
      "name": "...",
      "email": "...",
      "phone": "... or null",
      "dob": "YYYY-MM-DD" | null,
      "staffId": "username or null"
    }
    """
    data = request.get_json() or {}
    user_type = data.get("userType")

    if user_type not in ("Patient", "Staff"):
        return jsonify({"error": "userType must be 'Patient' or 'Staff'"}), 400

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()

    if not name or not email:
        return jsonify({"error": "name and email are required"}), 400

    if user_type == "Patient":
        patient = Patient.query.get(user_id)
        if not patient:
            return jsonify({"error": "Patient not found"}), 404

        # Ensure email uniqueness across patients
        existing = (
            Patient.query
            .filter(Patient.Email == email, Patient.PatientID != user_id)
            .first()
        )
        if existing:
            return jsonify({"error": "Email already in use by another patient"}), 400

        parts = name.split()
        patient.FirstName = parts[0]
        patient.LastName = " ".join(parts[1:]) if len(parts) > 1 else parts[0]
        patient.Email = email
        patient.Phone = data.get("phone")

        dob_str = data.get("dob")
        if dob_str:
            try:
                patient.DOB = datetime.strptime(dob_str, "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Invalid DOB format, use YYYY-MM-DD"}), 400

        db.session.commit()
        return jsonify({"success": True}), 200

    # Staff update
    staff = Staff.query.get(user_id)
    if not staff:
        return jsonify({"error": "Staff not found"}), 404

    existing_staff = (
        Staff.query
        .filter(Staff.Email == email, Staff.StaffID != user_id)
        .first()
    )
    if existing_staff:
        return jsonify({"error": "Email already in use by another staff member"}), 400

    username = data.get("staffId")
    if username:
        username = username.strip()
        if username:
            existing_username = (
                Staff.query
                .filter(Staff.Username == username, Staff.StaffID != user_id)
                .first()
            )
            if existing_username:
                return jsonify({"error": "Staff ID/username already in use"}), 400
            staff.Username = username

    staff.FullName = name
    staff.Email = email
    # No phone/DOB columns for Staff in current schema

    db.session.commit()
    return jsonify({"success": True}), 200


@app.route("/api/users/<int:user_id>/password", methods=["PUT"])
def admin_change_user_password(user_id):
    """
    Admin-only password reset for Patient or Staff.
    JSON:
    {
      "userType": "Patient" | "Staff",
      "newPassword": "..."
    }
    """
    data = request.get_json() or {}
    user_type = data.get("userType")
    new_password = (data.get("newPassword") or "").strip()

    if user_type not in ("Patient", "Staff"):
        return jsonify({"error": "userType must be 'Patient' or 'Staff'"}), 400

    if not new_password:
        return jsonify({"error": "newPassword is required"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if user_type == "Patient":
        patient = Patient.query.get(user_id)
        if not patient:
            return jsonify({"error": "Patient not found"}), 404

        new_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
        patient.Password = new_hash.decode("utf-8")
        db.session.commit()
        return jsonify({"success": True}), 200

    staff = Staff.query.get(user_id)
    if not staff:
        return jsonify({"error": "Staff not found"}), 404

    new_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    staff.PwdHash = new_hash
    db.session.commit()
    return jsonify({"success": True}), 200


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    """
    Admin delete for Patient or Staff.
    JSON body:
    {
      "userType": "Patient" | "Staff"
    }
    """
    data = request.get_json() or {}
    user_type = data.get("userType")

    if user_type not in ("Patient", "Staff"):
        return jsonify({"error": "userType must be 'Patient' or 'Staff'"}), 400

    try:
        if user_type == "Patient":
            patient = Patient.query.get(user_id)
            if not patient:
                return jsonify({"error": "Patient not found"}), 404

            db.session.delete(patient)
            db.session.commit()
            return jsonify({"success": True}), 200

        staff = Staff.query.get(user_id)
        if not staff:
            return jsonify({"error": "Staff not found"}), 404

        db.session.delete(staff)
        db.session.commit()
        return jsonify({"success": True}), 200

    except Exception as e:
        db.session.rollback()
        print("Delete user error:", e)
        return jsonify({
            "error": "Unable to delete user. They may have linked records."
        }), 400


# PHARMACIST: List drugs for selection
@app.route("/api/drugs", methods=["GET"])
def get_drugs():
    drugs = Drug.query.order_by(Drug.Name.asc()).all()
    result = [
        {
            "drugId": d.DrugID,
            "name": d.Name,
            "ndc": d.NDC,
            "strength": d.Strength,
            "form": d.Form,
        }
        for d in drugs
    ]
    return jsonify(result), 200


# PHARMACIST: List patients (with insurance info + phone for auto-fill)
@app.route("/api/patients", methods=["GET"])
def list_patients():
    """
    Returns basic patient info + insurance provider for pharmacist selection.
    Used by NewPrescriptionEntry and PatientRecords.

    Returns a plain array:
      [
        {
          "patientId": ...,
          "firstName": ...,
          ...
        },
        ...
      ]
    """
    rows = (
        db.session.query(
            Patient.PatientID,
            Patient.FirstName,
            Patient.LastName,
            Patient.Email,
            Patient.DOB,
            Patient.Phone,
            Insurance.Provider.label("InsuranceProvider"),
        )
        .outerjoin(Insurance, Patient.InsuranceID == Insurance.InsuranceID)
        .order_by(Patient.LastName.asc(), Patient.FirstName.asc())
        .all()
    )

    result = [
        {
            "patientId": r.PatientID,
            "firstName": r.FirstName,
            "lastName": r.LastName,
            "email": r.Email,
            "dob": r.DOB.isoformat() if r.DOB else None,
            "phone": r.Phone,
            "insuranceProvider": r.InsuranceProvider,
        }
        for r in rows
    ]

    return jsonify(result), 200


# PHARMACIST: List prescribers
@app.route("/api/prescribers", methods=["GET"])
def get_prescribers():
    prescribers = Prescriber.query.order_by(Prescriber.Name.asc()).all()
    result = [
        {
            "prescriberId": pr.PrescriberID,
            "name": pr.Name,
            "licenseNo": pr.LicenseNo,
            "specialty": pr.Specialty,
        }
        for pr in prescribers
    ]
    return jsonify(result), 200


# INSURANCE: list all insurance plans (for dropdowns)
@app.route("/api/insurances", methods=["GET"])
def get_insurances():
    ins = Insurance.query.order_by(Insurance.Provider.asc()).all()
    result = [
        {
            "insuranceId": i.InsuranceID,
            "provider": i.Provider,
            "plan": i.Plan,
            "deductible": float(i.Deductible) if i.Deductible is not None else None,
            "notes": i.Notes,
        }
        for i in ins
    ]
    return jsonify(result), 200


# PHARMACIST: QUEUE (Pending + In Progress only)
@app.route("/api/pharmacist/queue", methods=["GET"])
def get_pharmacist_queue():
    """
    Returns prescriptions in Pending or In Progress status for the pharmacist queue.

    Shape:
    {
      "items": [
        {
          "id": 123,
          "rxId": "RX-123",
          "patient": "Last First",
          "medication": "Drug Name",
          "quantity": 30,
          "priority": "Urgent" | "Normal" | "Routine",
          "timeInQueue": "Just added" | "1 day" | "3 days",
          "prescriber": "Dr. Smith",
          "insurance": "Blue Cross" | null,
          "status": "Pending" | "In Progress"
        },
        ...
      ]
    }
    """
    rows = (
        db.session.query(
            Prescription.RxID,
            Prescription.Qty,
            Prescription.Priority,
            Prescription.DateIssued,
            Prescription.Status,
            Prescription.EntryMethod,
            Patient.FirstName,
            Patient.LastName,
            Drug.Name.label("DrugName"),
            Prescriber.Name.label("PrescriberName"),
            Insurance.Provider.label("InsuranceProvider"),
        )
        .join(Patient, Prescription.PatientID == Patient.PatientID)
        .join(Drug, Prescription.DrugID == Drug.DrugID)
        .join(Prescriber, Prescription.PrescriberID == Prescriber.PrescriberID)
        .outerjoin(Insurance, Patient.InsuranceID == Insurance.InsuranceID)
        .filter(Prescription.Status.in_(["Pending", "In Progress"]))
        .order_by(Prescription.DateIssued.desc(), Prescription.RxID.desc())
        .all()
    )

    items = []
    today = datetime.utcnow().date()

    for r in rows:
        if r.DateIssued:
            delta_days = (today - r.DateIssued).days
            if delta_days <= 0:
                wait_str = "Just added"
            elif delta_days == 1:
                wait_str = "1 day"
            else:
                wait_str = f"{delta_days} days"
        else:
            wait_str = "N/A"

        priority_label = (r.Priority or "normal").capitalize()

        items.append({
            "id": r.RxID,
            "rxId": f"RX-{r.RxID}",
            "patient": f"{r.LastName} {r.FirstName}",
            "medication": r.DrugName,
            "quantity": r.Qty,
            "priority": priority_label,
            "timeInQueue": wait_str,
            "prescriber": r.PrescriberName,
            "insurance": r.InsuranceProvider,
            "status": r.Status,
            "entryMethod": r.EntryMethod,
        })

    return jsonify({"items": items}), 200


# PHARMACIST: CREATE ELECTRONIC / MANUAL PRESCRIPTION
@app.route("/api/pharmacist/prescriptions", methods=["POST"])
def create_prescription():
    """
    JSON body:
    {
      "patientId": 1,
      "prescriberId": 2,
      "drugId": 3,
      "dosage": "1 tablet by mouth once daily",
      "qty": 30,
      "refillsTotal": 2,
      "instructions": "Take with food or milk",
      "daysSupply": 30,
      "priority": "urgent" | "normal" | "routine",
      "entryMethod": "paper" | "phone" | "fax" | "walkin" | "electronic",
      "dateIssued": "YYYY-MM-DD" (optional)
    }
    """
    data = request.get_json() or {}

    patient_id = data.get("patientId")
    prescriber_id = data.get("prescriberId")
    drug_id = data.get("drugId")
    dosage = data.get("dosage")
    qty = data.get("qty")
    refills_total = data.get("refillsTotal")
    instructions = data.get("instructions")
    days_supply = data.get("daysSupply")
    priority = data.get("priority") or "normal"
    entry_method = data.get("entryMethod") or "electronic"
    date_issued_str = data.get("dateIssued")

    # Basic validation
    missing_fields = []
    for field_name, value in [
        ("patientId", patient_id),
        ("prescriberId", prescriber_id),
        ("drugId", drug_id),
        ("dosage", dosage),
        ("qty", qty),
        ("refillsTotal", refills_total),
    ]:
        if value in (None, ""):
            missing_fields.append(field_name)

    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "missing": missing_fields,
        }), 400

    # Ensure patient exists
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    # Ensure prescriber exists
    prescriber = Prescriber.query.get(prescriber_id)
    if not prescriber:
        return jsonify({"error": "Prescriber not found"}), 404

    # Ensure drug exists
    drug = Drug.query.get(drug_id)
    if not drug:
        return jsonify({"error": "Drug not found"}), 404

    # DateIssued: use provided date if given, otherwise today
    if date_issued_str:
        try:
            date_issued = datetime.strptime(date_issued_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid dateIssued format, use YYYY-MM-DD"}), 400
    else:
        date_issued = datetime.utcnow().date()

    new_rx = Prescription(
        PatientID=patient_id,
        PrescriberID=prescriber_id,
        DrugID=drug_id,
        Dosage=dosage,
        Qty=qty,
        RefillsTotal=refills_total,
        RefillsUsed=0,
        DateIssued=date_issued,
        LastFillDate=None,
        Status="Pending",
        Instructions=instructions or "",
        DaysSupply=days_supply,
        Priority=priority,
        EntryMethod=entry_method,
    )

    db.session.add(new_rx)
    db.session.commit()

    return jsonify({
        "rxId": new_rx.RxID,
        "patientId": new_rx.PatientID,
        "drugId": new_rx.DrugID,
        "drugName": drug.Name,
        "strength": drug.Strength,
        "form": drug.Form,
        "dosage": new_rx.Dosage,
        "quantity": new_rx.Qty,
        "refillsTotal": new_rx.RefillsTotal,
        "refillsUsed": new_rx.RefillsUsed,
        "dateIssued": new_rx.DateIssued.isoformat() if new_rx.DateIssued else None,
        "lastFillDate": None,
        "status": new_rx.Status,
        "instructions": new_rx.Instructions,
        "priority": new_rx.Priority,
        "entryMethod": new_rx.EntryMethod,
        "daysSupply": new_rx.DaysSupply,
        "prescriberId": new_rx.PrescriberID,
        "prescriberName": prescriber.Name,
    }), 201


# PHARMACIST: GET FULL PRESCRIPTION DETAILS (for View Details)
@app.route("/api/pharmacist/prescriptions/<int:rx_id>", methods=["GET"])
def get_prescription_details(rx_id):
    """
    Returns full prescription information for pharmacist/tech dashboard.
    Includes:
    - Prescription (status, priority, entryMethod, daysSupply, etc.)
    - Patient info
    - Drug info
    - Prescriber info
    - Fill history
    """
    rx = (
        db.session.query(Prescription, Patient, Drug, Prescriber)
        .join(Patient, Prescription.PatientID == Patient.PatientID)
        .join(Drug, Prescription.DrugID == Drug.DrugID)
        .join(Prescriber, Prescription.PrescriberID == Prescriber.PrescriberID)
        .filter(Prescription.RxID == rx_id)
        .first()
    )

    if not rx:
        return jsonify({"error": "Prescription not found"}), 404

    prescription, patient, drug, prescriber = rx

    # Fill history
    fills = (
        db.session.query(Fill)
        .filter(Fill.RxID == rx_id)
        .order_by(Fill.DateFilled.desc())
        .all()
    )

    fill_history = [
        {
            "fillId": f.FillID,
            "dateFilled": f.DateFilled.isoformat() if f.DateFilled else None,
            "qtyDispensed": f.QtyDispensed,
            "stage": f.Stage
        }
        for f in fills
    ]

    return jsonify({
        "rxId": prescription.RxID,
        "status": prescription.Status,
        "priority": prescription.Priority,
        "entryMethod": prescription.EntryMethod,
        "daysSupply": prescription.DaysSupply,
        "dateIssued": prescription.DateIssued.isoformat() if prescription.DateIssued else None,
        "lastFillDate": prescription.LastFillDate.isoformat() if prescription.LastFillDate else None,
        "refillsTotal": prescription.RefillsTotal,
        "refillsUsed": prescription.RefillsUsed,
        "dosage": prescription.Dosage,
        "instructions": prescription.Instructions,
        "quantity": prescription.Qty,

        # Patient
        "patient": {
            "id": patient.PatientID,
            "firstName": patient.FirstName,
            "lastName": patient.LastName,
            "email": patient.Email,
            "dob": patient.DOB.isoformat() if patient.DOB else None,
            "phone": patient.Phone,
            "address": patient.Address,
            "insuranceId": patient.InsuranceID
        },

        # Drug
        "drug": {
            "drugId": drug.DrugID,
            "name": drug.Name,
            "strength": drug.Strength,
            "form": drug.Form,
            "ndc": drug.NDC
        },

        # Prescriber
        "prescriber": {
            "prescriberId": prescriber.PrescriberID,
            "name": prescriber.Name,
            "licenseNo": prescriber.LicenseNo,
            "specialty": prescriber.Specialty
        },

        # History
        "fillHistory": fill_history
    }), 200


# PHARMACIST: START FILLING A PRESCRIPTION
@app.route("/api/pharmacist/prescriptions/<int:rx_id>/start", methods=["POST"])
def pharmacist_start_filling(rx_id):
    """
    Mark a prescription as 'In Progress' and create a Fill record.

    JSON body:
    {
      "staffId": 1   # required (pharmacist/tech ID)
    }

    - Allowed statuses to *start* or *resume*: 'Pending', 'In Progress'
    - Other statuses (e.g., 'Pending Verification', 'Completed') -> 400
    """
    data = request.get_json() or {}
    staff_id = data.get("staffId")

    if not staff_id:
        return jsonify({"error": "staffId is required"}), 400

    # Find prescription
    rx = Prescription.query.get(rx_id)
    if not rx:
        return jsonify({"error": "Prescription not found"}), 404

    now = datetime.utcnow()

    # Already in progress → treat as resume; do not create a second fill row
    if rx.Status == "In Progress":
        return jsonify({
            "success": True,
            "message": "Prescription already in progress.",
            "rxId": rx_id,
            "status": rx.Status,
        }), 200

    # Only allow starting if Pending
    if rx.Status != "Pending":
        return jsonify({
            "error": f"Cannot start filling. Current status: {rx.Status}"
        }), 400

    # Create a Fill record (stage = Filling)
    new_fill = Fill(
        RxID=rx_id,
        StaffID=staff_id,
        DateFilled=now,
        QtyDispensed=rx.Qty,
        Stage="Filling"
    )
    db.session.add(new_fill)

    # Update prescription status
    rx.Status = "In Progress"
    rx.LastFillDate = now

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Filling started",
        "rxId": rx_id,
        "status": rx.Status,
        "fillId": new_fill.FillID,
        "stage": new_fill.Stage
    }), 200


# PHARMACIST: COMPLETE FILLING A PRESCRIPTION
@app.route("/api/pharmacist/prescriptions/<int:rx_id>/complete", methods=["POST"])
def pharmacist_complete_filling(rx_id):
    """
    Mark a prescription as fully filled.

    - Allowed current statuses: 'In Progress' or 'Pending'
    - Updates Prescription.Status -> 'Pending Verification'
    - Updates latest Fill.Stage -> 'Filled' and DateFilled -> now()
    """

    data = request.get_json() or {}
    staff_id = data.get("staffId")  # optional (for auditing)

    rx = Prescription.query.get(rx_id)
    if not rx:
        return jsonify({"error": "Prescription not found"}), 404

    if rx.Status not in ("In Progress", "Pending"):
        return jsonify({
            "error": f"Cannot complete filling. Current status: {rx.Status}"
        }), 400

    now = datetime.utcnow()

    # Find the most recent Fill row (if any)
    last_fill = (
        Fill.query
        .filter_by(RxID=rx_id)
        .order_by(Fill.DateFilled.desc())
        .first()
    )

    if last_fill:
        last_fill.Stage = "Filled"
        last_fill.DateFilled = now
        if staff_id:
            last_fill.StaffID = staff_id
    else:
        # If no Fill row exists, create one
        new_fill = Fill(
            RxID=rx_id,
            StaffID=staff_id or 1,  # TODO: replace with real logged-in pharmacist ID
            DateFilled=now,
            QtyDispensed=rx.Qty,
            Stage="Filled",
        )
        db.session.add(new_fill)

    rx.Status = "Pending Verification"
    rx.LastFillDate = now

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Prescription moved to Pending Verification.",
        "rxId": rx_id,
        "status": rx.Status,
    }), 200


# TECH / DASHBOARD: LIST ONLY PENDING VERIFICATION ITEMS
@app.route('/api/pharmacist/pending-verification', methods=['GET'])
def pharmacist_pending_verification():
    """
    Returns prescriptions that are in 'Pending Verification' status,
    in the same shape as /api/pharmacist/queue (wrapped in { items: [...] }).
    """
    rows = (
        db.session.query(
            Prescription.RxID,
            Prescription.Qty,
            Prescription.Priority,
            Prescription.DateIssued,
            Prescription.Status,
            Patient.FirstName,
            Patient.LastName,
            Drug.Name.label("DrugName"),
            Prescriber.Name.label("PrescriberName"),
            Insurance.Provider.label("InsuranceProvider"),
        )
        .join(Patient, Prescription.PatientID == Patient.PatientID)
        .join(Drug, Prescription.DrugID == Drug.DrugID)
        .join(Prescriber, Prescription.PrescriberID == Prescriber.PrescriberID)
        .outerjoin(Insurance, Patient.InsuranceID == Insurance.InsuranceID)
        .filter(Prescription.Status == "Pending Verification")
        .order_by(Prescription.DateIssued.asc(), Prescription.RxID.asc())
        .all()
    )

    items = []
    today = datetime.utcnow().date()

    for r in rows:
        if r.DateIssued:
            delta_days = (today - r.DateIssued).days
            if delta_days <= 0:
                wait_str = "Just added"
            elif delta_days == 1:
                wait_str = "1 day"
            else:
                wait_str = f"{delta_days} days"
        else:
            wait_str = "N/A"

        priority_label = (r.Priority or "normal").capitalize()

        items.append({
            "id": r.RxID,
            "rxId": f"RX-{r.RxID}",
            "patient": f"{r.LastName} {r.FirstName}",
            "medication": r.DrugName,
            "quantity": r.Qty,
            "priority": priority_label,
            "timeInQueue": wait_str,
            "prescriber": r.PrescriberName,
            "insurance": r.InsuranceProvider,
            "status": r.Status,
        })

    return jsonify({"items": items}), 200


@app.route("/api/tech/verification/<int:rx_id>/approve", methods=["POST"])
def tech_approve_verification(rx_id):
    """
    Technician approves at verification step.

    Behavior:
      - Only allowed when Prescription.Status == 'Pending Verification'
      - Decrements Inventory.StockQty at DEFAULT_STORE_ID for the Rx's DrugID
      - If not enough stock, returns 400 and does not change anything
      - Latest Fill.Stage -> 'Ready'
      - Prescription.Status -> 'Ready'
    """
    data = request.get_json() or {}
    tech_id = data.get("techId")

    rx = Prescription.query.get(rx_id)
    if not rx:
        return jsonify({"error": "Prescription not found"}), 404

    if rx.Status != "Pending Verification":
        return jsonify({
            "error": f"Cannot approve. Current status is {rx.Status}."
        }), 400

    # Determine how many units to decrement
    needed_qty = rx.Qty or 0
    if needed_qty < 0:
        needed_qty = 0

    # Find inventory for this drug at the default store
    inv = Inventory.query.filter_by(
        StoreID=DEFAULT_STORE_ID,
        DrugID=rx.DrugID
    ).first()

    if not inv:
        return jsonify({
            "error": "No inventory record found for this drug at the default store.",
            "storeId": DEFAULT_STORE_ID,
            "drugId": rx.DrugID,
        }), 400

    current_stock = inv.StockQty or 0

    # If we need stock and do not have enough, block approval
    if needed_qty > 0 and current_stock < needed_qty:
        return jsonify({
            "error": "Not enough stock to approve verification.",
            "available": int(current_stock),
            "needed": int(needed_qty),
            "storeId": inv.StoreID,
            "drugId": inv.DrugID,
        }), 400

    # Decrement stock only if there is a positive quantity
    if needed_qty > 0:
        inv.StockQty = current_stock - needed_qty

    now = datetime.utcnow()

    # Update the most recent Fill record if one exists
    last_fill = (
        Fill.query
        .filter_by(RxID=rx_id)
        .order_by(Fill.DateFilled.desc())
        .first()
    )

    if last_fill:
        last_fill.Stage = "Ready"
        last_fill.DateFilled = now
        if tech_id:
            last_fill.StaffID = tech_id

    # Mark prescription as Ready for pickup
    rx.Status = "Ready"
    rx.LastFillDate = now

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Prescription approved and marked Ready. Inventory updated.",
        "rxId": rx.RxID,
        "status": rx.Status,
        "storeId": inv.StoreID,
        "drugId": inv.DrugID,
        "remainingStock": int(inv.StockQty),
        "quantityDispensed": int(needed_qty),
    }), 200


@app.route("/api/tech/verification/<int:rx_id>/reject", methods=["POST"])
def tech_reject_verification(rx_id):
    """
    Technician rejects at verification step.

    - Only allowed when Prescription.Status == 'Pending Verification'
    - Sets Prescription.Status -> 'Verification Rejected'
    - Latest Fill.Stage -> 'Issue' (if a Fill exists)
    - Stores reason only in the response for now (no extra column).
    """

    data = request.get_json() or {}
    staff_id = data.get("staffId")  # optional, for auditing
    reason = data.get("reason")

    if not reason or not reason.strip():
        return jsonify({"error": "Reason is required"}), 400

    rx = Prescription.query.get(rx_id)
    if not rx:
        return jsonify({"error": "Prescription not found"}), 404

    if rx.Status != "Pending Verification":
        return jsonify({
            "error": f"Cannot reject. Current status is {rx.Status}."
        }), 400

    now = datetime.utcnow()

    last_fill = (
        Fill.query
        .filter_by(RxID=rx_id)
        .order_by(Fill.DateFilled.desc())
        .first()
    )
    if last_fill:
        last_fill.Stage = "Issue"
        last_fill.DateFilled = now
        if staff_id:
            last_fill.StaffID = staff_id

    rx.Status = "Verification Rejected"
    rx.LastFillDate = now

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Prescription rejected at verification.",
        "rxId": rx.RxID,
        "status": rx.Status,
        "reason": reason,
    }), 200


# PATIENT DETAIL (for PatientDetailView)
@app.route("/api/patients/<int:patient_id>", methods=["GET"])
def get_patient_detail(patient_id):
    """
    Simple patient detail for the 'View Full Record' screen.
    Uses only data we actually have:
      - basic demographics
      - basic insurance info
      - counts & last visit from prescriptions
    """

    row = (
        db.session.query(
            Patient,
            Insurance.Provider.label("InsuranceProvider"),
            Insurance.Plan.label("InsurancePlan"),
        )
        .outerjoin(Insurance, Patient.InsuranceID == Insurance.InsuranceID)
        .filter(Patient.PatientID == patient_id)
        .first()
    )

    if not row:
        return jsonify({"error": "Patient not found"}), 404

    patient, insurance_provider, insurance_plan = row

    # Prescription counts + last visit (derived from prescriptions)
    prescriptions = Prescription.query.filter_by(PatientID=patient_id).all()

    active_count = 0
    total_count = len(prescriptions)
    last_visit_date = None

    for rx in prescriptions:
        if is_active_rx_status(rx.Status):
            active_count += 1

        # "Last visit" = most recent of LastFillDate or DateIssued
        if rx.LastFillDate is not None:
            d = rx.LastFillDate.date()
        elif rx.DateIssued is not None:
            d = rx.DateIssued
        else:
            d = None

        if d is not None:
            if last_visit_date is None or d > last_visit_date:
                last_visit_date = d

    # Age (approx)
    age = None
    if patient.DOB:
        today = date.today()
        age = (
            today.year
            - patient.DOB.year
            - ((today.month, today.day) < (patient.DOB.month, patient.DOB.day))
        )

    return jsonify(
        {
            "id": patient.PatientID,
            "firstName": patient.FirstName,
            "lastName": patient.LastName,
            "dob": patient.DOB.isoformat() if patient.DOB else None,
            "age": age,
            "phone": patient.Phone,
            "email": patient.Email,
            "address": patient.Address,
            "insuranceProvider": insurance_provider,
            "insurancePlan": insurance_plan,
            "activePrescriptions": active_count,
            "totalPrescriptions": total_count,
            "lastVisit": last_visit_date.isoformat() if last_visit_date else None,
        }
    ), 200


# REPORTS & ANALYTICS
# 1. Scripts Filled (COUNT Fill rows)
@app.route("/api/reports/scripts-filled", methods=["GET"])
def report_scripts_filled():
    count = db.session.query(func.count(Fill.FillID)).scalar()
    return jsonify({"scriptsFilled": int(count)}), 200


# 2. Patients Served (distinct prescription patients)
@app.route("/api/reports/patients-served", methods=["GET"])
def report_patients_served():
    count = (
        db.session.query(func.count(func.distinct(Prescription.PatientID)))
        .scalar()
    )
    return jsonify({"patientsServed": int(count)}), 200


# 3. Top Medications Dispensed (group by DrugID)
@app.route("/api/reports/top-meds", methods=["GET"])
def report_top_meds():
    rows = (
        db.session.query(
            Drug.Name,
            func.count(Prescription.RxID).label("count")
        )
        .join(Drug, Prescription.DrugID == Drug.DrugID)
        .group_by(Drug.DrugID)
        .order_by(func.count(Prescription.RxID).desc())
        .limit(10)
        .all()
    )

    result = [
        {"name": r[0], "count": int(r[1])}
        for r in rows
    ]

    return jsonify({"topMeds": result}), 200


# 4. Insurance Breakdown (group by Insurance.Provider)
@app.route("/api/reports/insurance-breakdown", methods=["GET"])
def report_insurance_breakdown():
    rows = (
        db.session.query(
            Insurance.Provider,
            func.count(Patient.PatientID).label("count")
        )
        .join(Patient, Patient.InsuranceID == Insurance.InsuranceID)
        .group_by(Insurance.Provider)
        .order_by(func.count(Patient.PatientID).desc())
        .all()
    )

    total = sum(int(r[1]) for r in rows) or 1  # avoid divide-by-zero

    result = [
        {
            "provider": r[0] or "Uninsured",
            "count": int(r[1]),
            "percentage": round((int(r[1]) / total) * 100, 1)
        }
        for r in rows
    ]

    return jsonify({"insurance": result}), 200


@app.route("/api/pharmacist/reports/summary", methods=["GET"])
def pharmacist_reports_summary():
    """
    Real metrics based on the current database.

    Returns JSON like:
    {
      "scriptsFilledToday": 3,
      "patientsServedToday": 2,
      "totalRevenueToday": 120.50,
      "avgWaitMinutesToday": 45,
      "topMedications": [
        { "name": "Atorvastatin 10mg", "count": 5 },
        ...
      ],
      "insuranceBreakdown": [
        { "name": "Blue Cross", "percentage": 35.0, "count": 7 },
        ...
      ]
    }
    """
    today = datetime.utcnow().date()
    start_of_day = datetime(today.year, today.month, today.day)
    end_of_day = start_of_day + timedelta(days=1)

    # Scripts filled today = count of Fill where DateFilled is today
    scripts_filled_today = (
        db.session.query(Fill)
        .filter(Fill.DateFilled >= start_of_day, Fill.DateFilled < end_of_day)
        .count()
    )

    # Patients served today = distinct PatientID from prescriptions with a fill today
    patient_ids_today = (
        db.session.query(Prescription.PatientID)
        .join(Fill, Fill.RxID == Prescription.RxID)
        .filter(Fill.DateFilled >= start_of_day, Fill.DateFilled < end_of_day)
        .distinct()
        .all()
    )
    patients_served_today = len(patient_ids_today)

    # Revenue today = sum of Billing.Amount where DateBilled == today
    revenue_today = (
        db.session.query(func.coalesce(func.sum(Billing.Amount), 0))
        .filter(Billing.DateBilled == today)
        .scalar()
    )
    total_revenue_today = float(revenue_today or 0)

    # Average wait time today (minutes) = Fill.DateFilled - Prescription.DateIssued
    wait_rows = (
        db.session.query(Prescription.DateIssued, Fill.DateFilled)
        .join(Fill, Fill.RxID == Prescription.RxID)
        .filter(Fill.DateFilled >= start_of_day, Fill.DateFilled < end_of_day)
        .filter(Prescription.DateIssued.isnot(None))
        .all()
    )

    avg_wait_minutes = None
    if wait_rows:
        total_minutes = 0.0
        count = 0
        for date_issued, date_filled in wait_rows:
            if date_issued and date_filled:
                # DateIssued is a date, convert to datetime at midnight
                issued_dt = datetime(
                    date_issued.year, date_issued.month, date_issued.day
                )
                delta = date_filled - issued_dt
                total_minutes += delta.total_seconds() / 60.0
                count += 1
        if count > 0:
            avg_wait_minutes = round(total_minutes / count)

    # Look back 30 days for top meds & insurance breakdown
    thirty_days_ago = today - timedelta(days=30)
    start_30 = datetime(thirty_days_ago.year, thirty_days_ago.month, thirty_days_ago.day)

    # Top medications by fills in last 30 days
    med_rows = (
        db.session.query(
            Drug.Name.label("DrugName"),
            func.count(Fill.FillID).label("FillsCount"),
        )
        .join(Prescription, Prescription.DrugID == Drug.DrugID)
        .join(Fill, Fill.RxID == Prescription.RxID)
        .filter(Fill.DateFilled >= start_30)
        .group_by(Drug.DrugID, Drug.Name)
        .order_by(func.count(Fill.FillID).desc())
        .limit(5)
        .all()
    )

    top_meds = [
        {"name": row.DrugName, "count": int(row.FillsCount)} for row in med_rows
    ]

    # Insurance breakdown by fills in last 30 days
    ins_rows = (
        db.session.query(
            Insurance.Provider.label("Provider"),
            func.count(Fill.FillID).label("FillsCount"),
        )
        .join(Patient, Patient.InsuranceID == Insurance.InsuranceID)
        .join(Prescription, Prescription.PatientID == Patient.PatientID)
        .join(Fill, Fill.RxID == Prescription.RxID)
        .filter(Fill.DateFilled >= start_30)
        .group_by(Insurance.InsuranceID, Insurance.Provider)
        .order_by(func.count(Fill.FillID).desc())
        .all()
    )

    total_fills_30 = sum(int(row.FillsCount) for row in ins_rows) or 1  # avoid divide by zero
    insurance_breakdown = []
    for row in ins_rows:
        count = int(row.FillsCount)
        pct = round((count / total_fills_30) * 100, 1)
        insurance_breakdown.append(
            {"name": row.Provider, "percentage": pct, "count": count}
        )

    return jsonify(
        {
            "scriptsFilledToday": scripts_filled_today,
            "patientsServedToday": patients_served_today,
            "totalRevenueToday": total_revenue_today,
            "avgWaitMinutesToday": avg_wait_minutes,
            "topMedications": top_meds,
            "insuranceBreakdown": insurance_breakdown,
        }
    ), 200


@app.route("/api/pharmacist/reports/export", methods=["GET"])
def export_pharmacist_report():
    """
    Generate a simple PDF report based on real data.

    Query param:
      scope = 'daily' | 'weekly' | 'monthly' | 'inventory'
    """
    scope = request.args.get("scope", "daily")

    today = datetime.utcnow().date()
    title = ""
    start_date = None
    end_date = today

    if scope == "weekly":
        title = "Weekly Summary Report"
        start_date = today - timedelta(days=7)
    elif scope == "monthly":
        title = "Monthly Analytics Report"
        start_date = today - timedelta(days=30)
    elif scope == "inventory":
        title = "Inventory Status Report"
    else:
        # default: daily
        title = "Daily Activity Report"
        start_date = today

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    y = height - 50
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, y, f"PharmaFulfill - {title}")

    y -= 25
    p.setFont("Helvetica", 11)
    p.drawString(50, y, f"Generated on: {today.isoformat()}")

    # For date-based reports, compute real stats from Fill / Billing / Prescription
    if scope in ("daily", "weekly", "monthly") and start_date is not None:
        y -= 25

        # Convert start_date to datetime at midnight, end_date is today + 1 day
        start_dt = datetime(start_date.year, start_date.month, start_date.day)
        end_dt = datetime(end_date.year, end_date.month, end_date.day) + timedelta(days=1)

        # Scripts filled count
        scripts_filled = (
            db.session.query(Fill)
            .filter(Fill.DateFilled >= start_dt, Fill.DateFilled < end_dt)
            .count()
        )

        # Patients served (distinct PatientID)
        patient_ids = (
            db.session.query(Prescription.PatientID)
            .join(Fill, Fill.RxID == Prescription.RxID)
            .filter(Fill.DateFilled >= start_dt, Fill.DateFilled < end_dt)
            .distinct()
            .all()
        )
        patients_served = len(patient_ids)

        # Revenue (Billing.Amount over date range)
        if scope == "daily":
            revenue_q = (
                db.session.query(func.coalesce(func.sum(Billing.Amount), 0))
                .filter(Billing.DateBilled == today)
            )
        else:
            revenue_q = (
                db.session.query(func.coalesce(func.sum(Billing.Amount), 0))
                .filter(Billing.DateBilled >= start_date, Billing.DateBilled <= end_date)
            )
        revenue = float(revenue_q.scalar() or 0)

        p.drawString(50, y, f"Scripts filled: {scripts_filled}")
        y -= 18
        p.drawString(50, y, f"Patients served: {patients_served}")
        y -= 18
        p.drawString(50, y, f"Total revenue: ${revenue:.2f}")

        # Average wait time
        y -= 24
        wait_rows = (
            db.session.query(Prescription.DateIssued, Fill.DateFilled)
            .join(Fill, Fill.RxID == Prescription.RxID)
            .filter(Fill.DateFilled >= start_dt, Fill.DateFilled < end_dt)
            .filter(Prescription.DateIssued.isnot(None))
            .all()
        )

        avg_wait_minutes = None
        if wait_rows:
            total_minutes = 0.0
            count = 0
            for date_issued, date_filled in wait_rows:
                if date_issued and date_filled:
                    issued_dt = datetime(
                        date_issued.year, date_issued.month, date_issued.day
                    )
                    delta = date_filled - issued_dt
                    total_minutes += delta.total_seconds() / 60.0
                    count += 1
            if count > 0:
                avg_wait_minutes = round(total_minutes / count)

        if avg_wait_minutes is not None:
            p.drawString(50, y, f"Average wait time: {avg_wait_minutes} minutes")
        else:
            p.drawString(50, y, "Average wait time: N/A")

    elif scope == "inventory":
        # Inventory report – list current stock
        y -= 30
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y, "Drug Inventory:")
        y -= 20
        p.setFont("Helvetica", 10)

        rows = (
            db.session.query(
                Drug.Name.label("DrugName"),
                Drug.NDC,
                Inventory.StockQty,
                Inventory.ExpiresOn,
                Inventory.UnitPrice,
            )
            .join(Inventory, Inventory.DrugID == Drug.DrugID)
            .order_by(Drug.Name.asc())
            .all()
        )

        for row in rows:
            price_str = f"${float(row.UnitPrice):.2f}" if row.UnitPrice is not None else "N/A"
            line = f"{row.DrugName} (NDC: {row.NDC})  - Stock: {row.StockQty}  Price: {price_str}"
            if row.ExpiresOn:
                line += f"  Expires: {row.ExpiresOn.isoformat()}"
            p.drawString(50, y, line)
            y -= 14
            if y < 50:
                p.showPage()
                y = height - 50
                p.setFont("Helvetica", 10)

    p.showPage()
    p.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        mimetype="application/pdf",
    )


@app.route("/api/inventory/reorder", methods=["POST"])
def reorder_inventory():
    """
    Increment stock for a specific (storeId, drugId).

    JSON body:
    {
      "storeId": 1,
      "drugId": 3,
      "amount": 50      # optional, default 50
    }
    """
    data = request.get_json() or {}
    store_id = data.get("storeId")
    drug_id = data.get("drugId")
    amount = data.get("amount", 50)

    if not store_id or not drug_id:
        return jsonify({"error": "storeId and drugId are required"}), 400

    if amount <= 0:
        return jsonify({"error": "amount must be positive"}), 400

    inv = Inventory.query.filter_by(StoreID=store_id, DrugID=drug_id).first()
    if not inv:
        return jsonify({"error": "Inventory record not found"}), 404

    inv.StockQty = (inv.StockQty or 0) + int(amount)
    db.session.commit()

    return jsonify({
        "storeId": inv.StoreID,
        "drugId": inv.DrugID,
        "stockQty": inv.StockQty,
    }), 200


@app.route("/api/inventory/update-quantity", methods=["POST"])
def update_inventory_quantity():
    """
    Set stock quantity for a specific (storeId, drugId).

    JSON body:
    {
      "storeId": 1,
      "drugId": 3,
      "newQuantity": 120
    }
    """
    data = request.get_json() or {}
    store_id = data.get("storeId")
    drug_id = data.get("drugId")
    new_qty = data.get("newQuantity")

    if not store_id or not drug_id:
        return jsonify({"error": "storeId and drugId are required"}), 400

    if new_qty is None:
        return jsonify({"error": "newQuantity is required"}), 400

    try:
        new_qty = int(new_qty)
        if new_qty < 0:
            raise ValueError()
    except ValueError:
        return jsonify({"error": "newQuantity must be a non-negative integer"}), 400

    inv = Inventory.query.filter_by(StoreID=store_id, DrugID=drug_id).first()
    if not inv:
        return jsonify({"error": "Inventory record not found"}), 404

    inv.StockQty = new_qty
    db.session.commit()

    return jsonify({
        "storeId": inv.StoreID,
        "drugId": inv.DrugID,
        "stockQty": inv.StockQty,
    }), 200


@app.route("/api/patient/orders", methods=["GET"])
def get_patient_orders():
    """
    Return fill/order history for a patient.

    Query param:
      patientId: int

    Response:
    {
      "orders": [
        {
          "orderId": 1,
          "orderNumber": "ORD-1",
          "date": "2025-11-23",
          "medication": "Atorvastatin 10mg",
          "quantity": 30,
          "amount": 12.5,
          "status": "Filled",
          "pickupDate": "2025-11-23"
        },
        ...
      ]
    }
    """
    patient_id = request.args.get("patientId", type=int)
    if not patient_id:
        return jsonify({"error": "patientId is required"}), 400

    # Only fills for prescriptions that belong to this patient
    rows = (
        db.session.query(
            Fill.FillID,
            Fill.DateFilled,
            Fill.QtyDispensed,
            Fill.Stage,
            Prescription.RxID,
            Drug.Name.label("DrugName"),
            Billing.Amount,
            Billing.DateBilled,
        )
        .join(Prescription, Fill.RxID == Prescription.RxID)
        .join(Drug, Prescription.DrugID == Drug.DrugID)
        .outerjoin(
            Billing,
            (Billing.RxID == Prescription.RxID)
            & (Billing.PatientID == Prescription.PatientID),
        )
        .filter(Prescription.PatientID == patient_id)
        .filter(Fill.DateFilled.isnot(None))
        .order_by(Fill.DateFilled.desc())
        .all()
    )

    orders = []
    for row in rows:
        date_filled = row.DateFilled.date() if row.DateFilled else None
        amount = float(row.Amount) if row.Amount is not None else 0.0
        stage = row.Stage or "Completed"

        orders.append(
            {
                "orderId": row.FillID,
                "orderNumber": f"ORD-{row.FillID}",
                "date": date_filled.isoformat() if date_filled else None,
                "medication": row.DrugName,
                "quantity": row.QtyDispensed or 0,
                "amount": amount,
                "status": stage,
                "pickupDate": date_filled.isoformat() if date_filled else None,
            }
        )

    return jsonify({"orders": orders}), 200


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    """
    High-level admin KPIs for the AdminDashboard.
    Shape matches the Metrics interface in the frontend.
    """
    # Revenue = sum of Billing.Amount
    revenue_val = (
        db.session.query(func.coalesce(func.sum(Billing.Amount), 0))
        .scalar()
    )
    revenue = float(revenue_val or 0.0)

    # Orders = total fills
    orders = db.session.query(func.count(Fill.FillID)).scalar() or 0

    # Users = patients + staff
    total_patients = db.session.query(func.count(Patient.PatientID)).scalar() or 0
    total_staff = db.session.query(func.count(Staff.StaffID)).scalar() or 0
    users = int(total_patients + total_staff)

    # Alerts = low-stock inventory (e.g., < 50 units)
    low_stock_count = (
        db.session.query(func.count(Inventory.DrugID))
        .filter(Inventory.StockQty < 50)
        .scalar()
        or 0
    )

    # For now, fake some growth / new user numbers so the UI has something to show
    metrics = {
        "revenue": revenue,
        "revenueGrowth": 12.5,   # placeholder %
        "orders": int(orders),
        "ordersGrowth": 8.2,     # placeholder %
        "users": users,
        "newUsers": 23,          # placeholder count
        "alerts": int(low_stock_count),
    }

    return jsonify(metrics), 200


@app.route("/api/pending-actions", methods=["GET"])
def get_pending_actions():
    """
    Returns a list of pending admin actions.
    Matches PendingAction[] in the frontend.
    """
    # Count low-stock items (StockQty < 50)
    low_stock_count = (
        db.session.query(func.count(Inventory.DrugID))
        .filter(Inventory.StockQty < 50)
        .scalar()
        or 0
    )

    actions = []

    if low_stock_count > 0:
        actions.append({
            "id": 1,
            "type": "inventory",
            "title": "Low-stock medications",
            "count": int(low_stock_count),
            "priority": "medium",
        })

    # You can add more actions later (e.g., unverified patients, pending staff, etc.)

    return jsonify(actions), 200


@app.route("/api/activity", methods=["GET"])
def get_activity():
    """
    Returns recent system activity.
    Matches ActivityItem[] in the frontend.
    """
    now = datetime.utcnow()

    activity = [
        {
            "id": 1,
            "type": "user",
            "action": "New user registered",
            "description": "New patient account created",
            "timestamp": now.isoformat(),
        },
        {
            "id": 2,
            "type": "prescription",
            "action": "Prescription filled",
            "description": "Rx filled and marked Ready",
            "timestamp": (now.replace(minute=max(0, now.minute - 10))).isoformat(),
        },
        {
            "id": 3,
            "type": "inventory",
            "action": "Stock updated",
            "description": "Inventory restocked for key chronic meds",
            "timestamp": (now.replace(minute=max(0, now.minute - 30))).isoformat(),
        },
        {
            "id": 4,
            "type": "system",
            "action": "System settings updated",
            "description": "Admin changed notification preferences",
            "timestamp": (now.replace(hour=max(0, now.hour - 2))).isoformat(),
        },
    ]

    return jsonify(activity), 200


# APP ENTRY POINT
if __name__ == "__main__":
    seed_admin()
    app.run(debug=True, port=5000)
