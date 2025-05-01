import { Injectable, Logger } from '@nestjs/common';
import { RmqService } from '../../services/rmq/rmq.service';
import { OrdersRepository } from '../../adapters/repositories/orders.repository';
import * as amqp from 'amqplib';

@Injectable()
export class OrderEventsHandler {
  private readonly logger = new Logger(OrderEventsHandler.name);

  constructor(
    private readonly rmqService: RmqService,
    private readonly ordersRepository: OrdersRepository,
  ) {
    this.subscribeToEventChanges();
  }

  private subscribeToEventChanges(): void {
    this.rmqService.consume('event.deleted', this.handleEventDeleted.bind(this));
  }

  private async handleEventDeleted(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString());
      const eventId = content.id;
      
      this.logger.log(`Received event.deleted for eventId: ${eventId}`);
      
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
    } catch (error) {
      this.logger.error('Error processing event.deleted event', error);
    }
  }
}