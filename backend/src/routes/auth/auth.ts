import SimpleAuthRoutes from "./simpleAuth";
import AuthGoogleRoutes from "./authGoogle";
import TwoFARoutes from "./2FA";
import fastify from "../../init";

export default function AuthRoutes() {
    fastify.register(SimpleAuthRoutes);
    fastify.register(AuthGoogleRoutes);
    fastify.register(TwoFARoutes);
}