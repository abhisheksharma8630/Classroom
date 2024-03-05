const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const question = require('./question');

const testSchema = new Schema({
    title:{
        type:String,
        required:true,
    },
    questions:[
        {
            type:Schema.Types.ObjectId,
            ref:'question'
        }
    ],
    owner:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    liveAt:{
        type:Date
    }
})

testSchema.post('findOneAndDelete', async (test)=>{
    if(test){
        await question.deleteMany({_id:{$in:test.questions}});
    }
})

const test = mongoose.model('test',testSchema);

module.exports = test;