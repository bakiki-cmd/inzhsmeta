/**
 * @fileoverview Конфигурация мягких контурных и контекстных предупреждений.
 * Строго соответствует разделу 4.3 Мастер-спецификации v1.3.
 */

export const WARNING_CODES = Object.freeze({
  SLAB_THICKNESS_HIGH: 'SLAB_THICKNESS_HIGH',
  STRIP_WIDTH_HIGH: 'STRIP_WIDTH_HIGH',
  STRIP_HEIGHT_HIGH: 'STRIP_HEIGHT_HIGH',
  WALL_HEIGHT_HIGH: 'WALL_HEIGHT_HIGH',
  COLUMN_DIAMETER_HIGH: 'COLUMN_DIAMETER_HIGH',
  COLUMN_HEIGHT_HIGH: 'COLUMN_HEIGHT_HIGH',
  LINEAR_DIMENSION_HIGH: 'LINEAR_DIMENSION_HIGH',
  LARGE_ORDER_VOLUME: 'LARGE_ORDER_VOLUME',
  CONTEXT_STRIP_MODE_B: 'CONTEXT_STRIP_MODE_B',
  CONTEXT_WALL_OPENINGS: 'CONTEXT_WALL_OPENINGS',
  CONTEXT_APPROX_DENSITY: 'CONTEXT_APPROX_DENSITY'
});

/**
 * Геометрические и объёмные пороги срабатывания предупреждений (в метрах и м³).
 * Срабатывание происходит при строгом превышении (> threshold).
 */
export const WARNING_THRESHOLDS = Object.freeze({
  slabThicknessMax: 1,       // Толщина плиты > 1 м
  stripWidthMax: 2,          // Ширина ленты > 2 м
  stripHeightMax: 5,         // Высота ленты > 5 м
  wallHeightMax: 20,         // Высота стены > 20 м
  columnDiameterMax: 2,      // Диаметр колонны > 2 м
  columnHeightMax: 20,       // Высота колонны > 20 м
  linearDimensionMax: 100,   // Любая длина/ширина конструкции > 100 м
  orderVolumeMax: 1000       // Объём заказа V_order > 1000 м³
});

/**
 * Тексты предупреждений согласно разделу 4.3 спецификации.
 */
export const WARNING_MESSAGES_RU = Object.freeze({
  // Геометрические предупреждения
  [WARNING_CODES.SLAB_THICKNESS_HIGH]:
    'Толщина плиты превышает 1 м. Проверьте, что размер введён в метрах, а не в сантиметрах или миллиметрах.',
  [WARNING_CODES.STRIP_WIDTH_HIGH]:
    'Ширина ленты превышает 2 м. Проверьте единицы измерения (размеры вводятся в метрах).',
  [WARNING_CODES.STRIP_HEIGHT_HIGH]:
    'Высота ленты превышает 5 м. Проверьте правильность введённого значения.',
  [WARNING_CODES.WALL_HEIGHT_HIGH]:
    'Высота стены превышает 20 м. Убедитесь в корректности введённых размеров.',
  [WARNING_CODES.COLUMN_DIAMETER_HIGH]:
    'Диаметр колонны превышает 2 м. Проверьте, что значение указано в метрах.',
  [WARNING_CODES.COLUMN_HEIGHT_HIGH]:
    'Высота колонны превышает 20 м. Проверьте правильность введённого значения.',
  [WARNING_CODES.LINEAR_DIMENSION_HIGH]:
    'Линейный размер конструкции превышает 100 м. Проверьте единицы измерения (метры).',

  // Предупреждение о большом объёме (строгий текст из п. 4.3)
  [WARNING_CODES.LARGE_ORDER_VOLUME]:
    'Большой объём. Проверьте введённые размеры и единицы измерения. Если расчёт верен, разделите заказ на этапы или уточните объём у поставщика бетона.',

  // Обязательные контекстные предупреждения (строгий текст из п. 4.3)
  [WARNING_CODES.CONTEXT_STRIP_MODE_B]:
    'Расположение лент относительно друг друга не проверяется.',
  [WARNING_CODES.CONTEXT_WALL_OPENINGS]:
    'Положение проёмов на стене не проверяется. Убедитесь, что они не пересекаются и расположены внутри стены.',
  [WARNING_CODES.CONTEXT_APPROX_DENSITY]:
    'Используется приблизительная плотность. Фактическая плотность зависит от состава и характеристик бетона.'
});

/**
 * Создаёт стандартный объект предупреждения.
 * @param {string} code - Код предупреждения из WARNING_CODES.
 * @param {string|null} [field=null] - Поле, к которому относится предупреждение (если применимо).
 * @returns {{ code: string, field: string|null, message: string }}
 */
export function createWarning(code, field = null) {
  return {
    code,
    field,
    message: WARNING_MESSAGES_RU[code] || ''
  };
}
