const mongoose = require('mongoose');
const schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const userSchema = new schema({
    googleId : String,
    displayName: {
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true
    },
    username:{
        type:String,
        required:true,
        unique:true
    },
    tests:[
        {
            type:schema.Types.ObjectId,
            ref:'test'
        }
    ],
    occupation:{
        type:String,
        default:"none"
    },
    attended:[
        {
            type:schema.Types.ObjectId,
            ref:'test'
        }
    ]
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

module.exports = mongoose.model('User', userSchema);
