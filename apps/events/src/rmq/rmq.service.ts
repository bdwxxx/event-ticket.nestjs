import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly queue: string = 'my_queue';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect() {
    try {
      const amqpUrl = this.configService.get<string>('RABBITMQ_URL');
      if (!amqpUrl) {
        throw new Error('RABBITMQ_URL is not defined in the configuration');
      }
      this.logger.log(`Connecting to RabbitMQ at ${amqpUrl}`);
      this.connection = await amqp.connect(amqpUrl);
      if (!this.connection) {
        throw new Error('Failed to establish connection');
      }

      this.channel = await this.connection.createChannel();
      if (!this.channel) {
        throw new Error('Failed to create channel');
      }

      await this.channel.assertQueue(this.queue, { durable: true });

      this.connection.on('error', (err) => {
        this.logger.error(`Connection error: ${err.message}`);
        this.reconnect();
      });

      this.connection.on('close', () => {
        this.logger.warn('Connection closed');
        this.reconnect();
      });

      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error(`Failed to connect: ${error.message}`);
      await this.reconnect();
    }
  }

  private async reconnect() {
    this.logger.log('Attempting to reconnect...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await this.connect();
  }

  async sendToQueue(message: any) {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      const msgBuffer = Buffer.from(JSON.stringify(message));
      this.channel.sendToQueue(this.queue, msgBuffer, { persistent: true });
      this.logger.log(
        `Message sent to queue ${this.queue}: ${JSON.stringify(message)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  async consume(callback: (msg: amqp.ConsumeMessage | null) => Promise<void>) {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      await this.channel.consume(
        this.queue,
        async (msg) => {
          if (msg) {
            try {
              await callback(msg);
              this.channel.ack(msg);
            } catch (error) {
              this.logger.error(`Error processing message: ${error.message}`);
              this.channel.nack(msg, false, true);
            }
          }
        },
        { noAck: false },
      );
      this.logger.log(`Started consuming messages from ${this.queue}`);
    } catch (error) {
      this.logger.error(`Failed to consume messages: ${error.message}`);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('RabbitMQ connection closed');
    } catch (error) {
      this.logger.error(`Error closing connection: ${error.message}`);
    }
  }
}
