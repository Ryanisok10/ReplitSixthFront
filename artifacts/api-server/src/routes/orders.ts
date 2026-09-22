import { Router, type IRouter, type Request } from "express";
import { CreateOrderBody, CreateOrderResponse, GetOrderResponse } from "@workspace/api-zod";
import {
  createOrderTransaction,
  getOrderTransaction,
} from "../lib/order-service";

const router: IRouter = Router();

const validationErrors = (issues: { path: PropertyKey[]; message: string }[]) =>
  issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn(
      { validationErrors: validationErrors(parsed.error.issues) },
      "Invalid order creation request",
    );
    res.status(400).json({ error: "Please check the highlighted fields." });
    return;
  }

  try {
    const { transaction, paymentIntent } = await createOrderTransaction({
      merchantId: parsed.data.merchantId,
      orderTotalCents: parsed.data.orderTotalCents,
      serviceType: parsed.data.serviceType,
      currency: parsed.data.currency,
    });

    req.log.info(
      {
        orderId: transaction.id,
        merchantId: transaction.merchantId,
        paymentIntentId: paymentIntent.id,
      },
      "Order transaction created",
    );

    res.status(201).json(
      CreateOrderResponse.parse({
        transaction,
        clientSecret: paymentIntent.client_secret,
      }),
    );
  } catch (error) {
    if (error instanceof Error) {
      req.log.error({ err: error }, "Failed to create order transaction");
      if (
        error.message.includes("not found") ||
        error.message.includes("does not have")
      ) {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    throw error;
  }
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const { id } = req.params;

  try {
    const transaction = await getOrderTransaction(id);
    if (!transaction) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    req.log.info({ orderId: id }, "Order retrieved");
    res.json(GetOrderResponse.parse(transaction));
  } catch (error) {
    req.log.error({ err: error }, "Failed to retrieve order");
    throw error;
  }
});

export default router;
