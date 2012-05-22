Ext.onReady(function() {

    Ext.define("phpdoe.locale.view.window.msg", {
        override: "phpdoe.view.window.msg",
        itemText : {

            // wait section
            PleaseWait: 'Пожалуйста, подождите...',

            // confirm/info/alert section
            thanks: {
                title: 'Спасибо!',
                text:  'Спасибо, что пользовались этим приложением!'
            },
            logout: {
                title: 'Подтверждение',
                text: 'Вы уверены, что хотите выйти?'
            },
            eraseData: {
                title: 'Подтверждение',
                text: 'Это действие сотрет ваши личные данные. Все содержание об этом аккаунте будет полностью удалено. Вы уверены в том, что хотите этого?'
            }
        }
    });



    Ext.define("phpdoe.locale.view.main.menu", {
        override: "phpdoe.view.main.menu",
        text: "Основное меню",
        itemText: {
            RefreshAllData: 'Обновить все данные',
            BuildTools: 'Инструменты сборки',
            CheckBuild: 'Проверить билд',
            LastFailedBuild: 'Показать последний сломанный билд',
            EnTools: 'Инструменты английского языка',
            CheckEntities: 'Скрипт проверки сущностей',
            LastResult: 'Показать последние результаты',
            RunScript: 'Запустить данный скрипт',
            CheckDoc: 'Скрипт проверки документации',
            Configure: 'Настройки',
            SwitchLang: 'Переключиться на язык...',
            ErasePersonalData: 'Стереть мои личные данные',
            LogOut: 'Выйти',
            ReportBug: 'Сообщить об ошибках',
            Documentation: 'Документация',
            Chat: 'Заходите к нам в IRC чат!',
            About: 'О программе'
        }
    });


    Ext.define("phpdoe.locale.view.main.about", {
        override: "phpdoe.view.main.about",
        title: "О {0}",
        itemText: {
            Close: 'Закрыть',
            About: 'О программе',
            Authors: 'Авторы',
            Others: 'и {0}другие{1}',
            Support: 'Поддержка',
            MailingList: 'Список рассылки',
            IRC: 'IRC',
            Credits: 'Благодарности',
            JSFramework: 'Javascript фреймворк',
            CodeEditor: 'Редактор кода',
            XmlPure: 'Модуль Xmlpure от Dror Ben-Gai',
            IconPack: 'Набор иконок',
            Mibbit: 'Mibbit за предоставление премиум IRC виджета',
            WebIRC: 'Web IRC чат',
            License: 'Лицензия'
        }
    });

});

