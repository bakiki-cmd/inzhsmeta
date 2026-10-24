/**
 * @fileoverview Сценарий 1: Расчёт бетонной плиты с конструктивом опалубки.
 */

import { ERROR_CODES } from '../../config/messages-ru.js';
import {
  WARNING_CODES,
  WARNING_THRESHOLDS,
  createWarning
} from '../../config/warnings-config.js';
import {
  validateLinearDimension,
  validateIntegerCount
} from '../../core/validation.js';
import { parseNumberString } from '../../core/number-parser.js';

export function validateSlab(rawValues = {}) {
  const errors = [];
  const warnings = [];

  const errLength = validateLinearDimension(rawValues.length, 'length');
  if (errLength) errors.push(errLength);

  const errWidth = validateLinearDimension(rawValues.width, 'width');
  if (errWidth) errors.push(errWidth);

  const errThickness = validateLinearDimension(rawValues.thickness, 'thickness');
  if (errThickness) errors.push(errThickness);

  const errCount = validateIntegerCount(rawValues.count, 'count');
  if (errCount) errors.push(errCount);

  if (errors.length > 0) {
    return { errors, warnings: [], values: null };
  }

  const values = {
    length: parseNumberString(rawValues.length).value,
    width: parseNumberString(rawValues.width).value,
    thickness: parseNumberString(rawValues.thickness).value,
    count: parseNumberString(rawValues.count).value
  };

  if (values.thickness > WARNING_THRESHOLDS.slabThicknessMax) {
    warnings.push(createWarning(WARNING_CODES.SLAB_THICKNESS_HIGH, 'thickness'));
  }
  if (
    values.length > WARNING_THRESHOLDS.linearDimensionMax ||
    values.width > WARNING_THRESHOLDS.linearDimensionMax
  ) {
    warnings.push(createWarning(WARNING_CODES.LINEAR_DIMENSION_HIGH, 'length'));
  }

  return { errors: [], warnings, values };
}

export function computeSlab(values) {
  const { length, width, thickness, count } = values;
  const volume = length * width * thickness * count;

  // Конструктивные параметры плиты
  const footprintArea = length * width * count;
  const perimeter = 2 * (length + width) * count;
  const formworkArea = perimeter * thickness;

  return {
    volume,
    steps: [
      {
        label: 'Объём плит(ы)',
        expression: `${length} × ${width} × ${thickness} × ${count}`,
        value: volume,
        unit: 'м³'
      }
    ],
    structural: {
      title: 'Конструктивные параметры плиты',
      items: [
        { label: 'Площадь подошвы (застройки)', value: footprintArea, unit: 'м²' },
        { label: 'Периметр плиты', value: perimeter, unit: 'м' },
        { label: 'Площадь боковой опалубки', value: formworkArea, unit: 'м²' }
      ]
    }
  };
}

export const slabScenario = Object.freeze({
  id: 'slab',
  title: 'Расчёт бетона для плиты',
  formulaText: 'Объём = Длина × Ширина × Толщина × Количество',
  validate: validateSlab,
  compute: computeSlab
});

