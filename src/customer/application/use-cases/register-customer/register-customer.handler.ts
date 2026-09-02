import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  RegisterCustomerCommand,
} from './register-customer.command';
import { Inject } from '@nestjs/common';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
} from '../../ports/customer.repository.port';
import { Email } from '../../../domain/value-objects/email.vo';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from '../../../../shared/domain/exceptions/application.exception';
import { Customer } from '../../../domain/entities/customer.entity';

@CommandHandler(RegisterCustomerCommand)
export class RegisterCustomerHandler implements ICommandHandler<
  RegisterCustomerCommand,
  void
> {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(command: RegisterCustomerCommand): Promise<void> {
    const email = Email.create(command.email);

    const existing = await this.customerRepository.findByEmail(email);
    if (existing) {
      throw new ApplicationException(
        `Email ${email.getValue()} is already in use.`,
        ApplicationExceptionCode.CONFLICT,
      );
    }

    const customer = Customer.register(
      email,
      command.firstName,
      command.lastName,
      command.phone,
    );

    await this.customerRepository.save(customer);
  }
}
