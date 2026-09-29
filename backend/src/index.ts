import initDB from "./database/initDB";
import fastify from "./init";

async function startServer() {
    try {
        await initDB();
        const address = await fastify.listen({ port: Number(process.env.PORT) || 8000., host: "0.0.0.0" });
        const routes = fastify.printRoutes(); // array of route definitions
    } catch (err) {
        process.exit(1);
    }
}

startServer();
