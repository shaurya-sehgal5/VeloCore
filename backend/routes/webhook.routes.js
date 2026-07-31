import { Router } from "express";
import { githubWebhook } from "../controllers/webhook.controller";

const router = Router();

router.post("/github", githubWebhook);

export default router;