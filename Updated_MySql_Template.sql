Create database Pharmacy_Database
use Pharmacy_Database;

CREATE TABLE Insurance (
  InsuranceID INT PRIMARY KEY AUTO_INCREMENT,
  Provider VARCHAR(80),
  Plan VARCHAR(80),
  Deductible DECIMAL(8,2),
  Notes VARCHAR(255)
);

CREATE TABLE Patient (
  PatientID INT PRIMARY KEY AUTO_INCREMENT,
  FirstName VARCHAR(50) NOT NULL,
  LastName  VARCHAR(50) NOT NULL,
  DOB DATE NOT NULL,
  Phone VARCHAR(21),
  Email VARCHAR(250) UNIQUE,
  Address VARCHAR(300),
  Password VARCHAR(6),
  InsuranceID INT,
  FOREIGN KEY (InsuranceID) REFERENCES Insurance(InsuranceID)
);

CREATE TABLE Prescriber (
  PrescriberID INT PRIMARY KEY AUTO_INCREMENT,
  Name VARCHAR(100),
  LicenseNo VARCHAR(40) UNIQUE,
  Specialty VARCHAR(60)
);

CREATE TABLE Drug (
  DrugID INT PRIMARY KEY AUTO_INCREMENT,
  NDC VARCHAR(12) UNIQUE,
  Name VARCHAR(120),
  Strength VARCHAR(40),
  Form VARCHAR(40)
);

CREATE TABLE Store (
  StoreID INT PRIMARY KEY AUTO_INCREMENT,
  Name VARCHAR(80),
  Address VARCHAR(160)
);

CREATE TABLE Inventory (
  StoreID INT,
  DrugID INT,
  StockQty INT DEFAULT 0,
  ExpiresOn DATE,
  PRIMARY KEY (StoreID, DrugID),
  FOREIGN KEY (StoreID) REFERENCES Store(StoreID),
  FOREIGN KEY (DrugID)  REFERENCES Drug(DrugID)
);


CREATE TABLE Staff (
  StaffID INT PRIMARY KEY AUTO_INCREMENT,
  FullName VARCHAR(100),
  Role ENUM('Tech','Pharmacist','Admin') NOT NULL,
  Email VARCHAR(120) UNIQUE,
  PwdHash VARBINARY(60)
);


CREATE TABLE Prescription (
  RxID INT PRIMARY KEY AUTO_INCREMENT,
  PatientID INT NOT NULL,
  PrescriberID INT NOT NULL,
  DrugID INT NOT NULL,
  Dosage VARCHAR(120),
  Qty INT,
  RefillsTotal INT,
  RefillsUsed INT DEFAULT 0,
  DateIssued DATE,
  LastFillDate DATETIME NULL,
  Status ENUM('Pending','Printed','Filled','Ready','Sold','PendingRenewal','Denied') DEFAULT 'Pending',
  FOREIGN KEY (PatientID)    REFERENCES Patient(PatientID),
  FOREIGN KEY (PrescriberID) REFERENCES Prescriber(PrescriberID),
  FOREIGN KEY (DrugID)       REFERENCES Drug(DrugID)
);

CREATE TABLE Fill (
  FillID INT PRIMARY KEY AUTO_INCREMENT,
  RxID INT NOT NULL,
  StaffID INT NOT NULL,
  DateFilled DATETIME,
  QtyDispensed INT,
  Stage ENUM('Printed','Filled','Ready','Sold') DEFAULT 'Printed',
  FOREIGN KEY (RxID)   REFERENCES Prescription(RxID),
  FOREIGN KEY (StaffID) REFERENCES Staff(StaffID)
);

CREATE TABLE Billing (
  BillID INT PRIMARY KEY AUTO_INCREMENT,
  PatientID INT NOT NULL,
  RxID INT NULL,
  Amount DECIMAL(10,2),
  Covered BOOL,
  Status VARCHAR(20),
  DateBilled DATE,
  FOREIGN KEY (PatientID) REFERENCES Patient(PatientID),
  FOREIGN KEY (RxID)      REFERENCES Prescription(RxID)
);

INSERT INTO Insurance (InsuranceID,Provider, Plan, Deductible, Notes)
VALUES ('1234','Test Provider', 'Basic Plan', 0.00, 'Dummy insurance for testing');

INSERT INTO Prescriber (Name, LicenseNo, Specialty)
VALUES ('Dr. Smith', 'LIC123456', 'Cardiology');

INSERT INTO Drug (NDC, Name, Strength, Form)
VALUES ('123456789012', 'Atorvastatin', '10mg', 'Tablet');

ALTER TABLE Prescription
ADD Instructions VARCHAR(256) NOT NULL;

