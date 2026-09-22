import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, orderTransactionsTable } from "@workspace/db";
import {
  createOrderTransaction,
  getOrderTransaction,
  getOrderTransactionByPaymentIntentId,
  listOrderTransactions,
} from "../lib/order-service";

const router: IRouter = Router();

// Create a new order transaction (creates PaymentIntent on connected account)
router.post("/orders", async (req, res): Promise<void> => {
  try {
    const { merchantId, orderTotalCents, serviceType, currency } = req.body;

    if (!merchantId) {
      res.status(400).json({ error: "Missing required field: merchantId" });
      return;
    }
    if (orderTotalCents === undefined || orderTotalCents === null) {
      res.status(400).json({ error: "Missing required field: orderTotalCents" });
      return;
    }
    if (!serviceType) {
      res.status(400).json({ error: "Missing required field: serviceType" });
      return;
    }

    const orderTotalCentsNum = Number(orderTotalCents);
    if (isNaN(orderTotalCentsNum) || orderTotalCentsNum <= 0) {
      res.status(400).json({ error: "orderTotalCents must be a positive integer" });
      return;
    }

    const result = await createOrderTransaction({
      merchantId,
      orderTotalCents: orderTotalCentsNum,
      serviceType,
      currency: currency || "usd",
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to create order transaction",
    });
  }
});

// Retrieve an order transaction by its ID
router.get("/orders/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing transaction ID" });
      return;
    }

    const transaction = await getOrderTransaction(id);
    if (!transaction) {
      res.status(404).json({ error: "Order transaction not found" });
      return;
    }

    res.json(transaction);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to retrieve order transaction",
    });
  }
});

// Retrieve an order transaction by Stripe PaymentIntent ID
router.get("/orders/payment-intent/:paymentIntentId", async (req, res): Promise<void> => {
  try {
    const { paymentIntentId } = req.params;
    if (!paymentIntentId) {
      res.status(400).json({ error: "Missing Stripe PaymentIntent ID" });
      return;
    }

    const transaction = await getOrderTransactionByPaymentIntentId(paymentIntentId);
    if (!transaction) {
      res.status(404).json({ error: "Order transaction not found by PaymentIntent ID" });
      return;
    }

    res.json(transaction);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to retrieve order transaction",
    });
  }
});

// List order transactions for a merchant
router.get("/orders/merchant/:merchantId", async (req, res): Promise<void> => {
  try {
    const { merchantId } = req.params;
    if (!merchantId) {
      res.status(400).json({ error: "Missing merchant ID" });
      return;
    }

    const transactions = await listOrderTransactions(merchantId);
    res.json(transactions);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to list order transactions",
    });
  }
});

// Simulate paying an order transaction (for testing/mockup flow)
router.post("/orders/:id/pay", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing transaction ID" });
      return;
    }

    const [updated] = await db
      .update(orderTransactionsTable)
      .set({
        status: "paid",
        stripeStatus: "succeeded",
        updatedAt: new Date(),
      })
      .where(eq(orderTransactionsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Order transaction not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to pay order transaction",
    });
  }
});

// Simulate canceling an order transaction
router.post("/orders/:id/cancel", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing transaction ID" });
      return;
    }

    const [updated] = await db
      .update(orderTransactionsTable)
      .set({
        status: "canceled",
        stripeStatus: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(orderTransactionsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Order transaction not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to cancel order transaction",
    });
  }
});

export default router;
