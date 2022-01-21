import express from 'express';
import { Sequelize, Model, DataTypes, Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false // can be changed to true for debbuging!
});

const app = express();
const port = 8000;
app.use(cors());
var prevIP = null;
var nextIP = null;
var tokensLeft = process.env.RATE_LIMIT_PER_MINUTE;

setInterval(() => {
  tokensLeft = process.env.RATE_LIMIT_PER_MINUTE;
}, 60 * 1000);

function changeTokenForIP() {
  if (prevIP == null) {
    prevIP = nextIP;
    tokensLeft--;
    return;
  }
  if (nextIP != prevIP) {
    tokensLeft = process.env.RATE_LIMIT_PER_MINUTE;
  } else {
    tokensLeft--;
  }
}

// -------------- MODELS -------------------

/* for testing connection to database

try {
  await sequelize.authenticate();
  console.log('Connection has been established successfully.');
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

*/

const Note = sequelize.define('Note', {

  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    default: 1
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }

}, {
  freezeTableName: true,
  timestamps: true
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    default: 1
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    default: false
  }
}, {
  freezeTableName: true,
  timestamps: true
});


// TODO: for sake of deployment , make {force : false}

Note.belongsTo(User);

await Note.sync({ alter: true, force: true });
await User.sync({ alter: true, force: true });


/* For Testing Note model in database

  console.log(Note === sequelize.models.Note);
  let note = new Note({id : 1});
  console.log(note.id);
*/

// -------------- END OF MODELS -------------------


// -------------- MIDDLEWARES ------------------

function requestLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  nextIP = ip;
  changeTokenForIP();

  if (tokensLeft < 0) {
    res.status(429).json({ error: 'Too many request' });
  }
  next();
}

function auth(req, res, next) {
  const token = req.header('auth-token');
  if (!token) return res.status(401).json({ error: 'Access Denied' });

  try {
    const verified = jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid Token' });
  }
}

// -------------- END OF MIDDLEWARES ------------------



// -------------- ROUTERS -------------------
app.use(express.json());

var router = express.Router();

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now())
  next()
});

router.post('/new', requestLimit, auth, async function (req, res) {

  const note = Note.build({ description: req.body.description, UserId: req.user.id });
  await note.save();
  res.status(200).send(note);
  // console.log("SAVED SUCCESSFULLY!");
  // console.log(note.id + " " + note.description);
});

router.get('/:noteId(\\d+)', requestLimit, auth, async function (req, res) {

  const noteId = req.params.noteId;

  const note = await Note.findByPk(parseInt(noteId));

  if (note === null) {
    res.status(404).json({ error: 'Not found' });
  } else if (req.user.id !== note.UserId && !req.user.isAdmin) {
    res.status(401).json({ error: 'Access Denied' });
  } else {
    res.status(200).send(note);
  }

});

router.put('/:noteId(\\d+)', requestLimit, auth, async function (req, res) {

  const note = await Note.findByPk(parseInt(req.params.noteId));

  if (note === null) {
    res.status(404).json({ error: 'Not found' });
  } else if (req.user.id !== note.UserId && !req.user.isAdmin) {
    res.status(401).json({ error: 'Access Denied' });
  } else {
    const new_desc = req.body.description;
    await note.update({ description: new_desc });
    await note.save();
    res.status(200).send(note);
  }

});

router.delete('/:noteId(\\d+)', requestLimit, auth, async function (req, res) {

  const note = await Note.findByPk(parseInt(req.params.noteId));

  if (note === null) {
    res.status(404).json({ error: 'Not found' });
  } else if (req.user.id !== note.UserId && !req.user.isAdmin) {
    res.status(401).json({ error: 'Access Denied' });
  } else {
    await note.destroy({ force: false });
    res.status(200).json({ id: note.id, status: "deleted" });
  }

});

app.use('/notes', router);

app.use(express.json());

router.post('/register', requestLimit, async (req, res) => {

  await User.sync({ alter: true });

  //Hash The password
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(req.body.password, salt);


  const user = User.build({
    name: req.body.name,
    username: req.body.username,
    password: hashPassword,
    isAdmin: (req.body.isAdmin) ? (req.body.isAdmin) : false
  });

  if (await User.findOne({ where: { username: req.body.username } }) !== null) {
    return res.status(400).json({ error: 'user with this username already exists' });
  }

  try {
    await user.save();
    res.status(200).send(user);
  } catch (err) {
    res.status(400).json({ error: 'register failed !' });
  }
});

router.post('/login', requestLimit, async (req, res) => {

  if (req.body.username == null || req.body.password == null) return res.status(404).json({ error: 'username or password can not be empty' });

  const user = await User.findOne({ where: { username: req.body.username } });
  if (!user) return res.status(404).json({ error: 'invalid username or password' });

  const passwordIsValid = await bcrypt.compare(req.body.password, user.password);
  if (!passwordIsValid) return res.status(400).json({ error: 'invalid username or password' });

  //create and assign a token
  const token = jwt.sign({ id: user.id }, process.env.TOKEN_SECRET);

  //send back token in header and in response body for front-end
  res.header('auth-token', token).send(token);
});


app.use('/users', router);

// -------------- END OF ROUTERS -------------------

app.listen(port, () => {
  console.log(`Server App listening at http://localhost:${port}`)
});
