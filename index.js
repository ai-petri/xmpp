const readline = require("readline");
const Client = require("./client");


var rl = readline.createInterface({input:process.stdin, output:process.stdout});

const client =  new Client();

client.on("close", _=>rl.close());

rl.on("line", async str=>
{

    if(str.startsWith("/"))
    {

        let arr = str.split(" ").map(o=>o.trim());

        let command = arr[0];

        switch(command)
        {
            case "/quit":
                client.disconnect();
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
                        client.login(jid,password);
                    });   
                }
                            
                break;

            case "/msg":
                if(arr.length > 2)
                {
                    client.sendMessage(arr[1], str.replace(/^([^ ]+ ){2}/, ""));
                }
                break;
            
            case "/roster":
                if(arr.length == 1)
                {
                    console.log(await client.roster());
                }
                else if(arr.length == 3)
                {
                    if(arr[1] == "add")
                    {
                        client.rosterAdd(arr[2]);
                    }
                    else if(arr[1] == "remove")
                    {
                        client.rosterRemove(arr[2]);
                    }
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