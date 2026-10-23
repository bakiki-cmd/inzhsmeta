/**
 * @fileoverview Модуль парсинга и строгой нормализации строковых чисел.
 * Раздел 3.2 Мастер-спецификации v1.3.
 */

import { ERROR_CODES } from '../config/messages-ru.js';

// Строгая регулярка: знак минус (опционально), целая часть, разделитель точка/запятая и дробная часть
const STRICT_NUMBER_REGEX = /^-?\d+([.,]\d+)?$/;

/**
 * Подсчитывает число знаков после запятой/точки в строке.
 * @param {string} rawString
 * @returns {number}
 */
export function countDecimals(rawString) {
  if (typeof rawString !== 'string') return 0;
  const cleaned = rawString.trim().replace(',', '.');
  const parts = cleaned.split('.');
  return parts.length > 1 ? parts[1].length : 0;
}

/**
 * Парсит строковое значение в число с проверкой по белому списку символов.
 * @param {unknown} rawValue
 * @returns {{ value: number | null, rawTrimmed: string, error: { code: string } | null }}
 */
export function parseNumberString(rawValue) {
  if (rawValue === undefined || rawValue === null) {
    return { value: null, rawTrimmed: '', error: { code: ERROR_CODES.FIELD_REQUIRED } };
  }

  const rawTrimmed = String(rawValue).trim();

  if (rawTrimmed === '') {
    return { value: null, rawTrimmed: '', error: { code: ERROR_CODES.FIELD_REQUIRED } };
  }

  if (!STRICT_NUMBER_REGEX.test(rawTrimmed)) {
    return { value: null, rawTrimmed, error: { code: ERROR_CODES.INVALID_NUMBER } };
  }

  const normalized = rawTrimmed.replace(',', '.');
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return { value: null, rawTrimmed, error: { code: ERROR_CODES.NON_FINITE_RESULT } };
  }

  return { value: parsed, rawTrimmed, error: null };
}
