
const MastersPager = ({ page, total, onChange }) => {
  if (total <= 1) return null;
  const onPrev = () => onChange(Math.max(1, page - 1));
  const onNext = () => onChange(Math.min(total, page + 1));
  const pages = new Set([1, page - 1, page, page + 1, total]);
  const list = [...pages]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  return (
    <nav className="barbermasters__pager" aria-label="Пагинация">
      <button
        className="barbermasters__pageBtn"
        onClick={onPrev}
        disabled={page === 1}
      >
        Назад
      </button>
      <ul className="barbermasters__pageList">
        {list.map((n, i) => {
          const prev = list[i - 1];
          const gap = prev && n - prev > 1;
          return (
            <div key={n} className="barbermasters__pageItemWrap">
              {gap && <li className="barbermasters__dots">…</li>}
              <li>
                <button
                  className={`barbermasters__pageBtn ${
                    n === page ? "is-active" : ""
                  }`}
                  aria-current={n === page ? "page" : undefined}
                  onClick={() => onChange(n)}
                >
                  {n}
                </button>
              </li>
            </div>
          );
        })}
      </ul>
      <button
        className="barbermasters__pageBtn"
        onClick={onNext}
        disabled={page === total}
      >
        Далее
      </button>
    </nav>
  );
};

export default MastersPager;
