import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RmqService.name);
  protected connection: amqp.Connection | null = null;
  protected channel: amqp.Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.closeConnection();
  }

  async connect(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');
      if (!rabbitmqUrl) {
        throw new Error('RABBITMQ_URL is not defined in the configuration');
      }
      this.logger.log(`Connecting to RabbitMQ at ${rabbitmqUrl}`);
      this.connection = await amqp.connect(rabbitmqUrl);
      if (!this.connection) {
        throw new Error('Failed to establish connection');
      }

      this.channel = await this.connection.createChannel();
      if (!this.channel) {
        throw new Error('Failed to create channel');
      }

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

  async sendToQueue(queue: string, message: any): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      // Add a null check after attempting to connect
      if (!this.channel) {
        throw new Error('Failed to establish RabbitMQ channel');
      }

      // Assert the queue exists
      await this.channel.assertQueue(queue, { durable: true });

      // Send message to queue
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
      });

      this.logger.debug(`Message sent to queue: ${queue}`, message);
    } catch (error) {
      this.logger.error(`Failed to send message to queue: ${queue}`, error);
      throw error;
    }
  }

  async consume(
    queue: string,
    callback: (msg: amqp.ConsumeMessage | null) => void,
  ): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('Failed to establish RabbitMQ channel');
      }

      await this.channel.assertQueue(queue, { durable: true });

      this.channel.consume(queue, (msg) => {
        if (msg) {
          callback(msg);
          this.channel?.ack(msg);
        }
      });

      this.logger.log(`Consuming messages from queue: ${queue}`);
    } catch (error) {
      this.logger.error(
        `Failed to consume messages from queue: ${queue}`,
        error,
      );
      throw error;
    }
  }

  async closeConnection(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection', error);
    }
  }
}
