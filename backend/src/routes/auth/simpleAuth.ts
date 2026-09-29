import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import '@fastify/cookie';
import getDB from "../../database/db";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { signupSchema, loginSchema } from "../../schemas/auth.shema";
import { JwtPayload } from "../../schemas/Jwt.interface";
import { verify2FA } from "./2FA";
import UserModel from "../../database/user/user.db";

dotenv.config();

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}
const JWT_SECRET: string = secret;

export default async function SimpleAuthRoutes(fastify: FastifyInstance) {
	fastify.post('/signup', {schema: signupSchema}, async(req, res) => {
		const {email, password, username} = req.body as {
			email: string,
			password: string,
			username: string
		};
		const db = await getDB();

		const existingUser = await db.get('SELECT provider FROM users WHERE email = ?', [email]);
		if (existingUser && existingUser.provider === 'google')
			throw fastify.httpErrors.badRequest('This email is already registered with Google. Please sign in with Google.');
		try {
			const hashedPassword = await bcrypt.hash(password, 10);
			await db.run('INSERT INTO users (email, password, username) VALUES (?, ?, ?)', [email, hashedPassword, username]);
			res.code(StatusCodes.OK).send({success: true, details: {message: 'User created successfully'}});
		}
		catch(err:any) {
			if (err.code === "SQLITE_CONSTRAINT") {
				if (err.message.includes('email'))
					throw fastify.httpErrors.badRequest('Email already exists');
				else if (err.message.includes('username'))
					throw fastify.httpErrors.badRequest('Username already taken');
				else
					throw fastify.httpErrors.badRequest('User with this information already exists');
			} else {
				console.error('Signup error:', err);
				throw fastify.httpErrors.internalServerError('Failed to create user');
			}
		}
	});



	fastify.post('/login', {schema: loginSchema}, async(req, res) => {
		const {username, password, twoFACode} = req.body as {
			username: string,
			password: string,
			twoFACode?: string
		};
		const db = await getDB();
		const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
		if (!user)
			throw fastify.httpErrors.unauthorized('Invalid username or password');
		if (user.provider === 'google')
			throw fastify.httpErrors.badRequest('This account was created using Google. Please sign in with Google.');

		const checkPassword = await bcrypt.compare(password, user.password);
		if (!checkPassword)
			throw fastify.httpErrors.unauthorized('Invalid username or password');
		if (user.is_two_fa_enabled === 1) {
			if (!twoFACode) {
				return res.code(StatusCodes.OK).send({
					success: true,
					details: {
						requires2FA: true,
						message: 'Please enter your 2FA code'
					}
				});
			}
    		const isValid = verify2FA(user.two_fa_secret, twoFACode);
    		if (!isValid)
      			throw fastify.httpErrors.unauthorized('Invalid 2FA code');
		}
		const payload: JwtPayload = {
			id: user.id,
			email: user.email,
			username: user.username
		};
		const accestoken = jwt.sign(
			payload,
			JWT_SECRET,
			{
				expiresIn: "15m",
			}
		);
		const refreshtoken = jwt.sign(
			payload,
			JWT_SECRET,
			{
				expiresIn: "7d",
			},
		)
		res.setCookie('refreshToken', refreshtoken, {
  			httpOnly: true,
  			secure: false,
  			sameSite: 'lax',
  			path: '/',
  			maxAge: 7 * 24 * 60 * 60 * 1000,

		}).code(StatusCodes.OK).send({
			success: true,
			details: {
				message: 'Login successful',
				token: accestoken,
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					game_state: user.game_state,
					avatar_url: user.avatar_url,
					is_online: true,
					is_two_fa_enabled: user.is_two_fa_enabled === 1
				}
			}
		});
	});
	fastify.post('/refresh', async(req, res) => {
		const refreshtoken = req.cookies.refreshToken;
		if (!refreshtoken)
			throw fastify.httpErrors.unauthorized('Refresh token missing');
		try {
			const decoded = jwt.verify(refreshtoken, JWT_SECRET) as any;
			const payload = {
				id: decoded.id,
				email: decoded.email,
				username: decoded.username
			};
			const newAccessToken = jwt.sign(payload, JWT_SECRET, {expiresIn: '15m'});
			res.code(StatusCodes.OK).send({
				success: true,
				details: {
					token: newAccessToken,
					message: 'Token refreshed successfully'
				}
			});
		} catch(err: any) {
			throw fastify.httpErrors.forbidden('Invalid or expired refresh token');
		}
	});
	fastify.post('/logout', async (req, res) => {
		res
		  .clearCookie('refreshToken', {
    		path: '/',
    		httpOnly: true,
    		secure: false,
    		sameSite: 'lax',
		  })
		  .code(StatusCodes.OK)
		  .send({
			success: true,
			details: { message: 'Logged out successfully' }
		  });
	});
}
