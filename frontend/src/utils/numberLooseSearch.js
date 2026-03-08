const ENGLISH_DIGITS = "0123456789";
const BANGLA_DIGITS = "\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF";
const LOOSE_SYMBOLS_REGEX = /[\s\/\*\.\+\-\(\)]+/g;

const toEnglishDigits = (value) => {
  const input = String(value || "");
  return input.replace(/[\u09E6-\u09EF]/g, (char) => {
    const idx = BANGLA_DIGITS.indexOf(char);
    return idx >= 0 ? ENGLISH_DIGITS[idx] : char;
  });
};

const stripLooseSymbols = (value) => String(value || "").replace(LOOSE_SYMBOLS_REGEX, "").trim();
const normalizeLoose = (value) => stripLooseSymbols(toEnglishDigits(String(value || "").toLowerCase()));

export const includesLooseNumber = (text, query) => {
  const q = normalizeLoose(query);
  if (!q) return true;
  return normalizeLoose(text).includes(q);
};

export const includesLooseNumberInAny = (values, query) =>
  (Array.isArray(values) ? values : []).some((value) => includesLooseNumber(value, query));
