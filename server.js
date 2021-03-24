const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const db = require("./models");

const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/fintess", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.post("/api/workouts", (req, res) => {
  console.log(req.body);
  db.Workout.create({})
    .then((dbWorkout) => {
      console.log(dbWorkout);
      res.json(dbWorkout);
    })
    .catch((err) => {
      console.log(err);
      res.json(err);
    });
});

app.put("/api/workouts/:id", (req, res) => {
  db.Exercise.create(req.body).then((dbExercise) => {
      console.log(dbExercise);
    db.Workout.findByIdAndUpdate(
      req.params.id,
      { $push: { exerciseCollection: dbExercise._id } },
      { new: true }
    )
      .then((dbWorkout) => {
        console.log("chosen workout" + dbWorkout);
        res.json(dbWorkout);
      })
      .catch((err) => {
        console.log(err);
        res.json(err);
      });
  });
});

app.get("/api/workouts", (req, res) => {
    db.Workout.find({})
    .then(dbWorkout =>{
        console.log(dbWorkout);
        res.json(dbWorkout);
    }).catch(err => {
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
