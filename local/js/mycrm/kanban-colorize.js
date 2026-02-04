(function () {
  'use strict';

  /* Жёсткая защита от повторной инициализации на SPA/перерисовках */
  if (window.__myCrmKanbanColorizeInited) {
    return;
  }
  window.__myCrmKanbanColorizeInited = true;

  var CFG = window.MyCrmKanbanColorizeConfig || {};

/* Поддерживаем и новый формат (fieldTitles), и старый (fieldTitle) */
var FIELD_TITLES = [];

if (Array.isArray(CFG.fieldTitles)) {
  FIELD_TITLES = CFG.fieldTitles
    .map(function (t) { return (t || '').toString().trim(); })
    .filter(Boolean);
} else if (CFG.fieldTitle) {
  FIELD_TITLES = [(CFG.fieldTitle || '').toString().trim()].filter(Boolean);
}

  var VALUE_MAP = (CFG.valueMap && typeof CFG.valueMap === 'object') ? CFG.valueMap : {};
  var DEBUG = !!CFG.debug;

  function log() {
    if (!DEBUG) return;
    // eslint-disable-next-line no-console
    console.log.apply(console, arguments);
  }

  function normalize(value) {
    return (value || '').toString().trim().toLowerCase();
  }

function findValueByTitles(card, titles) {
  var items = card.querySelectorAll('.crm-kanban-item-fields-item');
  if (!items.length) return '';

  /* Нормализуем все варианты заголовков один раз */
  var need = (titles || [])
    .map(function (t) { return normalize(t); })
    .filter(Boolean);

  if (!need.length) return '';

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var titleEl = item.querySelector('.crm-kanban-item-fields-item-title-text');
    if (!titleEl) continue;

    var current = normalize(titleEl.textContent);

    /* Совпадение с любым вариантом */
    var matched = false;
    for (var k = 0; k < need.length; k++) {
      if (current === need[k]) {
        matched = true;
        break;
      }
    }
    if (!matched) continue;

    var valueEl = item.querySelector('.crm-kanban-item-fields-item-value');
    return normalize(valueEl ? valueEl.textContent : '');
  }

  return '';
}


  function paintCard(card, bg) {
    /* В канбане Битрикса часто фон задаётся переменной.
       Поэтому ставим и background-color, и --crm-kanban-item-color */
    card.style.setProperty('--crm-kanban-item-color', bg, 'important');
    card.style.setProperty('background-color', bg, 'important');
    card.style.setProperty('transition', 'background-color 150ms ease', 'important');
    card.setAttribute('data-mycrm-kanban-colored', '1');
  }

  function clearCard(card) {
    if (card.getAttribute('data-mycrm-kanban-colored') !== '1') return;

    card.style.removeProperty('--crm-kanban-item-color');
    card.style.removeProperty('background-color');
    card.style.removeProperty('transition');
    card.removeAttribute('data-mycrm-kanban-colored');
  }

 function colorizeCard(card) {
  /* Теперь работаем со списком заголовков */
  if (!FIELD_TITLES.length) {
    log('FIELD_TITLES пустой: проверь MyCrmKanbanColorizeConfig.fieldTitles / fieldTitle');
    return;
  }

  /* Ищем значение по любому из заголовков */
  var key = findValueByTitles(card, FIELD_TITLES);
  if (!key) {
    clearCard(card);
    return;
  }

  /* valueMap ищем по ключу */
  var bg = VALUE_MAP[key];
  if (!bg) {
    clearCard(card);
    return;
  }

  paintCard(card, bg);
}

  function colorizeAllCards(root) {
    var scope = root || document;
    var cards = scope.querySelectorAll('.crm-kanban-item');
    if (!cards.length) return;

    cards.forEach(function (card) {
      colorizeCard(card);
    });
  }

  /* Дебаунс, чтобы не красить 1000 раз при одном обновлении DOM */
  var paintTimer = null;
  function scheduleRepaint(rootNode) {
    if (paintTimer) clearTimeout(paintTimer);
    paintTimer = setTimeout(function () {
      paintTimer = null;
      colorizeAllCards(rootNode || document);
    }, 80);
  }

  function attachObserver() {
    /* Контейнер канбана в CRM бывает разный, берём самый общий */
    var container =
      document.querySelector('.crm-kanban') ||
      document.querySelector('.crm-kanban-board') ||
      document.querySelector('.crm-kanban-columns') ||
      document.querySelector('.crm-kanban-wrapper') ||
      document.body;

    if (container.dataset.mycrmKanbanObserver === '1') {
      return;
    }
    container.dataset.mycrmKanbanObserver = '1';

    var observer = new MutationObserver(function (mutations) {
      /* Если добавили карточки или перерисовали колонку — перекрасим */
      var need = false;

      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];

        if (m.type !== 'childList') continue;

        if (m.addedNodes && m.addedNodes.length) {
          need = true;
          break;
        }
      }

      if (need) {
        scheduleRepaint(container);
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    /* Перекраска при DnD (перетаскивание карточек часто меняет DOM) */
    container.addEventListener('mouseup', function () {
      scheduleRepaint(container);
    }, { passive: true });

    container.addEventListener('touchend', function () {
      scheduleRepaint(container);
    }, { passive: true });

    log('Kanban observer attached on', container);
  }

  function bootstrap() {
    log('Kanban colorize bootstrap. Config=', CFG);

    /* Первичная окраска */
    colorizeAllCards(document);

    /* Обсервер на AJAX/перерисовки */
    attachObserver();

    /* На случай поздней загрузки данных */
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      colorizeAllCards(document);
      if (tries >= 25) clearInterval(timer);
    }, 300);
  }

  if (typeof BX !== 'undefined' && BX.ready) {
    BX.ready(bootstrap);
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap);
  }
})();
