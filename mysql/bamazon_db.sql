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