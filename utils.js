let hostname = "";
let guestname = "";





const outcomes = {
    'rock': {
        'paper': false,
        'scissors': true
    },
    'paper': {
        'rock': true,
        'scissors': false
    },
    'scissors': {
        'rock': false,
        'paper': true
    }
};
let gameID = -1;
let isHost = false;
// NEW GAME
function create_game_handler(_) {

    const hostnameField = document.getElementById("create-host-name");
    hostname = hostnameField.value.trim();
    hostnameField.value = "";

    if (hostname === "") {
        alert("Please enter a valid username ");
        return;
    }

    axios
        .post(`http://localhost:8080/create/${hostname}`)
        .then(resp => {

            if (resp.status == 201) {
                gameID = resp.data;
                isHost = true;
                setTimeout(function () {get_game_state();}, 1000);
            } else {
                console.log(resp);
            }
            return;

        }).catch(function (error) {
                console.log(error);
                alert("An error ocurred");
        });
}
    
let gameState = null;
// JOIN GAME
function join_game_handler(_) {

    const guestnameField = document.getElementById("create-guest-name");
    const gameIDField = document.getElementById("join-id");
    guestname = guestnameField.value.trim();
    const gameIDToJoin = gameIDField.value.trim();

    if (guestname === "") {
        alert("Please enter a valid username");
        return;
    }

    if (gameIDToJoin === "") {
        alert("Enter a valid game ID");
        return;
    }

    axios
        .get(`http://localhost:8080/join/${gameIDToJoin},${guestname}`)
        .then(resp => {

            if (resp.status == 200) {
                gameState = resp.data;
                gameID = resp.data.gameID;
                isHost = false;
                setTimeout(function () { get_game_state(); }, 1000);
            } else {
                alert("An error ocurred.");
            }

        }).catch(function (error) {
            if (error.response.status == 404) {
                alert("Error 404 game not found!");
                gameIDField.focus();
                gameIDField.select();
            } else {
                console.log(error);
                alert("An error ocurred.");
            }
        });
}

// When the player clicks one of the options.
function choice_buttons_handler(e) {

    if (gameID == -1) {
        console.log("You are not in a game.");
        return;
    }

    const choice = e.target.value;

    axios
        .post(`http://localhost:8080/choice/${gameID},${isHost},${choice}`)
        .then(resp => {
            if (resp.status == 200) {
                gameState = resp.data;
                updateUI();
            } else {
                console.log("An error ocurred: ");
                console.log(resp);
            }
        }).catch(function (error) {
            if (error.response.status == 404) {
                alert("You are not in a game.");
            } else {
                console.log(error);
            }
        });
}

let ended = false;
function get_game_state() {

    if (gameID == -1) {
        console.log("You are not in a game.");
        return;
    }

    axios
        .get(`http://localhost:8080/getState/${gameID}`)
        .then(resp => {
            if (resp.status == 200) {
                gameState = resp.data;
                if (gameState.hostChoice == null || gameState.guestChoice == null) {
                    ended = false;
                }
                updateUI();

                setTimeout(function () {
                    get_game_state();
                }, 1000);
                return true;

            } else {
                console.log("An error ocurred: ");
                console.log(resp);
                return false;
            }
        }).catch(function (error) {
            alert("Lost connection! :(");
            console.log(error);
            return false;
        });

}

function update_player_status(status) {

    if (gameID == -1) {
        console.log("You are not in a game.");
        return;
    }

    if (status != "ready" && status != "exit") {
        console.log(`Invalid status ('${status}').`);
        return;
    }

    axios
        .post(`http://localhost:8080/playerStatus/${gameID},${isHost},${status}`)
        .then(resp => {
            if (resp.status == 200) {
                if (status == "ready") {
                    gameState = resp.data;
                } else if (status == "exit") {
                    gameID = -1;
                    gameState = null;
                }
                updateUI();

            } else {
                console.log("An error ocurred: ");
                console.log(resp);
                return false;
            }
        }).catch(function (error) {
            alert("Lost connection! :(");
            console.log(error);
            return false;
        });

}

function updateUI() {

    const hostChoice = (gameState.hostChoice == null) ? "pending" : gameState.hostChoice;
    const guestChoice = (gameState.guestChoice == null) ? "pending" : gameState.guestChoice;

    document.querySelector("#game-id").innerHTML = gameState.gameID;
    document.querySelector("#host-name").innerHTML = gameState.nicknameHost;
    document.querySelector("#guest-name").innerHTML = gameState.nicknameGuest;

    // Evaluate game
    if (hostChoice != "pending" && guestChoice != "pending") {

        if (!ended) {
            ended = true;
        } else {
            return;
        }
        //document.querySelector("#opponent-choice").setAttribute("src", `./img/${isHost ? guestChoice : hostChoice}.png`);

        let result = "";
        let player = "";
        // Determine result (if not draw).
        if (hostChoice == guestChoice) {
            result = "It's a draw!";
        } else if (isHost) {
            result = `you ${outcomes[hostChoice][guestChoice] ? "won" : "lost"}!`;
            player=hostname;
        } else {
            result = `you ${outcomes[guestChoice][hostChoice] ? "won" : "lost"}!`;
            player=guestname;
        }
        console.log(result);

        swal({
            title: player +" "+ result,
            icon: result == "It's a draw!" ? "info" : (result == "you won!" ? "success" : "error"),
            buttons: {
                playAgain: {
                    text: "Play again",
                    value: "playAgain"
                },
                back: {
                    text: "Exit",
                    value: "exit"
                }
            }
        }).then((value) => {
            switch (value) {
                case "playAgain":
                    update_player_status("ready");
                    break;
                case "exit":
                    update_player_status("exit");
                    location.reload();
                    break;
                default:
                    update_player_status("ready");
            }
        });
    }

}

document.addEventListener("DOMContentLoaded", (_) => {
    document.querySelector('#create-button').addEventListener('click', (event) => { create_game_handler() });
    document.querySelector('#join-button').addEventListener('click', (event) => { join_game_handler() });
    document.querySelectorAll(".choice-button").forEach(element => {element.addEventListener('click', (event) => { choice_buttons_handler(event) }); });
});