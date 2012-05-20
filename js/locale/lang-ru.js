Ext.onReady(function() {

    Ext.define("phpdoe.locale.view.main.menu", {
        override: "phpdoe.view.main.menu",
        text: "Основное меню",
        itemText: {
            SwitchLang: 'Переключиться на другой язык',
            LogOut: 'Выйти',
            confirm: 'Подтверждение',
            confirmLogout: 'Вы уверены, что хотите выйти?',
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

