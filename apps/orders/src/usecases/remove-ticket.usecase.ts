import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../adapters/repositories/orders.repository';
import { Order } from '../entitites/order.entity';

@Injectable()
export class RemoveTicketUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(orderId: number, ticketId: number): Promise<Order> {
    return this.ordersRepository.removeTicketFromOrder(orderId, ticketId);
  }
}
