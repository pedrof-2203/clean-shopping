import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { OrderCancelledEvent } from "../../domain/events/order-cancelled.event";
import { Inject } from "@nestjs/common";
import { NOTIFICATION_SERVICE, NotificationPort } from "../../../customer/application/ports/notification.port";

@EventsHandler(OrderCancelledEvent)
export class OrderCancelledHandler implements IEventHandler<OrderCancelledEvent> {
  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationPort,
  ) {}

  async handle(event: OrderCancelledEvent) {
    await this.notificationService.sendNotification({
      recipientId: event.customerId,
      subject: 'Order cancelled',
      message: `Your Clean Shopping order ${event.orderId} has been cancelled.`,
    });
  }
}
