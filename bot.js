const Discord = require('discord.js');

const client = new Discord.Client();

var fs = require('fs');

const { Chess } = require('chess.js');
const fetch = require('node-fetch');
const { url } = require('inspector');

const chess = new Chess()

var data = fs.readFileSync('lichess_db_puzzle.csv')
    .toString() // convert Buffer to string
    .split('\n') // split string to lines
    .map(e => e.trim()) // remove white spaces for each line
    .map(e => e.split(',').map(e => e.trim())); // split each line to array

client.on('ready', () => {
    console.log('I am ready!');
    bot.user.setPresence({
        status: 'online',
        game: {
            name: 'bc!puzzle',
            type: 'Playing',
            url: "https://discordapp.com/"
        }
    })
});

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
        .catch(error => message.channel.send(error));
}

function getJinChess(fen, player) {
    let string = "http://www.jinchess.com/chessboard/?p=" 
    let URI = ""
    URI += fen
    URI += "&tm=" + player
    URI += "&s=l"
    URI += "&ps=merida-flat&cm=o"
    URI = encodeURI(URI)
    string += URI
    return string
}

var puzzles = [];

function goToMove(moves, number) {
    for (y = 0; y < number; y++) {
        chess.move(moves[y])
    }
};

// var challengeRatingRange = [];
// var challengeLevel = 3;
// var challengeIncorrect = false;
// var challengeOngoing = false;

var challenges = [];

// function clearPuzzle(index) {
//     message.channel.send(index)
//     message.channel.send(puzzles.length)
//     puzzles = puzzles.splice(index, 1)
//     chess.reset()
// }





const prefixes = ["bc", "bc!", "bc."]
var prefixUsed

