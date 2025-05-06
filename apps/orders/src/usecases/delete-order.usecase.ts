import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';

@Injectable()
export class DeleteOrderUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(orderId: number, userId: string): Promise<void> {
    const orderExists = await this.ordersRepository.findOne(orderId, userId);

    if (!orderExists) {
      throw new NotFoundException('Order not found');
    }

    return this.ordersRepository.delete(orderId, userId);
  }
}
