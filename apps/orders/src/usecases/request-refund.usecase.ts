import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrdersRepository } from "../adapters/repositories/orders.repository";
import { Order } from "../entitites/order.entity";

@Injectable()
export class RequestRefundUseCase {
    constructor(
        private readonly ordersRepository: OrdersRepository
    ) {}

    async execute(orderId: number, userId: number): Promise<Order> {
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
}
