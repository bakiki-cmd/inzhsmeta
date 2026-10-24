/**
 * Единый модуль плитного фундамента.
 * Часть 1 — расчётное ядро; часть 2 — расчёт и DOM; часть 3 — SVG, печать и спецификация.
 * Конструктивные проверки имеют статус предварительных и не заменяют проект КЖ.
 */

// ================================ ЧАСТЬ 1. ЯДРО ================================

const REBAR_WEIGHT_MAP = Object.freeze({
  6: 0.222, 8: 0.395, 10: 0.617, 12: 0.888, 14: 1.208,
  16: 1.578, 18: 1.998, 20: 2.466, 22: 2.984, 25: 3.853
});

const MODEL_CONSTANTS = Object.freeze({
  ASSUMED_CONCRETE_DENSITY_KG_M3: 2500,
  GRAVITY_G: 9.80665,
  ASSUMED_COVER_M: 0.040,
  LAP_DIAMETERS_FACTOR: 50,
  REBAR_WASTE_FACTOR: 1.04,
  U_PIN_LEG_LENGTH_M: 0.40,
  FROG_TOP_SHELF_M: 0.25,
  FROG_FOOT_LENGTH_M: 0.20,
  FROGS_PER_M2: 1.5,
  CHAIRS_PER_M2: 5,
  WIRE_LEN_PER_NODE_M: 0.30,
  WIRE_LINEAR_WEIGHT_KG_M: 0.00888,
  BRACE_STEP_M: 0.60,
  BRACE_STAKE_LEN_M: 0.50,
  TIMBER_WASTE_FACTOR: 1.05,
  TIMBER_STOCK_LEN_M: 3.0,
  TIMBER_SECTION_M: 0.05,
  ASSUMED_MIXER_CAPACITY_M3: 7,
  MANUAL_MIX_DRY_MASS_KG_PER_M3: 2200,
  MANUAL_MIX_WATER_CEMENT_RATIO: 0.55,
  CEMENT_BAG_MASS_KG: 50,
  WIRE_DIAMETER_MM: 1.2
});

const PASSPORT_SCOPE = Object.freeze({
  SUPPORTED_LAYERS: Object.freeze([1, 2]),
  MIN_SIDE_M: 2.0, MAX_SIDE_M: 30.0, ABSOLUTE_MAX_SIDE_M: 100.0,
  MIN_THICKNESS_MM: 150, MAX_THICKNESS_MM: 500,
  ABSOLUTE_MAX_THICKNESS_MM: 2000,
  MIN_STEP_MM: 100, MAX_STEP_MM: 300,
  MAX_RESERVE_PERCENT: 25, ABSOLUTE_MAX_RESERVE_PERCENT: 100,
  RECOMMENDED_MAIN_DIAS: Object.freeze([10, 12, 14, 16]),
  RECOMMENDED_CLAMP_DIAS: Object.freeze([6, 8, 10]),
  STANDARD_STOCK_LENGTHS_M: Object.freeze([6.0, 11.7]),
  MIN_BOARD_WIDTH_MM: 100, MAX_BOARD_WIDTH_MM: 250,
  MIN_BOARD_THICK_MM: 25, MAX_BOARD_THICK_MM: 60,
  MIN_BOARD_LENGTH_M: 3.0, MAX_BOARD_LENGTH_M: 6.5
});

const GEOM_EPS = 1e-9;
function ceilEps(x) { return Math.ceil(x - GEOM_EPS); }

function validateSlabInputs(inp) {
  const hardErrors = [];
  const scopeWarnings = [];
  if (!inp || typeof inp !== 'object' || Array.isArray(inp)) {
    return { isValid: false, isWithinPassportScope: false,
      hardErrors: ['Не передан корректный объект входных параметров расчёта.'], scopeWarnings: [] };
  }
  if (!Number.isFinite(inp.length) || inp.length <= 0 || inp.length > PASSPORT_SCOPE.ABSOLUTE_MAX_SIDE_M)
    hardErrors.push(`Длина плиты A должна быть в диапазоне от 0 до ${PASSPORT_SCOPE.ABSOLUTE_MAX_SIDE_M} м.`);
  if (!Number.isFinite(inp.width) || inp.width <= 0 || inp.width > PASSPORT_SCOPE.ABSOLUTE_MAX_SIDE_M)
    hardErrors.push(`Ширина плиты B должна быть в диапазоне от 0 до ${PASSPORT_SCOPE.ABSOLUTE_MAX_SIDE_M} м.`);

  const thicknessIsValid = Number.isFinite(inp.thicknessMm) && inp.thicknessMm > 0 &&
    inp.thicknessMm <= PASSPORT_SCOPE.ABSOLUTE_MAX_THICKNESS_MM &&
    Number.isFinite(inp.thicknessM) && inp.thicknessM > 0 &&
    inp.thicknessM <= PASSPORT_SCOPE.ABSOLUTE_MAX_THICKNESS_MM / 1000;
  if (!thicknessIsValid) {
    hardErrors.push(`Толщина плиты h должна быть больше 0 и не превышать ${PASSPORT_SCOPE.ABSOLUTE_MAX_THICKNESS_MM} мм.`);
  } else if (Math.abs(inp.thicknessM * 1000 - inp.thicknessMm) > 1e-4) {
    hardErrors.push(`Рассогласование единиц толщины: thicknessM (${inp.thicknessM} м) не равно thicknessMm (${inp.thicknessMm} мм).`);
  }
  if (!Number.isFinite(inp.reservePercent) || inp.reservePercent < 0 || inp.reservePercent > PASSPORT_SCOPE.ABSOLUTE_MAX_RESERVE_PERCENT)
    hardErrors.push(`Технологический запас бетона должен быть от 0% до ${PASSPORT_SCOPE.ABSOLUTE_MAX_RESERVE_PERCENT}%.`);
  if (!Number.isInteger(inp.layers) || !PASSPORT_SCOPE.SUPPORTED_LAYERS.includes(inp.layers))
    hardErrors.push(`Калькулятор поддерживает только 1 или 2 сетки (получено: ${inp.layers}).`);
  if (!Number.isInteger(inp.mainDia) || !Object.prototype.hasOwnProperty.call(REBAR_WEIGHT_MAP, inp.mainDia))
    hardErrors.push(`Недопустимый диаметр рабочей арматуры: Ø${inp.mainDia} мм.`);
  if (!Number.isInteger(inp.clampsDia) || !Object.prototype.hasOwnProperty.call(REBAR_WEIGHT_MAP, inp.clampsDia))
    hardErrors.push(`Недопустимый диаметр вспомогательной арматуры: Ø${inp.clampsDia} мм.`);
  if (!Number.isFinite(inp.stepXM) || inp.stepXM <= 0 || !Number.isFinite(inp.stepYM) || inp.stepYM <= 0)
    hardErrors.push('Заданный шаг сетки по осям X и Y должен быть больше нуля.');
  if (!Number.isFinite(inp.stockLengthM) || inp.stockLengthM <= 0 || inp.stockLengthM > 50)
    hardErrors.push('Длина товарного хлыста арматуры задана некорректно.');
  if (!Number.isFinite(inp.boardWidthMm) || inp.boardWidthMm <= 0 || !Number.isFinite(inp.boardThickMm) || inp.boardThickMm <= 0 ||
      !Number.isFinite(inp.boardLengthM) || inp.boardLengthM <= 0)
    hardErrors.push('Размеры пиломатериала опалубки должны быть положительными конечными числами.');
  if (hardErrors.length) return { isValid: false, isWithinPassportScope: false, hardErrors, scopeWarnings };

  const coverM = MODEL_CONSTANTS.ASSUMED_COVER_M;
  const coverMm = coverM * 1000;
  const dMainMm = inp.mainDia;
  const aAxisM = coverM + (dMainMm / 1000) / 2;
  const B_axes = inp.width - 2 * aAxisM;
  const L_axes = inp.length - 2 * aAxisM;
  if (B_axes <= 0 || L_axes <= 0)
    hardErrors.push(`Габариты плиты (${inp.length}×${inp.width} м) меньше двойного расстояния до оси крайнего стержня (${(2 * aAxisM).toFixed(3)} м).`);
  const h0_X_mm = inp.thicknessMm - coverMm - (dMainMm / 2);
  const h0_Y_mm = inp.thicknessMm - coverMm - dMainMm - (dMainMm / 2);
  if (h0_X_mm <= 0 || h0_Y_mm <= 0)
    hardErrors.push(`Толщина плиты (${inp.thicknessMm} мм) недостаточна для нижней сетки Ø${inp.mainDia} мм (h0 ≤ 0).`);
  if (inp.layers === 1) {
    const topCoverMm = inp.thicknessMm - coverMm - 2 * dMainMm;
    if (topCoverMm < coverMm)
      hardErrors.push(`При толщине ${inp.thicknessMm} мм верхний защитный слой над 1 сеткой (${topCoverMm.toFixed(1)} мм) меньше минимума ${coverMm} мм.`);
  } else if (inp.layers === 2) {
    const clearGapMm = inp.thicknessMm - 2 * coverMm - 4 * dMainMm;
    if (clearGapMm <= 0)
      hardErrors.push(`Толщина плиты (${inp.thicknessMm} мм) недостаточна для двух сеток Ø${inp.mainDia} мм (просвет: ${clearGapMm.toFixed(1)} мм ≤ 0).`);
  }
  const lapLenM = (MODEL_CONSTANTS.LAP_DIAMETERS_FACTOR * inp.mainDia) / 1000;
  const requiresSplicing = L_axes > inp.stockLengthM + GEOM_EPS || B_axes > inp.stockLengthM + GEOM_EPS;
  if (requiresSplicing && inp.stockLengthM <= lapLenM)
    hardErrors.push(`Длина хлыста (${inp.stockLengthM} м) недостаточна для принятой сметной длины нахлёстки (${lapLenM.toFixed(2)} м) при стыковке стержней.`);
  if (hardErrors.length) return { isValid: false, isWithinPassportScope: false, hardErrors, scopeWarnings };

  if (inp.length < PASSPORT_SCOPE.MIN_SIDE_M || inp.length > PASSPORT_SCOPE.MAX_SIDE_M || inp.width < PASSPORT_SCOPE.MIN_SIDE_M || inp.width > PASSPORT_SCOPE.MAX_SIDE_M)
    scopeWarnings.push(`Габариты плиты выходят за паспортный диапазон ИЖС (${PASSPORT_SCOPE.MIN_SIDE_M}–${PASSPORT_SCOPE.MAX_SIDE_M} м).`);
  if (inp.thicknessMm < PASSPORT_SCOPE.MIN_THICKNESS_MM || inp.thicknessMm > PASSPORT_SCOPE.MAX_THICKNESS_MM)
    scopeWarnings.push(`Толщина плиты выходит за паспортный диапазон ИЖС (${PASSPORT_SCOPE.MIN_THICKNESS_MM}–${PASSPORT_SCOPE.MAX_THICKNESS_MM} мм).`);
  const stepXMm = inp.stepXM * 1000, stepYMm = inp.stepYM * 1000;
  if (stepXMm < PASSPORT_SCOPE.MIN_STEP_MM || stepXMm > PASSPORT_SCOPE.MAX_STEP_MM || stepYMm < PASSPORT_SCOPE.MIN_STEP_MM || stepYMm > PASSPORT_SCOPE.MAX_STEP_MM)
    scopeWarnings.push(`Шаг ячейки сетки выходит за паспортный диапазон (${PASSPORT_SCOPE.MIN_STEP_MM}–${PASSPORT_SCOPE.MAX_STEP_MM} мм).`);
  if (!PASSPORT_SCOPE.RECOMMENDED_MAIN_DIAS.includes(inp.mainDia))
    scopeWarnings.push(`Диаметр рабочей арматуры Ø${inp.mainDia} мм выходит за типовой ряд ИЖС (Ø10–16 мм).`);
  if (inp.layers === 2 && !PASSPORT_SCOPE.RECOMMENDED_CLAMP_DIAS.includes(inp.clampsDia))
    scopeWarnings.push(`Диаметр вспомогательной арматуры Ø${inp.clampsDia} мм выходит за типовой ряд (Ø6–10 мм).`);
  if (inp.reservePercent > PASSPORT_SCOPE.MAX_RESERVE_PERCENT)
    scopeWarnings.push(`Запас бетона (${inp.reservePercent}%) превышает паспортный предел (${PASSPORT_SCOPE.MAX_RESERVE_PERCENT}%).`);
  if (inp.layers === 2) {
    const clearGapMm = inp.thicknessMm - 2 * coverMm - 4 * dMainMm;
    const minRecommendedGapMm = Math.max(inp.mainDia, 25);
    if (clearGapMm < minRecommendedGapMm) scopeWarnings.push(
      `Малый просвет между сетками: ${clearGapMm.toFixed(1)} мм. Рекомендуемый ориентир модели — не менее ${minRecommendedGapMm} мм. Требуется проверка размещения арматуры, прохождения заполнителя и уплотнения бетона.`);
  }
  const usableSegmentLenM = inp.stockLengthM - lapLenM;
  if (requiresSplicing && usableSegmentLenM > 0 && usableSegmentLenM < 1) scopeWarnings.push(
    `Малая полезная длина сегмента арматуры: ${usableSegmentLenM.toFixed(2)} м после вычета нахлёстки ${lapLenM.toFixed(2)} м. Количество стыков может существенно увеличить расход. Проверьте доступную длину проката и схему стыковки.`);
  if (inp.boardWidthMm < PASSPORT_SCOPE.MIN_BOARD_WIDTH_MM || inp.boardWidthMm > PASSPORT_SCOPE.MAX_BOARD_WIDTH_MM)
    scopeWarnings.push(`Ширина доски опалубки (${inp.boardWidthMm} мм) вне типового диапазона (${PASSPORT_SCOPE.MIN_BOARD_WIDTH_MM}–${PASSPORT_SCOPE.MAX_BOARD_WIDTH_MM} мм).`);
  if (inp.boardThickMm < PASSPORT_SCOPE.MIN_BOARD_THICK_MM || inp.boardThickMm > PASSPORT_SCOPE.MAX_BOARD_THICK_MM)
    scopeWarnings.push(`Толщина доски опалубки (${inp.boardThickMm} мм) вне типового диапазона (${PASSPORT_SCOPE.MIN_BOARD_THICK_MM}–${PASSPORT_SCOPE.MAX_BOARD_THICK_MM} мм).`);
  if (inp.boardLengthM < PASSPORT_SCOPE.MIN_BOARD_LENGTH_M || inp.boardLengthM > PASSPORT_SCOPE.MAX_BOARD_LENGTH_M)
    scopeWarnings.push(`Длина доски опалубки (${inp.boardLengthM} м) вне типового диапазона (${PASSPORT_SCOPE.MIN_BOARD_LENGTH_M}–${PASSPORT_SCOPE.MAX_BOARD_LENGTH_M} м).`);
  return { isValid: true, isWithinPassportScope: scopeWarnings.length === 0, hardErrors, scopeWarnings };
}

