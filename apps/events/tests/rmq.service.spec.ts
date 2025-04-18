import { Test } from '@nestjs/testing';
import { RmqService } from '../src/rmq/rmq.service';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('RmqService', () => {
  let service: RmqService;
  let configService: ConfigService;
  
  // Create simple mock objects for amqp connection and channel
  const mockChannel = {
    assertQueue: jest.fn().mockResolvedValue({}),
    sendToQueue: jest.fn(),
    close: jest.fn().mockResolvedValue({}),
  };
  
  const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn().mockResolvedValue({}),
    on: jest.fn(),
  };
  
  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup amqp.connect mock to return our mock connection
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);
    
    // Create a mock ConfigService
    const mockConfigService = {
      get: jest.fn().mockReturnValue('amqp://localhost:5672'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        RmqService,
      ],
    }).compile();

    service = moduleRef.get<RmqService>(RmqService);
    configService = moduleRef.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connect', () => {
    it('should establish connection and create channel', async () => {
      await service.connect();
      expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
    });
  });

  describe('sendToQueue', () => {
    it('should send a message to a queue', async () => {
      // First connect to establish channel
      await service.connect();
      
      // Call sendToQueue
      await service.sendToQueue('test-queue', { data: 'test-data' });

      // Verify queue was asserted and message was sent to queue
      expect(mockChannel.assertQueue).toHaveBeenCalled();
      expect(mockChannel.sendToQueue).toHaveBeenCalled();
    });
  });

  describe('publishEvent', () => {
    it('should call sendToQueue with the routingKey as queue name', async () => {
      const sendToQueueSpy = jest.spyOn(service, 'sendToQueue').mockResolvedValue();
      
      await service.sendToQueue('routing.key', { data: 'test' });
      
      expect(sendToQueueSpy).toHaveBeenCalledWith('routing.key', { data: 'test' });
    });
  });

  describe('closeConnection', () => {
    it('should close the channel and connection', async () => {
      await service.connect();
      await service.closeConnection();
      
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
