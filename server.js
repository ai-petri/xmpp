const net = require("net");
const readline = require("readline");
const crypto = require("crypto");

const {parseXML, parseKeyValuePairs} = require("./parse");

var clients = [];

var password = "pass";
var salt = crypto.randomBytes(32).toString("base64");
var iterationsCount = 4096;
var saltedPassword = crypto.pbkdf2Sync(password, salt, iterationsCount, 20, "sha1");

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
                    client.clientNonce = r;
                    client.serverNonce = r + crypto.randomBytes(32).toString("base64");
                    client.challenge = `r=${client.serverNonce},s=${salt},i=${iterationsCount}`;
                    result = `<challenge>${Buffer.from(client.challenge).toString("base64")}</challenge>`
                }
                break;
            case "response":
                {
                    let response = Buffer.from(obj.content,"base64").toString();
                    let {c,r,p} = parseKeyValuePairs(response);

                    client.proof = p;

                    let clientKey = crypto.createHmac("sha1", saltedPassword).update("Client Key").digest();

                    let storedKey = crypto.createHash("sha1").update(clientKey).digest();

                    let authMessage = `n=${client.username},r=${client.clientNonce},${client.challenge},c=biws,r=${r}`;

                    let clientSignature = crypto.createHmac("sha1", storedKey).update(authMessage).digest();

                   

                   let proof = clientKey.map((a,i)=>a ^ clientSignature[i]).toString("base64");

                    if(proof == client.proof)
                    {
                        let serverKey = crypto.createHmac("sha1", saltedPassword).update("Server Key").digest();

                        let serverSignature = crypto.createHmac("sha1", serverKey).update(authMessage).digest();

                        result = `<success>${Buffer.from("v="+serverSignature.toString("base64")).toString("base64")}</success>`;
                    }
                    else
                    {
                        result = "<failure xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><not-authorized/><text xml:lang='en'>Invalid username or password</text></failure>";
                    }                 

                }
                break;
        }
    }

    
    return result;
}

