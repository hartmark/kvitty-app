import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { appRouter } from "@/lib/trpc/router";
import { createTRPCContext } from "@/lib/trpc/init";
import { DownloadInvoiceButton } from "./download-button";

interface PublicInvoicePageProps {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ token?: string }>;
}

function getClientIP(headersList: Headers): string | undefined {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headersList.get("x-real-ip") || undefined;
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: PublicInvoicePageProps) {
  const { invoiceId } = await params;
  const { token } = await searchParams;

  if (!token) {
    redirect("/");
  }

  const ctx = await createTRPCContext();
  const caller = appRouter.createCaller(ctx);

  try {
    const invoice = await caller.invoices.getByToken({
      invoiceId,
      token,
    });

    const headersList = await headers();
    const ipAddress = getClientIP(headersList);
    const userAgent = headersList.get("user-agent") || undefined;
    const referer = headersList.get("referer") || undefined;

    await caller.invoices.trackOpen({
      invoiceId,
      token,
      ipAddress,
      userAgent,
      referer,
    });

    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-3xl font-bold">Faktura #{invoice.invoiceNumber}</h1>
              <p className="text-muted-foreground mt-1">
                {invoice.workspace.orgName || invoice.workspace.name}
              </p>
            </div>
            <div className="flex gap-2">
              <DownloadInvoiceButton invoiceId={invoiceId} token={token} invoiceNumber={invoice.invoiceNumber} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground mb-2">
                Fakturadatum
              </h2>
              <p>{invoice.invoiceDate}</p>
            </div>
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground mb-2">
                Förfallodatum
              </h2>
              <p>{invoice.dueDate}</p>
            </div>
          </div>

          {invoice.reference && (
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground mb-2">
                Referens
              </h2>
              <p>{invoice.reference}</p>
            </div>
          )}

          <div className="border-t pt-6">
            <h2 className="font-semibold text-lg mb-4">Kund</h2>
            <div className="space-y-1">
              <p className="font-medium">{invoice.customer.name}</p>
              {invoice.customer.orgNumber && (
                <p className="text-sm text-muted-foreground">
                  Org.nr: {invoice.customer.orgNumber}
                </p>
              )}
              {invoice.customer.address && (
                <p className="text-sm text-muted-foreground">
                  {invoice.customer.address}
                </p>
              )}
              {(invoice.customer.postalCode || invoice.customer.city) && (
                <p className="text-sm text-muted-foreground">
                  {invoice.customer.postalCode} {invoice.customer.city}
                </p>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="font-semibold text-lg mb-4">Radposter</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-sm font-semibold">
                      Beskrivning
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-semibold">
                      Antal
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-semibold">
                      À-pris
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-semibold">
                      Moms
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-semibold">
                      Belopp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => {
                    const isTextLine = line.lineType === "text";
                    return (
                      <tr key={line.id} className="border-b">
                        <td className="py-3 px-3">{line.description}</td>
                        <td className="text-right py-3 px-3">
                          {isTextLine ? "-" : parseFloat(line.quantity).toLocaleString("sv-SE")}
                        </td>
                        <td className="text-right py-3 px-3">
                          {isTextLine
                            ? "-"
                            : parseFloat(line.unitPrice).toLocaleString("sv-SE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }) + " kr"}
                        </td>
                        <td className="text-right py-3 px-3">
                          {isTextLine ? "-" : `${line.vatRate}%`}
                        </td>
                        <td className="text-right py-3 px-3 font-medium">
                          {isTextLine
                            ? "-"
                            : parseFloat(line.amount).toLocaleString("sv-SE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }) + " kr"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Summa exkl. moms:</span>
                  <span>
                    {parseFloat(invoice.subtotal).toLocaleString("sv-SE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    kr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Moms:</span>
                  <span>
                    {parseFloat(invoice.vatAmount).toLocaleString("sv-SE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    kr
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Att betala:</span>
                  <span>
                    {parseFloat(invoice.total).toLocaleString("sv-SE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    kr
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 text-sm text-muted-foreground">
            <p>
              Betalningsvillkor: 30 dagar netto. Vid försenad betalning debiteras
              dröjsmålsränta.
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}

