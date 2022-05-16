const {socket, login, sendMessage} = require("./client");
const http = require("http");
const fs = require("fs");




socket.on("close", _=>{
    console.log("\u001b[33mconnection closed\u001b[0m");

});


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
    
    req.on("end",_=>processClientMessage(body));

    if(requestUrl.searchParams.get("action") == 1)
    {
        pendingResponse = res; 
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

function processClientMessage(message)
{
    console.log(message);
}