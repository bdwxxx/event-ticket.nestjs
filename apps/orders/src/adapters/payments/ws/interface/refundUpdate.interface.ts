export interface RefundUpdatePayload {
    type: 'REFUND_UPDATE';
    refundId: string;
    paymentId: string;
    status: 'PROCESSING' | 'SUCCESSFUL' | 'FAILED';
}