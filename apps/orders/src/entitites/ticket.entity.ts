import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity({
  name: 'ticket',
})
export class Ticket {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    event_id: number;

    @Column()
    price: number;

    @Column()
    order_id: number;

    @ManyToOne(() => Order, (order) => order.tickets)
    @JoinColumn({ name: 'order_id' })
    order: Order;

}
