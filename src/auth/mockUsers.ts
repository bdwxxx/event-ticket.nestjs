export interface User {
  id: number;
  name: string;
  password_hash: string;
  role: 'user' | 'admin';
}

export const mockUsers: User[] = [];
