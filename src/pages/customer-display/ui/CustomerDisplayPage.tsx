import { useUser } from "@entities/user";
import { CustomerDisplayView } from "@features/customer-display";

export default function CustomerDisplayPage() {
  const { company } = useUser();
  const companyName = String(company?.name || "").trim();
  const logoUrl = String(
    company?.logo || company?.logo_url || company?.image || "",
  ).trim();

  return (
    <CustomerDisplayView companyName={companyName} logoUrl={logoUrl || undefined} />
  );
}
