const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/login
const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ message: "بيانات الدخول غلط" });
    }
    res.json({
      _id: admin._id,
      username: admin.username,
      role: admin.role,
      token: generateToken(admin._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.admin);
};

// PUT /api/auth/password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    }

    const admin = await Admin.findById(req.admin._id);
    if (!admin || !(await admin.matchPassword(currentPassword))) {
      return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { login, getMe, changePassword };
