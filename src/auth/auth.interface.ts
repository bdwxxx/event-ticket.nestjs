export interface IUser {
  name: string;
  password_hash: string;
  role: 'user' | 'admin';
}

export interface ITokenPayload {
  name: string;
  sub?: string;
  role: string;
}
