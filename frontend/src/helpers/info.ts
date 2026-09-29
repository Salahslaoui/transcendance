import { User } from "./types";
export const BACKEND_URL = process.env.NODE_ENV === "production" ? `/api` : "http://localhost:8000";

export class LocalStorageManager {
    constructor() {
        throw new Error("Can't instantiate StorageManager via constructor, use init");
    }

    static getToken() {
        const token = localStorage.getItem("token");
        if (!token)
            return (null);
        return (token);
    }
}
