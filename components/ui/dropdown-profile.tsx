"use client";

import { ReactElement } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link"; // 🚨 1. Import Link
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  LucideIcon,
  Settings2,
  User,
} from "lucide-react";
import * as React from "react";

type User = {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
};

type Props = {
  trigger: ReactElement;
  defaultOpen?: boolean;
  align?: "start" | "center" | "end";
  user?: User | null;
};

type MenuItem = {
  label: string;
  icon: LucideIcon;
  href?: string; // 🚨 2. Add href to your type definition
  destructive?: boolean;
};

// 🚨 3. Attach the specific route to your profile item
const PROFILE_ITEMS: MenuItem[] = [{ label: "My Profile", icon: User, href: "/profile" }];
const SETTINGS_ITEMS: MenuItem[] = [{ label: "Account Settings", icon: Settings2 }];
const LOGOUT_ITEM: MenuItem = { label: "Signout", icon: LogOut, destructive: true };

const itemClass = "px-4 py-2.5 text-base cursor-pointer gap-3";

const ProfileDropdown = ({ trigger, defaultOpen, align = "end", user }: Props) => {
  const displayName = user?.name || "Guest User";
  const displayEmail = user?.email || "guest@example.com";
  const displayAvatar = user?.avatar || "/avatars/dark.png";
  const initials = displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
      <DropdownMenu defaultOpen={defaultOpen}>
        <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>

        <DropdownMenuContent className="w-80" align={align}>
          <DropdownMenuGroup>
            {/* User Info */}
            <DropdownMenuLabel className="flex items-center gap-4 px-4 py-2.5 font-normal">
              <div className="relative">
                <Avatar className="size-10">
                  <AvatarImage src={displayAvatar} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </div>

              <div className="flex flex-col">
                <span className="text-foreground text-lg font-semibold">{displayName}</span>
                <span className="text-muted-foreground text-sm">{displayEmail}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* 🚨 4. Use asChild and Link to handle the navigation natively */}
            {PROFILE_ITEMS.map(({ label, icon: Icon, href }) => (
                <DropdownMenuItem key={label} className={itemClass}>
                  <Link href={href || "#"}>
                    <Icon size={20} className="text-foreground" />
                    <span>{label}</span>
                  </Link>
                </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {SETTINGS_ITEMS.map(({ label, icon: Icon, href }) => (
                  <DropdownMenuItem key={label} className={itemClass} >
                    <Link href={href || "#"}>
                      <Icon size={20} className="text-foreground" />
                      <span>{label}</span>
                    </Link>
                  </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
                variant="destructive"
                className={itemClass}
                onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LOGOUT_ITEM.icon size={20} />
              <span>{LOGOUT_ITEM.label}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
  );
};

export default ProfileDropdown;