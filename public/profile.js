function getEl(id){
  return document.getElementById(id)
}

document.onload = innit()

async function innit(){
  let id = getEl('idHolder').innerText
 
  const profileData = await fetch(`https://www.polyjam.win/api/users/${id}`);
  const pd = await profileData.json();
  
  const profileInfo = pd.profile

  const globalName = profileInfo.global_name
  getEl('username').innerText = globalName
  
  const joindate = pd.firstLogin
  var utc = new Date(joindate);
  var offset = utc.getTimezoneOffset();
  var local = new Date(utc.getTime() + offset * 60000);
  getEl('joindate').innerText = `( first joined ${local})`

  const userUrl = `https://cdn.discordapp.com/avatars/${profileInfo.id}/${profileInfo.avatar}`
  getEl('profileImg').src = userUrl

  const currentEggs = pd.currentEggs
  getEl('currentEggs').innerText = `${addCommaToNumber(currentEggs)} current eggs`

  const totalEggs = pd.totalEggs
  getEl('totalEggs').innerText = `${addCommaToNumber(totalEggs)} total eggs`
}

// add comma to numbers we get to make it more readable
function addCommaToNumber(x) {
  x = roundNumber(x)
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}