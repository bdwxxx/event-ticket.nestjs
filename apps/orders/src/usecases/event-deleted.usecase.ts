import { Injectable, Logger } from "@nestjs/common";
import { OrdersRepository } from "../adapters/repositories/orders.repository";

@Injectable()
export class EventDeletedUseCase {
    constructor(
        private readonly ordersRepository: OrdersRepository,
        private readonly logger: Logger,
    ) {}
    async execute(eventId: number): Promise<void> {
    // найти все заказы с билетами для этого мероприятия
      const affectedOrders = await this.ordersRepository.findOrdersWithEventTickets(eventId);
      
      for (const order of affectedOrders) {
        if (order.order_status === 'cart') {
          // удалить билеты из корзины, если заказ еще не оплачен
          await this.ordersRepository.removeEventTicketsFromOrder(order.id, eventId);
          this.logger.log(`Removed tickets for event ${eventId} from cart order ${order.id}`);
        } else if (['paid', 'payment_pending', 'created'].includes(order.order_status)) {
          // оформить возврат средств, если заказ оплачен
          await this.ordersRepository.refundOrderForEvent(order.id, eventId);
          this.logger.log(`Initiated refund for event ${eventId} on order ${order.id}`);
        }
      }
    }
}