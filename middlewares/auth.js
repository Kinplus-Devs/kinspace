const jwt = require('jsonwebtoken');
const catchAsync = require('./catchAysnc');
const AppError = require('../utils/errorApp');
const User = require('../models/UserModels');
const { promisify } = require('util');



//protect routes
exports.protect = catchAsync(async (req, res, next) => {
	let token;
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		token = req.headers.authorization.split(' ')[1];
	} else if (req.cookies.jwt) {
		token = req.cookies.jwt;
	} 



	// Get Token from header
	// const token = req.header('x-auth-token');

	//Make sure token exists
	if (!token) {
		return next(new AppError('Not authorize to  access this route', 401));
	}

	const decodedToken = await promisify(jwt.verify)(
		token,
		process.env.JWT_SECRET
	);

	const currentUser = await User.findById(decodedToken.id);
	if (!currentUser) {
		return next(new AppError('The user doesnt exists', 401));
	}

	if (currentUser.changedPasswordAfter(decodedToken.iat)) {
		return next(
			new AppError('User recently changed password! please log in again', 401)
		);
	}

	//Grant access to protected route
	req.user = currentUser;
	next();
});

// Grant access to specific roles
exports.authorizeAdmin = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return next(
				new AppError('You do not have access to perform the operation!', 403)
			);
		}
		next();
	};
};
