const net = require("net");
const readline = require("readline");
const events = require("events");
const crypto = require("crypto");

const {performance} = require('perf_hooks');

const {parseXML, parseKeyValuePairs} = require("./parse");
const { rejects } = require("assert");


var username = "";
var host = "";
var port = 8080;
var resource = "a";
var friends = [];


var eventEmitter = new events.EventEmitter();

var socket = new net.Socket();

socket.on("connect", onConnect);
socket.on("data", onData);
socket.on("close", _=>console.log("\u001b[33mconnection closed\u001b[0m"));


function onConnect()
{
    console.log("\u001b[33mconnected\u001b[0m");
    socket.write(Buffer.from(`<stream:stream xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" version="1.0" to="${host}">`));
}

function onData(chunk)
{
    var objects = parseXML(chunk);

    for(let {name, attributes, content, children} of objects)
    {
        eventEmitter.emit(name, [attributes, content, children]);
    }

    //console.log(chunk.toString());
    //console.log(objects);
}

eventEmitter.on("message", args=>
{
    console.log("\u001b[33m"+args[0].from + ": \u001b[35m" + args[2].filter(o=>o.name == "body")[0].content + "\u001b[0m");

});

var rl = readline.createInterface({input:process.stdin, output:process.stdout});

rl.on("line", str=>
{

    if(str.startsWith("/"))
    {

        let arr = str.split(" ").map(o=>o.trim());

        let command = arr[0];

        switch(command)
        {
            case "/quit":
                rl.close();
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
                    eventEmitter.once("stream:stream", _=>login(username, password));
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


async function login(username, password)
{
    console.log("\u001b[33mlogging in as "+ username + "...\u001b[0m");

    var clientNonce = crypto.randomBytes(32).toString("hex");

    var str = `n,,n=${username},r=${clientNonce}`;

    var message = `<auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl" mechanism="SCRAM-SHA-1">${Buffer.from(str).toString("base64")}</auth>`;

    eventEmitter.once("challenge", async args=>
    {
        let challenge = args[1];
        let decoded = Buffer.from(challenge,"base64").toString();

        let {r,s,i} = parseKeyValuePairs(decoded);

        if(!r.startsWith(clientNonce))
        {
            console.error("serverNonce doesn't start with the clientNonce")
        }

        //TODO saslprep
        let response = `c=biws,r=${r}`;

        let salt = Buffer.from(s,"base64");

        let saltedPassword = crypto.pbkdf2Sync(password, salt, +i, 20, "sha1");

        let clientKey = crypto.createHmac("sha1", saltedPassword).update("Client Key").digest();

        let storedKey = crypto.createHash("sha1").update(clientKey).digest();

        let authMessage = str.substring(3) + "," + decoded + "," + response;

        let clientSignature = crypto.createHmac("sha1", storedKey).update(authMessage).digest();

        let proof = clientKey.map((a,i)=>a ^ clientSignature[i]);

        response += ",p=" + proof.toString("base64");
  
        let message2 = `<response xmlns="urn:ietf:params:xml:ns:xmpp-sasl">${Buffer.from(response).toString("base64")}</response>`;

        eventEmitter.once("success", async args=>
        {
            let {v} = parseKeyValuePairs(Buffer.from(args[1],"base64").toString())
            
            let serverKey = crypto.createHmac("sha1", saltedPassword).update("Server Key").digest();

            let serverSignature = crypto.createHmac("sha1", serverKey).update(authMessage).digest();

            if(v == serverSignature.toString("base64"))
            {
                console.log("\u001b[32msuccess!\u001b[0m");
            }
            else
            {
                console.error("\u001b[31msignature verification failed\u001b[0m");
                socket.end();
                return;
            }      


            await startStream();
            await bindResource(resource);

            friends.push(`${username}@${host}/${resource}`);

                socket.write(Buffer.from(`<iq to='${host}' type='set' id='sess_1'>
            <session xmlns='urn:ietf:params:xml:ns:xmpp-session'/>
            </iq>`)); 

        })


        socket.write(message2);

    });

    

    socket.write(message);
}



function startStream()
{
    var str = `<?xml version="1.0"?><stream:stream to="localhost" xml:lang="en" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`;
    return new Promise(resolve =>
    {
        socket.once("data", resolve);
        socket.write(Buffer.from(str));
    });
}

function bindResource(resource)
{
    var str = `<iq id="_xmpp_bind1" type="set"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><resource>${resource}</resource></bind></iq>`;
    return new Promise(resolve => 
    {
        socket.once("data", resolve)
        socket.write(Buffer.from(str));
    })
}

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


function sendMessage(friend, message)
{

    friends.filter(o=>o.startsWith(friend)).forEach(address=>
    {
        let msg = `<message id="msg_1" to="${address}" type="chat"><body>${message}</body></message>`;
        socket.write(Buffer.from(msg));
    })
    
   
}