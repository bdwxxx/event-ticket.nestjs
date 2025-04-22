import { Body, Controller, Delete, Get, Head, Headers, Param, Post, Put } from '@nestjs/common';
import { OrdersRepository } from 'src/adapters/repositories/orders.repository';


@Controller('order')
export class OrdersController {
  constructor(
    private readonly ordersRepository: OrdersRepository,
  ) {}

  @Post()
  async createOrder(@Headers('X_USER_ID') userId: number) {
    return this.ordersRepository.create(userId);
  }

  @Put()
  async updateOrder(
    @Body('orderId') orderId: number,
    @Body('eventId') eventId: number,
    @Body('price') price: number,
  ) {
    return this.ordersRepository.addTicketToOrder(orderId, eventId, price);
  }

  @Delete(':id')
  async deleteOrder(@Param('id') id: number) {
    return this.ordersRepository.delete(id);
  }

  @Get(':id')
  async getOrder(@Param('id') id: number) {
    return this.ordersRepository.findOne(id);
  }

  @Get()
  async getAllOrders() {
    return this.ordersRepository.findAll();
  }

  @Get('current')
  async getCurrentOrder(@Headers('X_USER_ID') userId: number) {
    return this.ordersRepository.findCurrentCart(userId);
  }  

  @Post(':id/checkout')
  async checkoutOrder(
    @Param('id') orderId: number,
    @Headers('X_USER_ID') userId: number
    ) {
    return this.ordersRepository.checkout(orderId);
  }

  @Post(':id/refund')
  async requestRefund(
    @Param('id') orderId: number,
    @Headers('X_USER_ID') userId: number
    ) {
    return this.ordersRepository.requestRefund(orderId);
  }

  @Delete(':id/ticket/:ticketId')
  async removeTicketFromOrder(
    @Param('id') orderId: number,
    @Param('ticketId') ticketId: number,
  ) {
    return this.ordersRepository.removeTicketFromOrder(orderId, ticketId);
  }

}
