const ENGLISH_DIGITS = "0123456789";
const BANGLA_DIGITS = "\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF";
const LOOSE_SYMBOLS_REGEX = /[\s\/\*\.\+\-\(\)]+/g;

const replaceDigits = (value, fromDigits, toDigits) => {
  const input = String(value || "");
  return input.replace(/[0-9\u09E6-\u09EF]/g, (ch) => {
    const idx = fromDigits.indexOf(ch);
    return idx >= 0 ? toDigits[idx] : ch;
  });
};

const toEnglishDigits = (value) => replaceDigits(value, BANGLA_DIGITS, ENGLISH_DIGITS);
const toBanglaDigits = (value) => replaceDigits(value, ENGLISH_DIGITS, BANGLA_DIGITS);

const stripLooseSymbols = (value) => String(value || "").replace(LOOSE_SYMBOLS_REGEX, "").trim();

const buildLooseNumberVariants = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const english = toEnglishDigits(raw);
  const bangla = toBanglaDigits(raw);

  return Array.from(
    new Set([
      raw,
      english,
      bangla,
      stripLooseSymbols(raw),
      stripLooseSymbols(english),
      stripLooseSymbols(bangla),
    ].filter(Boolean))
  );
};

const buildContainsOr = (fields, value, extra = {}) => {
  const variants = buildLooseNumberVariants(value);
  return variants.flatMap((term) =>
    fields.map((field) => ({
      [field]: {
        contains: term,
        ...extra,
      },
    }))
  );
};

module.exports = {
  toEnglishDigits,
  toBanglaDigits,
  stripLooseSymbols,
  buildLooseNumberVariants,
  buildContainsOr,
};
