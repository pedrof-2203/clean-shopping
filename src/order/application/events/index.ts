import { OrderConfirmedHandler } from './order-confirmed.handler';
import { OrderPlacedHandler } from './order-placed.handler';
import { OrderShippedHandler } from './order-shipped.handler';
import { OrderDeliveredHandler } from './order.delivered.handler';

export const EventHandlers = [
  OrderPlacedHandler,
  OrderConfirmedHandler,
  OrderShippedHandler,
  OrderDeliveredHandler,
];
