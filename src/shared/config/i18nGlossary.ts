/**
 * Kyrgyz UI terms with Russian hints (from translator «Эскертүү» column).
 * Shown only when the interface language is `ky`.
 */
export type GlossaryEntry = {
  /** Word or phrase as it appears in Kyrgyz UI copy. */
  term: string;
  /** Short Russian explanation for users. */
  hint: string;
};

/** Longest terms first — used by GlossaryText when scanning strings. */
export const KY_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  { term: "жеткирүүчү", hint: "поставщик" },
  { term: "жеткирүүчүлөр", hint: "поставщики" },
  { term: "киреше", hint: "выручка" },
  { term: "бүтүм", hint: "транзакция" },
  { term: "бүтүмдөр", hint: "транзакции" },
  { term: "эсеп-кысап", hint: "отчёт" },
  { term: "накталай", hint: "наличные" },
  { term: "соода белгиси", hint: "бренд" },
  { term: "инвентаризациялоо", hint: "инвентаризация" },
  { term: "каржы", hint: "финансы" },
  { term: "дүмүрчөк", hint: "чек" },
  { term: "дүмүрчөктөр", hint: "чеки" },
  { term: "эсеп-кысаптар", hint: "отчёты" },
  { term: "башкаруу панели", hint: "дашборд" },
  { term: "тамырлаш бөлүм", hint: "филиал" },
  { term: "тамырлаш бөлүмдөр", hint: "филиалы" },
  { term: "кампалык", hint: "складской" },
  { term: "кассалык", hint: "кассовый" },
  { term: "нөөмөттөр", hint: "смены" },
  { term: "нөөмөт", hint: "смена" },
  { term: "кызматкерлер", hint: "сотрудники" },
  { term: "кызматкер", hint: "сотрудник" },
  { term: "сатуулар", hint: "продажи" },
  { term: "сатуу", hint: "продажа" },
  { term: "кардарлар", hint: "клиенты" },
  { term: "кардар", hint: "клиент" },
  { term: "билдирмелер", hint: "заявки" },
  { term: "билдирме", hint: "заявка" },
  { term: "жаздыруу", hint: "запись" },
  { term: "ырааттама", hint: "расписание" },
  { term: "ырааттамалар", hint: "расписания" },
  { term: "аштизме", hint: "меню" },
  { term: "дашборд", hint: "панель управления" },
  { term: "филиалдар", hint: "филиалы" },
  { term: "филиал", hint: "филиал" },
  { term: "жөндөөлөр", hint: "настройки" },
  { term: "сыр сөз", hint: "пароль" },
  { term: "сыр сөздөр", hint: "пароли" },
  { term: "себет", hint: "корзина" },
  { term: "кассачы", hint: "кассир" },
  { term: "кассачынын", hint: "кассира" },
  { term: "арзандатуу", hint: "скидка" },
  { term: "токен", hint: "ключ доступа" },
  { term: "каптал колонка", hint: "сайдбар" },
  { term: "каптал колонканы", hint: "сайдбар" },
  { term: "тараза", hint: "весы" },
  { term: "таразанын", hint: "весов" },
  { term: "салмагы", hint: "вес" },
  { term: "суммасы", hint: "сумма" },
  { term: "кампа", hint: "склад" },
  { term: "тутум", hint: "система" },
  { term: "касса", hint: "касса (куту)" },
];

export const KY_GLOSSARY_BY_TERM = new Map(
  KY_GLOSSARY_ENTRIES.map((entry) => [entry.term.toLowerCase(), entry]),
);
