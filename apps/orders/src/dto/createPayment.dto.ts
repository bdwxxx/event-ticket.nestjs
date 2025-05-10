import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  matches,
  Matches,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  amount: number;

  @IsString()
  @Length(13, 19)
  @Matches(/^[0-9]+$/, {
    message: 'Card number must contain only digits',
  })
  cardNumber: string;

  @IsString()
  @IsNotEmpty()
  cardholderName: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/?([0-9]{4}|[0-9]{2})$/, {
    message: 'Expiration date must be in MM/YY format',
  })
  expiryDate: string;

  @IsString()
  @Length(3, 4)
  @Matches(/^[0-9]+$/, {
    message: 'CVV must be 3 digits',
  })
  cvv: string;
}
