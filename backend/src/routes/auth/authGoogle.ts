import dotenv from "dotenv";
import { FastifyInstance } from "fastify";
import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from "http-status-codes";
import getDB from "../../database/db";
import jwt from "jsonwebtoken";
import axios from 'axios';
import { JwtPayload } from "../../schemas/Jwt.interface";
import { User } from "../../database/user/user.db";
import crypto from "crypto";


dotenv.config();


const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}
const JWT_SECRET: string = secret;

export default async function AuthGoogleRoutes(fastify: FastifyInstance) {
	fastify.get('/google' , async (req, res) => {
  	const clientID = process.env.clientId;
  	const redirectURL = process.env.NODE_ENV === "production" ? process.env.redirectURL : "http://localhost:8000/auth/google/callback";
  	if (!clientID || !redirectURL)
		throw fastify.httpErrors.internalServerError('Google OAuth configuration is missing');
	const state = crypto.randomBytes(16).toString('hex');
	res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax' });
	const params = new URLSearchParams({
		client_id: clientID,
    	redirect_uri: redirectURL,
    	access_type: 'offline',
    	response_type: 'code',
    	prompt: 'consent',
    	scope: 'openid email profile',
		state: state
	});
	const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  	res.redirect(authUrl);
	});
	fastify.get('/google/callback', async (req: FastifyRequest, res: FastifyReply) => {
		const {code, state} = req.query as { code?: string, state?: string };
		const coockieState = req.cookies['oauth_state'];
		if (!state || state !== coockieState) {
			throw fastify.httpErrors.badRequest('Invalid OAuth state (possible CSRF attack)');
		}
		if (!code)
			throw fastify.httpErrors.badRequest('Authorization code not provided');
		res.clearCookie('oauth_state');
		const frontend_callback = process.env.NODE_ENV === "production" ? process.env.frontendCallback : "http://localhost:3000";
		try {
			const client_id = process.env.clientId;
			const client_secret = process.env.clientSecret;
			const redirect_uri = process.env.NODE_ENV === "production" ?  process.env.redirectURL : "http://localhost:8000/auth/google/callback";

			if (!client_id || !client_secret || !redirect_uri)
				throw fastify.httpErrors.internalServerError('Google OAuth configuration is missing');
			const params = new URLSearchParams({
				client_id: client_id,
				client_secret: client_secret,
				code: code,
				grant_type: 'authorization_code',
				redirect_uri: redirect_uri
			});
			const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', params.toString(), {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			});
			const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: {
					'Authorization': `Bearer ${tokenResponse.data.access_token}`
				}
			});
			const googleUser = userResponse.data;
			const googleEmail = googleUser.email;
			const googleusername = googleUser.email.split('@')[0];
			const db = await getDB();
			let user: User | undefined = await db.get('SELECT * FROM users WHERE email = ?', [googleEmail]);
			if (!user) {
				const result = await db.run(
					'INSERT INTO users (email, password, username, provider) VALUES (?, ?, ?, ?)',
					[googleUser.email, ' ', googleusername, 'google']
				);
				user = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]) as User;
			}
			else if (user.provider === 'local') {
				const errorParams = new URLSearchParams({
					auth: 'failed',
					error: 'email_exists_local'
				});
				return res.redirect(`${frontend_callback}/auth?${errorParams.toString()}`);
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
				}
			);
			const callbackParams = new URLSearchParams({
				auth: "success",
				google: "true",
				token: accestoken,
				user: JSON.stringify({
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					game_state: user.game_state,
					avatar_url: user.avatar_url,
					is_online: true,
				}
				})
				});

			res.setCookie('refreshToken', refreshtoken, {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				path: '/',
				maxAge: 7 * 24 * 60 * 60,
			}).redirect(`${frontend_callback}/auth?${callbackParams.toString()}`); // change this to frontend url
		} catch (err: any) {
			console.error('Error in Google OAuth:', err);
			const errorParams = new URLSearchParams({
				auth: 'failed',
				error: 'oauth_error',
				message: err.message
			});
			res.redirect(`${process.env.NODE_ENV === "production" ? frontend_callback : "http://localhost:3000"}/auth?${errorParams.toString()}`);
		}
	})
}
