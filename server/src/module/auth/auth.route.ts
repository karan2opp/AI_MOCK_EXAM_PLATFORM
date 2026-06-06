import { Router } from "express";
import * as controller from "./auth.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.dto.js";

const router = Router();

router.post("/register", validate(registerSchema), controller.register);
router.post("/login", validate(loginSchema), controller.login);
router.post("/refreshToken", controller.refreshToken);
router.post("/logout", authenticate, controller.logout);
router.get("/verifyEmail/:token", controller.verifyEmail);
router.post(
  "/forgotPassword",
  validate(forgotPasswordSchema),
  controller.forgotPassword
);
router.put(
  "/resetPassword/:token",
  validate(resetPasswordSchema),
  controller.resetPassword
);

router.get("/me", authenticate, controller.getMe);

export default router;
