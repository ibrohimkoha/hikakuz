import { redirect } from "next/navigation";

export default function CatalogRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  redirect("/katalog");
}
