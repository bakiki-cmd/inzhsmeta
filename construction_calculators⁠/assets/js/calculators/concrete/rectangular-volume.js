/**
 * @fileoverview Сценарий 6: Свободный прямоугольный объём.
 */

import {
  WARNING_CODES,
  WARNING_THRESHOLDS,
  createWarning
} from '../../config/warnings-config.js';
import { validateLinearDimension } from '../../core/validation.js';
import { parseNumberString } from '../../core/number-parser.js';

export function validateRectangularVolume(rawValues = {}) {
  const errors = [];
  const warnings = [];

  const errLength = validateLinearDimension(rawValues.length, 'length');
  if (errLength) errors.push(errLength);

  const errWidth = validateLinearDimension(rawValues.width, 'width');
  if (errWidth) errors.push(errWidth);

  const errHeight = validateLinearDimension(rawValues.height, 'height');
  if (errHeight) errors.push(errHeight);

  if (errors.length > 0) {
    return { errors, warnings: [], values: null };
  }

  const values = {
    length: parseNumberString(rawValues.length).value,
    width: parseNumberString(rawValues.width).value,
    height: parseNumberString(rawValues.height).value
  };

  if (
    values.length > WARNING_THRESHOLDS.linearDimensionMax ||
    values.width > WARNING_THRESHOLDS.linearDimensionMax ||
    values.height > WARNING_THRESHOLDS.linearDimensionMax
  ) {
    warnings.push(createWarning(WARNING_CODES.LINEAR_DIMENSION_HIGH, 'length'));
  }

  return { errors: [], warnings, values };
}

export function computeRectangularVolume(values) {
  const { length, width, height } = values;
  const volume = length * width * height;
  const baseArea = length * width;
  const perimeter = 2 * (length + width);
  const lateralArea = perimeter * height;

  return {
    volume,
    steps: [
      {
        label: 'Объём прямоугольного пространства',
        expression: `${length} × ${width} × ${height}`,
        value: volume,
        unit: 'м³'
      }
    ],
    structural: {
      title: 'Геометрические параметры объекта',
      items: [
        { label: 'Площадь основания', value: baseArea, unit: 'м²' },
        { label: 'Периметр основания', value: perimeter, unit: 'м' },
        { label: 'Площадь боковых поверхностей', value: lateralArea, unit: 'м²' }
      ]
    }
  };
}

export const rectangularVolumeScenario = Object.freeze({
  id: 'rectangularVolume',
  title: 'Свободный прямоугольный объём',
  formulaText: 'Объём = Длина × Ширина × Высота',
  validate: validateRectangularVolume,
  compute: computeRectangularVolume
});
