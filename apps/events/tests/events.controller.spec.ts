import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from '../src/events.controller';
import { EventsService } from '../src/events.service';
import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../src/guards/role.enum';

describe('EventsController', () => {
  let controller: EventsController;
  let service: EventsService;
  let reflector: Reflector;

  const mockEvent = {
    id: 1,
    name: 'Test Event',
    description: 'Test Description',
    eventDate: new Date(),
    availableTickets: '100',
    ticketPrice: 10,
  };

  // Simple service mock
  const mockEventsService = {
    createEvent: jest.fn().mockResolvedValue(mockEvent),
    updateEvent: jest.fn().mockResolvedValue(mockEvent),
    deleteEvent: jest.fn().mockResolvedValue(true),
    getEvent: jest.fn().mockResolvedValue(mockEvent),
    getEvents: jest.fn().mockResolvedValue([mockEvent]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: mockEventsService },
        Reflector,
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get<EventsService>(EventsService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEvents', () => {
    it('should return all events', async () => {
      const result = await controller.getEvents({});
      
      expect(service.getEvents).toHaveBeenCalled();
      expect(result).toEqual([mockEvent]);
    });
  });

  describe('getEvent', () => {
    it('should return a single event', async () => {
      const result = await controller.getEvent('1');
      
      expect(service.getEvent).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEvent);
    });

    it('should handle not found exceptions', async () => {
      mockEventsService.getEvent.mockRejectedValueOnce(new NotFoundException());
      
      await expect(controller.getEvent('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      const createDto = {
        name: 'New Event',
        description: 'Description',
        eventDate: new Date(),
        availableTickets: '50',
        ticketPrice: 25,
      };
      
      const result = await controller.createEvent(createDto);
      
      expect(service.createEvent).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockEvent);
    });
  });

  describe('updateEvent', () => {
    it('should update an event', async () => {
      const updateDto = { name: 'Updated Event' };
      
      const result = await controller.updateEvent('1', updateDto);
      
      expect(service.updateEvent).toHaveBeenCalledWith('1', updateDto);
      expect(result).toEqual(mockEvent);
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      const result = await controller.deleteEvent('1');
      
      expect(service.deleteEvent).toHaveBeenCalledWith('1');
      expect(result).toEqual({ success: true });
    });
  });

  // One simple test for roles
  it('should require ADMIN role for createEvent', () => {
    const roles = reflector.get('roles', controller.createEvent);
    expect(roles).toContain(Role.ADMIN);
  });
});
