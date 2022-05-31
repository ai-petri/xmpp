const Client = require("./client");
const http = require("http");
const fs = require("fs");
const { inherits } = require("util");




var client; 
var pendingResponse;

init();



var server = http.createServer((req,res)=>
{
    let path = __dirname + "/www"

    let requestUrl = new URL(req.url, "http://"+req.headers.host);

    let body = "";

    req.on("data", chunk=>
    {
        body += chunk.toString();
    })

    let action = requestUrl.searchParams.get("action");

    if(action)
    {
        

        req.on("end",_=>processClientMessage(action, body, res)); 

        if(action == "getMessage")
        {
            pendingResponse = res;
        }
    }
    else
    {
        if(requestUrl.pathname == "/")
        {
            path += "/index.html";   
        }
        else
        {
            
            path += requestUrl.pathname;
        }

        if(fs.existsSync(path))
        {
            fs.createReadStream(path).pipe(res);
        }
        else
        {
            res.writeHead(404,"Not Found");
            res.end("<h1>404</h1>");
        }
    }
    
})

server.listen(80);

function init()
{
    client = new Client();

    client.on("error", errorMessage=>
    {
        if(pendingResponse && !pendingResponse.writableEnded)
        {
            pendingResponse.end(JSON.stringify({type:"error", errorMessage}));
        }
    });

    client.on("close", _=>
    {
        init();
    })
}

function processClientMessage(action, body, response)
{
    let obj = body.length>0 ? JSON.parse(body) : {};
    console.log(obj);
    switch(action)
    {

        case "login":
            {
                client.login(obj.jid, obj.password);
                client.once("login", username=>
                {
                    response.end(JSON.stringify({result:"success", username}));
                })

            }
            break;

        case "getRoster":
            {
                client.roster().then(o=>response.end(JSON.stringify(o)));
            }
        
    }
}