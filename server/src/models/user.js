import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Task from './task.js';

// Schema for user
const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6,
        trim: true
    },
    name: { 
        type: String, 
        required: false,
        trim: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
});

userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

// Web token generator method
userSchema.methods.generateWebToken = async function() {
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, 'mySecretKey');

    user.tokens = user.tokens.concat({ token });
    await user.save()

    return token;
}

// Produces public data sent to user
userSchema.methods.toJSON = function() {
    const userObject = this.toObject();

    delete userObject.password;
    delete userObject.tokens;

    return userObject;
}

// Find user by email and password
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('Unable to login!');
    }

    const isCorrect = await bcrypt.compare(password, user.password);

    if (!isCorrect) {
        throw new Error('Unable to login!');
    }

    return user;
}

// Hash password
userSchema.pre('save', async function(next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }

    next();
})

// Delete task before user is deleted
userSchema.pre('remove', async function(next) {
    const user = this;

    await Task.deleteMany({ owner: user._id })

    next()
})

const User = mongoose.model('User', userSchema);

export default User;