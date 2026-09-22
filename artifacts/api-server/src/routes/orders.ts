import { Router, type IRouter } from "express";
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

    const { transaction, paymentIntent } = await createOrderTransaction({
      merchantId,
      orderTotalCents: orderTotalCentsNum,
      serviceType,
      currency: currency || "usd",
    });

    res.status(201).json({
      transaction,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order transaction";
    const isMerchantNotReady = message.includes("not ready to accept payments");
    res.status(isMerchantNotReady ? 422 : 400).json({ error: message });
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

// Get Stripe publishable key configuration
router.get("/orders/config", async (req, res): Promise<void> => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      res.status(500).json({ error: "Stripe publishable key is not configured" });
      return;
    }

    res.json({ publishableKey });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to retrieve Stripe configuration",
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

export default router;
