import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Ticket } from "./ticket.entity";

@Entity({
    name: 'order',
})
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: ['cart', 'created', 'done', 'refund_pending', 'refunded'],
        default: 'cart',
    })
    order_status: string;

    @Column()
    user_id: number;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => Ticket, (ticket) => ticket.order)
    tickets: Ticket[];
}