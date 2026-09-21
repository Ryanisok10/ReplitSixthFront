import { Router, type IRouter } from "express";
import healthRouter from "./health";
import merchantIntakeRouter from "./merchant-intake";
import merchantOnboardingRouter from "./merchant-onboarding";

const router: IRouter = Router();

router.use(healthRouter);
router.use(merchantIntakeRouter);
router.use(merchantOnboardingRouter);

export default router;
