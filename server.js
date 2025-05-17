// server.js (MongoDB version with Bootstrap UI)
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

require("dotenv").config();

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,})
    .then(() => console.log("User Service: MongoDB Connected"))
    .catch(err => console.error(err));
  
app.use(session({
  secret: 'randomhaha',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});



const EmployeeSchema = new mongoose.Schema({
  name: String,
  sex: String,
  status_of_appointment: String,
  position: String,
  educational_background: String,
  email: String,
  contact_number: String
});
const User = mongoose.model('User', UserSchema);
const Employee = mongoose.model('Employee', EmployeeSchema);

// Create default admin if not exists
(async () => {
  const user = await User.findOne({ username: 'admin' });
  if (!user) {
    const hashed = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', password: hashed });
  }
})();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true
}));

function redirectLogin(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

app.get('/', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id;
    return res.redirect('/dashboard');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.get('/dashboard', redirectLogin, async (req, res) => {
  const term = req.query.term || '';
  const statusFilter = req.query.statusFilter || 'All';

  let query = {};
  if (term) {
    query.$or = [
      { name: { $regex: term, $options: 'i' } },
      { position: { $regex: term, $options: 'i' } }
    ];
  }
  if (statusFilter !== 'All') {
    query.status_of_appointment = statusFilter;
  }

  const employees = await Employee.find(query);
  const sexData = await Employee.aggregate([
    { $group: { _id: '$sex', count: { $sum: 1 } } }
  ]);
  const statusData = await Employee.aggregate([
    { $group: { _id: '$status_of_appointment', count: { $sum: 1 } } }
  ]);
  const statusOptions = ['All', 'JO', 'COS', 'Permanent', 'Retired', 'Temporary'];

  res.render('dashboard', {
    employees,
    sexData,
    statusData,
    term,
    statusFilter,
    statusOptions,
    employeeCount: employees.length
  });
});

app.get('/add', redirectLogin, (req, res) => res.render('add'));

app.post('/add', redirectLogin, async (req, res) => {
  await Employee.create(req.body);
  res.redirect('/dashboard');
});

app.get('/edit/:id', redirectLogin, async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.send('Not found');
  res.render('edit', { employee });
});

app.post('/update/:id', redirectLogin, async (req, res) => {
  await Employee.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/dashboard');
});

app.get('/delete/:id', redirectLogin, async (req, res) => {
  await Employee.findByIdAndDelete(req.params.id);
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/report', redirectLogin, async (req, res) => {
  const statusFilter = req.query.statusFilter || 'All';
  let query = {};
  if (statusFilter !== 'All') query.status_of_appointment = statusFilter;
  const employees = await Employee.find(query);
  res.render('report', {
    employees,
    reportTitle: `Employee List - ${statusFilter}`
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
