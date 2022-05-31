var form = document.querySelector("form");

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
            }
        });
    
});

function updateRoster()
{
    fetch("/?action=getRoster").then(r=>r.json()).then(arr=>
    {
        let ul = document.querySelector("#roster>ul");
        ul.innerHTML = "";
        for(let jid of arr)
        {
            let li = document.createElement("li");
            li.innerText = jid;
            ul.append(li);
        }
    });
}

function getMessage()
{
    fetch("/?action=getMessage").then(r=>r.json()).then(obj=>{processMessage(obj); getMessage()});
}

function processMessage(obj)
{
    console.log(obj);
}

getMessage();