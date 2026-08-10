import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { countries } from "@shared/config/data/countries";

const CountryField = ({ country, onChange }: any) => {
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCountryDropdown(false);
        setCountrySearchTerm("");
      }
    };

    if (showCountryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCountryDropdown]);

  const filteredCountries = useMemo(() => {
    if (!countrySearchTerm.trim()) {
      return countries;
    }
    const searchLower = countrySearchTerm.toLowerCase();
    return countries.filter((c: any) =>
      c.name.toLowerCase().includes(searchLower),
    );
  }, [countrySearchTerm]);

  const handleSelectCountry = (countryName: any) => {
    onChange(countryName);
    setShowCountryDropdown(false);
    setCountrySearchTerm("");
  };

  return (
    <div className="market-product-form__section">
      <h3 className="market-product-form__section-title">
        Страна производства товара
      </h3>
      <div
        className="market-product-form__country-wrapper"
        ref={countryDropdownRef}
      >
        <div
          className="market-product-form__country-select"
          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
        >
          <div className="market-product-form__country-select-input">
            {country ? (
              <span>
                {countries.find((c: any) => c.name === country)?.flag} {country}
              </span>
            ) : (
              <span className="market-product-form__country-placeholder">
                Выберите страну
              </span>
            )}
          </div>
          <ChevronDown
            size={20}
            className={`market-product-form__country-chevron ${
              showCountryDropdown ? "open" : ""
            }`}
          />
        </div>
        {showCountryDropdown && (
          <div className="market-product-form__country-dropdown">
            <div className="market-product-form__country-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Поиск страны..."
                value={countrySearchTerm}
                onChange={(e) => setCountrySearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="market-product-form__country-list">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c: any) => (
                  <div
                    key={c.code}
                    className={`market-product-form__country-item ${
                      country === c.name ? "selected" : ""
                    }`}
                    onClick={() => handleSelectCountry(c.name)}
                  >
                    <span className="market-product-form__country-flag">
                      {c.flag}
                    </span>
                    <span className="market-product-form__country-name">
                      {c.name}
                    </span>
                  </div>
                ))
              ) : (
                <div className="market-product-form__country-no-results">
                  Страна не найдена
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryField;
