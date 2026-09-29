import { WsEntry } from "../../helpers/wsUtils";
export const XOGlobalLobby = new Map<number, WsEntry[]>();


export function isInXOLobby(userId: number) {
    return XOGlobalLobby.has(userId);
}