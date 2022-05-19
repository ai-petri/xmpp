const readline = require("readline");
const {socket, login, sendMessage} = require("./client");


var rl = readline.createInterface({input:process.stdin, output:process.stdout});

// socket.on("close", _=>{
//     rl.write("\u001b[33mconnection closed\u001b[0m");
//     rl.close();
// });


rl.on("line", async str=>
{

    if(str.startsWith("/"))
    {

        let arr = str.split(" ").map(o=>o.trim());

        let command = arr[0];

        switch(command)
        {
            case "/quit":

                break;

            case "/connect":
                
                {
                    let jid;

                    if(arr.length == 1 || !arr[1].match(/.+@.+/) )
                    {
                        jid = await askForJid();
                    }
                    else
                    {
                        jid = arr[1];
                    }

                    rl.question("password: ", password =>
                    {                  
                        login(jid,password);
                    });   
                }
                            
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
    return new Promise(resolve=>
    {
        rl.question("jid: ", answer => 
        {
            
            if(!answer.match(/.+@.+/))
            {
                askForJid().then(resolve);
            }
            else
            {
                resolve(answer.trim());
            }
        });
    })
}