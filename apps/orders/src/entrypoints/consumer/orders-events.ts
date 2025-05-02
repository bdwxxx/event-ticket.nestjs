import { Injectable, Logger } from '@nestjs/common';
import { RmqService } from '../../services/rmq/rmq.service';
import { OrdersRepository } from '../../adapters/repositories/orders.repository';
import * as amqp from 'amqplib';
import { EventDeletedUseCase } from '../../usecases/event-deleted.usecase';

@Injectable()
export class OrderEventsHandler {
  private readonly logger = new Logger(OrderEventsHandler.name);

  constructor(
    private readonly rmqService: RmqService,
    private readonly eventDeletedUseCase: EventDeletedUseCase,
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
      
      await this.eventDeletedUseCase.execute(eventId);
    } catch (error) {
      this.logger.error('Error processing event.deleted event', error);
    }
  }
}