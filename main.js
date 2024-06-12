// config stuff 
// Considering switching to .env but its basically the same imo.
const { clientId, 
  clientSecret, 
  port, 
  sessionSecretKey, 
} = require('./jsons/config.json');

// web requests
const { request } = require('undici');

// express stuff
const express = require('express');
const app = express();

const session = require('express-session');
const sessionMiddleware = session({
  secret: sessionSecretKey,
  resave: true,
  saveUninitialized: true,
});

const server = require('http').createServer(app);
const io = require('socket.io')(server);

// Use express-session middleware
app.use(sessionMiddleware)

io.engine.use(sessionMiddleware); // to use it in the socket (i don't think i used this but yk)

// file stuff
const fs = require("fs"); 
const { writeFile, readFile } = require('fs');
            
var developerIds;

app.use(express.static("public"));

const shopItems = require('./jsons/shop.json');

readFile("./jsons/whitelist.json", "utf8", (error, data) => {
  if (error) {
    console.error(error);
    // developerIds = require('./jsons/whitelist.json') if it fails this changes nothing
    developerIds = {} // JSON.parse(developerIds)
  }
  developerIds = JSON.parse(data);
});

// storage for users.
var users;

// users.json will only contain like information on all users, more specific stuff will be in the storage.
readFile("./jsons/users.json", "utf8", (error, data) => {
  if (!error) return users = JSON.parse(data);

  console.error(error); // actually don't know if this will throw an error but im trying to clean the code a little so uhhh just make an issue if this stops the application
  users = require('./jsons/users.json')
  users = JSON.parse(users)
});

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  if (!req.session.authenticated) {
    return res.redirect('/authenticate');
  }
  next();
};

// get profile via username
function getUserByUsername(username) {
  for (const userId in users) {
    if (users.hasOwnProperty(userId) && users[userId].profile.username === username) {
      return users[userId];
    }
  }
  return null; // User not found
}

app.get('/universal.css', (request, response) => {
  return response.sendFile('universal.css', { root: './public' });
});

// to acess the session data between the two services (wss and website)
const sessionData = {};

// this route is for the authentication process
app.get('/authenticate', async (req, res) => {
  const { code } = req.query;
  
  // the code we use in discord api (so if no code included just give them the page)
  if (!code) return res.sendFile('auth.html', { root: './views' });
  // console.log(code)

  // if there is code process (login) request
  try {
    if ( req.session.authenticated ) return res.redirect('/');

    // get send Oauth2 request
    const tokenResponseData = await request('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `https://www.polyjam.win/authenticate`,
        scope: 'identify',
      }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const oauthData = await tokenResponseData.body.json();

    // console.log(oauthData)

    // if error on access ect ect send them the auth file back to redo.
    if (oauthData.error) return res.sendFile('auth.html', { root: './views' });

    let userResult = await request('https://discord.com/api/users/@me', {
      headers: {
        authorization: `${oauthData.token_type} ${oauthData.access_token}`,
      },
    });

    userResult = await userResult.body.json()
    // console.log(userResult)

    // for future use
    let id = userResult.id

    // if id is in whitelist (dev list basically) don't give them the ability to acess dev stuff (also should be in the main storage when its done)
    if ( developerIds.hasOwnProperty( id ) ) req.session.dev = true;
    
    // account doesn't exist.
    if ( ! users.hasOwnProperty( id ) )
    {
      // create it in the json
      users[id] = {};
      
      // assign it
      let userObject = users[id]
      
      userObject.firstLogin = new Date()
      userObject.profile = userResult // for future reference
      userObject.isDev = developerIds.hasOwnProperty(id)
      userObject.eggDecoration = []
      userObject.unconfirmedEggs = {}
      userObject.userEggs = {}
      userObject.shop = {}
      userObject.totalEggs = 0
      userObject.currentEggs = 0
      
      // todo, add maybe like a greeting system?
      req.session.firstLogin = true
    }

    // Store authentication in session
    req.session.authenticated = true;
    req.session.info = userResult

    // so to get it from the main, we save the id so we can look that up in the wss server.
    const sessionId = req.session.id; // get session ID
    // console.log(sessionId)

    sessionData[sessionId] = req.session; // store session data

    // finally update the json file with the new user info.
    writeFile('./jsons/users.json', JSON.stringify(users), (error) => {console.error(error, users)})

  } 
  catch (error) 
  {
    console.error(error);
    return res.sendFile('auth.html', { root: './views' });
  }

  // passed all checks, so allow them in.
  return res.redirect('/')
});

