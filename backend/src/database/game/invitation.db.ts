// import getDB from "../db";
// import TournamentModel from "./tournament.db";
// export type GameMode = "tournament" | "1v1";
// export type InvitationType = "sent" | "received";
// export type InvitationState = "pending" | "accepted" | "rejected";
// import Model from "../model";
// import TournamentPlayerModel from "./tournament_player.db";

// export interface Invitation {
//     id: number;
//     invitor_id: number;
//     invitee_id: number;
//     mode: GameMode;
//     state: InvitationState;
//     tournament_id: number | null;
// }

// export default class InivitationModel extends Model {
//     protected id: number;
//     public invitor_id: number;
//     public invitee_id: number;
//     public mode: GameMode;
//     public state: InvitationState;
//     public tournament_id: number | null;
//     protected static table_name: string = "game_invitations";


//     constructor(invitation: Invitation) {
//         super();
//         this.id = invitation.id;
//         this.invitor_id = invitation.invitor_id;
//         this.invitee_id = invitation.id;
//         this.mode = invitation.mode;
//         this.state = invitation.state;
//         this.tournament_id = invitation.tournament_id;
//         this.setKeys();
//     }

//     static async ensureInvitable(id: number, invitedId: number, mode: GameMode) {
//         if (id == invitedId)
//             throw new Error("Can't invite yourself.");
//         const db = await getDB();
//         switch (mode) {
//             case "tournament": {
//                 const tournament = await TournamentModel.getTournamentByUser(id);
//                 if (!tournament)
//                     throw new Error("You must create a tournament before inviting users");
//                 if (tournament.current_player_count == tournament.max_player_count)
//                     throw new Error("Tournament is full, kick a player before inviting a new one");
//                 if (await TournamentPlayerModel.isATournamentPlayer(invitedId))
//                     throw new Error("User is already in a torunament");
//                 const existing = await db.get(
//                     `SELECT 1 FROM game_invitations 
//                     WHERE tournament_id = ? AND invitor_id = ? AND invitee_id = ? AND mode = 'tournament'`,
//                     [tournament.getId(), id, invitedId]
//                 );
//                 if (existing)
//                     throw new Error("You already sent an invitation to this user.");
//                 break;
//             }
//             case "1v1": {
//                 if (await TournamentModel.getTournamentByUser(id))
//                     throw new Error("You must finish the tournament you're currently in before in");
//                 const existing = await db.get(
//                     `SELECT 1 FROM game_invitations 
//                     WHERE invitor_id = ? AND invitee_id = ? AND mode = '1v1'`,
//                     [id, invitedId]
//                 );
//                 if (existing)
//                     throw new Error("You already sent an invitation to this user.");
//                 break;
//             }
//         }
//     }


//     static async getInvitationById(invitationId: number) {
//         const db = await getDB();
//         const invitation = await db.get<Invitation>("SELECT * FROM game_invitations WHERE id=?",
//                 [invitationId]);
//         if (!invitation)
//             throw new Error("Invalid invitation");
//         return new InivitationModel(invitation);
//     }

//     static async getInvitations(
//         id: number, mode: GameMode | "all", type?: InvitationType, state?: InvitationState) {
//         const db = await getDB();
//         let invitations: Invitation[] = [];
    
//         const whereClauses: string[] = [];
//         const args: (string | number)[] = [];
    
//         if (type === "sent") {
//             whereClauses.push("invitor_id = ?");
//             args.push(id);
//         } else if (type === "received") {
//             whereClauses.push("invitee_id = ?");
//             args.push(id);
//         }
    
//         if (mode) {
//             whereClauses.push("mode = ?");
//             args.push(mode);
//         }
    
//         if (state) {
//             whereClauses.push("state = ?");
//             args.push(state);
//         }
    
//         const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
//         const sql = `SELECT * FROM game_invitations ${whereSQL}`;
    
//         invitations = await db.all<Invitation[]>(sql, args);
//         return invitations.map(inv => new InivitationModel(inv));
//     }
// };    


