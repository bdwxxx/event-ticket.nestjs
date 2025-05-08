import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

interface TokenResponse {
  status: boolean;
  access_token?: string;
  merchant?: {
    id: string;
    name: string;
  };
}

@Injectable()
export class JwtPaymentAdapter implements OnModuleInit {
  private readonly logger = new Logger(JwtPaymentAdapter.name);
  private readonly apiUrl: string;
  private readonly merchantId: string;
  private readonly merchantKey: string;
  private jwtToken: string;
  private tokenExpiryTime: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.getOrThrow<string>("PAYMENT_GATEWAY_URL");
    this.merchantId = this.configService.getOrThrow<string>("PAYMENT_GATEWAY_MERCHANT_ID");
    this.merchantKey = this.configService.getOrThrow<string>("PAYMENT_GATEWAY_MERCHANT_KEY");
    
    if (!this.apiUrl) {
      this.logger.error("PAYMENT_GATEWAY_URL is not defined in the environment variables");
    }
  }

  async onModuleInit() {
    try {
      await this.initializeToken();
    } catch (error) {
      this.logger.error(`Error during module initialization: ${error.message}`);
      throw error; 
    }
  }

  private async initializeToken(): Promise<void> {
    const tokenResponse = await this.getJwtToken(this.merchantId, this.merchantKey);
    
    if (!tokenResponse.status || !tokenResponse.access_token) {
      this.logger.error("Failed to get JWT token during initialization");
      throw new Error("Failed to get JWT token");
    }
    
    this.jwtToken = tokenResponse.access_token;
    this.tokenExpiryTime = Date.now() + (3600 * 1000); // 1 hour
    this.logger.log("JWT token successfully initialized");
  }

  async getJwtToken(merchantId: string, merchantKey: string): Promise<TokenResponse> {
    if (!merchantId || !merchantKey) {
      this.logger.error("Merchant ID or Merchant Key is not defined");
      return { status: false };
    }
    
    try {
      const response = await firstValueFrom(
        this.httpService.post("/auth/login", {
          merchantId: merchantId,
          merchantKey: merchantKey,
        }, {
          baseURL: this.apiUrl,
          headers: {
            "Content-Type": "application/json",
          },
        })
      );

      if (response.status !== 200) {
        this.logger.error("Failed to get JWT token: Invalid response");
        return { status: false };
      }

      this.logger.log("Successfully retrieved JWT token");
      return { status: true, access_token: response.data.access_token };
    } catch (error) {
      this.logger.error(`JWT token retrieval failed: ${error.message}`, error.stack);
      return { status: false }; 
    }
  }

  async ensureValidToken(): Promise<string> {
    if (!this.jwtToken || Date.now() > (this.tokenExpiryTime - 5 * 60 * 1000)) {
      await this.initializeToken();
    }
    return this.jwtToken;
  }
}