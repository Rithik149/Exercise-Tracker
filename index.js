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

// Define User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Define Exercise Schema user reference is given as a foreign key (more like just reference)
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

//  POST /api/users
app.post("/api/users", async (req, res) => {
  const username = req.body.username;

  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save(); // no callback!

    res.json({
      username: savedUser.username,
      _id: savedUser._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save user" });
  }
});

//POST /api/users/:_id/exercises
app.post("/api/users/:_id/exercises", async (req, res) => {
  const _id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    // Find user first
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" }); //checks if the id match any users

    // Create exercise
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(), //match format
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
    res.status(500).json({ error: "Failed to save Exercise" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  //change port in env
  console.log("🚀 App is listening on port " + listener.address().port);
});
