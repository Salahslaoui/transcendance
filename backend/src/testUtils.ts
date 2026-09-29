export interface AuthResult {
  token: string;
  id: number;
}

export default async function createAndLoginUsers(
  fastify: any,
  username1: string,
  username2: string,
  password = "password123"
): Promise<{ user1: AuthResult; user2: AuthResult }> {
  // Signup both users
  for (const [username, email] of [
    [username1, `${username1}@example.com`],
    [username2, `${username2}@example.com`],
  ]) {
    await fastify.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { username, email, password },
    });
  }

  const login = async (username: string): Promise<AuthResult> => {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username, password },
    });
    const data = JSON.parse(response.payload);
    return {
      token: data.details.token,
      id: data.details.user.id,
    };
  };

  const user1 = await login(username1);
  const user2 = await login(username2);

  return { user1, user2 };
}
