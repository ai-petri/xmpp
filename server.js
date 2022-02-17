const net = require("net");
const readline = require("readline");
const crypto = require("crypto");

const {parseXML, parseKeyValuePairs} = require("./parse");

var clients = [];



var server = net.createServer(listener);

server.listen(8080);


var rl = readline.createInterface({input:process.stdin, output:process.stdout});

rl.on("line", str=>
{
    switch(str)
    {
        case "/quit":
            server.close();
            clients.forEach(o=>o.socket.destroy());
            rl.close();
            break;

    }
})



/**
 * 
 * @param {net.Socket} socket 
 */
function listener(socket)
{
    console.log(socket.remoteAddress);
    clients.push({socket:socket});
    socket.on("close", e=>
    {    
        clients = clients.filter(o=>o.socket !== socket);  
    });
    socket.on("data", data=>
    {
        let client = clients.filter(o=>o.socket == socket)[0];
        console.log(socket.remoteAddress + " : " +data.toString());
        let response = createResponse(data, client);
        socket.write(response);
    })
}

/**
 * 
 * @param {Buffer} data
 * @param {Number} n 
 * @returns {String} response
 */
function createResponse(data, client)
{
    var result = "";

    var responses = 
    [
        `<stream:stream id='5829902096387417290' version='1.0' xml:lang='en' xmlns:stream='http://etherx.jabber.org/streams' from='localhost' xmlns='jabber:client'>\
        <stream:features>
        <mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>
        <mechanism>SCRAM-SHA-1</mechanism>
        </mechanisms>
        </stream:features>`
    ]

    var objects = parseXML(data);
    
    for(let obj of objects)
    {
        switch(obj.name)
        {
            case "stream:stream":
                result = responses[0];
                break;
            case "auth":
                {
                    let {n,r} = parseKeyValuePairs(Buffer.from(obj.content, "base64").toString());
                    client.username = n;
                    client.nonce = r;
                    let serverNonce = r + crypto.randomBytes(32).toString("base64");
                    let salt = crypto.randomBytes(32).toString("base64");
                    let iterationsCount = 4096;

                    let challenge = `r=${serverNonce},s=${salt},i=${iterationsCount}`;
                    result = `<challenge>${Buffer.from(challenge).toString("base64")}</challenge>`
                }
                break;
            case "response":
                {
                    let o = parseKeyValuePairs(Buffer.from(obj.content,"base64").toString());

                    console.log(o);


                }
                break;
        }
    }

    
    return result;
}

