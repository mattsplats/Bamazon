'use strict';

// Method for finding the index (or, the element at index) of an item with the given property.value === value
// Allows use of cached table data, instead of requerying the database
Array.prototype.indexOfProp = function indexOfProp (propName, value, returnElement=false) {
	for (let i = 0; i < this.length; i++) {
		if (propName in this[i] && this[i][propName] === value) return returnElement ? this[i] : i;
	}
	return -1;
};

const mysql     = require('mysql'),
      inquirer  = require('inquirer'),
      _         = require('lodash'),
      password  = require('./mysql/secret_keys').password,

      SALES_TAX = 1.0825;

const conn = mysql.createConnection({
	host: 'localhost',
	port: 3306,
	user: 'root',
	password: password,
	database: 'bamazon'
});

conn.connect(err => {
	if (err) throw err;

	const query = 'SELECT * FROM products;'
	conn.query(query, (err, res) => {
  	if (err) throw err;

		console.log(`
 ID    Desc                               Price
===============================================`);
		for (const row of res) console.log(_.padStart(row.ItemID, 6), _.padEnd(row.ProductName, 30), _.padStart('$'+row.Price, 9));
		console.log();

  	mainPrompt(res);
  });
});

// Command choice prompt
function mainPrompt(resultArr) {
	inquirer.prompt([
		{
				name: 'item',
				type: 'input',
				message: 'Enter the ID of the product you want to order:',
				validate: input => resultArr.indexOfProp('ItemID', +input) > -1  // Must match a product ID
		},
		{
				name: 'quantity',
				type: 'input',
				message: 'Enter the quantity:',
				validate: input => +input > 0
		}
	]).then(input => {
		const rowToUpdate = resultArr.indexOfProp('ItemID', +input.item, true);

		// If the quantity in stock is insufficient
		if (input.quantity > rowToUpdate.StockQuantity) {
			console.log('\nInsufficient quantity in stock');
			conn.end();

		} else {
			const query = 'UPDATE products SET StockQuantity = StockQuantity - ? WHERE ItemID = ?;'
			conn.query(query, [input.quantity, input.item], (err, res) => {
				if (err) throw err;

				console.log(`
Order successful!
Your card on file was charged $${(rowToUpdate.Price * input.quantity * SALES_TAX).toFixed(2)}.`);

				const query = 'UPDATE departments SET TotalSales = TotalSales + ? WHERE DepartmentName = ?;'
				conn.query(query, [rowToUpdate.Price * input.quantity, rowToUpdate.DepartmentName], (err, res) => {
					if (err) throw err;

					conn.end();
				});
			});
		}
	});
}