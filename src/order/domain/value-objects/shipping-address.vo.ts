import { DomainException } from '../../../shared/domain/exceptions/domain.exception';

interface ShippingAddressProps {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export class ShippingAddress {
  private readonly _street: string;
  private readonly _city: string;
  private readonly _state: string;
  private readonly _zipCode: string;
  private readonly _country: string;

  private constructor(props: ShippingAddressProps) {
    this._street = props.street;
    this._city = props.city;
    this._state = props.state;
    this._zipCode = props.zipCode;
    this._country = props.country;
  }

  static create(props: ShippingAddressProps): ShippingAddress {
    if (!props.street || props.street.trim().length === 0) {
      throw new DomainException('Street is required for shipping address.');
    }

    if (!props.city || props.city.trim().length === 0) {
      throw new DomainException('City is required for shipping address.');
    }

    if (!props.state || props.state.trim().length === 0) {
      throw new DomainException('State is required for shipping address.');
    }

    if (!props.zipCode || props.zipCode.trim().length === 0) {
      throw new DomainException('Zip code is required for shipping address.');
    }

    if (!props.country || props.country.trim().length !== 2) {
      throw new DomainException('Country must be a valid 2-letter ISO code.');
    }

    return new ShippingAddress({
      street: props.street.trim(),
      city: props.city.trim(),
      state: props.state.trim(),
      zipCode: props.zipCode.trim(),
      country: props.country.trim(),
    });
  }

  get street(): string {
    return this._street;
  }

  get city(): string {
    return this._city;
  }

  get state(): string {
    return this._state;
  }

  get zipCode(): string {
    return this._zipCode;
  }

  get country(): string {
    return this._country;
  }

  equals(other: ShippingAddress): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.state === other.state &&
      this.zipCode === other.zipCode &&
      this.country === other.country
    );
  }
}
