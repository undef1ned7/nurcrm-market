import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";
import {
  PageShell,
  PageHeader,
  FilterBar,
  PagePanel,
  EmptyState,
} from "@shared/ui/page-shell";
import styles from "./Categories.module.scss";
import api from "@shared/api";

function toResults(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

function MarketCategories() {
  const { t } = useTranslation();
  const { categories, setCategories, brands, setBrands } = useOutletContext() as any;

  const [tab, setTab] = useState("categories");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<any>(null);
  const [name, setName] = useState("");

  const isCats = tab === "categories";
  const data = isCats ? categories : brands;
  const setData = isCats ? setCategories : setBrands;
  const endpoint = isCats ? "/main/categories/" : "/main/brands/";

  const fetchAll = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const [catRes, brandRes] = await Promise.all([
        api.get("/main/categories/"),
        api.get("/main/brands/"),
      ]);
      setCategories(toResults(catRes.data));
      setBrands(toResults(brandRes.data));
    } catch (e) {
      setErr(t("crm.categories.loadError"));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [setBrands, setCategories, t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((x) => (x.name || "").toLowerCase().includes(q));
  }, [data, search]);

  const openNew = () => {
    setEditingId("new");
    setName("");
  };

  const openEdit = (id) => {
    const row = data.find((x) => x.id === id);
    setEditingId(id);
    setName(row?.name || "");
  };

  const closeModal = () => {
    setEditingId(null);
    setName("");
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setErr("");
    try {
      if (editingId === "new") {
        const { data: created } = await api.post(endpoint, { name: trimmed });
        setData((prev: any = []) => [...prev, created]);
      } else {
        const { data: updated } = await api.patch(`${endpoint}${editingId}/`, {
          name: trimmed,
        });
        setData((prev: any = []) =>
          prev.map((x: any) => (x.id === editingId ? updated : x)),
        );
      }
      closeModal();
    } catch (e) {
      setErr(t("crm.categories.saveError"));
      console.error(e);
    }
  };

  const remove = async () => {
    if (editingId === "new") return closeModal();
    if (!window.confirm(t("crm.categories.deleteConfirm"))) return;

    setErr("");
    try {
      await api.delete(`${endpoint}${editingId}/`);
      setData((prev: any = []) => prev.filter((x: any) => x.id !== editingId));
      closeModal();
    } catch (e) {
      setErr(t("crm.categories.deleteError"));
      console.error(e);
    }
  };

  const modalTitle =
    editingId === "new"
      ? isCats
        ? t("crm.categories.addCategory")
        : t("crm.categories.addBrand")
      : isCats
        ? t("crm.categories.editCategory")
        : t("crm.categories.editBrand");

  return (
    <PageShell className={styles["cats"]}>
      <PageHeader
        title={
          isCats
            ? t("crm.categories.pageTitleCategories")
            : t("crm.categories.pageTitleBrands")
        }
        subtitle={t("crm.categories.subtitle")}
        actions={
          <button type="button" className="nur-btn nur-btn--primary" onClick={openNew}>
            {t("crm.categories.add")}
          </button>
        }
      />

      <FilterBar className={styles["cats__toolbar"]}>
        <div className={styles["cats__tabs"]}>
          <button
            type="button"
            className={`${styles["cats__tab"]} ${
              !isCats ? styles["cats__tab--active"] : ""
            }`}
            onClick={() => setTab("brands")}
          >
            {t("crm.categories.brands")}
          </button>
          <button
            type="button"
            className={`${styles["cats__tab"]} ${
              isCats ? styles["cats__tab--active"] : ""
            }`}
            onClick={() => setTab("categories")}
          >
            {t("crm.categories.categories")}
          </button>
        </div>

        <input
          className={`nur-input ${styles["cats__search"]}`}
          placeholder={t("crm.categories.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </FilterBar>

      {err && <div className={styles["cats__error"]}>{err}</div>}

      <PagePanel flush>
        <div className={`nur-table-wrap ${styles["cats__tableWrap"]}`}>
          <table className={`nur-table nur-table--clickable ${styles["cats__table"]}`}>
            <thead>
              <tr>
                <th>{t("crm.categories.number")}</th>
                <th>{t("crm.categories.name")}</th>
                <th className={styles["cats__thActions"]} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={styles["cats__empty"]} colSpan={3}>
                    {t("common.loading")}
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((item, i) => (
                  <tr key={item.id} onClick={() => openEdit(item.id)}>
                    <td>{i + 1}</td>
                    <td>{item.name}</td>
                    <td className={styles["cats__actionsCell"]}>
                      <button
                        type="button"
                        className="nur-btn nur-btn--ghost nur-btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(item.id);
                        }}
                        aria-label={t("crm.categories.edit")}
                      >
                        ⋮
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>
                    <EmptyState
                      title={t("common.nothingFound")}
                      text={t("crm.categories.search")}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PagePanel>

      {editingId !== null && (
        <div className={styles["cats__modalOverlay"]} onClick={closeModal}>
          <div
            className={styles["cats__modal"]}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className={styles["cats__modalTitle"]}>{modalTitle}</h3>

            <label className="nur-label">{t("crm.categories.name")}</label>
            <input
              className="nur-input"
              placeholder={t("crm.categories.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <div className={styles["cats__modalActions"]}>
              {editingId === "new" ? (
                <button
                  type="button"
                  className="nur-btn nur-btn--primary"
                  onClick={save}
                  disabled={!name.trim()}
                >
                  {t("common.create")}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="nur-btn nur-btn--primary"
                    onClick={save}
                    disabled={!name.trim()}
                  >
                    {t("common.save")}
                  </button>
                  <button type="button" className="nur-btn nur-btn--danger" onClick={remove}>
                    {t("common.delete")}
                  </button>
                </>
              )}
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={closeModal}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default MarketCategories;
