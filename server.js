const express = require('express')
const mongo = require('mongodb')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const cors = require('cors')

const app = express()

mongoose.connect(process.env.MLAB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then( () => {
  console.log('successfully connected');
},
err => {
  console.log('connection error: ', err);
});

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});





//Exercise Tracker Code
const userSchema = mongoose.Schema({
  username: {type: String, required: true},
  log: {type: Array, required: true}
});
const user = mongoose.model('user', userSchema);

//user.remove({}, err => {
  //if (err) console.log(err);
  //else console.log('users removed');
//})

app.post('/api/exercise/new-user', (req,res) => {
  console.log('new-user post processing');
  user.find({username: req.body.username}, (findErr, userArray) => {
    if (findErr) return console.log(findErr);
    
    if (userArray[0] == null) {
      console.log('creating new user');
      let newUser = new user({
        username: req.body.username,
        log: []
      });
      newUser.save( (err, data) => {
        if (err) console.log(err);
        else console.log('created user ' + req.body.username);
      });
      res.json({
        username: newUser.username,
        _id: newUser._id
      });
    } else res.json({
      username: userArray[0].username,
      _id: userArray[0]._id
    });
  });
});

app.post('/api/exercise/add', (req,res) => {
  console.log('add-exercise post processing');
  let exercise = {
    description: req.body.description,
    duration: Number(req.body.duration),
    date: req.body.date == "" ? new Date() : new Date(req.body.date)
  };
  user.find({_id: req.body.userId}, (err,userArray) => {
    if (err) return console.log(err);
    
    if (userArray.length) {
      userArray[0].log.push(exercise);
      userArray[0].save( (err, data) => {
        if (err) return console.log(err);
        console.log('added exercise ' + 
                        exercise.description + 
                        ' to user ' + req.body.userId);
      });
    } else return console.log('error: no userId ' + req.body.userId);
    res.json({
      username: userArray[0].username,
      description: exercise.description,
      duration: exercise.duration,
      _id: req.body.userId,
      date: exercise.date.toDateString()
    });
  });
});

app.get('/api/exercise/users', (req,res) => {
  console.log('users get processing');
  user.find({}, (err,userArray) => {
    res.send(userArray);
  });
});

app.get('/api/exercise/log', (req,res) => {
  user.find({_id: req.query.userId}, (err, userArray) => {
    if (err) return console.log(err);
    
    if (userArray.length) {
      let returnArray = userArray[0].log != null ? userArray[0].log.slice(0) : [];
      
      if (req.query.from != null) {
        console.log('from query processing');
        let fromDate = new Date(req.query.from);
        returnArray = returnArray.filter( exercise => {
          let exerciseDate = new Date(exercise.date);
          return exerciseDate.getTime() >= fromDate.getTime();
        })
      }
      
      if (req.query.to != null) {
        console.log('to query processing');
        let toDate = new Date(req.query.to);
        returnArray = returnArray.filter( exercise => {
          let exerciseDate = new Date(exercise.date);
          return exerciseDate.getTime() <= toDate.getTime();
        })
      }
      
      if (req.query.limit != null) {
        console.log('limit query processing');
        returnArray = returnArray.slice(0, Number(req.query.limit));
      }
      
      res.send({
        log: returnArray,
        _id: userArray[0]._id,
        username: userArray[0].username,
        _v: userArray[0]._v
      });
    } else console.log('user ' + req.query.userId + ' not found');
      
    });
  });











// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})