'use strict';

const mysql    = require('mysql'),
      inquirer = require('inquirer'),
      password = require('./mysql/secret_keys').password;

const conn = mysql.createConnection({
	host: 'localhost',
	port: 3306,
	user: 'root',
	password: password,
	database: 'top_songs'
});

// conn.connect(err => {
// 	if (err) throw err;

// 	console.log('');

// 	const query = `SELECT artist FROM top5000
// 			GROUP BY artist
//     	HAVING COUNT(*) > 1
//     	ORDER BY COUNT(*) DESC, artist;`

//   function output (err, res) {


//   	prompt();
//   }

// 	conn.query(query, output);
// });

// Command choice prompt
function prompt() {
	inquirer.prompt([
		{
				name: "command",
				type: "list",
				choices: ['Show song info by artist', 'Show artists who appear more than once', 'Show songs within a year range',
					'Search for a specific song', 'Find artists with a top song and top album in the same year', 'Quit'],
				message: "Choose a command:"
		}
	]).then(input => {
		// Select[using bracket notation] and run() the function in ops corresponding to the given command
		ops[input.command]();
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