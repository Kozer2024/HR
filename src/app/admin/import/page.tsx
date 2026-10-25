import { requireRole } from "@/lib/permissions";
import { ImportForm } from "@/components/admin/import-form";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireRole("ADMIN");
  return <ImportForm />;
}
