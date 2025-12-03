DROP DATABASE IF EXISTS pharmafulfill_database;
CREATE DATABASE pharmafulfill_database;
USE pharmafulfill_database;

-- 1) INSURANCE
CREATE TABLE Insurance (
  InsuranceID INT PRIMARY KEY AUTO_INCREMENT,
  Provider    VARCHAR(80),
  Plan        VARCHAR(80),
  Deductible  DECIMAL(8,2),
  Notes       VARCHAR(255)
);

-- 2) PATIENT
CREATE TABLE Patient (
  PatientID   INT PRIMARY KEY AUTO_INCREMENT,
  FirstName   VARCHAR(50) NOT NULL,
  LastName    VARCHAR(50) NOT NULL,
  DOB         DATE NOT NULL,
  Phone       VARCHAR(21),
  Email       VARCHAR(250) NOT NULL UNIQUE,
  Address     VARCHAR(300),
  Password    VARCHAR(255),         -- bcrypt hash (can be NULL for seeded)
  InsuranceID INT,
  Verified    BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (InsuranceID) REFERENCES Insurance(InsuranceID)
);

-- 3) PRESCRIBER
CREATE TABLE Prescriber (
  PrescriberID INT PRIMARY KEY AUTO_INCREMENT,
  Name         VARCHAR(100),
  LicenseNo    VARCHAR(40) UNIQUE,
  Specialty    VARCHAR(60)
);

-- 4) DRUG
CREATE TABLE Drug (
  DrugID   INT PRIMARY KEY AUTO_INCREMENT,
  NDC      VARCHAR(12) UNIQUE,
  Name     VARCHAR(120),
  Strength VARCHAR(40),
  Form     VARCHAR(40)
);

-- 5) STORE
CREATE TABLE Store (
  StoreID INT PRIMARY KEY AUTO_INCREMENT,
  Name    VARCHAR(80),
  Address VARCHAR(160)
);

-- 6) STAFF
CREATE TABLE Staff (
  StaffID   INT PRIMARY KEY AUTO_INCREMENT,
  FullName  VARCHAR(100),
  Username  VARCHAR(60) UNIQUE,
  Role      ENUM('Tech','Pharmacist','Admin') NOT NULL,
  Email     VARCHAR(120) NOT NULL UNIQUE,
  PwdHash   VARBINARY(60) NOT NULL        -- bcrypt hash
);

-- 7) PRESCRIPTION
CREATE TABLE Prescription (
  RxID          INT PRIMARY KEY AUTO_INCREMENT,
  PatientID     INT NOT NULL,
  PrescriberID  INT NOT NULL,
  DrugID        INT NOT NULL,
  Dosage        VARCHAR(120),
  Qty           INT,
  RefillsTotal  INT,
  RefillsUsed   INT DEFAULT 0,
  DateIssued    DATE,
  LastFillDate  DATETIME NULL,
  Status        VARCHAR(30) NOT NULL DEFAULT 'New',
  Instructions  VARCHAR(256) NOT NULL,
  Priority      VARCHAR(20) NULL,
  EntryMethod   VARCHAR(20) NULL,
  DaysSupply    INT NULL,
  FOREIGN KEY (PatientID)    REFERENCES Patient(PatientID),
  FOREIGN KEY (PrescriberID) REFERENCES Prescriber(PrescriberID),
  FOREIGN KEY (DrugID)       REFERENCES Drug(DrugID)
);

-- 8) REFILL REQUEST
CREATE TABLE RefillRequest (
  RequestID   INT PRIMARY KEY AUTO_INCREMENT,
  RxID        INT NOT NULL,
  PatientID   INT NOT NULL,
  RequestedOn DATETIME DEFAULT NOW(),
  Status      ENUM('Pending','Approved','Denied') DEFAULT 'Pending',
  Notes       VARCHAR(255),
  FOREIGN KEY (RxID)      REFERENCES Prescription(RxID),
  FOREIGN KEY (PatientID) REFERENCES Patient(PatientID)
);

-- 9) FILL
CREATE TABLE Fill (
  FillID       INT PRIMARY KEY AUTO_INCREMENT,
  RxID         INT NOT NULL,
  StaffID      INT NOT NULL,
  DateFilled   DATETIME,
  QtyDispensed INT,
  Stage        VARCHAR(20) NOT NULL DEFAULT 'Printed',
  FOREIGN KEY (RxID)    REFERENCES Prescription(RxID),
  FOREIGN KEY (StaffID) REFERENCES Staff(StaffID)
);

