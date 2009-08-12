Ext.namespace('ui','ui.component');

ui.component.About = Ext.extend(Ext.Window,
{
    id        : 'win-about',
    iconCls   : 'iconHelp',
    layout    : 'fit',
    width     : 515,
    height    : 320,
    modal     : true,
    plain     : true,
    bodyStyle : 'color:#000',

    buttons : [{
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
            title : String.format(_('About {0}'), phpDoc.appName),
            items : {
                xtype     : 'tabpanel',
                activeTab : 0,
                autoTabs  : true,
                border    : false,
                defaults  : { autoScroll: true },
                items     : [{
                    title : _('About'),
                    html  : '<div id="phd-oe-about">' +
                                '<img src="themes/img/logo.png" alt="' + phpDoc.appName + '" />' +
                            '</div>' +
                            '<div id="phd-oe-about-info">' + phpDoc.appName + ' ver ' + phpDoc.appVer + '<br/>' +
                                'UI: ' + phpDoc.uiRevision + '<br/>' +
                                ' Copyright &copy; 2008-2009 The PHP Group<br/>' +
                                _('Author:') + ' <a href="mailto:yannick@php.net">Yannick Torr&egrave;s</a> ' +
                                _('and <a href="http://svn.php.net/viewvc/web/doc-editor/" target="_blank">others</a>') +
                            '</div>'
                }, {
                    title     : _('Credits'),
                    bodyStyle : 'padding:15px',
                    html      : '<div id="phd-oe-credit"><ul>' +
                                    '<li><a href="http://extjs.com" target="_blank">ExtJs Team</a><div class="phd-oe-credit-info">' + _('Javascript FrameWork') + '</div></li>' +
                                    '<li><a href="http://marijn.haverbeke.nl/codemirror/" target="_blank">CodeMirror</a><div class="phd-oe-credit-info">' + _('Code editor') + '</div></li>' +
                                    '<li><a href="http://famfamfam.com" target="_blank">famfamfam.com</a><div class="phd-oe-credit-info">' + _('Icon pack') + '</div></li>' +
                                '</ul></div>'
                }, {
                    title    : _('License'),
                    autoLoad : { url : './LICENSE' }
                }]
            }
        });
        ui.component.About.superclass.initComponent.call(this);
    }
});
