import React, { useEffect, useMemo, useRef, useState } from "react";

const SearchableSelect = ({
  name,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  disabled = false,
  required = false,
  className = "",
}) => {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  );

  useEffect(() => {
    setQuery(selectedOption?.label || "");
  }, [selectedOption]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        setQuery(selectedOption?.label || "");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [selectedOption]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const emitChange = (nextValue) => {
    onChange({
      target: {
        name,
        value: nextValue,
      },
    });
  };

  const handleSelect = (option) => {
    emitChange(option.value);
    setQuery(option.label);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        type="text"
        name={`${name}_search`}
        value={query}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          if (!next) emitChange("");
        }}
        placeholder={placeholder}
        disabled={disabled}
        required={required && !value}
        className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 outline-0"
      />

      <input type="hidden" name={name} value={value || ""} />

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              emitChange("");
              setQuery("");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 border-b"
          >
            Clear selection
          </button>

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                  option.value === value ? "bg-blue-100 text-blue-700" : "text-gray-700"
                }`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
