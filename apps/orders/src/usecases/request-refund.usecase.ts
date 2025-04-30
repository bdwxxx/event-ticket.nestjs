import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';
import {
  OrderNotFoundException,
  RefundWindowExpiredException,
} from '../domain/exceptions/order-exceptions';
import { Order } from '../domain/models/order.models';
import { OrderMapper } from '../domain/order.mapper';

@Injectable()
export class RequestRefundUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderMapper: OrderMapper,
  ) {}

  async execute(orderId: number, userId: number): Promise<Order> {
    const orderEntity = await this.ordersRepository.findOne(orderId, userId);

    if (!orderEntity) {
      throw new OrderNotFoundException();
    }

    const order = this.orderMapper.toDomain(orderEntity);

    if (!order.canRequestRefund()) {
      throw new RefundWindowExpiredException();
    }

    const updatedOrderEntity =
      await this.ordersRepository.requestRefund(orderId);

    return this.orderMapper.toDomain(updatedOrderEntity);
  }
}
