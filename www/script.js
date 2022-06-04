var current = "";
var form = document.querySelector("form");
var sendButton = document.querySelector("#send_button");
var messageInput = document.querySelector("#message_input");
var messages = document.querySelector("#messages");

form.addEventListener("submit", e =>
{
    e.preventDefault();

    let jid = document.querySelector("#jid").value;
    let password = document.querySelector("#password").value;


    fetch("/?action=login", {method: "POST", body:JSON.stringify({jid,password})})
    .then(r=>r.json())
    .then(obj=>
        {
            if(obj.result && obj.result == "success")
            {
                document.querySelector("#login").classList.add("hidden");
                document.querySelector("#container").classList.remove("hidden");
                updateRoster();
                sendPresence();
            }
        });
    
});

sendButton.addEventListener("click", e => 
{
    sendMessage(messageInput.value);
    messageInput.value = "";
});


function updateRoster()
{
    fetch("/?action=getRoster").then(r=>r.json()).then(obj=>
    {
        let arr = obj.roster;
        let ul = document.querySelector("#roster>ul");
        ul.innerHTML = "";
        for(let jid of arr)
        {
            let li = document.createElement("li");
            li.innerText = jid;
            li.onclick =  _=> current = jid; 
            ul.append(li);
        }
    });
}

function sendPresence()
{
    fetch("/?action=sendPresence");
}

function getMessage()
{
    fetch("/?action=getMessage").then(r=>r.json()).then(obj=>{processMessage(obj); getMessage()});
}

function processMessage(obj)
{
    if(obj.type == "message")
    {
        let date = new Date();
        let div = document.createElement("div");
        div.classList.add("message");
        div.innerHTML = `<b>${obj.from} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}</b>`;
        let p = document.createElement("p");
        p.innerText = obj.text;
        div.append(p);
        messages.append(div);
    }
}

function sendMessage(message)
{
    fetch("/?action=sendMessage", {method:"POST", body: JSON.stringify({to:current, text:message})}).then(r=>r.json()).then(obj=>
    {
        if(obj.status == "OK")
        {
            processMessage({from:"me", text: message});
        }
    });
}

getMessage();