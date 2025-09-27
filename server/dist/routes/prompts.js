import { Router } from "express";
const router = Router();
const dailyPrompt = {
    id: "p-001",
    text: "Share a 10-second glimpse of the space you're in right now without showing faces.",
    gradient: "purplePink",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString()
};
router.get("/today", (_req, res) => {
    res.json({ prompt: dailyPrompt });
});
export const promptsRouter = router;
//# sourceMappingURL=prompts.js.map