import { Injectable, Logger } from '@nestjs/common';
import { RmqService } from '../../rmq/rmq.service';
import { EventsRepositoryService } from 'src/events-repository/events-repositories.service';
import * as amqp from 'amqplib';

@Injectable()
export class TicketEventsHandler {
  private readonly logger = new Logger(TicketEventsHandler.name);

  constructor(
    private readonly rmqService: RmqService,
    private readonly eventsRepository: EventsRepositoryService,
  ) {
    this.logger.log('TicketEventsHandler initialized');
    this.subscribeToOrderChanges();
  }

  private subscribeToOrderChanges(): void {
    this.rmqService.consume(
      'order.ticket.purchased',
      this.handleTicketPurchased.bind(this),
    );
    this.rmqService.consume(
      'order.ticket.refunded',
      this.handleTicketRefunded.bind(this),
    );
  }

  private async handleTicketPurchased(
    msg: amqp.ConsumeMessage | null,
  ): Promise<void> {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString());
      const { eventId, quantity = 1 } = content;

      this.logger.log(
        `Received order.ticket.purchased for eventId: ${eventId}, quantity: ${quantity}`,
      );

      // получаем текущее мероприятие
      const event = await this.eventsRepository.findById(eventId.toString());

      if (!event) {
        this.logger.warn(`Event with id ${eventId} not found`);
        return;
      }

      // обновляем количество доступных билетов
      const currentTickets = parseInt(event.availableTickets, 10);
      const newTicketCount = Math.max(0, currentTickets - quantity);

      await this.eventsRepository.update(eventId.toString(), {
        availableTickets: newTicketCount.toString(),
      });

      this.logger.log(
        `Updated available tickets for event ${eventId}: ${currentTickets} -> ${newTicketCount}`,
      );
    } catch (error) {
      this.logger.error('Error processing order.ticket.purchased event', error);
    }
  }

  private async handleTicketRefunded(
    msg: amqp.ConsumeMessage | null,
  ): Promise<void> {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString());
      const { eventId, quantity = 1 } = content;

      this.logger.log(
        `Received order.ticket.refunded for eventId: ${eventId}, quantity: ${quantity}`,
      );

      // получаем текущее мероприятие
      const event = await this.eventsRepository.findById(eventId.toString());

      if (!event) {
        this.logger.warn(`Event with id ${eventId} not found`);
        return;
      }

      // увеличиваем количество доступных билетов
      const currentTickets = parseInt(event.availableTickets, 10);
      const newTicketCount = currentTickets + quantity;

      await this.eventsRepository.update(eventId.toString(), {
        availableTickets: newTicketCount.toString(),
      });

      this.logger.log(
        `Updated available tickets for event ${eventId}: ${currentTickets} -> ${newTicketCount}`,
      );
    } catch (error) {
      this.logger.error('Error processing order.ticket.refunded event', error);
    }
  }
}
