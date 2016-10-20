'use strict';

// Method for finding the index (or, the element at index) of an item with the given property === value
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
	mainPrompt();
});

// Command choice prompt
function mainPrompt () {
	console.log();  // Add a line break on each query
	inquirer.prompt([
		{
			name: 'command',
			type: 'list',
			choices: ['View Products for Sale', 'View Low Inventory', 'Add to Inventory', 'Add New Product', 'Quit'],
			message: 'Choose one of the following:'
		}
	]).then(input => {
		ops[input.command]();
	});
}

// Object of functions to be executed on commmand choice
const ops = {
	'View Products for Sale': function () {
		const query = 'SELECT * FROM products;'
		conn.query(query, displayRows);
	},

	'View Low Inventory': function () {
		const query = 'SELECT * FROM products WHERE StockQuantity < 6;'
		conn.query(query, displayRows);
	},

	'Add to Inventory': function () {
		const query = 'SELECT * FROM products;'
		conn.query(query, (err, res) => {
	  	if (err) throw err;

	  	const resultArr = res;
	  	let inventory = [];
	  	for (const row of res) inventory.push(`${_.padStart(row.ItemID, 5)} ${row.ProductName}`);

	  	console.log();
	  	inquirer.prompt([
				{
					name: "item",
					type: "list",
					choices: inventory,
					message: "Reorder which product?"
				},
				{
					name: "quantity",
					type: "input",
					message: "Enter the quantity (max 10,000):",
					validate: input => +input > 0 && +input < 10001
				}
			]).then(input => {
				// Get the database row for the selected product
				const indexOfChosenItem = inventory.indexOf(input.item);
				const rowToUpdate = resultArr[indexOfChosenItem];

				const query = `UPDATE products SET StockQuantity = StockQuantity + ? WHERE ItemID = ?;`
				conn.query(query, [input.quantity, rowToUpdate.ItemID], (err, res) => {
					if (err) throw err;

					const newQuantity = (+rowToUpdate.StockQuantity) + (+input.quantity);
					console.log(`
Reorder successful.

[${inventory[indexOfChosenItem]}] will have a new stock quantity of: ${newQuantity}.
A debit of $${(rowToUpdate.Price * input.quantity).toFixed(2)} will be added to accounts payable.`);

					mainPrompt();
				});
			});
		});
	},

	'Add New Product': function () {
		console.log(`
Please enter the following new product details:`);

		inquirer.prompt([
			{
					name: "ItemID",
					type: "input",
					message: "ID#?",
					validate: input => +input > 0 && +input < 999999,
					filter: input => +input
			},
			{
					name: "ProductName",
					type: "input",
					message: "Name?",
					validate: input => !!input
			},
			{
					name: "DepartmentName",
					type: "input",
					message: "Department?",
					validate: input => !!input
			},
			{
					name: "Price",
					type: "input",
					message: "Price?",
					validate: input => +input > 0,
					filter: input => (+input).toFixed(2)
			},
			{
					name: "StockQuantity",
					type: "input",
					message: "Intitial stock quantity (max 10,000)?",
					validate: input => +input > 0 && +input < 10001,
					filter: input => +input
			}
		]).then(input => {
			const query = `INSERT IGNORE INTO products SET ?;`
			conn.query(query, input, (err, res) => {
				if (err) throw err;

				if (res.warningCount === 0) success(input);
				else reprompt(input);

				function reprompt (prevInput) {
					console.log();
					inquirer.prompt([
					{
						name: "ItemID",
						type: "input",
						message: "Sorry, there is already a product with that ID#. Please enter a new ID#:",
						validate: input => +input > 0 && +input < 999999
					}
					]).then(input => {
						prevInput.ItemID = input.ItemID;
						// console.log(prevInput);

						const query = `INSERT IGNORE INTO products SET ?;`
						conn.query(query, prevInput, (err, res) => {
							if (err) throw err;

							if (res.warningCount === 0) success(prevInput);
							else reprompt(prevInput);							
						});
					});
				}

				function success (input) {
					console.log();
					for (const prop in input) console.log(`${_.padEnd(prop + ':', 17)} ${prop === 'Price' ? '$' : ''}${input[prop]}`);
					console.log();
					console.log('New product successfully added.');

					mainPrompt();
				}
			});
		});		
	},

	'Quit': function () {
		conn.end();
	}
}

function displayRows (err, res) {
	if (err) throw err;

	console.log(`
 ID    Desc                               Price   Stock
=======================================================`);
	for (const row of res) console.log(_.padStart(row.ItemID, 6), _.padEnd(row.ProductName, 30), _.padStart('$'+row.Price, 9), _.padStart(row.StockQuantity, 7));
	console.log();

	mainPrompt();
}