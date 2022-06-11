var current = "";
var roster = new Map();
var form = document.querySelector("form");
var sendButton = document.querySelector("#send_button");
var messageInput = document.querySelector("#message_input");

var messages = 
{
    el: document.querySelector("#messages"),
    append(from, text)
    {
        let date = new Date();
        let div = document.createElement("div");
        let chat = from == "me" ? current : from.split("/")[0];
        div.setAttribute("data-chat", chat);
        div.classList.add("message");
        div.innerHTML = `<b>${from} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}</b>`;
        let p = document.createElement("p");
        p.innerText = text;
        div.append(p);
        this.el.append(div);
        this.el.scrollTop = this.el.scrollHeight;
    },
    show(chat)
    {
        document.querySelectorAll(".message").forEach(el=>
        {
            if(el.getAttribute("data-chat") == chat)
            {
                el.classList.remove("hidden");
            }
            else
            {
                el.classList.add("hidden");
            }
        })

    }
    
}

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

messageInput.addEventListener("keypress", e=>
{
    if(e.key == "Enter")
    {
        sendMessage(messageInput.value);
        messageInput.value = "";
    }
});

function updateRoster()
{
    fetch("/?action=getRoster").then(r=>r.json()).then(obj=>
    {
        let arr = obj.roster;
        let ul = document.querySelector("#roster>ul");
        ul.innerHTML = "";
        roster.clear();
        for(let jid of arr)
        {
            roster.set(jid, new Set());
            let li = document.createElement("li");
            li.innerText = jid;
            li.onclick =  _=> {current = jid; messages.show(jid)}
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
    switch(obj.type)
    {
        case "message":
        {
            let [jid,resource] = obj.from.split("/");
            if(resource !== "")
            {
                roster.get(jid)?.add(resource); 
            }
            if(obj.text)
            {
                messages.append(obj.from, obj.text);
            }
        }
        break;
        case "presence":
        {
            let [jid,resource] = obj.from.split("/");
            if(resource !== "")
            {
                roster.get(jid)?.add(resource); 
            }
        }
        break;
        case "error":
        console.log(obj);
    }
    
    
}

function sendMessage(message)
{
    var destinations = [...roster.get(current)].map(resource=>current+"/"+resource);
    fetch("/?action=sendMessage", {method:"POST", body: JSON.stringify({to:destinations, text:message})}).then(r=>r.json()).then(obj=>
    {
        if(obj.status == "OK")
        {
            messages.append("me",message);
        }
    });
}

getMessage();