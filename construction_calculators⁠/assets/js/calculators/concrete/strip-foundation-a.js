/**
 * @fileoverview Сценарий 2 (Режим A): Ленточный фундамент по эффективной длине.
 */

import {
  WARNING_CODES,
  WARNING_THRESHOLDS,
  createWarning
} from '../../config/warnings-config.js';
import { validateLinearDimension } from '../../core/validation.js';
import { parseNumberString } from '../../core/number-parser.js';

export function validateStripFoundationA(rawValues = {}) {
  const errors = [];
  const warnings = [];

  const errLength = validateLinearDimension(rawValues.effectiveLength, 'effectiveLength');
  if (errLength) errors.push(errLength);

  const errWidth = validateLinearDimension(rawValues.width, 'width');
  if (errWidth) errors.push(errWidth);

  const errHeight = validateLinearDimension(rawValues.height, 'height');
  if (errHeight) errors.push(errHeight);

  if (errors.length > 0) {
    return { errors, warnings: [], values: null };
  }

  const values = {
    effectiveLength: parseNumberString(rawValues.effectiveLength).value,
    width: parseNumberString(rawValues.width).value,
    height: parseNumberString(rawValues.height).value
  };

  if (values.width > WARNING_THRESHOLDS.stripWidthMax) {
    warnings.push(createWarning(WARNING_CODES.STRIP_WIDTH_HIGH, 'width'));
  }
  if (values.height > WARNING_THRESHOLDS.stripHeightMax) {
    warnings.push(createWarning(WARNING_CODES.STRIP_HEIGHT_HIGH, 'height'));
  }
  if (values.effectiveLength > WARNING_THRESHOLDS.linearDimensionMax) {
    warnings.push(createWarning(WARNING_CODES.LINEAR_DIMENSION_HIGH, 'effectiveLength'));
  }

  return { errors: [], warnings, values };
}

export function computeStripFoundationA(values) {
  const { effectiveLength, width, height } = values;
  const volume = effectiveLength * width * height;

  const footprintArea = effectiveLength * width;
  const formworkArea = 2 * effectiveLength * height; // Опалубка с обеих сторон ленты

  return {
    volume,
    steps: [
      {
        label: 'Объём ленточного фундамента',
        expression: `${effectiveLength} × ${width} × ${height}`,
        value: volume,
        unit: 'м³'
      }
    ],
    structural: {
      title: 'Конструктивные параметры ленты',
      items: [
        { label: 'Суммарная длина ленты', value: effectiveLength, unit: 'м' },
        { label: 'Площадь опирания на грунт', value: footprintArea, unit: 'м²' },
        { label: 'Площадь опалубки (с двух сторон)', value: formworkArea, unit: 'м²' }
      ]
    }
  };
}

export const stripFoundationAScenario = Object.freeze({
  id: 'stripFoundationA',
  title: 'Ленточный фундамент (Эффективная длина)',
  formulaText: 'Объём = Эффективная длина × Ширина × Высота',
  validate: validateStripFoundationA,
  compute: computeStripFoundationA
});
