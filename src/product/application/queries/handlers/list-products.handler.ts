import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListProductsQuery } from '../list-products.query';
import { Inject } from '@nestjs/common';
import {
  PRODUCT_REPOSITORY,
  ProductRepositoryPort,
} from '../../ports/product.repository.port';
import { Product } from '../../../domain/entities/product.entity';

@QueryHandler(ListProductsQuery)
export class ListProductsHandler implements IQueryHandler<
  ListProductsQuery,
  Product[]
> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(query: ListProductsQuery): Promise<Product[]> {
    return this.productRepository.findAll({
      isActive: query.isActive,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
    });
  }
}
