import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';
import { Order } from '../entitites/order.entity';

@Injectable()
export class CheckoutOrderUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(orderId: number): Promise<Order> {
    return this.ordersRepository.checkout(orderId);
  }
}
