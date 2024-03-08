const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const questionSchema = new Schema({
    question:String,
    correctAnswer:String,
    options:{
        type:Array,
    },
    test:{
        type : Schema.Types.ObjectId,
        ref : 'test'
    }
})

module.exports = mongoose.model("question",questionSchema);