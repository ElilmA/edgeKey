import { createOrder } from "../../../modules/order/service";
import { logger } from "../../../lib/logger";
import type { PaymentProvider } from "../../../modules/payment/types";

export async function onCreateOrder(input: {
  productId: number;
  quantity: number;
  paymentProvider: PaymentProvider;
  paymentChannel?: string;
  contactType: "EMAIL";
  contactValue: string;
  buyerNote?: string;
  discountCode?: string;
}) {
  try {
    return await createOrder(input);
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      event: "createOrder.failed",
      paymentProvider: input.paymentProvider,
      productId: input.productId,
    });
    throw error;
  }
}
