import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { read } from "fs";
import { Order } from "src/entitites/order.entity";
import { Ticket } from "src/entitites/ticket.entity";
import { Repository } from "typeorm";

@Injectable()
export class OrdersRepository {
    constructor(
        @InjectRepository(Order)
        @InjectRepository(Ticket)  
        private readonly orderRepository: Repository<Order>,
        private readonly ticketRepository: Repository<Ticket>
) {}

    async create(userId: number): Promise<Order> {
        const order = this.orderRepository.create({
            user_id: userId,
            order_status: 'cart',
        })

        return this.orderRepository.save(order);
    }

    async addTicketToOrder(orderId: number, eventId: number, price: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, order_status: 'cart' },
            relations: ['tickets'],
        })

        if (!order) {
            throw new Error('Order not found or not in cart status');
        }

        const ticket = await this.ticketRepository.create({
            event_id: eventId,
            price,
            order_id: orderId,
        });

        await this.ticketRepository.save(ticket);

        const updatedOrder = await this.orderRepository.findOne({ where: { id: orderId }, relations: ['tickets'] });

        if (!updatedOrder) {
            throw new Error('Order not found after adding ticket');
        }

        return updatedOrder;
    }

    async removeTicketFromOrder(orderId: number, ticketId: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, order_status: 'cart' },
            relations: ['tickets'],
        });

        if (!order) {
            throw new Error('Order not found or not in cart status');
        }

        const ticket = await this.ticketRepository.findOne({ where: { id: ticketId, order_id: orderId } });

        if (!ticket) {
            throw new Error('Ticket not found in the order');
        }

        await this.ticketRepository.remove(ticket);

        const updatedOrder = await this.orderRepository.findOne({ where: { id: orderId }, relations: ['tickets'] });

        if (!updatedOrder) {
            throw new Error('Order not found after removing ticket');
        }

        return updatedOrder;
    }

    async delete(orderId: number): Promise<void> {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });

        if (!order) {
            throw new Error('Order not found');
        }

        await this.orderRepository.delete(orderId);
    }

    async checkout(orderId: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, order_status: 'cart' },
            relations: ['tickets'],
        });

        if (!order) {
            throw new Error('Order not found or not in cart status');
        }

        order.order_status = 'created';
        return this.orderRepository.save(order);
    }

    async requestRefund(orderId: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, order_status: 'created' },
            relations: ['tickets'],
        });

        if (!order) {
            throw new NotFoundException('Order not found or not in created status');
        }

        const now = new Date();
        const timeDiff = (now.getTime() - new Date(order.created_at).getTime()) / 1000 / 60; // minute difference
        if (timeDiff > 20) {
        throw new BadRequestException('Refund window has expired (20 minutes after payment)');
        }

        order.order_status = 'refund_pending';
        return this.orderRepository.save(order);    
    }

    async updateOrderStatus(orderId: number, status: string): Promise<Order> {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        order.order_status = status;
        return this.orderRepository.save(order);
    }

    async findOne(id: number): Promise<Order> {
        const order = await this.orderRepository.findOne({ where: { id }, relations: ['tickets'] });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    async findAll(): Promise<Order[]> {
        const orders = await this.orderRepository.find({ relations: ['tickets'] });
        if (!orders || orders.length === 0) {
            throw new NotFoundException('No orders found');
        }
        return orders;
    }

    async findCurrentCart(userId: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { user_id: userId, order_status: 'cart' },
            relations: ['tickets'],
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }
}