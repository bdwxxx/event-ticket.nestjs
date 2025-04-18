import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventsRepositoryService } from './events-repository/events-repositories.service';
import { GetEventsDto } from './dto/get-events.dto';
import { Event } from './db/entities/events.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RmqService } from './rmq/rmq.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepositoryService,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly rmqService: RmqService,
  ) {}

  async createEvent(eventData: Partial<Event> = {}): Promise<Event> {
    const newEvent = await this.eventsRepository.create(eventData);
    
    await this.rmqService.publishEvent(
      'events',
      'event.created',
      {
        id: newEvent.id,
        name: newEvent.name,
        eventDate: newEvent.eventDate,
        ticketPrice: newEvent.ticketPrice,
        availableTickets: newEvent.availableTickets,
      },
    );
    
    return newEvent;
  }

  async updateEvent(
    id: string,
    eventData: Partial<Event> = {},
  ): Promise<Event> {
    const originalEvent = await this.eventsRepository.findById(id);
    if (!originalEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    
    const updatedEvent = await this.eventsRepository.update(id, eventData);
    if (!updatedEvent) {
      throw new NotFoundException(`Failed to update event with ID ${id}`);
    }
    
    // Check if ticket price or available tickets changed
    if (
      eventData.ticketPrice !== undefined && 
      originalEvent.ticketPrice !== eventData.ticketPrice
    ) {
      await this.rmqService.publishEvent(
        'events',
        'event.price.changed',
        {
          id: updatedEvent.id,
          oldPrice: originalEvent.ticketPrice,
          newPrice: updatedEvent.ticketPrice,
        },
      );
    }
    
    if (
      eventData.availableTickets !== undefined && 
      originalEvent.availableTickets !== eventData.availableTickets
    ) {
      await this.rmqService.publishEvent(
        'events',
        'event.tickets.changed',
        {
          id: updatedEvent.id,
          oldCount: originalEvent.availableTickets,
          newCount: updatedEvent.availableTickets,
        },
      );
    }
    
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const event = await this.eventsRepository.findById(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    
    const deleted = await this.eventsRepository.delete(id);
    
    if (!deleted) {
      throw new BadRequestException(`Failed to delete event with ID ${id}`);
    }
    
    await this.rmqService.publishEvent(
      'events',
      'event.deleted',
      { id: parseInt(id) },
    );
    
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
