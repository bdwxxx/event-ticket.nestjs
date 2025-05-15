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

    if (order.id !== undefined) {
      entity.id = order.id;
    }

    if (order.user_id === undefined) {
      throw new Error(
        'Order user_id cannot be undefined when mapping to entity',
      );
    }
    entity.user_id = order.user_id;

    if (order.order_status === undefined) {
      throw new Error(
        'Order order_status cannot be undefined when mapping to entity',
      );
    }
    entity.order_status = order.order_status;

    entity.created_at = order.created_at;
    entity.tickets = order.tickets
      ? order.tickets.map((ticket) => {
          const ticketEntity = new TicketEntity();
          ticketEntity.id = ticket.id;
          ticketEntity.order = entity; 
          if (ticket.event_id !== undefined) {
            ticketEntity.event_id = ticket.event_id;
          }
          if (ticket.price !== undefined) {
            ticketEntity.price = ticket.price;
          }
          if (ticket.refunded !== undefined) {
            ticketEntity.refunded = ticket.refunded;
          }
          return ticketEntity;
        })
      : [];
    return entity;
  }
}
