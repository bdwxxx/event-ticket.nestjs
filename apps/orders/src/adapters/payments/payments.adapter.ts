import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { CreatePaymentDto } from "src/dto/createPayment.dto";

@Injectable()
export class PaymentsAdapter {
    private readonly logger = new Logger(PaymentsAdapter.name);;
    private readonly apiUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        const apiUrl = this.configService.getOrThrow<string>('PAYMENT_GATEWAY_URL') || '';
        if (!apiUrl) {
            this.logger.error('PAYMENTS_API_URL is not defined in the environment variables');
            throw new Error('PAYMENTS_API_URL is not defined');
        }
    }

  async createPayment(paymentDto: CreatePaymentDto): Promise<{status: boolean}> {
    try {
      this.logger.log(`Creating payment of ${paymentDto.amount}`);
      
      const response = await firstValueFrom(
        this.httpService.post('/payments', {
          amount: paymentDto.amount,
          cardNumber: paymentDto.cardNumber,
          cardholderName: paymentDto.cardholderName,
          expiryDate: paymentDto.expiryDate,
          cvv: paymentDto.cvv
        }, {
          baseURL: this.apiUrl,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      
        if (response.status !== 200) {
            return { status: false };
        }      
        return { status: true };
    } catch (error) {
      this.logger.error(`Payment creation failed: ${error.message}`, error.stack);
      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

}  

