import cors from "cors";
import express from "express";
import morgan from "morgan";

import { matchesRouter } from "./routes/matches.js";
import { promptsRouter } from "./routes/prompts.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/prompts", promptsRouter);
app.use("/matches", matchesRouter);

app.listen(PORT, () => {
  console.log(`SecretBuddy API running on port ${PORT}`);
});
