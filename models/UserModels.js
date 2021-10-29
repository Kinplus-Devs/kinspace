const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
		type: String
	},
	username: {
		type: String,
		unique: true,
		required: true
	},
	email: {
		type: String,
		required: true,
		unique: true,
		match: [
			/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
			'Please add a valid email'
		]
	},
	bio: {
		type: String
	},
	city: {
		type: String
	},
	avatar: {
		type: []
	},
	image: {
		type: Buffer
	},
	role: {
		type: String,
		enum: ['user', 'moderator'],
		default: 'user'
	},
	gender: {
		type: String,
		require: true
	},
	zip: {
		type: Number,
		require: true
	},
	password: {
		type: String,
		required: [true, 'Please add a password'],
		minlength: 3,
		select: false
	},
	resetPasswordToken: String,
	resetPasswordExpire: Date,
	createdAt: {
		type: Date,
		default: Date.now
	}
})



//Encrypt password using bcrypt

UserSchema.pre('save', async function (next) {
	if (!this.isModified('password')) {
		next();
	}
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

//Sign JWT and return
UserSchema.methods.getSignedJWTToken = function () {
	return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN
	});
};

//Compare user password with the one in the database
UserSchema.methods.matchPassword = async function (enteredPassword) {
	return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
	if (this.passwordChangedAt) {
		const changedTimestamp = parseInt(
			this.passwordChangedAt.getTime() / 1000,
			10
		);
		return JWTTimestamp < changedTimestamp;
	}
	return false;
};

//Generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
	//Generate token
	const resetToken = crypto.randomBytes(20).toString('hex');

	//Hash token and set to resetPassword field
	this.resetPasswordToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');

	// Set expire
	this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

	return resetToken;
};



const User = mongoose.model('User', UserSchema);
module.exports = User;