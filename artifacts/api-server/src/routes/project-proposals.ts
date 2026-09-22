import { Router, type IRouter } from "express";
import {
  approveProjectPatchProposal,
  getProjectPatchProposal,
  listProjectPatchProposals,
  ProjectPatchConflictError,
  rejectProjectPatchProposal,
} from "../lib/project-guardrails";
import { requireAuthenticated } from "../middlewares/authMiddleware";

const router: IRouter = Router();
router.use("/project-proposals", requireAuthenticated);

router.get("/project-proposals", async (_req, res) => {
  res.json({ proposals: await listProjectPatchProposals() });
});

router.get("/project-proposals/:id", async (req, res) => {
  try {
    res.json(await getProjectPatchProposal(req.params.id));
  } catch {
    res.status(404).json({ error: "Proposal not found." });
  }
});

router.post("/project-proposals/:id/approve", async (req, res) => {
  try {
    const proposal = await approveProjectPatchProposal(
      req.params.id,
      req.user!.id,
    );
    res.json(proposal);
  } catch (error) {
    if (error instanceof ProjectPatchConflictError) {
      res.status(409).json({ error: error.message, conflicts: error.conflicts });
      return;
    }
    if (error instanceof Error && error.message.includes("already")) {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(404).json({ error: "Proposal not found." });
  }
});

router.post("/project-proposals/:id/reject", async (req, res) => {
  try {
    res.json(await rejectProjectPatchProposal(req.params.id, req.user!.id));
  } catch (error) {
    if (error instanceof Error && error.message.includes("already")) {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(404).json({ error: "Proposal not found." });
  }
});

export default router;