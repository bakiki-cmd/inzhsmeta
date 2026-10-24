/**
 * @fileoverview Модуль валидации числовых параметров и допусков.
 * Разделы 3.3 и 3.4 Мастер-спецификации v1.3.
 */

import { ERROR_CODES } from '../config/messages-ru.js';
import { parseNumberString, countDecimals } from './number-parser.js';

/** Абсолютный геометрический допуск IEEE 754 */
export const EPS = 1e-9;

/**
 * Валидирует линейный размер: (0, 1000] м, максимум 3 знака после запятой.
 * @param {string} rawValue
 * @param {string} fieldName
 * @param {number} [min=0]
 * @param {number} [max=1000]
 */
export function validateLinearDimension(rawValue, fieldName, min = 0, max = 1000) {
  const parsed = parseNumberString(rawValue);
  if (parsed.error) {
    return { field: fieldName, code: parsed.error.code, params: { min, max } };
  }

  if (countDecimals(parsed.rawTrimmed) > 3) {
    return { field: fieldName, code: ERROR_CODES.INVALID_DECIMAL_PLACES, params: { max: 3 } };
  }

  const val = parsed.value;
  if (val <= min || val > max) {
    return { field: fieldName, code: ERROR_CODES.VALUE_OUT_OF_RANGE, params: { min, max } };
  }

  return null;
}

/**
 * Валидирует целое положительное число: [min, max], 0 знаков после запятой.
 * @param {string} rawValue
 * @param {string} fieldName
 * @param {number} [min=1]
 * @param {number} [max=10000]
 */
export function validateIntegerCount(rawValue, fieldName, min = 1, max = 10000) {
  const parsed = parseNumberString(rawValue);
  if (parsed.error) {
    return { field: fieldName, code: parsed.error.code, params: { min, max } };
  }

  if (countDecimals(parsed.rawTrimmed) > 0 || !Number.isInteger(parsed.value)) {
    return { field: fieldName, code: ERROR_CODES.INVALID_INTEGER, params: { min, max } };
  }

  const val = parsed.value;
  if (val < min || val > max) {
    return { field: fieldName, code: ERROR_CODES.INVALID_INTEGER, params: { min, max } };
  }

  return null;
}

/**
 * Валидирует процент запаса: [0, 100] %, максимум 2 знака.
 * @param {string} rawValue
 * @param {string} [fieldName='reservePercent']
 */
export function validateReservePercent(rawValue, fieldName = 'reservePercent') {
  const parsed = parseNumberString(rawValue);
  if (parsed.error) {
    return { field: fieldName, code: parsed.error.code, params: { min: 0, max: 100 } };
  }

  if (countDecimals(parsed.rawTrimmed) > 2) {
    return { field: fieldName, code: ERROR_CODES.INVALID_DECIMAL_PLACES, params: { max: 2 } };
  }

  const val = parsed.value;
  if (val < 0 || val > 100) {
    return { field: fieldName, code: ERROR_CODES.VALUE_OUT_OF_RANGE, params: { min: 0, max: 100 } };
  }

  return null;
}

/**
 * Валидирует плотность бетона: [1, 10000] кг/м³, максимум 2 знака.
 * @param {string} rawValue
 * @param {string} [fieldName='densityKgM3']
 */
export function validateDensity(rawValue, fieldName = 'densityKgM3') {
  const parsed = parseNumberString(rawValue);
  if (parsed.error) {
    return { field: fieldName, code: parsed.error.code, params: { min: 1, max: 10000 } };
  }

  if (countDecimals(parsed.rawTrimmed) > 2) {
    return { field: fieldName, code: ERROR_CODES.INVALID_DECIMAL_PLACES, params: { max: 2 } };
  }

  const val = parsed.value;
  if (val < 1 || val > 10000) {
    return { field: fieldName, code: ERROR_CODES.VALUE_OUT_OF_RANGE, params: { min: 1, max: 10000 } };
  }

  return null;
}

/**
 * Валидирует цену за м³ (необязательное поле): [0.01, 1000000000] руб., максимум 2 знака.
 * @param {string} rawValue
 * @param {string} [fieldName='pricePerM3']
 */
export function validatePricePerM3(rawValue, fieldName = 'pricePerM3') {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return null; // Поле опционально
  }

  const parsed = parseNumberString(rawValue);
  if (parsed.error) {
    return { field: fieldName, code: parsed.error.code, params: { min: 0.01, max: 1000000000 } };
  }

  if (countDecimals(parsed.rawTrimmed) > 2) {
    return { field: fieldName, code: ERROR_CODES.INVALID_DECIMAL_PLACES, params: { max: 2 } };
  }

  const val = parsed.value;
  if (val < 0.01 || val > 1000000000) {
    return { field: fieldName, code: ERROR_CODES.VALUE_OUT_OF_RANGE, params: { min: 0.01, max: 1000000000 } };
  }

  return null;
}

/**
 * Проверка геометрического превышения с учётом погрешности IEEE 754: val > limit + EPS.
 * @param {number} val
 * @param {number} limit
 * @returns {boolean}
 */
export function isExceedingWithEps(val, limit) {
  return val > limit + EPS;
}
