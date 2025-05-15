import { Order, Ticket, REFUND_WINDOW_MINUTES, OrderProperties } from './order.models';

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
    const baseOrderProps: Omit<OrderProperties, 'created_at'> = {
      id: 1,
      user_id: 'user-123',
      order_status: 'CREATED', 
      tickets: [],
    };

    it('should create an order instance', () => {
      const ticket1 = new Ticket({ id: 1, order_id: 1 });
      const orderData: OrderProperties = {
        ...baseOrderProps,
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
      it('should return true if order was created just now', () => {
        const order = new Order({ ...baseOrderProps, created_at: new Date() });
        expect(order.canRequestRefund()).toBe(true);
      });

      it(`should return true if order was created ${REFUND_WINDOW_MINUTES - 1} minutes ago`, () => {
        const createdAt = new Date();
        createdAt.setMinutes(createdAt.getMinutes() - (REFUND_WINDOW_MINUTES - 1));
        const order = new Order({ ...baseOrderProps, created_at: createdAt });
        expect(order.canRequestRefund()).toBe(true);
      });
      
      it(`should return true if order was created just inside the ${REFUND_WINDOW_MINUTES} minute window (e.g., ${REFUND_WINDOW_MINUTES * 60 - 1} seconds ago)`, () => {
        const createdAt = new Date(Date.now() - (REFUND_WINDOW_MINUTES * 60 * 1000) + 1000); // 1 second less than REFUND_WINDOW_MINUTES ago
        const order = new Order({ ...baseOrderProps, created_at: createdAt });
        expect(order.canRequestRefund()).toBe(true);
      });

      it(`should return false if order was created exactly ${REFUND_WINDOW_MINUTES} minutes ago (at the edge of the window)`, () => {
        // The logic is `this.created_at > refundCutoffTime`.
        // If created_at IS refundCutoffTime, it's not strictly greater, so it should be false.
        const createdAt = new Date(Date.now() - REFUND_WINDOW_MINUTES * 60 * 1000);
        const order = new Order({ ...baseOrderProps, created_at: createdAt });
        expect(order.canRequestRefund()).toBe(false);
      });

      it(`should return false if order was created just outside the ${REFUND_WINDOW_MINUTES} minute window (e.g., ${REFUND_WINDOW_MINUTES * 60 + 1} seconds ago)`, () => {
        const createdAt = new Date(Date.now() - (REFUND_WINDOW_MINUTES * 60 * 1000) - 1000); // 1 second more than REFUND_WINDOW_MINUTES ago
        const order = new Order({ ...baseOrderProps, created_at: createdAt });
        expect(order.canRequestRefund()).toBe(false);
      });

      it(`should return false if order was created ${REFUND_WINDOW_MINUTES + 1} minutes ago`, () => {
        const createdAt = new Date();
        createdAt.setMinutes(createdAt.getMinutes() - (REFUND_WINDOW_MINUTES + 1));
        const order = new Order({ ...baseOrderProps, created_at: createdAt });
        expect(order.canRequestRefund()).toBe(false);
      });

      it('should return false if created_at is null (simulated, if possible)', () => {
        // This test depends on how OrderProperties and Order constructor handle potentially null created_at
        // Based on current OrderProperties, created_at is non-nullable.
        // If it could be null due to data issues:
        const orderWithNullDate = new Order({ ...baseOrderProps, created_at: null as any });
        expect(orderWithNullDate.canRequestRefund()).toBe(false);
      });
    });
  });
});
