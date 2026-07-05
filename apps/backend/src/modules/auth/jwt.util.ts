import { sign } from 'jsonwebtoken';

export interface JwtSignableUser {
  id: string;
  name: string;
  email: string;
}

export function signUserToken(user: JwtSignableUser, secret: string): string {
  return sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
    },
    secret,
    { expiresIn: '7d' },
  );
}
