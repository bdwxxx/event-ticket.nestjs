import { registerAs } from '@nestjs/config';
import { get } from 'env-var';

export const dbConfig = registerAs('database', () => ({
	host: get('POSTGRES_HOST').required().asString(),
	port: get('POSTGRES_PORT').required().asPortNumber(),
	user: get('POSTGRES_USER').required().asString(),
	password: get('POSTGRES_PASSWORD').required().asString(),
	database: get('POSTGRES_DB').required().asString(),
}));

export const paymentConifg = registerAs('payments', () => ({
    url: get('PAYMENT_GATEWAY_URL').required().asUrlString(),
    wsUrl: get('PAYMENT_GATEWAY_WS_URL').required().asString(),
    merchantId: get('PAYMENT_GATEWAY_MERCHANT_ID').required().asString(),
    merchantKey: get('PAYMENT_GATEWAY_MERCHANT_KEY').required().asString(),
}));