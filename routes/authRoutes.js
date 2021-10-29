const express = require('express');
const { body, check } = require('express-validator');

const { protect } = require('../middlewares/auth');

const router = express.Router();

const {
	registerUser,
	loginUser,
	getLoggedInUser,
	forgotPassword
	// getMe,
	// resetPassword,
} = require('../controllers/authController');

router.get('/', protect, getLoggedInUser);

router.post(
	'/register',
	[
		check('email').isEmail().withMessage('please enter a valid email.'),
		body('username', 'Username is in valid').isLength({ min: 4 }),
		body('name', 'Name is required').isLength({ min: 4 }),
		body('password', 'Please enter valid password')
			.isLength({ min: 3 })
			.isAlphanumeric(),
		body('password2').custom((value, { req }) => {
			if (value !== req.body.password) {
				throw new Error('Passwords have to match');
			}
			return true;
		})
	],
	registerUser
);

router.post(
	'/login',
	[
		check('email').isEmail().withMessage('please enter a valid email.'),
		body('password', 'Enter valid password')
			.isLength({ min: 3 })
			.isAlphanumeric()
	],
	loginUser
);

router.post(
	'/forgotpassword',
	[
		check('email').isEmail().withMessage('please enter a valid email.')
	],
		forgotPassword
);

module.exports = router;
