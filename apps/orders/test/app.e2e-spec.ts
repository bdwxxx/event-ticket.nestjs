import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException, BadRequestException } from '@nestjs/common';
import * as request from 'supertest';
import { OrdersModule } from '../src/orders.module';
import { OrderStatus, Order as OrderEntity } from '../src/entitites/order.entity';
import { Ticket as TicketEntity } from '../src/entitites/ticket.entity';
import { CreatePaymentDto } from '../src/dto/createPayment.dto';
import { RefundPaymentDto } from '../src/dto/refundPayment.dto';
import { OrdersRepository } from '../src/adapters/repositories/orders.repository';
import { RmqService } from '../src/services/rmq/rmq.service';
import { PaymentsAdapter } from '../src/adapters/payments/payments.adapter';
import { OrderNotFoundException, RefundWindowExpiredException } from '../src/domain/exceptions/order-exceptions';
import { DataSource } from 'typeorm';

describe('OrdersController (E2E)', () => {
  let app: INestApplication;

  const mockOrdersRepository = {
    create: jest.fn(),
    addTicketToOrder: jest.fn(),
    removeTicketFromOrder: jest.fn(),
    delete: jest.fn(),
    checkout: jest.fn(),
    requestRefund: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findCurrentCart: jest.fn(),
    findOneWithTickets: jest.fn(),
    calculateOrderTotal: jest.fn(),
  };

  const mockRmqService = {
    sendToQueue: jest.fn(),
    consume: jest.fn(),
  };

  const mockPaymentsAdapter = {
    createPayment: jest.fn(),
    refundPayment: jest.fn(),
  };

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
    try {
      const mockDataSource = {
        initialize: jest.fn().mockResolvedValue(null),
        destroy: jest.fn().mockResolvedValue(null),
        options: {
          type: 'postgres',
        },
        driver: {},
        entityMetadatas: [],
        isInitialized: true,
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === OrderEntity) {
            return mockOrdersRepository;
          }
          if (entity === TicketEntity) {
            return {
              find: jest.fn().mockResolvedValue([]),
              findOneBy: jest.fn().mockResolvedValue(null),
              save: jest.fn().mockResolvedValue({}),
              delete: jest.fn().mockResolvedValue({}),
            };
          }
          return {
            find: jest.fn().mockResolvedValue([]),
            findOneBy: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue({}),
          };
        }),
        manager: {
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === OrderEntity) {
              return mockOrdersRepository;
            }
            return {
              find: jest.fn().mockResolvedValue([]),
              findOneBy: jest.fn().mockResolvedValue(null),
              save: jest.fn().mockResolvedValue({}),
              delete: jest.fn().mockResolvedValue({}),
            };
          }),
          transaction: jest.fn(),
        },
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [OrdersModule],
      })
        .overrideProvider(OrdersRepository)
        .useValue(mockOrdersRepository)
        .overrideProvider(RmqService)
        .useValue(mockRmqService)
        .overrideProvider(PaymentsAdapter)
        .useValue(mockPaymentsAdapter)
        .overrideProvider(DataSource)
        .useValue(mockDataSource)
        .compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }));
      await app.init();
    } catch (error) {
      console.error('[E2E Test Setup] Failed to initialize Nest application:', error);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /order', () => {
    it('should create an order', async () => {
      const orderToReturn = { ...mockOrderEntity, tickets: [{ ...mockTicketProperties } as TicketEntity] };
      mockOrdersRepository.create.mockResolvedValue(orderToReturn);
      const userId = 'user123';
      const response = await request(app.getHttpServer())
        .post('/order')
        .set('X-USER-ID', userId)
        .expect(201);

      expect(mockOrdersRepository.create).toHaveBeenCalledWith(userId);
      expect(response.body.id).toEqual(mockOrderEntity.id);
    });
  });

  describe('PUT /order', () => {
    it('should add a ticket to an order', async () => {
      const updatedOrder = { ...mockOrderEntity, tickets: [{ ...mockTicketProperties } as TicketEntity] };
      mockOrdersRepository.addTicketToOrder.mockResolvedValue(updatedOrder);
      const body = { orderId: 1, eventId: 10, price: 100 };

      const response = await request(app.getHttpServer())
        .put('/order')
        .send(body)
        .expect(200);

      expect(mockOrdersRepository.addTicketToOrder).toHaveBeenCalledWith(
        body.orderId,
        body.eventId,
        body.price,
      );
      expect(response.body.tickets.length).toBe(1);
    });
  });

  describe('GET /order/:id', () => {
    it('should get an order by id', async () => {
      const orderToReturn = { ...mockOrderEntity, tickets: [{ ...mockTicketProperties } as TicketEntity] };
      mockOrdersRepository.findOne.mockResolvedValue(orderToReturn);
      const userId = 'user123';
      const orderId = 1;

      const response = await request(app.getHttpServer())
        .get(`/order/${orderId}`)
        .set('X-USER-ID', userId)
        .expect(200);

      expect(mockOrdersRepository.findOne).toHaveBeenCalledWith(orderId, userId);
      expect(response.body.id).toEqual(mockOrderEntity.id);
    });

    it('should return 404 if order not found', async () => {
      mockOrdersRepository.findOne.mockImplementation(() => {
        throw new OrderNotFoundException();
      });
      const userId = 'user123';
      const orderId = 999;

      await request(app.getHttpServer())
        .get(`/order/${orderId}`)
        .set('X-USER-ID', userId)
        .expect(404);

      expect(mockOrdersRepository.findOne).toHaveBeenCalledWith(orderId, userId);
    });
  });

  describe('GET /order', () => {
    it('should get all orders for a user', async () => {
      const ordersToReturn = [{ ...mockOrderEntity, tickets: [{ ...mockTicketProperties } as TicketEntity] }];
      mockOrdersRepository.findAll.mockResolvedValue(ordersToReturn);
      const userId = 'user123';

      const response = await request(app.getHttpServer())
        .get('/order')
        .set('X-USER-ID', userId)
        .expect(200);

      expect(mockOrdersRepository.findAll).toHaveBeenCalledWith(userId);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toEqual(mockOrderEntity.id);
    });
  });

  describe('GET /order/current', () => {
    it('should get current cart order for a user', async () => {
      const orderToReturn = { ...mockOrderEntity, tickets: [{ ...mockTicketProperties } as TicketEntity] };
      const userId = 'user123';

      mockOrdersRepository.findCurrentCart.mockReset();
      mockOrdersRepository.findCurrentCart.mockImplementation(async (id: string) => {
        if (id === userId) {
          return Promise.resolve(orderToReturn);
        }
        return Promise.resolve(null);
      });

      try {
        const response = await request(app.getHttpServer())
          .get('/order/current')
          .set('X-USER-ID', userId)
          .expect(200);

        expect(mockOrdersRepository.findCurrentCart).toHaveBeenCalledWith(userId);
        expect(response.body.id).toEqual(mockOrderEntity.id);

      } catch (error) {
        console.error('[E2E Test] Error during request or assertion:', error);
        throw error;
      }
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
      const orderWithTickets = { ...mockOrderEntity, tickets: [mockTicketEntityWithOrderLink], order_status: OrderStatus.CART };
      const checkedOutOrder = { 
        ...mockOrderEntity, 
        order_status: OrderStatus.CREATED, 
        tickets: [{ ...mockTicketProperties } as TicketEntity] 
      };

      mockOrdersRepository.findOneWithTickets.mockResolvedValue(orderWithTickets);
      mockOrdersRepository.calculateOrderTotal.mockResolvedValue(paymentData.amount);
      mockPaymentsAdapter.createPayment.mockResolvedValue({ status: true, paymentId: 'payment-xyz' });
      mockOrdersRepository.checkout.mockResolvedValue(checkedOutOrder);
      mockRmqService.sendToQueue.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post(`/order/${orderId}/checkout`)
        .send(paymentData)
        .expect(201);

      expect(mockOrdersRepository.findOneWithTickets).toHaveBeenCalledWith(orderId);
      expect(mockOrdersRepository.calculateOrderTotal).toHaveBeenCalledWith(orderId);
      expect(mockPaymentsAdapter.createPayment).toHaveBeenCalledWith(paymentData);
      expect(mockOrdersRepository.checkout).toHaveBeenCalledWith(orderId);
      expect(mockRmqService.sendToQueue).toHaveBeenCalledWith(
        'order.ticket.purchased',
        expect.objectContaining({ eventId: mockTicketProperties.event_id, orderId: orderId, quantity: 1 }),
      );
      expect(response.body.order_status).toEqual(OrderStatus.CREATED);
    });

    it('should return 400 for invalid payment data', async () => {
      const orderId = 1;
      const invalidPaymentData = {
        amount: 100,
      };

      await request(app.getHttpServer())
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
      const orderWithTickets = { ...mockOrderEntity, tickets: [mockTicketEntityWithOrderLink], order_status: OrderStatus.CART };

      mockOrdersRepository.findOneWithTickets.mockResolvedValue(orderWithTickets);
      mockOrdersRepository.calculateOrderTotal.mockResolvedValue(paymentData.amount);
      mockPaymentsAdapter.createPayment.mockResolvedValue({ status: false, paymentId: 'payment-fail' });

      await request(app.getHttpServer())
        .post(`/order/${orderId}/checkout`)
        .send(paymentData)
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toEqual('Payment failed');
        });

      expect(mockOrdersRepository.findOneWithTickets).toHaveBeenCalledWith(orderId);
      expect(mockOrdersRepository.calculateOrderTotal).toHaveBeenCalledWith(orderId);
      expect(mockPaymentsAdapter.createPayment).toHaveBeenCalledWith(paymentData);
      expect(mockOrdersRepository.checkout).not.toHaveBeenCalled();
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

      mockOrdersRepository.findOneWithTickets.mockImplementation(() => {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      });

      await request(app.getHttpServer())
        .post(`/order/${orderId}/checkout`)
        .send(paymentData)
        .expect(404);

      expect(mockOrdersRepository.findOneWithTickets).toHaveBeenCalledWith(orderId);
      expect(mockOrdersRepository.calculateOrderTotal).not.toHaveBeenCalled();
      expect(mockPaymentsAdapter.createPayment).not.toHaveBeenCalled();
    });
  });

  describe('POST /order/:id/refund', () => {
    it('should request a refund for an order', async () => {
      const orderId = 1;
      const userId = 'user123';
      const refundPaymentData: RefundPaymentDto = { paymentId: 'payment-xyz', amount: 100 };

      const orderEntityForRefund = {
        ...mockOrderEntity,
        order_status: OrderStatus.CREATED,
        created_at: new Date(),
        tickets: [mockTicketEntityWithOrderLink],
      };
      const refundedOrderEntity = { 
        ...mockOrderEntity, 
        order_status: OrderStatus.REFUNDED,
        created_at: orderEntityForRefund.created_at,
        tickets: [{ ...mockTicketProperties } as TicketEntity]
      };

      mockOrdersRepository.findOne.mockResolvedValue(orderEntityForRefund);
      mockPaymentsAdapter.refundPayment.mockResolvedValue({ status: true, refundId: 'refund-abc' });
      mockOrdersRepository.requestRefund.mockResolvedValue(refundedOrderEntity);
      mockRmqService.sendToQueue.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post(`/order/${orderId}/refund`)
        .set('X-USER-ID', userId)
        .send(refundPaymentData)
        .expect(201);

      expect(mockOrdersRepository.findOne).toHaveBeenCalledWith(orderId, userId);
      expect(mockPaymentsAdapter.refundPayment).toHaveBeenCalledWith(refundPaymentData);
      expect(mockOrdersRepository.requestRefund).toHaveBeenCalledWith(orderId);
      expect(mockRmqService.sendToQueue).toHaveBeenCalledWith(
        'order.ticket.refunded',
        expect.objectContaining({ eventId: mockTicketProperties.event_id, orderId: orderId, quantity: 1 }),
      );
      expect(response.body.order_status).toEqual(OrderStatus.REFUNDED);
    });

    it('should return 404 if order to refund is not found', async () => {
      const orderId = 999;
      const userId = 'user123';
      const refundPaymentData: RefundPaymentDto = { paymentId: 'payment-xyz', amount: 100 };

      mockOrdersRepository.findOne.mockImplementation(() => {
        throw new OrderNotFoundException();
      });

      await request(app.getHttpServer())
        .post(`/order/${orderId}/refund`)
        .set('X-USER-ID', userId)
        .send(refundPaymentData)
        .expect(404);

      expect(mockOrdersRepository.findOne).toHaveBeenCalledWith(orderId, userId);
    });

    it('should return 400 if refund window expired', async () => {
      const orderId = 1;
      const userId = 'user123';
      const refundPaymentData: RefundPaymentDto = { paymentId: 'payment-xyz', amount: 100 };

      const oldOrderEntity = {
        ...mockOrderEntity,
        order_status: OrderStatus.CREATED,
        created_at: new Date(Date.now() - 30 * 60 * 1000),
        tickets: [mockTicketEntityWithOrderLink],
      };

      mockOrdersRepository.findOne.mockResolvedValue(oldOrderEntity);

      await request(app.getHttpServer())
        .post(`/order/${orderId}/refund`)
        .set('X-USER-ID', userId)
        .send(refundPaymentData)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual('Refund window expired');
        });

      expect(mockOrdersRepository.findOne).toHaveBeenCalledWith(orderId, userId);
    });

    it('should return 500 if refund payment processing fails', async () => {
      const orderId = 1;
      const userId = 'user123';
      const refundPaymentData: RefundPaymentDto = { paymentId: 'payment-xyz', amount: 100 };

      const orderEntityForRefund = {
        ...mockOrderEntity,
        order_status: OrderStatus.CREATED,
        created_at: new Date(),
        tickets: [mockTicketEntityWithOrderLink],
      };

      mockOrdersRepository.findOne.mockResolvedValue(orderEntityForRefund);
      mockPaymentsAdapter.refundPayment.mockResolvedValue({ status: false, refundId: 'refund-fail' });

      await request(app.getHttpServer())
        .post(`/order/${orderId}/refund`)
        .set('X-USER-ID', userId)
        .send(refundPaymentData)
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toEqual('Payment refund failed');
        });

      expect(mockOrdersRepository.findOne).toHaveBeenCalledWith(orderId, userId);
      expect(mockPaymentsAdapter.refundPayment).toHaveBeenCalledWith(refundPaymentData);
      expect(mockOrdersRepository.requestRefund).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /order/:id/ticket/:ticketId', () => {
    it('should remove a ticket from an order', async () => {
      const orderId = 1;
      const ticketId = 1;
      const orderAfterRemoval = { ...mockOrderEntity, tickets: [] };
      mockOrdersRepository.removeTicketFromOrder.mockResolvedValue(orderAfterRemoval);

      const response = await request(app.getHttpServer())
        .delete(`/order/${orderId}/ticket/${ticketId}`)
        .expect(200);

      expect(mockOrdersRepository.removeTicketFromOrder).toHaveBeenCalledWith(orderId, ticketId);
      expect(response.body.tickets.length).toBe(0);
    });
  });

  describe('DELETE /order/:id', () => {
    it('should delete an order', async () => {
      const orderId = 1;
      const userId = 'user123';
      const orderForFindOne = { ...mockOrderEntity, tickets: [{ ...mockTicketProperties } as TicketEntity] };
      mockOrdersRepository.findOne.mockResolvedValue(orderForFindOne);
      mockOrdersRepository.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/order/${orderId}`)
        .set('X-USER-ID', userId)
        .expect(200);

      expect(mockOrdersRepository.findOne).toHaveBeenCalledWith(orderId, userId);
      expect(mockOrdersRepository.delete).toHaveBeenCalledWith(orderId, userId);
    });

    it('should return 404 if order to delete is not found', async () => {
      const orderId = 999;
      const userId = 'user123';
      mockOrdersRepository.findOne.mockImplementation(() => {
        throw new NotFoundException('Order not found');
      });

      await request(app.getHttpServer())
        .delete(`/order/${orderId}`)
        .set('X-USER-ID', userId)
        .expect(404);

      expect(mockOrdersRepository.findOne).toHaveBeenCalledWith(orderId, userId);
      expect(mockOrdersRepository.delete).not.toHaveBeenCalled();
    });
  });
});