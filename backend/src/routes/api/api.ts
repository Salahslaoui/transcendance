import { FastifyInstance } from "fastify";
import ApiModel from "../../database/api/api.db";
import { StatusCodes } from "http-status-codes";
import { getSuccessMsg } from "../../helpers/utils";
import { validateApiKeySchema } from "../../schemas/api.schema";

type ValidateApiKeyBody = {
    apiKey: string;
}

export default function ApiRoutes(fastify: FastifyInstance) {
    fastify.post("/generate", {preHandler: fastify.authenticate()}, async (req, res) => {
        const {id} = req.user;
        const existingKeyModel = await ApiModel.findByField("user_id", id);
        if (existingKeyModel)
            throw fastify.httpErrors.conflict("API key already exists for this user");
        const key = ApiModel.generateApiKey();
        await ApiModel.create({
            api_key_hash: ApiModel.hashApiKey(key),
            user_id: id
        });
        return res.code(StatusCodes.OK).send(getSuccessMsg({
            message: "API key generated succesfully",
            apiKey: key
        }))
    });


    fastify.patch("/rotate", {preHandler: fastify.authenticate()}, async (req, res) => {
        const {id} = req.user;
        const existingKeyModel = await ApiModel.findByField("user_id", id);
        if (!existingKeyModel)
            throw fastify.httpErrors.notFound("No API key found");
        const newKey = await existingKeyModel.rotateKey();
        return res.code(StatusCodes.OK).send(getSuccessMsg({
            message: "API key rotated succesfully",
            apiKey: newKey
        }));
    })


    fastify.post<{Body: ValidateApiKeyBody}>("/validate", {schema: {body: validateApiKeySchema}}, async (req, res) => {
        const {apiKey} = req.body;
        const keyModel = await ApiModel.findByField("api_key_hash", ApiModel.hashApiKey(apiKey));
        if (!keyModel)
            throw fastify.httpErrors.notFound("API key invalid");
        return res.code(StatusCodes.OK).send(getSuccessMsg({
            message: "API key validated succesfully",
            api: {
                userId: keyModel.user_id,
                createdAt: keyModel.created_at
            }
        }));
    });

}