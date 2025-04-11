import { Injectable, NotFoundException } from '@nestjs/common';
import { EventsRepositoryService } from './events-repository/events-repositories.service';
import { GetEventsDto } from './dto/get-events.dto';
import { Event } from './db/entities/events.entity';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepositoryService) {}

  async createEvent(eventData: Partial<Event> = {}): Promise<Event> {
    return this.eventsRepository.create(eventData);
  }

  async updateEvent(id: string, eventData: Partial<Event> = {}): Promise<Event> {
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
    // Build filter conditions based on query params
    const filter: Record<string, any> = {};
    
    if (query.dateFrom || query.dateTo) {
      filter.date = {};
      if (query.dateFrom) {
        filter.date.$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        filter.date.$lte = new Date(query.dateTo);
      }
    }

    if (query.bite) {
      filter.bite = query.bite;
    }

    if (query.ms_count) {
      filter.ms_count = query.ms_count;
    }

    // Implement pagination and filtering logic here
    // This is a placeholder - you'll need to extend the repository to support filtering
    return []; // Replace with actual implementation
  }
}
