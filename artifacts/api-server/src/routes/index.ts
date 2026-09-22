import { Router, type IRouter } from "express";
import healthRouter from "./health";
import merchantIntakeRouter from "./merchant-intake";
import merchantOnboardingRouter from "./merchant-onboarding";
import authRouter from "./auth";
import projectProposalsRouter from "./project-proposals";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(merchantIntakeRouter);
router.use(merchantOnboardingRouter);
router.use(projectProposalsRouter);
router.use(ordersRouter);

export default router;
