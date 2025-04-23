import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { EventsModule } from '../src/events.module';
import { RolesGuard } from '../src/guards/roles.guard';
import { AuthGuard } from '../src/guards/auth.guard';
import { EventsService } from '../src/events.service';
import { Role } from '../src/guards/role.enum';
import { RmqService } from '../src/rmq/rmq.service';

describe('EventsController (e2e)', () => {
  let app: INestApplication;
  let eventsService: Partial<EventsService>;

  const mockEvent = {
    id: 1,
    name: 'Test Event',
    description: 'Test Description',
    eventDate: new Date(),
    availableTickets: '100',
    ticketPrice: 10,
  };

  beforeEach(async () => {
    // Create simplified mock services
    eventsService = {
      createEvent: jest.fn().mockResolvedValue(mockEvent),
      updateEvent: jest.fn().mockResolvedValue(mockEvent),
      deleteEvent: jest.fn().mockResolvedValue(true),
      getEvent: jest.fn().mockResolvedValue(mockEvent),
      getEvents: jest.fn().mockResolvedValue([mockEvent]),
    };

    // Simple mock for RmqService
    const mockRmqService = {
      sendToQueue: jest.fn().mockResolvedValue(undefined),
      publishEvent: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue(undefined),
    };

    // Simple mock guards
    const mockAuthGuard = {
      canActivate: jest.fn().mockImplementation(context => {
        const request = context.switchToHttp().getRequest();
        return !!request.headers['x-user-role'];
      }),
    };

    const mockRolesGuard = {
      canActivate: jest.fn().mockImplementation(context => {
        return true; // Simplify by always allowing access in tests
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(EventsService)
      .useValue(eventsService)
      .overrideProvider(RmqService)
      .useValue(mockRmqService)
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ 
      transform: true,
      whitelist: true,
    }));
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /events - should return events list', () => {
    return request(app.getHttpServer())
      .get('/events')
      .set('x-user-role', Role.USER)
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /events/:id - should return a single event', () => {
    return request(app.getHttpServer())
      .get('/events/1')
      .set('x-user-role', Role.USER)
      .expect(200)
      .expect(res => {
        expect(res.body.id).toEqual(mockEvent.id);
      });
  });

  it('POST /events - should create an event', () => {
    const newEvent = {
      name: 'New Event',
      description: 'Description',
      eventDate: new Date().toISOString(),
      availableTickets: '50',
      ticketPrice: 25,
    };

    return request(app.getHttpServer())
      .post('/events')
      .set('x-user-role', Role.ADMIN)
      .send(newEvent)
      .expect(201);
  });

  it('DELETE /events/:id - should delete an event', () => {
    return request(app.getHttpServer())
      .delete('/events/1')
      .set('x-user-role', Role.ADMIN)
      .expect(200)
      .expect(res => {
        expect(res.body.success).toBe(true);
      });
  });

  it('should reject unauthorized requests', () => {
    return request(app.getHttpServer())
      .get('/events')
      .expect(401); // No x-user-role header
  });
});
