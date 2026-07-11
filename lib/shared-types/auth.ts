import { Role } from "@prisma/client";

export interface SessionUser {
    id: number;
    email: string;
    role: Role;
    full_name: string;
    restaurantId?: number;
    slug?: string;
    is_active?: boolean;
}