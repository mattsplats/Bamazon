CREATE DATABASE IF NOT EXISTS Bamazon;

USE Bamazon;

CREATE TABLE Products (
	ItemID INT(10),
    ProductName VARCHAR(100),
    DepartmentName VARCHAR(50),
    Price DECIMAL (7,2),
    StockQuantity INT(7),
    PRIMARY KEY (ItemID)
);

CREATE TABLE Departments (
	DepartmentID INT(3),
    DepartmentName VARCHAR(30),
    OverheadCosts DECIMAL(10,2),
    TotalSales DECIMAL(10,2),
    PRIMARY KEY (DepartmentID)
);