export interface IUser {
  id: number;
  name: string;
  password_hash: string;
  role: 'user' | 'admin';
}

export interface ITokenPayload {
  name: string;
  sub: number;
  role: string;
}
