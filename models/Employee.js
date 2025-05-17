const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: String,
  sex: String,
  status_of_appointment: String,
  position: String,
  educational_background: String,
  email: String,
  contact_number: String
});

module.exports = mongoose.model('Employee', EmployeeSchema);
