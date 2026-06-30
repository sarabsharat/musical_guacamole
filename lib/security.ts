import {Role} from "@prisma/client";
import { redirect} from "next/navigation";

export interface SessionUser {
    id: number;
    role: Role;
    restaurantId?:number;
}


export async function assertUserAccess(
    currentUser: SessionUser,
    allowedRoles: Role[],
    targetRestaurantId?: number,
) {

    if(!allowedRoles.includes(currentUser.role)){
        redirect("/denier");
    }

    if (currentUser.role === Role.restaurant_owner){
        if (!currentUser.restaurantId){
            throw new Error("No tenant restaurant assigned to this owner profile.");
        }
        if (targetRestaurantId && currentUser.restaurantId !== targetRestaurantId){
            throw new Error ("Unauthorized Access: Tenant restaurant is not assigned to this owner profile.");
        }
    }


}