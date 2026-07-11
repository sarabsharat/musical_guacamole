import {getSession} from "@/lib/auth";
import {redirect} from "next/navigation";
import {Role} from "@prisma/client";


export async function RequireAdminAuth(){
    const session = await getSession();
    if(!session){
        redirect("/login");
    }

    if(session.role !== Role.platform_admin){
        console.log("Unauthorized");
        redirect("/");
    }

    return session;

}