import { User } from './user.schema';

export interface IUserRepository {
  create(user: Partial<User>): Promise<User>;
  findOne(filter: Partial<User>): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}
