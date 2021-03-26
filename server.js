const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const Workout = require("./models/workout");

const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/fintess", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

app.post("/api/workouts", ({ body }, res) => {
  Workout.create(body)
    .then((dbWorkout) => {
      res.json(dbWorkout);
    })
    .catch((err) => {
      console.log(err);
      res.json(err);
    });
});

app.put("/api/workouts/:id", ({body, params}, res) => {
  Workout.findByIdAndUpdate(
    params.id,
    { $push: { exercises: body} },
    { new: true }
  )
    .then((dbWorkout) => {
      res.json(dbWorkout);
    })
    .catch((err) => {
      console.log(err);
      res.json(err);
    });
});

app.get("/api/workouts/range", (req, res) => {
  Workout.find()
    .then((dbWorkout) => {
      res.json(dbWorkout);
    })
    .catch((err) => {
      res.json(err);
    });
});

app.get("/api/workouts", (req, res) => {
  Workout.find()
    .then((dbWorkout) => {
      res.json(dbWorkout);
    })
    .catch((err) => {
      console.log(err);
      res.json(err);
    });
});

app.get("/exercise", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/views/exercise.html"));
});
app.get("/stats", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/views/stats.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/views/index.html"));
});

app.listen(PORT, () => {
  console.log("listning to port " + PORT);
});
