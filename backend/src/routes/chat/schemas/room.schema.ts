export const roomSchema = {
	body: {
		type: 'object',
		required: ["host", "guest"],
		properties: {
			host: { type: 'string', pattern: '^\\d+$' },
			guest: { type: 'string', pattern: '^\\d+$' },
		},
	}
};