-- 10) BILLING
CREATE TABLE Billing (
  BillID     INT PRIMARY KEY AUTO_INCREMENT,
  PatientID  INT NOT NULL,
  RxID       INT NULL,
  Amount     DECIMAL(10,2),
  Covered    BOOL,
  Status     VARCHAR(20),
  DateBilled DATE,
  FOREIGN KEY (PatientID) REFERENCES Patient(PatientID),
  FOREIGN KEY (RxID)      REFERENCES Prescription(RxID)
);

-- 11) INVENTORY (Store + Drug)  *** UPDATED ***
CREATE TABLE Inventory (
  StoreID   INT,
  DrugID    INT,
  StockQty  INT DEFAULT 0,
  ExpiresOn DATE,
  UnitPrice DECIMAL(10,2),      -- <--- NEW COLUMN
  PRIMARY KEY (StoreID, DrugID),
  FOREIGN KEY (StoreID) REFERENCES Store(StoreID),
  FOREIGN KEY (DrugID)  REFERENCES Drug(DrugID)
);

-- =====================
-- SEED DATA
-- =====================

-- INSURANCE PLANS
INSERT INTO Insurance (InsuranceID, Provider, Plan, Deductible, Notes) VALUES
  (1234, 'Blue Cross Blue Shield', 'Bronze PPO', 1500.00, 'Basic coverage plan.'),
  (1235, 'Blue Cross Blue Shield', 'Premium PPO',  500.00, 'High coverage plan.'),
  (1236, 'United Healthcare',      'Standard PPO', 2000.00, 'Standard coverage.'),
  (1237, 'Aetna',                  'Standard HMO', 2000.00, 'HMO plan with referrals.'),
  (1238, 'Medicare',               'Part A & B',      0.00, 'Government Medicare.'),
  (1239, 'Medicaid',               'Medicaid Plan',   0.00, 'Government Medicaid.'),
  (1240, 'Cash / Self-Pay',        'Cash Pay',        0.00, 'No insurance / self pay.'),
  (1241, 'Blue Cross Blue Shield', 'Silver PPO',   500.00, 'Mid-level coverage.');

ALTER TABLE Insurance AUTO_INCREMENT = 2000;

-- PRESCRIBERS
INSERT INTO Prescriber (Name, LicenseNo, Specialty) VALUES
  ('Dr. Emily Davis',    'LIC111222', 'Pediatrics'),
  ('Dr. Michael Brown',  'LIC333444', 'Endocrinology'),
  ('Dr. Olivia Martinez','LIC555666', 'Dermatology'),
  ('Dr. Ethan Thompson', 'LIC777888', 'Neurology'),
  ('Dr. Grace Wilson',   'LIC999000', 'Family Medicine'),
  ('Dr. Daniel Lee',     'LIC112233', 'Orthopedics'),
  ('Dr. Laura Taylor',   'LIC223344', 'Psychiatry'),
  ('Dr. Anthony Moore',  'LIC334455', 'Gastroenterology'),
  ('Dr. Sophia Harris',  'LIC445566', 'Pulmonology'),
  ('Dr. Jacob White',    'LIC556677', 'Rheumatology'),
  ('Dr. Natalie Clark',  'LIC667788', 'Otolaryngology'),
  ('Dr. Henry Walker',   'LIC778899', 'Urgent Care');

