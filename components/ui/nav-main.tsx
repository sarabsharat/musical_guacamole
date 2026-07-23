"use client";

import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CirclePlusIcon, MailIcon } from "lucide-react";

interface NavMainProps {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
  }[];
  isJFDA?: boolean; // true = JFDA officer, false = owner (or other)
}

export function NavMain({ items, isJFDA = false }: NavMainProps) {
  return (
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          {/* ─── Top action section ────────────────────────────────── */}
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              {isJFDA ? (
                  // JFDA: Inbox as a normal nav item (full width)
                  <SidebarMenuButton
                      tooltip="Inbox"
                      className="flex-1"
                      render={<a href="/jfda/inbox" />}
                  >
                    <MailIcon />
                    <span>Inbox</span>
                  </SidebarMenuButton>
              ) : (
                  // Owner: Quick Create + Inbox circle button
                  <>
                    <SidebarMenuButton
                        tooltip="Quick Create"
                        className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                        render={<a href="/owner/submit" />}
                    >
                      <CirclePlusIcon />
                      <span>Quick Create</span>
                    </SidebarMenuButton>
                    <Button
                        size="icon"
                        className="size-8 group-data-[collapsible=icon]:opacity-0"
                        variant="outline"
                    >
                      <MailIcon />
                      <span className="sr-only">Inbox</span>
                    </Button>
                  </>
              )}
            </SidebarMenuItem>
          </SidebarMenu>

          {/* ─── Main navigation items ────────────────────────────── */}
          <SidebarMenu>
            {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} render={<a href={item.url} />}>
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
  );
}