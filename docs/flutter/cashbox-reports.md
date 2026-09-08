# Flutter: отчёты кассы

Дневной / месячный отчёт одной кассы и помесячная аналитика — контракт API, нормализация, fallback и UI 1:1 с вебом.

**Веб-экраны:**
- `/crm/kassa/:id` → вкладка **«Отчёты»** (одна касса)
- `/crm/kassa/reports` → аналитика по кассам (график + таблица)

**Веб-код (эталон):**
- `src/entities/cash/lib/cashboxReportsApi.ts` — HTTP + fallback
- `src/entities/cash/lib/cashboxReports.normalize.ts` — парсеры
- `src/entities/cash/lib/cashboxReports.types.ts` — типы
- `src/features/kassa-worker/ui/hooks/useKassa.ts` — вкладка «Отчёты»
- `src/features/kassa-worker/ui/kassa/KassaReportsSection.tsx` — UI отчёта
- `src/features/kassa/ui/Reports/Reports.tsx` — экран аналитики

**Бэкенд-док:** [cashbox-reports-backend.md](../backend/kassa/cashbox-reports-backend.md)

**Статус:** ✅ **Бэкенд готов.** Flutter: `GET .../report/` и `GET .../analytics/` — основной путь; fallback на paginated cashflows только при `404`/`501` (откат). См. [cash-and-cashflows.md](./cash-and-cashflows.md).

Базовый префикс: `{host}/api`. Авторизация: `Authorization: Bearer <accessToken>`.  
Таймзона границ дат: **Asia/Bishkek (UTC+6)**. Суммы в API — decimal-строки `"1234.56"`.

---

## Содержание

