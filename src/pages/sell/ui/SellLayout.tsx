import { Button } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation } from "react-router";

export default function SellLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { text, path } = useMemo(() => {
    const isHistoryLocatin =
      location.pathname
        .split("/")
        .map((el) => el.trim())
        .filter(Boolean)
        .at(-1) === "start";
    const label = !isHistoryLocatin
      ? t("crm.sell.startSale")
      : t("crm.sell.back");
    const nextPath = isHistoryLocatin ? "" : "start";
    return {
      isHistoryLocatin,
      path: nextPath,
      text: label,
    };
  }, [location?.pathname, t]);

  return (
    <>
      <div className="flex gap-x-5 gap-y-2 flex-wrap">
        <NavLink to={path} className="flex-1 w-full">
          <Button className="w-full" color="warning" variant="contained">
            {text}
          </Button>
        </NavLink>
      </div>
      <Outlet />
    </>
  );
}
