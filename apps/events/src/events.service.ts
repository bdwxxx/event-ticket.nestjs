import { Injectable, NotFoundException } from '@nestjs/common';
import { EventsRepositoryService } from './events-repository/events-repositories.service';
import { GetEventsDto } from './dto/get-events.dto';
import { Event } from './db/entities/events.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepositoryService,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async createEvent(eventData: Partial<Event> = {}): Promise<Event> {
    return this.eventsRepository.create(eventData);
  }

  async updateEvent(
    id: string,
    eventData: Partial<Event> = {},
  ): Promise<Event> {
    const updatedEvent = await this.eventsRepository.update(id, eventData);
    if (!updatedEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const deleted = await this.eventsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return deleted;
  }

  async getEvent(id: string): Promise<Event> {
    const event = await this.eventsRepository.findById(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async getEvents(query: GetEventsDto): Promise<Event[]> {
    const qb = this.eventRepo.createQueryBuilder('event');
    
    if (query.dateFrom || query.dateTo) {
      if (query.dateFrom) {
        qb.andWhere('event.eventDate >= :dateFrom', {
          dateFrom: new Date(query.dateFrom),
        });
      }
      if (query.dateTo) {
        qb.andWhere('event.eventDate <= :dateTo', {
          dateTo: new Date(query.dateTo),
        });
      }
    }

    if (query.bite) {
      qb.andWhere('event.name LIKE :bite', { bite: `%${query.bite}%` });
    }

    if (query.ms_count) {
      qb.take(query.ms_count);
    }

    if (query.page) {
      const take = query.ms_count || 10;
      const skip = (query.page - 1) * take;
      qb.skip(skip).take(take);
    }

    return await qb.getMany();
  }
}
