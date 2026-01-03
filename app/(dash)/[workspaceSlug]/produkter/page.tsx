import type { Metadata } from "next";
import { ProductsPageClient } from "@/components/products/products-page-client";

export const metadata: Metadata = {
  title: "Produkter — Kvitty",
};

export default async function ProductsPage() {
  return <ProductsPageClient />;
}