-- DRUGS
INSERT INTO Drug (NDC, Name, Strength, Form) VALUES
  ('123456789012', 'Atorvastatin',        '10mg',   'Tablet'),
  ('234567890123', 'Lisinopril',          '20mg',   'Tablet'),
  ('345678901234', 'Metformin',           '500mg',  'Tablet'),
  ('456789012345', 'Amlodipine',          '5mg',    'Tablet'),
  ('567890123456', 'Omeprazole',          '20mg',   'Capsule'),
  ('678901234567', 'Simvastatin',         '20mg',   'Tablet'),
  ('789012345678', 'Losartan',            '50mg',   'Tablet'),
  ('890123456789', 'Levothyroxine',       '75mcg',  'Tablet'),
  ('901234567890', 'Hydrochlorothiazide', '25mg',   'Tablet'),
  ('012345678901', 'Gabapentin',          '300mg',  'Capsule'),
  ('112233445566', 'Sertraline',          '50mg',   'Tablet'),
  ('223344556677', 'Escitalopram',        '10mg',   'Tablet'),
  ('334455667788', 'Montelukast',         '10mg',   'Tablet'),
  ('445566778899', 'Cetirizine',          '10mg',   'Tablet'),
  ('556677889900', 'Fluoxetine',          '20mg',   'Capsule'),
  ('667788990011', 'Pantoprazole',        '40mg',   'Tablet'),
  ('778899001122', 'Meloxicam',           '15mg',   'Tablet'),
  ('889900112233', 'Prednisone',          '10mg',   'Tablet'),
  ('990011223344', 'Albuterol',           '90mcg',  'Inhaler'),
  ('101112131415', 'Amoxicillin',         '500mg',  'Capsule');

-- STORES
INSERT INTO Store (Name, Address) VALUES
  ('PharmaFulfill Downtown', '123 Main St, Nashville, TN 37201'),
  ('PharmaFulfill West',     '456 West Ave, Nashville, TN 37203'),
  ('PharmaFulfill East',     '789 East Blvd, Nashville, TN 37204');

-- INVENTORY – Store 1 (with UnitPrice)
INSERT INTO Inventory (StoreID, DrugID, StockQty, ExpiresOn, UnitPrice) VALUES
  (1,  1, 450, '2026-12-31', 12.50),
  (1,  2, 180, '2026-11-30', 10.00),
  (1,  3, 320, '2026-10-31',  8.75),
  (1,  4, 200, '2026-09-30',  9.25),
  (1,  5, 260, '2026-08-31', 11.00),
  (1,  6, 190, '2026-12-15', 13.00),
  (1,  7, 210, '2026-11-15', 14.50),
  (1,  8, 150, '2026-10-15', 15.00),
  (1,  9, 140, '2026-09-15',  7.75),
  (1, 10, 120, '2026-08-15', 16.25),
  (1, 11, 130, '2026-12-01', 10.50),
  (1, 12, 110, '2026-11-01', 10.75),
  (1, 13, 100, '2026-10-01',  9.90),
  (1, 14, 160, '2026-09-01',  6.50),
  (1, 15, 140, '2026-08-01', 11.20),
  (1, 16, 170, '2026-12-20', 14.75),
  (1, 17,  90, '2026-11-20', 13.40),
  (1, 18,  80, '2026-10-20',  9.60),
  (1, 19,  75, '2026-09-20', 22.00),
  (1, 20, 130, '2026-08-20', 18.25);

-- INVENTORY – Store 2
INSERT INTO Inventory (StoreID, DrugID, StockQty, ExpiresOn, UnitPrice) VALUES
  (2,  1, 220, '2026-11-30', 12.75),
  (2,  2, 160, '2026-10-31', 10.25),
  (2,  3, 200, '2026-09-30',  9.10),
  (2,  4, 150, '2026-08-31',  9.50),
  (2,  5, 180, '2026-12-31', 11.25),
  (2,  6, 140, '2026-11-15', 13.25),
  (2,  7, 150, '2026-10-15', 14.75),
  (2,  8, 120, '2026-09-15', 15.25),
  (2,  9, 110, '2026-08-15',  8.00),
  (2, 10,  90, '2026-12-10', 16.50),
  (2, 11, 100, '2026-11-10', 10.75),
  (2, 16, 130, '2026-10-10', 14.25);

-- INVENTORY – Store 3
INSERT INTO Inventory (StoreID, DrugID, StockQty, ExpiresOn, UnitPrice) VALUES
  (3,  1, 150, '2026-10-31', 12.90),
  (3,  3, 170, '2026-09-30',  9.50),
  (3,  5, 160, '2026-12-31', 11.50),
  (3,  8, 100, '2026-11-30', 15.50),
  (3, 10,  80, '2026-10-31', 16.75),
  (3, 14, 120, '2026-09-30',  6.75),
  (3, 15, 100, '2026-08-31', 11.40),
  (3, 18,  70, '2026-12-15',  9.90),
  (3, 19,  60, '2026-11-15', 22.50),
  (3, 20,  90, '2026-10-15', 18.75);
