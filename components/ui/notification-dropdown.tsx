"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, XCircle, Star } from "lucide-react";
import { markNotificationsAsRead } from "@/actions/NotificationsActions";

export type NotificationItem = {
  id: number | string;
  textColor: string;
  bgColor?: string;
  title: string;
  desc: string;
  time: string;
  status: string;
};

type Props = {
  trigger: ReactNode;
  notifications: NotificationItem[];
  defaultOpen?: boolean;
  align?: "start" | "center" | "end";
  readIds?: (number | string)[];
};

const getIconForStatus = (status: string) => {
  switch (status) {
    case "PENDING":
      return Clock;
    case "APPROVED":
      return CheckCircle;
    case "REJECTED":
    case "REVOKED":
      return XCircle;
    default:
      return Star;
  }
};

export const NotificationDropdown = ({
                                       trigger,
                                       notifications = [],
                                       defaultOpen,
                                       align = "end",
                                       readIds = [],
                                     }: Props) => {
  // Initialize unread IDs from server-provided readIds
  const [unreadIds, setUnreadIds] = useState<Set<string | number>>(() => {
    const readSet = new Set(readIds);
    const allIds = notifications.map((n) => n.id);
    return new Set(allIds.filter((id) => !readSet.has(id)));
  });

  // ─── Mark a single notification as read ─────────────
  const handleMarkAsRead = async (id: number | string) => {
    if (!unreadIds.has(id)) return;

    // Optimistically update the UI instantly
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    await markNotificationsAsRead([Number(id)]);
  };

  // ─── Mark all notifications as read ─────────────────
  const handleMarkAllAsRead = async () => {
    if (unreadIds.size === 0) return;

    const idsToMark = Array.from(unreadIds).map(Number);

    // Optimistically clear the UI instantly
    setUnreadIds(new Set());

    await markNotificationsAsRead(idsToMark);
  };

  const hasUnread = unreadIds.size > 0;

  return (
      <div className="flex items-center justify-center">
        <DropdownMenu defaultOpen={defaultOpen}>
          <DropdownMenuTrigger >
            <div className="relative cursor-pointer">
              {trigger}
              {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 z-10 block h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
              align={align}
              className="p-0 w-80 rounded-2xl shadow-xl data-open:slide-in-from-top-2! data-closed:slide-out-to-top-2"
          >
            <DropdownMenuGroup>
              {/* Title Header */}
              <DropdownMenuLabel className="flex flex-col gap-2 p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-popover-foreground">
                    Notifications & Activity
                  </p>
                  <Badge className="h-5 font-normal">{notifications.length} Recent</Badge>
                </div>

                {/* Conditional "Mark all as read" button */}
                {hasUnread && (
                    <button
                        onClick={(e) => {
                          e.preventDefault(); // Keeps the dropdown from closing
                          handleMarkAllAsRead();
                        }}
                        className="text-xs text-primary hover:underline text-left w-fit cursor-pointer mt-1"
                    >
                      Mark all as read
                    </button>
                )}
              </DropdownMenuLabel>

              {/* Notification List */}
              <div className="max-h-75 overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map(({ id, textColor, title, desc, time, status }) => {
                      const Icon = getIconForStatus(status);
                      const isUnread = unreadIds.has(id);

                      return (
                          <DropdownMenuItem
                              key={id}
                              onSelect={(e) => {
                                // If it's unread, mark it as read but KEEP the menu open
                                if (isUnread) {
                                  e.preventDefault();
                                  handleMarkAsRead(id);
                                }
                              }}
                              className={cn(
                                  "mx-1.5 my-1 p-2.5 flex items-start justify-between cursor-pointer rounded-xl transition-colors",
                                  isUnread ? "bg-muted/40 hover:bg-muted" : "hover:bg-muted/50 opacity-80"
                              )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-xl mt-0.5 bg-secondary">
                                <Icon className={cn("size-4", textColor)} />
                              </div>
                              <div>
                                <p className={cn("text-sm text-popover-foreground", isUnread ? "font-semibold" : "font-medium")}>
                                  {title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {desc}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {time}
                        </span>
                              {isUnread && (
                                  <span className="block h-1.5 w-1.5 rounded-full bg-primary mt-1" />
                              )}
                            </div>
                          </DropdownMenuItem>
                      );
                    })
                ) : (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No recent activities found.
                    </div>
                )}
              </div>

              {/* Footer Button */}
              <div className="p-2 border-t border-border">
                <Button variant="ghost" className="rounded-xl w-full text-xs cursor-pointer">
                  View Full Audit Log
                </Button>
              </div>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
  );
};