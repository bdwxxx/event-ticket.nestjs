import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';
import { Order } from '../entitites/order.entity';
import { RmqService } from '../services/rmq/rmq.service';
import { CreatePaymentDto } from '../dto/createPayment.dto';
import { PaymentsAdapter } from '../adapters/payments/payments.adapter';
import { wsPaymentsAdapter } from 'src/adapters/payments/ws/wsPayments.adapter';

@Injectable()
export class CheckoutOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly rmqService: RmqService,
    private readonly paymentAdapter: PaymentsAdapter,
    private readonly wsPaymentsAdapter: wsPaymentsAdapter,
  ) {}

async execute(orderId: number, paymentData: CreatePaymentDto): Promise<Order> {
  const order = await this.ordersRepository.findOneWithTickets(orderId);
  const totalAmount = await this.ordersRepository.calculateOrderTotal(orderId);

  const paymentResponse = await this.paymentAdapter.createPayment({
    amount: totalAmount,
    cardNumber: paymentData.cardNumber,
    cardholderName: paymentData.cardholderName,
    expiryDate: paymentData.expiryDate,
    cvv: paymentData.cvv,
  });

  if (paymentResponse.status !== true) {
    throw new Error('Payment failed');
  }

  // Получаем merchantId и paymentId из ответа
  const paymentId = paymentResponse.paymentId as string;

  // Начинаем отслеживать статус платежа через WebSocket
  this.wsPaymentsAdapter.startTracking(paymentId);
  
  // Создаем Promise, который разрешится когда платеж будет подтвержден
  const paymentConfirmation = new Promise<void>((resolve, reject) => {
  // Устанавливаем таймаут для ожидания подтверждения платежа (например, 2 минуты)
  const timeout = setTimeout(() => {
    this.wsPaymentsAdapter.eventEmitter.off('payment.updated', paymentUpdateListener);
    this.wsPaymentsAdapter.stopTracking(paymentId);
    reject(new Error('Payment confirmation timeout'));
  }, 120000);
  
  // Подписываемся на событие обновления платежа
  const paymentUpdateListener = (data) => {
    console.log('Payment update received:', JSON.stringify(data));
    
    if (data && 'paymentId' in data) {
      console.log('Payment ID from data:', data.paymentId, 'Expected:', paymentId);
      
      const status = (data.status || '').toUpperCase();
      console.log('Status from data:', status);
      
      if (status === 'SUCCESSFUL') {
        console.log('Payment confirmed, resolving promise');
        clearTimeout(timeout);
        this.wsPaymentsAdapter.eventEmitter.off('payment.updated', paymentUpdateListener);
        resolve();
      } else if (status === 'FAILED') {
        console.log('Payment failed, rejecting promise');
        clearTimeout(timeout);
        this.wsPaymentsAdapter.eventEmitter.off('payment.updated', paymentUpdateListener);
        reject(new Error(`Payment failed: ${data.errorReason || 'Unknown error'}`));
      }
    } else {
      console.log('Data structure is not as expected:', Object.keys(data));
    }
  };
  
  this.wsPaymentsAdapter.eventEmitter.on('payment.updated', paymentUpdateListener);
});

  try {
    // Ожидаем подтверждения платежа в реальном времени
    await paymentConfirmation;
    
    // После подтверждения платежа продолжаем оформление заказа
    const updatedOrder = await this.ordersRepository.checkout(orderId);

    // Публикуем события для каждого билета
    const eventTickets = {};

    // Группируем билеты по eventId для подсчета количества
    for (const ticket of order.tickets) {
      if (!eventTickets[ticket.event_id]) {
        eventTickets[ticket.event_id] = 0;
      }
      eventTickets[ticket.event_id]++;
    }

    // Публикуем событие для каждого мероприятия ТОЛЬКО после подтверждения платежа
    for (const eventId in eventTickets) {
      await this.rmqService.sendToQueue('order.ticket.purchased', {
        eventId: parseInt(eventId),
        orderId: order.id,
        quantity: eventTickets[eventId],
      });
    }

    return updatedOrder;
  } finally {
    // В любом случае останавливаем отслеживание платежа
    this.wsPaymentsAdapter.stopTracking(paymentId);
  }
}
}
