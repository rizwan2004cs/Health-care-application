const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    portal: {
        type: String,
        required: true,
        enum: ['patient', 'doctor', 'admin']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Configure passport-local-mongoose
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User",UserSchema);