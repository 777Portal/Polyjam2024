document.onload = innit()

var holder;
var index;
var allData;

async function innit() {
  holder = document.getElementById('leaderboardHolder');

  const response = await fetch("https://www.polyjam.win/api/leaderboard/?type=currentEggs&method=-1");
  allData = await response.json();
  index = 0;
  
  addTenToLeaderboard();

  document.getElementById('refresh').addEventListener("click", function() { location.reload() });
  document.getElementById('refresh2').addEventListener("click", function() { location.reload() });
  
  document.getElementById('loadMore').addEventListener("click", addTenToLeaderboard());
  document.getElementById('loadMore2').addEventListener("click", addTenToLeaderboard());
}

async function addTenToLeaderboard() {
  holder.innerText = '';
  let originalIndex = index;
  
  for (let i = originalIndex; i < allData.length && i < originalIndex + 10; i++) {
    let userJson = allData[i];

    addUser(userJson);
    index++;
  }
}

async function addUser(json){
  // profile shitez
  const profile = json.profile
  const id = profile.id
  const avatar = profile.avatar
  const globalName = profile.global_name
  const username = profile.username

  // egg shitez
  const currentEggs = addCommaToNumber(json.currentEggs)
  const totalEggs = addCommaToNumber(json.totalEggs)

  const number = (holder.childElementCount ?? 0) + 1 // js + cacheing being strange rn...

  // append list item to ul for css reasons :P
  let newLi = createEl('li')
    newLi.id = username

  let rankNum = createEl('h1')
    rankNum.innerText = `#${number}`

  let profileImg = createEl('img')
    profileImg.src = `https://cdn.discordapp.com/avatars/${id}/${avatar}`    

  // the display name & link to profile
  let profileLink = createEl('a')
    profileLink.innerText = `[ ${globalName} ]`
    profileLink.href = `/@${username}`
    
  // eggs n stuff
  let currentMoneyz = createEl('p')
    currentMoneyz.innerText = `current eggs: ${currentEggs}`

  let totalMoneyz = createEl('p')
    totalMoneyz.innerText = `total eggs: ${totalEggs}`

  newLi.appendChild(rankNum)
  newLi.appendChild(createEl('br'))
  newLi.appendChild(profileImg)
  newLi.appendChild(createEl('br'))
  newLi.appendChild(profileLink)
  newLi.appendChild(createEl('br'))
  newLi.appendChild(currentMoneyz)
  newLi.appendChild(createEl('br'))
  newLi.appendChild(totalMoneyz)
  
  holder.appendChild(newLi)

  function createEl(element){
    return document.createElement(element)
  }
}

function roundNumber(num){
  return Math.round(num * 100) / 100
}

// add comma to numbers we get to make it more readable
function addCommaToNumber(x) {
  x = roundNumber(x)
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}