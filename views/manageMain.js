document.onload = innit()

async function innit(){
    // get all whitelist
    const response = await  fetch("https://www.nahid.win/whitelist");
    const allAccounts = await response.json();

    holder = document.getElementById('accountHolder')

    for (account in allAccounts){
        console.log(account)

        li = createLiElement(account, allAccounts[account])

        holder.appendChild(li);
    }

}

function createLiElement(text, info){
    let li = document.createElement("li");
    li.appendChild(document.createTextNode(text));
    
    let a = document.createElement("a")
    a.innerText = ' (logs) '
    li.appendChild(a)

    a.onclick = function(){
        let tab = window.open('about:blank', '_blank');
        tab.document.write('For email ', text, ' \n\n\n ' , JSON.stringify(info));
    }

    return li
}