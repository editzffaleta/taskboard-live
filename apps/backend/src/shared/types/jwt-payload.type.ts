export type JwtPayload = {
  sub: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};
