const {login, sendMessage} = require("./client");
const http = require("http");
const fs = require("fs");






var pendingResponse;


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
        

        req.on("end",_=>processClientMessage(action, body)); 

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

function processClientMessage(action, body)
{
    let obj = body.length>0 ? JSON.parse(body) : {};
    console.log(obj);
    switch(action)
    {

        case "login":
            {
                login(obj.jid, obj.password);

            }
        
    }
}