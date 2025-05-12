import { Order, Ticket } from './order.models';

describe('Domain Models', () => {
  describe('Ticket', () => {
    it('should create a ticket instance', () => {
      const ticketData = { id: 1, order_id: 100 };
      const ticket = new Ticket(ticketData);
      expect(ticket.id).toBe(ticketData.id);
      expect(ticket.order_id).toBe(ticketData.order_id);
    });
  });

  describe('Order', () => {
    it('should create an order instance', () => {
      const ticket1 = new Ticket({ id: 1, order_id: 1 });
      const orderData = {
        id: 1,
        user_id: 'user-123',
        order_status: 'cart',
        created_at: new Date(),
        tickets: [ticket1],
      };
      const order = new Order(orderData);
      expect(order.id).toBe(orderData.id);
      expect(order.user_id).toBe(orderData.user_id);
      expect(order.order_status).toBe(orderData.order_status);
      expect(order.created_at).toEqual(orderData.created_at);
      expect(order.tickets).toEqual([ticket1]);
    });

    describe('canRequestRefund', () => {
      it('should return true if within 20 minutes', () => {
        const createdAt = new Date();
        const order = new Order({ created_at: createdAt });
        expect(order.canRequestRefund()).toBe(true);
      });

      it('should return true if exactly 20 minutes', () => {
        const createdAt = new Date(Date.now() - 20 * 60 * 1000);
        const order = new Order({ created_at: createdAt });
        expect(order.canRequestRefund()).toBe(true);
      });

      it('should return false if after 20 minutes', () => {
        const createdAt = new Date(Date.now() - 21 * 60 * 1000); // 21 minutes ago
        const order = new Order({ created_at: createdAt });
        expect(order.canRequestRefund()).toBe(false);
      });
    });
  });
});
