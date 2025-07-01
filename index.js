const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const bodyParser = require("body-parser");

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Connection error:", err));

// User Schema & Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Exercise Schema & Model
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

// POST /api/users – Create User
app.post("/api/users", async (req, res) => {
  try {
    const username = req.body.username;
    if (!username) return res.status(400).json({ error: "Username required" });

    const newUser = new User({ username });
    const savedUser = await newUser.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// GET /api/users – Get All Users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id"); // return only username and _id
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /api/users/:_id/exercises – Add Exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const _id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const parsedDate = date ? new Date(date) : new Date();
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: parsedDate,
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save exercise" });
  }
});

// GET /api/users/:_id/logs – Fetch Exercise Logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const _id = req.params._id;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let filter = { userId: user._id };

    // Optional date filters
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // Query with optional limit
    let query = Exercise.find(filter).select("description duration date");
    if (limit) query = query.limit(parseInt(limit));

    const exercises = await query.exec();

    const log = exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    res.json({
      username: user.username,
      _id: user._id,
      count: log.length,
      log: log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ✅ Start Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 App is listening on port " + listener.address().port);
});
