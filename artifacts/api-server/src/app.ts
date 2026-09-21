import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  processStripeV2Webhook,
  processStripeWebhook,
} from "./lib/stripe-webhooks";
import mcpRouter from "./routes/mcp";

const app: Express = express();

app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const header = req.headers["stripe-signature"];
    const signature = Array.isArray(header) ? header[0] : header;
    if (!signature || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Invalid Stripe webhook request" });
      return;
    }
    try {
      await processStripeWebhook(req.body, signature);
      res.json({ received: true });
    } catch (error) {
      req.log.warn({ err: error }, "Stripe webhook rejected");
      res.status(400).json({ error: "Stripe webhook processing failed" });
    }
  },
);
app.post(
  "/api/stripe/v2/webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const header = req.headers["stripe-signature"];
    const signature = Array.isArray(header) ? header[0] : header;
    if (!signature || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Invalid Stripe v2 webhook request" });
      return;
    }
    try {
      await processStripeV2Webhook(req.body, signature);
      res.json({ received: true });
    } catch (error) {
      req.log.warn({ err: error }, "Stripe v2 webhook rejected");
      res.status(400).json({ error: "Stripe v2 webhook processing failed" });
    }
  },
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(mcpRouter);
app.use("/api", mcpRouter);
app.use("/api", router);

export default app;
