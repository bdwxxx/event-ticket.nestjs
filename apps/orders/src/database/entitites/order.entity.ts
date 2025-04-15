import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Ticket } from "./ticket.entity";

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed',
}

@Entity({
    name: 'order',
})
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING,
    })
    order_status: OrderStatus;

    @Column()
    user_id: number;

    @OneToMany(() => Ticket, (ticket) => ticket.order)
    tickets: Ticket[];
}