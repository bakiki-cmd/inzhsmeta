/**
 * @fileoverview Общий модуль расчёта параметров заказа, логистики и сметы (Слой 4).
 */

import {
  WARNING_CODES,
  WARNING_THRESHOLDS,
  createWarning
} from '../config/warnings-config.js';
import { DEFAULT_MIXER_CAPACITY_M3 } from '../config/concrete-grades.js';

/**
 * @typedef {Object} OrderCalculationInput
 * @property {number} volumeM3 - Чистый геометрический объем V_clean (м³)
 * @property {number} [reservePercent=5] - Процент запаса (0..100 %)
 * @property {number} [densityKgM3=2400] - Плотность бетона (кг/м³)
 * @property {string} [gradeName='М300 (B22.5)'] - Название марки бетона
 * @property {number|null} [pricePerM3=null] - Цена за м³ (руб./м³)
 * @property {number} [mixerCapacityM3=7] - Вместимость одного миксера (м³)
 * @property {object|null} [structural=null] - Конструктивные данные (площадь, периметр, опалубка)
 */

export function calculateOrderResults({
  volumeM3,
  reservePercent = 5,
  densityKgM3 = 2415,
  gradeName = 'М300 (B22.5)',
  pricePerM3 = null,
  mixerCapacityM3 = DEFAULT_MIXER_CAPACITY_M3,
  structural = null
}) {
  const cleanVolumeM3 = volumeM3;
  const p = reservePercent;
  const rho = densityKgM3;

  // 1. Объём запаса и заказа
  const reserveVolumeM3 = cleanVolumeM3 * (p / 100);
  const orderVolumeM3 = cleanVolumeM3 + reserveVolumeM3;

  // 2. Расчёт миксеров (логистика)
  const mixersCount = orderVolumeM3 > 0 ? Math.ceil(orderVolumeM3 / mixerCapacityM3) : 0;
  const fullMixersCount = Math.floor(orderVolumeM3 / mixerCapacityM3);
  const remainderVolume = orderVolumeM3 % mixerCapacityM3;
  const lastMixerVolume = remainderVolume > 0.001 ? remainderVolume : (orderVolumeM3 > 0 ? mixerCapacityM3 : 0);

  // 3. Масса
  const cleanMassKg = cleanVolumeM3 * rho;
  const cleanMassTons = cleanMassKg / 1000;
  const orderMassKg = orderVolumeM3 * rho;
  const orderMassTons = orderMassKg / 1000;

  // 4. Стоимость
  const totalCost = (pricePerM3 !== null && pricePerM3 !== undefined && pricePerM3 > 0)
    ? orderVolumeM3 * pricePerM3
    : null;

  // 5. Предупреждения
  const warnings = [];
  if (orderVolumeM3 > WARNING_THRESHOLDS.orderVolumeMax) {
    warnings.push(createWarning(WARNING_CODES.LARGE_ORDER_VOLUME, 'orderVolume'));
  }

  return {
    cleanVolumeM3,
    reservePercent: p,
    reserveVolumeM3,
    orderVolumeM3,
    gradeName,
    logistics: {
      mixersCount,
      fullMixersCount,
      mixerCapacityM3,
      lastMixerVolume
    },
    cleanMassKg,
    cleanMassTons,
    orderMassKg,
    orderMassTons,
    pricePerM3,
    totalCost,
    structural,
    warnings
  };
}
