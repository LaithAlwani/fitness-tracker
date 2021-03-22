const express = require("express");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("api/workouts", (req,res) => {
    console.log(req.body);
    res.json({});
});

app.get("/api/workouts", (req,res) =>{
    res.json({});
})

app.get("/exercise", (req,res) => {
    res.sendFile(path.join(__dirname +"/public/views/exercise.html"));
});
app.get("/stats", (req,res) => {
    res.sendFile(path.join(__dirname +"/public/views/stats.html"));
});
app.get("/", (req,res) => {
    res.sendFile(path.join(__dirname +"/public/views/index.html"));
});

app.listen(PORT, () => {
    console.log("listning to port" +PORT)
})