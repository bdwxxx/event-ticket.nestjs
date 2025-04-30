import { Injectable } from '@nestjs/common';
import { Order as OrderEntity } from '../entitites/order.entity';
import { Ticket as TicketEntity } from '../entitites/ticket.entity';
import { Order, Ticket } from './models/order.models';

@Injectable()
export class OrderMapper {
  toDomain(orderEntity: OrderEntity): Order {
    const tickets = orderEntity.tickets
      ? orderEntity.tickets.map(
          (ticketEntity) =>
            new Ticket({
              id: ticketEntity.id,
              order_id: ticketEntity.order?.id ?? orderEntity.id,
            }),
        )
      : [];

    return new Order({
      id: orderEntity.id,
      user_id: orderEntity.user_id,
      order_status: orderEntity.order_status,
      created_at: new Date(orderEntity.created_at),
      tickets,
    });
  }

  toEntity(order: Order): OrderEntity {
    const entity = new OrderEntity();
    entity.id = order.id;
    entity.user_id = order.user_id;
    entity.order_status = order.order_status;
    entity.created_at = order.created_at;
    entity.tickets = order.tickets
      ? order.tickets.map((ticket) => {
          const ticketEntity = new TicketEntity();
          ticketEntity.id = ticket.id;
          ticketEntity.order = entity;
          return ticketEntity;
        })
      : [];
    return entity;
  }
}
