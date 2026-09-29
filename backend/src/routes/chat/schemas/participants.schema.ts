export const participantSchema = {
  body: {
    type: "object",
    required: ["other_id", "room_id"],
    properties: {
      other_id: { type: "number" },
      room_id: { type: "number" },
    },
  },
};

export const membershipSchema = {
  params: {
    type: 'object',
    required: ['other_id'],
    properties: {
      other_id: { type: 'string', pattern: '^[0-9]+$' }
    }
  }
};

export const roomMembersSchema = {
  params: {
    type: 'object',
    required: ['roomId'],
    properties: {
      roomId: { type: 'string', pattern: '^[0-9]+$' }
    }
  }
};
