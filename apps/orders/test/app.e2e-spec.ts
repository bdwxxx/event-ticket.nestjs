import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException, BadRequestException } from '@nestjs/common';
import * as request from 'supertest';
import { OrdersModule } from '../src/orders.module';
import { OrderStatus, Order as OrderEntity } from '../src/entitites/order.entity';
import { Ticket as TicketEntity } from '../src/entitites/ticket.entity';
import { CreatePaymentDto } from '../src/dto/createPayment.dto';
import { RefundPaymentDto } from '../src/dto/refundPayment.dto';
import { RmqService } from '../src/services/rmq/rmq.service';
import { PaymentsAdapter } from '../src/adapters/payments/payments.adapter';
import { JwtPaymentAdapter } from '../src/adapters/payments/facades/jwtPayment.facades';
import { wsPaymentsAdapter } from '../src/adapters/payments/ws/wsPayments.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { ConfigType } from '@nestjs/config';
import { RabbitMQModule } from '../src/services/rmq/rmq.module';
import { OrderMapper } from '../src/domain/order.mapper';
import { OrdersRepository } from '../src/adapters/repositories/orders.repository';
import { CreateOrderUseCase } from '../src/usecases/create-order.usecase';
import { GetOrderUseCase } from '../src/usecases/get-order.usecase';
import { UpdateOrderUseCase } from '../src/usecases/update-order.usecase';
import { DeleteOrderUseCase } from '../src/usecases/delete-order.usecase';
import { GetAllOrdersUseCase } from '../src/usecases/get-all-orders.usecase';
import { GetCurrentOrderUseCase } from '../src/usecases/get-current-order.usecase';
import { RequestRefundUseCase } from '../src/usecases/request-refund.usecase';
import { CheckoutOrderUseCase } from '../src/usecases/checkout-order.usecase';
import { RemoveTicketUseCase } from '../src/usecases/remove-ticket.usecase';
import { OrdersController } from '../src/entrypoints/orders.controller';

interface TestContext {
  app: INestApplication;
  postgresqlContainer: StartedPostgreSqlContainer;
  shutdown: () => Promise<void>;
}

