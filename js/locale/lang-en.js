/* This file contain en defaults text
 We must move all text available for translating to this file
 In locale file we must override all text directly.
 for example:
 En:

 Ext.define("phpdoe.locale.view.something", {
    override: "phpdoe.locale.view.something",
    someFirstLevelTextLabel: "Some first level text",
    otherDeepLevelTextLabel: 'This text will not translated (see next example)',
    initComponent: function () {

        this.itemText = Ext.Object.merge(
            {
                DeepLevelTextLabel: 'Deep level text',
                OtherDeepLevelTextLabel: 'This text will not translated (see next example)'
            },
            this.itemText
        );
        this.callParent();
    }
 });


 Lang:

 Ext.define("phpdoe.locale.view.something", {
    override: "phpdoe.locale.view.something",
    someFirstLevelTextLabel: "Translated first level text",
    itemText : {
        DeepLevelTextLabel: 'Translated deep level text'
    }
 });

*/

Ext.onReady(function() {

    Ext.define("phpdoe.locale.view.main.menu", {
        override: "phpdoe.view.main.menu",
        text: "Main menu",
        initComponent: function () {

            this.itemText = Ext.Object.merge(
                {
                    SwitchLang: 'Switch to language...',
                    LogOut: 'Log out',
                    confirm: 'Confirm',
                    confirmLogout: 'Are you sure you want to logout?',
                    About: 'About'
                },
                this.itemText
            );
            this.callParent();
        }
    });


    Ext.define("phpdoe.locale.view.main.about", {
        override: "phpdoe.view.main.about",
        title: "About {0}",
        initComponent: function () {

            this.itemText = Ext.Object.merge(
                {
                    Close: 'Close',
                    About: 'About',
                    Authors: 'Authors',
                    Others: 'and {0}others{1}',
                    Support: 'Help and support',
                    MailingList: 'Mailing list',
                    IRC: 'IRC',
                    Credits: 'Credits',
                    JSFramework: 'Javascript FrameWork',
                    CodeEditor: 'Code editor',
                    XmlPure: 'Mode Xmlpure by Dror Ben-Gai',
                    IconPack: 'Icon pack',
                    Mibbit: 'Mibbit for donating their Premium IRC widget',
                    WebIRC: 'Web IRC Chat',
                    License: 'License'
                },
                this.itemText
            );
            this.callParent();
        }
    });


});

