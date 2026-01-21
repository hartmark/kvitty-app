"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    HouseIcon,
    Gear,
    Users,
    User,
    Bank,
    Money,
    UserList,
    AddressBook,
    Invoice,
    Calendar,
} from "@phosphor-icons/react";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { useWorkspace } from "@/components/workspace-provider";
import { trpc } from "@/lib/trpc/client";

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();
    const { workspace, periods } = useWorkspace();

    const { data: bankAccounts } = trpc.bankAccounts.list.useQuery(
        { workspaceId: workspace.id },
        { enabled: workspace.mode === "full_bookkeeping" }
    );

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    const navigationItems = React.useMemo(() => {
        const items: Array<{
            id: string;
            label: string;
            icon: React.ComponentType<React.ComponentProps<typeof HouseIcon>>;
            href: string;
            group: string;
        }> = [
                {
                    id: "overview",
                    label: "Översikt",
                    icon: HouseIcon,
                    href: `/${workspace.slug}`,
                    group: "Meny",
                },
            ];

        if (workspace.mode === "full_bookkeeping") {
            items.push(
                {
                    id: "employees",
                    label: "Personal",
                    icon: UserList,
                    href: `/${workspace.slug}/employees`,
                    group: "Personal & Löner",
                },
                {
                    id: "payroll",
                    label: "Lönekörningar",
                    icon: Money,
                    href: `/${workspace.slug}/employees/payroll`,
                    group: "Personal & Löner",
                },
                {
                    id: "bank",
                    label: "Hantera konton",
                    icon: Bank,
                    href: `/${workspace.slug}/bank`,
                    group: "Bank",
                },
                {
                    id: "customers",
                    label: "Kunder",
                    icon: AddressBook,
                    href: `/${workspace.slug}/customers`,
                    group: "Försäljning",
                },
                {
                    id: "invoices",
                    label: "Fakturor",
                    icon: Invoice,
                    href: `/${workspace.slug}/invoices`,
                    group: "Försäljning",
                }
            );

            if (bankAccounts) {
                bankAccounts.forEach((account) => {
                    items.push({
                        id: `bank-${account.id}`,
                        label: `${account.accountNumber} ${account.name}`,
                        icon: Bank,
                        href: `/${workspace.slug}/bank/${account.accountNumber}`,
                        group: "Bank",
                    });
                });
            }
        }

        periods.forEach((period) => {
            items.push({
                id: `period-${period.id}`,
                label: period.label,
                icon: Calendar,
                href: `/${workspace.slug}/${period.urlSlug}`,
                group: "Räkenskapsår",
            });
        });

        items.push(
            {
                id: "members",
                label: "Medlemmar",
                icon: Users,
                href: `/${workspace.slug}/members`,
                group: "Inställningar",
            },
            {
                id: "workspace-settings",
                label: "Inställningar",
                icon: Gear,
                href: `/${workspace.slug}/settings`,
                group: "Inställningar",
            },
            {
                id: "user-settings",
                label: "Användarinställningar",
                icon: User,
                href: "/user/settings",
                group: "Inställningar",
            }
        );

        return items;
    }, [workspace, periods, bankAccounts]);

    const groupedItems = React.useMemo(() => {
        const groups: Record<string, typeof navigationItems> = {};
        navigationItems.forEach((item) => {
            if (!groups[item.group]) {
                groups[item.group] = [];
            }
            groups[item.group].push(item);
        });
        return groups;
    }, [navigationItems]);

    return (
        <CommandDialog open={open} onOpenChange={setOpen} className="sm:max-w-lg">
            <Command>
                <CommandInput placeholder="Sök efter en sida eller kommando..." />
                <CommandList>
                    <CommandEmpty>Inga resultat hittades.</CommandEmpty>
                    {Object.entries(groupedItems).map(([groupName, items], index) => (
                        <React.Fragment key={groupName}>
                            {index > 0 && <CommandSeparator />}
                            <CommandGroup heading={groupName}>
                                {items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <CommandItem
                                            key={item.id}
                                            onSelect={() => {
                                                runCommand(() => {
                                                    router.push(item.href);
                                                });
                                            }}
                                        >
                                            <Icon className="size-4" weight="duotone" />
                                            <span>{item.label}</span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </React.Fragment>
                    ))}
                    <CommandSeparator />
                    <CommandGroup heading="Kortkommandon">
                        <CommandItem disabled>
                            <span>Öppna kommandomeny</span>
                            <CommandShortcut>⌘K</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
}

