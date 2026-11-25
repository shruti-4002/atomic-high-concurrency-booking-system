import { rateLimit } from "../config/redisRateLimiter.js";

export const testRateLimitController = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.ip || "guest-test-user";
    const allowed = await rateLimit(String(userId));

    if (!allowed) {
      return res.status(429).json({
        success: false,
        allowed: false,
        message: "Too many requests — rate limit exceeded",
      });
    }

    return res.status(200).json({
      success: true,
      allowed: true,
      message: "Request allowed by Redis leaky bucket rate limiter",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Rate limiter test error",
    });
  }
};