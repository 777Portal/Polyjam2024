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
  getEl('joindate').innerText = `( first joined ${joindate})`

  const userUrl = `https://cdn.discordapp.com/avatars/${profileInfo.id}/${profileInfo.avatar}`
  getEl('profileImg').src = userUrl

  const currentEggs = pd.currentEggs
  getEl('currentEggs').innerText = `${addCommaToNumber(currentEggs)} current eggs`

  const totalEggs = pd.totalEggs
  getEl('totalEggs').innerText = `${addCommaToNumber(totalEggs)} total eggs`
}