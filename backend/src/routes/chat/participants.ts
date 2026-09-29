import { FastifyInstance } from "fastify";
import Participant from "../../database/chat/participants.db";
import getDB from "../../database/db";
import { participantInfo } from "./types/participants.types";
import { membershipSchema, roomMembersSchema, participantSchema } from "./schemas/participants.schema";

export default function participantsRoutes(app: FastifyInstance){

	app.post('/chat/participants/create', {preHandler: app.authenticate(), schema: participantSchema}, async (request, response) => {
		const {other_id, room_id} = request.body as {other_id: number, room_id: number};
		const my_id = request.user.id;
		const db = await getDB();
		const user = await db.get('SELECT * from USERS WHERE id = ?', other_id);
		if (!user)
			return response.status(400).send({success: false, error: "Invalid friend can't be a participant of a chat room!"});

		const friendship = await db.get('SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)', [my_id, other_id, other_id, my_id]);
		if (!friendship)
			return response.status(404).send({success: false, error: "Could not find a such friendship"});
		if (friendship.status !== "accepted")
			return response.status(404).send({success: false, error: "Users are not friends."});

		if (friendship.blocker_id)
			return response.status(409).send({success: false, error: "Can't be participant in blocked room!"});

		const room = await db.get('SELECT * FROM ROOMS WHERE id = ?', room_id);
		if (!room)
			return response.status(400).send({success: false, error: "Can't join invalid room!"});

		const roomMembers: participantInfo[] = await db.all('SELECT * FROM participants WHERE room_id = ?', room_id);
		if (roomMembers.length > 0) {
			const memberIds = roomMembers.map(member => member.user_id);
			if (memberIds.includes(my_id) && memberIds.includes(other_id)) {
				return { success: true, message: "Participants already in room." };
			}
			return new Error("Room is already full");
		}
		const participant1 = await Participant.createOrIgnore({ user_id: my_id, room_id });
		const participant2 = await Participant.createOrIgnore({ user_id: other_id, room_id });
		return ({success: true, participants: {participant1, participant2}});
	});

	app.get('/chat/check-membership/:other_id', { preHandler: app.authenticate() , schema: membershipSchema}, async (request, response) => { // checks wether the two users exist in a room
		const my_id = request.user.id;
		const { other_id: other_user_id } = request.params as { other_id: string };
		const other_id = parseInt(other_user_id);

		const db = await getDB();
		const user = await db.get('SELECT * from USERS WHERE id = ?', other_id);
		if (!user)
			return response.status(400).send({success: false, error: "Invalid friend can't be a participant of a chat room!"});

		if (my_id === other_id) {
			return response.status(400).send({
				success: false,
				error: "User cannot check for a room with themselves"
			});
		}

		const sql = `
			SELECT room_id
			FROM participants
			WHERE user_id = ? OR user_id = ?
			GROUP BY room_id
			HAVING COUNT(DISTINCT user_id) = 2
		`;
		const room_id = await db.get(sql, [my_id, other_id]);

		if (room_id) {
			return {
				success: true,
				exists: true,
				room_id: room_id.room_id
			};
		} else {
			return {
				success: true,
				exists: false,
				room_id: null
			};
		}
	});

	app.get('/chat/participants/members-by-room/:roomId', {preHandler: app.authenticate(), schema: roomMembersSchema}, async (request, response) => { // checks the participants o a certain room
		const {roomId} = request.params as {roomId: number};
		const db = await getDB();
		const room = await db.get('SELECT * FROM rooms where id = ?', roomId);
		if (!room)
			return response.status(400).send({success: false, error: "No such roomId"});
		const sqlQuery: string = 'SELECT * FROM participants WHERE room_id = ?';
		const res = await db.all(sqlQuery, roomId);
		if (res.length !== 2)
			return response.status(500).send({success: false, error: "Room does not have exactly 2 participants!"});
		const [participant1, participant2] = res;
		const user1= await db.get('SELECT * from USERS WHERE id = ?', participant1.user_id);

		if (!user1)
			return response.status(400).send({success: false, error: "Invalid friend can't be a participant of a chat room!"});
		const user2= await db.get('SELECT * from USERS WHERE id = ?', participant1.user_id);
		if (!user2)
			return response.status(400).send({success: false, error: "Invalid friend can't be a participant of a chat room!"});

		const friendship = await db.get('SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)', [participant1.user_id, participant2.user_id, participant2.user_id, participant1.user_id]);
		if (!friendship)
			return response.status(404).send({success: false, error: "Could not find a such friendship"});
		if (friendship.status !== "accepted")
			return response.status(404).send({success: false, error: "Room members are not friends!"});

		const result = {success: true, member1: participant1.user_id, member2: participant2.user_id};
		return result;
	});
}

