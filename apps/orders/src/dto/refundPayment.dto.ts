import { IsNumber, IsString } from "class-validator";

export class RefundPaymentDto {
    @IsString()
    paymentId: string;

    @IsNumber()
    amount: number;
}