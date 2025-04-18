import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../src/events.service';
import { EventsRepositoryService } from '../src/events-repository/events-repositories.service';
import { RmqService } from '../src/rmq/rmq.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from '../src/db/entities/events.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: EventsRepositoryService;
  let rmqService: RmqService;

  const mockEvent = {
    id: 1,
    name: 'Test Event',
    description: 'Test Description',
    eventDate: new Date(),
    availableTickets: '100',
    ticketPrice: 10,
  };

  // Simple mocks for dependencies
  const mockEventsRepository = {
    create: jest.fn().mockResolvedValue(mockEvent),
    findById: jest.fn().mockResolvedValue(mockEvent),
    update: jest.fn().mockResolvedValue(mockEvent),
    delete: jest.fn().mockResolvedValue(true),
  };

  const mockRmqService = {
    sendToQueue: jest.fn().mockResolvedValue(undefined),
    publishEvent: jest.fn().mockResolvedValue(undefined),
  };

  // Simple queryBuilder mock
  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockEvent]),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EventsRepositoryService, useValue: mockEventsRepository },
        { provide: RmqService, useValue: mockRmqService },
        { provide: getRepositoryToken(Event), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventsRepository = module.get<EventsRepositoryService>(EventsRepositoryService);
    rmqService = module.get<RmqService>(RmqService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEvent', () => {
    it('should create an event and publish to RabbitMQ', async () => {
      const result = await service.createEvent(mockEvent);
      
      expect(eventsRepository.create).toHaveBeenCalledWith(mockEvent);
      expect(rmqService.sendToQueue).toHaveBeenCalled();
      expect(result).toEqual(mockEvent);
    });
  });

  describe('getEvents', () => {
    it('should return events with pagination', async () => {
      const result = await service.getEvents({ page: 1, ms_count: 10 });
      
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.take).toHaveBeenCalled();
      expect(result).toEqual([mockEvent]);
    });
  });

  describe('getEvent', () => {
    it('should return a specific event by ID', async () => {
      const result = await service.getEvent('1');
      
      expect(eventsRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsRepository.findById.mockResolvedValueOnce(null);
      
      await expect(service.getEvent('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateEvent', () => {
    it('should update an event and return it', async () => {
      const result = await service.updateEvent('1', { name: 'Updated Event' });
      
      expect(eventsRepository.update).toHaveBeenCalledWith('1', { name: 'Updated Event' });
      expect(result).toEqual(mockEvent);
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event and return success status', async () => {
      const result = await service.deleteEvent('1');
      
      expect(eventsRepository.findById).toHaveBeenCalledWith('1');
      expect(eventsRepository.delete).toHaveBeenCalledWith('1');
      expect(rmqService.sendToQueue).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
