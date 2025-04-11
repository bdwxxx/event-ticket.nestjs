import { Event } from '../db/entities/events.entity';

export interface IEventRepository {
  create(EventData: Partial<Event>): Promise<Event>;
  findOne(filter: Partial<Event>): Promise<Event | null>;
  findById(id: string): Promise<Event | null>;
  update(id: string, data: Partial<Event>): Promise<Event | null>;
  delete(id: string): Promise<boolean>;
}
