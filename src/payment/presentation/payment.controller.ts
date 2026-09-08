import { Body, Controller, Post } from '@nestjs/common';
import { CreatePaymentDto } from './dtos/create-payment.dto';

@Controller('payments')
export class PaymentController {
  @Post()
  async createPayment(@Body() dto: CreatePaymentDto): Promise<void> {}
}
