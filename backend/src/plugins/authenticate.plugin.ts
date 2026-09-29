import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { JwtPayload } from "../schemas/Jwt.interface";
import ApiModel from "../database/api/api.db";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT Secret not found");

export type AuthOptions = {allowJwt?: boolean, allowApi?: boolean, ws?: boolean};

async function fillRequestUser(authJwt: string | undefined | null, api: string | string[] | null | undefined, fastify: FastifyInstance, options: AuthOptions) {
	if (authJwt && api)
		throw fastify.httpErrors.conflict("Only one auth method is allowed");
	if ((!options.allowJwt && jwt) || !options.allowApi && api)
		throw fastify.httpErrors.unauthorized("Can't access this endpoint with current mode");
	if (authJwt) {

		try {
			const decoded = jwt.verify(authJwt, JWT_SECRET as string) as JwtPayload;
			return {id: decoded.id, connectionMode: "token"};
		} catch {
			throw fastify.httpErrors.unauthorized('Invalid token');
		}
	} else if (api) {
		if (Array.isArray(api))
			throw fastify.httpErrors.badRequest("API key can't be an array");
		const apiKey = await ApiModel.findByField("api_key_hash", ApiModel.hashApiKey(api));
		if (!apiKey)
			throw fastify.httpErrors.badRequest("API key invalid");
		return {id: apiKey.user_id, connectionMode: "api"};
	} else
		throw fastify.httpErrors.unauthorized('No token or API key provided');
}


const authenticate: FastifyPluginAsync = async (fastify) => {
	fastify.decorate('authenticate',
		(options: AuthOptions = {allowJwt: true, allowApi: false, ws: false}) => {
			if (typeof options.allowJwt === "undefined")
				options.allowJwt = true;
			if (!options.ws) {
				return async (req: FastifyRequest, res: FastifyReply) => {
					let authHeader = req.headers.authorization;
					if (authHeader)
						authHeader = authHeader.split(' ')[1];
					const apiKeyHeader = req.headers['x-api-key'];
					(req as any).user = await fillRequestUser(authHeader, apiKeyHeader, fastify, options);
					}
			} else {
				return async (req: FastifyRequest, res: FastifyReply) => {
					const url = new URL(req.url!, "http://localhost"); // parse query
					const token = url.searchParams.get("token");
					const api = url.searchParams.get("api");
					(req as any).user = await fillRequestUser(token, api, fastify, options);
				}
			}
		}
	)
}


export default fp(authenticate);
