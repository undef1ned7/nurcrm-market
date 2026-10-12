import React from "react";

/* =========================
   4) ClientBlock
   ========================= */
export const ClientBlock = React.memo(function ClientBlock({
  company,
  filterClient,
  clientId,
  setClientId,
  showCreateClient,
  setShowCreateClient,
  newClient: _newClient,
  onNewClientChange,
  createClient,
}: any) {
  return (
    <div className="add-modal__section">
      <label>Клиенты *</label>
      <select
        className="add-modal__input"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        required
      >
        <option value="">-- Выберите клиента --</option>
        {filterClient.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.full_name}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="create-client"
        onClick={() => setShowCreateClient((s) => !s)}
      >
        {showCreateClient ? "Отменить" : "Создать клиента"}
      </button>

      {showCreateClient && (
        <form
          style={{ display: "flex", flexDirection: "column", rowGap: "10px" }}
          onSubmit={createClient}
        >
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            type="text"
            placeholder="ФИО"
            name="full_name"
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            type="text"
            name="llc"
            placeholder="ОсОО"
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            type="text"
            name="inn"
            placeholder="ИНН"
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            type="text"
            name="okpo"
            placeholder="ОКПО"
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            type="text"
            name="score"
            placeholder="Р/СЧЁТ"
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            type="text"
            name="bik"
            placeholder="БИК"
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            type="text"
            name="address"
            placeholder="Адрес"
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            type="text"
            name="phone"
            placeholder="Телефон"
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            type="email"
            name="email"
            placeholder="Почта"
          />
          <div style={{ display: "flex", columnGap: "10px" }}>
            <button
              className="create-client"
              type="button"
              onClick={() => setShowCreateClient(false)}
            >
              Отмена
            </button>
            <button className="create-client">Создать</button>
          </div>
        </form>
      )}

      {company?.sector?.name === "Строительная компания" && (
        <select className="add-modal__input" defaultValue="">
          <option value="" disabled>
            -- Выберите тип платежа --
          </option>
          <option>Аванс</option>
          <option>Кредит</option>
          <option>Полная оплата</option>
        </select>
      )}
    </div>
  );
});
