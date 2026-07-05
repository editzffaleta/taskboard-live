import { JwtPayload } from './jwt-payload.type';

export type AuthenticatedUser = {
  id: string;
  name?: string;
  email?: string;
  claims: JwtPayload;
};
