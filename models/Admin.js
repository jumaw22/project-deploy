const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true }
});

// Only create default admin if none exists
AdminSchema.statics.createDefaultAdmin = async function () {
  const exists = await this.findOne({ username: 'admin' });
  if (!exists) {
    const hashed = bcrypt.hashSync('admin123', 10);
    await this.create({ username: 'admin', password: hashed });
  }
};

module.exports = mongoose.model('Admin', AdminSchema);
