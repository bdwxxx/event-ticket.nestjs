export interface PaymentUpdatePayload {
  type: 'PAYMENT_UPDATE';
  paymentId: string;
  status: 'PROCESSING' | 'SUCCESSFUL' | 'FAILED';
  errorReason?: 'NONE' | 'INSUFFICIENT_BALANCE' | 'INCORRECT_CARD_DETAILS' | 'CARD_EXPIRED';
}