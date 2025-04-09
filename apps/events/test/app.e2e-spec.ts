import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { EventsModule } from './../src/events.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from './../src/db/entities/events.entity';

describe('EventsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EventsModule],
    })
    .overrideProvider(getRepositoryToken(Event))
    .useValue({
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/events (GET)', () => {
    return request(app.getHttpServer())
      .get('/events')
      .expect(200);
  });
  
  afterAll(async () => {
    await app.close();
  });
});