app.get('/logout', (req, res) => {
  // Clear session data
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/');
  });
});

// this is the actual check (for the homepage), so if its not authed then send em to the gulag, if it is, allow them through
app.get('/', checkAuth, (req, res) => {
  return res.sendFile('authed.html', { root: './views' });
})

// this is for the shop
app.get('/shop', checkAuth, (req, res) => {
  return res.sendFile('shop.html', { root: './views' });
})

// this is for the shop
app.get('/leaderboards', (req, res) => {
  return res.sendFile('leaderboard.html', { root: './views' });
})

app.get('/whitelist', checkAuth, (req, res) => {
  return res.json( developerIds )
})

app.get('/shopItems', checkAuth, (req, res) => {
  return res.sendFile('shop.json', { root: './jsons'} );
})

// css that doesn't need you to be logged in, so for like auth.
app.get('/assets/universal.css', (reaq, res) => {
  return res.sendFile('universal.css', { root: './public' });
})

// for dashbaord
app.get('/assets/dashboard.css', checkAuth, (req, res) => {
  return res.sendFile('dashboard.css', { root: './public' });
})

// for dashbaord
app.get('/assets/shop.js', checkAuth, (req, res) => {
  return res.sendFile('shop.js', { root: './public' });
})

// for dashbaord javascript
app.get('/assets/authed.js', checkAuth, (req, res) => {
  return res.sendFile('authed.js', { root: './public' });
})

// for the eggs stuffz (websocket)
app.get('/assets/eggClicker.js', checkAuth, (req, res) => {
  return res.sendFile('eggClicker.js', { root: './public' });
})

// for img used in meta tags
app.get('/assets/leaderboard.js', (req, res) => {
  return res.sendFile('leaderboard.js', { root: './public' });
})

app.get('/assets/profile.js', (req, res) => {
  return res.sendFile('profile.js', { root: './public' });
})


// for img used in meta tags
app.get('/assets/thumb.png', (req, res) => {
  return res.sendFile('thumb.png', { root: './public' });
})

// for img used in meta tags
app.get('/assets/leaderboard.png', (req, res) => {
  return res.sendFile('leaderboard.png', { root: './public' });
})

// todo add fs to modify allowed email stuff
app.post('/modifyWhitelist', checkAuth, (req, res) => {
  body = req.body
  
  if ( ! body ) return res.status(400)

  console.log(body)

  return res.status(200)
})

// we use this as the actual html, only the head is added dynamically (on the server side atleast.)
let userProfilePage = 
`
<body>
<nav>
  <div class="logo-container">
    <h2>Eggstronomical Clicker</h2>
  </div>
</nav>

<section>

  <aside>
    <a href="/"> Home </a>
    <br>
    <br>
    <a href="/shop"> Shop </a>
    <br>
    <br>
    <a href="/@self" class="active"> My profile </a>
    <br> 
    <br> 
    <a href="/leaderboards">Leaderboard</a>
    <br>
    <br>
    <a href="Https://ExonAuto.me">Credits</a>
  </aside>

  <main id="main" style="text-align: center;">
    
    <h1 id="username"> username </h1>
    
    <small id="joindate"> ( joined: joindate ) </small>
    
    <br>
    
    <img id="profileImg" style="max-width: 256px; max-height: 256px;">
    
    <br>
    
    <p id="currentEggs"> currentEggs: </p>
    
    <p id="totalEggs"> allEggs: </p>
    
    <br>
    
    <p>Eggs: </p>
    
    <div class="container" style="text-align: center;" >
      <!-- <div class="item" style="max-width: 100px; max-height: 100px;">
        <p>Eggs</p>
      </div> -->
    </div>
  </main>
</section>
</body>

<script src="/assets/profile.js"></script>
</html>
`

