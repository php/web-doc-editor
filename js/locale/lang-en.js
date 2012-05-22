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

    Ext.define("phpdoe.locale.view.window.msg", {
        override: "phpdoe.view.window.msg",
        initComponent: function () {
            this.itemText = Ext.Object.merge(
                {
                    // wait section
                    PleaseWait: 'Please wait...',

                    // confirm/info/alert section
                    thanks: {
                        title: 'Thanks!',
                        text:  'Thank you for using this application!'
                    },
                    logout: {
                        title: 'Confirm',
                        text:  'Are you sure you want to logout?'
                    },
                    eraseData: {
                        title: 'Confirm',
                        text:  'This action will erase your personal data. All content about this account will be deleted definitively. Are you sure you want to do that?'
                    },
                    forbidden: {
                        title: 'Forbidden',
                        text: ''
                    }
                },
                this.itemText
            );
            this.callParent();
        }
    });


    Ext.define("phpdoe.locale.view.main.menu", {
        override: "phpdoe.view.main.menu",
        text: "Main menu",
        initComponent: function () {

            this.itemText = Ext.Object.merge(
                {
                    RefreshAllData: 'Refresh all data',
                    BuildTools: 'Build tools',
                    CheckBuild: 'Check build',
                    LastFailedBuild: 'Show last failed build',
                    EnTools: 'EN tools',
                    CheckEntities: 'Script check entities',
                    LastResult: 'View the last result',
                    RunScript: 'Run this script',
                    CheckDoc: 'Script check documentation',
                    Configure: 'Configure',
                    SwitchLang: 'Switch to language...',
                    ErasePersonalData: 'Erase my personal data',
                    LogOut: 'Log out',
                    ReportBug: 'Report bugs',
                    Documentation: 'Documentation',
                    Chat: 'Chat with us on IRC!',
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

    Ext.define("phpdoe.locale.view.main.tabs.bug", {
        override: "phpdoe.view.main.tabs.bug",
        title: "Report bugs"
    });

    Ext.define("phpdoe.locale.view.main.tabs.doc", {
        override: "phpdoe.view.main.tabs.doc",
        title: "Documentation"
    });

    Ext.define("phpdoe.locale.view.main.tabs.chat", {
        override: "phpdoe.view.main.tabs.chat",
        title: "Chat"
    });


});

