export const modifyusernameSchema = {
  body: {
    type: 'object',
    required: ['newusername'],
    properties: {
      newusername: { 
        type: 'string', 
        minLength: 6, 
        maxLength: 20,
        pattern: '^[a-zA-Z0-9_]+$'
      }
    }
  }
};

export const modifyPasswordSchema = {
  body: {
    type: 'object',
    required: ['oldPassword', 'newPassword'],
    properties: {
      oldPassword: { type: 'string', minLength: 6 },
      newPassword: { type: 'string', minLength: 6 }
    }
  }
};