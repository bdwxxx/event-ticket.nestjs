import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrdersRepository } from "../adapters/repositories/orders.repository";
import { Order } from "../entitites/order.entity";

@Injectable()
export class OrdersService {
    constructor(
        private readonly ordersRepository: OrdersRepository
    ) {}

    async createOrder(userId: number): Promise<Order> {
        return this.ordersRepository.create(userId);
    }

    async getOrder(orderId: number, userId: number): Promise<Order> {
        return this.ordersRepository.findOne(orderId, userId);
    }

    async updateOrder(orderId: number, eventId: number, price: number): Promise<Order> {
        return this.ordersRepository.addTicketToOrder(orderId, eventId, price);
    }

    async deleteOrder(orderId: number, userId: number): Promise<void> {
        const orderExists = await this.ordersRepository.findOne(orderId, userId);

        if (!orderExists) {
            throw new NotFoundException('Order not found');
        }

        return this.ordersRepository.delete(orderId, userId);
    }

    async getAllOrders(userId: number): Promise<Order[]> {
        return this.ordersRepository.findAll(userId);
    }

    async getCurrentOrder(userId: number): Promise<Order> {
        return this.ordersRepository.findCurrentCart(userId);
    }

    async checkoutOrder(orderId: number): Promise<Order> {
        return this.ordersRepository.checkout(orderId);
    }

    async requestRefund(orderId: number, userId: number): Promise<Order> {
        const order = await this.ordersRepository.findOne(orderId, userId);

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const now = new Date();
        const timeDiff = (now.getTime() - new Date(order.created_at).getTime()) / 1000 / 60; // minute difference
        if (timeDiff > 20) {
            throw new BadRequestException('Refund window has expired (20 minutes after payment)');
        }

        return this.ordersRepository.requestRefund(orderId);
    }

    async removeTicketFromOrder(orderId: number, ticketId: number): Promise<Order> {
        return this.ordersRepository.removeTicketFromOrder(orderId, ticketId);
    }
}
