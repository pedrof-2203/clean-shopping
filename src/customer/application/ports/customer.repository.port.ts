import { Customer } from '../../domain/entities/customer.entity';
import { CustomerId } from '../../domain/value-objects/customer-id.vo';
import { Email } from '../../domain/value-objects/email.vo';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export interface CustomerRepositoryPort {
  save(customer: Customer): Promise<void>;
  findById(id: CustomerId): Promise<Customer | null>;
  findByEmail(email: Email): Promise<Customer | null>;
  findAll(): Promise<Customer[]>;
  delete(id: CustomerId): Promise<void>;
}
