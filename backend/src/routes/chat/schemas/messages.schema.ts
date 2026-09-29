export const messageSchema = {
  body: {
    type: "object",
    required: ["room_id", "user_id", "content", "my_socket_id"],
    properties: {
      room_id: { type: "number" },
      user_id: { type: "number" },
      content: { type: "string" },
      my_socket_id: { type: "number" },
    },
  },
};

export const listMessagesSchema = {
  params: {
    type: 'object',
    properties: {
      roomId: { type: 'number' }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number', default: 1, minimum: 1 },
      limit: { type: 'number', default: 13, minimum: 1, maximum: 20 }
    }
  }
};
