import { DomainException } from '../exceptions/domain.exception';

export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {}

  static create(amount: number, currency: string = 'USD'): Money {
    if (amount < 0) {
      throw new DomainException('Amount cannot be negative');
    }
    const normalized = Math.round(amount * 100) / 100;
    return new Money(normalized, currency);
  }

  static zero(currency: string = 'USD'): Money {
    return new Money(0, currency.toUpperCase());
  }

  add(other: Money): Money {
    this.assetSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new DomainException('Multiplication factor cannot be negative.');
    }
    return Money.create(this.amount * factor, this.currency);
  }

  subtract(other: Money): Money {
    this.assetSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new DomainException('Subtraction result cannot be negative.');
    }
    return Money.create(result, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    this.assetSameCurrency(other);
    return this.amount >= other.amount;
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  toCents(): number {
    return Math.round(this.amount * 100);
  }

  private assetSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainException(
        `Currency mismatch: ${this.currency} vs ${other.currency}`,
      );
    }
  }
}
