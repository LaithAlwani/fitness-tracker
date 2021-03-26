const mongoose = require("mongoose");
const opts = { toJSON: { virtuals: true } };
const Schema = mongoose.Schema;

const WorkoutSchema = new Schema({
  day: {
    type: Date,
    default: Date.now(),
  },
  exercises: [
    {
      name: {
        type: String,
        trim: true,
        required: "Exercise name is required",
      },
      type: {
        type: String,
      },
      weight: {
        type: Number,
        required: "weight is required",
        min:1
      },
      sets: {
        type: Number,
        required: "Number of sets is required",
        min:1
      },
      reps: {
        type: Number,
        required: "Number of reps is required",
        min:1
      },
      distance: {
        type: Number,
        required: "Distance is required",
        min:1
      },
      duration: {
        type: Number,
        required: "Duration is required",
        min:[1,"cannot be less than 1"]
      },
    },
  ],
},opts);

WorkoutSchema.virtual("totalDuration").get(function(){
  let sum = 0;
   this.exercises.forEach(exercise =>{
    sum += exercise.duration
   });
   return sum
});

const Workout = mongoose.model("Workout", WorkoutSchema);

module.exports = Workout;
