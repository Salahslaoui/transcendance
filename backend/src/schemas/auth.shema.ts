export const signupSchema = {
	body: {
      	type: 'object',
      	required: ['email', 'password', 'username'],
      	properties: {
        	email: { type: 'string', format: 'email', minLength: 1 },
        	password: { type: 'string', minLength: 6 },
        	username: { type: 'string', minLength: 6}
      	}
	}
};

export const loginSchema = {
	body: {
		type: 'object',
		required: ['username', 'password'],
		properties: {
			username: { type: 'string', minLength: 6 },
			password: { type: 'string', minLength: 6 }
		}
	}
};