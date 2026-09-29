


export const validateApiKeySchema = {
    type: "object", 
    properties: {
        apiKey: {type: "string"}
    },
    required: ["apiKey"]
}