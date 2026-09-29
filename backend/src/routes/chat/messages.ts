import { FastifyInstance } from "fastify";
import MessageModel from "../../database/chat/message.db";
import getDB from "../../database/db";
import { listMessagesSchema, messageSchema } from "./schemas/messages.schema";
import { ChatMsg } from "../../helpers/wsUtils";
import UserModel from "../../database/user/user.db";

export default async function messagesRoutes(app: FastifyInstance) {
  app.post("/chat/messages/create", {preHandler: app.authenticate(), schema: messageSchema}, async (request, response) => {
    const { room_id, user_id, content, my_socket_id } = request.body as { room_id: number, user_id: number, content: string, my_socket_id: number };
    const my_id = request.user.id;
    const db = await getDB();

    const user = await db.get('SELECT * from USERS WHERE id = ?', user_id);
    if (!user)
      return response.status(400).send({success: false, error: "Invalid user"});

    const room = await db.get('SELECT * FROM ROOMS WHERE id = ?', room_id);
    if (!room)
      return response.status(400).send({success: false, error: "Invalid room"});

    const roomMembers = await db.all('SELECT * FROM participants WHERE room_id = ?', room_id);
    if (roomMembers.length !== 2)
      return response.status(400).send({success: false, error: "Room does not have exactly 2 participants!", numOfPart: roomMembers.length});
    const memberIds = roomMembers.map(member =>  member.user_id);
    if (!memberIds.includes(my_id)) {
      return response.status(400).send({success: false, error: "You are not members of this room"});
    }
    if (!memberIds.includes(user_id)) {
      return response.status(400).send({success: false, error: "Friend is not members of this room"});
    }

    const friendship = await db.get('SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)', [my_id, user_id, user_id, my_id]);
    if (!friendship)
      return response.status(404).send({success: false, error: "Could not find a such friendship"});
    if (friendship.status !== "accepted")
        return response.status(404).send({success: false, error: "Users are not friends."});

    if (friendship.blocker_id)
      return response.status(409).send({success: false, error: "Cannot send message in blocked friendship"});

    if (content.length > 2000)
      return response.status(413).send({success: false, error: "Message too long, consider into multiple messages"});

    const friend = (await UserModel.findByField("id", user_id))!;
    const me = await UserModel.findByField("id", my_id);
    const chatMsg: ChatMsg = {profileUrl: user.avatar_url, receiverName: user.username, receiverId: user.id, text: content, senderName: me!.username, senderId: my_id, room_id: room_id};
    await friend.sendViaWs({
      type: "arrived_message",
      chatMsg: chatMsg,
    }, {ignoreOffline: true});
    await me?.sendViaWs({
      type: "self_message",
      chatMsg: chatMsg,
    }, {ignoreOffline: true, excludeWsIds: [my_socket_id]})

    const message = await MessageModel.create({
      room_id,
      user_id,
      content,
      timestamp: new Date().toISOString(),
    });
    return { success: true, message };
  });

  app.get("/chat/messages/list/:roomId", {preHandler: app.authenticate(), schema: listMessagesSchema}, async (request, response) => { // get messages by room_id
      const { roomId } = request.params as { roomId: number };
      const my_id = request.user.id;
      const { limit } = request.query as { limit: number };
      const { page } = request.query as { page: number };
      const db = await getDB();
      if (!roomId)
        return response.status(400).send({success: false, error: "Invalid room"});
      const room = await db.get('SELECT * FROM ROOMS WHERE id = ?', roomId);
      if (!room)
        return response.status(400).send({success: false, error: "Room not found"});

      const me = await db.get('SELECT * from USERS WHERE id = ?', my_id);
      if (!me)
        return response.status(400).send({success: false, error: "Invalid user"});

      const roomMembers = await db.all('SELECT * FROM participants WHERE room_id = ?', roomId);
      if (roomMembers.length !== 2)
        return response.status(400).send({success: false, error: "Room does not have exactly 2 participants!", numOfPart: roomMembers.length});
      const [member1, member2] = roomMembers;
      const condition = my_id === member1.user_id || my_id === member2.user_id;
      if (!condition)
        return response.status(403).send({success: false, error: "user is not a member of that room"});

      const otherUserId = member1.user_id === my_id ? member2.user_id : member1.user_id;

      const friendship = await db.get('SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)', [my_id, otherUserId, otherUserId, my_id]);
      if (!friendship)
        return response.status(404).send({success: false, error: "Could not find a such friendship"});

      if (friendship.status !== "accepted")
        return response.status(404).send({success: false, error: "Users are not friends."});

      const totalMessages = await db.get(
        `SELECT COUNT(*) as count FROM messages WHERE room_id = ?`,
        [roomId]
      );
      const totalPages = Math.ceil(totalMessages.count / limit) || 1; // if ceiled to 0, 0 will be false
      if (page > totalPages)
        return { success: true, messages: [] , pagination: { currentPage: totalPages, pageSize: limit, totalPages: totalPages} };
      const offset = (page - 1) * limit;
      const messages = await db.all(`SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?;`, [roomId, limit, offset]);

      return { success: true, messages, pagination: { currentPage: page, pageSize: limit, totalPages: totalPages} };
  });
}
