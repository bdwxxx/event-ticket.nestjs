import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from 'src/entitites/order.entity';
import { Ticket } from 'src/entitites/ticket.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async create(userId: string): Promise<Order> {
    const order = this.orderRepository.create({
      user_id: userId,
      order_status: OrderStatus.CART,
    });

    return this.orderRepository.save(order);
  }

  async addTicketToOrder(
    orderId: number,
    eventId: number,
    price: number,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, order_status: OrderStatus.CART },
      relations: ['tickets'],
    });

    if (!order) {
      throw new Error('Order not found or not in cart status');
    }

    const ticket = await this.ticketRepository.create({
      event_id: eventId,
      price: price,
      order_id: orderId,
      refunded: false,
    });

    await this.ticketRepository.save(ticket);

    const updatedOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['tickets'],
    });

    if (!updatedOrder) {
      throw new Error('Order not found after adding ticket');
    }

    return updatedOrder;
  }

  async removeTicketFromOrder(
    orderId: number,
    ticketId: number,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, order_status: OrderStatus.CART },
      relations: ['tickets'],
    });

    if (!order) {
      throw new Error('Order not found or not in cart status');
    }

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, order_id: orderId },
    });

    if (!ticket) {
      throw new Error('Ticket not found in the order');
    }

    await this.ticketRepository.remove(ticket);

    const updatedOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['tickets'],
    });

    if (!updatedOrder) {
      throw new Error('Order not found after removing ticket');
    }

    return updatedOrder;
  }

  async delete(orderId: number, userId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user_id: userId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    await this.orderRepository.delete(orderId);
  }

  async checkout(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, order_status: OrderStatus.CART },
      relations: ['tickets'],
    });

    if (!order) {
      throw new Error('Order not found or not in cart status');
    }

    order.order_status = OrderStatus.CREATED;
    return this.orderRepository.save(order);
  }

  async requestRefund(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, order_status: OrderStatus.CREATED },
      relations: ['tickets'],
    });

    if (!order) {
      throw new NotFoundException('Order not found or not in created status');
    }

    order.order_status = OrderStatus.REFUNDED;
    return this.orderRepository.save(order);
  }

  async findOne(id: number, userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, user_id: userId },
      relations: ['tickets'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findAll(userId: string): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: { user_id: userId },
      relations: ['tickets'],
    });
    if (!orders || orders.length === 0) {
      throw new NotFoundException('No orders found');
    }
    return orders;
  }

  async findCurrentCart(userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { user_id: userId, order_status: 'cart' },
      relations: ['tickets'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findOrdersWithEventTickets(eventId: number): Promise<Order[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.tickets', 'ticket')
      .where('ticket.event_id = :eventId', { eventId })
      .getMany();
  }

  async removeEventTicketsFromOrder(
    orderId: number,
    eventId: number,
  ): Promise<void> {
    await this.ticketRepository
      .createQueryBuilder()
      .delete()
      .where('order_id = :orderId', { orderId })
      .andWhere('event_id = :eventId', { eventId })
      .execute();
  }

  async refundOrderForEvent(orderId: number, eventId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['tickets'],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Помечаем билеты для этого мероприятия как возвращенные
    // Если все билеты возвращены, меняем статус заказа на REFUNDED
    const eventTickets = order.tickets.filter(
      (ticket) => ticket.event_id === eventId,
    );

    // Помечаем эти билеты как возвращенные
    for (const ticket of eventTickets) {
      await this.ticketRepository
        .createQueryBuilder()
        .update()
        .set({ refunded: true })
        .where('id = :id', { id: ticket.id })
        .execute();
    }

    // Если все билеты в заказе возвращены, меняем статус заказа
    const remainingActiveTickets = order.tickets.filter(
      (ticket) => ticket.event_id !== eventId && !ticket.refunded,
    );

    if (remainingActiveTickets.length === 0) {
      order.order_status = OrderStatus.REFUNDED;
      await this.orderRepository.save(order);
    }

    const updatedOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['tickets'],
    });

    if (!updatedOrder) {
      throw new NotFoundException('Order not found after refunding tickets');
    }

    return updatedOrder;
  }

  async findOneWithTickets(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['tickets'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  async calculateOrderTotal(orderId: number): Promise<number> {
  const order = await this.findOneWithTickets(orderId);
  
  if (!order || !order.tickets || order.tickets.length === 0) {
    return 0;
  }
  
  return order.tickets.reduce((sum, ticket) => sum + ticket.price, 0);
}
}
