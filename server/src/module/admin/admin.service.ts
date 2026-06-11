import { eq } from "drizzle-orm";
import db from "../../common/db/index.js";
import { users } from "../auth/user.schema.js";
import { ApiError } from "../../common/utils/ApiError.js";

export const assignRole = async (email: string, role: "student" | "teacher" | "admin" = "teacher") => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
        throw ApiError.notFound("User not found with this email address");
    }

    if (user.role === role) {
        throw ApiError.badRequest(`User is already a ${role}`);
    }

    const [updatedUser] = await db.update(users)
        .set({ role })
        .where(eq(users.email, email))
        .returning();

    return updatedUser;
};

export const getUserByEmail = async (email: string) => {
    const [user] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
    }).from(users).where(eq(users.email, email));

    if (!user) {
        throw ApiError.notFound("User not found with this email address");
    }

    return user;
};
