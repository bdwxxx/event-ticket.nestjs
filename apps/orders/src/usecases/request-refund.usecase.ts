import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';
import {
  OrderNotFoundException,
  RefundWindowExpiredException,
} from '../domain/exceptions/order-exceptions';
import { Order } from '../domain/models/order.models';
import { OrderMapper } from '../domain/order.mapper';
import { RmqService } from '../services/rmq/rmq.service';
import { RefundPaymentDto } from '../dto/refundPayment.dto';
import { PaymentsAdapter } from '../adapters/payments/payments.adapter';

@Injectable()
export class RequestRefundUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderMapper: OrderMapper,
    private readonly rmqService: RmqService,
    private readonly paymentsAdapter: PaymentsAdapter,
  ) {}

  async execute(
    orderId: number,
    userId: string,
    refundPaymentData: RefundPaymentDto,
  ): Promise<Order> {
    const orderEntity = await this.ordersRepository.findOne(orderId, userId);

    if (!orderEntity) {
      throw new OrderNotFoundException();
    }

    const order = this.orderMapper.toDomain(orderEntity);

    if (!order.canRequestRefund()) {
      throw new RefundWindowExpiredException();
    }

    const paymentRequest = await this.paymentsAdapter.refundPayment({
      paymentId: refundPaymentData.paymentId,
      amount: refundPaymentData.amount,
    });

    if (paymentRequest.status === false) {
      throw new HttpException('Payment refund failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const updatedOrderEntity =
      await this.ordersRepository.requestRefund(orderId);

    const eventTickets = {};

    for (const ticket of orderEntity.tickets) {
      if (!eventTickets[ticket.event_id]) {
        eventTickets[ticket.event_id] = 0;
      }
      eventTickets[ticket.event_id]++;
    }
    for (const eventId in eventTickets) {
      await this.rmqService.sendToQueue('order.ticket.refunded', {
        eventId: parseInt(eventId),
        orderId: order.id,
        quantity: eventTickets[eventId],
      });
    }

    return this.orderMapper.toDomain(updatedOrderEntity);
  }
}
