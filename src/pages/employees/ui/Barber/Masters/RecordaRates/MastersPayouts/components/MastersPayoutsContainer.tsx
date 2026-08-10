// MastersPayoutsContainer.jsx
import RecordaRates from "../../RecordaRates";

const MastersPayoutsContainer = ({
  year,
  month,
  onChangeYear,
  onChangeMonth,
  employees,
  appointments,
  services,
  rates,
  ratesLoading,
  ratesError,
  onChangeRate,
  onSaveRates,
}: any) => {
  const Rates = RecordaRates as any;
  return (
    <div className="barbermasterspayouts__inner">
      <Rates
        year={year}
        month={month}
        onChangeYear={onChangeYear}
        onChangeMonth={onChangeMonth}
        employees={employees}
        appointments={appointments}
        services={services}
        rates={rates}
        ratesLoading={ratesLoading}
        ratesError={ratesError}
        onChangeRate={onChangeRate}
        onSaveRates={onSaveRates}
      />
    </div>
  );
};

export default MastersPayoutsContainer;
