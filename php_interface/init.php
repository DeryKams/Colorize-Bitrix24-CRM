<?php
use Bitrix\Main\EventManager;
use Bitrix\Main\Page\Asset;
use Bitrix\Main\Web\Json;
// подключение JS для окрашивания файлов

\CJSCore::RegisterExt('mycrm_kanban_colorize', [
    /* Путь к вашему JS */
    'js' => '/local/js/mycrm/kanban-colorize.js',

    /* Если появится CSS — раскомментируете */
    // 'css' => '/local/js/mycrm/grid-colorize.css',

    /* Зависимости */
    'rel' => [
        'main.core',
        'main.core.events',
    ],
]);



/* 1) Регистрируем JS-расширение (extension) один раз */
\CJSCore::RegisterExt('mycrm_grid_colorize', [
    /* Путь к вашему JS */
    'js' => '/local/js/mycrm/grid-colorize.js',

    /* Если появится CSS — раскомментируете */
    // 'css' => '/local/js/mycrm/grid-colorize.css',

    /* Зависимости */
    'rel' => [
        'main.core',
        'main.core.events',
        'main.ui.grid',
    ],
]);

/* 2) Подключаем расширение на нужных страницах */


EventManager::getInstance()->addEventHandler('main', 'OnProlog', static function () {

    /* Не трогаем админку */
    if (defined('ADMIN_SECTION') && ADMIN_SECTION === true) {
        return;
    }

    /* Путь без query string */
    $path = (string)(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '');

    /* Определяем страницы LIST (учитываем /list и /list/) */
    $isCrmList  = (bool)preg_match('#^/crm/(company|contact|lead)/list/?$#', $path);
    $isShopList = (bool)preg_match('#^/shop/documents/(contractors|contractors_contacts)/list/?$#', $path);
    $isPageList = (bool)preg_match('#^/page/#', $path); // смарт-процессы list

$isDealList = (
    preg_match('#^/crm/deal(/.*)?$#', $path)
    && !preg_match('#/kanban#', $path)
);

    $isList = ($isCrmList || $isShopList || $isPageList || $isDealList);

    /* Определяем страницы KANBAN (учитываем /kanban и /kanban/) */
$isCrmKanban = (bool)preg_match('#^/crm/(deal|lead)/kanban(/.*)?$#', $path);
    $isPageKanban = (bool)preg_match('#^/page/#', $path); // если у смарт-процессов есть kanban в /page


    $isKanban = ($isCrmKanban || $isPageKanban);

    if (!$isList && !$isKanban) {
        return;
    }

    /* Общая карта значений -> цвет (если хотите единый словарь) */
    $colorMap = [
        'red' => '#ffc9c9',
        'yellow' => '#f6ff00',
        'blue' => '#0051ff',
        'критическое' => '#f6bebe',
        'высокое' => '#fcffb3',
        'повышенное' => '#a1bfff',
		'极高' => '#f6bebe',
        '高度关注' => '#fcffb3',
        '已提升' => '#a1bfff',
    ];

    /* Поля для списков (grid): ищем по data-column-id */
    $gridFieldIds = [
        'UF_CRM_698198E9C57AB',        // Компания     
        'UF_CRM_1770102054174',     // Контакт
		'UF_CRM_1770097787320', // сделки
		'UF_CRM_1770098369889', // лиды
		'UF_CRM_7_1770162699211', // тендеры
		'UF_CRM_4_1770102358826', // Китай

    ];

    /* Канбан: задаём поле по Title (как в карточке) и маппинг Value -> Color */
    $kanbanFieldTitles = [
 'Степень внимания',
 '关注级别 - Степень внимания',
 '关注级别',

];
    /* Значение (value) -> цвет для карточки канбана */
    // $kanbanValueMap =  $colorMap;

    if ($isList) {

        $config = [
            'fieldIds' => $gridFieldIds,
            'colorMap' => $colorMap,
            'debug' => false,
        ];

        Asset::getInstance()->addString(
            '<script>window.MyCrmColorizeConfig=' . Json::encode($config) . ';</script>'
        );

        \CUtil::InitJSCore(['mycrm_grid_colorize']);
    }

    if ($isKanban) {
        $config = [
            'fieldTitles' => $kanbanFieldTitles,
            'valueMap' => $colorMap,
            'debug' => false,
        ];

        Asset::getInstance()->addString(
            '<script>window.MyCrmKanbanColorizeConfig=' . Json::encode($config) . ';</script>'
        );

        \CUtil::InitJSCore(['mycrm_kanban_colorize']);
    }
});


// подключение JS для окрашивания файлов