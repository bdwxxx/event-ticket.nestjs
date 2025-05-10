import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentUpdatePayload } from './interface/paymentUpdate.interface';
import { RefundUpdatePayload } from './interface/refundUpdate.interface';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtPaymentAdapter } from '../facades/jwtPayment.facades';
import * as WebSocket from 'ws';

type PaymentSystemMessage = PaymentUpdatePayload | RefundUpdatePayload;

@Injectable()
export class wsPaymentsAdapter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(wsPaymentsAdapter.name);
  private connections: Map<string, WebSocket> = new Map();
  public eventEmitter = new EventEmitter2();
  private readonly wsUrl: string;
  private readonly reconnectInterval = 5000;
  private token: string;
  private globalWsConnection: WebSocket;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtPaymentAdapter: JwtPaymentAdapter,
  ) {
    this.wsUrl = this.configService.getOrThrow<string>(
      'PAYMENT_GATEWAY_WS_URL',
    );
    if (!this.wsUrl) {
      this.logger.error(
        'PAYMENT_GATEWAY_WS_URL is not defined in the environment variables',
      );
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('WebSocket Payments Adapter initialized');
    this.token = await this.jwtPaymentAdapter.ensureValidToken();

    await this.globalConnection();
  }

  private async globalConnection(): Promise<void> {
    const url = `${this.wsUrl}?token=${this.token}`;
    this.logger.log(`Establishing global WebSocket connection to ${url}...`);

    this.globalWsConnection = new WebSocket(url);

    return new Promise<void>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000); // 10-секундный таймаут на соединение

      this.globalWsConnection.on('open', () => {
        this.logger.log('Global WebSocket connection established successfully');
        clearTimeout(connectionTimeout);
        resolve();
      });

      this.globalWsConnection.on('message', (data: WebSocket.Data) => {
        try {
          const rawMessage = JSON.parse(data.toString());
          this.logger.debug(
            `Received global message: ${JSON.stringify(rawMessage)}`,
          );

          // Обработка сообщения
          if (rawMessage && rawMessage.merchantId) {
            this.handleMessage(rawMessage.merchantId, rawMessage);
          } else {
            // Если в сообщении нет merchantId, пробуем использовать id платежа
            // для определения, к какому мерчанту относится событие
            if (rawMessage.data?.paymentId || rawMessage.paymentId) {
              const paymentId = rawMessage.data?.paymentId || rawMessage.paymentId;
              this.logger.debug(`Processing payment update for payment ID: ${paymentId}`);
              this.handleMessage('global', rawMessage);
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to parse global message: ${data.toString()}`,
            error,
          );
        }
      });

      this.globalWsConnection.on('error', (error: Error) => {
        this.logger.error(
          `Global WebSocket error: ${error.message}`,
          error.stack,
        );
        if (!this.globalWsConnection || this.globalWsConnection.readyState !== WebSocket.OPEN) {
          clearTimeout(connectionTimeout);
          reject(error);
        }
      });

      this.globalWsConnection.on('close', (code: number, reason: Buffer) => {
        this.logger.warn(
          `Global WebSocket connection closed. Code: ${code}, Reason: ${reason.toString()}`,
        );
        
        // Переподключаемся через интервал
        setTimeout(() => {
          this.logger.log('Attempting to reconnect global WebSocket...');
          this.globalConnection().catch(error => {
            this.logger.error('Failed to reconnect global WebSocket', error);
          });
        }, this.reconnectInterval);
      });
    });
  }

  onModuleDestroy() {
    this.logger.log('Closing all WebSocket connections...');
    
    // Закрываем индивидуальные соединения
    this.connections.forEach((ws, merchantId) => {
      this.logger.log(`Closing connection for merchant ${merchantId}`);
      ws.removeAllListeners();
      ws.close();
    });
    this.connections.clear();
    
    // Закрываем глобальное соединение
    if (this.globalWsConnection) {
      this.logger.log('Closing global WebSocket connection');
      this.globalWsConnection.removeAllListeners();
      this.globalWsConnection.close();
    }
  }

  startTracking(merchantId: string): void {
    if (this.connections.has(merchantId)) {
      this.logger.log(`Already tracking merchant ${merchantId}`);
      const ws = this.connections.get(merchantId);
      if (ws?.readyState === WebSocket.OPEN) {
        return;
      }
      if (
        ws?.readyState === WebSocket.CLOSED ||
        ws?.readyState === WebSocket.CLOSING
      ) {
        this.logger.log(
          `Connection for ${merchantId} found closed, will attempt reconnect.`,
        );
        return;
      }
      if (ws?.readyState === WebSocket.CONNECTING) {
        this.logger.log(`Connection for ${merchantId} already in progress.`);
        return;
      }
    }

    this.logger.log(`Starting to track payments for merchant ${merchantId}`);
    this.connect(merchantId);
  }

  private connect(merchantId: string): void {
    const url = `${this.wsUrl}?token=${this.token}`;
    this.logger.debug(`Connecting to ${url}...`);

    const ws = new WebSocket(url);
    this.connections.set(merchantId, ws);

    ws.on('open', () => {
      this.logger.log(`WebSocket connection opened for merchant ${merchantId}`);
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        this.logger.debug(
          `Received message for ${merchantId}: ${JSON.stringify(rawMessage)}`,
        );

        // Обрабатываем сообщение с учетом его структуры
        this.handleMessage(merchantId, rawMessage);
      } catch (error) {
        this.logger.error(
          `Failed to parse message for ${merchantId}: ${data.toString()}`,
          error,
        );
      }
    });

    ws.on('error', (error: Error) => {
      this.logger.error(
        `WebSocket error for merchant ${merchantId}: ${error.message}`,
        error.stack,
      );
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.logger.warn(
        `WebSocket connection closed for merchant ${merchantId}. Code: ${code}, Reason: ${reason.toString()}`,
      );
      this.connections.delete(merchantId);

      setTimeout(() => {
        try {
          this.connect(merchantId);
        } catch (error) {
          this.logger.error(
            `Failed to reconnect for merchant ${merchantId}`,
            error,
          );
        }
      }, this.reconnectInterval);
    });
  }

  stopTracking(merchantId: string): void {
    const ws = this.connections.get(merchantId);
    if (ws) {
      this.logger.log(`Stopping tracking for merchant ${merchantId}`);
      ws.removeAllListeners();
      ws.close();
      this.connections.delete(merchantId);
    }
  }

  private handleMessage(merchantId: string, rawMessage: any): void {
    // Проверяем, есть ли поле event
    if (rawMessage.event) {
      switch (rawMessage.event) {
        case 'payment_update':
          if (rawMessage.data && rawMessage.data.type === 'PAYMENT_UPDATE') {
            this.logger.log(
              `Payment ${rawMessage.data.paymentId} for ${merchantId} is now ${rawMessage.data.status}`,
            );

            // Эмитируем событие с исправленными данными для упрощения обработки
            const paymentData = {
              paymentId: rawMessage.data.paymentId,
              status: rawMessage.data.status.toUpperCase(),
              errorReason: rawMessage.data.errorReason || 'none',
              type: rawMessage.data.type,
            };

            this.logger.debug(
              `Emitting payment.updated event with data: ${JSON.stringify(paymentData)}`,
            );
            this.eventEmitter.emit('payment.updated', paymentData);
          }
          break;
        case 'refund_update':
          if (rawMessage.data && rawMessage.data.type === 'REFUND_UPDATE') {
            this.logger.log(
              `Refund ${rawMessage.data.refundId} (Payment ${rawMessage.data.paymentId}) for ${merchantId} is now ${rawMessage.data.status}`,
            );
            // Нормализуем статус к верхнему регистру
            const status = rawMessage.data.status.toUpperCase();
            const normalizedData = {
              ...rawMessage.data,
              status,
            };
            this.eventEmitter.emit('refund.updated', {
              merchantId,
              ...normalizedData,
            });
          }
          break;
        case 'connection_established':
          this.logger.log(
            `Connection established for merchant ${merchantId}: ${rawMessage.data?.message || 'No message'}`,
          );
          break;
        default:
          this.logger.warn(
            `Received unknown event type: ${rawMessage.event} for ${merchantId}`,
          );
      }
    } else if (rawMessage.type) {
      // Оставляем старую логику для обратной совместимости
      switch (rawMessage.type) {
        case 'PAYMENT_UPDATE':
          this.logger.log(
            `Payment ${rawMessage.paymentId} for ${merchantId} is now ${rawMessage.status}`,
          );
          this.eventEmitter.emit('payment.updated', {
            merchantId,
            ...rawMessage,
          });
          break;
        case 'REFUND_UPDATE':
          this.logger.log(
            `Refund ${rawMessage.refundId} (Payment ${rawMessage.paymentId}) for ${merchantId} is now ${rawMessage.status}`,
          );
          this.eventEmitter.emit('refund.updated', {
            merchantId,
            ...rawMessage,
          });
          break;
        default:
          this.logger.warn(`Received unknown message type for ${merchantId}`);
      }
    } else {
      this.logger.warn(`Received message in unknown format for ${merchantId}`);
    }
  }
}
