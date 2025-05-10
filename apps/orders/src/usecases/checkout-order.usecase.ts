import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';
import { Order } from '../entitites/order.entity';
import { RmqService } from '../services/rmq/rmq.service';
import { CreatePaymentDto } from '../dto/createPayment.dto';
import { PaymentsAdapter } from '../adapters/payments/payments.adapter';
import { PaymentTrackingService } from 'src/services/payment-tracking/payment-tracking.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class CheckoutOrderUseCase {
  private readonly logger = new Logger(CheckoutOrderUseCase.name);
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly rmqService: RmqService,
    private readonly paymentAdapter: PaymentsAdapter,
    private readonly paymentTracking: PaymentTrackingService,
  ) {}

  async execute(
    orderId: number,
    paymentData: CreatePaymentDto,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOneWithTickets(orderId);
    const totalAmount =
      await this.ordersRepository.calculateOrderTotal(orderId);

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
    this.logger.log(`Payment ${paymentId} created, waiting for confirmation`);

    // Ожидаем подтверждения платежа через новый сервис
    await this.paymentTracking.trackPayment(paymentId);
    this.logger.log(`Payment ${paymentId} confirmed successfully`);

    try {
      // После подтверждения платежа обновляем статус заказа
      const updatedOrder = await this.ordersRepository.checkout(orderId);

      // Отправляем уведомления о покупке билетов
      await this.publishTicketPurchaseEvents(order);

      return updatedOrder;
    } catch (error) {
      this.logger.error(`Payment confirmation failed: ${error.message}`);
      throw new Error(`Order checkout failed: ${error.message}`);
    }
  }

  /**
   * Публикует события о покупке билетов для каждого мероприятия
   */
  private async publishTicketPurchaseEvents(order: Order): Promise<void> {
    // Группируем билеты по eventId для подсчета количества
    const eventTickets = {};

    for (const ticket of order.tickets) {
      if (!eventTickets[ticket.event_id]) {
        eventTickets[ticket.event_id] = 0;
      }
      eventTickets[ticket.event_id]++;
    }

    // Публикуем событие для каждого мероприятия
    for (const eventId in eventTickets) {
      await this.rmqService.sendToQueue('order.ticket.purchased', {
        eventId: parseInt(eventId),
        orderId: order.id,
        quantity: eventTickets[eventId],
      });

      this.logger.debug(
        `Published ticket purchase event for eventId=${eventId}, quantity=${eventTickets[eventId]}`,
      );
    }
  }
}
