/**
 * @fileoverview Сценарий 5: Расчёт прямоугольных колонн.
 */

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

export function validateRectangularColumns(rawValues = {}) {
  const errors = [];
  const warnings = [];

  const errSideA = validateLinearDimension(rawValues.sideA, 'sideA');
  if (errSideA) errors.push(errSideA);

  const errSideB = validateLinearDimension(rawValues.sideB, 'sideB');
  if (errSideB) errors.push(errSideB);

  const errHeight = validateLinearDimension(rawValues.height, 'height');
  if (errHeight) errors.push(errHeight);

  const errCount = validateIntegerCount(rawValues.count, 'count');
  if (errCount) errors.push(errCount);

  if (errors.length > 0) {
    return { errors, warnings: [], values: null };
  }

  const values = {
    sideA: parseNumberString(rawValues.sideA).value,
    sideB: parseNumberString(rawValues.sideB).value,
    height: parseNumberString(rawValues.height).value,
    count: parseNumberString(rawValues.count).value
  };

  if (
    values.sideA > WARNING_THRESHOLDS.linearDimensionMax ||
    values.sideB > WARNING_THRESHOLDS.linearDimensionMax
  ) {
    warnings.push(createWarning(WARNING_CODES.LINEAR_DIMENSION_HIGH, 'sideA'));
  }
  if (values.height > WARNING_THRESHOLDS.columnHeightMax) {
    warnings.push(createWarning(WARNING_CODES.COLUMN_HEIGHT_HIGH, 'height'));
  }

  return { errors: [], warnings, values };
}

export function computeRectangularColumns(values) {
  const { sideA, sideB, height, count } = values;
  const oneBaseArea = sideA * sideB;
  const oneVolume = oneBaseArea * height;
  const volume = oneVolume * count;
  const totalBaseArea = oneBaseArea * count;
  const perimeter = 2 * (sideA + sideB);
  const totalFormworkArea = perimeter * height * count;

  return {
    volume,
    steps: [
      {
        label: 'Объём одной колонны',
        expression: `${sideA} × ${sideB} × ${height}`,
        value: oneVolume,
        unit: 'м³'
      },
      {
        label: 'Общий объём колонн',
        expression: `${oneVolume} × ${count}`,
        value: volume,
        unit: 'м³'
      }
    ],
    structural: {
      title: 'Конструктивные параметры колонн',
      items: [
        { label: 'Суммарная площадь опирания', value: totalBaseArea, unit: 'м²' },
        { label: 'Площадь боковой опалубки', value: totalFormworkArea, unit: 'м²' }
      ]
    }
  };
}

export const rectangularColumnsScenario = Object.freeze({
  id: 'rectangularColumn',
  title: 'Прямоугольные колонны',
  formulaText: 'Объём = Сторона A × Сторона B × Высота × Количество',
  validate: validateRectangularColumns,
  compute: computeRectangularColumns
});
