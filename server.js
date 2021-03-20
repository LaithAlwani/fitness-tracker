const express = require("express");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 8080;

app.get("/", (req,res) => {
    res.sendFile(path.join(__dirname +"/public/exercise.html"));
});

app.listen(PORT, () => {
    console.log("listning to port" +PORT)
})