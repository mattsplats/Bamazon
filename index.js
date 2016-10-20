'use strict';

// Method for finding the index (or, the element at index) of an item with the given property === value
Array.prototype.indexOfProp = function indexOfProp (propName, value, returnElement=false) {
	for (let i = 0; i < this.length; i++) {
		if (propName in this[i] && this[i][propName] === value) return returnElement ? this[i] : i;
	}
	return -1;
};

const mysql    = require('mysql'),
      inquirer = require('inquirer'),
      _        = require('lodash'),
      password = require('./mysql/secret_keys').password;

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

		console.log();
		for (const row of res) console.log(_.padStart(row.ItemID, 9, '0'), _.padEnd(row.ProductName, 30), _.padStart(row.Price, 7));
		console.log();

  	prompt(res);
  });
});

// Command choice prompt
function prompt(resultArr) {
	inquirer.prompt([
		{
				name: 'item',
				type: 'input',
				message: 'Enter the ID of the product you want to order:',
				validate: input => resultArr.indexOfProp('ItemID', +input) > -1  // Only allows inputs where the ItemID exists
		},
		{
				name: 'quantity',
				type: 'input',
				message: 'Enter the quantity:',
				validate: input => !!input  // Requires a value, will reprompt if empty
		}
	]).then(input => {
		const rowToUpdate = resultArr.indexOfProp('ItemID', +input.item, true);

		// If the quantity in stock is insufficient
		if (input.quantity > +rowToUpdate.StockQuantity) {
			console.log('Insufficient quantity in stock');
			conn.end();

		} else {
			const query = 'UPDATE products SET StockQuantity = StockQuantity - ? WHERE ItemID = ?;'
			conn.query(query, [input.quantity, input.item], (err, res) => {
				if (err) throw err;

				console.log(`
Order successful!
Your card on file was charged $${(rowToUpdate.Price * input.quantity).toFixed(2)}.`);

				conn.end();
			});
		}
	});
}

// Object of functions to be executed on commmand choice
const ops = {
	'Show song info by artist': function () {
		// Get desired artist
		inquirer.prompt([
			{
					name: "artist",
					type: "input",
					message: "Which artist?",
					validate: input => !!input  // Requires a value, will reprompt if empty
			}
		]).then(input => {
			const query = `SELECT position, song, year FROM top5000 WHERE artist LIKE ?;`

			conn.query(query, `%${input.artist}%`, outputInfo);
		});
	},

	'Show artists who appear more than once': function () {
		const query = `SELECT artist FROM top5000
			GROUP BY artist
    	HAVING COUNT(*) > 1
    	ORDER BY COUNT(*) DESC, artist;`

		conn.query(query, outputArtists);
	},

	'Show songs within a year range': function () {
		// Get desired range
		inquirer.prompt([
			{
					name: "startYear",
					type: "input",
					message: "Start year?",
					validate: input => !!input  // Requires a value, will reprompt if empty
			},
			{
					name: "endYear",
					type: "input",
					message: "End year?",
					validate: input => !!input  // Requires a value, will reprompt if empty
			}
		]).then(input => {
			const query = `SELECT song FROM top5000 WHERE year BETWEEN ? AND ? ORDER BY year, song;`
			conn.query(query, [input.startYear, input.endYear], outputSongs);
		});
	},

	'Search for a specific song': function () {
		// Get desired song title
		inquirer.prompt([
			{
					name: "song",
					type: "input",
					message: "Which song?",
					validate: input => !!input  // Requires a value for song, will reprompt if empty
			}
		]).then(input => {
			const query = `SELECT position, song, year FROM top5000 WHERE song LIKE ?;`

			conn.query(query, `%${input.song}%`, outputInfo);
		});		
	},

	'Find artists with a top song and top album in the same year': function () {
		const query = `SELECT songs.artist FROM top5000 AS songs
			JOIN top3000 AS albums ON (songs.artist = albums.artist AND songs.year = albums.year)
    	GROUP BY songs.artist ORDER BY songs.artist;`

		conn.query(query, outputArtists);
	},

	'Quit': function () {
		conn.end();
	}
}

// Callback function for MySQL queries
function outputInfo(err, res) {
	if (err) throw err;
		
	console.log('');
	for (const row of res) console.log(row.position, row.song, row.year);
	console.log('');

	prompt();
}