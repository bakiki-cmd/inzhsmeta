/**
 * @fileoverview Справочник стандартных марок бетона и параметров доставки.
 */

export const CONCRETE_GRADES = Object.freeze([
  { id: 'm150', name: 'М150 (B12.5)', density: 2380, desc: 'Подбетонка, садовые дорожки' },
  { id: 'm200', name: 'М200 (B15)', density: 2400, desc: 'Отмостки, стяжки, лёгкие фундаменты' },
  { id: 'm250', name: 'М250 (B20)', density: 2400, desc: 'Ленточные фундаменты под бани/заборы' },
  { id: 'm300', name: 'М300 (B22.5)', density: 2415, desc: 'Плиты, ленты, сваи (хит частного домостроения)', isDefault: true },
  { id: 'm350', name: 'М350 (B25)', density: 2430, desc: 'Плиты перекрытий, чаши бассейнов, колонны' },
  { id: 'm400', name: 'М400 (B30)', density: 2450, desc: 'Высокопрочные цоколи, мостовые конструкции' },
  { id: 'custom', name: 'Своя плотность', density: null, desc: 'Ручной ввод плотности (кг/м³)' }
]);

export const DEFAULT_GRADE_ID = 'm300';

/** Вместимость типового автобетоносмесителя (миксера) по умолчанию в м³ */
export const DEFAULT_MIXER_CAPACITY_M3 = 7;

/**
 * Получить данные марки по её id.
 * @param {string} id
 */
export function getGradeById(id) {
  return CONCRETE_GRADES.find(g => g.id === id) || CONCRETE_GRADES.find(g => g.isDefault);
}