client.on('message', async message => {
	// if (!message.content.toLowerCase().startsWith(prefix.toLowerCase()) || message.author.bot) return;
    if (message.author.bot) {
        return
    } else if (message.content.toLowerCase().startsWith(prefixes[0].toLowerCase())) {
        prefixUsed = prefixes[0];
    } else if (message.content.toLowerCase().startsWith(prefixes[1].toLowerCase())) {
        prefixUsed = prefixes[1];
    } else if (message.content.toLowerCase().startsWith(prefixes[2].toLowerCase())) {
        prefixUsed = prefixes[2];
    }
    
	const args = message.content.slice(prefixUsed.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    function newPuzzle(level, lowRating, highRating) {
        
        let movesBack = level * 2
        let movesToVisualize = []
        // Select a random puzzle from lichess_db_puzzle.csv
        // let puzzle = data[getRandomInt(data.length)]
        let puzzle

        let challengeInChannel = false
        let currentChallenge
        for (x in challenges) {
            if (challenges[x].message.channel == message.channel) {
                challengeInChannel = true
                currentChallenge = challenges[x]
            }
        }
    
        if (lowRating < highRating) {
            let tries = 0
            let puzzleTemp = data[getRandomInt(data.length)]
            while (tries < 100) {
                puzzleTemp = data[getRandomInt(data.length)]
                if (puzzleTemp[3] >= lowRating && puzzleTemp[3] <= highRating) {
                    puzzle = puzzleTemp
                    tries += 101
                } else {
                    tries ++
                    if (tries == 100) {
                        message.channel.send("Puzzle not found in rating range")
                        puzzle = data[getRandomInt(data.length)]
                    }
                }
            }
        } else {
            puzzle = data[getRandomInt(data.length)]
        }
    
        //0       ,1  ,2    ,3     ,4              ,5         ,6      ,7     ,8
        //PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl
        if (puzzle[8].includes("/black")) {
            puzzle[8] = puzzle[8].replace("/black", "")
        }
        let gameId = puzzle[8].split("/")[3].split("#")[0]
        let moveNumber = puzzle[8].split("/")[3].split("#")[1]
    
        let puzzleLink = "https://lichess.org/training/" + puzzle[0]
        let player
    
        moveNumber -= movesBack
    
        // message.channel.send(gameId[0])
    
        getLichessGamebyId(gameId).then(data => data.text())
            .then(result => {
                chess.load_pgn(result, {sloppy: true})
                let moves = chess.history();
                chess.reset();
    
                for (let y = 0; y < moveNumber + movesBack; y++) {
                    chess.move(moves[y]);
                    if (y >= moveNumber) {
                        movesToVisualize.push(moves[y])
                    }
                }
    
                chess.reset();
    
                for (let y = 0; y < moveNumber; y++) {
                    chess.move(moves[y]);
                }
                
                if (chess.turn() == "b") {
                    player = "Black"
                } else {
                    player = "White"
                }
    
                const embed = new Discord.MessageEmbed()
                    .setTitle("Blind Tactic - Level " + level)
                    .setURL(puzzleLink)
                    .setImage(getJinChess(chess.fen(), player))
                    .setDescription("Rating: ||**" + puzzle[3] + "**||\n\nVisualize the moves below, then find the tactic that happens after. Answer with `bc!move (your move)`.\n\n" + "**" + movesToVisualize.join(" ") + "**")
                    .setFooter("(" + player + " to move)")

                if (challengeInChannel) {
                    embed.setTitle("Blind Challenge - Level " + level)
                    embed.setDescription("Challenge Rating: " + currentChallenge.challengeRatingRange[0] + "-" + currentChallenge.challengeRatingRange[1] + "\nRating: ||**" + puzzle[3] + "**||\n\nVisualize the moves below, then find the tactic that happens after. Answer with `bc!move (your move)`.\n\n" + "**" + movesToVisualize.join(" ") + "**")

                }
    
                //For answers. Stores puzzles in an array based on channels
                let puzzleInChannel = false;
                let puzzleMessageObject = {
                    message: message,
                    puzzle: puzzle,
                    moveNumber: moveNumber,
                    movesBack: movesBack,
                    pgn: result,
                    solutionMove: 0,
                    currentSolution: []
                }
                for (x in puzzles) {
                    if (puzzles[x].message.channel == message.channel) {
                        puzzles[x] = puzzleMessageObject
                        puzzleInChannel = true
                    }
                }
                if (puzzleInChannel == false) {
                    puzzles.push(puzzleMessageObject)
                }
    
    
                message.channel.send(embed)
                chess.reset()
    
                // message.channel.send(puzzle)
                // message.channel.send(moveNumber)
                // message.channel.send(movesBack)
                // message.channel.send(movesToVisualize.join(" "))
                // message.channel.send(chess.ascii())
                // message.channel.send(moves)
    
            })
    
    
    }
    
    if (command == "test") {
        message.channel.send("Hi")
    }
    if (command == "puzzle"  || command == "p"  || command == "puz" || command == "puzz") {
        let messageArray = message.content.split(" ");
        let level = 3
        let lowRating
        let highRating
        if (messageArray.length > 1) {
            if (messageArray.length == 2 && !(isNaN(messageArray[1])) && !(messageArray[1].includes("-"))) {
                level = parseInt(messageArray[1]);
            } else if (messageArray.length == 2 && messageArray[1].includes("-")) {
                if (!(isNaN(parseInt(messageArray[1].split("-")[0])) && !(isNaN(parseInt(messageArray[1].split("-")[1]))) && messageArray[1].split("-").length == 2)) {
                    lowRating = parseInt(messageArray[1].split("-")[0])
                    highRating = parseInt(messageArray[1].split("-")[1])
                }
            } else if (messageArray.length == 3) {
                if (!(isNaN(messageArray[2])) && !(messageArray[2].includes("-"))) {
                    lowRating = parseInt(messageArray[1].split("-")[0])
                    highRating = parseInt(messageArray[1].split("-")[1])
                    level = parseInt(messageArray[2]);
                } else {
                    lowRating = parseInt(messageArray[2].split("-")[0])
                    highRating = parseInt(messageArray[2].split("-")[1])
                    level = parseInt(messageArray[1]);
                }
                
            }
        }
        
        // if you use bc!puzzle with a challenge, it will remove the challenge
        let challengeInChannel = false
                let currentChallenge
                for (x in challenges) {
                    if (challenges[x].message.channel == message.channel) {
                        challengeInChannel = true
                        challenges.splice(x, 1)
                    }
                }
        if (challengeInChannel) {
            let embed1 = new Discord.MessageEmbed()
            embed1.setTitle('Challenge Ended')
            embed1.setDescription("||" + "\nYour challenge has ended.\nRating range: " + currentChallenge.challengeRatingRange[0] + "-" + currentChallenge.challengeRatingRange[1] + "\nVisualization level: " + (currentChallenge.challengeLevel-1))
            message.channel.send(embed1)
        }


        let movesBack = level * 2
        let movesToVisualize = []
        // Select a random puzzle from lichess_db_puzzle.csv
        // let puzzle = data[getRandomInt(data.length)]
        let puzzle

        if (lowRating < highRating) {
            let tries = 0
            let puzzleTemp = data[getRandomInt(data.length)]
            while (tries < 100) {
                puzzleTemp = data[getRandomInt(data.length)]
                if (puzzleTemp[3] >= lowRating && puzzleTemp[3] <= highRating) {
                    puzzle = puzzleTemp
                    tries += 101
                } else {
                    tries ++
                    if (tries == 100) {
                        message.channel.send("Puzzle not found in rating range")
                        puzzle = data[getRandomInt(data.length)]
                    }
                }
            }
        } else {
            puzzle = data[getRandomInt(data.length)]
        }

        //0       ,1  ,2    ,3     ,4              ,5         ,6      ,7     ,8
        //PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl
        if (puzzle[8].includes("/black")) {
            puzzle[8] = puzzle[8].replace("/black", "")
        }
        let gameId = puzzle[8].split("/")[3].split("#")[0]
        let moveNumber = puzzle[8].split("/")[3].split("#")[1]

        let puzzleLink = "https://lichess.org/training/" + puzzle[0]
        let player

        moveNumber -= movesBack

        // message.channel.send(gameId[0])

        getLichessGamebyId(gameId).then(data => data.text())
            .then(result => {
                chess.load_pgn(result, {sloppy: true})
                let moves = chess.history();
                chess.reset();

                for (let y = 0; y < moveNumber + movesBack; y++) {
                    chess.move(moves[y]);
                    if (y >= moveNumber) {
                        movesToVisualize.push(moves[y])
                    }
                }

                chess.reset();

                for (let y = 0; y < moveNumber; y++) {
                    chess.move(moves[y]);
                }
                
                if (chess.turn() == "b") {
                    player = "Black"
                } else {
                    player = "White"
                }

                const embed = new Discord.MessageEmbed()
                    .setTitle("Blind Tactic - Level " + level)
                    .setURL(puzzleLink)
                    .setImage(getJinChess(chess.fen(), player))
                    .setDescription("Rating: ||**" + puzzle[3] + "**||\n\nVisualize the moves below, then find the tactic that happens after. Answer with `bc!move (your move)`.\n\n" + "**" + movesToVisualize.join(" ") + "**")
                    .setFooter("(" + player + " to move)")

                //For answers. Stores puzzles in an array based on channels
                let puzzleInChannel = false;
                let puzzleMessageObject = {
                    message: message,
                    puzzle: puzzle,
                    moveNumber: moveNumber,
                    movesBack: movesBack,
                    pgn: result,
                    solutionMove: 0,
                    currentSolution: []
                }
                for (x in puzzles) {
                    if (puzzles[x].message.channel == message.channel) {
                        puzzles[x] = puzzleMessageObject
                        puzzleInChannel = true
                    }
                }
                if (puzzleInChannel == false) {
                    puzzles.push(puzzleMessageObject)
                }


                message.channel.send(embed)
                chess.reset()

                // message.channel.send(puzzle)
                // message.channel.send(moveNumber)
                // message.channel.send(movesBack)
                // message.channel.send(movesToVisualize.join(" "))
                // message.channel.send(chess.ascii())
                // message.channel.send(moves)

            })

    }
    if (command == "solution" || command == "s"  || command == "sol") {
        let puzzleInChannel = false

        
        for (x in puzzles) {
            if (puzzles[x].message.channel == message.channel) {
                puzzleInChannel = true
                chess.load_pgn(puzzles[x].pgn, {sloppy: true})
                let moves = chess.history();

                chess.reset();

                for (let y = 0; y < (puzzles[x].moveNumber + puzzles[x].movesBack); y++) {
                    chess.move(moves[y]);
                }

                let solutionArray = puzzles[x].puzzle[2].split(" ")
                solutionArray.shift()
                let solutionResult = []
                for (x in solutionArray) {
                    solutionResult.push(chess.move(solutionArray[x], {sloppy: true}).san)
                }
                // message.channel.send("Solution: ||" + solutionResult.join(" ") + "||")


                let challengeInChannel = false
                let currentChallenge
                for (x in challenges) {
                    if (challenges[x].message.channel == message.channel) {
                        challengeInChannel = true
                        currentChallenge = challenges[x]
                    }
                }
                const embed = new Discord.MessageEmbed()
                    .setTitle('Solution')
                    .setDescription("||" + solutionResult.join(" ") + "||")

                if (challengeInChannel) {
                    embed.setTitle('Challenge Ended')
                    embed.setDescription("||" + solutionResult.join(" ") + "||" + "\nYour challenge has ended.\nRating range: " + currentChallenge.challengeRatingRange[0] + "-" + currentChallenge.challengeRatingRange[1] + "\nVisualization level: " + (currentChallenge.challengeLevel-1))

                    challenges.splice(challenges.indexOf(currentChallenge), 1)
                }

                message.channel.send(embed)
                //Remove the puzzle from puzzles array
                puzzles.splice(x, 1)
                chess.reset()
            }
        }
        if (puzzleInChannel == false) {
            const embed = new Discord.MessageEmbed()
                .setTitle('Error')
                .setDescription('There is no puzzle currently active. Start one with `bc!puzzle`.')
            
            message.channel.send(embed);
            // message.channel.send("There is no puzzle currently active. Start one with `bc!puzzle`.")
        }
    }

    if (command == "move" || command == "m") {
        let messageArray = message.content.split(" ");
        let move = messageArray[1]
        let puzzleInChannel = false

        let challengeInChannel = false
        let currentChallenge
        for (x in challenges) {
            if (challenges[x].message.channel == message.channel) {
                challengeInChannel = true
                currentChallenge = challenges[x]
            }
        }

        for (x in puzzles) {
            if (puzzles[x].message.channel == message.channel) {
                puzzleInChannel = true
    
                chess.load_pgn(puzzles[x].pgn, {sloppy: true})
                let moves = chess.history();

                chess.reset();

                // First we will navigate to the starting position of the tactic.

                goToMove(moves, puzzles[x].moveNumber + puzzles[x].movesBack)

                // Convert the solutionArray to pgns.
                let solutionArray = puzzles[x].puzzle[2].split(" ")
                solutionArray.shift()
                
                for (let y = 0; y < solutionArray.length; y++) {
                    solutionArray[y] = chess.move(solutionArray[y], {sloppy: true}).san
                }

                chess.reset()
                goToMove(moves, puzzles[x].moveNumber + puzzles[x].movesBack)
                for (let y = 0; y <= puzzles[x].solutionMove; y++) {
                    if (y !== puzzles[x].solutionMove) {
                        chess.move(solutionArray[y])
                    }
                }

                let nextMove = solutionArray[puzzles[x].solutionMove]
                let yourMove = chess.move(move, {sloppy: true})


                if (yourMove == null || typeof move == "undefined") {
                    yourMove = "Invalid move"
                } else {
                    yourMove = yourMove.san
                    chess.undo()
                }
                
                if (yourMove == nextMove) {
                    // message.channel.send(yourMove)
                    // message.channel.send(nextMove)
                    // message.channel.send(puzzles[x].solutionMove)
                    // message.channel.send(solutionArray.length - 1)
                    puzzles[x].currentSolution.push(nextMove)

                    if (puzzles[x].solutionMove !== solutionArray.length - 1) {
                        puzzles[x].currentSolution.push(solutionArray[puzzles[x].solutionMove + 1])

                        const embed = new Discord.MessageEmbed()
                            .setTitle('Keep Going')
                            .setDescription("**" + puzzles[x].currentSolution.join(" ") + "**\n" + "Correct! Opponent responded with " + solutionArray[puzzles[x].solutionMove + 1] + ". What's the next move?")
                        
                        message.channel.send(embed);

                        // message.channel.send("**" + puzzles[x].currentSolution.join(" ") + "**")
                        // message.channel.send("Correct! Opponent responded with " + solutionArray[puzzles[x].solutionMove + 1] + ". What's the next move?")
                        puzzles[x].solutionMove += 2
                    } else {

                        const embed = new Discord.MessageEmbed()
                            .setTitle('Puzzle Complete')
                        
                            if (challengeInChannel) {
                                if (currentChallenge.challengeIncorrect) {
                                    embed.setTitle('Challenge Ended')
                                    embed.setDescription("**" + puzzles[x].currentSolution.join(" ") + "**\n" + "Correct! That's the end of the puzzle." +
                                    "\nYour challenge has ended.\nRating range: " + currentChallenge.challengeRatingRange[0] + "-" + currentChallenge.challengeRatingRange[0] +
                                    "\nVisualization level: " + (currentChallenge.challengeLevel - 1))

                                    challenges.splice(challenges.indexOf(currentChallenge), 1)
                                } else {
                                    embed.setTitle('Challenge Ongoing')
                                    embed.setDescription("**" + puzzles[x].currentSolution.join(" ") + "**\n" + "Correct! That's the end of the puzzle.")
                                    currentChallenge.challengeLevel++
                                    newPuzzle(currentChallenge.challengeLevel, currentChallenge.challengeRatingRange[0], currentChallenge.challengeRatingRange[1])
                                }
                            } else {
                                embed.setDescription("**" + puzzles[x].currentSolution.join(" ") + "**\n" + "Correct! That's the end of the puzzle.")
                            }
                        message.channel.send(embed);

                        

                        // message.channel.send("**" + puzzles[x].currentSolution.join(" ") + "**")
                        // message.channel.send("Correct! That's the end of the puzzle.")
                        // clearPuzzle(x)
                        // Below is copied from bc!solution.
                        // I don't understand why I can't clear a puzzle by simply using
                        // puzzles = puzzles.splice(x, 1)
                        // it works in bc!solution but it only works when I copy and paste it from there
                        // I have no idea why.
                                // puzzleInChannel = true
                                // chess.load_pgn(puzzles[x].pgn, {sloppy: true})
                                // let moves = chess.history();
                
                                // chess.reset();
                
                                // for (let y = 0; y < (puzzles[x].moveNumber + puzzles[x].movesBack); y++) {
                                //     chess.move(moves[y]);
                                // }
                
                                // let solutionArray = puzzles[x].puzzle[2].split(" ")
                                // solutionArray.shift()
                                // let solutionResult = []
                                // for (x in solutionArray) {
                                //     solutionResult.push(chess.move(solutionArray[x], {sloppy: true}).san)
                                // }
                                // message.channel.send("Solution: ||" + solutionResult.join(" ") + "||")
                
                                //Remove the puzzle from puzzles array
                                puzzles.splice(x, 1)
                                chess.reset()
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                        .setTitle('Wrong Move')
                        .setDescription('Incorrect. Try again.')
                    
                    if (challengeInChannel) {
                        currentChallenge.challengeIncorrect = true
                        embed.setTitle('Challenge Failed')
                    }
                    message.channel.send(embed);
                    // message.channel.send("Incorrect. Try again.")
                }

                
                // message.channel.send(puzzles[x].)
                // puzzles[x].solutionMove += 2
                
            }
        }

        if (puzzleInChannel == false) {
            const embed = new Discord.MessageEmbed()
                .setTitle('Error')
                .setDescription('There is no puzzle currently active. Start one with `bc!puzzle`.')
            
            message.channel.send(embed);
            // message.channel.send("There is no puzzle currently active. Start one with `bc!puzzle`.")
        }
    }

    if (command == "challenge" || command == "chal" || command == "chall" || command == "ch") {
        
        // start a puzzle challenge. Do blind puzzles at a specified rating range, starting from level 3 and going up each time
        // you get it right on the first try. 

        let messageArray = message.content.split(" ");
        let challengeRatingRange = [];
        let challengeLevel = 3;
        let challengeIncorrect = false;

        // let lowRating
        // let highRating
        if (messageArray.length == 2 && messageArray[1].includes("-")) {
            if (!(isNaN(parseInt(messageArray[1].split("-")[0])) && !(isNaN(parseInt(messageArray[1].split("-")[1]))) && messageArray[1].split("-").length == 2)) {
                challengeRatingRange[0] = parseInt(messageArray[1].split("-")[0])
                challengeRatingRange[1] = parseInt(messageArray[1].split("-")[1])
            }
        } else if (messageArray.length == 1) {
            challengeRatingRange[0] = 2000
            challengeRatingRange[1] = 2200
        } else {
            message.channel.send("Please specify a valid rating range for your challenge, or leave it blank to use the default (2000-2200).")
            return
        }

        let challengeInChannel = false
        let challengeObject = {
            challengeRatingRange: challengeRatingRange,
            challengeLevel: challengeLevel,
            challengeIncorrect: challengeIncorrect,
            message: message
        }
        for (x in challenges) {
            if (challenges[x].message.channel == message.channel) {
                challenges[x] = challengeObject
                challengeInChannel = true
            }
        }
        if (challengeInChannel == false) {
            challenges.push(challengeObject)
        }

        const embed = new Discord.MessageEmbed()
            .setTitle("New Challenge")
            .setDescription("You're starting a new challenge at rating range **" + challengeObject.challengeRatingRange[0] + "-" + challengeObject.challengeRatingRange[1] + "**! Starting at visualization level 3, solve puzzles and increase the level by 1 each time you get the puzzles correct.")
        message.channel.send(embed)

        newPuzzle(challengeObject.challengeLevel, challengeObject.challengeRatingRange[0], challengeObject.challengeRatingRange[1])
    }

    if (command == "help" || command == "h") {
        const embed = new Discord.MessageEmbed()
            .setTitle("Command List")
            .addFields(
                { name: 'prefixes', value: '"bc!", "bc.", and "bc" are all valid prefixes.'},
                { name: 'bc!help', value: 'Displays this menu. \n(Aliases: h)'},
                { name: 'bc!puzzle [rating range] [level]', value: 'Randomly generates a blind tactics puzzle. The level is how many moves you have to visualize (default is 3). Example: `bc!puzzle 1500-1600 3`.\n(Aliases: p, puz, puzz)' },
                { name: 'bc!move [move]', value: 'Attempts an answer to the current puzzle. The move can be in standard algebraic notation (Ke2) or UCI format (e1e2). \n(Aliases: m)' },
                { name: 'bc!solution', value: 'Displays the solution to the current puzzle and ends it. \n(Aliases: s, sol)'},
                { name: 'bc!challenge [rating range]', value: 'Starts a new challenge. Solve puzzles starting at level 3 and going up every time you get one correct. Default rating range is 2000-2200. \n(Aliases: ch, chal, chall)'}
            )
                // { name: '', value: ''}

        message.channel.send(embed)
    }
})
 

// THIS  MUST  BE  THIS  WAY

client.login(process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret
