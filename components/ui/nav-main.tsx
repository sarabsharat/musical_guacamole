"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CirclePlusIcon } from "lucide-react";

export function NavMain({
                            items,
                            isOwner = false,
                        }: {
    items: {
        title: string;
        url: string;
        icon?: React.ReactNode;
    }[];
    isOwner?: boolean;
}) {
    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-1">
                {/* ─── Quick Create (owners only) ───────────────────────── */}
                {isOwner && (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                aschild
                                tooltip="Quick Create"
                                className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground [&_svg]:size-4"
                            >
                                <Link href="/owner/submit" className="flex items-center gap-2">
                                    <CirclePlusIcon className="h-4 w-4" />
                                    <span>Quick Create</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}

                {/* ─── Main navigation items ────────────────────────────── */}
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton aschild="true" tooltip={item.title} className="[&_svg]:size-4">
                                <Link href={item.url} className="flex items-center gap-2">
                                    <span className="flex items-center justify-center">{item.icon}</span>
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}