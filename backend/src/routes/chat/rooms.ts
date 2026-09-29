
import { FastifyInstance } from "fastify";
import getDB from "../../database/db";
import { roomSchema } from "./schemas/room.schema";

export async function roomRoutes(app: FastifyInstance) {
	app.post('/chat/rooms/create', {preHandler: app.authenticate(), schema: roomSchema}, async (request, response) => {
		const {host, guest} = request.body as {host: number, guest: number};

		const db = await getDB();

		if (host === guest)
			return response.status(409).send({success: false, error: "Can't join/create a room with yourself!"});
		const host_data = await db.get('SELECT * from USERS WHERE id = ?', host);
		if (!host_data)
			return response.status(400).send({success: false, error: "Invalid room host can't be a participant of a chat room!"});
		const guest_data = await db.get('SELECT * from USERS WHERE id = ?', guest);
		if (!guest_data)
			return response.status(400).send({success: false, error: "Invalid guest can't be a participant of a chat room!"});

		const sql = `
			SELECT room_id
			FROM participants
			WHERE user_id = ? OR user_id = ?
			GROUP BY room_id
			HAVING COUNT(DISTINCT user_id) = 2
		`;

		const roomCheck = await db.get(sql, [host, guest]);
		if (roomCheck)
			return response.status(409).send({success: false, error: "Room already exist"});

		const friendship = await db.get('SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)', [host, guest, guest, host]);
		if (!friendship)
			return response.status(404).send({success: false, error: "Could not find a such friendship"});
		if (friendship.status !== "accepted")
			return response.status(404).send({success: false, error: "Users are not friends."});

		if (friendship.blocker_id)
			return response.status(403).send({success: false, error: "Unblock friend before starting a chat."});

		const room = await db.get('INSERT INTO rooms DEFAULT VALUES RETURNING id;');
		return {success: true, room_id: room.id};
	});

	app.get('/chat/rooms/list', {preHandler: app.authenticate()}, async (request, response) => {
		const db = await getDB();
		const my_id = request.user.id;
		const rooms = await db.all('SELECT DISTINCT rooms.id, rooms.name, rooms.created_at FROM rooms JOIN participants ON rooms.id = participants.room_id WHERE participants.user_id = ? ;', my_id);

		return ({success: true, rooms});
	});
}

