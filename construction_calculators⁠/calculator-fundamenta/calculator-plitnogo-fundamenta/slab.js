/**
 * @fileoverview Инженерный расчёт плитного фундамента с динамическим SVG-чертежом,
 * расширенным сортаментом арматуры и сметой по СП 63.13330 и ГОСТ 34028-2016.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('slab-form');
  const resultsRoot = document.getElementById('results-root');
  const estimateCard = document.getElementById('estimate-card');
  const btnPrint = document.getElementById('btn-print');
  const btnCopy = document.getElementById('btn-copy');

  // Чекбоксы модулей
  const toggleFormwork = document.getElementById('toggle-formwork');
  const toggleRebar = document.getElementById('toggle-rebar');
  const toggleManualMix = document.getElementById('toggle-manual-mix');
  const toggleEstimate = document.getElementById('toggle-estimate');
  const concreteGradeSelect = document.getElementById('concrete-grade');
  const rebarLayersSelect = document.getElementById('rebar-layers');
  const rebarClampsSelect = document.getElementById('rebar-clamps-dia');

  // Элементы динамического SVG
  const polyTop = document.getElementById('dyn-poly-top');
  const polyLeft = document.getElementById('dyn-poly-left');
  const polyRight = document.getElementById('dyn-poly-right');
  const lineA = document.getElementById('dyn-line-a');
  const textA = document.getElementById('dyn-text-a');
  const lineB = document.getElementById('dyn-line-b');
  const textB = document.getElementById('dyn-text-b');
  const lineC = document.getElementById('dyn-line-c');
  const tickC1 = document.getElementById('dyn-tick-c1');
  const tickC2 = document.getElementById('dyn-tick-c2');
  const textC = document.getElementById('dyn-text-c');

  // Масса 1 пог. м арматуры по ГОСТ 34028-2016 (Таблица 2)
  const REBAR_WEIGHT_MAP = {
    6: 0.222,
    8: 0.395,
    10: 0.617,
    12: 0.888,
    14: 1.208,
    16: 1.578,
    18: 1.998,
    20: 2.466,
    22: 2.984,
    25: 3.853
  };

  function pluralize(count, words) {
    const cases = [2, 0, 1, 1, 1, 2];
    const index = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];
    return `${count} ${words[index]}`;
  }

  // Автозаполнение пропорций при выборе марки
  if (concreteGradeSelect) {
    concreteGradeSelect.addEventListener('change', () => {
      const opt = concreteGradeSelect.options[concreteGradeSelect.selectedIndex];
      const sand = opt.getAttribute('data-sand');
      const gravel = opt.getAttribute('data-gravel');
      if (sand) document.getElementById('ratio-sand').value = sand;
      if (gravel) document.getElementById('ratio-gravel').value = gravel;
    });
  }

  // Блокировка выбора хомутов при 1 ярусе армирования
  if (rebarLayersSelect && rebarClampsSelect) {
    rebarLayersSelect.addEventListener('change', () => {
      rebarClampsSelect.disabled = parseInt(rebarLayersSelect.value, 10) < 2;
    });
  }

  function renderProportionalDrawing(length, width, thicknessCm) {
    length = Number(length);
    width = Number(width);
    thicknessCm = Number(thicknessCm);

    if (
      !Number.isFinite(length) ||
      !Number.isFinite(width) ||
      !Number.isFinite(thicknessCm) ||
      length <= 0 ||
      width <= 0 ||
      thicknessCm <= 0
    ) return;

    const W = 420;
    const cos = Math.sqrt(3) / 2;
    const sin = 0.5;

    // Оставляем запас по вертикали под толщину плиты и выносные линии
    const maxDim = Math.max(length, width);
    const scale = Math.min(
      135 / (maxDim * cos),
      115 / ((length + width) * sin)
    );

    const a = length * scale;
    const b = width * scale;

    const A = { x: -a * cos, y: a * sin };
    const B = { x: b * cos, y: b * sin };

    // Ограничиваем визуальную толщину сверху, чтобы чертёж не выходил за viewBox
    const h = Math.min(26, Math.max(6, (thicknessCm / 100) * scale));

    const centerX = W / 2;
    const topY = 24;

    const p0 = { x: centerX, y: topY };
    const pLeft = { x: p0.x + A.x, y: p0.y + A.y };
    const pRight = { x: p0.x + B.x, y: p0.y + B.y };
    const pFront = { x: p0.x + A.x + B.x, y: p0.y + A.y + B.y };

    const bottom = p => ({ x: p.x, y: p.y + h });
    const pLeftBot = bottom(pLeft);
    const pRightBot = bottom(pRight);
    const pFrontBot = bottom(pFront);

    const pt = p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

    polyTop.setAttribute('points', [p0, pRight, pFront, pLeft].map(pt).join(' '));
    polyLeft.setAttribute('points', [pLeft, pFront, pFrontBot, pLeftBot].map(pt).join(' '));
    polyRight.setAttribute('points', [pFront, pRight, pRightBot, pFrontBot].map(pt).join(' '));

    const offset = 12;

    // Размер A (правое переднее ребро)
    const a1 = { x: pFrontBot.x + 4, y: pFrontBot.y + offset };
    const a2 = { x: pRightBot.x + 4, y: pRightBot.y + offset };
    lineA.setAttribute('d', `M ${a1.x} ${a1.y} L ${a2.x} ${a2.y}`);
    textA.setAttribute('x', (a1.x + a2.x) / 2 + 6);
    textA.setAttribute('y', (a1.y + a2.y) / 2 + 14);
    textA.textContent = `A: ${length} м`;

    // Размер B (левое переднее ребро)
    const b1 = { x: pLeftBot.x - 4, y: pLeftBot.y + offset };
    const b2 = { x: pFrontBot.x - 4, y: pFrontBot.y + offset };
    lineB.setAttribute('d', `M ${b1.x} ${b1.y} L ${b2.x} ${b2.y}`);
    textB.setAttribute('x', (b1.x + b2.x) / 2 - 6);
    textB.setAttribute('y', (b1.y + b2.y) / 2 + 14);
    textB.textContent = `B: ${width} м`;

    // Размер C (толщина плиты)
    const cx = pRight.x + 12;
    lineC.setAttribute('x1', cx);
    lineC.setAttribute('y1', pRight.y);
    lineC.setAttribute('x2', cx);
    lineC.setAttribute('y2', pRightBot.y);

    tickC1.setAttribute('x1', cx - 4);
    tickC1.setAttribute('y1', pRight.y);
    tickC1.setAttribute('x2', cx + 4);
    tickC1.setAttribute('y2', pRight.y);

    tickC2.setAttribute('x1', cx - 4);
    tickC2.setAttribute('y1', pRightBot.y);
    tickC2.setAttribute('x2', cx + 4);
    tickC2.setAttribute('y2', pRightBot.y);

    textC.setAttribute('x', cx + 8);
    textC.setAttribute('y', (pRight.y + pRightBot.y) / 2 + 4);
    textC.textContent = `C: ${thicknessCm} см`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
    resultsRoot.hidden = false;
    resultsRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });


if (btnPrint) {
  btnPrint.addEventListener('click', () => {
    // Подставляем текущую дату в штамп листа
    const dateSpan = document.getElementById('print-date');
    if (dateSpan) {
      dateSpan.textContent = new Date().toLocaleDateString('ru-RU');
    }
    // Вызов штатного окна сохранения PDF
    window.print();
  });
}


  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      // 1. Исходные параметры геометрии
      const lVal = parseFloat(document.getElementById('slab-length')?.value) || 0;
      const wVal = parseFloat(document.getElementById('slab-width')?.value) || 0;
      const hVal = parseFloat(document.getElementById('slab-thickness')?.value) || 0;
      const reserve = document.getElementById('reserve-input')?.value || '5';
      
      const perimeter = ((lVal + wVal) * 2).toFixed(2);
      const area = document.getElementById('res-base-area')?.textContent || (lVal * wVal).toFixed(2);
      const geom = document.getElementById('res-geom-volume')?.textContent || ((lVal * wVal * hVal) / 100).toFixed(2);
      const order = document.getElementById('res-order-volume')?.textContent || '';
      const mixers = document.getElementById('res-mixers-count')?.textContent || '';
      const grade = concreteGradeSelect?.value || 'М300 (В22.5)';
      
      // Дата и время формирования отчёта
      const now = new Date();
      const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      // 2. Сборка спецификации
      let text = `СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ: ПЛИТНЫЙ ФУНДАМЕНТ\n`;
      text += `Сервис: ИнжСмета PRO (inzhsmeta.ru)\n`;
      text += `Дата расчёта: ${dateStr}, ${timeStr}\n`;
      text += `----------------------------------------\n`;
      
      text += `КОНСТРУКТИВНЫЕ ПАРАМЕТРЫ:\n`;
      text += `• Габариты плиты: ${lVal.toFixed(2)} × ${wVal.toFixed(2)} м, толщина ${hVal} см\n`;
      text += `• Периметр плиты: ${perimeter} пог. м\n`;
      text += `• Площадь основания: ${area} м²\n`;
      text += `• Объём геометрический: ${geom} м³\n`;
      text += `• Защитный слой бетона: 35–40 мм снизу / 30 мм торцы\n\n`;

      text += `ТОВАРНЫЙ БЕТОН:\n`;
      text += `• Класс / Марка: ${grade}\n`;
      text += `• К заказу на завод (запас ${reserve}%): ${order} м³\n`;
      text += `• Доставка: ~${mixers} (миксер 7–8 м³)\n`;
      text += `• Требования к смеси: подвижность П3/П4, W6 (водостойкость), F150 (морозостойкость)\n`;

      // 3. Арматурный каркас (если включен)
      if (typeof toggleRebar !== 'undefined' && toggleRebar?.checked) {
        const dia = document.getElementById('rebar-diameter')?.value || '12';
        const layers = document.getElementById('rebar-layers')?.value || '2';
        const step = document.getElementById('rebar-step')?.value || '200';
        const mainW = document.getElementById('res-rebar-weight')?.textContent || '0';
        const mainL = document.getElementById('res-rebar-length')?.textContent || '';
        const wireW = document.getElementById('res-wire-weight')?.textContent || '0';
        const chairs = document.getElementById('res-chairs-count')?.textContent || '0';

        text += `\nАРМАТУРА И КРЕПЁЖ (СП 63.13330):\n`;
        text += `• Сетка: ${layers} яруса, шаг ячейки ${step}×${step} мм\n`;
        text += `• Рабочая продольная А500С Ø${dia} мм: ${mainW} кг (${mainL})\n`;
        
        if (parseInt(layers, 10) >= 2) {
          const clampsW = document.getElementById('res-clamps-weight')?.textContent || '0';
          const clampsDia = document.getElementById('rebar-clamps-dia')?.value || '8';
          text += `• Конструктивные элементы (П-шки и «лягушки») Ø${clampsDia} мм: ${clampsW} кг\n`;
        }
        
        text += `• Вязальная проволока отожжённая 1.2 мм: ~${wireW} кг\n`;
        text += `• Фиксаторы защитного слоя («стульчики» 35–40 мм): ${chairs} шт.\n`;
      }

      // 4. Опалубка и подготовка основания
      if (typeof toggleFormwork !== 'undefined' && toggleFormwork?.checked) {
        const boardsV = document.getElementById('res-boards-volume')?.textContent || '0';
        const boardsP = document.getElementById('res-boards-pieces')?.textContent || '';
        const timberV = document.getElementById('res-timber-volume')?.textContent || '0';
        
        // Расчёт гидроизоляции с учётом нахлёста полотен 15%
        const filmArea = (parseFloat(area) * 1.15).toFixed(1);

        text += `\nОПАЛУБКА И ПОДГОТОВКА ОСНОВАНИЯ:\n`;
        text += `• Гидроизоляция (плёнка ПЭ 200 мкм с нахлёстом): ~${filmArea} м²\n`;
        text += `• Доска обрезная (борта опалубки): ${boardsV} м³ (${boardsP})\n`;
        text += `• Брус 50×50 мм (колья и упоры): ${timberV} м³\n`;
      }

      // 5. Итоговая смета (если включена)
      if (typeof toggleEstimate !== 'undefined' && toggleEstimate?.checked && !estimateCard?.hidden) {
        const total = document.getElementById('est-total-cost')?.textContent || '0';
        text += `\nОРИЕНТИРОВОЧНАЯ СМЕТА МАТЕРИАЛОВ:\n`;
        text += `• Итого к оплате: ${total} ₽\n`;
      }

      text += `----------------------------------------\n`;
      text += `Расчёт выполнен по СП 63.13330.2018 и ГОСТ 34028-2016\n`;
      text += `ИнжСмета PRO — онлайн-калькулятор строительных конструкций`;

      // 6. Копирование в буфер обмена с безопасным фолбэком
      const onSuccess = () => {
        const origText = btnCopy.textContent;
        btnCopy.textContent = '✓ Скопировано в буфер!';
        btnCopy.style.borderColor = 'var(--color-primary)';
        setTimeout(() => {
          btnCopy.textContent = origText;
          btnCopy.style.borderColor = '';
        }, 2000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess));
      } else {
        fallbackCopy(text, onSuccess);
      }
    });
  }

  // Запасной метод копирования для старых WebView или песочниц
  function fallbackCopy(text, callback) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      if (callback) callback();
    } catch (e) {
      alert('Не удалось скопировать текст. Выделите его вручную.');
    }
    document.body.removeChild(textarea);
  }

  function calculate() {
    const length = parseFloat(document.getElementById('slab-length').value) || 0;
    const width = parseFloat(document.getElementById('slab-width').value) || 0;
    const thicknessCm = parseFloat(document.getElementById('slab-thickness').value) || 0;
    const concreteGrade = concreteGradeSelect ? concreteGradeSelect.value : '';
    const reservePercent = parseFloat(document.getElementById('reserve-input').value) || 0;

    if (length <= 0 || width <= 0 || thicknessCm <= 0) return;

    const thickness = thicknessCm / 100;
    renderProportionalDrawing(length, width, thicknessCm);

    const baseArea = length * width;
    const perimeter = 2 * (length + width);
    const geomVolume = baseArea * thickness;
    const slabWeightTons = geomVolume * 2.5;
    const orderVolume = geomVolume * (1 + reservePercent / 100);
    const mixers = Math.ceil(orderVolume / 7);

    document.getElementById('res-base-area').textContent = baseArea.toFixed(2);
    document.getElementById('res-perimeter').textContent = perimeter.toFixed(2);
    document.getElementById('res-geom-volume').textContent = geomVolume.toFixed(2);
    document.getElementById('res-slab-weight').textContent = slabWeightTons.toFixed(1);
    document.getElementById('res-order-volume').textContent = orderVolume.toFixed(2);

    const gradeText = concreteGrade || 'М300 (В22,5)';
    document.getElementById('res-reserve-label').textContent = `${gradeText} · с учётом запаса ${reservePercent}%`;
    document.getElementById('res-formula-inline').textContent = `${geomVolume.toFixed(2)} м³ × ${(1 + reservePercent / 100).toFixed(2)} = ${orderVolume.toFixed(2)} м³`;
    document.getElementById('res-mixers-count').textContent = pluralize(mixers, ['рейс', 'рейса', 'рейсов']);

    const formulaSteps = [
      `<div><code>S_плиты = ${length} × ${width} = ${baseArea.toFixed(2)} м²</code></div>`,
      `<div><code>P_плиты = 2 × (${length} + ${width}) = ${perimeter.toFixed(2)} м</code></div>`,
      `<div><code>V_бетона = ${baseArea.toFixed(2)} × ${thickness.toFixed(2)} × (1 + ${reservePercent}/100) = ${orderVolume.toFixed(2)} м³</code></div>`
    ];

    // 1. Ручной замес
    const isManualMix = toggleManualMix && toggleManualMix.checked;
    const rowManualMix = document.getElementById('row-manual-mix');
    if (isManualMix) {
      const rCement = parseFloat(document.getElementById('ratio-cement').value) || 1;
      const rSand = parseFloat(document.getElementById('ratio-sand').value) || 1.9;
      const rGravel = parseFloat(document.getElementById('ratio-gravel').value) || 2.8;

      const totalParts = rCement + rSand + rGravel;
      const totalDryMassKg = orderVolume * 2200;
      const cementKg = Math.ceil((totalDryMassKg * rCement) / totalParts);
      const sandTons = ((totalDryMassKg * rSand) / totalParts / 1000).toFixed(2);
      const gravelTons = ((totalDryMassKg * rGravel) / totalParts / 1000).toFixed(2);
      const waterLiters = Math.round(cementKg * 0.55);
      const bagsCount = Math.ceil(cementKg / 50);

      document.getElementById('res-manual-title').textContent = `Состав для замеса (${rCement} : ${rSand} : ${rGravel})`;
      document.getElementById('res-manual-sub').textContent = `Цемент: ${cementKg} кг · Песок: ${sandTons} т · Щебень: ${gravelTons} т · Вода: ~${waterLiters} л`;
      document.getElementById('res-manual-bags').textContent = `${bagsCount} меш. (по 50 кг)`;
      rowManualMix.hidden = false;
    } else {
      rowManualMix.hidden = true;
    }

    // 2. Опалубка и брус
    const isFormwork = toggleFormwork && toggleFormwork.checked;
    const rowFormworkArea = document.getElementById('row-formwork-area');
    const rowFormworkBoards = document.getElementById('row-formwork-boards');
    const rowFormworkTimber = document.getElementById('row-formwork-timber');
    const secHeaderFormwork = document.getElementById('sec-header-formwork');
    if (secHeaderFormwork) secHeaderFormwork.hidden = !isFormwork;

    let totalLumberVolume = 0;

    if (isFormwork) {
      const boardWidthMm = parseFloat(document.getElementById('board-width').value) || 150;
      const boardThickMm = parseFloat(document.getElementById('board-thickness').value) || 40;
      const boardLengthM = parseFloat(document.getElementById('board-length').value) || 6;
      const formworkArea = perimeter * thickness;

      const rowsByHeight = Math.ceil((thicknessCm * 10) / boardWidthMm);
      const totalBoardLengthM = perimeter * rowsByHeight * 1.1;
      const boardsCount = Math.ceil(totalBoardLengthM / boardLengthM);
      const boardsVolume = boardsCount * boardLengthM * (boardWidthMm / 1000) * (boardThickMm / 1000);

      // Длина бруса на 1 упор учитывает высоту щита (стойка + подкос 45° + колышек)
      const supportBracesCount = Math.ceil(perimeter / 0.6);
      const bracePerPointM = Math.max(0.9, thickness * 2.5 + 0.4);
      const timberLinearM = Math.ceil(supportBracesCount * bracePerPointM);
      const timberVolumeM3 = timberLinearM * 0.05 * 0.05;

      totalLumberVolume = boardsVolume + timberVolumeM3;

      const rowsWord = pluralize(rowsByHeight, ['ряд', 'ряда', 'рядов']);
      document.getElementById('res-formwork-area').textContent = formworkArea.toFixed(2);
      document.getElementById('res-boards-title').textContent = `Доска опалубки (${boardWidthMm}×${boardThickMm} мм)`;
      document.getElementById('res-boards-pieces').textContent = `${boardsCount} шт. по ${boardLengthM} м (${rowsWord}, +10% запас)`;
      document.getElementById('res-boards-volume').textContent = boardsVolume.toFixed(2);

      document.getElementById('res-timber-sub').textContent = `${supportBracesCount} шт. упоров (~${timberLinearM} пог. м бруса 50×50)`;
      document.getElementById('res-timber-volume').textContent = timberVolumeM3.toFixed(2);

      formulaSteps.push(`<div><code>V_опалубки = ${boardsVolume.toFixed(2)} м³ (доска) + ${timberVolumeM3.toFixed(2)} м³ (брус) = ${totalLumberVolume.toFixed(2)} м³</code></div>`);

      rowFormworkArea.hidden = false;
      rowFormworkBoards.hidden = false;
      rowFormworkTimber.hidden = false;
    } else {
      rowFormworkArea.hidden = true;
      rowFormworkBoards.hidden = true;
      rowFormworkTimber.hidden = true;
    }

    // 3. Арматура, проволока и фиксаторы
    const isRebar = toggleRebar && toggleRebar.checked;
    const rowRebarMain = document.getElementById('row-rebar-main');
    const rowRebarClamps = document.getElementById('row-rebar-clamps');
    const rowRebarWire = document.getElementById('row-rebar-wire');
    const rowRebarChairs = document.getElementById('row-rebar-chairs');
    const secHeaderRebar = document.getElementById('sec-header-rebar');
    if (secHeaderRebar) secHeaderRebar.hidden = !isRebar;

    let totalAllRebarTons = 0;

    if (isRebar) {
      const layers = parseInt(document.getElementById('rebar-layers').value, 10) || 2;
      const mainDia = parseInt(document.getElementById('rebar-diameter').value, 10) || 12;
      const clampsDia = parseInt(document.getElementById('rebar-clamps-dia').value, 10) || 8;
      const stepXCm = parseFloat(document.getElementById('rebar-step-x').value) || 20;
      const stepYCm = parseFloat(document.getElementById('rebar-step-y').value) || 20;

       const stepXM = stepXCm / 100;
      const stepYM = stepYCm / 100;

      // 1. Защитный слой бетона с торцов по СП 63.13330 (35 мм)
      const COVER_SIDE_M = 0.035;
      const rodLength = Math.max(0, length - 2 * COVER_SIDE_M);
      const rodWidth = Math.max(0, width - 2 * COVER_SIDE_M);

      // 2. Количество стержней по осям
      const rodsAlongLength = Math.floor(rodWidth / stepXM) + 1;
      const rodsAlongWidth = Math.floor(rodLength / stepYM) + 1;

      // 3. Нахлёст по СП 63.13330 (~40 диаметров при длине стороны больше хлыста 11.7 м)
      const overlapLenM = (40 * mainDia) / 1000;
      const lapsX = Math.floor(rodLength / 11.7);
      const lapsY = Math.floor(rodWidth / 11.7);

      const totalXRodLen = rodLength + lapsX * overlapLenM;
      const totalYRodLen = rodWidth + lapsY * overlapLenM;

      const oneLayerLen = (rodsAlongLength * totalXRodLen) + (rodsAlongWidth * totalYRodLen);
      // Запас 4% на резку и хвостики вместо грубых 10%
      const mainRebarLength = Math.ceil(oneLayerLen * layers * 1.04);

      // 4. Проверка минимального процента армирования (СП 63.13330, п. 10.3.6: мин. 0.1%)
      const barAreaCm2 = (Math.PI * Math.pow(mainDia / 10, 2)) / 4;
      const barsPerMeter = 100 / stepXCm;
      const actualAsCm2 = barAreaCm2 * barsPerMeter;
      const minAsCm2 = 0.001 * (100 * thicknessCm);

      if (actualAsCm2 < minAsCm2) {
        console.warn(`Внимание: сечение арматуры (${actualAsCm2.toFixed(2)} см²/м) ниже нормы СП (${minAsCm2.toFixed(2)} см²/м)`);
      }

      const mainUnitWeight = REBAR_WEIGHT_MAP[mainDia] || 0.888;
      const mainRebarWeightKg = Math.round(mainRebarLength * mainUnitWeight);

      const rods117 = Math.ceil(mainRebarLength / 11.7);
      const rods6m = Math.ceil(mainRebarLength / 6.0);

      // П-шки по торцам стержней и лягушки между ярусами
      let clampsLength = 0;
      let clampsWeightKg = 0;
      let extraClampNodes = 0;

      if (layers >= 2) {
        const coreHeight = Math.max(0.06, thickness - 0.08);
        const uPinsCount = 2 * (rodsAlongLength + rodsAlongWidth);
        const uPinLen = coreHeight + 0.8; // высота + 2 анкерные лапки по 40 см

        const frogsCount = Math.ceil(baseArea * 1.5) * (layers - 1);
        const frogHorizPart = Math.max(0.3, Math.min(stepXM, stepYM) + 0.1);
        const frogLen = coreHeight * 2 + frogHorizPart * 3;

        clampsLength = Math.ceil(uPinsCount * uPinLen + frogsCount * frogLen);
        const clampUnitWeight = REBAR_WEIGHT_MAP[clampsDia] || 0.395;
        clampsWeightKg = Math.round(clampsLength * clampUnitWeight);
        extraClampNodes = (uPinsCount + frogsCount) * 4;
        rowRebarClamps.hidden = false;
      } else {
        rowRebarClamps.hidden = true;
      }

      // Вязальная проволока Ø1.2 мм (сложенная вдвое, 0.35 м на узел)
      const totalCrossNodes = (rodsAlongLength * rodsAlongWidth * layers) + extraClampNodes;
      const wireWeightKg = Math.max(1, +(totalCrossNodes * 0.35 * 0.0089).toFixed(1));

      const chairsCount = Math.ceil(baseArea * 5);

      document.getElementById('res-rebar-title').textContent = `Рабочая арматура А500С Ø${mainDia} мм`;
      document.getElementById('res-rebar-length').textContent = `${mainRebarLength.toLocaleString('ru-RU')} пог. м (${rods117} хлыстов по 11.7 м или ${rods6m} шт. по 6 м)`;
      document.getElementById('res-rebar-weight').textContent = mainRebarWeightKg.toLocaleString('ru-RU');

      document.getElementById('res-clamps-title').textContent = `П-шки и лягушки А500С Ø${clampsDia} мм`;
      document.getElementById('res-clamps-length').textContent = `${clampsLength.toLocaleString('ru-RU')} пог. м (~${Math.ceil(clampsLength / 11.7)} хлыстов по 11.7 м)`;
      document.getElementById('res-clamps-weight').textContent = clampsWeightKg.toLocaleString('ru-RU');

      document.getElementById('res-wire-sub').textContent = `на ~${totalCrossNodes.toLocaleString('ru-RU')} узлов (моток Ø1.2 мм)`;
      document.getElementById('res-wire-weight').textContent = wireWeightKg.toLocaleString('ru-RU');
      document.getElementById('res-chairs-count').textContent = chairsCount.toLocaleString('ru-RU');

      totalAllRebarTons = (mainRebarWeightKg + clampsWeightKg) / 1000;
      formulaSteps.push(`<div><code>L_арматуры = (${rodsAlongLength} шт. × ${totalXRodLen.toFixed(2)} м + ${rodsAlongWidth} шт. × ${totalYRodLen.toFixed(2)} м) × ${layers} яр. × 1.04 = ${mainRebarLength} м (${mainRebarWeightKg} кг)</code></div>`);

      rowRebarMain.hidden = false;
      rowRebarWire.hidden = false;
      rowRebarChairs.hidden = false;
    } else {
      rowRebarMain.hidden = true;
      rowRebarClamps.hidden = true;
      rowRebarWire.hidden = true;
      rowRebarChairs.hidden = true;
    }

    document.getElementById('res-formula-breakdown').innerHTML = formulaSteps.join('');

    // 4. Смета (включая брус в объём пиломатериала)
    const isEstimate = toggleEstimate && toggleEstimate.checked;
    const priceConcrete = parseFloat(document.getElementById('price-concrete').value) || 0;
    const priceRebar = parseFloat(document.getElementById('price-rebar').value) || 0;
    const priceBoard = parseFloat(document.getElementById('price-board').value) || 0;

    let totalEstimateRub = 0;
    let hasAnyPrice = false;

    const estRowConcrete = document.getElementById('est-row-concrete');
    if (isEstimate && priceConcrete > 0) {
      const costC = Math.round(orderVolume * priceConcrete);
      document.getElementById('est-sub-concrete').textContent = `${orderVolume.toFixed(2)} м³ × ${priceConcrete.toLocaleString('ru-RU')} ₽/м³`;
      document.getElementById('est-cost-concrete').textContent = costC.toLocaleString('ru-RU');
      estRowConcrete.hidden = false;
      totalEstimateRub += costC;
      hasAnyPrice = true;
    } else {
      estRowConcrete.hidden = true;
    }

    const estRowRebar = document.getElementById('est-row-rebar');
    if (isEstimate && priceRebar > 0 && isRebar && totalAllRebarTons > 0) {
      const costR = Math.round(totalAllRebarTons * priceRebar);
      document.getElementById('est-sub-rebar').textContent = `${totalAllRebarTons.toFixed(2)} т × ${priceRebar.toLocaleString('ru-RU')} ₽/т`;
      document.getElementById('est-cost-rebar').textContent = costR.toLocaleString('ru-RU');
      estRowRebar.hidden = false;
      totalEstimateRub += costR;
      hasAnyPrice = true;
    } else {
      estRowRebar.hidden = true;
    }

    const estRowBoard = document.getElementById('est-row-board');
    if (isEstimate && priceBoard > 0 && isFormwork && totalLumberVolume > 0) {
      const costB = Math.round(totalLumberVolume * priceBoard);
      document.getElementById('est-sub-board').textContent = `${totalLumberVolume.toFixed(2)} м³ × ${priceBoard.toLocaleString('ru-RU')} ₽/м³`;
      document.getElementById('est-cost-board').textContent = costB.toLocaleString('ru-RU');
      estRowBoard.hidden = false;
      totalEstimateRub += costB;
      hasAnyPrice = true;
    } else {
      estRowBoard.hidden = true;
    }

    if (isEstimate && hasAnyPrice) {
      document.getElementById('est-total-cost').textContent = totalEstimateRub.toLocaleString('ru-RU');
      estimateCard.hidden = false;
    } else {
      estimateCard.hidden = true;
    }
  }
});
