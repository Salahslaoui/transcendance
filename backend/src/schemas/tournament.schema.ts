

export const createTournamentSchema = {
    type: "object",
    properties: {
        name: {type: "string"},
        max_player_count: {type: "number"},
    },
    required: ["name", "max_player_count"]
}

