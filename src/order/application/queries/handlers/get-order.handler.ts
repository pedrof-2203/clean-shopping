import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOrderQuery } from '../get-order.query';
import { Inject } from '@nestjs/common';
import {
  ORDER_REPOSITORY,
  OrderRepositoryPort,
} from '../../ports/order.repository.port';
import { OrderId } from '../../../domain/value-objects/order-id.vo';
import { Order } from '../../../domain/entities/order.entity';
import {
  ApplicationException,
  ApplicationExceptionCode,
} from '../../../../shared/domain/exceptions/application.exception';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery, Order> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  async execute(query: GetOrderQuery): Promise<Order> {
    const order = await this.orderRepository.findById(new OrderId(query.id));

    if (!order) {
      throw new ApplicationException(
        `Order ${query.id} not found.`,
        ApplicationExceptionCode.NOT_FOUND,
      );
    }

    return order; 
  }
}
