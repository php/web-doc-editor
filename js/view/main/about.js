Ext.define('phpdoe.view.main.about', {
    extend : 'Ext.window.Window',
    id : 'window-about',
    layout : 'fit',
    autoShow : false,
    width : 515,
    height : 330,
    closable : true,
    closeAction : 'hide',
    draggable : false,
    resizable : false,
    plain : true,
    iconCls : 'iconHelp',
    modal : true,
    initComponent : function () {

        this.title = Ext.String.format(this.title, config.NAME);
        this.itemText.Others = Ext.String.format(
            this.itemText.Others,
            '<a href="http://git.php.net/?p=web/doc-editor.git;a=summary" target="_blank">',
            '</a>'
        );

        this.items = [
            Ext.create('Ext.tab.Panel', {
                defaults : { autoScroll : true },
                items : [
                    {
                        title : this.itemText.About,
                        html : '<div id="phd-oe-about">' +
                            '<img src="themes/img/php.png" class="loading-php-logo" alt="PHP" />' + config.NAME +
                            '</div>' +
                            '<div id="phd-oe-about-info">' + config.NAME +
                            ' Copyright &copy; 2008-' + (new Date).getFullYear() + ' The PHP Group<br/>' +
                            this.itemText.Authors +
                            ': <a href="mailto:yannick@php.net">Yannick Torr&egrave;s</a> ' +
                            this.itemText.Others +
                            '</div>'
                    },
                    {
                        title : this.itemText.Support,
                        bodyStyle : 'padding:15px',
                        html : '<div id="phd-oe-support"><ul>' +
                            '<li>' + this.itemText.Authors + ': <a href="mailto:phpdoc@lists.php.net">phpdoc@lists.php.net</a></li>' +
                            '<li>' + this.itemText.IRC + ': <a href="irc://irc.efnet.org/#php.doc">EFnet: #php.doc</a></li>' +
                            '</ul></div>'
                    },
                    {
                        title : this.itemText.Credits,
                        bodyStyle : 'padding:15px',
                        html : '<div id="phd-oe-credit"><ul>' +
                            '<li><a href="http://extjs.com" target="_blank">ExtJs Team</a><div class="phd-oe-credit-info">' + this.itemText.JSFramework + ' - ExtJs v' + Ext.versions.extjs.version + '</div></li>' +
                            '<li><a href="http://marijn.haverbeke.nl/codemirror/" target="_blank">CodeMirror</a><div class="phd-oe-credit-info">' + this.itemText.CodeEditor + ' - CodeMirror - ' + this.itemText.XmlPure + ' </div></li>' +
                            '<li><a href="http://www.oxygen-icons.org/" target="_blank">Oxygen project from KDE</a><div class="phd-oe-credit-info">' + this.itemText.IconPack + '</div></li>' +
                            '<li><a href="http://www.mibbit.com/" target="_blank">' + this.itemText.Mibbit + '</a><div class="phd-oe-credit-info">' + this.itemText.WebIRC + '</div></li>' +
                            '</ul></div>'
                    },
                    {
                        title : this.itemText.License,
                        autoLoad : { url : './LICENSE' }
                    }
                ]
            })
        ];

        this.buttons = [
            {
                text : this.itemText.Close,
                iconCls : 'iconClose',
                handler : function () {
                    Ext.getCmp('window-about').hide();
                }
            }
        ];


        this.callParent(arguments);
    }

});
