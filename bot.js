const Discord = require('discord.js');

const client = new Discord.Client();

const prefix = "bc!"

var fs = require('fs');

const { Chess } = require('./chess.js')
const chess = new Chess()

var data = fs.readFileSync('lichess_db_puzzle.csv')
    .toString() // convert Buffer to string
    .split('\n') // split string to lines
    .map(e => e.trim()) // remove white spaces for each line
    .map(e => e.split(',').map(e => e.trim())); // split each line to array

client.on('ready', () => {

    console.log('I am ready!');

});

client.on('message', async message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command == "puzzle") {
        // Select a random puzzle from lichess_db_puzzle.csv
        let puzzle = data[getRandomInt(data.length)]

        //0       ,1  ,2    ,3     ,4              ,5         ,6      ,7     ,8
        //PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl
        let gameId = puzzle[8].split("/")[3].split("#")

        message.channel.send(gameId[0])
        getLichessGamebyId(gameId[0]).then(data => data.text())
            .then(result => {
                message.channel.send(result)
            })

    }


    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    async function getLichessGamebyId(id) {
        // It gets the PGN of a specific game on Lichess.
        // Read the data with
        // getLichessGamebyId(gameId).then(data => data.text())
        // .then(result => {
        //     console.log(result)
        // }
        var requestOptions = {
            method: 'GET',
            redirect: 'follow'
          };
          
          return fetch("https://lichess.org/game/export/" + id + "?clocks=false&evals=false", requestOptions)
            // .then(response => response.text())
            // .then(result => {console.log(result);})
            .catch(error => console.log('error', error));
    }
})
 

// THIS  MUST  BE  THIS  WAY

client.login(process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret
