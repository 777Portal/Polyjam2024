// this is kinda like just a utill stuff that i need in a lot of pages, if not most.
document.onload = innit()

var profile;

let socket = io.connect();

let focused = true;
let eggAmount = 0;

socket.on("EU", (data) => {
  eggAmount = addCommaToNumber(data.currentEggs);
});

socket.on("connect", () => {
  canSendEggs = true
  socket.emit("conn", {message: `Connected succesfully @ [ ${getTimeStamp()} ]`})
});

socket.on("CloseConn", (data) => {
  console.log(data)
  canSendEggs = false
  toggleVis('overlay')
  document.getElementById('reason').innerText = data.reason
});

window.onfocus = function() {
  document.title = "Eggstronomical Clicker";
  focused = true
};

window.onblur = function() {
  document.title = `EC - (${eggAmount})`;
  focused = false
};

async function innit(){
    const response = await fetch("https://www.polyjam.win/me");
    var profile = await response.json();

    // update to how /me endpoint works to include dev
    profile = profile.profile

    let id = profile.id
    let avatar = profile.avatar
    let name = profile.global_name

    profileImgs = document.getElementsByClassName('myProfileImg')
    
    // support multiple... why does it support multiple?
    for (var i = 0; i < profileImgs.length; i++) {
        profileImgs[i].src = `https://cdn.discordapp.com/avatars/${id}/${avatar}`
    }
  
    username = document.getElementById('username')
    username.innerText += ` ${name} ]`
}

function roundNumber(num){
    return Math.round(num * 100) / 100
}

// add comma to numbers we get to make it more readable
function addCommaToNumber(x) {
    x = roundNumber(x)
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

// get timestamp
function getTimeStamp() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const amOrPm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = (hours % 12 || 12).toString();
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${amOrPm}`;
}

// grabbed from my website :D
function toggleVis(elementId)
{
  var x = document.getElementById(elementId);

  if (x.style.display === "none") 
  {
    x.style.display = "block";
  }
    else 
  {
    x.style.display = "none";
  }
}
