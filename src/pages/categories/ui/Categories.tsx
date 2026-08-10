// src/components/Categories/Categories.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  PageShell,
  PageHeader,
  FilterBar,
  PagePanel,
  EmptyState,
} from "@shared/ui/page-shell";
import styles from "./Categories.module.scss";
import api from "@shared/api"; // axios instance

function toResults(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

function MarketCategories() {
  const { categories, setCategories, brands, setBrands } = useOutletContext() as any;

  const [tab, setTab] = useState("categories"); // "categories" | "brands"
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");

  // modal
  const [editingId, setEditingId] = useState<any>(null); // null | "new" | id
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
      setErr("Не удалось загрузить категории/бренды");
       
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [setBrands, setCategories]);

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
          prev.map((x: any) => (x.id === editingId ? updated : x))
        );
      }
      closeModal();
    } catch (e) {
      setErr("Сохранение не удалось");
       
      console.error(e);
    }
  };

  const remove = async () => {
    if (editingId === "new") return closeModal();
    if (!window.confirm("Удалить этот элемент?")) return;

    setErr("");
    try {
      await api.delete(`${endpoint}${editingId}/`);
      setData((prev: any = []) => prev.filter((x: any) => x.id !== editingId));
      closeModal();
    } catch (e) {
      setErr("Удаление не удалось");
       
      console.error(e);
    }
  };

  return (
    <PageShell className={styles["cats"]}>
      <PageHeader
        title={isCats ? "Категории" : "Бренды"}
        subtitle="Справочник номенклатуры"
        actions={
          <button type="button" className="nur-btn nur-btn--primary" onClick={openNew}>
            + Добавить
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
            Бренды
          </button>
          <button
            type="button"
            className={`${styles["cats__tab"]} ${
              isCats ? styles["cats__tab--active"] : ""
            }`}
            onClick={() => setTab("categories")}
          >
            Категории
          </button>
        </div>

        <input
          className={`nur-input ${styles["cats__search"]}`}
          placeholder="Поиск"
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
                <th>№</th>
                <th>Название</th>
                <th className={styles["cats__thActions"]} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={styles["cats__empty"]} colSpan={3}>
                    Загрузка…
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
                        aria-label="Редактировать"
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
                      title="Ничего не найдено"
                      text="Измените поиск или добавьте новый элемент."
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
            <h3 className={styles["cats__modalTitle"]}>
              {editingId === "new"
                ? `Добавить ${isCats ? "категорию" : "бренд"}`
                : `Редактировать ${isCats ? "категорию" : "бренд"}`}
            </h3>

            <label className="nur-label">Название</label>
            <input
              className="nur-input"
              placeholder="Название"
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
                  Добавить
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="nur-btn nur-btn--primary"
                    onClick={save}
                    disabled={!name.trim()}
                  >
                    Сохранить
                  </button>
                  <button type="button" className="nur-btn nur-btn--danger" onClick={remove}>
                    Удалить
                  </button>
                </>
              )}
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={closeModal}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default MarketCategories;
