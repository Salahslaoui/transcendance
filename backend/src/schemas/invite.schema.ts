
export const sendInviteSchema = {
    type: "object",
    properties: {
        invitedId: {type: "number"},
        mode: {type: "string", enum: ["tournament", "1v1"]},
        socketId: {type: "number"}
    },
    required: ["invitedId", "mode", "socketId"]
}

export const manageInviteSchema = {
    type: "object",
    properties: {
        action: {type: "string", enum: ["accept", "reject"]},
        invitationId: {type: "number"}
    },
    required: ["action", "invitationId"]
}


export const manageInviteSchemaBody = {
    type: "object",
    properties: {
        socketId: {type: "number"}
    },
    required: ["socketId"]
}