1. [Два экрана](#1-два-экрана)
2. [Эндпоинты](#2-эндпоинты)
3. [Модели Dart](#3-модели-dart)
4. [Нормализация ответа](#4-нормализация-ответа)
5. [API-клиент с fallback](#5-api-клиент-с-fallback)
6. [Экран: отчёт одной кассы](#6-экран-отчёт-одной-кассы)
7. [Экран: аналитика](#7-экран-аналитика)
8. [Legacy fallback](#8-legacy-fallback)
9. [Ошибки и truncated](#9-ошибки-и-truncated)
10. [Отличие от других «отчётов»](#10-отличие-от-других-отчётов)
11. [Чеклист Flutter](#11-чеклист-flutter)

---

## 1. Два экрана

| Экран | Маршрут (веб) | API | Что показывает |
|-------|---------------|-----|----------------|
| **Отчёт кассы** | `/crm/kassa/:cashboxId` → вкладка «Отчёты» | `GET .../cashboxes/{id}/report/` | KPI + операции за день или месяц |
| **Аналитика** | `/crm/kassa/reports` | `GET .../cashbox-reports/analytics/` | KPI + график + таблица по месяцам |

На вкладке «Отчёты» обычный список cashflows **не грузится** — только отчёт.

### Типы отчёта (одна касса)

| Тип | Фильтр UI | Ответ API |
|-----|-----------|-----------|
| **Ежемесячный** | `<input type="month">` → `YYYY-MM` | `period=month`, массив `days[]` |
| **Дневной** | `<input type="date">` → `YYYY-MM-DD` | `period=day`, массив `flows[]` |

KPI на обоих экранах:
- **Приход** (`totalIncome` / `summary.total_income`)
- **Расход** (`totalExpense` / `summary.total_expense`)
- **Итого** (`net = income − expense`)

По умолчанию `status=approved` — pending и rejected **не входят**.

---

## 2. Эндпоинты

### 2.1 Отчёт одной кассы

```http
GET /construction/cashboxes/{cashbox_id}/report/
```

| Query | Обяз. | Значение |
|-------|-------|----------|
| `period` | да | `day` \| `month` |
| `date` | если `period=day` | `YYYY-MM-DD` |
| `month` | если `period=month` | `YYYY-MM` |
| `status` | нет | `approved` (default) \| `pending` \| `all` |

Примеры:

```http
GET /api/construction/cashboxes/8b1c.../report/?period=month&month=2026-08&status=approved
GET /api/construction/cashboxes/8b1c.../report/?period=day&date=2026-08-31
```

### 2.2 Аналитика

```http
GET /construction/cashbox-reports/analytics/
```

| Query | Обяз. | Значение |
|-------|-------|----------|
| `date_from` | нет | `YYYY-MM-DD`, включительно |
| `date_to` | нет | `YYYY-MM-DD`, включительно |
| `cashbox` | нет | UUID; без параметра — все кассы компании |
| `group_by` | нет | `month` (default) |
| `status` | нет | `approved` (default) |

Пример:

```http
GET /api/construction/cashbox-reports/analytics/?cashbox=8b1c...&date_from=2026-01-01&date_to=2026-08-31&group_by=month
```

---

## 3. Модели Dart

```dart
enum CashboxReportPeriod { day, month }

enum CashboxReportStatusFilter { approved, pending, all }

enum ReportDataSource { backend, fallback }

class CashboxReportFlow {
  final String id;
  final String type; // 'income' | 'expense'
  final double amount;
  final String name;
  final String title;
  final DateTime? createdAt;
  final String? status;

  bool get isIncome => type == 'income';
}

class CashboxReportDayGroup {
  final double income;
  final double expense;
  final List<CashboxReportFlow> flows;

  double get net => income - expense;
}

class CashboxReportViewModel {
  final String type; // 'monthly' | 'daily'
  final String? month; // YYYY-MM
  final String? date;  // YYYY-MM-DD
  final double totalIncome;
  final double totalExpense;
  final double net;
  final int operationsCount;
  final Map<String, CashboxReportDayGroup>? dailyGroups;
  final List<CashboxReportFlow>? flows;
  final bool truncated;
  final ReportDataSource source;
}

class CashboxReportAnalyticsGroup {
  final String ym;    // '2026-08'
  final String label; // 'Авг 2026'
  final double income;
  final double expense;
  final double net;
  final int ops;
}

class CashboxReportAnalyticsViewModel {
  final double income;
  final double expense;
  final double net;
  final int ops;
  final List<CashboxReportAnalyticsGroup> groups;
  final bool truncated;
  final ReportDataSource source;
}
```

---

## 4. Нормализация ответа

### 4.1 Парсинг сумм

Бэк отдаёт строки; поддерживать запятую и пробелы (как на вебе):

```dart
double toReportNumber(Object? value) {
  if (value == null || value == '') return 0;
  final normalized = '$value'.replaceAll(',', '.').replaceAll(RegExp(r'\s'), '');
  final n = double.tryParse(normalized);
  return n != null && n.isFinite ? n : 0;
}
```

### 4.2 Flow

```dart
CashboxReportFlow normalizeReportFlow(Map<String, dynamic> json, [int index = 0]) {
  final rawAmount = toReportNumber(json['amount']);
  final typeRaw = '${json['type'] ?? ''}'.toLowerCase();
  final type = typeRaw == 'income' || typeRaw == 'expense'
      ? typeRaw
      : (rawAmount < 0 ? 'expense' : 'income');

  final name = json['name']?.toString() ??
      json['title']?.toString() ??
      json['description']?.toString() ??
      json['note']?.toString() ??
      (type == 'income' ? 'Приход' : 'Расход');

  final createdRaw = json['created_at'] ?? json['created'] ?? json['date'] ?? json['timestamp'];

  return CashboxReportFlow(
    id: '${json['id'] ?? json['uuid'] ?? index}',
    type: type,
    amount: rawAmount.abs(),
    name: name,
    title: name,
    createdAt: createdRaw != null ? DateTime.tryParse('$createdRaw') : null,
    status: json['status']?.toString(),
  );
}
```

### 4.3 Месячный отчёт

Предпочтительно массив `days[]`. Допустим alias `daily_groups` (map `date → day`).

```dart
CashboxReportViewModel normalizeMonthlyReport(
  Map<String, dynamic> json, {
  required String month,
  ReportDataSource source = ReportDataSource.backend,
}) {
  final summary = _readSummary(json);
  final dailyGroups = <String, CashboxReportDayGroup>{};

  final days = json['days'];
  if (days is List) {
    for (final day in days) {
      if (day is! Map) continue;
      final date = day['date']?.toString();
      if (date == null || date.isEmpty) continue;
      dailyGroups[date] = _normalizeDayGroup(day);
    }
  } else if (json['daily_groups'] is Map) {
    (json['daily_groups'] as Map).forEach((date, group) {
      dailyGroups['$date'] = _normalizeDayGroup({
        'date': date,
        ...(group as Map).cast<String, dynamic>(),
      });
    });
  }

  return CashboxReportViewModel(
    type: 'monthly',
    month: json['month']?.toString() ?? month,
    totalIncome: summary.income,
    totalExpense: summary.expense,
    net: summary.net,
    operationsCount: summary.ops,
    dailyGroups: dailyGroups,
    truncated: json['truncated'] == true,
    source: source,
  );
}
```

### 4.4 Дневной отчёт

```dart
CashboxReportViewModel normalizeDailyReport(
  Map<String, dynamic> json, {
  required String date,
  ReportDataSource source = ReportDataSource.backend,
}) {
  final summary = _readSummary(json);
  final flows = (json['flows'] as List? ?? [])
      .whereType<Map>()
      .toList()
      .asMap()
      .entries
      .map((e) => normalizeReportFlow(e.value.cast<String, dynamic>(), e.key))
      .toList();

  return CashboxReportViewModel(
    type: 'daily',
    date: json['date']?.toString() ?? date,
    totalIncome: summary.income,
    totalExpense: summary.expense,
    net: summary.net,
    operationsCount: summary.ops > 0 ? summary.ops : flows.length,
    flows: flows,
    truncated: json['truncated'] == true,
    source: source,
  );
}
```

### 4.5 Подпись месяца

```dart
const _ruMonths = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

String ymLabel(String ym) {
  final parts = ym.split('-');
  if (parts.length < 2) return ym;
  final y = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  if (y == null || m == null || m < 1 || m > 12) return ym;
  return '${_ruMonths[m - 1]} $y';
}
```

---

## 5. API-клиент с fallback

Логика 1:1 с `cashboxReportsApi.ts`:

```dart
class CashboxReportsRepository {
  CashboxReportsRepository(this._dio);
  final Dio _dio;

  static const fallbackPageSize = 200;
  static const fallbackMaxPages = 100;

  Future<CashboxReportViewModel> fetchMonthlyReport(
    String cashboxId,
    String month, {
    CashboxReportStatusFilter status = CashboxReportStatusFilter.approved,
  }) async {
    try {
      final res = await _dio.get(
        '/construction/cashboxes/$cashboxId/report/',
        queryParameters: {
          'period': 'month',
          'month': month,
          'status': status.name,
        },
      );
      return normalizeMonthlyReport(res.data as Map<String, dynamic>, month: month);
    } on DioException catch (e) {
      if (!_isNotImplemented(e)) rethrow;
      return _monthlyFallback(cashboxId, month, status);
    }
  }

  Future<CashboxReportViewModel> fetchDailyReport(
    String cashboxId,
    String date, {
    CashboxReportStatusFilter status = CashboxReportStatusFilter.approved,
  }) async {
    try {
      final res = await _dio.get(
        '/construction/cashboxes/$cashboxId/report/',
        queryParameters: {
          'period': 'day',
          'date': date,
          'status': status.name,
        },
      );
      return normalizeDailyReport(res.data as Map<String, dynamic>, date: date);
    } on DioException catch (e) {
      if (!_isNotImplemented(e)) rethrow;
      return _dailyFallback(cashboxId, date, status);
    }
  }

  Future<CashboxReportAnalyticsViewModel> fetchAnalytics({
    String? cashboxId,
    String? dateFrom,
    String? dateTo,
    CashboxReportStatusFilter status = CashboxReportStatusFilter.approved,
  }) async {
    final query = <String, dynamic>{
      'group_by': 'month',
      'status': status.name,
      if (cashboxId != null && cashboxId != 'ALL') 'cashbox': cashboxId,
      if (dateFrom != null) 'date_from': dateFrom,
      if (dateTo != null) 'date_to': dateTo,
    };

    try {
      final res = await _dio.get(
        '/construction/cashbox-reports/analytics/',
        queryParameters: query,
      );
      return normalizeAnalyticsResponse(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (!_isNotImplemented(e)) rethrow;
      return _analyticsFallback(
        cashboxId: cashboxId,
        dateFrom: dateFrom,
        dateTo: dateTo,
        status: status,
      );
    }
  }

  bool _isNotImplemented(DioException e) {
    final code = e.response?.statusCode;
    return code == 404 || code == 501;
  }
}
```

### Когда показывать предупреждение truncated

```dart
bool shouldWarnReportTruncated({required bool truncated, ReportDataSource? source}) =>
    truncated; // веб предупреждает и при backend truncated, и при fallback лимите
```

Текст (как на вебе):

> Загружены не все операции за период (лимит отчёта). Уточните период или обратитесь к администратору.

---

## 6. Экран: отчёт одной кассы

### 6.1 Карта UI

```text
┌─────────────────────────────────────────────┐
│ Tabs: [Ежемесячный] [Дневной]               │
├─────────────────────────────────────────────┤
│ Фильтр: month picker / date picker          │
├─────────────────────────────────────────────┤
│ KPI: Приход | Расход | Итого                │
├─────────────────────────────────────────────┤
│ Месячный: блоки по дням (новые дни сверху)   │
│   └ таблица: Тип | Наименование | Сумма | Время
│ Дневной: одна таблица операций              │
└─────────────────────────────────────────────┘
```

### 6.2 Загрузка

```dart
Future<void> loadReport({
  required String cashboxId,
  required String reportType, // 'monthly' | 'daily'
  required String selectedMonth,
  required String selectedDate,
}) async {
  setState(() => _loading = true);
  try {
    final report = reportType == 'monthly'
        ? await repo.fetchMonthlyReport(cashboxId, selectedMonth)
        : await repo.fetchDailyReport(cashboxId, selectedDate);

    if (shouldWarnReportTruncated(
      truncated: report.truncated,
      source: report.source,
    )) {
      _showWarning(truncatedMessage);
    }
    setState(() => _report = report);
  } catch (e) {
    _showError('Не удалось загрузить отчёт');
    setState(() => _report = null);
  } finally {
    setState(() => _loading = false);
  }
}
```

Перезагрузка при смене: `reportType`, `selectedMonth`, `selectedDate`, `cashboxId`.

### 6.3 Отображение месячного отчёта

- Сортировка дней: **новые сверху** (веб: `sort by date DESC`).
- Внутри дня flows — по `created_at` ASC (если бэк уже отсортировал — не пересортировывать).
- Колонка «Тип»: `income` → «Приход», `expense` → «Расход».
- Время: `HH:mm` в локали `ru`.

### 6.4 Пустые состояния

| Ситуация | UI |
|----------|-----|
| Загрузка | «Загрузка отчета...» |
| Нет данных за день | «Нет операций за выбранную дату» |
| Ошибка сети | Сообщение из `detail` или дефолт |

---

## 7. Экран: аналитика

Маршрут: `/crm/kassa/reports` (на Flutter — отдельный экран «Аналитика кассы»).

### 7.1 Контролы

| Элемент | Поведение |
|---------|-----------|
| Select кассы | `ALL` = все кассы компании |
| Период | `6m` / `ytd` / `12m` — вычисляет `date_from`/`date_to` на клиенте |
| Диапазон дат | Если задан — **отключает** preset-период |
| Фильтр месяца | Локальный поиск по `label` (напр. «Июл») |
| Печать | Опционально (на вебе `window.print()`) |

### 7.2 Preset-периоды → date bounds

```dart
({String dateFrom, String dateTo}) computePeriodBounds({
  required String period, // '6m' | 'ytd' | '12m'
  String? dateFrom,
  String? dateTo,
}) {
  if (dateFrom != null || dateTo != null) {
    return (dateFrom: dateFrom ?? '', dateTo: dateTo ?? '');
  }
  final today = DateTime.now();
  final end = _formatDate(today);

  if (period == '6m') {
    final start = DateTime(today.year, today.month - 5, 1);
    return (dateFrom: _formatDate(start), dateTo: end);
  }
  if (period == '12m') {
    final start = DateTime(today.year, today.month - 11, 1);
    return (dateFrom: _formatDate(start), dateTo: end);
  }
  // ytd
  return (dateFrom: '${today.year}-01-01', dateTo: end);
}
```

### 7.3 KPI и таблица

- KPI на экране считаются по **видимым** группам после фильтра периода/поиска (как `visibleSummary` на вебе).
- Таблица: Месяц | Приход | Расход | Итог | Операций.
- График: две линии (income / expense) — опционально на Flutter.

### 7.4 Загрузка списка касс

```http
GET /construction/cashboxes/
```

Для dropdown: `id`, `name`, опционально `department_name`.

---

## 8. Legacy fallback

До выката бэкенд-эндпоинтов (`404` / `501`):

1. Пагинировать `GET /construction/cashflows/`:
   - `page_size = 200`
   - max **100** страниц (~20 000 записей)
2. Фильтры: `cashbox`, `status`, `date_from`, `date_to`
3. Агрегировать на клиенте (как `buildMonthlyReportFallback` / `buildDailyReportFallback` на вебе)
4. `source = fallback`, при обрезке `truncated = true`

**После выката бэка:** один HTTP-запрос, без цикла `cashflows?page=1,2,3…`.

Проверка в DevTools / Charles:
- ✅ `GET .../cashboxes/{id}/report/?period=month`
- ❌ десятки запросов `GET .../cashflows/?page=`

---

## 9. Ошибки и truncated

| HTTP | Когда | Flutter |
|------|-------|---------|
| `400` | нет `period`, неверная дата | показать `detail` |
| `403` | нет прав | «Нет доступа к кассе» |
| `404` | касса не найдена / эндпоинт не реализован | fallback или ошибка |
| `501` | не реализовано | fallback |

| Поле | Значение |
|------|----------|
| `truncated: true` | не все flows в ответе (лимит бэка или fallback) |
| `complete: false` | синоним partial data |

**Не** пересчитывать `net` на клиенте, если бэк отдал `summary.net` — использовать его; fallback может считать локально.

---

## 10. Отличие от других «отчётов»

| Модуль | API | Назначение |
|--------|-----|------------|
| **Касса → Отчёты** (этот док) | `/construction/cashboxes/{id}/report/` | Cashflows одной кассы |
| **Касса → Аналитика** | `/construction/cashbox-reports/analytics/` | Помесячная сводка |
| **Смены** `/crm/shifts/:id` | `/construction/shifts/{id}/` | Продажи смены, `payment_breakdown` — см. [cash-and-cashflows.md](./cash-and-cashflows.md) |
| **Кафе** | `/crm/cafe/reports` | Другой сектор |

---

## 11. Чеклист Flutter

### API

- [ ] `fetchMonthlyReport(cashboxId, month)` → `GET .../report/?period=month`
- [ ] `fetchDailyReport(cashboxId, date)` → `GET .../report/?period=day`
- [ ] `fetchAnalytics(...)` → `GET .../cashbox-reports/analytics/`
- [ ] Fallback при `404`/`501` на paginated cashflows
- [ ] `status=approved` по умолчанию

### Парсеры

- [ ] `toReportNumber` — строки, запятая, пробелы
- [ ] `normalizeReportFlow` — aliases `name`/`title`, `created_at`/`created`
- [ ] Месячный: `days[]` и `daily_groups`
- [ ] `ymLabel` для подписей месяцев
- [ ] `source: backend | fallback` в view model

### UI — отчёт кассы

- [ ] Вкладки monthly / daily
- [ ] Month picker / date picker
- [ ] KPI: приход, расход, итого
- [ ] Месячный: группы по дням, дни DESC
- [ ] Таблица: тип, название, сумма, время
- [ ] Loading / empty / error states
- [ ] Toast при `truncated`

### UI — аналитика

- [ ] Select кассы + «Все кассы»
- [ ] Presets 6m / ytd / 12m + custom date range
- [ ] Таблица по месяцам + KPI
- [ ] Локальный фильтр по названию месяца

### QA

- [ ] С working BE: один запрос на отчёт (не N× cashflows)
- [ ] Totals BE vs fallback на staging — расхождение 0
- [ ] Пустой месяц → KPI нули, пустые списки, HTTP 200
- [ ] Операция 23:59 +06:00 попадает в правильный день

---

## Связанные документы

| Документ | Тема |
|----------|------|
| [cash-and-cashflows.md](./cash-and-cashflows.md) | Денежные операции, cashflows, смены |
| [cashbox-reports-backend.md](../backend/kassa/cashbox-reports-backend.md) | Контракт для бэкенда |
