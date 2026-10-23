/**
 * @fileoverview Реестр сценариев строительных калькуляторов.
 * Разделы 2.2 и 4.1 Мастер-спецификации v1.3.
 */

import { slabScenario } from './calculators/concrete/slab.js';
import { stripFoundationAScenario } from './calculators/concrete/strip-foundation-a.js';
import { stripFoundationBScenario } from './calculators/concrete/strip-foundation-b.js';
import { wallScenario } from './calculators/concrete/wall.js';
import { circularColumnsScenario } from './calculators/concrete/circular-columns.js';
import { rectangularColumnsScenario } from './calculators/concrete/rectangular-columns.js';
import { rectangularVolumeScenario } from './calculators/concrete/rectangular-volume.js';

export const SCENARIOS = Object.freeze({
  slab: slabScenario,
  stripFoundationA: stripFoundationAScenario,
  stripFoundationB: stripFoundationBScenario,
  wallWithOpenings: wallScenario,
  circularColumn: circularColumnsScenario,
  rectangularColumn: rectangularColumnsScenario,
  rectangularVolume: rectangularVolumeScenario
});

/**
 * Получить модуль сценария по ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getScenario(id) {
  return SCENARIOS[id] || null;
}

/**
 * Список сценариев для переключателя калькулятора бетона.
 */
export const CONCRETE_SCENARIO_LIST = Object.freeze([
  { id: 'slab', title: 'Плита', icon: 'plate' },
  { id: 'stripFoundation', title: 'Ленточный фундамент', icon: 'strip' },
  { id: 'wallWithOpenings', title: 'Стена с проёмами', icon: 'wall' },
  { id: 'circularColumn', title: 'Круглые колонны', icon: 'circle-col' },
  { id: 'rectangularColumn', title: 'Прямоугольные колонны', icon: 'rect-col' },
  { id: 'rectangularVolume', title: 'Свободный объём', icon: 'cube' }
]);
