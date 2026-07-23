"use client";

import * as React from "react";
import Link from "next/link";
import { NavDocuments } from "@/components/ui/nav-documents";
import { NavMain } from "@/components/ui/nav-main";
import { NavSecondary } from "@/components/ui/nav-secondary";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
    LayoutDashboardIcon,
    ListIcon,
    ChartBarIcon,
    FolderIcon,
    UsersIcon,
    CameraIcon,
    FileTextIcon,
    Settings2Icon,
    CircleHelpIcon,
    DatabaseIcon,
    FileChartColumnIcon,
    FileIcon,
    CommandIcon,
} from "lucide-react";

// ─── Role-based navigation ──────────────────────────────────────
const getSidebarData = (role?: string | null) => {
    const base = {
        navSecondary: [
            { title: "Settings", url: "/owner/settings", icon: <Settings2Icon /> },
            { title: "Get Help", url: "#", icon: <CircleHelpIcon /> },
        ],
        documents: [
            { name: "Data Library", url: "#", icon: <DatabaseIcon /> },
            { name: "Reports", url: "#", icon: <FileChartColumnIcon /> },
            { name: "Word Assistant", url: "#", icon: <FileIcon /> },
        ],
    };

    if (role === "jfda_officer") {
        return {
            ...base,
            navMain: [
                { title: "Dashboard", url: "/jfda/dashboard", icon: <LayoutDashboardIcon /> },
                { title: "Analytics", url: "/jfda/analytics", icon: <ChartBarIcon /> },
                { title: "Restaurants", url: "/jfda/restaurants", icon: <FolderIcon /> },
                { title: "Users", url: "/jfda/users", icon: <UsersIcon /> },
            ],
            showDocuments: true,
        };
    }

    if (role === "nutritionist_auditor") {
        return {
            ...base,
            navMain: [
                { title: "Dashboard", url: "/auditor/dashboard", icon: <LayoutDashboardIcon /> },
                { title: "Queue", url: "/auditor/queue", icon: <ListIcon /> },
                { title: "Site Audits", url: "/auditor/audit", icon: <FolderIcon /> },
                { title: "Reports", url: "/auditor/reports", icon: <FileChartColumnIcon /> },
            ],
            showDocuments: false,
        };
    }

    // Default: restaurant_owner
    return {
        ...base,
        navMain: [
            { title: "Dashboard", url: "/owner/dashboard", icon: <LayoutDashboardIcon /> },
            { title: "Recipes", url: "/owner/recipes", icon: <ListIcon /> },
            { title: "Drafts", url: "/owner/drafts", icon: <FileTextIcon /> },
            { title: "New Recipe", url: "/owner/submit", icon: <CameraIcon /> },
        ],
        showDocuments: false,
    };
};

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    tenantName?: string;
    role?: string;
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export function AppSidebar({ tenantName, role, user, ...props }: AppSidebarProps) {
    const sidebarData = getSidebarData(role);
    const isOwner = role === "restaurant_owner";

    // Branding
    let displayBrand = tenantName || "My Kitchen";
    if (role === "nutritionist_auditor") {
        displayBrand = user?.name ? `${user.name}'s Workspace` : "Auditor Workspace";
    } else if (role === "jfda_officer") {
        displayBrand = "JFDA Portal";
    }

    return (
        <Sidebar
            variant="sidebar"
            collapsible="offcanvas"
            className="top-20! h-[calc(100svh-5rem)]!"
            {...props}
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton aschild="true" className="data-[slot=sidebar-menu-button]:p-1.5!">
                            <Link href="/" className="flex items-center gap-2">
                                <CommandIcon className="size-5! text-primary" />
                                <span className="text-base font-semibold text-primary">{displayBrand}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={sidebarData.navMain} isOwner={isOwner} />
                {sidebarData.showDocuments && <NavDocuments items={sidebarData.documents} />}
                <NavSecondary items={sidebarData.navSecondary} className="mt-auto" />
            </SidebarContent>

            <SidebarFooter />
        </Sidebar>
    );
}