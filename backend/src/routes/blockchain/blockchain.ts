import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { StatusCodes } from "http-status-codes";

export default function BlockData(fastify: FastifyInstance) {

    fastify.get("/abi", {preHandler: fastify.authenticate({})}, async (req, res) => {
        const Path = path.join(__dirname, "MyContract.json");

        const art = JSON.parse(fs.readFileSync(Path, "utf8"));
        return {abi: art.abi};
    });
}