// this is kinda like just a utill stuff that i need in a lot of pages, if not most.
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

function toggleVis(elementId){
  var x = document.getElementById(elementId);

  if (x.style.display === "none") {
    x.style.display = "block";
  }
  
  x.style.display = "none";
}

document.onload = innit()

async function innit(){
  const response = await fetch("https://www.polyjam.win/me");
  var profile = await response.json();

  profileImgs = document.getElementsByClassName('myProfileImg')
  username = document.getElementById('username')

  // update to how /me endpoint works to include dev
  profile = profile.profile
  if (!profile) {
    eggsBalance = document.getElementById('balTopBar');
    eggsBalance.style.display = "none";

    profileImgs.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🥚</text></svg>";
    username.innerText += ` Guest ]`;
    return;
  }

  let id = profile.id
  let avatar = profile.avatar
  let name = profile.global_name

  // support multiple... why does it support multiple?
  for (var i = 0; i < profileImgs.length; i++) {
    profileImgs[i].src = `https://cdn.discordapp.com/avatars/${id}/${avatar}`
  }

  username.innerText += ` ${name} ]`

  connect();
}

let profile;
let socket;
let focused;
let eggAmount;

function connect(){
  profile;

  socket = io.connect();
  
  focused = true;
  eggAmount = 0;
  
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
    document.getElementById('reason').innerText = data.reason
    
    setTimeout(() => {
      overlay = document.getElementById('overlay');
      overlay.style.display = "block";
    }, 500);
  });  
}

window.onfocus = function() {
  document.title = "AEC";
  focused = true
};

window.onblur = function() {
  if (!eggAmount) eggAmount = 'UNF'
  document.title = `AEC - (${eggAmount})`;
  focused = false
};