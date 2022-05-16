const {socket, login, sendMessage} = require("./client");




socket.on("close", _=>{
    console.log("\u001b[33mconnection closed\u001b[0m");

});

