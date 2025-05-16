export const REFUND_WINDOW_MINUTES = 20;

export class Ticket {
  id: number;
  order_id: number;
  event_id?: number;
  price?: number;
  refunded?: boolean;

  constructor(props: { id: number; order_id: number; event_id?: number; price?: number; refunded?: boolean }) {
    this.id = props.id;
    this.order_id = props.order_id;
    this.event_id = props.event_id;
    this.price = props.price;
    this.refunded = props.refunded;
  }
}

export interface OrderProperties {
  id?: number;
  user_id?: string;
  order_status?: string;
  created_at: Date;
  tickets?: Ticket[];
}

export class Order {
  public readonly id?: number;
  public readonly user_id?: string;
  public order_status?: string;
  public readonly created_at: Date;
  public tickets: Ticket[];

  constructor(props: OrderProperties) {
    this.id = props.id;
    this.user_id = props.user_id;
    this.order_status = props.order_status;
    this.created_at = props.created_at;
    this.tickets = props.tickets || [];
  }

  canRequestRefund(): boolean {
    if (!this.created_at) {
      return false;
    }
    const now = new Date();
    const refundCutoffTime = new Date(now.getTime() - REFUND_WINDOW_MINUTES * 60 * 1000);
    return this.created_at > refundCutoffTime;
  }
}
