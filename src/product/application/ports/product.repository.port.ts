import { ProductId } from '../../domain/value-objects/product-id.vo';
import { Product } from '../../domain/entities/product.entity';
import { Sku } from '../../domain/value-objects/sku.vo';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductFilters {
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductRepository {
  save(product: Product): Promise<void>;
  findById(product: ProductId): Promise<Product | null>;
  findBySku(sku: Sku): Promise<Product | null>;
  findByName(name: string): Promise<Product | null>;
  findAll(filters: ProductFilters): Promise<Product[]>;
}
