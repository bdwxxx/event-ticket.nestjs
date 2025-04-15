import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order } from "../database/entitites/order.entity";
import { Ticket } from "../database/entitites/ticket.entity";

@Injectable()
export class OrdersRepositoriesService {
    constructor(
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>
    ) {}

    // Get all orders for a specific user
    async getUserOrders(userId: number): Promise<Order[]> {
        return this.orderRepository.find({
            where: { user_id: userId },
            relations: ['tickets']
        });
    }

    // Get order by ID with validation for user ownership
    async getOrderById(orderId: number, userId: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, user_id: userId },
            relations: ['tickets']
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found or does not belong to user`);
        }

        return order;
    }

    // Get current "created" order (cart) for a user
    async getCurrentOrder(userId: number): Promise<Order | null> {
        return this.orderRepository.findOne({
            where: { user_id: userId, order_status: 'created' },
            relations: ['tickets']
        });
    }

    // Create new order with tickets
    async createOrder(userId: number, eventId: number, ticketCount: number, price: number): Promise<Order> {
        const newOrder = this.orderRepository.create({
            user_id: userId,
            order_status: 'created'
        });

        const savedOrder = await this.orderRepository.save(newOrder);

        const tickets: Ticket[] = [];
        for (let i = 0; i < ticketCount; i++) {
            const ticket = this.ticketRepository.create({
                eventId: eventId,
                price: price,
                order_id: savedOrder.id
            });
            tickets.push(await this.ticketRepository.save(ticket));
        }

        savedOrder.tickets = tickets;
        return savedOrder;
    }

    // Update order details
    async updateOrder(orderId: number, userId: number, orderData: Partial<Order>): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, user_id: userId },
            relations: ['tickets']
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found or does not belong to user`);
        }

        Object.assign(order, orderData);
        
        await this.orderRepository.save(order);
        
        return order;
    }

    // Checkout (pay) for an order
    async checkoutOrder(orderId: number, userId: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, user_id: userId, order_status: 'created' },
            relations: ['tickets']
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found, does not belong to user, or is not in 'created' status`);
        }

        order.order_status = 'paid';
        
        await this.orderRepository.save(order);
        
        return order;
    }

    // Delete an order and its tickets
    async deleteOrder(orderId: number, userId: number): Promise<boolean> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, user_id: userId },
            relations: ['tickets']
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found or does not belong to user`);
        }

        if (order.tickets && order.tickets.length > 0) {
            await this.ticketRepository.remove(order.tickets);
        }
        
        await this.orderRepository.remove(order);
        
        return true;
    }

    // Cancel an order (change status to cancelled)
    async cancelOrder(orderId: number, userId: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, user_id: userId, order_status: 'created' },
            relations: ['tickets']
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found, does not belong to user, or cannot be cancelled`);
        }

        order.order_status = 'cancelled';
        
        await this.orderRepository.save(order);
        
        return order;
    }
}