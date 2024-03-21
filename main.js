// web requests
const { request } = require('undici');

// express stuff
const express = require('express');
const session = require('express-session');

// file stuff
const fs = require("fs"); 

// config stuff 
// Considering switching to .env but its basically the same imo.
const { clientId, 
        clientSecret, 
        port, 
        sessionSecretKey, 
        ipLoggingEnabled 
      } = require('./jsons/config.json');
      
const app = express();
      
var allowedEmails = require('./jsons/whitelist.json')

// Use express-session middleware
app.use(session({
  secret: sessionSecretKey, // Change this to a random secret key in config.json
  resave: true,
  saveUninitialized: true
}));



// Middleware to check authentication
const checkAuth = (req, res, next) => {
  if (!req.session.authenticated) {
    return res.redirect('/authenticate');
  }
  next();
};

app.get('/universal.css', (request, response) => {
  return response.sendFile('universal.css', { root: './public' });
});

// This route initiates the authentication process
app.get('/authenticate', async (req, res) => {
  const { code } = req.query;
  console.log(code)

  // the code we use in discord api (so if no code included just give them the page)
  if (!code) return res.sendFile('auth.html', { root: './views' });

  // if there is code process (login) request
  if (code) {
    try {
      const tokenResponseData = await request('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `https://www.nahid.win/authenticate`,
          scope: 'identify',
        }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const oauthData = await tokenResponseData.body.json();

      console.log(oauthData)

      // if error on access ect ect send them the auth file back to redo.
      if (oauthData.error) return res.sendFile('auth.html', { root: './views' });

      let userResult = await request('https://discord.com/api/users/@me', {
        headers: {
          authorization: `${oauthData.token_type} ${oauthData.access_token}`,
        },
      });

      userResult = await userResult.body.json()
      console.log(userResult)

      // for future use
      let email = userResult.email
      console.log(email)

      // if we can't find email in auth list kick em out.
      if ( ! allowedEmails.hasOwnProperty( email ) || userResult.verified === false ) return res.sendFile('unauth.html', { root: './views' });

      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 

      let whitelistObject = allowedEmails[email]
      console.log(whitelistObject)

      // updating the logging for the logins
      whitelistObject.totalLogins += 1
      whitelistObject.lastLogin = new Date()
      
      if ( ipLoggingEnabled ) whitelistObject.lastIpAddressLoggedInWith = ip;

      // Store authentication in session
      req.session.authenticated = true;
      req.session.info = userResult

    } catch (error) {
      console.error(error);
      return res.sendFile('auth.html', { root: './views' });
    }
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

// auth for computer online, which is private.
app.get('/online', checkAuth, (req, res) => {
  return res.sendFile('online.html', { root: './views'} );
})

// auth for scripts, which are private.
app.get('/accounts', checkAuth, (req, res) => {
  return res.sendFile('accounts.html', { root: './views'} );
})

// auth for scripts, which are private.
app.get('/scripts', checkAuth, (req, res) => {
  return res.sendFile('scripts.html', { root: './views'} );
})

// auth for management, which is quite obviously private.
app.get('/manage', checkAuth, (req, res) => {
  return res.sendFile('manage.html', { root: './views'} );
})


// css that doesn't need you to be logged in, so for like auth.
app.get('/universal.css', (reaq, res) => {
  return res.sendFile('dashboard.css', { root: './public' });
})

// auth for dashbaord, which is private.
app.get('/dashboard.css', checkAuth, (req, res) => {
  return res.sendFile('dashboard.css', { root: './public' });
})

// todo add fs to modify allowed email stuff
app.post('/modifyWhitelist', checkAuth, (req, res) => {
  body = req.body
  
  if ( ! body ) return res.status(400)

  console.log(body)

  return res.status(200)
})

// api responses
app.get('/me', checkAuth, (req, res) => {
  res.json({ "auth" : req.session.authenticated, "profile" : req.session.info });
})


app.listen(port, () => console.log(`App listening at http://localhost:${port}`));