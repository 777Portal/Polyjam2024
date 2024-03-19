const { request } = require('undici');
const express = require('express');
const session = require('express-session');

// config stuff
const { clientId, clientSecret, port, sessionSecretKey } = require('./config.json');
const { allowedEmails } = require('./storage.json')

const app = express();

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

  if (!code) return res.sendFile('auth.html', { root: './views' });

  if (code) {
    try {
      const tokenResponseData = await request('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `http://localhost:${port}/authenticate`,
          scope: 'identify',
        }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const oauthData = await tokenResponseData.body.json();

      console.log(oauthData)
      if (oauthData.error) return res.sendFile('auth.html', { root: './views' });

      let userResult = await request('https://discord.com/api/users/@me', {
        headers: {
          authorization: `${oauthData.token_type} ${oauthData.access_token}`,
        },
      });

      userResult = await userResult.body.json()
      console.log(userResult)

      // if we can't find email in auth list kick em out.
      if (!allowedEmails.includes(userResult.email)) return res.sendFile('unauth.html', { root: './views' });

      // Store authentication in session
      req.session.authenticated = true;
      req.session.info = userResult

    } catch (error) {
      console.error(error);
      return res.sendFile('auth.html', { root: './views' });
    }
  }
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

// this is the actual check, so if its not authed then send em to the gulag, if it is, allow them through
app.get('/', checkAuth, (req, res) => {
  return res.sendFile('authed.html', { root: './views' });
})


// api responses

app.get('/me', checkAuth, (req, res) => {
  res.json({ "auth" : req.session.authenticated, "profile" : req.session.info });
})


app.listen(port, () => console.log(`App listening at http://localhost:${port}`));