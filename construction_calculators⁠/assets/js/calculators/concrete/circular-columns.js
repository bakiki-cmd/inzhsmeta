/**
 * @fileoverview Сценарий 4: Расчёт круглых колонн.
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

export function validateCircularColumns(rawValues = {}) {
  const errors = [];
  const warnings = [];

  const errDiameter = validateLinearDimension(rawValues.diameter, 'diameter');
  if (errDiameter) errors.push(errDiameter);

  const errHeight = validateLinearDimension(rawValues.height, 'height');
  if (errHeight) errors.push(errHeight);

  const errCount = validateIntegerCount(rawValues.count, 'count');
  if (errCount) errors.push(errCount);

  if (errors.length > 0) {
    return { errors, warnings: [], values: null };
  }

  const values = {
    diameter: parseNumberString(rawValues.diameter).value,
    height: parseNumberString(rawValues.height).value,
    count: parseNumberString(rawValues.count).value
  };

  if (values.diameter > WARNING_THRESHOLDS.columnDiameterMax) {
    warnings.push(createWarning(WARNING_CODES.COLUMN_DIAMETER_HIGH, 'diameter'));
  }
  if (values.height > WARNING_THRESHOLDS.columnHeightMax) {
    warnings.push(createWarning(WARNING_CODES.COLUMN_HEIGHT_HIGH, 'height'));
  }

  return { errors: [], warnings, values };
}

export function computeCircularColumns(values) {
  const { diameter, height, count } = values;
  const radius = diameter / 2;
  const oneBaseArea = Math.PI * radius * radius;
  const oneVolume = oneBaseArea * height;
  const volume = oneVolume * count;
  const totalBaseArea = oneBaseArea * count;
  const totalFormworkArea = Math.PI * diameter * height * count;

  return {
    volume,
    steps: [
      {
        label: 'Радиус колонны',
        expression: `${diameter} / 2`,
        value: radius,
        unit: 'м'
      },
      {
        label: 'Объём одной колонны',
        expression: `π × ${radius}² × ${height}`,
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
        { label: 'Площадь опалубки (боковая поверхность)', value: totalFormworkArea, unit: 'м²' }
      ]
    }
  };
}

export const circularColumnsScenario = Object.freeze({
  id: 'circularColumn',
  title: 'Круглые колонны',
  formulaText: 'Объём = π × (Диаметр / 2)² × Высота × Количество',
  validate: validateCircularColumns,
  compute: computeCircularColumns
});
