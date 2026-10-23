/**
 * @fileoverview Локализованный словарь ошибок, предупреждений и текстов интерфейса (RU).
 * Строго соответствует разделу 4.2 и 4.3 Мастер-спецификации v1.3.
 */

export const ERROR_CODES = Object.freeze({
  FIELD_REQUIRED: 'FIELD_REQUIRED',
  INVALID_NUMBER: 'INVALID_NUMBER',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
  INVALID_INTEGER: 'INVALID_INTEGER',
  INVALID_DECIMAL_PLACES: 'INVALID_DECIMAL_PLACES',
  STRIP_WIDTH_TOO_LARGE: 'STRIP_WIDTH_TOO_LARGE',
  STRIP_LENGTH_EXCEEDED: 'STRIP_LENGTH_EXCEEDED',
  STRIP_CROSSING_DIRECTIONS: 'STRIP_CROSSING_DIRECTIONS',
  STRIP_SUM_WIDTH_EXCEEDED: 'STRIP_SUM_WIDTH_EXCEEDED',
  MAX_RECORDS_EXCEEDED: 'MAX_RECORDS_EXCEEDED',
  OPENING_SIZE_EXCEEDED: 'OPENING_SIZE_EXCEEDED',
  OPENINGS_AREA_EXCEEDED: 'OPENINGS_AREA_EXCEEDED',
  NET_VOLUME_NOT_POSITIVE: 'NET_VOLUME_NOT_POSITIVE',
  NON_FINITE_RESULT: 'NON_FINITE_RESULT'
});

export const ERROR_MESSAGES_RU = Object.freeze({
  [ERROR_CODES.FIELD_REQUIRED]: 'Заполните это поле.',
  [ERROR_CODES.INVALID_NUMBER]: 'Введите корректное число. Используйте точку или запятую.',
  [ERROR_CODES.VALUE_OUT_OF_RANGE]: 'Значение должно быть больше {min} и не превышать {max} м.',
  [ERROR_CODES.INVALID_INTEGER]: 'Введите целое число от {min} до {max}.',
  [ERROR_CODES.INVALID_DECIMAL_PLACES]: 'Превышено количество знаков после запятой (максимум {max}).',
  [ERROR_CODES.STRIP_WIDTH_TOO_LARGE]: 'Ширина ленты слишком велика. Она должна быть меньше половины меньшей стороны дома.',
  [ERROR_CODES.STRIP_LENGTH_EXCEEDED]: 'Длина внутренней ленты ({val} м) превышает допустимый максимум {max} м.',
  [ERROR_CODES.STRIP_CROSSING_DIRECTIONS]: 'Внутренние ленты направлены по-разному. В одном расчёте все ленты должны идти в одном направлении.',
  [ERROR_CODES.STRIP_SUM_WIDTH_EXCEEDED]: 'Суммарная ширина внутренних лент превышает доступный внутренний размер дома.',
  [ERROR_CODES.MAX_RECORDS_EXCEEDED]: 'Превышено максимальное количество записей (максимум {max}).',
  [ERROR_CODES.OPENING_SIZE_EXCEEDED]: 'Размеры проёма не должны превышать размеры стены.',
  [ERROR_CODES.OPENINGS_AREA_EXCEEDED]: 'Суммарная площадь проёмов превышает площадь стены.',
  [ERROR_CODES.NET_VOLUME_NOT_POSITIVE]: 'После вычитания проёмов чистый объём стены должен оставаться положительным.',
  [ERROR_CODES.NON_FINITE_RESULT]: 'Ошибка вычисления: получен некорректный числовой результат.'
});

/**
 * Форматирует сообщение по коду ошибки, подставляя параметры {min}, {max}, {val}.
 * @param {string} code - Код ошибки из ERROR_CODES.
 * @param {Record<string, string|number>} [params={}] - Параметры для подстановки.
 * @returns {string} Готовое сообщение на русском языке.
 */
export function formatErrorMessage(code, params = {}) {
  const template = ERROR_MESSAGES_RU[code];
  if (!template) {
    return 'Произошла неизвестная ошибка валидации.';
  }

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(params, key)
      ? String(params[key])
      : match;
  });
}
