import { Router } from "express";
import * as controller from "./admin.controller.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import { assignRoleSchema, searchUserSchema } from "./dto/admin.dto.js";

const router = Router();

router.post("/assign-role", authenticate, authorize("admin"), validate(assignRoleSchema), controller.assignRole);
router.post("/search-user", authenticate, authorize("admin"), validate(searchUserSchema), controller.searchUser);

export default router;