function findInvalidNumber(value, path = 'result') {
  if (typeof value === 'number' && !Number.isFinite(value)) return { path, value: String(value) };
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) { const invalid = findInvalidNumber(value[i], `${path}[${i}]`); if (invalid) return invalid; }
    return null;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value)) { const invalid = findInvalidNumber(nestedValue, `${path}.${key}`); if (invalid) return invalid; }
  }
  return null;
}

function calculateCore(inp) {
  const validation = validateSlabInputs(inp);
  if (!validation.isValid) return { ok: false, isWithinPassportScope: false, hardErrors: validation.hardErrors, scopeWarnings: validation.scopeWarnings };
  const C = MODEL_CONSTANTS;
  const thicknessM = inp.thicknessMm / 1000;
  const S = inp.length * inp.width;
  const P = 2 * (inp.length + inp.width);
  const S_side = P * thicknessM;
  const V_geom = S * thicknessM;
  const V_order = V_geom * (1 + inp.reservePercent / 100);
  const mixersCount = ceilEps(V_order / MODEL_CONSTANTS.ASSUMED_MIXER_CAPACITY_M3);
  const M_slabKg = V_geom * C.ASSUMED_CONCRETE_DENSITY_KG_M3;
  const M_slabTons = M_slabKg / 1000;
  const p_kPa = (M_slabKg * C.GRAVITY_G) / (S * 1000);
  const p_kg_cm2 = p_kPa / 98.0665;
  const COVER_M = C.ASSUMED_COVER_M, COVER_MM = COVER_M * 1000;
  const dX_m = inp.mainDia / 1000, dY_m = inp.mainDia / 1000;
  const aX_m = COVER_M + dX_m / 2, aY_m = COVER_M + dY_m / 2;
  const B_axes = inp.width - 2 * aX_m, L_axes = inp.length - 2 * aY_m;
  const N_int_X = ceilEps(B_axes / inp.stepXM), N_rods_X = N_int_X + 1;
  const s_fact_X_mm = (B_axes / N_int_X) * 1000;
  const N_int_Y = ceilEps(L_axes / inp.stepYM), N_rods_Y = N_int_Y + 1;
  const s_fact_Y_mm = (L_axes / N_int_Y) * 1000;
  const L_rod_X = L_axes, L_rod_Y = B_axes;
  const h0_X_mm = inp.thicknessMm - COVER_MM - inp.mainDia / 2;
  const h0_Y_mm = inp.thicknessMm - COVER_MM - inp.mainDia - inp.mainDia / 2;
  const h0_min_mm = Math.min(h0_X_mm, h0_Y_mm);
  const s_max_mm = inp.thicknessMm <= 150 ? 200 : Math.min(1.5 * inp.thicknessMm, 400);
  const isStepXValid = s_fact_X_mm <= s_max_mm, isStepYValid = s_fact_Y_mm <= s_max_mm;
  const A_bar_mm2 = Math.PI * Math.pow(inp.mainDia, 2) / 4;
  const As_1m_X_mm2 = A_bar_mm2 * (1000 / s_fact_X_mm), As_1m_Y_mm2 = A_bar_mm2 * (1000 / s_fact_Y_mm);
  const mu_X = (As_1m_X_mm2 / (1000 * h0_X_mm)) * 100, mu_Y = (As_1m_Y_mm2 / (1000 * h0_Y_mm)) * 100;
  const muMin = Math.min(mu_X, mu_Y);
  const isConstructiveMinMuMet = muMin >= 0.10;
  const mainUnitWeightKgM = REBAR_WEIGHT_MAP[inp.mainDia];
  const netOneLayerX_m = N_rods_X * L_rod_X, netOneLayerY_m = N_rods_Y * L_rod_Y;
  const netOneLayerTotalM = netOneLayerX_m + netOneLayerY_m;
  const netStraightLengthM = netOneLayerTotalM * inp.layers, netStraightWeightKg = netStraightLengthM * mainUnitWeightKgM;
  const L_lap_m = C.LAP_DIAMETERS_FACTOR * inp.mainDia / 1000, usableSegmentLenM = inp.stockLengthM - L_lap_m;
  const lapsPerRodX = L_rod_X > inp.stockLengthM + GEOM_EPS ? ceilEps((L_rod_X - inp.stockLengthM) / usableSegmentLenM) : 0;
  const lapsPerRodY = L_rod_Y > inp.stockLengthM + GEOM_EPS ? ceilEps((L_rod_Y - inp.stockLengthM) / usableSegmentLenM) : 0;
  const segmentsPerRodX = 1 + lapsPerRodX, segmentsPerRodY = 1 + lapsPerRodY;
  const totalLapsCount = (N_rods_X * lapsPerRodX + N_rods_Y * lapsPerRodY) * inp.layers;
  const linearLapAdditionM = totalLapsCount * L_lap_m, lengthWithLapsM = netStraightLengthM + linearLapAdditionM;
  const weightWithLapsKg = lengthWithLapsM * mainUnitWeightKgM;
  const estimatedOrderLengthExactM = lengthWithLapsM * C.REBAR_WASTE_FACTOR;
  const estimatedOrderLengthM = Math.ceil(estimatedOrderLengthExactM);
  const estimatedOrderWeightExactKg = estimatedOrderLengthExactM * mainUnitWeightKgM;
  const estimatedOrderWeightKg = estimatedOrderLengthM * mainUnitWeightKgM;
  const stockBarsByTotalMeterage = Math.ceil(estimatedOrderLengthM / inp.stockLengthM);
  const stockBarsByPiecewiseRods = (N_rods_X * segmentsPerRodX + N_rods_Y * segmentsPerRodY) * inp.layers;
  const clampUnitWeightKgM = REBAR_WEIGHT_MAP[inp.clampsDia];
  let uPinsCount = 0, h_core_m = 0, uPinLenM = 0, uPinsTotalM = 0, uPinsWeightKg = 0;
  let frogsCount = 0, h_clearance_m = 0, h_stand_m = 0, frogLenM = 0, frogsTotalM = 0, frogsWeightKg = 0;
  if (inp.layers === 2) {
    uPinsCount = 2 * (N_rods_X + N_rods_Y); h_core_m = thicknessM - 2 * COVER_M;
    uPinLenM = h_core_m + 2 * C.U_PIN_LEG_LENGTH_M; uPinsTotalM = uPinsCount * uPinLenM;
    uPinsWeightKg = uPinsTotalM * clampUnitWeightKgM; frogsCount = Math.ceil(S * C.FROGS_PER_M2);
    h_clearance_m = thicknessM - 2 * COVER_M - 2 * (dX_m + dY_m);
    if (!(h_clearance_m > 0)) return { ok: false, isWithinPassportScope: false,
      hardErrors: [`Просвет между сетками для «лягушек» не положителен (${(h_clearance_m * 1000).toFixed(1)} мм).`], scopeWarnings: validation.scopeWarnings };
    h_stand_m = h_clearance_m; frogLenM = 2 * h_stand_m + C.FROG_TOP_SHELF_M + 2 * C.FROG_FOOT_LENGTH_M;
    frogsTotalM = frogsCount * frogLenM; frogsWeightKg = frogsTotalM * clampUnitWeightKgM;
  }
  const auxExactTotalM = uPinsTotalM + frogsTotalM, auxExactWeightKg = uPinsWeightKg + frogsWeightKg;
  const auxTotalM = auxExactTotalM, auxTotalWeightKg = auxExactWeightKg;
  // auxOrderLengthM — только округление расчётного метража до целого метра.
  // auxStockBars* — метраж и масса целых хлыстов при оценке по суммарному метражу (карта раскроя не строится).
  const auxOrderLengthM = Math.ceil(auxExactTotalM), auxStockBarsCount = Math.ceil(auxOrderLengthM / inp.stockLengthM);
  const auxStockBarsLengthM = auxStockBarsCount * inp.stockLengthM;
  const auxStockBarsWeightKg = auxStockBarsLengthM * clampUnitWeightKgM;
  const chairsCount = Math.ceil(S * C.CHAIRS_PER_M2);
  const gridNodesPerLayer = N_rods_X * N_rods_Y, totalGridNodes = gridNodesPerLayer * inp.layers;
  const extraNodes = frogsCount * 4 + uPinsCount * 2, totalNodes = totalGridNodes + extraNodes;
  const wireTotalM = totalNodes * C.WIRE_LEN_PER_NODE_M, wireWeightKg = wireTotalM * C.WIRE_LINEAR_WEIGHT_KG_M;
  const wireRecommendedCoilKg = wireWeightKg > 4.5 ? Math.ceil(wireWeightKg / 5) * 5 : 5;
  const rowsByHeight = Math.ceil(inp.thicknessMm / inp.boardWidthMm);
  const h_formworkM = rowsByHeight * inp.boardWidthMm / 1000, deltaHMm = (h_formworkM - thicknessM) * 1000;
  const boardsNetLinearM = P * rowsByHeight;
  const boardsNetVolM3 = boardsNetLinearM * (inp.boardWidthMm / 1000) * (inp.boardThickMm / 1000);
  const boardsPerSideA = ceilEps(inp.length / inp.boardLengthM), boardsPerSideB = ceilEps(inp.width / inp.boardLengthM);
  const boardsCountTotal = (2 * boardsPerSideA + 2 * boardsPerSideB) * rowsByHeight;
  const boardsPurchasedLinearM = boardsCountTotal * inp.boardLengthM;
  const boardsVolumeM3 = boardsPurchasedLinearM * (inp.boardWidthMm / 1000) * (inp.boardThickMm / 1000);
  const braceNodesCount = 2 * ceilEps(inp.length / C.BRACE_STEP_M) + 2 * ceilEps(inp.width / C.BRACE_STEP_M);
  const lenPerNodeM = h_formworkM + Math.SQRT2 * h_formworkM + C.BRACE_STAKE_LEN_M;
  const timberLinearReqM = braceNodesCount * lenPerNodeM * C.TIMBER_WASTE_FACTOR;
  const timberReqVolM3 = timberLinearReqM * C.TIMBER_SECTION_M * C.TIMBER_SECTION_M;
  const timberPieces3M = Math.ceil(timberLinearReqM / C.TIMBER_STOCK_LEN_M);
  const timberPurchasedM = timberPieces3M * C.TIMBER_STOCK_LEN_M;
  const timberPurchasedVolM3 = timberPurchasedM * C.TIMBER_SECTION_M * C.TIMBER_SECTION_M;
  const totalLumberReqVolM3 = boardsNetVolM3 + timberReqVolM3;
  const totalLumberPurchasedVolM3 = boardsVolumeM3 + timberPurchasedVolM3;
  const result = {
    ok: true, isWithinPassportScope: validation.isWithinPassportScope, hardErrors: [], scopeWarnings: validation.scopeWarnings,
    S, P, S_side, V_geom, V_order, mixersCount, M_slabKg, M_slabTons, p_kPa, p_kg_cm2,
    COVER_M, COVER_MM, aX_m, aY_m, B_axes, L_axes, N_int_X, N_int_Y, N_rods_X, N_rods_Y,
    s_fact_X_mm, s_fact_Y_mm, L_rod_X, L_rod_Y, h0_X_mm, h0_Y_mm, h0_min_mm,
    s_max_mm, isStepXValid, isStepYValid, As_1m_X_mm2, As_1m_Y_mm2, mu_X, mu_Y, muMin, isConstructiveMinMuMet,
    constructiveChecks: {
      maxSpacingCheck: { passed: isStepXValid && isStepYValid, s_fact_X_mm, s_fact_Y_mm, s_max_mm, status: 'PRELIMINARY', clause: 'Ориентир модели по п. 10.3.8 СП 63.13330.2018; применимость требует проверки' },
      minReinforcementRatioCheck: { label: 'Предварительная оценка относительного армирования', passed: isConstructiveMinMuMet, mu_X, mu_Y, muMin, thresholdPercent: 0.10, status: 'PRELIMINARY', clause: 'Порог модели по п. 10.3.6 СП 63.13330.2018; применимость требует проверки. Не является подтверждением достаточности армирования.' },
      bearingCapacityStatus: 'NOT_CALCULATED', crackWidthStatus: 'NOT_CALCULATED', punchingShearStatus: 'NOT_CALCULATED', soilSettlementStatus: 'NOT_CALCULATED'
    },
    netOneLayerX_m, netOneLayerY_m, netOneLayerTotalM, netStraightLengthM, netStraightWeightKg,
    L_lap_m, lapsPerRodX, lapsPerRodY, segmentsPerRodX, segmentsPerRodY, totalLapsCount, linearLapAdditionM, lengthWithLapsM, weightWithLapsKg,
    estimatedOrderLengthExactM, estimatedOrderLengthM, estimatedOrderWeightExactKg, estimatedOrderWeightKg,
    stockBarsByTotalMeterage, stockBarsByPiecewiseRods,
    stockBarsByPiecewiseRodsLabel: 'Оценка по сегментам стержней (не число хлыстов к покупке)', stockBarsByPiecewiseRodsStatus: 'ESTIMATE_ONLY', cuttingMapStatus: 'NOT_IMPLEMENTED',
    mainRebarTotalM: estimatedOrderLengthM, mainRebarWeightKg: estimatedOrderWeightKg, mainStockBarsCount: stockBarsByTotalMeterage,
    uPinsCount, h_core_m, uPinLenM, uPinsTotalM, uPinsWeightKg, frogsCount, h_clearance_m, h_stand_m, frogLenM, frogsTotalM, frogsWeightKg,
    auxExactTotalM, auxExactWeightKg, auxTotalM, auxTotalWeightKg, auxOrderLengthM, auxStockBarsCount, auxStockBarsLengthM, auxStockBarsWeightKg,
    auxEstimateNote: 'Оценка расхода вспомогательной арматуры по принятым геометрическим допущениям. Размеры элементов требуют проверки по фактической схеме армирования.',
    chairsCount, gridNodesPerLayer, totalGridNodes, extraNodes, totalNodes, wireTotalM, wireWeightKg, wireRecommendedCoilKg,
    rowsByHeight, h_formworkM, deltaHMm, boardsNetLinearM, boardsNetVolM3, boardsPerSideA, boardsPerSideB, boardsCountTotal, boardsPurchasedLinearM, boardsVolumeM3,
    braceNodesCount, lenPerNodeM, timberLinearReqM, timberReqVolM3, timberPieces3M, timberPurchasedM, timberPurchasedVolM3,
    totalLumberReqVolM3, totalLumberPurchasedVolM3, totalLumberVolM3: totalLumberPurchasedVolM3
  };
  const invalidNumber = findInvalidNumber(result);
  if (invalidNumber) return { ok: false, isWithinPassportScope: false,
    hardErrors: [`Внутренняя ошибка вычислений: параметр [${invalidNumber.path}] принял недопустимое значение (${invalidNumber.value}).`], scopeWarnings: [] };
  return result;
}

