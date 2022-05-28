const net = require("net");
const events = require("events");
const crypto = require("crypto");
const tls = require("tls");



const {parseXML, parseKeyValuePairs} = require("./parse");

function Client()
{
    this.username = "";
    this.host = "";
    this.port = 5222;
    this.resource = "a";
    this.eventEmitter = new events.EventEmitter();


    this.eventEmitter.on("message", args=>
    {
        if(args[2].filter(o=>o.name == "body").length>0)
        console.log("\u001b[33m"+args[0].from + ": \u001b[35m" + args[2].filter(o=>o.name == "body")[0].content + "\u001b[0m");
    });

    this.eventEmitter.on("error", args=>
    {
        console.log(args[2].filter(o=>o.name == "text")[0].content);
    })

    this.eventEmitter.once("failure", args=>{
        let errorMessage = args[2].find(o=>o.name == "text")?.content || args[2][0]?.name;
        console.error("\u001b[31m"+errorMessage+"\u001b[0m");
        this.socket.end();
    });

    this.socket = new net.Socket();

    this.socket.on("connect", ()=>
    {
        console.log("\u001b[33mconnected\u001b[0m");
        this.socket.write(Buffer.from(`<stream:stream xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" version="1.0" to="${this.host}">`));
    });

    this.socket.on("data", (chunk) =>
    {
        var objects = parseXML(chunk);

        for(let {name, attributes, content, children} of objects)
        {
            this.eventEmitter.emit(name, [attributes, content, children]);
        }
    });

    this.socket.on("close", _=>{
        console.log("\u001b[33mconnection closed\u001b[0m");
        this.emit("close");
    });

}

Client.prototype = new events.EventEmitter();
Client.prototype.constructor = Client;



Client.prototype.login = async function(jid, password)
{

    [this.username, this.host] = jid.split("@");

    

    this.socket.connect(this.port, this.host);



    console.log("\u001b[33mlogging in as "+ this.username + "...\u001b[0m");

    await new Promise(resolve => this.eventEmitter.once("stream:stream",resolve));

    await this.startTLS();

    var clientNonce = crypto.randomBytes(32).toString("hex");

    var str = `n,,n=${this.username},r=${clientNonce}`;

    var message = `<auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl" mechanism="SCRAM-SHA-1">${Buffer.from(str).toString("base64")}</auth>`;

    this.eventEmitter.once("challenge", async args=>
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

        this.eventEmitter.once("success", async args=>
        {
            let {v} = parseKeyValuePairs(Buffer.from(args[1],"base64").toString())
            
            let serverKey = crypto.createHmac("sha1", saltedPassword).update("Server Key").digest();

            let serverSignature = crypto.createHmac("sha1", serverKey).update(authMessage).digest();

            if(v == serverSignature.toString("base64"))
            {
                console.log("\u001b[32msuccess!\u001b[0m");
                this.emit("login", this.username);
            }
            else
            {
                console.error("\u001b[31msignature verification failed\u001b[0m");

                this.socket.end();
                return;
            }      


            await this.startStream();
            await this.bindResource(this.resource);
            await this.startSession();

        })

        

        this.socket.write(message2);

    });

    

    this.socket.write(message);
}

Client.prototype.startTLS = async function()
{
    this.socket.write("<starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls'/>");

    await new Promise(resolve => this.eventEmitter.once("proceed",resolve));

    await new Promise(resolve => this.socket = tls.connect({socket:this.socket}, resolve));
    
    this.socket.on("data", (chunk) =>
    {
        var objects = parseXML(chunk);

        for(let {name, attributes, content, children} of objects)
        {
            this.eventEmitter.emit(name, [attributes, content, children]);
        }
    });

    this.socket.write(Buffer.from(`<stream:stream xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" version="1.0" to="${this.host}">`));
    
}

Client.prototype.startStream = function()
{
    var str = `<?xml version="1.0"?><stream:stream to="localhost" xml:lang="en" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`;
    return new Promise(resolve =>
    {
        this.socket.once("data", resolve);
        this.socket.write(Buffer.from(str));
    });
}

Client.prototype.startSession = function()
{
    var str = `<iq to='${this.host}' type='set' id='sess_1'><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq>`;
    return new Promise(resolve => 
    {
        this.socket.once("data", resolve);
        this.socket.write(Buffer.from(str));
    })
}

Client.prototype.bindResource = function(resource)
{
    var str = `<iq id="_xmpp_bind1" type="set"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><resource>${resource}</resource></bind></iq>`;
    return new Promise(resolve => 
    {
        this.socket.once("data", resolve);
        this.socket.write(Buffer.from(str));
    })
}

Client.prototype.roster = function()
{
    var str = `<iq id="1234" type="get"><query xmlns='jabber:iq:roster'/></iq>`;
    return new Promise(resolve =>
    {
        this.socket.once("data", o=>resolve(parseXML(o.toString()).filter(o=>o.name == "item").map(o=>o.attributes.jid)));
        this.socket.write(Buffer.from(str));
    })
}

Client.prototype.rosterAdd = function(jid)
{
    var str = `<iq id="1234" type="set"><query xmlns='jabber:iq:roster'><item jid="${jid}"/></query></iq>`;
    return new Promise(resolve =>
    {
        this.socket.once("data", resolve);
        this.socket.write(Buffer.from(str));
    })
}

Client.prototype.rosterRemove = function(jid)
{
    var str = `<iq id="1234" type="set"><query xmlns='jabber:iq:roster'><item subscription="remove" jid="${jid}"/></query></iq>`;
    return new Promise(resolve =>
    {
        this.socket.once("data", resolve);
        this.socket.write(Buffer.from(str));
    })
}



Client.prototype.sendMessage = function(address, message)
{   
    let msg = `<message id="msg_1" to="${address}" type="chat"><body>${message}</body></message>`;
    this.socket.write(Buffer.from(msg));
}

Client.prototype.disconnect = function()
{
    if(this.socket)
    {
        this.socket.end();
    }
}


module.exports = Client;