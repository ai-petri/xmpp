const readline = require("readline");
const Client = require("./client");


var rl = readline.createInterface({input:process.stdin, output:process.stdout});

const client =  new Client();

client.on("close", _=>rl.close());

const roster = 
{
    m: new Map(),
    destinations: [],
    add(jid)
    {
        let parts = jid.split("/");
        
        if(!this.m.has(parts[0]))
        {
            this.m.set(parts[0], new Set());
        }
        if(parts.length>1) 
        {
            this.m.get(parts[0]).add(parts[1]);
        }
    },
    get(jid)
    {
        if (jid.indexOf("/") !== -1)
        {
            this.destinations = [jid];
        }
        else
        {
            let resources = [...this.m.get(jid)];
            this.destinations = resources.map(r=>jid+"/"+r);
        }
        return this.destinations;
    }
}

client.on("presence", ({from,priority,show})=>roster.add(from));
client.on("message", msg=>
{
    console.log("\u001b[33m"+msg.from+": \u001b[35m"+msg.text+"\u001b[0m");
    roster.add(msg.from);
});

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
                    let message = str.replace(/^([^ ]+ ){2}/, "");
                    let destinations = roster.get(arr[1]);
                    destinations.forEach(destination=>client.sendMessage(destination, message));                  
                }
                break;
            
            case "/roster":
                if(arr.length == 1)
                {
                    let arr = await client.roster();
                    console.log(arr);
                    arr.forEach(jid=>roster.add(jid));
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
    else
    {
        roster.destinations.forEach(destination=>client.sendMessage(destination, str));
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