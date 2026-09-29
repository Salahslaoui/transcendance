import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSuccessMsg } from "../../helpers/utils";




export default function HealthcheckRoutes(fastify: FastifyInstance) {
    fastify.route({
        method: ["GET", "HEAD"],
        url: "/",
        handler: async (req, res) => {
            return res.code(StatusCodes.OK).send(getSuccessMsg({healthy: true}));
        },
    });

}