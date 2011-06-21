Ext.namespace('ui','ui.cmp');

ui.cmp.About = Ext.extend(Ext.Window,
{
    id        : 'win-about',
    iconCls   : 'iconHelp',
    layout    : 'fit',
    width     : 515,
    height    : 320,
    modal     : true,
    plain     : true,
    bodyStyle : 'color:#000',

    buttons   : [{
        text    : _('Close'),
        handler : function()
        {
            Ext.getCmp('win-about').close();
        }
    }],

    initComponent : function()
    {
        Ext.apply(this,
        {
            title : String.format(_('About {0}'), PhDOE.app.name),
            items : {
                xtype     : 'tabpanel',
                activeTab : 0,
                autoTabs  : true,
                border    : false,
                defaults  : { autoScroll: true },
                items     : [{
                    title : _('About'),
                    html  : '<div id="phd-oe-about">' +
                                '<img src="themes/img/php.png" class="loading-php-logo" alt="PHP" />' + PhDOE.app.name +
                            '</div>' +
                            '<div id="phd-oe-about-info">' + PhDOE.app.name + ' ver ' + PhDOE.app.ver + '<br/>' +
                                'UI: ' + PhDOE.app.uiRevision + '<br/>' +
                                ' Copyright &copy; 2008-2010 The PHP Group<br/>' +
                                _('Author:') + ' <a href="mailto:yannick@php.net">Yannick Torr&egrave;s</a> ' +
                                _('and <a href="http://svn.php.net/viewvc/web/doc-editor/" target="_blank">others</a>') +
                            '</div>'
                }, {
                    title : _('Help and support'),
                    bodyStyle : 'padding:15px',
                    html  : '<div id="phd-oe-support"><ul>' +
                                '<li>' + _('Mailing list:') + '<a href="mailto:phpdoc@lists.php.net">phpdoc@lists.php.net</a></li>' +
                                '<li>' + _('IRC:') + '<a href="irc://irc.efnet.org/#php.doc">EFnet: #php.doc</a></li>' +
                            '</ul></div>'
                }, {
                    title     : _('Credits'),
                    bodyStyle : 'padding:15px',
                    html      : '<div id="phd-oe-credit"><ul>' +
                                    '<li><a href="http://extjs.com" target="_blank">ExtJs Team</a><div class="phd-oe-credit-info">' + _('Javascript FrameWork') + '</div></li>' +
                                    '<li><a href="http://marijn.haverbeke.nl/codemirror/" target="_blank">CodeMirror</a><div class="phd-oe-credit-info">' + _('Code editor') + '</div></li>' +
                                    '<li><a href="http://www.oxygen-icons.org/" target="_blank">Oxygen project from KDE</a><div class="phd-oe-credit-info">' + _('Icon pack') + '</div></li>' +
                                    '<li><a href="http://www.mibbit.com/" target="_blank">Mibbit for donating their Premium IRC widget</a><div class="phd-oe-credit-info">' + _('Icon pack') + '</div></li>' +
                                '</ul></div>'
                }, {
                    title    : _('License'),
                    autoLoad : { url : './LICENSE' }
                }]
            }
        });
        ui.cmp.About.superclass.initComponent.call(this);
    }
});