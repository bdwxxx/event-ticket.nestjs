import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';
import { Order } from '../entitites/order.entity';

@Injectable()
export class UpdateOrderUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(
    orderId: number,
    eventId: number,
    price: number,
  ): Promise<Order> {
    return this.ordersRepository.addTicketToOrder(orderId, eventId, price);
  }
}
