export const addFriendSchema = {
    type: "object",
    properties: {
        username: { type: "string" }
    },
    required: ["username"]
};

export const listFriendSchema = {
    type: "object",
    properties: {
        type: {
            type: "string",
            enum: ["pending", "accepted"]
        }
    },
    required:["type"]
};

export const manageFriendSchema = {
    type: "object",
    properties: {
        friendId: { type: "number" }
    },
    required: ["friendId"]
};

