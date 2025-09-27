import { Router } from "express";
import { z } from "zod";
const router = Router();
const mysteryMatch = {
    id: "m-001",
    codename: "Mystery Firefly",
    streak: 5,
    state: "mystery",
    revealAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString()
};
const decisionSchema = z.object({
    decision: z.enum(["continue", "pass"])
});
router.get("/today", (_req, res) => {
    res.json({ match: mysteryMatch });
});
router.post("/today/decision", (req, res) => {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid decision" });
    }
    // In a real implementation we would persist this decision and notify the paired buddy.
    return res.json({ status: "queued", decision: parsed.data.decision });
});
export const matchesRouter = router;
//# sourceMappingURL=matches.js.map