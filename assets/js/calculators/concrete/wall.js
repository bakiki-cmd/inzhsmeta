/**
 * @fileoverview Сценарий 3: Расчёт стены с прямоугольными проёмами.
 */

import { ERROR_CODES } from '../../config/messages-ru.js';
import {
  WARNING_CODES,
  WARNING_THRESHOLDS,
  createWarning
} from '../../config/warnings-config.js';
import {
  validateLinearDimension,
  validateIntegerCount,
  EPS,
  isExceedingWithEps
} from '../../core/validation.js';
import { parseNumberString } from '../../core/number-parser.js';

export function validateWall(rawValues = {}) {
  const errors = [];
  const warnings = [createWarning(WARNING_CODES.CONTEXT_WALL_OPENINGS)];

  const errLength = validateLinearDimension(rawValues.length, 'length');
  if (errLength) errors.push(errLength);

  const errThickness = validateLinearDimension(rawValues.thickness, 'thickness');
  if (errThickness) errors.push(errThickness);

  const errHeight = validateLinearDimension(rawValues.height, 'height');
  if (errHeight) errors.push(errHeight);

  if (errors.length > 0) {
    return { errors, warnings: [], values: null };
  }

  const length = parseNumberString(rawValues.length).value;
  const thickness = parseNumberString(rawValues.thickness).value;
  const height = parseNumberString(rawValues.height).value;

  const rawOpenings = Array.isArray(rawValues.openings) ? rawValues.openings : [];
  if (rawOpenings.length > 100) {
    errors.push({
      field: 'openings',
      code: ERROR_CODES.MAX_RECORDS_EXCEEDED,
      params: { max: 100 }
    });
    return { errors, warnings: [], values: null };
  }

  const parsedOpenings = [];
  let totalOpeningsArea = 0;

  for (let i = 0; i < rawOpenings.length; i++) {
    const opening = rawOpenings[i];
    const prefix = `openings[${i}]`;

    const errW = validateLinearDimension(opening.width, `${prefix}.width`);
    if (errW) errors.push(errW);

    const errH = validateLinearDimension(opening.height, `${prefix}.height`);
    if (errH) errors.push(errH);

    const errC = validateIntegerCount(opening.count, `${prefix}.count`);
    if (errC) errors.push(errC);

    if (!errW && !errH && !errC) {
      const w = parseNumberString(opening.width).value;
      const h = parseNumberString(opening.height).value;
      const c = parseNumberString(opening.count).value;

      if (isExceedingWithEps(w, length) || isExceedingWithEps(h, height)) {
        errors.push({
          field: `${prefix}`,
          code: ERROR_CODES.OPENING_SIZE_EXCEEDED,
          params: {}
        });
      } else {
        totalOpeningsArea += w * h * c;
        parsedOpenings.push({ width: w, height: h, count: c });
      }
    }
  }

  const wallArea = length * height;

  if (isExceedingWithEps(totalOpeningsArea, wallArea)) {
    errors.push({
      field: 'openings',
      code: ERROR_CODES.OPENINGS_AREA_EXCEEDED,
      params: {}
    });
  }

  const grossVolume = wallArea * thickness;
  const openingsVolume = totalOpeningsArea * thickness;
  const netVolume = grossVolume - openingsVolume;

  if (netVolume <= EPS) {
    errors.push({
      field: 'openings',
      code: ERROR_CODES.NET_VOLUME_NOT_POSITIVE,
      params: {}
    });
  }

  if (errors.length > 0) {
    return { errors, warnings: [], values: null };
  }

  if (height > WARNING_THRESHOLDS.wallHeightMax) {
    warnings.push(createWarning(WARNING_CODES.WALL_HEIGHT_HIGH, 'height'));
  }
  if (length > WARNING_THRESHOLDS.linearDimensionMax) {
    warnings.push(createWarning(WARNING_CODES.LINEAR_DIMENSION_HIGH, 'length'));
  }

  const values = {
    length,
    thickness,
    height,
    openings: parsedOpenings
  };

  return { errors: [], warnings, values };
}

export function computeWall(values) {
  const { length, thickness, height, openings } = values;
  const grossVolume = length * thickness * height;
  const grossArea = length * height;
  const openingArea = openings.reduce((sum, o) => sum + (o.width * o.height * o.count), 0);
  const netArea = grossArea - openingArea;
  const openingsVolume = openingArea * thickness;
  const volume = grossVolume - openingsVolume;
  const formworkArea = 2 * netArea;

  return {
    volume,
    steps: [
      {
        label: 'Объём стены до вычета проёмов',
        expression: `${length} × ${thickness} × ${height}`,
        value: grossVolume,
        unit: 'м³'
      },
      {
        label: 'Суммарная площадь проёмов',
        expression: 'Σ(width × height × count)',
        value: openingArea,
        unit: 'м²'
      },
      {
        label: 'Объём проёмов',
        expression: `${openingArea} × ${thickness}`,
        value: openingsVolume,
        unit: 'м³'
      },
      {
        label: 'Чистый объём стены',
        expression: `${grossVolume} − ${openingsVolume}`,
        value: volume,
        unit: 'м³'
      }
    ],
    structural: {
      title: 'Конструктивные параметры стены',
      items: [
        { label: 'Чистая площадь стены (без проёмов)', value: netArea, unit: 'м²' },
        { label: 'Суммарная площадь проёмов', value: openingArea, unit: 'м²' },
        { label: 'Площадь опалубки (с двух сторон)', value: formworkArea, unit: 'м²' }
      ]
    }
  };
}

export const wallScenario = Object.freeze({
  id: 'wallWithOpenings',
  title: 'Расчёт стены с проёмами',
  formulaText: 'Чистый объём = (Площадь стены − Площадь проёмов) × Толщина',
  validate: validateWall,
  compute: computeWall
});
