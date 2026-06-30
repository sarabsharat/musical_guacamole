'use server'

// Import the safe, single instance we just built
import prisma from '@/lib/prisma'

export async function findUser() {
    const user = await prisma.user.findMany({
        where: {
            OR: [{email:"owner@gmail.com"}, {id:1}],
        },
    })
    return user
}

export async function findRes(){
    const res = await prisma.restaurant.findMany({
        where: {
            cert_level:{
                in: ["LEVEL_3","LEVEL_2"],
            },
        }
    })
    return res
}


export async function updateUser(id:number){
    const updatedUser = await prisma.user.update({
        where:{id:id},
        data: {
            email:"fmwel@ghmail.com"
        }
    })
    return updatedUser
}

export async function deleteUser(name:string){
    const deletedUser = await prisma.user.deleteMany({
        where:{full_name:name},
    })
    return deletedUser
}