//should handle usernames..., also gives the funny meta data that discord hates to update so i couldn't include a live count of the user's eggs and such :(
app.get('/@:username', async (req, res) => {
  let reqUsername = req.params.username
  const userData = await getUserByUsername( reqUsername );

  let session = req.session

  if ( reqUsername === 'self' && session.authenticated) return res.redirect(`/@${session.info.username}`)

  if ( !userData ) return res.status(404).json({error:"couldn't find that user D: please make sure you typed the correct username, or that user has played atleast once."});

  let profile = userData.profile
  // console.log(profile)

  let id = profile.id
  let avatar = profile.avatar

  let username = profile.username
  let name = profile.global_name

  let profileImageUrl = `https://cdn.discordapp.com/avatars/${id}/${avatar}`

  // we use usernames as opposed to uh global names to push the blame onto discord if someone has a bad username
  let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${name}'s profile 🐰</title>
          <meta name="description" content="${username}'s profile">
          <meta property="og:title" content="Eggstronomical Clicker 🐰">
          <meta property="og:description" content="${username}'s profile">
          <meta property="og:image" content="${profileImageUrl}">
          <meta property="og:url" content="http://www.polyjam.win/@${username}">
          <link href="./assets/dashboard.css" rel="stylesheet">
          <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🥚</text></svg>">
          <div id="idHolder">${id}</div>
      </head>
  `;
  
  // add the rest of the html
  htmlContent += userProfilePage

  res.setHeader('Content-Type', 'text/html');

  // should be the meta tags correctly set.
  res.send(htmlContent);
});

// api responses, this one is specificly just your user data.
app.get('/me', checkAuth, (req, res) => {
  let myUser = users[req.session.info.id]
  let shop = myUser.shop ?? {}
  // console.log( myUser, myUser.shop, req.session.info.id)
  res.json( { profile: req.session.info, shop, isDev: req.session.dev ?? false } );
})

// get by display names
app.get('/api/users/@:username', async (req, res) => {
  let reqUsername = req.params.username
  const userData = await getUserByUsername( reqUsername );

  if ( !userData ) return res.status(404).json({error:"couldn't find that user D: please make sure you typed the correct username, or that user has played atleast once."});

  const profile = userData.profile
  const currentEggs = userData.currentEggs
  const totalEggs = userData.totalEggs
  const userEggs = userData.userEggs
  const firstLogin = userData.firstLogin

  res.json( { profile, currentEggs, totalEggs, userEggs, firstLogin} );
})

// user api with id's instead of display names. now that i think about it, because i don't refresh the tokens, display name stuff could break but uhhhh we don't talk about it.
app.get('/api/users/:id', async (req, res) => {
  let reqId = req.params.id

  let userData = users[reqId]

  if ( !userData ) return res.status(404).json({error:"couldn't find that user D: please make sure you typed the correct id, or that user has played atleast once."});

  const profile = userData.profile
  const currentEggs = userData.currentEggs
  const totalEggs = userData.totalEggs
  const userEggs = userData.userEggs
  const firstLogin = userData.firstLogin

  res.json( { profile, currentEggs, totalEggs, userEggs, firstLogin} );
})

// https://www.polyjam.win/api/leaderboard?type=currentEggs,method=-1 to get top current eggs
// leaderboard api :)
app.get('/api/leaderboard/', async (req, res) => {
  let typeOfValue = req.query.type
  let method = req.query.method ?? 1 // method determines if its from top to low or low to top.

  if (!typeOfValue) return res.status(400).json({error:"one of the querys were not defined in the request."})

  return res.send( sortJsonToArray(typeOfValue, method) )
})

function sortJsonToArray(value, method){
  // currently goes from lowest to highests
  var value1 = -1,
      value2 = 1;

  // this switches it to reverse, high to low.
  if (method == -1)
  {
    value1 = 1
    value2 = -1
  } 

  // this was ripped from an older project lmafoooo what are these comments
  return Object.values(users).sort(function(a,b){
    if(a[value] == b[value]) // if value is same its in the same place
      return 0;

    if(a[value] < b[value]) // if value is less then ... it.
      return value1;

    if(a[value] > b[value]) // if value is more then ... it.
      return value2;
  });
}

// basically just the user data stuff like eggs upgrades ect of all users (very awesome sauce)
app.get('/api/dev/raw', checkAuth, async (req, res) => {
  if (!req.session.dev) return res.status(403).json({error:"access denied."});

  res.json( { users } );
})

// wss stuff
const sockets = {};

io.on('connection', (socket) => {
  socketSessionData = socket.request.session
  // console.log(socketSessionData) //'\n\n' , sessionData)

  // const session = sessionData[sessionId]; // get the data already stored from the main area via the id.

  // check auth, if no auth kick em.
  if (!socketSessionData || !socketSessionData.authenticated) return socket.disconnect(true);

  // init eps to not throw err.
  socketSessionData.EPS = 0;

  // to acess user data
  let userObject = users[socketSessionData.info.id];
  userObject.ssocid = socket.id;

  // to iterate over all sockets if we want to send smth in the future
  sockets[socket.id] = socket;

  // sending existing online users to a new user (why did i do this again? AHHHHH i wanted to make FRIENDs online feature but didn't get enough time to make it. tbh this would've been better as a discord application thingy cuz that competiton was going on at the same time but i found the polyjam more fun :))
  if (Object.keys(sockets).length > 0) {
    Object.keys(sockets).forEach((socketId) => {
      socket.emit('onlineUsers', { socketId });
    });
  }

  // debug stuff
  socket.onAny((event, ...args) => {
    console.log(event, args);
  });

  function clickedEgg(socket) {
    let shop = userObject?.shop

    // shop upgrades
    let EPS = socketSessionData.EPS ?? 0;
    let modifier =  shop?.eggClicksPerSecond ?? 1;
    let userMaxEPS = shop?.eggMaxPerSecond ?? 10;
    
    if (userMaxEPS > EPS)
    {
      // else add the number.
      socketSessionData.EPS += modifier
      
      // check if its greater then to prevent it going above max.
      if ((EPS + modifier) > userMaxEPS) socketSessionData.EPS = userMaxEPS;
    }
    
    socket.emit( 'EU', {EPS: socketSessionData.EPS, MEPS: userMaxEPS, modifier , currentEggs: userObject.currentEggs});

    // kind of fun, unfortuantely wasn't able to implement in time. basically upgrade which would let you get random eggs

    // if (!getEgg) return;

    // let egg = getRandomUserEgg(socketSessionData.info.id)
    
    // if (!egg) return

    // console.log(egg)
    
    // // set it to the unconfirmed, once they confim they want to keep it, we can put on their profile.
    // if (!userObject?.unconfirmedEggs) userObject.unconfirmedEggs = {};

    // userObject.unconfirmedEggs[egg[0]] = egg[1]
  }

  // update users egg stuffz n stuff
  let localInterval = setInterval(() => {
    if (userObject.ssocid !== socket.id) // to prevent funny bug where you could just have multiple tabs open at the same time to get money faster :P
    {
      socket.emit( 'CloseConn', {reason: 'logged in at another location (tab, page, ect.)'} )
      return socket.disconnect(true);
    }

    let shop = userObject?.shop;

    // we love nullish operators!@!@!
    let autoClick = shop?.autoClick ?? shopItems.automation.autoClick.baseLevel
    
    let modifier =  shop?.eggClicksPerSecond ?? shopItems.clicker.eggClicksPerSecond.baseLevel;
    let userMaxEPS = shop?.eggMaxPerSecond ?? shopItems.clicker.eggMaxPerSecond.baseLevel;

    let eps = socketSessionData.EPS ?? 0;

    // if eps is more then 0 subtract 1 (maybe use modifier? idk)
    if ( eps > 0 ) socketSessionData.EPS -= 1

    // instead of using +=, using obj + mod allows me to set it to a fallback value if its not defined.
    // theorically, it shouldn't have this as it would be set at the start but im too lazy to clear users json, and supports sustaniability in the long run.
    userObject.currentEggs = userObject.currentEggs + eps + autoClick
    userObject.totalEggs = userObject.totalEggs + eps + autoClick

    socket.emit( 'EU', {EPS: socketSessionData.EPS, MEPS: userMaxEPS, modifier , currentEggs: userObject.currentEggs});
  }, 1000);

  const socketStatus = {};

  socket.on('CLK', (eventInfo) => {
    eventInfo = eventInfo?.e;

    if (!eventInfo.isTrusted) return socket.emit('ERR', 'Missing Cache for user request. Try reconnecting?');

    clickedEgg(socket);
  });

  // purchasing event, yah.
  socket.on('B', (eventInfo) => {
    let item = eventInfo?.item // real name
    let catagory = eventInfo?.catagory

    // if no data then respond with the uhh error packet.
    if (!item || !catagory) return socket.emit('BU', {result: false, error: 'no item / catagory in request.', item, catagory})
    
    let shopCatagory = shopItems[catagory]
    let actualItem = shopCatagory[item]

    let maxLevel = actualItem.maxLevel

    x = userObject?.shop?.[item] ?? actualItem.baseLevel
    let priceEq = actualItem.pricingEquation
    
    let price = eval(priceEq)

    // not enough money
    if ( userObject.currentEggs < price ) return socket.emit('BU', {result: false, error: 'not enought money.', item, catagory})
  
    // more then max
    if ( (x+actualItem.adds) > maxLevel ) return socket.emit('BU', {result: false, error: 'already reached max level.', item, catagory})
    
    // passed all checks, and check if shop exists, if not create it.
    if (!userObject.shop) userObject.shop = {};
    
    // should mean they passed all the checks? (hopefully, i think i didn't forget anything)
    userObject.shop[item] = x+actualItem.adds

    // remove the money egg
    let currentEgg = userObject.currentEggs
    userObject.currentEggs = currentEgg - price

    x = userObject?.shop?.[item] ?? actualItem.baseLevel
    
    let newPrice = eval(priceEq)
    
    socket.emit('BU', {result: true, error: 'Succesfully bought!', item, catagory, newPrice})

    console.log( console.log(shopCatagory, '\n', actualItem, '\n' , item) )
  });

  // Handling disconnection
  socket.on('disconnecting', () => {
    socketStatus[socket.id] = 'disconnecting';
  });

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);

    if (socketStatus[socket.id] === 'disconnecting') {
      delete sockets[socket.id];
      delete socketStatus[socket.id];
      clearInterval(localInterval)
    }
  });

  // socket.emit('test', { "text":"hi" }); why???
});

// never ended up using this :(
function getEggType() {
  let golden = false, shiny = false, highQuality = false, large = false;
    
  num = Math.floor(Math.random() * 1000)
  
  if (num == 0) golden = true // 0.1
    
  if (num < 5) shiny = true // 0.5%

  if (num < 50) highQuality = true // 5%

  if (num < 500) large = true // 50%
  
  let eggType = {
    golden,
    shiny,
    highQuality,
    large,
  };
  
  return eggType
}

// never ended up using this :( would've been fun
function getRandomUserEgg(ownId)
{
  let num = Math.floor(Math.random() * 1000)
  
  if (num > 25) return false; // 2.5% chance to get through.

  const keys = Object.keys(users)
  
  const user = keys[parseInt(Math.random() * keys.length)]
  
  const eggRarity = getEggType()
  
  const date = new Date()
  const unixTime = Math.floor(date.getTime() / 1000)
  
  let individualValue = users[ownId].currentEggs / 5

  let value = individualValue * Object.keys(eggRarity).length

  // unique id
  const finalId = `${unixTime}_${ownId}_${user}`;

  const finalJson = {user, eggRarity, date, value}

  return [ finalId, finalJson ]
}
console.log( getRandomUserEgg('test-item') )

// update saves (NOT EFFICENT I RUSHED TO FINISH THIS)
setInterval(() => {
  // if (users)
  console.log('Saving users.json')
  writeFile('./jsons/users.json', JSON.stringify(users), (error) => { if (error) console.error(`\n\n ### ERROR ### \n ${error}, \n${users} \n\n)`);})
}, 30000);

// app.listen(port, () => console.log(`App listening at http://localhost:${port}`));
server.listen(port, () => console.log(`Http listening at http://localhost:${port}`))