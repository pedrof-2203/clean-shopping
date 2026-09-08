import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderShippedEvent } from '../../domain/events/order-shipped.event';
import { Inject } from '@nestjs/common';
import {
  NOTIFICATION_SERVICE,
  NotificationPort,
} from '../../../customer/application/ports/notification.port';
import { OrderDeliveredEvent } from '../../domain/events/order-delivered.event';

@EventsHandler(OrderDeliveredEvent)
export class OrderDeliveredHandler implements IEventHandler<OrderDeliveredEvent> {
  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationPort,
  ) {}

  async handle(event: OrderDeliveredEvent) {
    await this.notificationService.sendNotification({
      recipientId: event.customerId,
      subject: 'Order delivered',
      message: `Your Clean Shopping order ${event.orderId} has been delivered.`,
    });
  }
}
