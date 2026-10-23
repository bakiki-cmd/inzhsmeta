/**
 * @fileoverview Сценарий 2 (Режим B): Контур с внутренними лентами.
 */

import { ERROR_CODES } from '../../config/messages-ru.js';
import {
  WARNING_CODES,
  WARNING_THRESHOLDS,
  createWarning
} from '../../config/warnings-config.js';
import {
  validateLinearDimension,
  EPS,
  isExceedingWithEps
} from '../../core/validation.js';
import { parseNumberString } from '../../core/number-parser.js';

export function validateStripFoundationB(rawValues = {}) {
  const errors = [];
  const warnings = [createWarning(WARNING_CODES.CONTEXT_STRIP_MODE_B)];

  const errOuterLength = validateLinearDimension(rawValues.outerLength, 'outerLength');
  if (errOuterLength) errors.push(errOuterLength);

  const errOuterWidth = validateLinearDimension(rawValues.outerWidth, 'outerWidth');
  if (errOuterWidth) errors.push(errOuterWidth);

  const errWidth = validateLinearDimension(rawValues.width, 'width');
  if (errWidth) errors.push(errWidth);

  const errHeight = validateLinearDimension(rawValues.height, 'height');
  if (errHeight) errors.push(errHeight);

  if (errors.length > 0) {
    return { errors, warnings: [], values: null };
  }

  const outerLength = parseNumberString(rawValues.outerLength).value;
  const outerWidth = parseNumberString(rawValues.outerWidth).value;
  const width = parseNumberString(rawValues.width).value;
  const height = parseNumberString(rawValues.height).value;

  const minSide = Math.min(outerLength, outerWidth);
  if (width >= (minSide / 2) - EPS) {
    errors.push({
      field: 'width',
      code: ERROR_CODES.STRIP_WIDTH_TOO_LARGE,
      params: {}
    });
    return { errors, warnings: [], values: null };
  }

  const innerLengthBound = outerLength - (2 * width);
  const innerWidthBound = outerWidth - (2 * width);

  const rawStrips = Array.isArray(rawValues.innerStrips) ? rawValues.innerStrips : [];
  if (rawStrips.length > 20) {
    errors.push({
      field: 'innerStrips',
      code: ERROR_CODES.MAX_RECORDS_EXCEEDED,
      params: { max: 20 }
    });
    return { errors, warnings: [], values: null };
  }

  const parsedStrips = [];
  let mainDirection = null;

  for (let i = 0; i < rawStrips.length; i++) {
    const item = rawStrips[i];
    const fieldPrefix = `innerStrips[${i}]`;

    if (!item.direction || (item.direction !== 'alongLength' && item.direction !== 'acrossWidth')) {
      errors.push({
        field: `${fieldPrefix}.direction`,
        code: ERROR_CODES.FIELD_REQUIRED,
        params: {}
      });
      continue;
    }

    if (mainDirection === null) {
      mainDirection = item.direction;
    } else if (mainDirection !== item.direction) {
      errors.push({
        field: `${fieldPrefix}.direction`,
        code: ERROR_CODES.STRIP_CROSSING_DIRECTIONS,
        params: {}
      });
    }

    const errLen = validateLinearDimension(item.length, `${fieldPrefix}.length`);
    if (errLen) {
      errors.push(errLen);
    } else {
      const parsedLen = parseNumberString(item.length).value;
      const maxAllowed = item.direction === 'alongLength' ? innerLengthBound : innerWidthBound;

      if (isExceedingWithEps(parsedLen, maxAllowed)) {
        errors.push({
          field: `${fieldPrefix}.length`,
          code: ERROR_CODES.STRIP_LENGTH_EXCEEDED,
          params: { val: parsedLen, max: maxAllowed }
        });
      }

      parsedStrips.push({ direction: item.direction, length: parsedLen });
    }
  }

  if (parsedStrips.length > 0 && mainDirection && errors.length === 0) {
    const transverseSize = mainDirection === 'alongLength' ? innerWidthBound : innerLengthBound;
    const totalStripsWidth = parsedStrips.length * width;

    if (isExceedingWithEps(totalStripsWidth, transverseSize)) {
      errors.push({
        field: 'innerStrips',
        code: ERROR_CODES.STRIP_SUM_WIDTH_EXCEEDED,
        params: {}
      });
    }
  }

  if (errors.length > 0) {
    return { errors, warnings: [], values: null };
  }

  if (width > WARNING_THRESHOLDS.stripWidthMax) {
    warnings.push(createWarning(WARNING_CODES.STRIP_WIDTH_HIGH, 'width'));
  }
  if (height > WARNING_THRESHOLDS.stripHeightMax) {
    warnings.push(createWarning(WARNING_CODES.STRIP_HEIGHT_HIGH, 'height'));
  }
  if (
    outerLength > WARNING_THRESHOLDS.linearDimensionMax ||
    outerWidth > WARNING_THRESHOLDS.linearDimensionMax
  ) {
    warnings.push(createWarning(WARNING_CODES.LINEAR_DIMENSION_HIGH, 'outerLength'));
  }

  const values = {
    outerLength,
    outerWidth,
    width,
    height,
    innerStrips: parsedStrips
  };

  return { errors: [], warnings, values };
}

export function computeStripFoundationB(values) {
  const { outerLength, outerWidth, width, height, innerStrips } = values;
  const perimeterLength = 2 * (outerLength + outerWidth) - 4 * width;
  const innerLength = innerStrips.reduce((sum, s) => sum + s.length, 0);
  const effectiveLength = perimeterLength + innerLength;
  const volume = effectiveLength * width * height;

  const buildingFootprint = outerLength * outerWidth;
  const concreteFootprint = effectiveLength * width;
  const formworkArea = 2 * effectiveLength * height;

  return {
    volume,
    steps: [
      {
        label: 'Длина наружного контура',
        expression: `2 × (${outerLength} + ${outerWidth}) − 4 × ${width}`,
        value: perimeterLength,
        unit: 'м'
      },
      {
        label: 'Суммарная длина внутренних лент',
        expression: 'ΣLi',
        value: innerLength,
        unit: 'м'
      },
      {
        label: 'Общая эффективная длина',
        expression: `${perimeterLength} + ${innerLength}`,
        value: effectiveLength,
        unit: 'м'
      },
      {
        label: 'Объём ленточного фундамента',
        expression: `${effectiveLength} × ${width} × ${height}`,
        value: volume,
        unit: 'м³'
      }
    ],
    structural: {
      title: 'Конструктивные параметры фундамента',
      items: [
        { label: 'Пятно застройки здания', value: buildingFootprint, unit: 'м²' },
        { label: 'Эффективная длина всех лент', value: effectiveLength, unit: 'м' },
        { label: 'Площадь подошвы ленты', value: concreteFootprint, unit: 'м²' },
        { label: 'Площадь опалубки (с двух сторон)', value: formworkArea, unit: 'м²' }
      ]
    }
  };
}

export const stripFoundationBScenario = Object.freeze({
  id: 'stripFoundationB',
  title: 'Ленточный фундамент (Контур со внутренними лентами)',
  formulaText: 'Объём = (Длина контура + Длина внутренних лент) × Ширина × Высота',
  validate: validateStripFoundationB,
  compute: computeStripFoundationB
});
