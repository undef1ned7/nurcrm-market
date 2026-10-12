import { useNavigate } from "react-router";
import { MassIncomingView } from "@features/mass-incoming";

export default function MassScanPage() {
  const navigate = useNavigate();
  return (
    <MassIncomingView
      onClose={() => navigate("/crm/sklad")}
      onSaved={() => navigate("/crm/sklad")}
    />
  );
}
