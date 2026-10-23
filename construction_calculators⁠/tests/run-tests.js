/**
 * @fileoverview Приёмочный тест-раннер по эталонной таблице Раздела 7.
 */

import { SCENARIOS } from '../assets/js/calculator-registry.js';
import { calculateOrderResults } from '../assets/js/core/result-calculator.js';

const DELTA = 1e-7;

function isClose(actual, expected) {
  return Math.abs(actual - expected) < DELTA;
}

export function runAcceptanceTests() {
  const results = [];

  function test(name, actual, expected, unit = 'м³') {
    const passed = isClose(actual, expected);
    results.push({
      name,
      actual,
      expected,
      passed,
      diff: Math.abs(actual - expected),
      unit
    });
  }

  // 1. Плита (slab)
  test('Плита #1 (10×8×0.2, N=1)', SCENARIOS.slab.compute({ length: 10, width: 8, thickness: 0.2, count: 1 }).volume, 16.000);
  test('Плита #2 (5×3×0.15, N=2)', SCENARIOS.slab.compute({ length: 5, width: 3, thickness: 0.15, count: 2 }).volume, 4.500);
  test('Плита #3 (2×1.5×0.1, N=4)', SCENARIOS.slab.compute({ length: 2, width: 1.5, thickness: 0.1, count: 4 }).volume, 1.200);

  // 2. Лента Режим A (stripFoundationA)
  test('Лента A #1 (L=36, b=0.4, h=1.2)', SCENARIOS.stripFoundationA.compute({ effectiveLength: 36, width: 0.4, height: 1.2 }).volume, 17.280);
  test('Лента A #2 (L=20, b=0.3, h=0.8)', SCENARIOS.stripFoundationA.compute({ effectiveLength: 20, width: 0.3, height: 0.8 }).volume, 4.800);
  test('Лента A #3 (L=48, b=0.4, h=1.0)', SCENARIOS.stripFoundationA.compute({ effectiveLength: 48, width: 0.4, height: 1.0 }).volume, 19.200);

  // 3. Лента Режим B (stripFoundationB)
  test('Лента B #1 (10×8, b=0.4, h=1.2, без внутр.)', SCENARIOS.stripFoundationB.compute({ outerLength: 10, outerWidth: 8, width: 0.4, height: 1.2, innerStrips: [] }).volume, 16.512);
  test('Лента B #2 (10×8, b=0.4, h=1.2, +1 внутр. 9.2м)', SCENARIOS.stripFoundationB.compute({
    outerLength: 10,
    outerWidth: 8,
    width: 0.4,
    height: 1.2,
    innerStrips: [{ direction: 'alongLength', length: 9.2 }]
  }).volume, 20.928);

  // 4. Стена с проёмами (wallWithOpenings)
  test('Стена #1 (6×0.2×2.7, без проёмов)', SCENARIOS.wallWithOpenings.compute({ length: 6, thickness: 0.2, height: 2.7, openings: [] }).volume, 3.240);
  test('Стена #2 (6×0.2×2.7 + 2 окна 1.2×1.4)', SCENARIOS.wallWithOpenings.compute({
    length: 6,
    thickness: 0.2,
    height: 2.7,
    openings: [{ width: 1.2, height: 1.4, count: 2 }]
  }).volume, 2.568);
  test('Стена #3 (8×0.25×3 + дверь 0.9×2.1 + 2 окна 1.5×1.2)', SCENARIOS.wallWithOpenings.compute({
    length: 8,
    thickness: 0.25,
    height: 3,
    openings: [
      { width: 0.9, height: 2.1, count: 1 },
      { width: 1.5, height: 1.2, count: 2 }
    ]
  }).volume, 4.6275);

  // 5. Круглые колонны (circularColumn)
  test('Круглая колонна #1 (D=0.3, H=3, N=4)', SCENARIOS.circularColumn.compute({ diameter: 0.3, height: 3, count: 4 }).volume, 0.27 * Math.PI);
  test('Круглая колонна #2 (D=0.4, H=2.5, N=1)', SCENARIOS.circularColumn.compute({ diameter: 0.4, height: 2.5, count: 1 }).volume, 0.1 * Math.PI);
  test('Круглая колонна #3 (D=0.2, H=3, N=6)', SCENARIOS.circularColumn.compute({ diameter: 0.2, height: 3, count: 6 }).volume, 0.18 * Math.PI);

  // 6. Прямоугольные колонны (rectangularColumn)
  test('Прямоуг. колонна #1 (0.4×0.4×3, N=1)', SCENARIOS.rectangularColumn.compute({ sideA: 0.4, sideB: 0.4, height: 3, count: 1 }).volume, 0.480);
  test('Прямоуг. колонна #2 (0.3×0.5×2.8, N=4)', SCENARIOS.rectangularColumn.compute({ sideA: 0.3, sideB: 0.5, height: 2.8, count: 4 }).volume, 1.680);
  test('Прямоуг. колонна #3 (0.25×0.25×3.2, N=2)', SCENARIOS.rectangularColumn.compute({ sideA: 0.25, sideB: 0.25, height: 3.2, count: 2 }).volume, 0.400);

  // 7. Свободный прямоугольный объём (rectangularVolume)
  test('Свободный объём #1 (2×2×1)', SCENARIOS.rectangularVolume.compute({ length: 2, width: 2, height: 1 }).volume, 4.000);
  test('Свободный объём #2 (3.5×1.2×0.4)', SCENARIOS.rectangularVolume.compute({ length: 3.5, width: 1.2, height: 0.4 }).volume, 1.680);
  test('Свободный объём #3 (1.5×0.8×0.25)', SCENARIOS.rectangularVolume.compute({ length: 1.5, width: 0.8, height: 0.25 }).volume, 0.300);

  // 8. Контрольный тест общего модуля заказа (result-calculator.js)
  const orderRes = calculateOrderResults({
    volumeM3: 16.0,
    reservePercent: 5,
    densityKgM3: 2400,
    pricePerM3: 7000
  });

  test('Модуль заказа: Объём запаса', orderRes.reserveVolumeM3, 0.800, 'м³');
  test('Модуль заказа: Объём заказа (V_order)', orderRes.orderVolumeM3, 16.800, 'м³');
  test('Модуль заказа: Масса без запаса (кг)', orderRes.cleanMassKg, 38400.0, 'кг');
  test('Модуль заказа: Масса без запаса (т)', orderRes.cleanMassTons, 38.400, 'т');
  test('Модуль заказа: Масса заказа (кг)', orderRes.orderMassKg, 40320.0, 'кг');
  test('Модуль заказа: Масса заказа (т)', orderRes.orderMassTons, 40.320, 'т');
  test('Модуль заказа: Стоимость заказа', orderRes.totalCost, 117600.00, 'руб.');

  return results;
}
