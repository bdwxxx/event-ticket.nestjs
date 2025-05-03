import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';
import { Order } from '../entitites/order.entity';

@Injectable()
export class GetAllOrdersUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(userId: string): Promise<Order[]> {
    return this.ordersRepository.findAll(userId);
  }
}
