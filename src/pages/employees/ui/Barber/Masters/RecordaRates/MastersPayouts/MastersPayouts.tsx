// MastersPayouts.jsx
import { useEffect, useState } from "react";
import "./MastersPayouts.scss";

import { MastersPayoutsContainer } from "./components";
import {
  pad2,
  loadBarbershopData,
  loadRatesForPeriod,
  persistRatesForPeriod,
} from "./MastersPayoutsUtils";

const MastersPayouts = () => {
  const now = new Date();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const periodLabel = `${year}-${pad2(month)}`;

  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState("");
  const [rates, setRates] = useState<any>({});

  const setRateValue = (barberId, field, value) => {
    const raw = String(value).trim();
    if (raw === "") {
      setRates((prev: any) => ({
        ...prev,
        [barberId]: { ...(prev[barberId] || {}), [field]: "" },
      }));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    setRates((prev: any) => ({
      ...prev,
      [barberId]: { ...(prev[barberId] || {}), [field]: n },
    }));
  };

  useEffect(() => {
    (async () => {
      setRatesLoading(true);
      setRatesError("");
      try {
        const {
          appointments: apps,
          employees: emps,
          services: svcs,
        } = await loadBarbershopData();

        setAppointments(apps);
        setEmployees(emps);
        setServices(svcs);

        const map = await loadRatesForPeriod(periodLabel);
        setRates(map);
      } catch (e: any) {
        console.error(e);
        setRatesError("Не удалось загрузить ставки мастеров.");
        setRates({});
      } finally {
        setRatesLoading(false);
      }
    })();
     
  }, []);

  useEffect(() => {
    (async () => {
      setRatesLoading(true);
      setRatesError("");
      try {
        const map = await loadRatesForPeriod(periodLabel);
        setRates(map);
      } catch (e: any) {
        console.error(e);
        setRatesError("Не удалось загрузить ставки мастеров.");
        setRates({});
      } finally {
        setRatesLoading(false);
      }
    })();
     
  }, [year, month]);

  const handleSaveRates = async ({ totalFund }: any) => {
    setRatesLoading(true);
    setRatesError("");
    try {
      const newRates = await persistRatesForPeriod(periodLabel, rates, totalFund);
      setRates(newRates);
    } catch (e: any) {
      console.error(e);
      setRatesError("Не удалось сохранить ставки мастеров.");
    } finally {
      setRatesLoading(false);
    }
  };

  return (
    <div className="barbermasterspayouts">
      <MastersPayoutsContainer
        year={year}
        month={month}
        onChangeYear={setYear}
        onChangeMonth={setMonth}
        employees={employees}
        appointments={appointments}
        services={services}
        rates={rates}
        ratesLoading={ratesLoading}
        ratesError={ratesError}
        onChangeRate={setRateValue}
        onSaveRates={handleSaveRates}
      />
    </div>
  );
};

export default MastersPayouts;
