const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const questionSchema = new Schema({
    question:String,
    correctAnswer:String,
    options:{
        type:Array,
    }
})

module.exports = mongoose.model("question",questionSchema);