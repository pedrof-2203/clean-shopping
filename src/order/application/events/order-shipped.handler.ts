import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderShippedEvent } from '../../domain/events/order-shipped.event';
import { Inject } from '@nestjs/common';
import {
  NOTIFICATION_SERVICE,
  NotificationPort,
} from '../../../customer/application/ports/notification.port';

@EventsHandler(OrderShippedEvent)
export class OrderShippedHandler implements IEventHandler<OrderShippedEvent> {
  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationPort,
  ) {}

  async handle(event: OrderShippedEvent) {
    await this.notificationService.sendNotification({
      recipientId: event.customerId,
      subject: 'Order shipped',
      message: `Your Clean Shopping order ${event.orderId} has been shipped. Yor tracking number is ${event.trackingNumber}`,
    });
  }
}