// ============================ ЧАСТЬ 2. ИНТЕРФЕЙС ============================

function fmtNum(num, digits = 2) {
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function pluralize(n, forms) {
  const abs = Math.abs(Number(n)) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}
function byId(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
function readNumber(id, fallback) {
  const el = byId(id);
  if (!el) return fallback;
  const raw = String(el.value ?? '').trim().replace(',', '.');
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}
function readInteger(id, fallback) {
  const n = readNumber(id, fallback);
  return Number.isFinite(n) && Number.isInteger(n) ? n : NaN;
}
function setText(id, value) { const el = byId(id); if (el) el.textContent = String(value); }
function setHidden(id, hidden) { const el = byId(id); if (el) el.hidden = Boolean(hidden); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

let lastCalc = null;
let formIsDirty = true;
let boundForm = null;

function getCalcStatusElement() {
  let status = byId('calc-status');
  if (!status && typeof document !== 'undefined') {
    status = document.createElement('div');
    status.id = 'calc-status';
    status.className = 'form-status';
    status.setAttribute?.('role', 'status');
    status.hidden = true;
    const formWarn = byId('form-warn');
    if (formWarn?.parentNode?.insertBefore) formWarn.parentNode.insertBefore(status, formWarn.nextSibling);
    else {
      const form = byId('slab-form');
      if (form?.prepend) form.prepend(status);
      else form?.appendChild?.(status);
    }
  }
  return status;
}

function setCalcStatus(message, isError = false) {
  const status = getCalcStatusElement();
  if (!status) return;
  status.textContent = message || '';
  status.hidden = !message;
  status.setAttribute?.('data-status-type', isError ? 'error' : 'info');
  status.setAttribute?.('role', isError ? 'alert' : 'status');
}

function clearFormWarning() {
  const warn = byId('form-warn');
  if (warn) { warn.hidden = true; warn.textContent = ''; }
}

function invalidateLastCalc() {
  formIsDirty = true;
  const btnCopy = byId('btn-copy');
  if (btnCopy) {
    btnCopy.disabled = true;
    btnCopy.setAttribute?.('aria-disabled', 'true');
    btnCopy.title = 'Сначала выполните расчёт после изменения параметров.';
  }
  // Не оставляем старые результаты доступными для печати после изменения формы.
  const root = byId('results-root');
  if (root && lastCalc) root.hidden = true;
  if (lastCalc) {
    setCalcStatus('Параметры изменены. Выполните расчёт заново, чтобы обновить результаты и спецификацию.');
  }
}
function markCalculationCurrent() {
  formIsDirty = false;
  const btnCopy = byId('btn-copy');
  if (btnCopy) {
    btnCopy.disabled = false;
    btnCopy.setAttribute?.('aria-disabled', 'false');
    btnCopy.title = '';
  }
}
function readInputsFromForm() {
  const thicknessCm = readNumber('slab-thickness', NaN);
  const thicknessMm = Math.round(thicknessCm * 10);
  // Поля «Свои параметры» не должны влиять на расчёт, если переключатель выключен.
  const useCustomRebar = Boolean(byId('toggle-rebar')?.checked);
  const useCustomFormwork = Boolean(byId('toggle-formwork')?.checked);
  return {
    length: readNumber('slab-length', NaN),
    width: readNumber('slab-width', NaN),
    thicknessMm,
    thicknessM: thicknessMm / 1000,
    reservePercent: readNumber('reserve-input', 5),
    layers: useCustomRebar ? readInteger('rebar-layers', 2) : 2,
    mainDia: useCustomRebar ? readInteger('rebar-diameter', 12) : 12,
    clampsDia: useCustomRebar ? readInteger('rebar-clamps-dia', 8) : 8,
    stepXM: (useCustomRebar ? readNumber('rebar-step-x', 20) : 20) / 100,
    stepYM: (useCustomRebar ? readNumber('rebar-step-y', 20) : 20) / 100,
    stockLengthM: useCustomRebar ? readNumber('rebar-stock-length', 6) : 6,
    boardWidthMm: useCustomFormwork ? readNumber('board-width', 150) : 150,
    boardThickMm: useCustomFormwork ? readNumber('board-thickness', 40) : 40,
    boardLengthM: useCustomFormwork ? readNumber('board-length', 6) : 6,
    concreteGrade: byId('concrete-grade')?.value || 'М300 (В22,5)',
    manualMixEnabled: Boolean(byId('toggle-manual-mix')?.checked),
    estimateEnabled: Boolean(byId('toggle-estimate')?.checked),
    priceConcrete: readNumber('price-concrete', 0),
    priceRebar: readNumber('price-rebar', 0),
    priceBoard: readNumber('price-board', 0),
    ratioCement: readNumber('ratio-cement', 1),
    ratioSand: readNumber('ratio-sand', 1.9),
    ratioGravel: readNumber('ratio-gravel', 2.8)
  };
}

function syncMixRatiosFromConcreteGrade() {
  const gradeSelect = byId('concrete-grade');
  if (!gradeSelect) return false;
  const selected = gradeSelect.options?.[gradeSelect.selectedIndex] || gradeSelect.selectedOptions?.[0] || null;
  const sand = Number(selected?.dataset?.sand);
  const gravel = Number(selected?.dataset?.gravel);
  if (!Number.isFinite(sand) || sand <= 0 || !Number.isFinite(gravel) || gravel <= 0) return false;

  const ratioSand = byId('ratio-sand');
  const ratioGravel = byId('ratio-gravel');
  // После ручного редактирования пропорций сохраняем выбор пользователя при смене марки.
  if (ratioSand && ratioSand.dataset.userEdited !== 'true') ratioSand.value = String(sand);
  if (ratioGravel && ratioGravel.dataset.userEdited !== 'true') ratioGravel.value = String(gravel);
  return true;
}
function renderScopeWarnings(warnings) {
  let host = byId('res-scope-warnings');
  if (!host && typeof document !== 'undefined') {
    host = document.createElement('div');
    host.id = 'res-scope-warnings';
    host.className = 'scope-warning';
    host.setAttribute?.('role', 'status');
    const root = byId('results-root');
    if (root?.prepend) root.prepend(host);
    else if (root?.appendChild) root.appendChild(host);
  }
  if (host) {
    host.replaceChildren?.();
    host.textContent = '';
    if (warnings.length) {
      const title = document.createElement('strong');
      title.textContent = 'Предупреждения модели';
      host.appendChild(title);
      const ul = document.createElement('ul');
      warnings.forEach(message => { const li = document.createElement('li'); li.textContent = message; ul.appendChild(li); });
      host.appendChild(ul);
      host.hidden = false;
    } else host.hidden = true;
    return;
  }
  // Совместимость с текущим HTML, если отдельного контейнера ещё нет:
  // предупреждения будут помещены перед блоком ведомости, если он доступен.
  const fallback = byId('res-formula-breakdown');
  if (fallback) {
    const warningText = warnings.length ? `ПРЕДУПРЕЖДЕНИЯ МОДЕЛИ:\n• ${warnings.join('\n• ')}` : '';
    fallback.dataset.scopeWarnings = warningText;
  }
}
function showCalculationError(errors) {
  setCalcStatus(`Ошибка расчёта: ${(errors || ['Не удалось выполнить расчёт.']).join(' ')}`, true);
  const root = byId('results-root');
  if (root) root.hidden = true;
  // При ошибке протокол очищается, чтобы не оставлять устаревшие «ВЫПОЛНЕНО».
  const breakdown = byId('res-formula-breakdown');
  if (breakdown) breakdown.innerHTML = '';
  lastCalc = null;
  invalidateLastCalc();
}

function calculateUnsafe() {
  const resultsRoot = byId('results-root');
  const inputs = readInputsFromForm();
  const res = calculateCore(inputs);
  if (!res.ok) {
    showCalculationError(res.hardErrors);
    return false;
  }
  clearFormWarning();
  setCalcStatus('');
  // Сначала запоминаем одну согласованную пару входов и результата.
  lastCalc = { inputs: Object.freeze({ ...inputs }), result: res };
  renderProportionalDrawing(inputs.length, inputs.width, inputs.thicknessMm / 10);

  setText('res-geom-volume', fmtNum(res.V_geom, 2));
  setText('res-order-volume', fmtNum(res.V_order, 2));
  setText('res-reserve-label', `${inputs.concreteGrade} · технологический запас ${inputs.reservePercent}%`);
  setText('res-formula-inline', `${fmtNum(res.V_geom, 2)} м³ × ${(1 + inputs.reservePercent / 100).toFixed(2)} = ${fmtNum(res.V_order, 2)} м³`);
  setText('res-base-area', fmtNum(res.S, 2));
  setText('res-perimeter', fmtNum(res.P, 2));
  setText('res-slab-weight', fmtNum(res.M_slabTons, 1));
  setText('res-mixers-count', `${res.mixersCount} ${pluralize(res.mixersCount, ['рейс', 'рейса', 'рейсов'])}`);

  const rowManualMix = byId('row-manual-mix');
  if (inputs.manualMixEnabled && rowManualMix) {
    const ratios = [inputs.ratioCement, inputs.ratioSand, inputs.ratioGravel];
    if (ratios.every(n => Number.isFinite(n) && n > 0)) {
      const totalParts = ratios.reduce((a, b) => a + b, 0);
      const totalDryKg = res.V_order * MODEL_CONSTANTS.MANUAL_MIX_DRY_MASS_KG_PER_M3; // Ориентировочная модель, не рецепт для несущего бетона.
      const cementKg = Math.ceil(totalDryKg * ratios[0] / totalParts);
      const sandTons = totalDryKg * ratios[1] / totalParts / 1000;
      const gravelTons = totalDryKg * ratios[2] / totalParts / 1000;
      const waterLiters = Math.round(cementKg * MODEL_CONSTANTS.MANUAL_MIX_WATER_CEMENT_RATIO);
      setText('res-manual-title', `Ориентировочный состав (${ratios.join(' : ')})`);
      setText('res-manual-sub', `Цемент: ${cementKg} кг · Песок: ${fmtNum(sandTons, 2)} т · Щебень: ${fmtNum(gravelTons, 2)} т · Вода: ~${waterLiters} л`);
      setText('res-manual-bags', `${Math.ceil(cementKg / MODEL_CONSTANTS.CEMENT_BAG_MASS_KG)} меш. по ${MODEL_CONSTANTS.CEMENT_BAG_MASS_KG} кг`);
      rowManualMix.hidden = false;
    } else {
      rowManualMix.hidden = true;
    }
  } else if (rowManualMix) rowManualMix.hidden = true;

  setHidden('sec-header-formwork', false); setHidden('row-formwork-area', false);
  setHidden('row-formwork-boards', false); setHidden('row-formwork-timber', false);
  setText('res-formwork-area', fmtNum(res.S_side, 2));
  setText('res-boards-title', `Доска опалубки (${inputs.boardThickMm}×${inputs.boardWidthMm} мм, толщина × ширина)`);
  setText('res-boards-pieces', `Заказ: ${res.boardsCountTotal} шт. по ${fmtNum(inputs.boardLengthM, 2)} м (чистая длина контура ${fmtNum(res.boardsNetLinearM, 1)} м, ${res.rowsByHeight} ${pluralize(res.rowsByHeight, ['ряд', 'ряда', 'рядов'])})`);
  setText('res-boards-volume', fmtNum(res.boardsVolumeM3, 3));
  setText('res-timber-sub', `${res.braceNodesCount} опорных узлов (потребность: ${fmtNum(res.timberLinearReqM, 1)} м; заказ: ${res.timberPieces3M} шт. по 3 м / 50×50 мм)`);
  setText('res-timber-volume', fmtNum(res.timberPurchasedVolM3, 3));

  setHidden('sec-header-rebar', false); setHidden('row-rebar-main', false);
  setHidden('row-rebar-wire', false); setHidden('row-rebar-chairs', false);
  const stockUnit = `${fmtNum(inputs.stockLengthM, 1)} м`;
  setText('res-rebar-title', `Рабочая арматура А500С Ø${inputs.mainDia} мм`);
  setText('res-rebar-length', `Сметная длина: ${fmtNum(res.estimatedOrderLengthM, 0)} пог. м (~${res.stockBarsByTotalMeterage} хлыстов по ${stockUnit}; прямая часть: ${fmtNum(res.netStraightLengthM, 1)} м)`);
  setText('res-rebar-weight', fmtNum(res.estimatedOrderWeightKg, 1));
  const rowClamps = byId('row-rebar-clamps');
  if (inputs.layers === 2 && rowClamps) {
    setText('res-clamps-title', `Вспомогательная сталь А500С Ø${inputs.clampsDia} мм`);
    setText('res-clamps-length', `П-образные элементы: ${res.uPinsCount} шт. (${fmtNum(res.uPinsTotalM, 1)} м) · Лягушки: ${res.frogsCount} шт. (${fmtNum(res.frogsTotalM, 1)} м)`);
    setText('res-clamps-weight', fmtNum(res.auxTotalWeightKg, 1)); rowClamps.hidden = false;
  } else if (rowClamps) rowClamps.hidden = true;
  setText('res-wire-sub', `На ~${fmtNum(res.totalNodes, 0)} узлов (расчётная масса: ${fmtNum(res.wireWeightKg, 1)} кг; закупка: бухта ${fmtNum(res.wireRecommendedCoilKg, 0)} кг)`);
  setText('res-wire-weight', fmtNum(res.wireWeightKg, 1));
  setText('res-chairs-count', fmtNum(res.chairsCount, 0));
  renderScopeWarnings(res.scopeWarnings || []);
  renderCalculationBreakdown(inputs, res);
  renderEstimate(inputs, res);
  if (resultsRoot) resultsRoot.hidden = false;
  markCalculationCurrent();
  return true;
}

function calculate() {
  try {
    return calculateUnsafe();
  } catch (error) {
    showCalculationError([`Внутренняя ошибка отображения результатов: ${error?.message || 'неизвестная ошибка'}`]);
    return false;
  }
}

// ===== ПРОТОКОЛ РАСЧЁТА =====
// Все числа берутся из res / inputs. Протокол не пересчитывает результаты,
// а только показывает подстановки. Вызывается только после успешного calculateCore().

const PROTOCOL_STATUS = Object.freeze({
  OK: { cls: 'ok', text: 'ВЫПОЛНЕНО' },
  FAIL: { cls: 'fail', text: 'НЕ ВЫПОЛНЕНО' },
  NA: { cls: 'na', text: 'НЕ ПРОВЕРЯЕТСЯ ЭТИМ КАЛЬКУЛЯТОРОМ' }
});

function pBadge(st) {
  return `<span class="proto-badge proto-${st.cls}">${st.text}</span>`;
}
function pRow(label, formula, result) {
  return `<tr><td>${label}</td><td class="proto-formula">${formula}</td><td class="proto-res">${result}</td></tr>`;
}
function pTable(rows) {
  return `
    <div class="proto-table-wrap">
      <table class="proto-table">
        <thead>
          <tr>
            <th>Показатель</th>
            <th>Формула и подстановка</th>
            <th>Результат</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    </div>
  `;
}
function pSection(num, title, body) {
  return `<details class="proto-section"><summary><strong>${num}. ${title}</strong></summary>${body}</details>`;
}
function pNote(text) { return `<p class="proto-note">${text}</p>`; }

function renderGeometrySection(i, r) {
  const f = fmtNum;
  const C = MODEL_CONSTANTS;
  const k = 1 + i.reservePercent / 100;
  return pSection(1, 'Геометрия и бетон', pTable([
    pRow('Площадь плиты', `${f(i.length)} м × ${f(i.width)} м`, `${f(r.S)} м²`),
    pRow('Периметр', `2 × (${f(i.length)} + ${f(i.width)}) м`, `${f(r.P)} м`),
    pRow('Геометрический объём', `${f(r.S)} м² × ${f(i.thicknessMm / 1000, 3)} м`, `${f(r.V_geom)} м³`),
    pRow('Объём к заказу', `${f(r.V_geom)} м³ × (1 + ${f(i.reservePercent, 1)}/100) = ${f(r.V_geom)} × ${f(k, 2)}`, `${f(r.V_order)} м³`),
    pRow('Масса плиты (условная)', `${f(r.V_geom, 3)} м³ × ${C.ASSUMED_CONCRETE_DENSITY_KG_M3} кг/м³`, `${f(r.M_slabKg, 0)} кг (${f(r.M_slabTons, 2)} т)`),
    pRow('Давление от собственного веса', `${f(r.M_slabKg, 0)} кг × ${C.GRAVITY_G} м/с² / ${f(r.S, 2)} м² / 1000`, `${f(r.p_kPa, 3)} кПа`),
    pRow('Рейсы миксера (оценка)', `⌈${f(r.V_order)} м³ / ${C.ASSUMED_MIXER_CAPACITY_M3} м³⌉`, `${r.mixersCount}`)
  ]) + pNote('Арифметика по заданным размерам. Масса не включает арматуру и зависит от принятой плотности бетона. Давление относится только к собственному весу плиты и не является проверкой основания.'));
}

function renderConstructiveChecksSection(i, r) {
  const f = fmtNum;
  const st = (ok) => ok ? PROTOCOL_STATUS.OK : PROTOCOL_STATUS.FAIL;
  const rows = [
    pRow('Защитный слой (принят моделью)', '—', `${r.COVER_MM} мм`),
    pRow('Отступ от края до оси крайнего стержня', `c + d/2 = ${r.COVER_MM} + ${i.mainDia}/2 мм`, `${f(r.aX_m * 1000, 1)} мм`),
    pRow('Габариты сетки по осям (B / A)', `B − 2a; A − 2a`, `${f(r.B_axes, 3)} × ${f(r.L_axes, 3)} м`),
    pRow('Фактический шаг X', `${f(r.B_axes, 3)} м / ${r.N_int_X} интерв.`, `${f(r.s_fact_X_mm, 1)} мм`),
    pRow('Фактический шаг Y', `${f(r.L_axes, 3)} м / ${r.N_int_Y} интерв.`, `${f(r.s_fact_Y_mm, 1)} мм`),
    pRow('Ориентир максимального шага', `h ≤ 150 мм → 200; иначе min(1,5h; 400)`, `${f(r.s_max_mm, 0)} мм`),
    pRow('Рабочая высота h0 (X / Y)', `h − c − d/2; h − c − 1,5d`, `${f(r.h0_X_mm, 1)} / ${f(r.h0_Y_mm, 1)} мм`),
    pRow('Площадь арматуры на 1 м (X / Y)', `A₁ × 1000 / s`, `${f(r.As_1m_X_mm2, 0)} / ${f(r.As_1m_Y_mm2, 0)} мм²`),
    pRow('Относительное армирование μ (X / Y)', `As / (1000 × h0) × 100%`, `${f(r.mu_X, 3)}% / ${f(r.mu_Y, 3)}%`),
    pRow('Минимальное μ', `меньшее из μX и μY`, `${f(r.muMin, 3)}%`)
  ];
  const checks = `<ul class="proto-checks">
    <li>Шаг X не превышает ориентир модели: ${pBadge(st(r.isStepXValid))}</li>
    <li>Шаг Y не превышает ориентир модели: ${pBadge(st(r.isStepYValid))}</li>
    <li>Минимальное μ ≥ 0,10%: ${pBadge(st(r.isConstructiveMinMuMet))}</li>
    <li>Несущая способность: ${pBadge(PROTOCOL_STATUS.NA)}</li>
    <li>Продавливание: ${pBadge(PROTOCOL_STATUS.NA)}</li>
    <li>Трещиностойкость: ${pBadge(PROTOCOL_STATUS.NA)}</li>
    <li>Осадка грунта: ${pBadge(PROTOCOL_STATUS.NA)}</li>
  </ul>`;
  return pSection(2, 'Предварительные конструктивные проверки', pTable(rows) + checks +
    pNote('Статус отражает выполнение внутренних критериев калькулятора. Нормативная достаточность армирования и несущая способность конкретной плиты этим не подтверждаются. Нормативные ссылки требуют независимой проверки.'));
}

function renderMainRebarSection(i, r) {
  const f = fmtNum;
  const C = MODEL_CONSTANTS;
  const w = REBAR_WEIGHT_MAP[i.mainDia];
  const addWaste = r.estimatedOrderLengthExactM - r.lengthWithLapsM;
  const rows = [
    pRow('Стержни X / Y в одной сетке', `${r.N_int_X} + 1; ${r.N_int_Y} + 1`, `${r.N_rods_X} / ${r.N_rods_Y} шт.`),
    pRow('Длина стержня X / Y', `A − 2a; B − 2a`, `${f(r.L_rod_X, 3)} / ${f(r.L_rod_Y, 3)} м`),
    pRow('Метраж одной сетки', `${r.N_rods_X} × ${f(r.L_rod_X, 2)} + ${r.N_rods_Y} × ${f(r.L_rod_Y, 2)} м`, `${f(r.netOneLayerTotalM, 2)} м`),
    pRow('Прямой метраж всех сеток', `${f(r.netOneLayerTotalM, 2)} м × ${i.layers}`, `${f(r.netStraightLengthM, 2)} м`),
    pRow('Длина нахлёста (допущение)', `${C.LAP_DIAMETERS_FACTOR} × d = ${C.LAP_DIAMETERS_FACTOR} × ${i.mainDia} мм`, `${f(r.L_lap_m, 2)} м`),
    pRow('Расчётное число стыков на стержень X / Y', `по модели сегментации; длина хлыста ${f(i.stockLengthM, 1)} м`, `${r.lapsPerRodX} / ${r.lapsPerRodY}`),
    pRow('Всего стыков', `(${r.N_rods_X} × ${r.lapsPerRodX} + ${r.N_rods_Y} × ${r.lapsPerRodY}) × ${i.layers}`, `${r.totalLapsCount} шт.`),
    pRow('Добавка на нахлёсты', `${r.totalLapsCount} × ${f(r.L_lap_m, 2)} м`, `${f(r.linearLapAdditionM, 2)} м`),
    pRow('Метраж с нахлёстами', `${f(r.netStraightLengthM, 2)} + ${f(r.linearLapAdditionM, 2)} м`, `${f(r.lengthWithLapsM, 2)} м`),
    pRow(`Запас ${f((C.REBAR_WASTE_FACTOR - 1) * 100, 0)}%`, `${f(r.lengthWithLapsM, 2)} м × ${C.REBAR_WASTE_FACTOR}`, `${f(r.estimatedOrderLengthExactM, 2)} м (+${f(addWaste, 2)} м)`),
    pRow('Округление до целого метра', `⌈${f(r.estimatedOrderLengthExactM, 2)}⌉ м`, `${f(r.estimatedOrderLengthM, 0)} м`),
    pRow('Масса для сметы', `${f(r.estimatedOrderLengthM, 0)} м × ${w} кг/м`, `${f(r.estimatedOrderWeightKg, 1)} кг`),
    pRow('Хлыстов по суммарному метражу (оценка)', `⌈${f(r.estimatedOrderLengthM, 0)} м / ${f(i.stockLengthM, 1)} м⌉`, `${r.stockBarsByTotalMeterage} шт.`)
  ];
  return pSection(3, 'Рабочая арматура и стыки', pTable(rows) +
    pNote(`Нахлёст 50d — сметное допущение, а не проектная длина стыка. Число стыков получено по принятой модели сегментации, а не по схеме монтажа. Число хлыстов — оценка по суммарному метражу без карты раскроя (остатки не учитываются; оценка по сегментам стержней: ${r.stockBarsByPiecewiseRods}, это не количество к покупке). Запас применяется только к рабочей арматуре.`));
}

function renderAuxiliaryMaterialsSection(i, r) {
  const f = fmtNum;
  const C = MODEL_CONSTANTS;
  const rows = [];
  if (i.layers === 2) {
    rows.push(
      pRow('П-образные элементы, шт.', `2 × (${r.N_rods_X} + ${r.N_rods_Y})`, `${r.uPinsCount}`),
      pRow('Длина одного П-элемента', `${f(r.h_core_m, 3)} + 2 × ${f(C.U_PIN_LEG_LENGTH_M, 2)} м`, `${f(r.uPinLenM, 3)} м`),
      pRow('П-элементы: длина / масса', `${r.uPinsCount} × ${f(r.uPinLenM, 3)} м; по теор. массе Ø${i.clampsDia} мм`, `${f(r.uPinsTotalM, 1)} м / ${f(r.uPinsWeightKg, 1)} кг`),
      pRow('Лягушки, шт.', `⌈${f(r.S)} м² × ${C.FROGS_PER_M2} шт./м²⌉`, `${r.frogsCount}`),
      pRow('Просвет между сетками', `h − 2c − 2 × (d + d)`, `${f(r.h_clearance_m * 1000, 1)} мм`),
      pRow('Длина одной лягушки', `2 × ${f(r.h_stand_m, 3)} + ${f(C.FROG_TOP_SHELF_M, 2)} + 2 × ${f(C.FROG_FOOT_LENGTH_M, 2)} м`, `${f(r.frogLenM, 3)} м`),
      pRow('Лягушки: длина / масса', `${r.frogsCount} × ${f(r.frogLenM, 3)} м; по теор. массе Ø${i.clampsDia} мм`, `${f(r.frogsTotalM, 1)} м / ${f(r.frogsWeightKg, 1)} кг`),
      pRow('Расчётная потребность во вспомогательной стали', `${f(r.uPinsTotalM, 1)} + ${f(r.frogsTotalM, 1)} м`, `${f(r.auxExactTotalM, 1)} м / ${f(r.auxExactWeightKg, 1)} кг`),
      pRow('Округлённая потребность (до целого метра)', `⌈${f(r.auxExactTotalM, 1)}⌉ м`, `${f(r.auxOrderLengthM, 0)} м`),
      pRow('Хлыстов по суммарному метражу (оценка)', `⌈${f(r.auxOrderLengthM, 0)} м / ${f(i.stockLengthM, 1)} м⌉`, `${r.auxStockBarsCount} шт.`),
      pRow('Метраж и масса целых хлыстов', `${r.auxStockBarsCount} × ${f(i.stockLengthM, 1)} м`, `${f(r.auxStockBarsLengthM, 1)} м / ${f(r.auxStockBarsWeightKg, 1)} кг`)
    );
  }
  rows.push(
    pRow('Фиксаторы, шт.', `⌈${f(r.S)} м² × ${C.CHAIRS_PER_M2} шт./м²⌉`, `${r.chairsCount}`),
    pRow('Расчётное число пересечений стержней', `${r.N_rods_X} × ${r.N_rods_Y} × ${i.layers}`, `${r.totalGridNodes} шт.`),
    pRow('Дополнительные узлы', `${r.frogsCount} × 4 + ${r.uPinsCount} × 2`, `${r.extraNodes} шт.`),
    pRow('Длина проволоки', `${r.totalNodes} узлов × ${C.WIRE_LEN_PER_NODE_M} м`, `${f(r.wireTotalM, 1)} м`),
    pRow('Масса проволоки', `${f(r.wireTotalM, 1)} м × ${C.WIRE_LINEAR_WEIGHT_KG_M} кг/м`, `${f(r.wireWeightKg, 2)} кг (бухта ${r.wireRecommendedCoilKg} кг)`)
  );
  return pSection(4, 'Вспомогательные материалы', pTable(rows) +
    pNote('Геометрическая модель без запаса. В ведомости и смете используется расчётная масса вспомогательной стали (по точному метражу); метраж и масса целых хлыстов показаны отдельно как оценка без карты раскроя. Расход проволоки — оценка по условному числу узлов; фактический зависит от схемы вязки. Размеры элементов требуют проверки по реальной схеме армирования.'));
}

function renderFormworkSection(i, r) {
  const f = fmtNum;
  const C = MODEL_CONSTANTS;
  const rows = [
    pRow('Площадь боковой опалубки', `${f(r.P)} м × ${f(i.thicknessMm / 1000, 3)} м`, `${f(r.S_side)} м²`),
    pRow('Рядов доски по высоте', `⌈${f(i.thicknessMm, 0)} / ${f(i.boardWidthMm, 0)}⌉`, `${r.rowsByHeight}`),
    pRow('Высота опалубки', `${r.rowsByHeight} × ${f(i.boardWidthMm, 0)} мм`, `${f(r.h_formworkM * 1000, 0)} мм (превышение ${f(r.deltaHMm, 0)} мм)`),
    pRow('Чистая длина досок / объём', `${f(r.P)} м × ${r.rowsByHeight}`, `${f(r.boardsNetLinearM, 1)} м / ${f(r.boardsNetVolM3, 3)} м³`),
    pRow('Досок на сторону A / B', `⌈${f(i.length, 2)} / ${f(i.boardLengthM, 2)}⌉; ⌈${f(i.width, 2)} / ${f(i.boardLengthM, 2)}⌉`, `${r.boardsPerSideA} / ${r.boardsPerSideB}`),
    pRow('Досок к закупке', `(2 × ${r.boardsPerSideA} + 2 × ${r.boardsPerSideB}) × ${r.rowsByHeight}`, `${r.boardsCountTotal} шт.`),
    pRow('Закупочная длина / объём', `${r.boardsCountTotal} × ${f(i.boardLengthM, 2)} м`, `${f(r.boardsPurchasedLinearM, 1)} м / ${f(r.boardsVolumeM3, 3)} м³`),
    pRow('Опорных узлов', `шаг ${C.BRACE_STEP_M} м по периметру`, `${r.braceNodesCount}`),
    pRow('Брус на один узел', `h + √2 × h + ${C.BRACE_STAKE_LEN_M} м`, `${f(r.lenPerNodeM, 2)} м`),
    pRow('Потребность в брусе', `${r.braceNodesCount} × ${f(r.lenPerNodeM, 2)} м × ${C.TIMBER_WASTE_FACTOR}`, `${f(r.timberLinearReqM, 1)} м`),
    pRow('Заготовок 3 м', `⌈${f(r.timberLinearReqM, 1)} / ${C.TIMBER_STOCK_LEN_M}⌉`, `${r.timberPieces3M} шт. (${f(r.timberPurchasedVolM3, 3)} м³)`)
  ];
  return pSection(5, 'Опалубка и пиломатериалы', pTable(rows) +
    pNote('Закупочный объём больше чистого, так как каждая сторона закрывается целыми досками без использования остатков. Прочность щитов и подкосов не проверяется.'));
}

function renderAssumptionsSection(i, r) {
  const C = MODEL_CONSTANTS;
  const items = [
    `Плотность бетона ${C.ASSUMED_CONCRETE_DENSITY_KG_M3} кг/м³`,
    `Защитный слой ${r.COVER_MM} мм`,
    `Нахлёст ${C.LAP_DIAMETERS_FACTOR}d (сметное допущение)`,
    `Запас рабочей арматуры ${fmtNum((C.REBAR_WASTE_FACTOR - 1) * 100, 0)}%; вспомогательная сталь без запаса`,
    `Фиксаторы ${C.CHAIRS_PER_M2} шт./м², лягушки ${C.FROGS_PER_M2} шт./м²`,
    `Проволока ${C.WIRE_LEN_PER_NODE_M} м на узел`,
    `Миксер ${C.ASSUMED_MIXER_CAPACITY_M3} м³ на рейс`,
    'Карта раскроя арматуры не реализована',
    'Не рассчитываются: несущая способность, продавливание, трещиностойкость, осадка грунта'
  ];
  return pSection(6, 'Допущения и ограничения',
    `<ul class="proto-assumptions">${items.map(t => `<li>${t}</li>`).join('')}</ul>` +
    pNote('Результат — предварительная сметно-геометрическая оценка и не заменяет проект КЖ.'));
}

function renderCalculationBreakdown(inputs, res) {
  const el = byId('res-formula-breakdown');
  if (!el) return;
  // Протокол строится только по успешному расчёту.
  if (!res || res.ok !== true) { el.innerHTML = ''; return; }
  const scopeLine = res.isWithinPassportScope
    ? 'Параметры находятся в пределах диапазона, принятого моделью.'
    : `Есть предупреждения модели: ${res.scopeWarnings.length}. Они показаны в начале результатов.`;
  el.innerHTML = `<div class="calculation-protocol">
    <p class="proto-summary"><strong>Предварительный протокол расчёта.</strong> ${scopeLine}
    Числа взяты из расчётного ядра; для каждой величины показана подстановка.</p>
    ${renderGeometrySection(inputs, res)}
    ${renderConstructiveChecksSection(inputs, res)}
    ${renderMainRebarSection(inputs, res)}
    ${renderAuxiliaryMaterialsSection(inputs, res)}
    ${renderFormworkSection(inputs, res)}
    ${renderAssumptionsSection(inputs, res)}
  </div>`;
}

function renderEstimate(inputs, res) {
  const card = byId('estimate-card');
  const enabled = inputs.estimateEnabled;
  const rows = [
    { row: 'est-row-concrete', sub: 'est-sub-concrete', cost: 'est-cost-concrete', price: inputs.priceConcrete,
      qty: res.V_order, unit: 'м³', label: 'Бетон', eligible: true },
    { row: 'est-row-rebar', sub: 'est-sub-rebar', cost: 'est-cost-rebar', price: inputs.priceRebar,
      qty: (res.estimatedOrderWeightKg + res.auxTotalWeightKg) / 1000, unit: 'т', label: 'Арматура и вспомогательная сталь', eligible: true },
    { row: 'est-row-board', sub: 'est-sub-board', cost: 'est-cost-board', price: inputs.priceBoard,
      qty: res.totalLumberPurchasedVolM3, unit: 'м³', label: 'Пиломатериалы', eligible: true }
  ];
  let total = 0, any = false;
  const missing = [];
  rows.forEach(item => {
    const rowEl = byId(item.row);
    const active = enabled && item.price > 0 && item.qty > 0 && rowEl;
    if (active) {
      const cost = Math.round(item.qty * item.price); total += cost; any = true;
      setText(item.sub, `${fmtNum(item.qty, 2)} ${item.unit} × ${fmtNum(item.price, 0)} ₽/${item.unit}`);
      setText(item.cost, cost.toLocaleString('ru-RU')); rowEl.hidden = false;
    } else {
      if (rowEl) rowEl.hidden = true;
      if (enabled) missing.push(item.label);
    }
  });
  if (card) card.hidden = !enabled;
  if (enabled && any) setText('est-total-cost', total.toLocaleString('ru-RU'));
  else if (enabled) setText('est-total-cost', 'Не рассчитано');
  let note = byId('est-unaccounted');
  if (!note && card && typeof document !== 'undefined') {
    note = document.createElement('p');
    note.id = 'est-unaccounted';
    note.className = 'estimate-note';
    card.appendChild(note);
  }
  const permanentlyExcluded = ['вязальная проволока', 'фиксаторы защитного слоя', 'доставка', 'работы', 'возможные дополнительные материалы'];
  const allExcluded = [...missing, ...permanentlyExcluded];
  if (note) {
    note.textContent = enabled ? (any
      ? `Не учтено в сумме: ${allExcluded.join(', ')}. Стоимость указана только по позициям с введёнными ценами.`
      : `Итог не рассчитан: введите хотя бы одну положительную цену. Не учтено в сумме: ${allExcluded.join(', ')}.`) : '';
    note.hidden = !enabled;
  }
  if (lastCalc) lastCalc.estimate = { enabled, total, any, missing: [...missing], permanentlyExcluded: [...permanentlyExcluded] };
}

// ========================== ЧАСТЬ 3. SVG / КОПИРОВАНИЕ ==========================

function renderProportionalDrawing(length, width, thicknessCm) {
  const polyTop = byId('dyn-poly-top'), polyLeft = byId('dyn-poly-left'), polyRight = byId('dyn-poly-right');
  const lineA = byId('dyn-line-a'), textA = byId('dyn-text-a'), lineB = byId('dyn-line-b'), textB = byId('dyn-text-b');
  const lineC = byId('dyn-line-c'), tickC1 = byId('dyn-tick-c1'), tickC2 = byId('dyn-tick-c2'), textC = byId('dyn-text-c');
  if (!polyTop || !polyLeft || !polyRight || !lineA || !textA || !lineB || !textB || !lineC || !textC) return;
  length = Number(length); width = Number(width); thicknessCm = Number(thicknessCm);
  if (![length, width, thicknessCm].every(Number.isFinite) || length <= 0 || width <= 0 || thicknessCm <= 0) return;
  const W = 420, cos = Math.sqrt(3) / 2, sin = 0.5;
  const maxDim = Math.max(length, width);
  const scale = Math.min(135 / (maxDim * cos), 115 / ((length + width) * sin));
  const a = length * scale, b = width * scale;
  const A = { x: -a * cos, y: a * sin }, B = { x: b * cos, y: b * sin };
  // Высота рисунка намеренно условная, чтобы плита оставалась различимой.
  const h = Math.min(26, Math.max(6, (thicknessCm / 100) * scale));
  const p0 = { x: W / 2, y: 24 };
  const pLeft = { x: p0.x + A.x, y: p0.y + A.y }, pRight = { x: p0.x + B.x, y: p0.y + B.y };
  const pFront = { x: p0.x + A.x + B.x, y: p0.y + A.y + B.y };
  const bottom = p => ({ x: p.x, y: p.y + h });
  const pLeftBot = bottom(pLeft), pRightBot = bottom(pRight), pFrontBot = bottom(pFront);
  const pt = p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  polyTop.setAttribute('points', [p0, pRight, pFront, pLeft].map(pt).join(' '));
  polyLeft.setAttribute('points', [pLeft, pFront, pFrontBot, pLeftBot].map(pt).join(' '));
  polyRight.setAttribute('points', [pFront, pRight, pRightBot, pFrontBot].map(pt).join(' '));
  const offset = 12;
  const a1 = { x: pFrontBot.x + 4, y: pFrontBot.y + offset }, a2 = { x: pRightBot.x + 4, y: pRightBot.y + offset };
  lineA.setAttribute('d', `M ${a1.x} ${a1.y} L ${a2.x} ${a2.y}`);
  textA.setAttribute('x', (a1.x + a2.x) / 2 + 6); textA.setAttribute('y', (a1.y + a2.y) / 2 + 14); textA.textContent = `A: ${fmtNum(length, 2)} м`;
  const b1 = { x: pLeftBot.x - 4, y: pLeftBot.y + offset }, b2 = { x: pFrontBot.x - 4, y: pFrontBot.y + offset };
  lineB.setAttribute('d', `M ${b1.x} ${b1.y} L ${b2.x} ${b2.y}`);
  textB.setAttribute('x', (b1.x + b2.x) / 2 - 6); textB.setAttribute('y', (b1.y + b2.y) / 2 + 14); textB.textContent = `B: ${fmtNum(width, 2)} м`;
  const cx = pRight.x + 12;
  lineC.setAttribute('x1', cx); lineC.setAttribute('y1', pRight.y); lineC.setAttribute('x2', cx); lineC.setAttribute('y2', pRightBot.y);
  if (tickC1 && tickC2) {
    tickC1.setAttribute('x1', cx - 4); tickC1.setAttribute('y1', pRight.y); tickC1.setAttribute('x2', cx + 4); tickC1.setAttribute('y2', pRight.y);
    tickC2.setAttribute('x1', cx - 4); tickC2.setAttribute('y1', pRightBot.y); tickC2.setAttribute('x2', cx + 4); tickC2.setAttribute('y2', pRightBot.y);
  }
  textC.setAttribute('x', cx + 8); textC.setAttribute('y', (pRight.y + pRightBot.y) / 2 + 4); textC.textContent = `C: ${fmtNum(thicknessCm, 1)} см`;
}

function buildSpecification(calc = lastCalc) {
  if (formIsDirty) throw new Error('Параметры формы изменены. Выполните расчёт заново.');
  if (!calc || !calc.inputs || !calc.result) throw new Error('Нет актуального успешного расчёта. Выполните расчёт заново.');
  const { inputs: i, result: r } = calc;
  const date = new Date();
  const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const lines = [
    'СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ: ПЛИТНЫЙ ФУНДАМЕНТ',
    'Сервис: ИнжСмета PRO (inzhsmeta.ru)',
    `Дата расчёта: ${dateStr}, ${timeStr}`,
    '----------------------------------------',
    'КОНСТРУКТИВНЫЕ ПАРАМЕТРЫ:',
    `• Габариты плиты: ${fmtNum(i.length, 2)} × ${fmtNum(i.width, 2)} м, толщина ${fmtNum(i.thicknessMm / 10, 1)} см`,
    `• Периметр фундамента: ${fmtNum(r.P, 2)} пог. м`,
    `• Площадь подошвы: ${fmtNum(r.S, 2)} м²`,
    `• Площадь боковых граней (оценка опалубки): ${fmtNum(r.S_side, 2)} м²`,
    `• Геометрический объём: ${fmtNum(r.V_geom, 2)} м³`,
    `• Условная масса плиты: ~${fmtNum(r.M_slabTons, 1)} т (принятая плотность модели; без арматуры)`,
    `• Принятый в модели защитный слой: ${fmtNum(r.COVER_MM, 0)} мм; значение требует проверки по проекту и условиям эксплуатации.`,
    '', 'ТОВАРНЫЙ БЕТОН:',
    `• Класс / марка смеси по выбранному значению интерфейса: ${i.concreteGrade}`,
    `• Объём к заказу (технологический запас ${fmtNum(i.reservePercent, 1)}%): ${fmtNum(r.V_order, 2)} м³`,
    `• Логистическая оценка: ${r.mixersCount} ${pluralize(r.mixersCount, ['рейс', 'рейса', 'рейсов'])} при условной вместимости ${MODEL_CONSTANTS.ASSUMED_MIXER_CAPACITY_M3} м³ на рейс; это не подтверждённое число машин.`,
    '', 'АРМАТУРНЫЙ КАРКАС И КРЕПЁЖ:',
    `• Сетка: ${i.layers} ${pluralize(i.layers, ['сетка', 'сетки', 'сеток'])}, шаг ячейки ${fmtNum(i.stepXM * 100, 1)} × ${fmtNum(i.stepYM * 100, 1)} см`,
    `• Рабочая арматура А500С Ø${i.mainDia} мм: ${fmtNum(r.estimatedOrderWeightKg, 1)} кг; сметная длина ${fmtNum(r.estimatedOrderLengthM, 0)} м.`,
    ...(i.layers === 2 ? [`• Вспомогательные элементы Ø${i.clampsDia} мм: ${fmtNum(r.auxTotalWeightKg, 1)} кг (оценка по принятым геометрическим допущениям).`] : []),
    `• Вязальная проволока Ø${MODEL_CONSTANTS.WIRE_DIAMETER_MM} мм: расчётная масса ~${fmtNum(r.wireWeightKg, 2)} кг; рекомендуемая закупка — бухта ${fmtNum(r.wireRecommendedCoilKg, 0)} кг.`,
    `• Фиксаторы защитного слоя: ${fmtNum(r.chairsCount, 0)} шт. (условная норма модели 5 шт./м²).`,
    '', 'ОПАЛУБКА И ПИЛОМАТЕРИАЛЫ:',
    `• Доска ${fmtNum(i.boardThickMm, 0)}×${fmtNum(i.boardWidthMm, 0)} мм длиной ${fmtNum(i.boardLengthM, 2)} м: ${r.boardsCountTotal} шт., расчётный закупочный объём ${fmtNum(r.boardsVolumeM3, 3)} м³.`,
    `• Брус ${MODEL_CONSTANTS.TIMBER_SECTION_M * 1000}×${MODEL_CONSTANTS.TIMBER_SECTION_M * 1000} мм для раскрепления: ${r.timberPieces3M} шт. по 3 м; закупочный объём ${fmtNum(r.timberPurchasedVolM3, 3)} м³.`
  ];
  if (i.estimateEnabled) {
    lines.push('', 'ПРЕДВАРИТЕЛЬНАЯ СМЕТА:');
    const est = calc.estimate;
    if (est?.any) lines.push(`• Итого по введённым ценам: ${est.total.toLocaleString('ru-RU')} ₽`);
    else lines.push('• Итог не рассчитан: не введены положительные цены.');
    if (est?.missing?.length) lines.push(`• Не учтено: ${est.missing.join(', ')}.`);
    lines.push('• Смета не включает неуказанные статьи, работы, доставку и возможные дополнительные материалы.');
  }
  lines.push(
    '----------------------------------------',
    'Статус: предварительная сметно-геометрическая оценка. Нормативные ссылки и применимость конструктивных ориентиров требуют независимой проверки.',
    'Не рассчитаны несущая способность, продавливание, трещиностойкость и осадка грунта. Результат не заменяет проект марки КЖ.'
  );
  return lines.join('\n');
}

function fallbackCopy(text, callback) {
  const textarea = document.createElement('textarea');
  textarea.value = text; textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed'; textarea.style.opacity = '0'; textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  let copied = false;
  try {
    textarea.select();
    copied = document.execCommand('copy') === true;
  } catch (_) {
    copied = false;
  } finally {
    textarea.remove?.();
    if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
  }
  if (copied) callback?.();
  else if (typeof alert === 'function') alert('Не удалось скопировать текст. Выделите спецификацию вручную.');
  return copied;
}
function copySpecification() {
  const btnCopy = byId('btn-copy');
  if (!lastCalc || formIsDirty) {
    if (btnCopy) btnCopy.title = 'Параметры изменены. Выполните расчёт заново.';
    return false;
  }
  const text = buildSpecification(lastCalc);
  const onSuccess = () => {
    if (!btnCopy) return;
    if (!Object.prototype.hasOwnProperty.call(btnCopy.dataset, 'slabOriginalText')) {
      btnCopy.dataset.slabOriginalText = btnCopy.textContent;
    }
    btnCopy.textContent = '✓ Скопировано в буфер!';
    btnCopy.style.borderColor = 'var(--color-primary)';
    clearTimeout(btnCopy._slabCopyTimer);
    btnCopy._slabCopyTimer = setTimeout(() => {
      btnCopy.textContent = btnCopy.dataset.slabOriginalText || 'Копировать спецификацию';
      btnCopy.style.borderColor = '';
      delete btnCopy.dataset.slabOriginalText;
      btnCopy._slabCopyTimer = null;
    }, 2000);
  };
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => { onSuccess(); return true; }).catch(() => fallbackCopy(text, onSuccess));
  }
  return fallbackCopy(text, onSuccess);
}

function initializeSlabUI() {
  const form = byId('slab-form');
  if (form && boundForm !== form) {
    boundForm = form;
    // Убираем только сообщение калькулятора перед встроенной проверкой HTML-формы.
    // #form-warn остаётся во владении inline-валидатора и не смешивает два типа ошибок.
    form.addEventListener('submit', () => { setCalcStatus(''); clearFormWarning(); }, true);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const success = calculate();
      if (success) byId('results-root')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    });
    form.addEventListener('input', event => {
      const target = event.target;
      if (target?.id === 'ratio-sand' || target?.id === 'ratio-gravel' || target?.id === 'ratio-cement') {
        target.dataset.userEdited = 'true';
      }
      invalidateLastCalc();
    });
    form.addEventListener('change', invalidateLastCalc);
  }
  const gradeSelect = byId('concrete-grade');
  if (gradeSelect && !gradeSelect.dataset.slabGradeBound) {
    gradeSelect.dataset.slabGradeBound = 'true';
    gradeSelect.addEventListener('change', () => {
      syncMixRatiosFromConcreteGrade();
      invalidateLastCalc();
    });
    // Проставить пропорции по умолчанию для выбранной марки, не перезаписывая ручной ввод.
    syncMixRatiosFromConcreteGrade();
  }
  const btnPrint = byId('print') || byId('btn-print');
  if (btnPrint && !btnPrint.dataset.slabBound) {
    btnPrint.dataset.slabBound = 'true';
    btnPrint.addEventListener('click', () => {
      const dateSpan = byId('print-date');
      if (dateSpan) dateSpan.textContent = new Date().toLocaleDateString('ru-RU');
      if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
    });
  }
  const btnCopy = byId('btn-copy');
  if (btnCopy && !btnCopy.dataset.slabBound) {
    btnCopy.dataset.slabBound = 'true';
    btnCopy.addEventListener('click', copySpecification);
    btnCopy.disabled = !lastCalc || formIsDirty;
  }
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeSlabUI, { once: true });
  else initializeSlabUI();
}

// CommonJS exports for core and integration tests.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REBAR_WEIGHT_MAP, MODEL_CONSTANTS, PASSPORT_SCOPE,
    validateSlabInputs, calculateCore, findInvalidNumber, ceilEps,
    fmtNum, pluralize, readInputsFromForm, syncMixRatiosFromConcreteGrade, calculate, renderProportionalDrawing,
    renderCalculationBreakdown,
    buildSpecification, fallbackCopy, copySpecification, invalidateLastCalc, initializeSlabUI,
    _getLastCalc: () => lastCalc,
    _resetUIState: () => { lastCalc = null; formIsDirty = true; boundForm = null; }
  };
}
