import { Router } from "express";
import { testRateLimitController } from "../controllers/testRateLimiter.controller.js";

const router = Router();


router.get("/rate-limit", testRateLimitController);

export default router;