describe('OrdersController (E2E)', () => {
  const testContext: TestContext = {} as TestContext;
  
  const mockRmqService = {
    sendToQueue: jest.fn(),
    consume: jest.fn(),
  };

  const mockPaymentsAdapter = {
    createPayment: jest.fn(),
    refundPayment: jest.fn(),
  };

  const mockJwtPaymentAdapter = {};

  const mockWsPaymentsAdapter = {};

  const mockOrderEntity: OrderEntity = {
    id: 1,
    user_id: 'test-user',
    order_status: OrderStatus.CART,
    created_at: new Date(),
    tickets: [],
  };

  const mockTicketProperties = {
    id: 1,
    event_id: 10,
    price: 100,
    order_id: mockOrderEntity.id,
    refunded: false,
  };

  mockOrderEntity.tickets = [{ ...mockTicketProperties } as TicketEntity];

  const mockTicketEntityWithOrderLink: TicketEntity = {
    ...mockTicketProperties,
    order: mockOrderEntity,
  };

  beforeAll(async () => {
    console.time('e2e-test-setup');
    console.log('[E2E Test Setup] Starting PostgreSQL container...');
    
    try {
      const postgresqlContainer = await new PostgreSqlContainer()
        .withDatabase('testdb')
        .withUsername('testuser')
        .withPassword('testpass')
        .withExposedPorts(5432)
        .start();
      
      console.log('[E2E Test Setup] PostgreSQL container started.');
      console.log('before all', postgresqlContainer.getHost(), postgresqlContainer.getMappedPort(5432), postgresqlContainer.getUsername(), postgresqlContainer.getPassword(), postgresqlContainer.getDatabase());
      
      // Create test module
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: postgresqlContainer.getHost(),
            port: postgresqlContainer.getMappedPort(5432),
            username: postgresqlContainer.getUsername(),
            password: postgresqlContainer.getPassword(),
            database: postgresqlContainer.getDatabase(),
            entities: [OrderEntity, TicketEntity],
            synchronize: true,
            logging: true,
          }),
          TypeOrmModule.forFeature([OrderEntity, TicketEntity]),
          RabbitMQModule,
        ],
        providers: [              
          OrderMapper,
          OrdersRepository,
          CreateOrderUseCase,
          GetOrderUseCase,
          UpdateOrderUseCase,
          DeleteOrderUseCase,
          GetAllOrdersUseCase,
          GetCurrentOrderUseCase,
          CheckoutOrderUseCase,
          RequestRefundUseCase,
          RemoveTicketUseCase,
          PaymentsAdapter,
          JwtPaymentAdapter,
          wsPaymentsAdapter
        ], 
        controllers: [OrdersController],
      })
        .overrideProvider(RmqService)
        .useValue(mockRmqService)
        .overrideProvider(PaymentsAdapter)
        .useValue(mockPaymentsAdapter)
        .overrideProvider(JwtPaymentAdapter)
        .useValue(mockJwtPaymentAdapter)
        .overrideProvider(wsPaymentsAdapter)
        .useValue(mockWsPaymentsAdapter)
        .compile();

      const app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }));

      
      await app.init();
      
      // Define shutdown function
      const shutdown = async () => {
        await app.close();
        await postgresqlContainer.stop();
        console.log('[E2E Test Cleanup] Resources cleaned up');
      };
      
      // Save to context
      testContext.app = app;
      testContext.postgresqlContainer = postgresqlContainer;
      testContext.shutdown = shutdown;
      
      console.timeEnd('e2e-test-setup');
    } catch (error) {
      console.error('[E2E Test Setup] Failed to initialize test environment:', error);
      if (testContext.postgresqlContainer) {
        await testContext.postgresqlContainer.stop();
      }
      throw error;
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await testContext.shutdown?.();
  });

  describe('POST /order', () => {
    it('should create an order', async () => {
      const userId = 'user123';
      const response = await request(testContext.app.getHttpServer())
        .post('/order')
        .set('X-USER-ID', userId)
        .expect(201);

      expect(response.body.id).toBeDefined();
    });
  });

  describe('PUT /order', () => {
    it('should add a ticket to an order', async () => {
      const body = { orderId: 1, eventId: 10, price: 100 };

      const response = await request(testContext.app.getHttpServer())
        .put('/order')
        .send(body)
        .expect(200);

      expect(response.body.tickets.length).toBe(1);
    });
  });

  describe('GET /order/:id', () => {
    it('should get an order by id', async () => {
      const userId = 'user123';
      const orderId = 1;

      const response = await request(testContext.app.getHttpServer())
        .get(`/order/${orderId}`)
        .set('X-USER-ID', userId)
        .expect(200);

      expect(response.body.id).toEqual(orderId);
    });

    it('should return 404 if order not found', async () => {
      const userId = 'user123';
      const orderId = 999;

      await request(testContext.app.getHttpServer())
        .get(`/order/${orderId}`)
        .set('X-USER-ID', userId)
        .expect(404);
    });
  });

  describe('GET /order', () => {
    it('should get all orders for a user', async () => {
      const userId = 'user123';

      const response = await request(testContext.app.getHttpServer())
        .get('/order')
        .set('X-USER-ID', userId)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /order/current', () => {
    it('should get current cart order for a user', async () => {
      const userId = 'user123';

      const response = await request(testContext.app.getHttpServer())
        .get('/order/current')
        .set('X-USER-ID', userId)
        .expect(200);

      expect(response.body.id).toBeDefined();
    });
  });

  describe('POST /order/:id/checkout', () => {
    it('should checkout an order', async () => {
      const orderId = 1;
      const paymentData: CreatePaymentDto = {
        amount: 100,
        cardNumber: '1234567890123456',
        cardholderName: 'Test User',
        expiryDate: '12/25',
        cvv: '123',
      };

      mockPaymentsAdapter.createPayment.mockResolvedValue({ status: true, paymentId: 'payment-xyz' });
      mockRmqService.sendToQueue.mockResolvedValue(undefined);

      const response = await request(testContext.app.getHttpServer())
        .post(`/order/${orderId}/checkout`)
        .send(paymentData)
        .expect(201);

      expect(response.body.order_status).toEqual(OrderStatus.CREATED);
    });

    it('should return 400 for invalid payment data', async () => {
      const orderId = 1;
      const invalidPaymentData = {
        amount: 100,
      };

      await request(testContext.app.getHttpServer())
        .post(`/order/${orderId}/checkout`)
        .send(invalidPaymentData)
        .expect(400);
    });

    it('should return 500 if payment processing fails', async () => {
      const orderId = 1;
      const paymentData: CreatePaymentDto = {
        amount: 100,
        cardNumber: '1234567890123456',
        cardholderName: 'Test User',
        expiryDate: '12/25',
        cvv: '123',
      };

      mockPaymentsAdapter.createPayment.mockResolvedValue({ status: false, paymentId: 'payment-fail' });

      await request(testContext.app.getHttpServer())
        .post(`/order/${orderId}/checkout`)
        .send(paymentData)
        .expect(500);
    });

    it('should return 404 if order to checkout is not found', async () => {
      const orderId = 999;
      const paymentData: CreatePaymentDto = {
        amount: 100,
        cardNumber: '1234567890123456',
        cardholderName: 'Test User',
        expiryDate: '12/25',
        cvv: '123',
      };

      await request(testContext.app.getHttpServer())
        .post(`/order/${orderId}/checkout`)
        .send(paymentData)
        .expect(404);
    });
  });

  describe('POST /order/:id/refund', () => {
    it('should request a refund for an order', async () => {
      const orderId = 1;
      const userId = 'user123';
      const refundPaymentData: RefundPaymentDto = { paymentId: 'payment-xyz', amount: 100 };

      mockPaymentsAdapter.refundPayment.mockResolvedValue({ status: true, refundId: 'refund-abc' });
      mockRmqService.sendToQueue.mockResolvedValue(undefined);

      const response = await request(testContext.app.getHttpServer())
        .post(`/order/${orderId}/refund`)
        .set('X-USER-ID', userId)
        .send(refundPaymentData)
        .expect(201);

      expect(response.body.order_status).toEqual(OrderStatus.REFUNDED);
    });

    it('should return 404 if order to refund is not found', async () => {
      const orderId = 999;
      const userId = 'user123';
      const refundPaymentData: RefundPaymentDto = { paymentId: 'payment-xyz', amount: 100 };

      await request(testContext.app.getHttpServer())
        .post(`/order/${orderId}/refund`)
        .set('X-USER-ID', userId)
        .send(refundPaymentData)
        .expect(404);
    });

    it('should return 400 if refund window expired', async () => {
      const orderId = 1;
      const userId = 'user123';
      const refundPaymentData: RefundPaymentDto = { paymentId: 'payment-xyz', amount: 100 };

      await request(testContext.app.getHttpServer())
        .post(`/order/${orderId}/refund`)
        .set('X-USER-ID', userId)
        .send(refundPaymentData)
        .expect(400);
    });

    it('should return 500 if refund payment processing fails', async () => {
      const orderId = 1;
      const userId = 'user123';
      const refundPaymentData: RefundPaymentDto = { paymentId: 'payment-xyz', amount: 100 };

      mockPaymentsAdapter.refundPayment.mockResolvedValue({ status: false, refundId: 'refund-fail' });

      await request(testContext.app.getHttpServer())
        .post(`/order/${orderId}/refund`)
        .set('X-USER-ID', userId)
        .send(refundPaymentData)
        .expect(500);
    });
  });

  describe('DELETE /order/:id/ticket/:ticketId', () => {
    it('should remove a ticket from an order', async () => {
      const orderId = 1;
      const ticketId = 1;

      const response = await request(testContext.app.getHttpServer())
        .delete(`/order/${orderId}/ticket/${ticketId}`)
        .expect(200);

      expect(response.body.tickets.length).toBe(0);
    });
  });

  describe('DELETE /order/:id', () => {
    it('should delete an order', async () => {
      const orderId = 1;
      const userId = 'user123';

      await request(testContext.app.getHttpServer())
        .delete(`/order/${orderId}`)
        .set('X-USER-ID', userId)
        .expect(200);
    });

    it('should return 404 if order to delete is not found', async () => {
      const orderId = 999;
      const userId = 'user123';

      await request(testContext.app.getHttpServer())
        .delete(`/order/${orderId}`)
        .set('X-USER-ID', userId)
        .expect(404);
    });
  });
});