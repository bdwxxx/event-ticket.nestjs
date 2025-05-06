import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';
import { Order } from '../entitites/order.entity';

@Injectable()
export class GetOrderUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(orderId: number, userId: string): Promise<Order> {
    return this.ordersRepository.findOne(orderId, userId);
  }
}
