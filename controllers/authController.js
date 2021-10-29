const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const gravatar = require('gravatar');

const catchAsync = require('../middlewares/catchAysnc');
const User = require('../models/UserModels');
const AppError = require('../utils/errorApp');
const sendEmail = require('../utils/sendMail')

// @desc        Get Logged in user.
// @route       GET /auth
// @access      Private
exports.getLoggedInUser = catchAsync(async (req, res, next) => {
	console.log(req.user);
	const user = await User.findById(req.user.id).select('-password');
	res.json(user);
});

// @desc        Post register form.
// @route       Post /auth/register
// @access      public
exports.registerUser = catchAsync(async (req, res, next) => {
	console.log('register user');

	const { name, username, password, password2, zip, email } = req.body;

	const userExists = await User.findOne({ email });
	if (userExists) {
		return res.status(422).json({
			success: false,
			msg: 'Email already in use'
		});
	}

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		// To retrive all the errors for the array of errors
		const msg = errors.array().map(i => {
			return i.msg;
		});

		return res.status(422).json({
			status: 'fail',
			errorMessage: errors.array()
		});
	}

	// Add default avatar
	const avatar = gravatar.url(email, {
		s: '200',
		r: 'pg',
		d: 'mm'
	});

	const user = await User.create({
		name,
		username,
		password,
		avatar,
		gender: 'male',
		zip,
		email,
		bio: `My name is ${name}`
	});

	// create token
	// const token = user.getSignedJWTToken();
	res.status(201).send({ success: true, msg: `Welcome ${user.username}` });
});

// @desc        Post Login form.
// @route       Post /auth/login
// @access      public
exports.loginUser = catchAsync(async (req, res, next) => {
	const { password, email } = req.body;

	// validate user: email and password
	if (!email || !password) {
		return next(new AppError('Please provide an email and password here', 400));
	}
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = errors.array().map(i => {
			return i.msg;
		});
		return res.status(422).json({
			success: false,
			errorMessage: msg[0]
		});
	}

	//Check for user in the database
	const user = await User.findOne({ email }).select('+password');
	if (!user) {
		return next(new AppError('Password or email is incorrect', 401));
	}

	//Check if password matches
	const isMatch = await user.matchPassword(password);

	if (!isMatch) {
		return next(new AppError('Password or email is incorrect', 401));
	}

	//create token
	const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN
	});

	const cookieOptions = {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true
	};

	if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

	res.cookie('jwt', token, cookieOptions).status(200).json({
		status: 'success',
		username: user.username,
		name: user.name,
		token
	});
});

// @desc        Forgot password.
// @route       POST /auth/forgotpassword
// @access      public
exports.forgotPassword = catchAsync(async (req, res, next) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		console.log(errors.array());
		const msg = errors.array().map(i => {
			return i.msg;
		});

		return res.status(422).json({
			status: 'fail',
			errorMessage: msg
		});
	}
	const user = await User.findOne({ email: req.body.email });

	if(!user) {
		return next(new AppError('No user found with the email address', 404));
	}

	//Get reset token
	const resetToken = user.getResetPasswordToken();

	await user.save({
		validateBeforeSave: false
	});

	// Create reset url
	const resetUrl = `${req.protocol}://${req.get(
		'host'
	)}/auth/resetpassword/${resetToken}`;

	const message = `Reset your password : \n\n ${resetUrl}`;

	try {
		await sendEmail({
			email: user.email,
			subject: 'Password reset token',
			message
		});
		res.status(200).json({ status: 'success', data: 'Email sent' });
	} catch (error) {
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;
		await user.save({ validateBeforeSave: false });
		return next(new AppError('Email could not be sent', 500));
	}

	res.status(200).json({
		status: 'fail',
		data: {
			user
		}
	});
});
