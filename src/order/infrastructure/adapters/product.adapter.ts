import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  ProductRepositoryPort,
} from '../../../product/application/ports/product.repository.port';
import { ProductId } from '../../../product/domain/value-objects/product-id.vo';
import { ProductPort } from '../../application/ports/product.port';

@Injectable()
export class ProductAdapter implements ProductPort {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async exists(productId: string): Promise<boolean> {
    const product = await this.productRepository.findById(
      new ProductId(productId),
    );
    return product !== null;
  }
}
