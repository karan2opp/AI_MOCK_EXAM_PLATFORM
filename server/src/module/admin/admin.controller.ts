import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as adminService from "./admin.service.js";

export const assignRole = async (req: Request, res: Response) => {
    const { email, role } = req.body;
    const result = await adminService.assignRole(email, role);
    return ApiResponse.ok(res, `Successfully assigned ${role} role to ${email}`, {
        id: result!.id,
        email: result!.email,
        role: result!.role,
        name: result!.name
    });
};

export const searchUser = async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await adminService.getUserByEmail(email);
    return ApiResponse.ok(res, `User found`, result);
};
