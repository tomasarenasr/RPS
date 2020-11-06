const express = require('express')
const cors = require('cors')
const axios = require('axios')
const {
    response
} = require('express')
const mongoose = require('mongoose')
const app = express()
const port = 8080

app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))
app.use(cors())

// Connect to MongoDB.
console.log("Connecting to MongoDB database...");
mongoose.connect('mongodb://localhost/RPS', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});
const db = mongoose.connection;
// On error...
db.on('error', console.error.bind(console, 'Connection error:'));

// On success...
db.once('open', function() {

    console.log("Connected to MongoDB database.\n");

    const gameSchema = new mongoose.Schema({
        gameID: {
            type: String,
            required: true,
            unique: true
        },
        nicknameHost: {
            type: String,
            required: true
        },
        nicknameGuest: {
            type: String
        },
        hostChoice: String,
        guestChoice: String,
        hostReady: Boolean,
        guestReady: Boolean
    });

    const Game = mongoose.model('Game', gameSchema);

    // Routes.
    // Ignore favicon.
    app.get('/favicon.ico', (req, res) => res.status(204));
    // Create game.
    app.post('/create/:nickname', async (req, res) => {

        let newGame = new Game();

        const nickname = req.params["nickname"];

        // Generate a valid and unique game ID.
        let gameID = "";
        let queryRes = null;

        do {
            gameID = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
            queryRes = await Game.findOne({
                gameID
            }).exec();
        } while (queryRes != null);

        newGame.gameID = gameID;
        newGame.nicknameHost = nickname;
        newGame.nicknameGuest = null;
        newGame.hostChoice = null;
        newGame.guestChoice = null;
        newGame.hostReady = false;
        newGame.guestReady = false;

        console.log(`Game ID ${gameID}: creating game with for host '${nickname}'...`);

        // Save the game.
        newGame.save(function(err, result) {
            if (err) {
                console.log(err);
                res.status(500);
                res.send("error:could_not_create_game");
            }
        });

        res.status(201);
        res.send(gameID);
    });

    // Join game.
    app.get('/join/:gameID,:nickname', async (req, res) => {

        const gameID = req.params["gameID"];
        const nickname = req.params["nickname"];

        const game = await Game.findOne({
            gameID
        }).exec();

        if (game != null) {

            if (game.nicknameGuest != null) {
                console.log(`Game ID ${gameID}: guest '${nickname}' tried to join a game that is already full.`);
                res.status(403);
                res.send("error:game_full");
                return;
            }

            game.nicknameGuest = nickname;
            game.save();

            console.log(`Game ID ${gameID}: guest '${nickname}' joined '${game.nicknameHost}'s game.`);
            res.status(200);
            res.send(game);

        } else {
            console.log(`Game ID ${gameID}: guest '${nickname}' tried to join a game that does not exist.`);
            res.status(404);
            res.send("error:game_does_not_exist");
        }

    });

    // Set a player's choice.
    app.post('/choice/:gameID,:isHost,:choice', async (req, res) => {

        const gameID = req.params["gameID"];
        const isHost = req.params["isHost"] == "true";
        const choice = req.params["choice"];

        const game = await Game.findOne({
            gameID
        }).exec();

        if (game != null) {

            if (isHost) {
                game.hostChoice = choice;
                console.log(`Game ID ${gameID}: host '${game.nicknameHost}' chose '${choice}'.`);
            } else {
                game.guestChoice = choice;
                console.log(`Game ID ${gameID}: guest '${game.nicknameGuest}' chose '${choice}'.`);
            }

            game.save();

            res.status(200);
            res.send(game);
            return;

        } else {
            res.status(404);
            res.send("error:game_does_not_exist");
        }

    });

    // Get the current state of the game.
    app.get('/getState/:gameID', async (req, res) => {

        const gameID = req.params["gameID"];
        const game = await Game.findOne({
            gameID
        }).exec();

        if (game != null) {
            res.status(200);
            res.send(game);

        } else {
            res.status(404);
            res.send("error:game_does_not_exist");
        }

    });

    app.post(`/playerStatus/:gameID,:isHost,:status`, async (req, res) => {

        const gameID = req.params["gameID"];
        const isHost = req.params["isHost"] == "true";
        const status = req.params["status"];
        const game = await Game.findOne({
            gameID
        }).exec();

        if (game != null) {

            if (status == "ready") {
                if (isHost) {
                    game.hostReady = true;
                } else {
                    game.guestReady = true;
                }

                if (game.hostReady && game.guestReady) {
                    game.hostReady = false;
                    game.guestReady = false;
                    game.hostChoice = null;
                    game.guestChoice = null;
                }

            } else if (status == "exit") {
                if (isHost) {
                    game.deleteOne();
                    res.status(200);
                    res.send("player_left");
                    return;
                } else {
                    game.nicknameGuest = null;
                    game.hostReady = false;
                    game.guestReady = false;
                    game.hostChoice = null;
                    game.guestChoice = null;
                }
            }

            game.save();
            res.status(200);
            res.send(game);

        } else {
            res.status(404);
            res.send("error:game_does_not_exist");
        }
    });

    app.listen(port);
    console.log("listening on port: ", port);
}); // end of on successful connection to MongoDB