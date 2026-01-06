"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface MembersListProps {
  workspaceId: string;
  currentUserId?: string;
}

export function MembersList({ workspaceId, currentUserId }: MembersListProps) {
  const { data: members, isLoading } = trpc.members.list.useQuery({
    workspaceId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medlemmar</CardTitle>
        <CardDescription>
          Alla som har tillgång till denna arbetsyta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : members && members.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Namn</TableHead>
                <TableHead className="px-4">E-post</TableHead>
                <TableHead className="px-4">Gick med</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="px-4 font-medium">
                    <div className="flex items-center gap-2">
                      {member.name || "—"}
                      {member.userId === currentUserId && (
                        <Badge variant="secondary">Du</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4">{member.email}</TableCell>
                  <TableCell className="px-4">
                    {new Date(member.joinedAt).toLocaleDateString("sv-SE")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-sm">Inga medlemmar ännu.</p>
        )}
      </CardContent>
    </Card>
  );
}
