const Discord = require('discord.js');

const client = new Discord.Client();

const prefix = "bc!"

var fs = require('fs');

const { Chess } = require('chess.js')
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

var puzzles = []

function goToMove(moves, number) {
    for (y = 0; y < number; y++) {
        chess.move(moves[y])
    }
}
function clearPuzzle(index) {
    message.channel.send(index)
    message.channel.send(puzzles.length)
    puzzles = puzzles.splice(index, 1)
    chess.reset()
}
client.on('message', async message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    if (command == "test") {
        message.channel.send("Hi")
    }
    if (command == "puzzle") {
        let messageArray = message.content.split(" ");
        let level = 3
        if (messageArray.length == 2 && typeof parseInt(messageArray[1]) == "number" && !(messageArray[1].includes("-"))) {
            level = parseInt(messageArray[1]);
        }
        let movesBack = level * 2
        let movesToVisualize = []
        // Select a random puzzle from lichess_db_puzzle.csv
        let puzzle = data[getRandomInt(data.length)]

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
                    .setDescription("Rating: **" + puzzle[3] + "**\n\nVisualize the moves below, then find the tactic that happens after.\n\n" + "**" + movesToVisualize.join(" ") + "**")
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
    if (command == "solution") {
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
                message.channel.send("Solution: ||" + solutionResult.join(" ") + "||")

                //Remove the puzzle from puzzles array
                puzzles = puzzles.splice(x, 1)
                chess.reset()
            }
        }
        if (puzzleInChannel == false) {
            message.channel.send("There is no puzzle currently active. Start one with `bc!puzzle`.")
        }
    }

    if (command == "move") {
        let messageArray = message.content.split(" ");
        let move = messageArray[1]
        let puzzleInChannel = false
        let puzzle

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
                        message.channel.send(puzzles[x].currentSolution.join(" "))
                        message.channel.send("Correct! Opponent responded with " + solutionArray[puzzles[x].solutionMove + 1] + ". What's the next move?")
                        puzzles[x].solutionMove += 2
                    } else {
                        message.channel.send(puzzles[x].currentSolution.join(" "))
                        message.channel.send("Correct! That's the end of the puzzle.")
                        // clearPuzzle(x)
                        // Below is copied from bc!solution.
                        // I don't understand why I can't clear a puzzle by simply using
                        // puzzles = puzzles.splice(x, 1)
                        // it works in bc!solution but it only works when I copy and paste it from there
                        // I have no idea why.
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
                
                                //Remove the puzzle from puzzles array
                                puzzles = puzzles.splice(x, 1)
                                chess.reset()
                    }
                } else {
                    message.channel.send("Incorrect. Try again.")
                }

                
                // message.channel.send(puzzles[x].)
                // puzzles[x].solutionMove += 2
                
            }
        }

        if (puzzleInChannel == false) {
            message.channel.send("There is no puzzle currently active. Start one with `bc!puzzle`.")
        }



        // let messageArray = message.content.split(" ");
        // let move = messageArray[1]
        // let puzzleInChannel = false
        // let doneWithPuzzle = false
        // for (x in puzzles) {
        //     if (puzzles[x].message.channel == message.channel) {

                // puzzleInChannel = true
                // chess.load_pgn(puzzles[x].pgn, {sloppy: true})
                // let moves = chess.history();

                // chess.reset();

        //         for (let y = 0; y < (puzzles[x].moveNumber + puzzles[x].movesBack + puzzles[x].solutionMove); y++) {
        //             chess.move(moves[y]);
        //         }

                // let solutionArray = puzzles[x].puzzle[2].split(" ")
                // solutionArray.shift()
                // let solutionString = []
                // for (y = 0; y < puzzles[x].solutionMove; y++) {
                //     solutionString.push(chess.move(solutionArray[y], {sloppy: true}).san)
                //     chess.undo()
                //     message.channel.send(y)
                //     message.channel.send(solutionArray[y])


                //     message.channel.send(solutionString.join(" "))
                // }
                
                // for (y = 0; y < puzzles[x].solutionMove - 1; y++) {
                //     chess.move(solutionArray[y], {sloppy: true})
                //     message.channel.send(chess.fen())
                // }
        //         message.channel.send(`\`\`\`"W"\n${puzzles[x].solutionMove}\n${solutionArray.length}\n${solutionArray.length -1}\n${solutionArray[(puzzles[x].solutionMove)]}\`\`\``)

        //         let nextMove = chess.move(solutionArray[puzzles[x].solutionMove], {sloppy: true}).san

        //         chess.undo()

        //         let yourMove = chess.move(move, {sloppy: true})

        //         if (typeof yourMove == "object" && yourMove !== null) {
        //             yourMove = yourMove.san
        //             chess.undo()
        //         } else {
        //             yourMove = "Invalid move"
        //         }
        //         message.channel.send(solutionArray.join(" "))
        //         // message.channel.send(nextMove)
        //         // message.channel.send(yourMove)
        //         // message.channel.send(solutionArray[puzzles[x].solutionMove])
        //         // message.channel.send(puzzles[x].solutionMove)

                
                
        //         if (yourMove == nextMove) {
        //             solutionString.push(nextMove)
        //             solutionString = solutionString.join(" ")
        //             message.channel.send("**" + solutionString + "**")
        //             if (solutionArray.length - 1 == puzzles[x].solutionMove) {
                        // message.channel.send("Correct! That's the end of the puzzle.")
                        // doneWithPuzzle = true
        //             } else {
        //                 for (y = 0; y <= puzzles[x].solutionMove; y++) {
        //                     chess.move(solutionArray[y], {sloppy: true})
        //                 }
                        // message.channel.send("Correct! Opponent responded with " + chess.move(solutionArray[(puzzles[x].solutionMove)+1], {sloppy: true}).san + ". What's the next move?")
                        // puzzles[x].solutionMove += 2
        //             }
        //         } else {
        //             if (solutionString.length != 0) {
        //                 solutionString = solutionString.join(" ")
        //                 message.channel.send("**" + solutionString + "**")
        //             }
        //             message.channel.send("Incorrect. Try again.")
        //         }
        //         chess.reset()
        //     }
        // }
        // if (doneWithPuzzle == true) {
        //     message.channel.send("LOL")
        //     for (x in puzzles) {
        //         if (puzzles[x].message.channel == message.channel) {
        //             puzzles = puzzles.splice(x, 1)
        //         }
        //     }
        // }
        // if (puzzleInChannel == false) {
            // message.channel.send("There is no puzzle currently active. Start one with `bc!puzzle`.")
        // }
    }

    
})
 

// THIS  MUST  BE  THIS  WAY

client.login(process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret
