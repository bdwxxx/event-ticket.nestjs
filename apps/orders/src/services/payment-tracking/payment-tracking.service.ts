import { Injectable, Logger } from '@nestjs/common';
import { wsPaymentsAdapter } from '../../adapters/payments/ws/wsPayments.adapter';

@Injectable()
export class PaymentTrackingService {
  private readonly logger = new Logger(PaymentTrackingService.name);
  private paymentPromises: Map<string, { 
    resolve: () => void, 
    reject: (error: Error) => void,
    timeoutId: NodeJS.Timeout
  }> = new Map();

  constructor(private readonly wsPaymentsAdapter: wsPaymentsAdapter) {
    // Подписываемся на события обновления платежей сразу при создании сервиса
    this.wsPaymentsAdapter.eventEmitter.on('payment.updated', this.handlePaymentUpdate.bind(this));
  }

  /**
   * Начинает отслеживание платежа и возвращает промис, который 
   * разрешается при успешной оплате или отклоняется при ошибке
   */
  async trackPayment(paymentId: string, timeoutMs: number = 120000): Promise<void> {
    this.logger.log(`Starting to track payment ${paymentId}`);
    
    // Начинаем отслеживать платеж через WebSocket
    this.wsPaymentsAdapter.startTracking(paymentId);
    
    return new Promise<void>((resolve, reject) => {
      // Устанавливаем таймаут для ожидания подтверждения платежа
      const timeoutId = setTimeout(() => {
        this.cleanupPaymentTracking(paymentId);
        reject(new Error('Payment confirmation timeout'));
      }, timeoutMs);
      
      // Сохраняем resolve и reject функции для использования при получении обновления
      this.paymentPromises.set(paymentId, { resolve, reject, timeoutId });
    });
  }

  /**
   * Останавливает отслеживание платежа и очищает ресурсы
   */
  stopTracking(paymentId: string): void {
    this.cleanupPaymentTracking(paymentId);
  }

  /**
   * Обработчик события обновления платежа
   */
  private handlePaymentUpdate(data: any): void {
    this.logger.debug(`Payment update received: ${JSON.stringify(data)}`);
    
    if (!data || !('paymentId' in data)) {
      this.logger.warn('Received payment update with invalid structure');
      return;
    }
    
    const paymentId = data.paymentId;
    const status = (data.status || '').toUpperCase();
    
    const paymentPromise = this.paymentPromises.get(paymentId);
    if (!paymentPromise) {
      this.logger.debug(`Received update for untracked payment: ${paymentId}`);
      return;
    }
    
    if (status === 'SUCCESSFUL') {
      this.logger.log(`Payment ${paymentId} confirmed successfully`);
      clearTimeout(paymentPromise.timeoutId);
      paymentPromise.resolve();
      this.cleanupPaymentTracking(paymentId);
    } else if (status === 'FAILED') {
      this.logger.warn(`Payment ${paymentId} failed: ${data.errorReason || 'Unknown error'}`);
      clearTimeout(paymentPromise.timeoutId);
      paymentPromise.reject(new Error(`Payment failed: ${data.errorReason || 'Unknown error'}`));
      this.cleanupPaymentTracking(paymentId);
    }
  }

  /**
   * Очищает ресурсы, связанные с отслеживанием платежа
   */
  private cleanupPaymentTracking(paymentId: string): void {
    const paymentPromise = this.paymentPromises.get(paymentId);
    if (paymentPromise) {
      clearTimeout(paymentPromise.timeoutId);
      this.paymentPromises.delete(paymentId);
    }
    
    this.wsPaymentsAdapter.stopTracking(paymentId);
  }
}