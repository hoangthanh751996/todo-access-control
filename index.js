const express = require('express');
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
let notes = [
  {
    content: "test1",
    id: 0
  }
];
const app = express();
const server = require("http").Server(app);
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

const users = [
  {
    username: "root",
    password: "1234",
    perms: ['c', 'r', 'e', 'd']
  },
  {
    username: "reader",
    password: "1234",
    perms: ['r']
  }
];

let generateAccessToken = (payload, secret) => {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, {algorithm: "HS256", expiresIn: '1d'}, function (err, token) {
      if (err) {
        reject(err);
      } else {
        resolve(token);
      }
    });
  });
};

let auth = (req, res, next) => {
  const access_token = req.headers.authorization;
  jwt.verify(access_token, 'test', function (err, decoded) {
    if (err) {
      return res.status(401).json('unauthorization');
    } else {
      req.payload = decoded;
      next();
    }
  });
};

let checkPerm = (perms, method) => {
  const index = perms.findIndex(p => p == method);
  if (index !== -1) return true;
  return false;
};

app.post('/login', (req, res) => {
  const {username, password} = req.body;
  const index = users.findIndex(u => (u.username == username && u.password == password));
  if (index == -1) return res.status(404).json("login fail");
  generateAccessToken(users[index], 'test')
    .then(token => {
      return res.status(200).json(token);
    })
    .catch(err => {
      console.log(err)
      return res.status(404).json("login fail");
    })

});

app.get('/notes', auth, (req, res) => {
  const perms = req.payload.perms;

  if (checkPerm(perms, 'r')) return res.json(notes);
  return res.status(403).json('you have not perm');
});

app.post('/notes',auth, (req, res) => {
  const perms = req.payload.perms;
  if (!checkPerm(perms, 'c')) return res.status(403).json('you have not perm');
  const {content} = req.body;
  if (!content || content === '') {
    return res.status(400).json("Content not empty");
  }
  notes = notes.concat([{content, id: notes.length}]);
  return res.status(200).json(notes);
});

app.delete('/notes/:id',auth,  (req, res) => {
  const perms = req.payload.perms;
  if (!checkPerm(perms, 'd')) return res.status(403).json('you have not perm');
  const {id} = req.params;
  if (!id) return res.status(404).json('id not exist');
  const newNotes = notes.filter(n => n.id != id);
  notes=newNotes;
  return res.status(200).json(notes);
});

server.listen(PORT, function (err) {
  if (err) throw err;
  console.log("Perms server is listening on port " + PORT);
});
