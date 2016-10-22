'use strict';

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
			choices: ['View Product Sales by Department', 'Create New Department', 'Quit'],
			message: 'Choose one of the following:'
		}
	]).then(input => {
		ops[input.command]();
	});
}

// Object of functions to be executed on commmand choice
const ops = {
	'View Product Sales by Department': function () {
		const query = 'SELECT * FROM departments;'
		conn.query(query, (err, res) => {
			if (err) throw err;

			// Create profit column
			res.map(row => row.profit = row.TotalSales - row.OverheadCosts);

			console.log(`
ID  Name                       Sales      Overhead        Profit
================================================================`);
			for (const row of res) console.log(_.padStart(row.DepartmentID, 3, '0'), _.padEnd(row.DepartmentName, 18),
				_.padStart('$'+row.TotalSales.toFixed(2), 13), _.padStart('$'+row.OverheadCosts.toFixed(2), 13), _.padStart('$'+row.profit.toFixed(2), 13));
			console.log();

			mainPrompt();
		});
	},

	'Create New Department': function () {
		console.log(`
Please enter the data for the new department:`);

		inquirer.prompt([
			{
					name: 'DepartmentID',
					type: 'input',
					message: 'ID# (1-999)?',
					validate: input => +input > 0 && +input < 999,
					filter: input => +input
			},
			{
					name: 'DepartmentName',
					type: 'input',
					message: 'Department name?',
					validate: input => !!input
			},
			{
					name: 'OverheadCosts',
					type: 'input',
					message: 'Starting total overhead?',
					validate: input => +input > 0,
					filter: input => (+input).toFixed(2)
			},
			{
					name: 'TotalSales',
					type: 'input',
					message: 'Starting total sales?',
					validate: input => +input > 0,
					filter: input => (+input).toFixed(2)
			}
		]).then(input => {
			const query = 'INSERT IGNORE INTO departments SET ?;'
			conn.query(query, input, (err, res) => {
				if (err) throw err;

				// Using INSERT IGNORE triggers a warning on duplicate primary key insertions (ItemID)
				// If MySQL gives a warning, assume this is an attemtp to update a duplicate ID, and reprompt for ItemId 
				if (res.warningCount === 0) success(input);
				else reprompt(input);

				// Triggered on duplicate ItemID entry
				// prevInput is kept so only the ID has to be re-entered
				function reprompt (prevInput) {
					console.log();
					inquirer.prompt([
					{
						name: 'DepartmentID',
						type: 'input',
						message: 'Sorry, there is already a department with that ID#. Please enter a new ID#:',
						validate: input => +input > 0 && +input < 999,
						filter: input => +input
					}
					]).then(input => {
						prevInput.DepartmentID = input.DepartmentID;

						const query = `INSERT IGNORE INTO departments SET ?;`
						conn.query(query, prevInput, (err, res) => {
							if (err) throw err;

							if (res.warningCount === 0) success(prevInput);
							else reprompt(prevInput);							
						});
					});
				}

				// Insertion completed with no warnings
				function success (input) {
					console.log();
					for (const prop in input) console.log(`${_.padEnd(prop + ':', 17)} ${prop === 'OverheadCosts' || prop === 'TotalSales' ? '$' : ''}${input[prop]}`);
					console.log();
					console.log('New department successfully added.');

					mainPrompt();
				}
			});
		});		
	},

	'Quit': function () {
		conn.end();
	}
}