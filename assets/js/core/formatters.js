/**
 * @fileoverview Модуль адаптивного форматирования строительных величин (ru-RU).
 * Умное округление: скрывает лишние нули у целых чисел, выдает 1–2 знака для дробей.
 */

function formatSmartNumber(val, maxDecimals = 2, minDecimals = 0) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals
  }).format(val);
}

/**
 * Форматирует объём в м³.
 * Целые — без запятой (12 м³), дробные — до 2 знаков (12,6 м³), сверхмалые — до 3 знаков (0,045 м³).
 */
export function formatVolumeM3(val, withUnit = true) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  if (val > 0 && val < 0.001) return 'Менее 0,001 м³';

  const maxDigits = (val > 0 && val < 0.1) ? 3 : (Number.isInteger(val) ? 0 : 2);
  const formatted = formatSmartNumber(val, maxDigits, 0);
  return withUnit ? `${formatted} м³` : formatted;
}

/**
 * Форматирует линейные размеры и периметры в метрах.
 */
export function formatDimensionM(val, withUnit = true) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  const maxDigits = Number.isInteger(val) ? 0 : 2;
  const formatted = formatSmartNumber(val, maxDigits, 0);
  return withUnit ? `${formatted} м` : formatted;
}

/**
 * Форматирует площади (подошва, опалубка, стены) в м².
 */
export function formatAreaM2(val, withUnit = true) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  const maxDigits = Number.isInteger(val) ? 0 : 2;
  const formatted = formatSmartNumber(val, maxDigits, 0);
  return withUnit ? `${formatted} м²` : formatted;
}

/**
 * Форматирует массу в тоннах (до 2 знаков для дроби, целые — без нулей).
 */
export function formatMassTons(val, withUnit = true) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  const maxDigits = Number.isInteger(val) ? 0 : (val < 10 ? 2 : 1);
  const formatted = formatSmartNumber(val, maxDigits, 0);
  return withUnit ? `${formatted} т` : formatted;
}

/**
 * Форматирует массу в килограммах (округляет до целого кг без дробей).
 */
export function formatMassKg(val, withUnit = true) {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  const formatted = formatSmartNumber(Math.round(val), 0, 0);
  return withUnit ? `${formatted} кг` : formatted;
}

/**
 * Форматирует денежные суммы в рублях.
 */
export function formatCurrencyRub(val, withUnit = true) {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  const maxDigits = Number.isInteger(val) ? 0 : 2;
  const formatted = formatSmartNumber(val, maxDigits, 0);
  return withUnit ? `${formatted} руб.` : formatted;
}
