const readline = require("readline");
const {socket, login, sendMessage} = require("./client");

var port = 8080;

var rl = readline.createInterface({input:process.stdin, output:process.stdout});

socket.on("close", _=>{
    rl.write("\u001b[33mconnection closed\u001b[0m");
    rl.close();
});

rl.on("line", str=>
{

    if(str.startsWith("/"))
    {

        let arr = str.split(" ").map(o=>o.trim());

        let command = arr[0];

        switch(command)
        {
            case "/quit":
                socket.end();
                break;
            case "/connect":
                
                if(arr.length == 1 || !arr[1].match(/.+@.+/) )
                {
                    askForJid()                                     
                }
                else
                {
                    let parts = arr[1].split("@");
                    username = parts[0];
                    host = parts[1];
                    if(arr.length > 3)
                    {
                        port = +arr[2];
                    }
                }
                rl.question("password: ", password =>
                {  
                    socket.connect(port, host);
                    login(username,password);
                });
                break;
            case "/msg":
                if(arr.length > 2)
                {
                    sendMessage(arr[1], str.replace(/^([^ ]+ ){2}/, ""));
                }
        }
    }
});

function askForJid()
{   

    rl.question("jid: ", answer => 
    {
        if(!answer.match(/.+@.+/))
        {
            askForJid();
        }
        else
        {
            let parts = answer.trim().split("@");
            username = parts[0];
            host = parts[1];
        }
    });

}