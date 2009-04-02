var phpDoc = function(){
    Ext.QuickTips.init();
    Ext.BLANK_IMAGE_URL = 'js/extjs/resources/images/default/s.gif';
    
    return {
    
        // Task
        TaskPing: '',
        
        // Store
        storeCommitLogMessage: '', //
        storeFilesError: '', //
        storeFilesNeedUpdate: '',
        storeFilesNeedReviewed: '',
        storePendingCommit: '',
        storePendingPatch: '',
        
        storeMailing: '',
        storeBugs: '',
        storeTranslators: '',
        storeSummary: '',
        
        // Variable
        userLogin: '',
        userLang: '',
        appName: 'PhpDocumentation Online Editor',
        appVer: '0.2',
        
        userConf: {
            'conf_needupdate_diff': 'using-exec',
            'conf_needupdate_scrollbars': true,
            'conf_needupdate_displaylog': false,

            'conf_error_skipnbliteraltag': true,
            'conf_error_scrollbars': true,
            'conf_error_displaylog': false,

            'conf_reviewed_scrollbars': true,
            'conf_reviewed_displaylog': false,

            'conf_allfiles_displaylog': false,

            'conf_patch_scrollbars': true,
            'conf_patch_displaylog': false,

            'conf_theme': 'themes/empty.css'
        },
        
        // Tree
        treeAllFiles: '',
        treeSort: '',
        treeAllFilesRoot: '',
        
        filePendingOpen: '',
        
        init: function(){
        
            // Stop default contextmenu on all this app
            Ext.getBody().on('contextmenu', function(e){
                e.stopEvent();
            }, this);
            
            // We load the configuration for this user
            Ext.Ajax.request({
                scope: this,
                url: './php/controller.php',
                params: {
                    task: 'get-conf'
                },
                success: function(action){
                    var o = Ext.util.JSON.decode(action.responseText);
                    if (o.success) {
                    
                        this.userLogin = o.mess.userLogin;
                        this.userLang = o.mess.userLang;
                        
                        this.userConf.conf_needupdate_diff = o.mess.userConf.conf_needupdate_diff;
                        this.userConf.conf_needupdate_scrollbars = o.mess.userConf.conf_needupdate_scrollbars;
                        this.userConf.conf_needupdate_displaylog = o.mess.userConf.conf_needupdate_displaylog;

                        this.userConf.conf_error_skipnbliteraltag = o.mess.userConf.conf_error_skipnbliteraltag;
                        this.userConf.conf_error_scrollbars = o.mess.userConf.conf_error_scrollbars;
                        this.userConf.conf_error_displaylog = o.mess.userConf.conf_error_displaylog;

                        this.userConf.conf_reviewed_scrollbars = o.mess.userConf.conf_reviewed_scrollbars;
                        this.userConf.conf_reviewed_displaylog = o.mess.userConf.conf_reviewed_displaylog;

                        this.userConf.conf_allfiles_displaylog = o.mess.userConf.conf_allfiles_displaylog;

                        this.userConf.conf_patch_scrollbars = o.mess.userConf.conf_patch_scrollbars;
                        this.userConf.conf_patch_displaylog = o.mess.userConf.conf_patch_displaylog;
                        
                        //For the theme, we apply this.
                        this.userConf.conf_theme = o.mess.userConf.conf_theme;
                        Ext.get('appTheme').dom.href = this.userConf.conf_theme;

                        // Load datastore
                        this.loadDataStore();
                        
                        // Draw the interface
                        this.drawInterface();
                        
                    }
                }
            });
        }, // init
        winForbidden: function(){
            Ext.MessageBox.alert('Forbidden', 'You can\'t do this action as cvsread user.');
        },
        
        menuMarkupLANG: function(panel){
        
            var menu, subMenu;
            
            subMenu = new Ext.menu.Menu({
                items: [{
                    tooltip: 'Insert <b>Reviewed</b> tag',
                    text: 'Reviewed tag',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        Ext.getCmp(panel).insertIntoLine(2, 'end', "\n<!-- Reviewed: no -->");
                        Ext.getCmp(panel).focus();
                    }
                }, {
                    tooltip: 'Insert <b>Revcheck</b> tag',
                    text: 'Revcheck tag',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        Ext.getCmp(panel).insertIntoLine(2, "end", "\n<!-- EN-Revision: 1.XX Maintainer: " + this.userLogin + " Status: ready -->");
                        Ext.getCmp(panel).focus();
                    }
                }]
            });
            
            menu = {
                text: 'MarkUp',
                iconCls: 'iconInsertCode',
                menu: subMenu
            };
            return menu;
        }, // menuMarkupLANG
        menuMarkupEN: function(panel){
        
            var menu, subMenu;
            
            subMenu = new Ext.menu.Menu({
                items: [{
                    tooltip: 'Insert <b>Description</b> section',
                    text: 'Description section',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        var position = Ext.util.JSON.decode(Ext.getCmp(panel).getCursorPosition());
                        
                        Ext.getCmp(panel).insertIntoLine(position.line, 0, " <refsect1 role=\"description\"><!-- {{{ -->\r\n  &reftitle.description;\r\n  <methodsynopsis>\r\n   <!-- Example: All functions have this -->\r\n   <type>thereturned type</type><methodname>func_name</methodname>\r\n   <!-- Example: Required parameter -->\r\n   <methodparam><type>param1type</type><parameter>firstparameter</parameter></methodparam>\r\n   <!-- Example: Optional parameter, also by reference -->\r\n   <methodparam choice=\"opt\"><type>int</type><parameter role=\"reference\">secondparameter</parameter></methodparam>\r\n   <!-- Example: If no methodparams exist (void), use this -->\r\n   <void />\r\n  </methodsynopsis>\r\n  <para>\r\n   The function description goes here.\r\n  </para>\r\n </refsect1><!-- }}} -->");
                        Ext.getCmp(panel).focus();
                    }
                }, {
                    tooltip: 'Insert <b>Parameters</b> section',
                    text: 'Parameters section',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        var position = Ext.util.JSON.decode(Ext.getCmp(panel).getCursorPosition());
                        
                        Ext.getCmp(panel).insertIntoLine(position.line, 0, "\r\n<refsect1 role=\"parameters\"><!-- {{{ -->\r\n&reftitle.parameters;\r\n<para>\r\n<variablelist>\r\n<varlistentry>\r\n<term><parameter>firstparameter</parameter></term>\r\n<listitem>\r\n<para>\r\nIts description\r\n</para>\r\n</listitem>\r\n</varlistentry>\r\n<varlistentry>\r\n<term>\r\n<parameter>secondparameter</parameter>\r\n</term>\r\n<listitem>\r\n<para>\r\nIts description\r\n</para>\r\n</listitem>\r\n</varlistentry>\r\n</variablelist>\r\n</para>\r\n</refsect1><!-- }}} -->");
                        Ext.getCmp(panel).focus();
                    }
                }, {
                    tooltip: 'Insert <b>Return</b> section',
                    text: 'Return section',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        var position = Ext.util.JSON.decode(Ext.getCmp(panel).getCursorPosition());
                        
                        Ext.getCmp(panel).insertIntoLine(position.line, 0, "\r\n<refsect1 role=\"returnvalues\"><!-- {{{ -->\r\n&reftitle.returnvalues;\r\n<para>\r\nWhat this function returns, first on success, then failure.\r\nIf simply true on success and false on failure, just use &return.success; here.\r\n</para>\r\n</refsect1><!-- }}} -->");
                        Ext.getCmp(panel).focus();
                    }
                }, {
                    tooltip: 'Insert <b>Error</b> section',
                    text: 'Error section',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        var position = Ext.util.JSON.decode(Ext.getCmp(panel).getCursorPosition());
                        
                        Ext.getCmp(panel).insertIntoLine(position.line, 0, "\r\n<refsect1 role=\"errors\"><!-- {{{ -->\r\n&reftitle.errors;\r\n<para>\r\nWhen does this function issue E_* level errors, and/or throw exceptions.\r\n</para>\r\n</refsect1><!-- }}} -->\r\n");
                        Ext.getCmp(panel).focus();
                    }
                }, {
                    tooltip: 'Insert <b>Unicode</b> section',
                    text: 'Unicode section',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        var position = Ext.util.JSON.decode(Ext.getCmp(panel).getCursorPosition());
                        
                        Ext.getCmp(panel).insertIntoLine(position.line, 0, "\r\n<refsect1 role=\"unicode\"><!-- {{{ -->\r\n&reftitle.unicode;\r\n<para>\r\nInformation specific to unicode, from the PHP 6 changes.\r\n</para>\r\n</refsect1><!-- }}} -->");
                        Ext.getCmp(panel).focus();
                    }
                }, {
                    tooltip: 'Insert <b>Changelog</b> section',
                    text: 'Changelog section',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        var position = Ext.util.JSON.decode(Ext.getCmp(panel).getCursorPosition());
                        
                        Ext.getCmp(panel).insertIntoLine(position.line, 0, "\r\n<refsect1 role=\"changelog\"><!-- {{{ -->\r\n&reftitle.changelog;\r\n<para>\r\n<informaltable>\r\n<tgroup cols=\"2\">\r\n<thead>\r\n<row>\r\n<entry>&Version;</entry>\r\n<entry>&Description;</entry>\r\n</row>\r\n</thead>\r\n<tbody>\r\n<row>\r\n<entry>Enter the version of change here</entry>\r\n<entry>\r\nDescribe the change\r\n</entry>\r\n</row>\r\n</tbody>\r\n</tgroup>\r\n</informaltable>\r\n</para>\r\n</refsect1><!-- }}} -->");
                        Ext.getCmp(panel).focus();
                    }
                }, {
                    tooltip: 'Insert <b>Examples</b> section',
                    text: 'Examples section',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        var position = Ext.util.JSON.decode(Ext.getCmp(panel).getCursorPosition());
                        
                        Ext.getCmp(panel).insertIntoLine(position.line, 0, "\r\n<refsect1 role=\"examples\"><!-- {{{ -->\r\n&reftitle.examples;\r\n<para>\r\n<example xml:id=\"function-name.example.basic\"><!-- {{{ -->\r\n<title><function>function-name</function> example</title>\r\n<para>\r\nAny text that describes the purpose of the example, or what\r\ngoes on in the example should be here. (Inside the <example> tag, not out).\r\n</para>\r\n<programlisting role=\"php\">\r\n<![CDATA[\r\n<?php\r\nif ($anexample === true) {\r\necho 'Use the PEAR Coding standards';\r\n}\r\nif ($thereisoutput === 'and it is multiple lines') {\r\necho 'Use a screen like we did below';\r\n}\r\n?>\r\n]]>\r\n</programlisting>\r\n&example.outputs.similar;\r\n<screen>\r\n<![CDATA[\r\nUse the PEAR Coding standards\r\nUse a screen like we did below\r\n]]>\r\n</screen>\r\n</example><!-- }}} -->\r\n</para>\r\n</refsect1><!-- }}} -->");
                        Ext.getCmp(panel).focus();
                    }
                }, {
                    tooltip: 'Insert <b>Notes</b> section',
                    text: 'Notes section',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        var position = Ext.util.JSON.decode(Ext.getCmp(panel).getCursorPosition());
                        
                        Ext.getCmp(panel).insertIntoLine(position.line, 0, "\r\n<refsect1 role=\"notes\"><!-- {{{ -->\r\n&reftitle.notes;\r\n<caution>\r\n<para>\r\nAny notes that don't fit anywhere else should go here.\r\n90% of the time, notes, warnings or cautions are better placed in the\r\nparameters section. Consider that before using this section!\r\n</para>\r\n</caution>\r\n&note.language-construct;\r\n&note.not-bin-safe;\r\n&note.registerglobals;\r\n</refsect1><!-- }}} -->");
                        Ext.getCmp(panel).focus();
                    }
                }, {
                    tooltip: 'Insert <b>SeeAlso</b> section',
                    text: 'SeeAlso section',
                    //iconCls: 'iconInsertCode',
                    handler: function(){
                        var position = Ext.util.JSON.decode(Ext.getCmp(panel).getCursorPosition());
                        
                        Ext.getCmp(panel).insertIntoLine(position.line, 0, "\r\n<refsect1 role=\"seealso\"><!-- {{{ -->\r\n&reftitle.seealso;\r\n<para>\r\n<simplelist>\r\n<member><function>somefunc</function></member>\r\n<member><function>another_func</function></member>\r\n<member>The <link linkend=\"something\">something appendix</link></member>\r\n</simplelist>\r\n</para>\r\n</refsect1><!-- }}} -->");
                        Ext.getCmp(panel).focus();
                    }
                }]
            });
            
            menu = {
                text: 'MarkUp',
                iconCls: 'iconInsertCode',
                menu: subMenu
            };
            return menu;
        }, // menuMarkupEN
        loadDataStore: function(){
        
            // Store : Commit log
            this.storeCommitLogMessage = new Ext.data.Store({
                //autoLoad: true,
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'get-commit-log-message'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'text',
                    mapping: 'text'
                }])
            });
            
            // Store : Files Error
            this.storeFilesError = new Ext.data.GroupingStore({
                autoLoad: (this.userLang === 'en') ? false : true,
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'GetFilesError'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'path',
                    mapping: 'path'
                }, {
                    name: 'name',
                    mapping: 'name'
                }, {
                    name: 'maintainer',
                    mapping: 'maintainer'
                }, {
                    name: 'type',
                    mapping: 'type'
                }, {
                    name: 'value_en',
                    mapping: 'value_en'
                }, {
                    name: 'value_lang',
                    mapping: 'value_lang'
                }, {
                    name: 'needcommit',
                    mapping: 'needcommit'
                }]),
                sortInfo: {
                    field: 'path',
                    direction: "ASC"
                },
                groupField: 'path',
                listeners: {
                    datachanged: function(ds){
                        Ext.getDom('acc-error-nb').innerHTML = ds.getCount();
                    }
                }
            });
            
            // Store : Files Need Update
            this.storeFilesNeedUpdate = new Ext.data.GroupingStore({
                autoLoad: (this.userLang === 'en') ? false : true,
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'GetFilesNeedUpdate'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'path',
                    mapping: 'path'
                }, {
                    name: 'name',
                    mapping: 'name'
                }, {
                    name: 'revision',
                    mapping: 'revision'
                }, {
                    name: 'en_revision',
                    mapping: 'en_revision'
                }, {
                    name: 'maintainer',
                    mapping: 'maintainer'
                }, {
                    name: 'needcommit',
                    mapping: 'needcommit'
                }, {
                    name: 'isCritical',
                    mapping: 'isCritical'
                }]),
                sortInfo: {
                    field: 'path',
                    direction: "ASC"
                },
                groupField: 'path',
                listeners: {
                    datachanged: function(ds){
                        Ext.getDom('acc-need-update-nb').innerHTML = ds.getCount();
                    }
                }
            });
            
            // Store : Files Need Update
            this.storeFilesNeedReviewed = new Ext.data.GroupingStore({
                autoLoad: (this.userLang === 'en') ? false : true,
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'GetFilesNeedReviewed'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'path',
                    mapping: 'path'
                }, {
                    name: 'name',
                    mapping: 'name'
                }, {
                    name: 'reviewed',
                    mapping: 'reviewed'
                }, {
                    name: 'maintainer',
                    mapping: 'maintainer'
                }, {
                    name: 'needcommit',
                    mapping: 'needcommit'
                }]),
                sortInfo: {
                    field: 'path',
                    direction: "ASC"
                },
                groupField: 'path',
                listeners: {
                    datachanged: function(ds){
                        Ext.getDom('acc-need-reviewed-nb').innerHTML = ds.getCount();
                    }
                }
            });
            
            
            // Store : 
            this.storePendingCommit = new Ext.data.GroupingStore({
                autoLoad: true,
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'GetFilesPendingCommit'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'path',
                    mapping: 'path'
                }, {
                    name: 'name',
                    mapping: 'name'
                }, {
                    name: 'by',
                    mapping: 'by'
                }, {
                    name: 'date',
                    mapping: 'date'
                }]),
                sortInfo: {
                    field: 'path',
                    direction: "ASC"
                },
                groupField: 'path',
                listeners: {
                    datachanged: function(ds){
                        Ext.getDom('acc-pendingCommit-nb').innerHTML = ds.getCount();
                    },
                    add: function(ds){
                        Ext.getDom('acc-pendingCommit-nb').innerHTML = ds.getCount();
                    }
                }
            });
            
            // Store : 
            this.storePendingPatch = new Ext.data.GroupingStore({
                autoLoad: true,
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'GetFilesPendingPatch'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'path',
                    mapping: 'path'
                }, {
                    name: 'name',
                    mapping: 'name'
                }, {
                    name: 'by',
                    mapping: 'by'
                }, {
                    name: 'uniqID',
                    mapping: 'uniqID'
                }, {
                    name: 'date',
                    mapping: 'date'
                }]),
                sortInfo: {
                    field: 'path',
                    direction: "ASC"
                },
                groupField: 'path',
                listeners: {
                    datachanged: function(ds){
                        Ext.getDom('acc-pendingPatch-nb').innerHTML = ds.getCount();
                    },
                    add: function(ds){
                        Ext.getDom('acc-pendingPatch-nb').innerHTML = ds.getCount();
                    }
                }
            });
            
            // Store : Mailing with Informations about phpdoc-LANG mailing
            this.storeMailing = new Ext.data.Store({
                //autoLoad: true,
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'get-mailing-info'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'title',
                    mapping: 'title'
                }, {
                    name: 'link',
                    mapping: 'link'
                }, {
                    name: 'description',
                    mapping: 'description'
                }, {
                    name: 'pubDate',
                    mapping: 'pubDate',
                    type: 'date',
                    dateFormat: 'Y/m/d H:i:s'
                }])
            });
            this.storeMailing.setDefaultSort('pubDate', 'desc');
            
            // Store : All open bugs for documentation
            this.storeBugs = new Ext.data.Store({
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'get-open-bugs'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'title',
                    mapping: 'title'
                }, {
                    name: 'link',
                    mapping: 'link'
                }, {
                    name: 'description',
                    mapping: 'description'
                }])
            });
            
            // Store : Translator with Informations like Revcheck first table
            this.storeTranslators = new Ext.data.Store({
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'get-translator-info'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'name',
                    mapping: 'name'
                }, {
                    name: 'email',
                    mapping: 'mail'
                }, {
                    name: 'nick',
                    mapping: 'nick'
                }, {
                    name: 'cvs',
                    mapping: 'cvs'
                }, {
                    name: 'uptodate',
                    mapping: 'uptodate',
                    type: 'int'
                }, {
                    name: 'old',
                    mapping: 'old',
                    type: 'int'
                }, {
                    name: 'critical',
                    mapping: 'critical',
                    type: 'int'
                }, {
                    name: 'sum',
                    mapping: 'sum',
                    type: 'int'
                }])
            });
            this.storeTranslators.setDefaultSort('nick', 'asc');
            
            // Store : storeSummary with Informations like Revcheck second table
            this.storeSummary = new Ext.data.Store({
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'get-summary-info'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'libel',
                    mapping: 'libel'
                }, {
                    name: 'nbFiles',
                    mapping: 'nbFiles'
                }, {
                    name: 'percentFiles',
                    mapping: 'percentFiles'
                }, {
                    name: 'sizeFiles',
                    mapping: 'sizeFiles'
                }, {
                    name: 'percentSize',
                    mapping: 'percentSize'
                }])
            });
            
        }, // loadDataStore
        newTabCheckDoc: function(){
        
            var ds, grid, renderer;
            
            // The store
            ds = new Ext.data.Store({
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'get-check-doc-data'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'path',
                    mapping: 'path'
                }, {
                    name: 'extension',
                    mapping: 'extension'
                }, {
                    name: 'check_oldstyle',
                    mapping: 'check_oldstyle',
                    type: 'int'
                }, {
                    name: 'check_undoc',
                    mapping: 'check_undoc',
                    type: 'int'
                }, {
                    name: 'check_roleerror',
                    mapping: 'check_roleerror',
                    type: 'int'
                }, {
                    name: 'check_badorder',
                    mapping: 'check_badorder',
                    type: 'int'
                }, {
                    name: 'check_noseealso',
                    mapping: 'check_noseealso',
                    type: 'int'
                }, {
                    name: 'check_noreturnvalues',
                    mapping: 'check_noreturnvalues',
                    type: 'int'
                }, {
                    name: 'check_noparameters',
                    mapping: 'check_noparameters',
                    type: 'int'
                }, {
                    name: 'check_noexamples',
                    mapping: 'check_noexamples',
                    type: 'int'
                }, {
                    name: 'check_noerrors',
                    mapping: 'check_noerrors',
                    type: 'int'
                }])
            });
            ds.setDefaultSort('extension', 'asc');
            
            renderer = function(value, metadata, record, rowIndex, colIndex, store){
                if (value > 0) {
                    metadata.css = 'check_doc_cell';
                    return value;
                }
                else {
                    return;
                }
            }
            
            
            // The grid
            grid = new Ext.grid.GridPanel({
                store: ds,
                loadMask: true,
                sm: new Ext.grid.CellSelectionModel({
                    singleSelect: true
                }),
                columns: [new Ext.grid.RowNumberer(), {
                    id: 'extension',
                    header: "Extension",
                    sortable: true,
                    dataIndex: 'extension'
                }, {
                    header: "Not documented",
                    width: 45,
                    sortable: true,
                    dataIndex: 'check_undoc',
                    renderer: renderer
                }, {
                    header: "Old style",
                    width: 45,
                    sortable: true,
                    dataIndex: 'check_oldstyle',
                    renderer: renderer
                }, {
                    header: "Bad refsect1 order",
                    width: 45,
                    sortable: true,
                    dataIndex: 'check_badorder',
                    renderer: renderer
                }, {
                    header: "No parameters",
                    width: 45,
                    sortable: true,
                    dataIndex: 'check_noparameters',
                    renderer: renderer
                }, {
                    header: "No return values",
                    width: 45,
                    sortable: true,
                    dataIndex: 'check_noreturnvalues',
                    renderer: renderer
                }, {
                    header: "No examples",
                    width: 45,
                    sortable: true,
                    dataIndex: 'check_noexamples',
                    renderer: renderer
                }, {
                    header: "No errors section",
                    width: 45,
                    sortable: true,
                    dataIndex: 'check_noerrors',
                    renderer: renderer
                }, {
                    header: "No see also",
                    width: 45,
                    sortable: true,
                    dataIndex: 'check_noseealso',
                    renderer: renderer
                }, {
                    header: "Refsect1 role error",
                    width: 45,
                    sortable: true,
                    dataIndex: 'check_roleerror',
                    renderer: renderer
                }],
                view: new Ext.grid.GridView({
                    forceFit: true
                }),
                autoExpandColumn: 'extension',
                bodyBorder: false,
                listeners: {
                    scope: this,
                    render: function(){
                        ds.load();
                    },
                    celldblclick: function(grid, rowIndex, columnIndex, e){
                    
                        var record, errorType, data, path;
                        
                        record = grid.getStore().getAt(rowIndex);
                        errorType = grid.getColumnModel().getDataIndex(columnIndex);
                        data = record.get(errorType);
                        path = record.data.path;
                        
                        if (Ext.num(data, false) && data != 0) {
                        
                            Ext.Ajax.request({
                                scope: this,
                                url: './php/controller.php',
                                params: {
                                    task: 'get-check-doc-files',
                                    path: path,
                                    errorType: errorType
                                },
                                success: function(action, form){
                                
                                    // Must choose the file
                                    var win, gridFiles, storeFiles, o, i, r;
                                    
                                    o = Ext.util.JSON.decode(action.responseText);
                                    
                                    // store
                                    storeFiles = new Ext.data.SimpleStore({
                                        fields: [{
                                            name: 'id'
                                        }, {
                                            name: 'file'
                                        }]
                                    });
                                    
                                    for (i = 0; i < o.files.length; i = i + 1) {
                                    
                                        r = new storeFiles.recordType({
                                            id: i,
                                            file: o.files[i].name
                                        });
                                        storeFiles.insert(0, r);
                                        
                                    }
                                    storeFiles.sort('file', 'asc');
                                    // Grid
                                    
                                    gridFiles = new Ext.grid.GridPanel({
                                        store: storeFiles,
                                        loadMask: true,
                                        sm: new Ext.grid.RowSelectionModel({
                                            listeners: {
                                                rowselect: function(sm, rowIndex, record){
                                                    Ext.getCmp('check-doc-btn-open-selected-files').enable();
                                                }
                                            }
                                        }),
                                        columns: [new Ext.grid.RowNumberer(), {
                                            id: 'file',
                                            header: "Files",
                                            sortable: true,
                                            dataIndex: 'file'
                                        }],
                                        autoExpandColumn: 'file',
                                        bodyBorder: false,
                                        listeners: {
                                            scope: this,
                                            rowcontextmenu: function(grid, rowIndex, e){
                                                grid.getSelectionModel().selectRow(rowIndex);
                                            },
                                            rowdblclick: function(grid, rowIndex, e){
                                                var name = storeFiles.getAt(rowIndex).data.file;
                                                win.close();
                                                this.openFile('en' + path, name);
                                            }
                                        }
                                    });
                                    
                                    win = new Ext.Window({
                                        title: 'Files',
                                        //iconCls: 'patchAlert',
                                        width: 450,
                                        height: 350,
                                        resizable: false,
                                        modal: true,
                                        autoScroll: true,
                                        labelWidth: 50,
                                        layout: 'fit',
                                        items: [gridFiles],
                                        buttons: [{
                                            scope: this,
                                            text: 'Open all files',
                                            handler: function(){
                                            
                                                win.close();
                                                
                                                this.filePendingOpen = [];
                                                
                                                for (i = 0; i < o.files.length; i = i + 1) {
                                                    this.filePendingOpen[i] = ['en' + path, o.files[i].name];
                                                }
                                                
                                                // Start the first
                                                this.openFile(this.filePendingOpen[0][0], this.filePendingOpen[0][1]);
                                                
                                            }
                                        }, {
                                            scope: this,
                                            text: 'Open selected files',
                                            id: 'check-doc-btn-open-selected-files',
                                            disabled: true,
                                            handler: function(){
                                            
                                                win.close();
                                                
                                                this.filePendingOpen = [];
                                                
                                                var r = gridFiles.getSelectionModel().getSelections();
                                                
                                                for (i = 0; i < r.length; i = i + 1) {
                                                    this.filePendingOpen[i] = ['en' + path, r[i].data.file];
                                                }
                                                
                                                // Start the first
                                                this.openFile(this.filePendingOpen[0][0], this.filePendingOpen[0][1]);
                                                
                                            }
                                        }]
                                    });
                                    win.show();
                                    /*
                                     var o, i;
                                     
                                     o = Ext.util.JSON.decode(action.responseText);
                                     this.filePendingOpen = [];
                                     
                                     for (i = 0; i < o.files.length; i = i + 1) {
                                     this.filePendingOpen[i] = ['en' + path, o.files[i].name];
                                     }
                                     
                                     // Start the first
                                     this.openFile(this.filePendingOpen[0][0], this.filePendingOpen[0][1]);
                                     */
                                }
                            });
                            
                        } // data is not empty
                    }
                    
                }
            });
            
            Ext.getCmp('main-panel').add({
                closable: true,
                title: 'Check Doc',
                iconCls: 'CheckDoc',
                id: 'tab-check-doc',
                layout: 'fit',
                items: [grid]
            });
            Ext.getCmp('main-panel').setActiveTab('tab-check-doc');
        }, // newTabCheckDoc
        openFile: function(FilePath, FileName){
        
            Ext.getCmp('acc-all-files').expand();
            
            var t = FilePath.split('/');
            
            function GoToNode(node, scope){
            
                node.expand(false, true, function(node){
                
                    var i;
                    
                    node.ensureVisible();
                    if (t[0] && t[0] !== '') {
                        // walk into childs
                        for (i = 0; i < node.childNodes.length; i = i + 1) {
                        
                            if (node.childNodes[i].text === t[0]) {
                                t.shift();
                                GoToNode(node.childNodes[i], scope);
                            }
                        }
                        
                    }
                    else {
                        // walk into childs
                        for (i = 0; i < node.childNodes.length; i = i + 1) {
                            if (node.childNodes[i].text === FileName) {
                                node.childNodes[i].ensureVisible();
                                node.childNodes[i].ui.highlight();
                                scope.treeAllFiles.fireEvent('dblclick', node.childNodes[i]);
                            }
                        }
                    }
                });
                
            }
            
            GoToNode(this.treeAllFilesRoot, this);
        }, //openFile
        rejectPatch: function(FileID, FilePath, FileName, FileUniqID, rowIndex, scope){
        
            if (scope.userLogin === 'cvsread') {
                this.winForbidden();
                return;
            }
            
            function goRejectPatch(btn){
            
                if (btn === 'yes') {
                
                    var msg = Ext.MessageBox.wait('Please, wait...');
                    
                    Ext.Ajax.request({
                        scope: scope,
                        url: './php/controller.php',
                        params: {
                            task: 'after-patch-reject',
                            PatchUniqID: FileUniqID
                        },
                        success: function(action){
                        
                            var o = Ext.util.JSON.decode(action.responseText);
                            if (o.success) {
                            
                                // Remove this patch from the PendingPatchStore
                                this.storePendingPatch.remove(this.storePendingPatch.getAt(rowIndex));
                                
                                // We fire event add to update the file count
                                this.storePendingPatch.fireEvent('add', this.storePendingPatch);
                                
                                // Remove this tab
                                Ext.getCmp('main-panel').remove('PP-' + FileID);
                                
                                // Remove wait msg
                                msg.hide();
                                
                            }
                            else {
                                // Remove wait msg
                                msg.hide();
                                this.winForbidden();
                            }
                            
                        }
                    });
                    
                } // btn = yes
            } // goRejectPatch
            Ext.MessageBox.confirm('Confirm', 'This action will <b>reject</b> this patch, send an email to his author and close this tab.', goRejectPatch, scope);
            
        }, //rejectPatch
        saveFileViaPatch: function(FileID, FilePath, FileName, FileUniqID, rowIndex, scope){
        
            function goAcceptPatch(btn){
            
                if (btn === 'yes') {
                
                    Ext.getCmp('PP-PATCH-PANEL-btn-save-' + FileID).disable();
                    Ext.getCmp('PP-PATCH-' + FileID).isModified = false;
                    Ext.getCmp('PP-PATCH-PANEL-' + FileID).setTitle(Ext.getCmp('PP-PATCH-PANEL-' + FileID).originTitle);
                    Ext.getCmp('PP-' + FileID).setTitle(Ext.getCmp('PP-' + FileID).originTitle);
                    
                    var msg = Ext.MessageBox.wait('Saving data...');
                    
                    // We save LANG File
                    Ext.Ajax.request({
                        scope: scope,
                        url: './php/controller.php',
                        params: {
                            task: 'save-file',
                            filePath: FilePath,
                            fileName: FileName,
                            fileLang: 'all',
                            fileContent: Ext.getCmp('PP-PATCH-' + FileID).getCode()
                        },
                        success: function(action, form){
                            var o = Ext.util.JSON.decode(action.responseText);
                            if (o.success) {
                            
                                // Add this files into storePendingCommit
                                this.addToPendingCommit(FilePath, FileName);
                                
                                // Remove this patch from the PendingPatchStore
                                this.storePendingPatch.remove(this.storePendingPatch.getAt(rowIndex));
                                
                                // We fire event add to update the file count
                                this.storePendingPatch.fireEvent('add', this.storePendingPatch);
                                
                                // We need to send an accept patch email, delete .patch file, and remove this patch from dataBase
                                Ext.Ajax.request({
                                    scope: scope,
                                    url: './php/controller.php',
                                    params: {
                                        task: 'after-patch-accept',
                                        PatchUniqID: FileUniqID
                                    }
                                });
                                
                                // Remove wait msg
                                msg.hide();
                                
                                // Remove this tab
                                Ext.getCmp('main-panel').remove('PP-' + FileID);
                                
                            }
                            else {
                                // Remove wait msg
                                msg.hide();
                                this.winForbidden();
                            }
                        }
                    });
                } // btn = yes
            }
            
            Ext.MessageBox.confirm('Confirm', 'This action will accept this patch, send an email to his author, save the file and close this tab.', goAcceptPatch, scope);
            
        }, //saveFileViaPatch
        saveEnFile: function(FileID, FilePath, FileName, Panel, rowIndex, scope){
        
            if (scope.userLogin === 'cvsread') {
                scope.winForbidden();
                return;
            }
            
            Ext.getCmp(Panel + '-EN-PANEL-btn-save-' + FileID).disable();
            Ext.getCmp(Panel + '-' + FileID).isModifiedEn = false;
            Ext.getCmp(Panel + '-EN-PANEL-' + FileID).setTitle(Ext.getCmp(Panel + '-EN-PANEL-' + FileID).originTitle);
            
            if (!Ext.getCmp(Panel + '-' + FileID).isModifiedEn && !Ext.getCmp(Panel + '-' + FileID).isModifiedLang) {
                Ext.getCmp(Panel + '-' + FileID).setTitle(Ext.getCmp(Panel + '-' + FileID).originTitle);
            }
            
            var msg = Ext.MessageBox.wait('Saving data...');
            // We save LANG File
            Ext.Ajax.request({
                scope: scope,
                url: './php/controller.php',
                params: {
                    task: 'save-file',
                    filePath: FilePath,
                    fileName: FileName,
                    fileLang: 'en',
                    fileContent: Ext.getCmp(Panel + '-EN-' + FileID).getCode()
                },
                success: function(action, form){
                    var o = Ext.util.JSON.decode(action.responseText);
                    if (o.success) {
                    
                        if (Panel === 'FNU') {
                            // Update our store
                            this.storeFilesNeedUpdate.getAt(rowIndex).set('en_revision', '1.' + o.en_revision);
                            this.storeFilesNeedUpdate.getAt(rowIndex).set('needcommit', true);
                        }
                        
                        if (Panel === 'FE') {
                            // Update our store
                            this.storeFilesError.getAt(rowIndex).set('needcommit', true);
                        }
                        
                        if (Panel === 'FNR') {
                            // Update our store
                            this.storeFilesNeedReviewed.getAt(rowIndex).set('needcommit', true);
                        }
                        
                        // Add this files into storePendingCommit
                        this.addToPendingCommit("en" + FilePath, FileName);
                        
                        // Remove wait msg
                        msg.hide();
                        
                    }
                    else {
                    
                        // Remove wait msg
                        msg.hide();
                        this.winForbidden();
                        
                    }
                }
            });
            
        }, //saveEnFile
        savePatch: function(FileLang, FileID, FilePath, FileName, Panel, scope){
        
            var PanelLang, defaultPatchEmail, winPatch;
            
            if (FileLang === 'en') {
                PanelLang = '-EN';
            }
            else 
                if (FileLang === 'all') {
                    PanelLang = '';
                }
                else {
                    PanelLang = '-LANG';
                }
            
            if (scope.userLogin !== 'cvsread') {
                defaultPatchEmail = scope.userLogin + '@php.net';
            }
            
            winPatch = new Ext.Window({
                title: 'Do you want to be alerted ?',
                iconCls: 'patchAlert',
                width: 350,
                height: 150,
                resizable: false,
                modal: true,
                autoScroll: true,
                bodyStyle: 'padding: 5px;',
                layout: 'form',
                labelWidth: 50,
                items: [{
                    xtype: 'panel',
                    baseCls: 'x-plain',
                    bodyStyle: 'padding-bottom: 10px;',
                    html: 'If you want to be notified when your patch will be dealt with, thank you to leave an email address below.'
                }, {
                    xtype: 'textfield',
                    fieldLabel: 'Email',
                    name: 'patch-email-alert',
                    anchor: '100%',
                    value: defaultPatchEmail
                
                }],
                buttons: [{
                    text: 'Save',
                    handler: function(){
                    
                        var patchEmail, msg;
                        
                        patchEmail = this.ownerCt.items.items[1].getValue();
                        
                        msg = Ext.MessageBox.wait('Saving data as a patch...');
                        
                        winPatch.close();
                        
                        if (FileLang !== 'all') {
                        
                            Ext.getCmp(Panel + PanelLang + '-PANEL-btn-saveas-' + FileID).disable();
                            Ext.getCmp(Panel + PanelLang + '-' + FileID).isModifiedLang = false;
                            Ext.getCmp(Panel + PanelLang + '-PANEL-' + FileID).setTitle(Ext.getCmp(Panel + PanelLang + '-PANEL-' + FileID).originTitle);
                            Ext.getCmp(Panel + '-' + FileID).setTitle(Ext.getCmp(Panel + '-' + FileID).originTitle);
                            
                        }
                        else {
                        
                            Ext.getCmp('AF-PANEL-btn-saveas-' + FileID).disable();
                            Ext.getCmp('AF-FILE-' + FileID).isModified = false;
                            Ext.getCmp('AF-PANEL-' + FileID).setTitle(Ext.getCmp('AF-PANEL-' + FileID).originTitle);
                            Ext.getCmp('AF-' + FileID).setTitle(Ext.getCmp('AF-' + FileID).originTitle);
                            
                        }
                        
                        // We save this patch
                        Ext.Ajax.request({
                            scope: scope,
                            url: './php/controller.php',
                            params: {
                                task: 'save-file',
                                filePath: FilePath,
                                fileName: FileName,
                                fileLang: FileLang,
                                fileContent: (FileLang !== 'all') ? Ext.getCmp(Panel + PanelLang + '-' + FileID).getCode() : Ext.getCmp('AF-FILE-' + FileID).getCode(),
                                type: 'patch',
                                emailAlert: patchEmail
                            },
                            success: function(action, form){
                                var o = Ext.util.JSON.decode(action.responseText);
                                if (o.success) {
                                
                                    // Add this files into storePendingPatch
                                    if (FileLang !== 'all') {
                                        this.addToPendingPatch(FileLang + FilePath, FileName, o.uniqId);
                                    }
                                    else {
                                        this.addToPendingPatch(FilePath, FileName, o.uniqId);
                                    }
                                    // Remove wait msg
                                    msg.hide();
                                }
                            }
                        });
                        
                    }
                }, {
                    text: 'Cancel',
                    handler: function(){
                        winPatch.close();
                    }
                }]
            });
            winPatch.show();
            
        }, //savePatch
        saveLangFile: function(FileID, FilePath, FileName, Panel, rowIndex, scope){
        
            if (scope.userLogin === 'cvsread') {
                scope.winForbidden();
                return;
            }
            
            function checkResponse(btn){
            
                if (btn === 'no') {
                
                    Ext.getCmp(Panel + '-LANG-PANEL-btn-save-' + FileID).disable();
                    Ext.getCmp(Panel + '-' + FileID).isModifiedLang = false;
                    Ext.getCmp(Panel + '-LANG-PANEL-' + FileID).setTitle(Ext.getCmp(Panel + '-LANG-PANEL-' + FileID).originTitle);
                    
                    if (!Ext.getCmp(Panel + '-' + FileID).isModifiedEn && !Ext.getCmp(Panel + '-' + FileID).isModifiedLang) {
                        Ext.getCmp(Panel + '-' + FileID).setTitle(Ext.getCmp(Panel + '-' + FileID).originTitle);
                    }
                    
                    var msg = Ext.MessageBox.wait('Saving data...');
                    
                    // We save LANG File
                    Ext.Ajax.request({
                        scope: this,
                        url: './php/controller.php',
                        params: {
                            task: 'save-file',
                            filePath: FilePath,
                            fileName: FileName,
                            fileLang: this.userLang,
                            fileContent: Ext.getCmp(Panel + '-LANG-' + FileID).getCode()
                        },
                        success: function(action, form){
                            var o = Ext.util.JSON.decode(action.responseText);
                            if (o.success) {
                            
                                if (Panel === 'FE') {
                                    // Update our store
                                    this.storeFilesError.getAt(rowIndex).set('needcommit', true);
                                    this.storeFilesError.getAt(rowIndex).set('maintainer', o.maintainer);
                                }
                                
                                if (Panel === 'FNU') {
                                    // Update our store
                                    this.storeFilesNeedUpdate.getAt(rowIndex).set('revision', '1.' + o.new_revision);
                                    this.storeFilesNeedUpdate.getAt(rowIndex).set('needcommit', true);
                                    this.storeFilesNeedUpdate.getAt(rowIndex).set('maintainer', o.maintainer);
                                }
                                
                                if (Panel === 'FNR') {
                                    // Update our store
                                    this.storeFilesNeedReviewed.getAt(rowIndex).set('needcommit', true);
                                    this.storeFilesNeedReviewed.getAt(rowIndex).set('maintainer', o.maintainer);
                                    this.storeFilesNeedReviewed.getAt(rowIndex).set('reviewed', o.reviewed);
                                }
                                
                                // Add this files into storePendingCommit
                                this.addToPendingCommit(this.userLang + FilePath, FileName);
                                
                                // Remove wait msg
                                msg.hide();
                            }
                            else {
                                // Remove wait msg
                                msg.hide();
                                this.winForbidden();
                            }
                        }
                    });
                    
                }
                else 
                    if (btn === 'yes') {
                    
                        Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Checking for error. Please, wait...');
                        
                        Ext.getCmp(Panel + '-LANG-PANEL-btn-save-' + FileID).disable();
                        Ext.getCmp(Panel + '-' + FileID).isModifiedLang = false;
                        Ext.getCmp(Panel + '-LANG-PANEL-' + FileID).setTitle(Ext.getCmp(Panel + '-LANG-PANEL-' + FileID).originTitle);
                        
                        if (!Ext.getCmp(Panel + '-' + FileID).isModifiedEn && !Ext.getCmp(Panel + '-' + FileID).isModifiedLang) {
                            Ext.getCmp(Panel + '-' + FileID).setTitle(Ext.getCmp(Panel + '-' + FileID).originTitle);
                        }
                        
                        // We check for error
                        Ext.Ajax.request({
                            scope: this,
                            url: './php/controller.php',
                            params: {
                                task: 'check-file-error',
                                FilePath: FilePath,
                                FileName: FileName,
                                FileLang: this.userLang,
                                FileContent: Ext.getCmp(Panel + '-LANG-' + FileID).getCode()
                            },
                            success: function(action, form){
                            
                                Ext.getBody().unmask();
                                
                                var o = Ext.util.JSON.decode(action.responseText);
                                if (o.success) {
                                
                                    // If there is some errors, we display this
                                    if (o.error && o.error_first !== '-No error-') {
                                    
                                        Ext.getCmp('main-panel').add({
                                            closable: true,
                                            title: 'Error in ' + FileName,
                                            iconCls: 'FilesError',
                                            id: 'FE-help-' + FileID,
                                            autoScroll: true,
                                            autoLoad: './error_type.php?dir=' + FilePath + '&file=' + FileName
                                        });
                                        
                                        Ext.getCmp('main-panel').setActiveTab('FE-help-' + FileID);
                                        
                                        this.storeFilesError.reload();
                                        
                                    }
                                    else {
                                        // If there is no error, we display an information message
                                        Ext.MessageBox.show({
                                            title: 'Check for errors',
                                            msg: 'There is no error.',
                                            buttons: Ext.MessageBox.OK,
                                            icon: Ext.MessageBox.INFO
                                        });
                                    }
                                    
                                    // Now, We save LANG File
                                    Ext.Ajax.request({
                                        scope: this,
                                        url: './php/controller.php',
                                        params: {
                                            task: 'save-file',
                                            filePath: FilePath,
                                            fileName: FileName,
                                            fileLang: this.userLang,
                                            fileContent: Ext.getCmp(Panel + '-LANG-' + FileID).getCode()
                                        },
                                        success: function(action, form){
                                            var o = Ext.util.JSON.decode(action.responseText);
                                            if (o.success) {
                                            
                                                if (Panel === 'FE') {
                                                    // Update our store
                                                    this.storeFilesError.getAt(rowIndex).set('needcommit', true);
                                                    this.storeFilesError.getAt(rowIndex).set('maintainer', o.maintainer);
                                                }
                                                
                                                if (Panel === 'FNU') {
                                                    // Update our store
                                                    this.storeFilesNeedUpdate.getAt(rowIndex).set('revision', '1.' + o.new_revision);
                                                    this.storeFilesNeedUpdate.getAt(rowIndex).set('needcommit', true);
                                                    this.storeFilesNeedUpdate.getAt(rowIndex).set('maintainer', o.maintainer);
                                                }
                                                
                                                if (Panel === 'FNR') {
                                                    // Update our store
                                                    this.storeFilesNeedReviewed.getAt(rowIndex).set('needcommit', true);
                                                    this.storeFilesNeedReviewed.getAt(rowIndex).set('maintainer', o.maintainer);
                                                    this.storeFilesNeedReviewed.getAt(rowIndex).set('reviewed', o.reviewed);
                                                }
                                                
                                                // Add this files into storePendingCommit
                                                this.addToPendingCommit(this.userLang + FilePath, FileName);
                                            }
                                            else {
                                                this.winForbidden();
                                            }
                                        }
                                    }); // Ajax
                                    if (Panel === 'FE') {
                                        // We must reload the iframe of error description
                                        Ext.getCmp(Panel + '-error-type-' + FileID).setSrc('./error_type.php?dir=' + FilePath + '&file=' + FileName + '&nocache=' + new Date().getTime());
                                    }
                                    
                                }
                            }
                        }); //Ajax
                    } // if yes
            }
            
            Ext.MessageBox.show({
                scope: scope,
                title: 'Confirm',
                msg: 'Do you want to check for error before saving ?',
                icon: Ext.MessageBox.INFO,
                buttons: Ext.MessageBox.YESNOCANCEL,
                fn: checkResponse
            });
            
        }, //saveLangFile
        getFile: function(FileID, FilePath, FileName, Panel1, Panel2){
        
            // Mask the panel
            Ext.get(Panel1 + FileID).mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Loading...');
            
            // We load the File
            Ext.Ajax.request({
                scope: this,
                url: './php/controller.php',
                params: {
                    task: 'get-file',
                    FilePath: FilePath,
                    FileName: FileName
                },
                success: function(action, form){
                    var o, size;
                    
                    o = Ext.util.JSON.decode(action.responseText);
                    if (o.success) {
                    
                        // We display in window
                        Ext.getCmp(Panel2 + FileID).setCode(o.content);
                        
                        // We unmask
                        Ext.get(Panel1 + FileID).unmask();
                        
                        if (Panel1 === 'FE-LANG-PANEL-' || Panel1 === 'FNR-LANG-PANEL-' || Panel1 === 'FNR-EN-PANEL-' || Panel1 === 'AF-PANEL-') {
                        
                            // We must fake a resize event to extend the frame
                            size = Ext.getCmp(Panel1 + FileID).getSize();
                            size.height = size.height + 1;
                            Ext.getCmp(Panel1 + FileID).setSize(size);
                            Ext.getCmp(Panel1 + FileID).fireEvent('resize');
                            
                        }
                        
                    }
                },
                callback: function(){
                
                    // Reviewed function to open all files of an extension
                    if (this.filePendingOpen[0]) {
                        this.filePendingOpen.shift();
                        if (this.filePendingOpen[0]) {
                            if (this.filePendingOpen[0][0]) {
                                this.openFile(this.filePendingOpen[0][0], this.filePendingOpen[0][1]);
                            }
                        }
                    }
                    
                }
            });
            
        }, // getFile
        addToPendingPatch: function(FilePath, FileName, uniqID){
        
            var dt, r;
            
            // Add this files into storePendingCommit
            dt = new Date();
            
            r = new this.storePendingPatch.recordType({
                id: Ext.id('', ''),
                path: FilePath,
                name: FileName,
                by: this.userLogin,
                uniqID: uniqID,
                date: dt.format("Y-m-d H:i:s")
            });
            this.storePendingPatch.insert(0, r);
            
        }, //addToPendingPatch
        addToPendingCommit: function(FilePath, FileName){
        
            var alReady, dt, r1;
            
            alReady = false;
            // Check if this file is not already into this store
            this.storePendingCommit.each(function(r){
            
                if (r.data.path === FilePath && r.data.name === FileName) {
                    alReady = true;
                }
                
            });
            
            if (!alReady) {
                // Add this files into storePendingCommit
                dt = new Date();
                
                r1 = new this.storePendingCommit.recordType({
                    id: Ext.id('', ''),
                    path: FilePath,
                    name: FileName,
                    by: this.userLogin,
                    date: dt.format("Y-m-d H:i:s")
                });
                this.storePendingCommit.insert(0, r1);
            }
            
        }, //addToPendingCommit
        // Custom renderer
        rendererNumUptodate: function(val){
            if (val === '0') {
                return;
            }
            else {
                return '<span style="color:green; font-weight: bold;">' + val + '</span>';
            }
        },
        
        rendererNumCritical: function(val){
            if (val === '0') {
                return;
            }
            else {
                return '<span style="color:red; font-weight: bold;">' + val + '</span>';
            }
        },
        
        rendererTotalTranslator: function(v, params, data){
            return v ? ((v === 0 || v > 1) ? '(' + v + ' Translators)' : '(1 Translator)') : '';
        },
        
        rendererSum: function(v){
            return (v === '0') ? '' : v;
        },
        
        NewTabBugs: function(BugsId, BugsUrl, BugsTitle){
        
            Ext.getCmp('main-panel').add({
                xtype: 'iframepanel',
                id: 'mifp_bugs_' + BugsId,
                title: 'Loading...',
                tabTip: BugsTitle,
                iconCls: 'iconBugs',
                loadMask: true,
                defaultSrc: BugsUrl,
                listeners: {
                    'documentloaded': function(frame){
                        frame.ownerCt.setTitle(Ext.util.Format.substr(BugsTitle, 0, 20) + '...');
                    }
                }
            });
            Ext.getCmp('main-panel').setActiveTab('mifp_bugs_' + BugsId);
        }, //NewTabBugs
        NewTabMailing: function(MailId, MailUrl, MailTitle){
        
            Ext.getCmp('main-panel').add({
                xtype: 'iframepanel',
                id: 'mifp_' + MailId,
                title: 'Loading...',
                tabTip: MailTitle,
                iconCls: 'home-mailing-title',
                loadMask: true,
                defaultSrc: MailUrl,
                listeners: {
                    'documentloaded': function(frame){
                        frame.ownerCt.setTitle(Ext.util.Format.substr(MailTitle, 0, 20) + '...');
                    }
                }
            });
            Ext.getCmp('main-panel').setActiveTab('mifp_' + MailId);
            
        }, //NewTabMailing
        winDiff: function(FilePath, FileName, rev1, rev2){
        
            Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Finding the diff. Please, wait...');
            
            // Load diff data
            Ext.Ajax.request({
                url: './php/controller.php',
                params: {
                    task: 'get-diff2',
                    FilePath: FilePath,
                    FileName: FileName,
                    Rev1: rev1,
                    Rev2: rev2
                },
                success: function(action){
                
                    var o, winStatus;
                    
                    o = Ext.util.JSON.decode(action.responseText);
                    if (o.success) {
                    
                        Ext.getBody().unmask();
                        
                        // We display in diff window
                        winStatus = new Ext.Window({
                            title: 'Diff between ' + rev1 + ' & ' + rev2,
                            width: 650,
                            height: 350,
                            resizable: false,
                            modal: true,
                            autoScroll: true,
                            bodyStyle: 'background-color: white; padding: 5px;',
                            html: '<div class="diff-content">' + o.content + '</div>',
                            buttons: [{
                                text: 'Close',
                                handler: function(){
                                    winStatus.close();
                                }
                            }]
                        });
                        winStatus.show();
                        
                    }
                    
                },
                failure: function(){
                
                }
            });
            
        }, //winDiff
        // Need confirm if we want to close a tab and the content have been modified.
        removeTabEvent: function(tabpanel, tab){
        
            var stateLang, stateEn, state, PanType;
            
            PanType = tab.id.split('-');
            
            if ((PanType[0] === 'FE' || PanType[0] === 'FNU' || PanType[0] === 'FNR' || PanType[0] === 'PP') && PanType[1] !== 'help') {
            
                if (PanType[0] === 'FE') {
                    stateLang = Ext.getCmp('FE-' + PanType[1]).isModifiedLang;
                }
                if (PanType[0] === 'FNU') {
                    stateLang = Ext.getCmp('FNU-' + PanType[1]).isModifiedLang;
                }
                if (PanType[0] === 'FNR') {
                    stateLang = Ext.getCmp('FNR-' + PanType[1]).isModifiedLang;
                }
                
                if (PanType[0] === 'FE') {
                    stateEn = Ext.getCmp('FE-' + PanType[1]).isModifiedEn;
                }
                if (PanType[0] === 'FNU') {
                    stateEn = Ext.getCmp('FNU-' + PanType[1]).isModifiedEn;
                }
                if (PanType[0] === 'FNR') {
                    stateEn = Ext.getCmp('FNR-' + PanType[1]).isModifiedEn;
                }
                
                if (PanType[0] === 'PP') {
                    state = Ext.getCmp('PP-PATCH-' + PanType[1]).isModified;
                }
                
                if (stateEn || stateLang || state) {
                
                    Ext.Msg.show({
                        scope: this,
                        title: 'Confirm',
                        msg: 'This file has been modified without being saved.<br/>Do you really want to close?',
                        buttons: Ext.Msg.YESNO,
                        icon: Ext.Msg.QUESTION,
                        fn: function(btn, text){
                            if (btn === 'yes') {
                                tabpanel.un('beforeremove', this.removeTabEvent, this);
                                tabpanel.remove(tab);
                                tabpanel.addListener('beforeremove', this.removeTabEvent, this);
                            }
                        }
                    });
                }
                else {
                    return true;
                }
                return false;
            }
            else {
                return true;
            }
        }, //removeTabEvent
        WinCommit: function(singleFile, rowIndex, choice){
        
            var win, btn, FileID, FilePath, FileName, node;
            
            btn = Ext.get('acc-need-update');
            
            if (!win) {
                win = new Ext.Window({
                    scope: this,
                    id: 'winCvsCommit',
                    title: 'CVS commit',
                    closable: false,
                    layout: 'form',
                    width: 400,
                    height: 480,
                    resizable: false,
                    modal: true,
                    bodyStyle: 'padding:5px 5px 0',
                    labelAlign: 'top',
                    items: [{
                        xtype: 'checktreepanel',
                        id: 'tree-panel',
                        anchor: '100%',
                        height: 180,
                        autoScroll: true,
                        rootVisible: false,
                        root: {
                            text: 'root',
                            expanded: true,
                            children: []
                        }
                    }, {
                        scope: this,
                        xtype: 'combo',
                        fieldLabel: 'Older messages',
                        editable: false,
                        name: 'first2',
                        anchor: '100%',
                        store: this.storeCommitLogMessage,
                        triggerAction: 'all',
                        tpl: '<tpl for="."><div class="x-combo-list-item">{[values.text.split("\n").join("<br/>")]}</div></tpl>',
                        valueField: 'id',
                        displayField: 'text',
                        listeners: {
                            scope: this,
                            render: function(){
                                this.storeCommitLogMessage.load();
                            },
                            select: function(combo, record, numIndex){
                                Ext.getCmp('form-commit-message-log').setValue(record.data.text);
                            }
                        }
                    }, {
                        xtype: 'textarea',
                        id: 'form-commit-message-log',
                        fieldLabel: 'Log message',
                        name: 'first3',
                        anchor: '100%',
                        height: 150,
                        value: ""
                    }],
                    tools: [{
                        scope: this,
                        id: 'gear',
                        qtip: 'Configure this tools',
                        handler: function(){
                        
                            var textArea, cm, winManage;
                            
                            function formatText(value){
                                return value.split("\n").join("<br/>");
                            }
                            
                            textArea = new Ext.form.TextArea({
                                grow: true,
                                growMin: 120
                            });
                            
                            cm = new Ext.grid.ColumnModel([new Ext.grid.RowNumberer(), {
                                id: 'GridManageLog',
                                header: "Log Message",
                                dataIndex: 'text',
                                renderer: formatText,
                                editor: new Ext.Editor(textArea, {
                                    shadow: false,
                                    autoSize: true,
                                    listeners: {
                                        scope: this,
                                        complete: function(editor, newValue, OldValue){
                                        
                                            var messID = editor.record.data.id;
                                            
                                            //
                                            Ext.Ajax.request({
                                                scope: this,
                                                url: './php/controller.php',
                                                params: {
                                                    task: 'save-LogMessage',
                                                    messID: messID,
                                                    mess: newValue
                                                },
                                                success: function(action, form){
                                                    var o = Ext.util.JSON.decode(action.responseText);
                                                    if (o.success) {
                                                        this.storeCommitLogMessage.getById(messID).commit();
                                                    }
                                                    else {
                                                        this.winForbidden();
                                                    }
                                                }
                                            });
                                        }
                                    }
                                })
                            
                            }]);
                            
                            //
                            winManage = new Ext.Window({
                                title: 'Manage Log Message',
                                iconCls: 'winManageLog',
                                width: 650,
                                height: 350,
                                layout: 'fit',
                                resizable: false,
                                modal: true,
                                autoScroll: true,
                                html: '<div class="diff-content"></div>',
                                items: [{
                                    xtype: 'editorgrid',
                                    store: this.storeCommitLogMessage,
                                    loadMask: true,
                                    cm: cm,
                                    sm: new Ext.grid.RowSelectionModel({
                                        singleSelect: true
                                    }),
                                    autoExpandColumn: 'GridManageLog',
                                    listeners: {
                                        scope: this,
                                        rowcontextmenu: function(grid, rowIndex, e){
                                        
                                            grid.getSelectionModel().selectRow(rowIndex);
                                            
                                            var menu = new Ext.menu.Menu({
                                                items: [{
                                                    text: 'Delete this Log Message',
                                                    iconCls: 'iconDelete',
                                                    scope: this,
                                                    handler: function(){
                                                    
                                                        // 
                                                        Ext.Ajax.request({
                                                            scope: this,
                                                            url: './php/controller.php',
                                                            params: {
                                                                task: 'delete-LogMessage',
                                                                messID: this.storeCommitLogMessage.getAt(rowIndex).data.id
                                                            },
                                                            success: function(action, form){
                                                                var o = Ext.util.JSON.decode(action.responseText);
                                                                if (o.success) {
                                                                    this.storeCommitLogMessage.remove(this.storeCommitLogMessage.getAt(rowIndex));
                                                                }
                                                                else {
                                                                    this.winForbidden();
                                                                }
                                                            }
                                                        });
                                                    }
                                                }]
                                            });
                                            menu.showAt(e.getXY());
                                        }
                                    }
                                }],
                                buttons: [{
                                    text: 'Close',
                                    handler: function(){
                                        winManage.close();
                                    }
                                }],
                                listeners: {
                                    scope: this,
                                    close: function(){
                                        this.storeCommitLogMessage.reload();
                                    }
                                }
                            });
                            winManage.show();
                            
                        }
                    }],
                    buttons: [{
                        scope: this,
                        text: 'Submit',
                        id: 'win-commit-btn-submit',
                        handler: function(){
                        
                            var files, NeedToBeClose, checkNode, paneID_FE, paneID_FNU, paneID_FNR, tmp = [], paneID, libelNeedToBeClose = '', i;
                            
                            // If the user is cvsread, we don't commit anything
                            if (this.userLogin === 'cvsread') {
                            
                                // Close this window
                                win.close();
                                
                                this.winForbidden();
                                
                                return;
                            }
                            
                            // Check if there is some tab open with a file who need to be committed
                            files = Ext.getCmp('tree-panel').getValue();
                            NeedToBeClose = [];
                            
                            for (i = 0; i < files.length; i = i + 1) {
                            
                                //var checkNode, paneID_FE, paneID_FNU, paneID_FNR, tmp = [], paneID, libelNeedToBeClose = '';
                                
                                checkNode = Ext.getCmp('tree-panel').getNodeById(files[i]).attributes;
                                
                                paneID_FE = 'FE-' + Ext.util.md5('FE-' + checkNode.FilePath + checkNode.FileName);
                                paneID_FNU = 'FNU-' + Ext.util.md5('FNU-' + checkNode.FilePath + checkNode.FileName);
                                paneID_FNR = 'FNR-' + Ext.util.md5('FNR-' + checkNode.FilePath + checkNode.FileName);
                                
                                if (Ext.getCmp('main-panel').findById(paneID_FE) ||
                                Ext.getCmp('main-panel').findById(paneID_FNU) ||
                                Ext.getCmp('main-panel').findById(paneID_FNR)) {
                                
                                    if (Ext.getCmp('main-panel').findById(paneID_FE)) {
                                        paneID = paneID_FE;
                                    }
                                    if (Ext.getCmp('main-panel').findById(paneID_FNU)) {
                                        paneID = paneID_FNU;
                                    }
                                    if (Ext.getCmp('main-panel').findById(paneID_FNR)) {
                                        paneID = paneID_FNR;
                                    }
                                    
                                    tmp[0] = paneID;
                                    tmp[1] = checkNode.FileName;
                                    
                                    NeedToBeClose.push(tmp);
                                }
                                
                            }
                            
                            if (NeedToBeClose.length > 0) {
                            
                                for (i = 0; i < NeedToBeClose.length; i = i + 1) {
                                    libelNeedToBeClose += NeedToBeClose[i][1] + '<br>';
                                }
                                
                                Ext.MessageBox.show({
                                    scope: this,
                                    title: 'Warning',
                                    msg: 'There is ' + NeedToBeClose.length + ' file' + ((NeedToBeClose.length > 1) ? 's' : '') + ' to close before commit.<br><br>' + libelNeedToBeClose + '<br><br>Would you like I close it for you ?',
                                    icon: Ext.MessageBox.INFO,
                                    buttons: Ext.MessageBox.YESNOCANCEL,
                                    fn: function(btn){
                                        if (btn === 'yes') {
                                        
                                            for (i = 0; i < NeedToBeClose.length; i = i + 1) {
                                                Ext.getCmp('main-panel').remove(NeedToBeClose[i][0]);
                                            }
                                            
                                            this.WinCommitLastStep(files, this);
                                        }
                                        else {
                                            return;
                                        }
                                    }
                                });
                                
                            }
                            else {
                                this.WinCommitLastStep(files, this);
                            }
                            return;
                            
                        }
                    }, {
                        text: 'Close',
                        id: 'win-commit-btn-close',
                        handler: function(){
                            win.close();
                        }
                    }]
                });
            }
            
            win.show(btn);
            
            // Load files to commit
            if (singleFile) {
            
                // Just the current file
                
                FilePath = this.storePendingCommit.getAt(rowIndex).data.path;
                FileName = this.storePendingCommit.getAt(rowIndex).data.name;
                FileID = Ext.util.md5(FilePath + FileName);
                
                node = new Ext.tree.TreeNode({
                    id: 'need-commit-' + FileID,
                    //originID    : FileID,
                    //originStore : store,
                    text: FilePath + FileName,
                    FilePath: FilePath,
                    FileName: FileName,
                    //fileLang    : FileLang,
                    leaf: true,
                    checked: true,
                    uiProvider: Ext.ux.tree.CheckTreeNodeUI
                });
                
                Ext.getCmp('tree-panel').getRootNode().appendChild(node);
                
            }
            else {
            
                // in files Need Update
                this.storePendingCommit.each(function(record){
                
                    if (choice && choice === 'by me' && record.data.by !== this.userLogin) {
                    }
                    else {
                    
                        FilePath = record.data.path;
                        FileName = record.data.name;
                        FileID = Ext.util.md5(FilePath + FileName);
                        
                        node = new Ext.tree.TreeNode({
                            id: 'need-commit-' + FileID,
                            text: FilePath + FileName,
                            FilePath: FilePath,
                            FileName: FileName,
                            //fileLang   : this.userLang,
                            leaf: true,
                            checked: true,
                            uiProvider: Ext.ux.tree.CheckTreeNodeUI
                        });
                        
                        Ext.getCmp('tree-panel').getRootNode().appendChild(node);
                    }
                    
                }, this);
                
            }
            
            
        }, // WinCommit
        WinCommitLastStep: function(files, scope){
        
            Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Please, wait until commit...');
            
            var nodes = [], node, tmp, LogMessage, i;
            
            // Go for Cvs commit
            for (i = 0; i < files.length; i = i + 1) {
            
                node = Ext.getCmp('tree-panel').getNodeById(files[i]);
                tmp = [];
                
                tmp[0] = node.attributes.FilePath;
                tmp[1] = node.attributes.FileName;
                nodes.push(tmp);
            }
            
            // Get log message
            LogMessage = Ext.getCmp('form-commit-message-log').getValue();
            
            // Close this window
            Ext.getCmp('winCvsCommit').close();
            
            Ext.Ajax.request({
                url: './php/controller.php',
                params: {
                    task: 'cvs-commit',
                    nodes: Ext.util.JSON.encode(nodes),
                    logMessage: LogMessage
                },
                success: function(action){
                
                    var o, winStatus;
                    
                    o = Ext.util.JSON.decode(action.responseText);
                    if (o.success) {
                    
                        Ext.getBody().unmask();
                        
                        // Display commit output message
                        winStatus = new Ext.Window({
                            title: 'Status',
                            width: 450,
                            height: 350,
                            resizable: false,
                            modal: true,
                            autoScroll: true,
                            bodyStyle: 'background-color: white; padding: 5px;',
                            html: o.mess.join("<br>"),
                            buttons: [{
                                text: 'Close',
                                handler: function(){
                                    winStatus.close();
                                }
                            }]
                        });
                        winStatus.show();
                        
                        // Apply modification
                        Ext.Ajax.request({
                            url: './php/controller.php',
                            params: {
                                task: 'on-succes-commit',
                                nodes: Ext.util.JSON.encode(nodes),
                                logMessage: LogMessage
                            },
                            success: function(action){
                            
                                if (scope.userLang != 'en') {
                                    // Reload Files error data
                                    scope.storeFilesError.reload();
                                    
                                    // Reload Files Need reviewed
                                    scope.storeFilesNeedReviewed.reload();
                                    
                                    // Reload Files Need Update
                                    scope.storeFilesNeedUpdate.reload();
                                }
                                
                                scope.storePendingCommit.reload();
                                
                                // Reload translators data
                                scope.storeTranslators.reload();
                                
                                // Reload summary data
                                scope.storeSummary.reload();
                            }
                        });
                    }
                    else {
                        //console.log(o);
                    }
                }
            });
            
        }, // WinCommitLastStep
        WinUpdate: function(){
        
            // Update of Cvs and apply all tools.
            var win, btn;
            
            function RefreshStep1(scope){
            
                // We need to stop pin test during this update
                scope.TaskPing.cancel();
                
                Ext.get('wizard-step-1').replaceClass('wizard-step-before', 'wizard-step-working');
                Ext.get('wizard-step-1.1').replaceClass('wizard-wait', 'wizard-show');
                Ext.Ajax.request({
                    scope: scope,
                    url: './php/controller.php',
                    params: {
                        task: 'update-repository'
                    },
                    success: function(action){
                        // Normally, this never succes ! ;)
                        var o = Ext.util.JSON.decode(action.responseText);
                        if (o.success) {
                            Ext.get('wizard-step-1').replaceClass('wizard-step-working', 'wizard-step-done');
                            Ext.get('wizard-step-1.1').replaceClass('wizard-show', 'wizard-wait');
                            RefreshStep2(scope);
                        }
                        else {
                            win.close();
                            this.winForbidden();
                        }
                    },
                    failure: function(){
                    
                        // If update take over 30sec (max Keep-Alive time), we are on failure !
                        
                        function checkLockFile(){
                            Ext.Ajax.request({
                                scope: scope,
                                url: './php/controller.php',
                                params: {
                                    task: 'check-lock-file',
                                    lockFile: 'lock_update_repository'
                                },
                                success: function(action){
                                    var o = Ext.util.JSON.decode(action.responseText);
                                    if (!o.success) {
                                        Ext.get('wizard-step-1').replaceClass('wizard-step-working', 'wizard-step-done');
                                        Ext.get('wizard-step-1.1').replaceClass('wizard-show', 'wizard-wait');
                                        
                                        // Goto step2
                                        RefreshStep2(this);
                                        
                                    }
                                    else {
                                        wizardDelayUpdate.delay(5000);
                                    }
                                },
                                failure: function(){
                                    wizardDelayUpdate.delay(5000);
                                }
                            });
                            
                        }
                        
                        // We check ever XX secondes if checkout is finish, or not.
                        var wizardDelayUpdate = new Ext.util.DelayedTask(function(){
                            checkLockFile();
                        });
                        wizardDelayUpdate.delay(5000);
                        
                    }
                });
                
            } // RefreshStep1()
            function RefreshStep2(scope){
                Ext.get('wizard-step-2').replaceClass('wizard-step-before', 'wizard-step-working');
                Ext.Ajax.request({
                    scope: scope,
                    url: './php/controller.php',
                    params: {
                        task: 'apply-tools'
                    },
                    success: function(action){
                        var o = Ext.util.JSON.decode(action.responseText);
                        if (o.success) {
                            Ext.get('wizard-step-2').replaceClass('wizard-step-working', 'wizard-step-done');
                            RefreshStep3(this);
                        }
                        
                    },
                    failure: function(){
                    
                        // If the first pass take over 30 sec., we check the lock file
                        
                        function checkLockFile2(){
                            Ext.Ajax.request({
                                scope: scope,
                                url: './php/controller.php',
                                params: {
                                    task: 'check-lock-file',
                                    lockFile: 'lock_apply_tools'
                                },
                                success: function(action){
                                    var o = Ext.util.JSON.decode(action.responseText);
                                    if (!o.success) {
                                        Ext.get('wizard-step-2').replaceClass('wizard-step-working', 'wizard-step-done');
                                        RefreshStep3(this);
                                    }
                                    else {
                                        wizardDelayApplyTools.delay(5000);
                                    }
                                },
                                failure: function(){
                                    wizardDelayApplyTools.delay(5000);
                                }
                            });
                            
                        }
                        
                        // We check ever XX secondes if applaying tools is finish, or not.
                        var wizardDelayApplyTools = new Ext.util.DelayedTask(function(){
                            checkLockFile2();
                        });
                        wizardDelayApplyTools.delay(5000);
                        
                    }
                });
                
            } // RefreshStep2()
            function RefreshStep3(scope){
            
                Ext.get('wizard-step-3').replaceClass('wizard-step-before', 'wizard-step-working');
                
                if (scope.userLang != 'en') {
                    // Reload all data on this page
                    scope.storeFilesNeedUpdate.reload();
                    scope.storeTranslators.reload();
                    scope.storeFilesError.reload();
                }
                
                Ext.get('wizard-step-3').replaceClass('wizard-step-working', 'wizard-step-done');
                
                // Re-enable Finish button
                Ext.getCmp('btn-start-refresh').setIconClass('finishRefresh');
                Ext.getCmp('btn-start-refresh').setText('Finish !');
                Ext.getCmp('btn-start-refresh').setHandler(function(){
                    win.close();
                });
                Ext.getCmp('btn-start-refresh').enable();
                
                // Re-enable TaskPing
                scope.TaskPing.delay(30000);
                
                // Re-enable win's close button
                win.tools.close.setVisible(true);
                
            } // RefreshStep3()
            btn = Ext.get('acc-need-update');
            
            if (!win) {
                win = new Ext.Window({
                    title: 'Refresh all data',
                    layout: 'form',
                    width: 300,
                    height: 200,
                    resizable: false,
                    modal: true,
                    bodyStyle: 'padding:15px 15px 0',
                    iconCls: 'refresh',
                    html: '<div id="wizard-step-1" class="wizard-step-before">Update all files from Cvs</div>' +
                    '<div id="wizard-step-1.1" class="wizard-wait">This may take time. Thank you for your patience...</div>' +
                    '<div id="wizard-step-2" class="wizard-step-before">Apply all tools</div>' +
                    '<div id="wizard-step-3" class="wizard-step-before">Reload data</div>',
                    buttons: [{
                        scope: this,
                        text: 'Start',
                        id: 'btn-start-refresh',
                        iconCls: 'startRefresh',
                        handler: function(){
                        
                            // Desable start button
                            Ext.getCmp('btn-start-refresh').disable();
                            
                            // Desable the close button for this win
                            win.tools.close.setVisible(false);
                            
                            // Start Step 1
                            RefreshStep1(this);
                            
                        }
                    }]
                });
            }
            
            win.show(btn);
        }, // Winupdate
        WinCheckBuild: function(){
        
            var win, btn;
            
            btn = Ext.get('acc-need-update');
            
            function displayMess(scope){
            
                Ext.Ajax.request({
                    scope: scope,
                    url: './php/controller.php',
                    params: {
                        task: 'get-logfile',
                        file: 'log_check_build'
                    },
                    success: function(action){
                    
                        var o, winStatus;
                        
                        o = Ext.util.JSON.decode(action.responseText);
                        
                        if (o.success) {
                        
                            // Re-enable TaskPing
                            this.TaskPing.delay(30000);
                            
                            // Display
                            if ( Ext.getCmp('main-panel').findById('check_build_panel') ) {
                                Ext.getCmp('main-panel').remove('check_build_panel');
                            }

                            Ext.getCmp('main-panel').add({
                                xtype: 'panel',
                                id: 'check_build_panel',
                                title: 'Check Build Result',
                                closable: true,
                                autoScroll: true,
                                iconCls: 'checkBuild',
                                html: '<div class="check-build-content">'+o.mess+'</div>'
                            });
                            Ext.getCmp('main-panel').setActiveTab('check_build_panel');

                        }
                    }
                });
                
            }
            
            if (!win) {
                win = new Ext.Window({
                    title: 'Check Build',
                    iconCls: 'checkBuild',
                    layout: 'form',
                    width: 350,
                    height: 200,
                    resizable: false,
                    modal: true,
                    bodyStyle: 'padding:5px 5px 0',
                    labelAlign: 'top',
                    buttons: [{
                        scope: this,
                        text: 'Go !',
                        id: 'win-check-build-btn-submit',
                        handler: function(){
                        
                            var choice = Ext.getCmp('option-xml-details').checked;
                            
                            win.close();
                            Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Please, wait until the build is checked...');
                            
                            // We need to stop pin test during this process
                            this.TaskPing.cancel();
                            
                            Ext.Ajax.request({
                                scope: this,
                                url: './php/controller.php',
                                params: {
                                    task: 'check-build',
                                    xmlDetails: choice
                                },
                                success: function(action){
                                    var o = Ext.util.JSON.decode(action.responseText);
                                    if (o.success) {
                                        Ext.getBody().unmask();
                                        displayMess(this);
                                    }
                                    else {
                                        // Re-enable TaskPing
                                        this.TaskPing.delay(30000);
                                        Ext.getBody().unmask();
                                        this.winForbidden();
                                    }
                                },
                                failure: function(action){
                                
                                    // If this take over 30sec (max Keep-Alive time), we are on failure !
                                    
                                    function checkLockFile(scope){
                                        Ext.Ajax.request({
                                            scope: scope,
                                            url: './php/controller.php',
                                            params: {
                                                task: 'check-lock-file',
                                                lockFile: 'lock_check_build'
                                            },
                                            success: function(action){
                                                var o = Ext.util.JSON.decode(action.responseText);
                                                if (!o.success) {
                                                    Ext.getBody().unmask();
                                                    displayMess(this);
                                                }
                                                else {
                                                    builcheckDelay.delay(5000);
                                                }
                                            },
                                            failure: function(){
                                                builcheckDelay.delay(5000);
                                            }
                                        });
                                        
                                    }
                                    
                                    // We check ever XX secondes if the check build is finish, or not.
                                    var builcheckDelay = new Ext.util.DelayedTask(function(){
                                        checkLockFile(this);
                                    }, this);
                                    builcheckDelay.delay(5000);
                                }
                            });
                            
                        }
                    }],
                    items: [{
                        xtype: 'panel',
                        baseCls: 'x-plain',
                        bodyStyle: 'padding:5px 5px 0',
                        html: 'You\'re about to check the build via this command :<br/><br/>/usr/bin/php configure.php --with-lang=' + this.userLang + '<br><br>',
                        modal: false
                    }, {
                        xtype: 'checkbox',
                        hideLabel: true,
                        checked: false,
                        boxLabel: 'Enable detailed XML error messages',
                        name: 'option-xml-details',
                        id: 'option-xml-details'
                    }]
                
                });
            }
            win.show(btn);
            
            
        }, //WinCheckBuild
        WinConf: function(){
        
            var winConf, viewMenu, storeMenu, storeData, tplMenu;
            
            if (!winConf) {
            
                tplMenu = new Ext.XTemplate('<tpl for=".">', '<div class="thumb-wrap" id="tplMenu-{id}">', '<div class="thumb"><img src="themes/img/{img}" title=""></div>', '<span>{label}</span></div>', '</tpl>');
                tplMenu.compile();
                
                if (this.userLang === 'en') {
                
                    storeData = [['1', 'go-home.png', 'Main'], ['5', 'view-list-tree.png', 'Module "All files"'], ['6', 'view-media-playlist.png', 'Module "Pending Patch"']];
                    
                }
                else {
                
                    storeData = [['1', 'go-home.png', 'Main'], ['2', 'edit-redo.png', 'Module "Files Need Update"'], ['3', 'dialog-cancel.png', 'Module "Files with Error"'], ['4', 'document-properties.png', 'Module "Files need Reviewed"'], ['5', 'view-list-tree.png', 'Module "All files"'], ['6', 'view-media-playlist.png', 'Module "Pending Patch"']];
                }
                
                storeMenu = new Ext.data.SimpleStore({
                    id: 0,
                    fields: [{
                        name: 'id'
                    }, {
                        name: 'img'
                    }, {
                        name: 'label'
                    }]
                });
                storeMenu.loadData(storeData);
                
                viewMenu = new Ext.DataView({
                    tpl: tplMenu,
                    singleSelect: true,
                    overClass: 'x-view-over',
                    itemSelector: 'div.thumb-wrap',
                    store: storeMenu,
                    listeners: {
                        selectionchange: function(view, selec){
                            var r = view.getSelectedRecords();
                            Ext.getCmp('confCard').layout.setActiveItem('conf-card-' + r[0].data.id);
                        }
                    }
                });
                
                winConf = new Ext.Window({
                    scope: this,
                    layout: 'border',
                    width: 550,
                    height: 400,
                    iconCls: 'iconConf',
                    modal: true,
                    title: 'Configuration',
                    plain: true,
                    closeAction: 'hide',
                    listeners: {
                        show: function(){
                            viewMenu.select(viewMenu.getNode(0));
                        }
                    },
                    items: [{
                        scope: this,
                        region: 'west',
                        width: 190,
                        id: 'confMenu',
                        autoScroll: true,
                        items: viewMenu
                    }, {
                        scope: this,
                        layout: 'slide',
                        region: 'center',
                        id: 'confCard',
                        width: 375,
                        frame: true,
                        activeItem: 0,
                        bbar: new Ext.StatusBar({
                            defaultText: 'All changes take effect immediately',
                            defaultIconCls: 'confStatusBar'
                        }),
                        items: [{
                            scope: this,
                            id: 'conf-card-1',
                            xtype: 'form',
                            bodyStyle: 'padding: 10px;',
                            items: [{
                                xtype: 'fieldset',
                                title: 'Themes',
                                autoHeight: true,
                                defaults: {
                                    hideLabel: true
                                },
                                items: [{
                                    xtype: 'combo',
                                    store: new Ext.data.SimpleStore({
                                        fields: ['themeFile', {
                                            name: 'themeName',
                                            type: 'string'
                                        }],
                                        data: [['themes/black/css/xtheme-black.css', 'Black'], ['xtheme-default.css', 'Default'], ['themes/darkgray/css/xtheme-darkgray.css', 'DarkGray'], ['extjs/resources/css/xtheme-gray.css', 'Gray'], ['themes/gray-extend/css/xtheme-gray-extend.css', 'Gray Extend'], ['themes/indigo/css/xtheme-indigo.css', 'Indigo'], ['themes/midnight/css/xtheme-midnight.css', 'Midnight'], ['themes/olive/css/xtheme-olive.css', 'Olive'], ['themes/purple/css/xtheme-purple.css', 'Purple'], ['extjs/resources/css/xtheme-slate.css', 'Slate'], ['themes/silverCherry/css/xtheme-silverCherry.css', 'SilverCherry']]
                                    }),
                                    valueField: 'themeFile',
                                    displayField: 'themeName',
                                    triggerAction: 'all',
                                    mode: 'local',
                                    forceSelection: true,
                                    editable: false,
                                    fieldLabel: 'fieldlabel',
                                    value: this.userConf.conf_theme,
                                    listeners: {
                                        scope: this,
                                        select: function(c, record, numIndex){
                                            var hrefTheme = c.getValue();
                                            Ext.get('appTheme').dom.href = hrefTheme;
                                            this.confUpdate('conf_theme', hrefTheme);
                                        }
                                    }
                                
                                }]
                            }]
                        }, {
                            scope: this,
                            id: 'conf-card-2',
                            xtype: 'form',
                            bodyStyle: 'padding: 10px;',
                            items: [{
                                xtype: 'fieldset',
                                title: 'Diff view',
                                autoHeight: true,
                                defaults: {
                                    hideLabel: true
                                },
                                defaultType: 'radio',
                                items: [{
                                    scope: this,
                                    checked: (this.userConf.conf_needupdate_diff === "using-viewvc") ? true : false,
                                    boxLabel: 'Using ViewVc from php web site',
                                    name: 'conf_needupdate_diff',
                                    inputValue: 'using-viewvc',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            if (f.checked) {
                                                this.confUpdate('conf_needupdate_diff', f.getRawValue());
                                            }
                                        }
                                    }
                                }, {
                                    checked: (this.userConf.conf_needupdate_diff === "using-exec") ? true : false,
                                    boxLabel: 'Using diff -kk -u command line',
                                    name: 'conf_needupdate_diff',
                                    inputValue: 'using-exec',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            if (f.checked) {
                                                this.confUpdate('conf_needupdate_diff', f.getRawValue());
                                            }
                                        }
                                    }
                                }]
                            }, {
                                xtype: 'fieldset',
                                title: 'Editor',
                                autoHeight: true,
                                defaults: {
                                    hideLabel: true
                                },
                                defaultType: 'checkbox',
                                items: [{
                                    scope: this,
                                    checked: (this.userConf.conf_needupdate_scrollbars === "true") ? true : false,
                                    boxLabel: 'Synchronize scroll bars',
                                    name: 'conf_needupdate_scrollbars',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_needupdate_scrollbars', f.getValue());
                                        }
                                    }
                                },{
                                    scope: this,
                                    checked: (this.userConf.conf_needupdate_displaylog === "true") ? true : false,
                                    boxLabel: 'Automatically load the log when displaying the file',
                                    name: 'conf_needupdate_displaylog',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_needupdate_displaylog', f.getValue());
                                        }
                                    }
                                }]
                            }]
                        
                        }, {
                            id: 'conf-card-3',
                            xtype: 'form',
                            bodyStyle: 'padding: 10px;',
                            items: [{
                                xtype: 'fieldset',
                                title: 'Error type',
                                autoHeight: true,
                                defaults: {
                                    hideLabel: true
                                },
                                defaultType: 'checkbox',
                                items: [{
                                    scope: this,
                                    checked: (this.userConf.conf_error_skipnbliteraltag === "true") ? true : false,
                                    boxLabel: 'Skip nbLiteralTag error',
                                    name: 'conf_error_skipnbliteraltag',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_error_skipnbliteraltag', f.getValue());
                                        }
                                    }
                                }]
                            }, {
                                xtype: 'fieldset',
                                title: 'Editor',
                                autoHeight: true,
                                defaults: {
                                    hideLabel: true
                                },
                                defaultType: 'checkbox',
                                items: [{
                                    scope: this,
                                    checked: (this.userConf.conf_error_scrollbars === "true") ? true : false,
                                    boxLabel: 'Synchronize scroll bars',
                                    name: 'conf_error_scrollbars',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_error_scrollbars', f.getValue());
                                        }
                                    }
                                },{
                                    scope: this,
                                    checked: (this.userConf.conf_error_displaylog === "true") ? true : false,
                                    boxLabel: 'Automatically load the log when displaying the file',
                                    name: 'conf_error_displaylog',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_error_displaylog', f.getValue());
                                        }
                                    }
                                }]
                            }]
                        }, {
                            id: 'conf-card-4',
                            xtype: 'form',
                            bodyStyle: 'padding: 10px;',
                            items: [{
                                xtype: 'fieldset',
                                title: 'Editor',
                                autoHeight: true,
                                defaults: {
                                    hideLabel: true
                                },
                                defaultType: 'checkbox',
                                items: [{
                                    scope: this,
                                    checked: (this.userConf.conf_reviewed_scrollbars === "true") ? true : false,
                                    boxLabel: 'Synchronize scroll bars',
                                    name: 'conf_reviewed_scrollbars',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_reviewed_scrollbars', f.getValue());
                                        }
                                    }
                                },{
                                    scope: this,
                                    checked: (this.userConf.conf_reviewed_displaylog === "true") ? true : false,
                                    boxLabel: 'Automatically load the log when displaying the file',
                                    name: 'conf_reviewed_displaylog',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_reviewed_displaylog', f.getValue());
                                        }
                                    }
                                }]
                            }]
                        }, {
                            id: 'conf-card-5',
                            xtype: 'form',
                            bodyStyle: 'padding: 10px;',
                            items: [{
                                xtype: 'fieldset',
                                title: 'Editor',
                                autoHeight: true,
                                defaults: {
                                    hideLabel: true
                                },
                                defaultType: 'checkbox',
                                items: [{
                                    scope: this,
                                    checked: (this.userConf.conf_allfiles_displaylog === "true") ? true : false,
                                    boxLabel: 'Automatically load the log when displaying the file',
                                    name: 'conf_allfiles_displaylog',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_allfiles_displaylog', f.getValue());
                                        }
                                    }
                                }]
                            }]
                        }, {
                            id: 'conf-card-6',
                            xtype: 'form',
                            bodyStyle: 'padding: 10px;',
                            items: [{
                                xtype: 'fieldset',
                                title: 'Editor',
                                autoHeight: true,
                                defaults: {
                                    hideLabel: true
                                },
                                defaultType: 'checkbox',
                                items: [{
                                    scope: this,
                                    checked: (this.userConf.conf_patch_scrollbars === "true") ? true : false,
                                    boxLabel: 'Synchronize scroll bars',
                                    name: 'conf_patch_scrollbars',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_patch_scrollbars', f.getValue());
                                        }
                                    }
                                }, {
                                    scope: this,
                                    checked: (this.userConf.conf_patch_displaylog === "true") ? true : false,
                                    boxLabel: 'Automatically load the log when displaying the file',
                                    name: 'conf_patch_displaylog',
                                    listeners: {
                                        scope: this,
                                        check: function(f){
                                            this.confUpdate('conf_patch_displaylog', f.getValue());
                                        }
                                    }
                                }]
                            }]
                        }]
                    }],
                    buttons: [{
                        text: 'Close',
                        handler: function(){
                            winConf.hide();
                        }
                    }]
                });
            }
            winConf.show(Ext.get('winconf-btn'));
        }, //WinConf
        confUpdate: function(item, v){
        
            // Apply modification in DB
            Ext.Ajax.request({
                scope: this,
                url: './php/controller.php',
                params: {
                    task: 'conf-update',
                    item: item,
                    value: v
                },
                success: function(action){
                
                    // Update userConf object
                    if (item === "conf_needupdate_diff") {
                        this.userConf.conf_needupdate_diff = v;
                    }
                    if (item === "conf_needupdate_scrollbars") {
                        this.userConf.conf_needupdate_scrollbars = "" + v + "";
                    }
                    if (item === "conf_needupdate_displaylog") {
                        this.userConf.conf_needupdate_displaylog = "" + v + "";
                    }

                    if (item === "conf_error_skipnbliteraltag") {
                        this.userConf.conf_error_skipnbliteraltag = "" + v + "";
                        this.storeFilesError.reload();
                    }
                    if (item === "conf_error_scrollbars") {
                        this.userConf.conf_error_scrollbars = "" + v + "";
                    }
                    if (item === "conf_error_displaylog") {
                        this.userConf.conf_error_displaylog = "" + v + "";
                    }

                    if (item === "conf_reviewed_scrollbars") {
                        this.userConf.conf_reviewed_scrollbars = "" + v + "";
                    }
                    if (item === "conf_reviewed_displaylog") {
                        this.userConf.conf_reviewed_displaylog = "" + v + "";
                    }

                    if (item === "conf_allfiles_displaylog") {
                        this.userConf.conf_allfiles_displaylog = "" + v + "";
                    }

                    if (item === "conf_patch_scrollbars") {
                        this.userConf.conf_patch_scrollbars = "" + v + "";
                    }
                    if (item === "conf_patch_displaylog") {
                        this.userConf.conf_patch_displaylog = "" + v + "";
                    }
                    
                }
            });
            
        }, //confUpdate
        WinAbout: function(){
        
            var winAbout;
            
            if (!winAbout) {
                winAbout = new Ext.Window({
                    layout: 'fit',
                    width: 515,
                    height: 320,
                    iconCls: 'iconHelp',
                    modal: true,
                    title: 'About ' + this.appName,
                    closeAction: 'hide',
                    plain: true,
                    bodyStyle: 'color:#000',
                    items: new Ext.TabPanel({
                        autoTabs: true,
                        activeTab: 0,
                        border: false,
                        defaults: {
                            autoScroll: true
                        },
                        items: [{
                            title: 'About',
                            html: '<div id="phd-oe-about"><img src="themes/img/logo.png" alt="' + this.appName + '" /></div><div id="phd-oe-about-info">' + this.appName + ' ver ' + this.appVer + ' (c) 2008-2009, Yannick Torr&egrave;ss - <a href="mailto:yannick@php.net">yannick@php.net</a></div>'
                        }, {
                            title: 'Credits',
                            bodyStyle: 'padding:15px',
                            html: '<div id="phd-oe-credit"><ul>' +
                            '<li><a href="http://extjs.com" target="_blank">ExtJs Team</a><div class="phd-oe-credit-info">Javascript FrameWork</div></li>' +
                            '<li><a href="http://marijn.haverbeke.nl/codemirror/" target="_blank">CodeMirror</a><div class="phd-oe-credit-info">Code editor</div></li>' +
                            '<li><a href="http://famfamfam.com" target="_blank">famfamfam.com</a><div class="phd-oe-credit-info">Icon pack</div></li>' +
                            '</ul></div>'
                        }, {
                            title: 'License',
                            autoLoad: {
                                url: './LICENSE'
                            }
                        }]
                    }),
                    buttons: [{
                        text: 'Close',
                        handler: function(){
                            winAbout.hide();
                        }
                    }]
                });
            }
            winAbout.show(Ext.get('winabout-btn'));
        }, //WinAbout
        sendEmail: function(TranslatorName, TranslatorEmail){
        
            var form, win;
            
            form = new Ext.form.FormPanel({
                baseCls: 'x-plain',
                labelWidth: 55,
                url: 'save-form.php',
                defaultType: 'textfield',
                
                items: [{
                    fieldLabel: 'Send To',
                    name: 'to',
                    readOnly: true,
                    anchor: '100%',
                    value: '"' + TranslatorName + '" <' + TranslatorEmail + '>'
                }, {
                    fieldLabel: 'Subject',
                    name: 'subject',
                    anchor: '100%'
                }, {
                    xtype: 'textarea',
                    hideLabel: true,
                    name: 'msg',
                    anchor: '100% -53'
                }]
            });
            
            win = new Ext.Window({
                title: 'Send an email',
                width: 500,
                height: 300,
                minWidth: 300,
                minHeight: 200,
                layout: 'fit',
                plain: true,
                bodyStyle: 'padding:5px;',
                buttonAlign: 'center',
                items: form,
                iconCls: 'iconSendEmail',
                
                buttons: [{
                    text: 'Send',
                    handler: function(){
                    
                        var v = form.getForm().getValues();
                        
                        Ext.Ajax.request({
                            url: './php/controller.php',
                            params: {
                                task: 'send-email',
                                to: v.to,
                                subject: v.subject,
                                msg: v.msg
                            },
                            success: function(r){
                                var o = Ext.util.JSON.decode(r.responseText);
                                if (o.success) {
                                    win.close();
                                    Ext.MessageBox.alert('Status', 'Email sent to ' + TranslatorName + ' with success!');
                                }
                            },
                            failure: function(){
                            }
                        });
                        
                        
                        
                    }
                }, {
                    text: 'Cancel',
                    handler: function(){
                        win.close();
                    }
                }]
            });
            
            win.show();
            
        }, //sendEmail
        drawInterface: function(){
        
            var gridFilesError, gridFilesNeedUpdate, gridPendingPatch, gridPendingCommit, gridFilesNeedReviewed, gridSummary, gridTranslators, gridMailing, gridBugs, graphPanel, mainMenu, MainWindow, mainContent;
            
            // We keel alive our session by sending a ping every minute
            this.TaskPing = new Ext.util.DelayedTask(function(){
            
                Ext.Ajax.request({
                    url: './php/controller.php',
                    params: {
                        task: 'ping'
                    },
                    success: function(r){
                    
                        if (r.responseText !== 'pong') {
                            window.location.href = './';
                        }
                    },
                    failure: function(){
                        window.location.href = './';
                    }
                });
                
                this.TaskPing.delay(30000);
            }, this);
            
            this.TaskPing.delay(30000); // start after 1 minute.
            // Grid : Files in Error
            gridFilesError = new Ext.grid.GridPanel({
                store: this.storeFilesError,
                loadMask: true,
                columns: [{
                    id: 'name',
                    header: "Files",
                    sortable: true,
                    dataIndex: 'name'
                }, {
                    header: "Maintainer",
                    width: 45,
                    sortable: true,
                    dataIndex: 'maintainer'
                }, {
                    header: "Type",
                    width: 45,
                    sortable: true,
                    dataIndex: 'type'
                }, {
                    header: "Path",
                    dataIndex: 'path',
                    'hidden': true
                }],
                view: new Ext.grid.GroupingView({
                    emptyText: '<div style="text-align: center;">No files</div>',
                    forceFit: true,
                    groupTextTpl: '{[values.rs[0].data["path"]]} ({[values.rs.length]} {[values.rs.length > 1 ? "Files" : "File"]})',
                    getRowClass: function(record, numIndex, rowParams, store){
                        if (record.data.needcommit) {
                            return 'file-need-commit';
                        }
                    }
                }),
                autoExpandColumn: 'name',
                bodyBorder: false,
                listeners: {
                    scope: this,
                    'render': function(grid){
                        gridFilesError.view.refresh();
                    },
                    'rowdblclick': function(grid, rowIndex, e){
                    
                        var FilePath, FileName, FileID, needcommit, error, storeLogLang, storeLogEn, smLang, gridLogLang, smEn, gridLogEn;
                        
                        FilePath = this.storeFilesError.getAt(rowIndex).data.path;
                        FileName = this.storeFilesError.getAt(rowIndex).data.name;
                        FileID = Ext.util.md5('FE-' + this.userLang + FilePath + FileName);
                        needcommit = this.storeFilesError.getAt(rowIndex).data.needcommit;
                        
                        // Render only if this tab don't exist yet
                        if (!Ext.getCmp('main-panel').findById('FE-' + FileID)) {
                        
                            // Find all error for this file to pass to error_type.php page
                            error = [];
                            
                            this.storeFilesError.each(function(record){
                            
                                if (record.data.path === FilePath && record.data.name === FileName) {
                                    if (!error[record.data.type]) {
                                        error.push(record.data.type);
                                    }
                                }
                                
                            });
                            
                            // We define the store and the grid for log information
                            storeLogLang = new Ext.data.Store({
                                autoLoad: (this.userConf.conf_error_displaylog === "true") ? true : false,
                                proxy: new Ext.data.HttpProxy({
                                    url: './php/controller.php'
                                }),
                                baseParams: {
                                    task: 'get-log',
                                    Path: this.userLang + FilePath,
                                    File: FileName
                                },
                                reader: new Ext.data.JsonReader({
                                    root: 'Items',
                                    totalProperty: 'nbItems',
                                    id: 'id'
                                }, [{
                                    name: 'id',
                                    mapping: 'id'
                                }, {
                                    name: 'revision',
                                    mapping: 'revision'
                                }, {
                                    name: 'date',
                                    mapping: 'date',
                                    type: 'date',
                                    dateFormat: 'Y/m/d H:i:s'
                                }, {
                                    name: 'author',
                                    mapping: 'author'
                                }, {
                                    name: 'content',
                                    mapping: 'content'
                                }])
                            });
                            storeLogLang.setDefaultSort('date', 'desc');
                            
                            storeLogEn = new Ext.data.Store({
                                autoLoad: (this.userConf.conf_error_displaylog === "true") ? true : false,
                                proxy: new Ext.data.HttpProxy({
                                    url: './php/controller.php'
                                }),
                                baseParams: {
                                    task: 'get-log',
                                    Path: 'en' + FilePath,
                                    File: FileName
                                },
                                reader: new Ext.data.JsonReader({
                                    root: 'Items',
                                    totalProperty: 'nbItems',
                                    id: 'id'
                                }, [{
                                    name: 'id',
                                    mapping: 'id'
                                }, {
                                    name: 'revision',
                                    mapping: 'revision'
                                }, {
                                    name: 'date',
                                    mapping: 'date',
                                    type: 'date',
                                    dateFormat: 'Y/m/d H:i:s'
                                }, {
                                    name: 'author',
                                    mapping: 'author'
                                }, {
                                    name: 'content',
                                    mapping: 'content'
                                }])
                            });
                            storeLogEn.setDefaultSort('date', 'desc');
                            
                            smLang = new Ext.grid.CheckboxSelectionModel({
                                singleSelect: false,
                                width: 22,
                                header: '',
                                listeners: {
                                    beforerowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            return false;
                                        }
                                    },
                                    rowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FE-PANEL-btn-logLang-' + FileID).enable();
                                            Ext.get('FE-PANEL-btn-logLang-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FE-PANEL-btn-logLang-' + FileID).disable();
                                        }
                                    },
                                    rowdeselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FE-PANEL-btn-logLang-' + FileID).enable();
                                            Ext.get('FE-PANEL-btn-logLang-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FE-PANEL-btn-logLang-' + FileID).disable();
                                        }
                                    }
                                }
                            });
                            
                            gridLogLang = new Ext.grid.GridPanel({
                                store: storeLogLang,
                                loadMask: true,
                                columns: [smLang, {
                                    id: 'id',
                                    header: "Rev.",
                                    width: 40,
                                    sortable: false,
                                    dataIndex: 'revision'
                                }, {
                                    header: "Content",
                                    width: 130,
                                    sortable: true,
                                    dataIndex: 'content'
                                }, {
                                    header: "By",
                                    width: 50,
                                    sortable: true,
                                    dataIndex: 'author'
                                }, {
                                    header: "Date",
                                    width: 85,
                                    sortable: true,
                                    dataIndex: 'date',
                                    renderer: Ext.util.Format.dateRenderer('Y/m/d, H:i')
                                }],
                                autoHeight: true,
                                autoExpandColumn: 'content',
                                bodyBorder: false,
                                sm: smLang,
                                view: new Ext.grid.GridView({
                                    forceFit: true
                                }),
                                tbar: [{
                                    scope: this,
                                    tooltip: '<b>View</b> the diff',
                                    iconCls: 'iconViewDiff',
                                    id: 'FE-PANEL-btn-logLang-' + FileID,
                                    disabled: true,
                                    handler: function(){
                                    
                                        var s, rev1, rev2;
                                        
                                        // We get the 2 checked rev
                                        s = smLang.getSelections();
                                        rev1 = s[0].data.revision;
                                        rev2 = s[1].data.revision;
                                        
                                        this.winDiff(this.userLang + FilePath, FileName, rev1, rev2);
                                        
                                    }
                                },{
                                    scope: this,
                                    tooltip: '<b>Load/Refresh</b> revisions',
                                    iconCls: 'refresh',
                                    id: 'FE-PANEL-btn-refreshlogLang-' + FileID,
                                    handler: function(){
                                        storeLogLang.reload();
                                    }
                                }]
                            });
                            
                            smEn = new Ext.grid.CheckboxSelectionModel({
                                singleSelect: false,
                                width: 22,
                                header: '',
                                listeners: {
                                    beforerowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            return false;
                                        }
                                    },
                                    rowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FE-PANEL-btn-logEn-' + FileID).enable();
                                            Ext.get('FE-PANEL-btn-logEn-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FE-PANEL-btn-logEn-' + FileID).disable();
                                        }
                                    },
                                    rowdeselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FE-PANEL-btn-logEn-' + FileID).enable();
                                            Ext.get('FE-PANEL-btn-logEn-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FE-PANEL-btn-logEn-' + FileID).disable();
                                        }
                                    }
                                }
                            });
                            
                            gridLogEn = new Ext.grid.GridPanel({
                                store: storeLogEn,
                                loadMask: true,
                                columns: [smEn, {
                                    id: 'id',
                                    header: "Rev.",
                                    width: 40,
                                    sortable: false,
                                    dataIndex: 'revision'
                                }, {
                                    header: "Content",
                                    width: 130,
                                    sortable: true,
                                    dataIndex: 'content'
                                }, {
                                    header: "By",
                                    width: 50,
                                    sortable: true,
                                    dataIndex: 'author'
                                }, {
                                    header: "Date",
                                    width: 85,
                                    sortable: true,
                                    dataIndex: 'date',
                                    renderer: Ext.util.Format.dateRenderer('Y/m/d, H:i')
                                }],
                                autoHeight: true,
                                autoExpandColumn: 'content',
                                bodyBorder: false,
                                sm: smEn,
                                view: new Ext.grid.GridView({
                                    forceFit: true
                                }),
                                tbar: [{
                                    scope: this,
                                    tooltip: '<b>View</b> the diff',
                                    iconCls: 'iconViewDiff',
                                    id: 'FE-PANEL-btn-logEn-' + FileID,
                                    disabled: true,
                                    handler: function(){
                                    
                                        var s, rev1, rev2;
                                        
                                        // We get the 2 checked rev
                                        s = smEn.getSelections();
                                        rev1 = s[0].data.revision;
                                        rev2 = s[1].data.revision;
                                        
                                        this.winDiff('en' + FilePath, FileName, rev1, rev2);
                                        
                                    }
                                },{
                                    scope: this,
                                    tooltip: '<b>Load/Refresh</b> revisions',
                                    iconCls: 'refresh',
                                    id: 'FE-PANEL-btn-refreshlogEn-' + FileID,
                                    handler: function(){
                                        storeLogEn.reload();
                                    }
                                }]
                            });
                            
                            Ext.getCmp('main-panel').add({
                                closable: true,
                                title: FileName,
                                originTitle: FileName,
                                tabTip: 'File with error : in ' + FilePath,
                                iconCls: 'iconTabError',
                                id: 'FE-' + FileID,
                                isModifiedLang: false,
                                isModifiedEn: false,
                                layout: 'border',
                                defaults: {
                                    collapsible: true,
                                    split: true
                                },
                                items: [{
                                    xtype: 'panel',
                                    layout: 'fit',
                                    region: 'north',
                                    title: 'Error description',
                                    id: 'FE-error-desc-' + FileID,
                                    height: 150,
                                    collapsed: true,
                                    items: {
                                        xtype: 'iframepanel',
                                        id: 'FE-error-type-' + FileID,
                                        loadMask: true,
                                        defaultSrc: './error_type.php?dir=' + FilePath + '&file=' + FileName
                                    }
                                }, {
                                    region: 'west',
                                    xtype: 'panel',
                                    layout: 'fit',
                                    bodyBorder: false,
                                    title: 'CvsLog',
                                    collapsed: true,
                                    width: 375,
                                    items: {
                                        xtype: 'tabpanel',
                                        activeTab: 0,
                                        tabPosition: 'bottom',
                                        defaults: {
                                            autoScroll: true
                                        },
                                        items: [{
                                            layout: 'fit',
                                            title: this.userLang,
                                            items: [gridLogLang]
                                        }, {
                                            layout: 'fit',
                                            title: 'En',
                                            items: [gridLogEn]
                                        }]
                                    }
                                }, {
                                    title: this.userLang + ' File: ' + FilePath + FileName,
                                    originTitle: this.userLang + ' File: ' + FilePath + FileName,
                                    collapsible: false,
                                    id: 'FE-LANG-PANEL-' + FileID,
                                    region: 'center',
                                    xtype: 'form',
                                    height: 'auto',
                                    width: 'auto',
                                    items: [{
                                        xtype: 'codemirror',
                                        id: 'FE-LANG-' + FileID,
                                        listeners: {
                                            scope: this,
                                            initialize: function(obj){
                                                this.getFile(FileID, this.userLang + FilePath, FileName, 'FE-LANG-PANEL-', 'FE-LANG-');
                                            },
                                            cmcursormove: function(){
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FE-LANG-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FE-LANG-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FE-LANG-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                            },
                                            cmchange: function(keyCode, charCode, e){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FE-LANG-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FE-LANG-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FE-LANG-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                                
                                                // 38 = arrow up; 40 = arrow down; 37 = arrow left; 39 = arrow right; 34 = pageDown; 33 = pageUp; 27 = esc; 17 = CRTL; 16 = ALT
                                                // 67 = CTRL+C
                                                
                                                if (keyCode !== 27 && keyCode !== 33 && keyCode !== 34 && keyCode !== 37 && keyCode !== 38 && keyCode !== 39 && keyCode !== 40 && keyCode !== 17 && keyCode !== 16 && keyCode !== 67) {
                                                
                                                    if (!Ext.getCmp('FE-' + FileID).isModifiedLang) {
                                                        // Add an [modified] in title
                                                        Ext.getCmp('FE-LANG-PANEL-' + FileID).setTitle(Ext.getCmp('FE-LANG-PANEL-' + FileID).originTitle + ' <span style="color:#ff0000; font-weight: bold;">[modified]</span>');
                                                        Ext.getCmp('FE-' + FileID).setTitle(Ext.getCmp('FE-' + FileID).originTitle + ' <t style="color:#ff0000; font-weight: bold;">*</t>');
                                                        
                                                        // Activate save button
                                                        Ext.getCmp('FE-LANG-PANEL-btn-save-' + FileID).enable();
                                                        Ext.get('FE-LANG-PANEL-btn-save-' + FileID).frame("3F8538");
                                                        
                                                        Ext.getCmp('FE-LANG-PANEL-btn-saveas-' + FileID).enable();
                                                        Ext.get('FE-LANG-PANEL-btn-saveas-' + FileID).frame("3F8538");
                                                        
                                                        // Mark as modified
                                                        Ext.getCmp('FE-' + FileID).isModifiedLang = true;
                                                    }
                                                    
                                                }
                                            },
                                            cmscroll: function(scrollY){
                                                if (this.userConf.conf_error_scrollbars === "true") {
                                                    Ext.getCmp('FE-EN-' + FileID).scrollTo(scrollY);
                                                }
                                            }
                                        }
                                    }],
                                    bbar: [{
                                        scope: this,
                                        xtype: 'checkbox',
                                        hideLabel: true,
                                        checked: (this.userConf.conf_error_scrollbars === "true") ? true : false,
                                        boxLabel: 'Synchronize scroll bars',
                                        name: 'conf_error_scrollbars',
                                        listeners: {
                                            scope: this,
                                            check: function(c){
                                                this.confUpdate('conf_error_scrollbars', c.getValue());
                                            },
                                            render: function(c){
                                                Ext.DomHelper.insertHtml("beforeBegin", c.el.dom, "<div style=\"display: inline;\" class=\"x-statusbar\"><span class=\"x-status-text-panel\">Line: <span id=\"FE-LANG-status-line-" + FileID + "\">-</span></span>&nbsp;&nbsp;<span class=\"x-status-text-panel\">Col: <span id=\"FE-LANG-status-col-" + FileID + "\">-</span></span></div>&nbsp;&nbsp;");
                                            }
                                        }
                                    }],
                                    tbar: [{
                                        scope: this,
                                        tooltip: '<b>Save</b> this file',
                                        iconCls: 'saveFile',
                                        id: 'FE-LANG-PANEL-btn-save-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.saveLangFile(FileID, FilePath, FileName, 'FE', rowIndex, this);
                                        }
                                    }, {
                                        scope: this,
                                        tooltip: '<b>Save as</b> a patch',
                                        iconCls: 'saveAsFile',
                                        id: 'FE-LANG-PANEL-btn-saveas-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.savePatch(this.userLang, FileID, FilePath, FileName, 'FE', this);
                                        }
                                    }, '-', {
                                        tooltip: '<b>Re-indent</b> all this file',
                                        iconCls: 'iconIndent',
                                        handler: function(){
                                            Ext.getCmp('FE-LANG-' + FileID).reIndentAll();
                                        }
                                        
                                    }, this.menuMarkupLANG('FE-LANG-' + FileID)]
                                }, {
                                    title: 'En File: ' + FilePath + FileName,
                                    originTitle: 'En File: ' + FilePath + FileName,
                                    collapsible: false,
                                    id: 'FE-EN-PANEL-' + FileID,
                                    region: 'east',
                                    xtype: 'form',
                                    height: 'auto',
                                    width: 575,
                                    items: [{
                                        xtype: 'codemirror',
                                        id: 'FE-EN-' + FileID,
                                        listeners: {
                                            scope: this,
                                            initialize: function(obj){
                                            
                                                this.getFile(FileID, 'en' + FilePath, FileName, 'FE-EN-PANEL-', 'FE-EN-');
                                                
                                            },
                                            cmchange: function(keyCode, charCode, obj){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FE-EN-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FE-EN-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FE-EN-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                                
                                                // 38 = arrow up; 40 = arrow down; 37 = arrow left; 39 = arrow right; 34 = pageDown; 33 = pageUp; 27 = esc; 17 = CRTL; 16 = ALT
                                                // 67 = CTRL+C
                                                
                                                if (keyCode !== 27 && keyCode !== 33 && keyCode !== 34 && keyCode !== 37 && keyCode !== 38 && keyCode !== 39 && keyCode !== 40 && keyCode !== 17 && keyCode !== 16 && keyCode !== 67) {
                                                
                                                    if (!Ext.getCmp('FE-' + FileID).isModifiedEn) {
                                                        // Add an [modified] in title
                                                        Ext.getCmp('FE-EN-PANEL-' + FileID).setTitle(Ext.getCmp('FE-EN-PANEL-' + FileID).originTitle + ' <span style="color:#ff0000; font-weight: bold;">[modified]</span>');
                                                        Ext.getCmp('FE-' + FileID).setTitle(Ext.getCmp('FE-' + FileID).originTitle + ' <t style="color:#ff0000; font-weight: bold;">*</t>');
                                                        
                                                        // Activate save button
                                                        Ext.getCmp('FE-EN-PANEL-btn-save-' + FileID).enable();
                                                        Ext.get('FE-EN-PANEL-btn-save-' + FileID).frame("3F8538");
                                                        
                                                        Ext.getCmp('FE-EN-PANEL-btn-saveas-' + FileID).enable();
                                                        Ext.get('FE-EN-PANEL-btn-saveas-' + FileID).frame("3F8538");
                                                        
                                                        // Mark as modified
                                                        Ext.getCmp('FE-' + FileID).isModifiedEn = true;
                                                    }
                                                }
                                            },
                                            cmscroll: function(scrollY){
                                                if (this.userConf.conf_error_scrollbars === "true") {
                                                    Ext.getCmp('FE-LANG-' + FileID).scrollTo(scrollY);
                                                }
                                            },
                                            cmcursormove: function(a){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FE-EN-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FE-EN-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FE-EN-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                            }
                                        }
                                    }],
                                    bbar: [{
                                        scope: this,
                                        xtype: 'panel',
                                        height: 21,
                                        baseCls: '',
                                        bodyStyle: 'padding-top:5px;',
                                        html: "<div style=\"display: inline;\" class=\"x-statusbar\"><span class=\"x-status-text-panel\">Line: <span id=\"FE-EN-status-line-" + FileID + "\">-</span></span>&nbsp;&nbsp;<span class=\"x-status-text-panel\">Col: <span id=\"FE-EN-status-col-" + FileID + "\">-</span></span></div>&nbsp;&nbsp;"
                                    }],
                                    tbar: [{
                                        scope: this,
                                        tooltip: '<b>Save</b> this file',
                                        iconCls: 'saveFile',
                                        id: 'FE-EN-PANEL-btn-save-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.saveEnFile(FileID, FilePath, FileName, 'FE', rowIndex, this);
                                        }
                                        
                                    }, {
                                        scope: this,
                                        tooltip: '<b>Save as</b> a patch',
                                        iconCls: 'saveAsFile',
                                        id: 'FE-EN-PANEL-btn-saveas-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.savePatch('en', FileID, FilePath, FileName, 'FE', this);
                                        }
                                    }, '-', {
                                        tooltip: '<b>Re-indent</b> all this file',
                                        iconCls: 'iconIndent',
                                        handler: function(){
                                            Ext.getCmp('FE-EN-' + FileID).reIndentAll();
                                        }
                                    }, this.menuMarkupEN('FE-EN-' + FileID)]
                                }]
                            });
                            
                            Ext.getCmp('main-panel').setActiveTab('FE-' + FileID);
                            
                            // Set the bg image for north collapsed el
                            if (Ext.getCmp('FE-' + FileID).getLayout().north.collapsedEl) {
                                Ext.getCmp('FE-' + FileID).getLayout().north.collapsedEl.addClass('x-layout-collapsed-east-error-desc');
                            }
                            
                        }
                        else {
                            // This tab already exist. We focus it.
                            Ext.getCmp('main-panel').setActiveTab('FE-' + FileID);
                        }
                        
                    }, // end rowdblclick
                    'rowcontextmenu': function(grid, rowIndex, e){
                    
                        var FilePath, FileName, FileID, subMenuDiff = '', menu;
                        
                        grid.getSelectionModel().selectRow(rowIndex);
                        FilePath = this.storeFilesError.getAt(rowIndex).data.path;
                        FileName = this.storeFilesError.getAt(rowIndex).data.name;
                        FileID = Ext.util.md5('FE-' + FilePath + FileName);
                        
                        if (this.storeFilesError.getAt(rowIndex).data.needcommit) {
                        
                            subMenuDiff = {
                                text: 'View Diff',
                                iconCls: 'iconViewDiff',
                                scope: this,
                                handler: function(){
                                
                                    // Add tab for the diff
                                    Ext.getCmp('main-panel').add({
                                        xtype: 'panel',
                                        id: 'diff_panel_' + rowIndex,
                                        title: 'Diff',
                                        tabTip: 'Diff',
                                        closable: true,
                                        autoScroll: true,
                                        iconCls: 'iconTabLink',
                                        html: '<div id="diff_content_' + rowIndex + '" class="diff-content"></div>'
                                    });
                                    Ext.getCmp('main-panel').setActiveTab('diff_panel_' + rowIndex);
                                    
                                    Ext.get('diff_panel_' + rowIndex).mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Please, Wait...');
                                    
                                    // Load diff data
                                    Ext.Ajax.request({
                                        scope: this,
                                        url: './php/controller.php',
                                        params: {
                                            task: 'get-diff',
                                            FilePath: this.userLang + FilePath,
                                            FileName: FileName
                                        },
                                        success: function(action){
                                            var o = Ext.util.JSON.decode(action.responseText);
                                            if (o.success) {
                                                // We display in diff div
                                                Ext.get('diff_content_' + rowIndex).dom.innerHTML = o.content;
                                                Ext.get('diff_panel_' + rowIndex).unmask();
                                                
                                            }
                                            
                                        },
                                        failure: function(){
                                        
                                        }
                                    });
                                    
                                    
                                }
                            };
                        }
                        
                        menu = new Ext.menu.Menu({
                            items: [{
                                text: '<b>Edit in a new Tab</b>',
                                iconCls: 'FilesError',
                                scope: this,
                                handler: function(){
                                    gridFilesError.fireEvent('rowdblclick', grid, rowIndex, e);
                                }
                            }, subMenuDiff, '-', {
                                text: 'About error type',
                                iconCls: 'iconHelp',
                                scope: this,
                                handler: function(){
                                    Ext.getCmp('main-panel').add({
                                        closable: true,
                                        title: 'About error type',
                                        iconCls: 'iconHelp',
                                        id: 'FE-help-' + FileID,
                                        autoScroll: true,
                                        autoLoad: './error_type.php'
                                    });
                                    Ext.getCmp('main-panel').setActiveTab('FE-help-' + FileID);
                                }
                            }]
                        });
                        menu.showAt(e.getXY());
                    } // End rowcontextmenu
                }
            });
            
            // Grid : Files need update
            gridFilesNeedUpdate = new Ext.grid.GridPanel({
                store: this.storeFilesNeedUpdate,
                loadMask: true,
                columns: [{
                    id: 'name',
                    header: "Files",
                    sortable: true,
                    dataIndex: 'name'
                }, {
                    header: "EN revision",
                    width: 45,
                    sortable: true,
                    dataIndex: 'en_revision'
                }, {
                    header: Ext.util.Format.uppercase(this.userLang) + " revision",
                    width: 45,
                    sortable: true,
                    dataIndex: 'revision'
                }, {
                    header: "Maintainer",
                    width: 45,
                    sortable: true,
                    dataIndex: 'maintainer'
                }, {
                    header: "Path",
                    dataIndex: 'path',
                    'hidden': true
                }],
                view: new Ext.grid.GroupingView({
                    forceFit: true,
                    groupTextTpl: '{[values.rs[0].data["path"]]} ({[values.rs.length]} {[values.rs.length > 1 ? "Files" : "File"]})',
                    getRowClass: function(record, numIndex, rowParams, store){
                        if (record.data.needcommit) {
                            return 'file-need-commit';
                        }
                        if (record.data.isCritical) {
                            return 'file-critical';
                        }
                    },
                    emptyText: '<div style="text-align: center;">No Files</div>'
                }),
                autoExpandColumn: 'name',
                bodyBorder: false,
                listeners: {
                    scope: this,
                    'rowcontextmenu': function(grid, rowIndex, e){
                    
                        var FilePath, FileName, subMenuDiff = '', menu;
                        
                        FilePath = this.storeFilesNeedUpdate.getAt(rowIndex).data.path;
                        FileName = this.storeFilesNeedUpdate.getAt(rowIndex).data.name;
                        
                        grid.getSelectionModel().selectRow(rowIndex);
                        
                        if (this.storeFilesNeedUpdate.getAt(rowIndex).data.needcommit) {
                        
                            subMenuDiff = {
                                text: 'View Diff',
                                iconCls: 'iconViewDiff',
                                scope: this,
                                handler: function(){
                                
                                    // Add tab for the diff
                                    Ext.getCmp('main-panel').add({
                                        xtype: 'panel',
                                        id: 'diff_panel_' + rowIndex,
                                        title: 'Diff',
                                        tabTip: 'Diff',
                                        closable: true,
                                        autoScroll: true,
                                        iconCls: 'iconTabLink',
                                        html: '<div id="diff_content_' + rowIndex + '" class="diff-content"></div>'
                                    });
                                    Ext.getCmp('main-panel').setActiveTab('diff_panel_' + rowIndex);
                                    
                                    Ext.get('diff_panel_' + rowIndex).mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Please, Wait...');
                                    
                                    // Load diff data
                                    Ext.Ajax.request({
                                        url: './php/controller.php',
                                        params: {
                                            task: 'get-diff',
                                            FilePath: this.userLang + FilePath,
                                            FileName: FileName
                                        },
                                        success: function(action){
                                            var o = Ext.util.JSON.decode(action.responseText);
                                            if (o.success) {
                                                // We display in diff div
                                                Ext.get('diff_content_' + rowIndex).dom.innerHTML = o.content;
                                                Ext.get('diff_panel_' + rowIndex).unmask();
                                                
                                            }
                                            
                                        },
                                        failure: function(){
                                        
                                        }
                                    });
                                    
                                    
                                }
                            };
                        }
                        
                        menu = new Ext.menu.Menu({
                            items: [{
                                text: '<b>Edit in a new Tab</b>',
                                iconCls: 'iconTabNeedUpdate',
                                scope: this,
                                handler: function(){
                                    gridFilesNeedUpdate.fireEvent('rowdblclick', grid, rowIndex, e);
                                }
                            }, subMenuDiff]
                        });
                        
                        menu.showAt(e.getXY());
                        
                    }, // End rowcontextmenu
                    'rowdblclick': function(grid, rowIndex, e){
                    
                        var FilePath, FileName, en_revision, revision, needcommit, FileID, storeLogLang, storeLogEn, smLang, gridLogLang, smEn, gridLogEn, diffContent;
                        
                        FilePath = this.storeFilesNeedUpdate.getAt(rowIndex).data.path;
                        FileName = this.storeFilesNeedUpdate.getAt(rowIndex).data.name;
                        en_revision = this.storeFilesNeedUpdate.getAt(rowIndex).data.en_revision;
                        revision = this.storeFilesNeedUpdate.getAt(rowIndex).data.revision;
                        needcommit = this.storeFilesNeedUpdate.getAt(rowIndex).data.needcommit;
                        
                        FileID = Ext.util.md5('FNU-' + this.userLang + FilePath + FileName);
                        
                        // Render only if this tab don't exist yet
                        if (!Ext.getCmp('main-panel').findById('FNU-' + FileID)) {
                        
                            // We define the store and the grid for log information
                            storeLogLang = new Ext.data.Store({
                                autoLoad: (this.userConf.conf_needupdate_displaylog === "true") ? true : false,
                                proxy: new Ext.data.HttpProxy({
                                    url: './php/controller.php'
                                }),
                                baseParams: {
                                    task: 'get-log',
                                    Path: this.userLang + FilePath,
                                    File: FileName
                                },
                                reader: new Ext.data.JsonReader({
                                    root: 'Items',
                                    totalProperty: 'nbItems',
                                    id: 'id'
                                }, [{
                                    name: 'id',
                                    mapping: 'id'
                                }, {
                                    name: 'revision',
                                    mapping: 'revision'
                                }, {
                                    name: 'date',
                                    mapping: 'date',
                                    type: 'date',
                                    dateFormat: 'Y/m/d H:i:s'
                                }, {
                                    name: 'author',
                                    mapping: 'author'
                                }, {
                                    name: 'content',
                                    mapping: 'content'
                                }])
                            });
                            storeLogLang.setDefaultSort('date', 'desc');
                            
                            storeLogEn = new Ext.data.Store({
                                autoLoad: (this.userConf.conf_needupdate_displaylog === "true") ? true : false,
                                proxy: new Ext.data.HttpProxy({
                                    url: './php/controller.php'
                                }),
                                baseParams: {
                                    task: 'get-log',
                                    Path: 'en' + FilePath,
                                    File: FileName
                                },
                                reader: new Ext.data.JsonReader({
                                    root: 'Items',
                                    totalProperty: 'nbItems',
                                    id: 'id'
                                }, [{
                                    name: 'id',
                                    mapping: 'id'
                                }, {
                                    name: 'revision',
                                    mapping: 'revision'
                                }, {
                                    name: 'date',
                                    mapping: 'date',
                                    type: 'date',
                                    dateFormat: 'Y/m/d H:i:s'
                                }, {
                                    name: 'author',
                                    mapping: 'author'
                                }, {
                                    name: 'content',
                                    mapping: 'content'
                                }])
                            });
                            storeLogEn.setDefaultSort('date', 'desc');
                            
                            smLang = new Ext.grid.CheckboxSelectionModel({
                                singleSelect: false,
                                width: 22,
                                header: '',
                                listeners: {
                                    beforerowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            return false;
                                        }
                                    },
                                    rowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FNU-PANEL-btn-logLang-' + FileID).enable();
                                            Ext.get('FNU-PANEL-btn-logLang-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FNU-PANEL-btn-logLang-' + FileID).disable();
                                        }
                                    },
                                    rowdeselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FNU-PANEL-btn-logLang-' + FileID).enable();
                                            Ext.get('FNU-PANEL-btn-logLang-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FNU-PANEL-btn-logLang-' + FileID).disable();
                                        }
                                    }
                                }
                            });
                            
                            gridLogLang = new Ext.grid.GridPanel({
                                store: storeLogLang,
                                loadMask: true,
                                columns: [smLang, {
                                    id: 'id',
                                    header: "Rev.",
                                    width: 40,
                                    sortable: false,
                                    dataIndex: 'revision'
                                }, {
                                    header: "Content",
                                    width: 130,
                                    sortable: true,
                                    dataIndex: 'content'
                                }, {
                                    header: "By",
                                    width: 50,
                                    sortable: true,
                                    dataIndex: 'author'
                                }, {
                                    header: "Date",
                                    width: 85,
                                    sortable: true,
                                    dataIndex: 'date',
                                    renderer: Ext.util.Format.dateRenderer('Y/m/d, H:i')
                                }],
                                autoHeight: true,
                                autoExpandColumn: 'content',
                                bodyBorder: false,
                                sm: smLang,
                                view: new Ext.grid.GridView({
                                    forceFit: true
                                }),
                                tbar: [{
                                    scope: this,
                                    tooltip: '<b>View</b> the diff',
                                    iconCls: 'iconViewDiff',
                                    id: 'FNU-PANEL-btn-logLang-' + FileID,
                                    disabled: true,
                                    handler: function(){
                                    
                                        var s, rev1, rev2;
                                        
                                        // We get the 2 checked rev
                                        s = smLang.getSelections();
                                        rev1 = s[0].data.revision;
                                        rev2 = s[1].data.revision;
                                        
                                        this.winDiff(this.userLang + FilePath, FileName, rev1, rev2);
                                        
                                    }
                                },{
                                    scope: this,
                                    tooltip: '<b>Load/Refresh</b> revisions',
                                    iconCls: 'refresh',
                                    id: 'FNU-PANEL-btn-refreshlogLang-' + FileID,
                                    handler: function(){
                                        storeLogLang.reload();
                                    }
                                }]
                            });
                            
                            smEn = new Ext.grid.CheckboxSelectionModel({
                                singleSelect: false,
                                width: 22,
                                header: '',
                                listeners: {
                                    beforerowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            return false;
                                        }
                                    },
                                    rowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FNU-PANEL-btn-logEn-' + FileID).enable();
                                            Ext.get('FNU-PANEL-btn-logEn-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FNU-PANEL-btn-logEn-' + FileID).disable();
                                        }
                                    },
                                    rowdeselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FNU-PANEL-btn-logEn-' + FileID).enable();
                                            Ext.get('FNU-PANEL-btn-logEn-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FNU-PANEL-btn-logEn-' + FileID).disable();
                                        }
                                    }
                                }
                            });
                            
                            gridLogEn = new Ext.grid.GridPanel({
                                store: storeLogEn,
                                loadMask: true,
                                columns: [smEn, {
                                    id: 'id',
                                    header: "Rev.",
                                    width: 40,
                                    sortable: false,
                                    dataIndex: 'revision'
                                }, {
                                    header: "Content",
                                    width: 130,
                                    sortable: true,
                                    dataIndex: 'content'
                                }, {
                                    header: "By",
                                    width: 50,
                                    sortable: true,
                                    dataIndex: 'author'
                                }, {
                                    header: "Date",
                                    width: 85,
                                    sortable: true,
                                    dataIndex: 'date',
                                    renderer: Ext.util.Format.dateRenderer('Y/m/d, H:i')
                                }],
                                autoHeight: true,
                                autoExpandColumn: 'content',
                                bodyBorder: false,
                                sm: smEn,
                                view: new Ext.grid.GridView({
                                    forceFit: true
                                }),
                                tbar: [{
                                    scope: this,
                                    tooltip: '<b>View</b> the diff',
                                    iconCls: 'iconViewDiff',
                                    id: 'FNU-PANEL-btn-logEn-' + FileID,
                                    disabled: true,
                                    handler: function(){
                                    
                                        var s, rev1, rev2;
                                        
                                        // We get the 2 checked rev
                                        s = smEn.getSelections();
                                        rev1 = s[0].data.revision;
                                        rev2 = s[1].data.revision;
                                        
                                        this.winDiff('en' + FilePath, FileName, rev1, rev2);
                                        
                                    }
                                },{
                                    scope: this,
                                    tooltip: '<b>Load/Refresh</b> revisions',
                                    iconCls: 'refresh',
                                    id: 'FNU-PANEL-btn-refreshlogEn-' + FileID,
                                    handler: function(){
                                        storeLogEn.reload();
                                    }
                                }]
                            });
                            
                            if (this.userConf.conf_needupdate_diff === "using-viewvc") {
                            
                                diffContent = {
                                    xtype: 'panel',
                                    layout: 'fit',
                                    region: 'north',
                                    title: 'Diff From cvs',
                                    height: 150,
                                    collapsed: true,
                                    items: {
                                        xtype: 'iframepanel',
                                        id: 'FNU-diff-' + FileID,
                                        loadMask: true,
                                        defaultSrc: 'http://cvs.php.net/viewvc.cgi/phpdoc/en' + FilePath + FileName + '?r1=' + revision + '&r2=' + en_revision
                                    }
                                };
                                
                            }
                            else 
                                if (this.userConf.conf_needupdate_diff === "using-exec") {
                                
                                    diffContent = {
                                        xtype: 'panel',
                                        layout: 'fit',
                                        region: 'north',
                                        title: 'Diff From cvs',
                                        height: 150,
                                        autoScroll: true,
                                        collapsed: true,
                                        html: '<div id="FNU-diff-' + FileID + '" class="diff-content"></div>',
                                        listeners: {
                                            render: function(){
                                            
                                                // Load diff data
                                                Ext.Ajax.request({
                                                    url: './php/controller.php',
                                                    params: {
                                                        task: 'get-diff2',
                                                        FilePath: 'en' + FilePath,
                                                        FileName: FileName,
                                                        Rev2: revision,
                                                        Rev1: en_revision
                                                    },
                                                    success: function(action){
                                                        var o = Ext.util.JSON.decode(action.responseText);
                                                        if (o.success) {
                                                            // We display in diff div
                                                            Ext.get('FNU-diff-' + FileID).dom.innerHTML = o.content;
                                                        }
                                                        
                                                    },
                                                    failure: function(){
                                                    
                                                    }
                                                });
                                                
                                            }
                                        }
                                    };
                                    
                                }
                            
                            Ext.getCmp('main-panel').add({
                                closable: true,
                                title: FileName,
                                originTitle: FileName,
                                tabTip: 'Need Update : in ' + FilePath,
                                iconCls: 'iconTabNeedUpdate',
                                id: 'FNU-' + FileID,
                                isModifiedLang: false,
                                isModifiedEn: false,
                                layout: 'border',
                                defaults: {
                                    collapsible: true,
                                    split: true
                                },
                                items: [diffContent, {
                                    region: 'west',
                                    xtype: 'panel',
                                    layout: 'fit',
                                    bodyBorder: false,
                                    title: 'CvsLog',
                                    collapsed: true,
                                    width: 375,
                                    items: {
                                        xtype: 'tabpanel',
                                        activeTab: 0,
                                        tabPosition: 'bottom',
                                        defaults: {
                                            autoScroll: true
                                        },
                                        items: [{
                                            layout: 'fit',
                                            title: this.userLang,
                                            items: [gridLogLang]
                                        }, {
                                            layout: 'fit',
                                            title: 'En',
                                            items: [gridLogEn]
                                        }]
                                    }
                                }, {
                                    scope: this,
                                    title: this.userLang + ' File: ' + FilePath + FileName,
                                    originTitle: this.userLang + ' File: ' + FilePath + FileName,
                                    collapsible: false,
                                    id: 'FNU-LANG-PANEL-' + FileID,
                                    region: 'center',
                                    xtype: 'form',
                                    height: 'auto',
                                    width: 'auto',
                                    items: [{
                                        xtype: 'codemirror',
                                        id: 'FNU-LANG-' + FileID,
                                        listeners: {
                                            scope: this,
                                            initialize: function(){
                                            
                                                this.getFile(FileID, this.userLang + FilePath, FileName, 'FNU-LANG-PANEL-', 'FNU-LANG-');
                                            },
                                            
                                            cmcursormove: function(){
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FNU-LANG-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FNU-LANG-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FNU-LANG-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                            },
                                            
                                            cmchange: function(keyCode, charCode, obj){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FNU-LANG-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FNU-LANG-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FNU-LANG-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                                
                                                // 38 = arrow up; 40 = arrow down; 37 = arrow left; 39 = arrow right; 34 = pageDown; 33 = pageUp; 27 = esc; 17 = CRTL; 16 = ALT
                                                // 67 = CTRL+C
                                                
                                                if (keyCode !== 27 && keyCode !== 33 && keyCode !== 34 && keyCode !== 37 && keyCode !== 38 && keyCode !== 39 && keyCode !== 40 && keyCode !== 17 && keyCode !== 16 && keyCode !== 67) {
                                                
                                                    if (!Ext.getCmp('FNU-' + FileID).isModifiedLang) {
                                                        // Add an [modified] in title
                                                        Ext.getCmp('FNU-LANG-PANEL-' + FileID).setTitle(Ext.getCmp('FNU-LANG-PANEL-' + FileID).originTitle + ' <span style="color:#ff0000; font-weight: bold;">[modified]</span>');
                                                        Ext.getCmp('FNU-' + FileID).setTitle(Ext.getCmp('FNU-' + FileID).originTitle + ' <t style="color:#ff0000; font-weight: bold;">*</t>');
                                                        
                                                        // Activate save button
                                                        Ext.getCmp('FNU-LANG-PANEL-btn-save-' + FileID).enable();
                                                        Ext.get('FNU-LANG-PANEL-btn-save-' + FileID).frame("3F8538");
                                                        
                                                        Ext.getCmp('FNU-LANG-PANEL-btn-saveas-' + FileID).enable();
                                                        Ext.get('FNU-LANG-PANEL-btn-saveas-' + FileID).frame("3F8538");
                                                        
                                                        // Mark as modified
                                                        Ext.getCmp('FNU-' + FileID).isModifiedLang = true;
                                                    }
                                                }
                                            },
                                            cmscroll: function(scrollY){
                                                if (this.userConf.conf_needupdate_scrollbars === "true") {
                                                    Ext.getCmp('FNU-EN-' + FileID).scrollTo(scrollY);
                                                }
                                            }
                                        }
                                    }],
                                    bbar: [{
                                        scope: this,
                                        xtype: 'checkbox',
                                        hideLabel: true,
                                        checked: (this.userConf.conf_needupdate_scrollbars === "true") ? true : false,
                                        boxLabel: 'Synchronize scroll bars',
                                        name: 'conf_needupdate_scrollbars',
                                        listeners: {
                                            scope: this,
                                            check: function(c){
                                                this.confUpdate('conf_needupdate_scrollbars', c.getValue());
                                            },
                                            render: function(c){
                                                Ext.DomHelper.insertHtml("beforeBegin", c.el.dom, "<div style=\"display: inline;\" class=\"x-statusbar\"><span class=\"x-status-text-panel\">Line: <span id=\"FNU-LANG-status-line-" + FileID + "\">-</span></span>&nbsp;&nbsp;<span class=\"x-status-text-panel\">Col: <span id=\"FNU-LANG-status-col-" + FileID + "\">-</span></span></div>&nbsp;&nbsp;");
                                            }
                                        }
                                    }],
                                    tbar: [{
                                        scope: this,
                                        tooltip: '<b>Save</b> this file',
                                        iconCls: 'saveFile',
                                        id: 'FNU-LANG-PANEL-btn-save-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.saveLangFile(FileID, FilePath, FileName, 'FNU', rowIndex, this);
                                        }
                                    }, {
                                        scope: this,
                                        tooltip: '<b>Save as</b> a patch',
                                        iconCls: 'saveAsFile',
                                        id: 'FNU-LANG-PANEL-btn-saveas-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.savePatch(this.userLang, FileID, FilePath, FileName, 'FNU', this);
                                        }
                                    }, '-', {
                                        tooltip: '<b>Re-indent</b> all this file',
                                        iconCls: 'iconIndent',
                                        handler: function(){
                                            Ext.getCmp('FNU-LANG-' + FileID).reIndentAll();
                                        }
                                    }, this.menuMarkupLANG('FNU-LANG-' + FileID)]
                                }, {
                                    title: 'En File: ' + FilePath + FileName,
                                    originTitle: 'En File: ' + FilePath + FileName,
                                    collapsible: false,
                                    id: 'FNU-EN-PANEL-' + FileID,
                                    region: 'east',
                                    xtype: 'form',
                                    height: 'auto',
                                    width: 575,
                                    items: [{
                                        xtype: 'codemirror',
                                        id: 'FNU-EN-' + FileID,
                                        listeners: {
                                            scope: this,
                                            initialize: function(){
                                            
                                                this.getFile(FileID, 'en' + FilePath, FileName, 'FNU-EN-PANEL-', 'FNU-EN-');
                                            },
                                            cmchange: function(keyCode, charCode, obj){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FNU-EN-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FNU-EN-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FNU-EN-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                                
                                                // 38 = arrow up; 40 = arrow down; 37 = arrow left; 39 = arrow right; 34 = pageDown; 33 = pageUp; 27 = esc; 17 = CRTL; 16 = ALT
                                                // 67 = CTRL+C
                                                
                                                if (keyCode !== 27 && keyCode !== 33 && keyCode !== 34 && keyCode !== 37 && keyCode !== 38 && keyCode !== 39 && keyCode !== 40 && keyCode !== 17 && keyCode !== 16 && keyCode !== 67) {
                                                
                                                    if (!Ext.getCmp('FNU-' + FileID).isModifiedEn) {
                                                        // Add an [modified] in title
                                                        Ext.getCmp('FNU-EN-PANEL-' + FileID).setTitle(Ext.getCmp('FNU-EN-PANEL-' + FileID).originTitle + ' <span style="color:#ff0000; font-weight: bold;">[modified]</span>');
                                                        Ext.getCmp('FNU-' + FileID).setTitle(Ext.getCmp('FNU-' + FileID).originTitle + ' <t style="color:#ff0000; font-weight: bold;">*</t>');
                                                        
                                                        // Activate save button
                                                        Ext.getCmp('FNU-EN-PANEL-btn-save-' + FileID).enable();
                                                        Ext.get('FNU-EN-PANEL-btn-save-' + FileID).frame("3F8538");
                                                        
                                                        Ext.getCmp('FNU-EN-PANEL-btn-saveas-' + FileID).enable();
                                                        Ext.get('FNU-EN-PANEL-btn-saveas-' + FileID).frame("3F8538");
                                                        
                                                        // Mark as modified
                                                        Ext.getCmp('FNU-' + FileID).isModifiedEn = true;
                                                    }
                                                }
                                            },
                                            cmscroll: function(scrollY){
                                                if (this.userConf.conf_needupdate_scrollbars === "true") {
                                                    Ext.getCmp('FNU-LANG-' + FileID).scrollTo(scrollY);
                                                }
                                            },
                                            cmcursormove: function(a){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FNU-EN-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FNU-EN-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FNU-EN-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                            }
                                        }
                                    }],
                                    bbar: [{
                                        scope: this,
                                        xtype: 'panel',
                                        height: 21,
                                        baseCls: '',
                                        bodyStyle: 'padding-top:5px;',
                                        html: "<div style=\"display: inline;\" class=\"x-statusbar\"><span class=\"x-status-text-panel\">Line: <span id=\"FNU-EN-status-line-" + FileID + "\">-</span></span>&nbsp;&nbsp;<span class=\"x-status-text-panel\">Col: <span id=\"FNU-EN-status-col-" + FileID + "\">-</span></span></div>&nbsp;&nbsp;"
                                    }],
                                    tbar: [{
                                        scope: this,
                                        tooltip: '<b>Save</b> this file',
                                        iconCls: 'saveFile',
                                        id: 'FNU-EN-PANEL-btn-save-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.saveEnFile(FileID, FilePath, FileName, 'FNU', rowIndex, this);
                                        }
                                        
                                    }, {
                                        scope: this,
                                        tooltip: '<b>Save as</b> a patch',
                                        iconCls: 'saveAsFile',
                                        id: 'FNU-EN-PANEL-btn-saveas-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.savePatch('en', FileID, FilePath, FileName, 'FNU', this);
                                        }
                                        
                                    }, '-', {
                                        tooltip: '<b>Re-indent</b> all this file',
                                        iconCls: 'iconIndent',
                                        handler: function(){
                                            Ext.getCmp('FNU-EN-' + FileID).reIndentAll();
                                        }
                                    }, this.menuMarkupEN('FNU-EN-' + FileID)]
                                }]
                            });
                            
                            Ext.getCmp('main-panel').setActiveTab('FNU-' + FileID);
                            
                        }
                        else {
                            // This tab already exist. We focus it.
                            Ext.getCmp('main-panel').setActiveTab('FNU-' + FileID);
                        }
                        
                    }
                }
            });
            
            // Grid : Pending for Patch
            gridPendingPatch = new Ext.grid.GridPanel({
                store: this.storePendingPatch,
                loadMask: true,
                columns: [{
                    id: 'name',
                    header: "Files",
                    sortable: true,
                    dataIndex: 'name'
                }, {
                    header: "Posted by",
                    width: 45,
                    sortable: true,
                    dataIndex: 'by'
                }, {
                    header: "Date",
                    width: 45,
                    sortable: true,
                    dataIndex: 'date'
                }, {
                    header: "Path",
                    dataIndex: 'path',
                    'hidden': true
                }],
                
                view: new Ext.grid.GroupingView({
                    forceFit: true,
                    groupTextTpl: '{[values.rs[0].data["path"]]} ({[values.rs.length]} {[values.rs.length > 1 ? "Files" : "File"]})',
                    emptyText: '<div style="text-align: center;">No pending Patch</div>'
                }),
                autoExpandColumn: 'name',
                bodyBorder: false,
                listeners: {
                    scope: this,
                    'rowcontextmenu': function(grid, rowIndex, e){
                    
                        var FilePath, FileName, FileUniqID, FileID, menu;
                        
                        FilePath = this.storePendingPatch.getAt(rowIndex).data.path;
                        FileName = this.storePendingPatch.getAt(rowIndex).data.name;
                        FileUniqID = this.storePendingPatch.getAt(rowIndex).data.uniqID;
                        FileID = Ext.util.md5('PP-' + FileUniqID + FilePath + FileName);
                        
                        grid.getSelectionModel().selectRow(rowIndex);
                        
                        menu = new Ext.menu.Menu({
                            items: [{
                                text: '<b>Edit in a new Tab</b>',
                                iconCls: 'PendingPatch',
                                scope: this,
                                handler: function(){
                                    gridPendingPatch.fireEvent('rowdblclick', grid, rowIndex, e);
                                }
                            }, '-', {
                                text: 'Reject this patch',
                                iconCls: 'iconPageDelete',
                                scope: this,
                                handler: function(){
                                    this.rejectPatch(FileID, FilePath, FileName, FileUniqID, rowIndex, this);
                                }
                            }]
                        });
                        menu.showAt(e.getXY());
                        
                    },
                    'rowdblclick': function(grid, rowIndex, e){
                    
                        var FilePath, FileName, FileUniqID, FileID, storeLog, sm, gridLog;
                        
                        FilePath = this.storePendingPatch.getAt(rowIndex).data.path;
                        FileName = this.storePendingPatch.getAt(rowIndex).data.name;
                        FileUniqID = this.storePendingPatch.getAt(rowIndex).data.uniqID;
                        FileID = Ext.util.md5('PP-' + FileUniqID + FilePath + FileName);
                        
                        
                        // Render only if this tab don't exist yet
                        if (!Ext.getCmp('main-panel').findById('PP-' + FileID)) {
                        
                            // We define the store and the grid for log information
                            storeLog = new Ext.data.Store({
                                autoLoad: (this.userConf.conf_patch_displaylog === "true") ? true : false,
                                proxy: new Ext.data.HttpProxy({
                                    url: './php/controller.php'
                                }),
                                baseParams: {
                                    task: 'get-log',
                                    Path: FilePath,
                                    File: FileName
                                },
                                reader: new Ext.data.JsonReader({
                                    root: 'Items',
                                    totalProperty: 'nbItems',
                                    id: 'id'
                                }, [{
                                    name: 'id',
                                    mapping: 'id'
                                }, {
                                    name: 'revision',
                                    mapping: 'revision'
                                }, {
                                    name: 'date',
                                    mapping: 'date',
                                    type: 'date',
                                    dateFormat: 'Y/m/d H:i:s'
                                }, {
                                    name: 'author',
                                    mapping: 'author'
                                }, {
                                    name: 'content',
                                    mapping: 'content'
                                }])
                            });
                            storeLog.setDefaultSort('date', 'desc');
                            
                            sm = new Ext.grid.CheckboxSelectionModel({
                                singleSelect: false,
                                width: 22,
                                header: '',
                                listeners: {
                                    beforerowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            return false;
                                        }
                                    },
                                    rowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('PP-PANEL-btn-log-' + FileID).enable();
                                            Ext.get('PP-PANEL-btn-log-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('PP-PANEL-btn-log-' + FileID).disable();
                                        }
                                    },
                                    rowdeselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('PP-PANEL-btn-log-' + FileID).enable();
                                            Ext.get('PP-PANEL-btn-log-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('PP-PANEL-btn-log-' + FileID).disable();
                                        }
                                    }
                                }
                            });
                            
                            gridLog = new Ext.grid.GridPanel({
                                store: storeLog,
                                loadMask: true,
                                columns: [sm, {
                                    id: 'id',
                                    header: "Rev.",
                                    width: 40,
                                    sortable: false,
                                    dataIndex: 'revision'
                                }, {
                                    header: "Content",
                                    width: 130,
                                    sortable: true,
                                    dataIndex: 'content'
                                }, {
                                    header: "By",
                                    width: 50,
                                    sortable: true,
                                    dataIndex: 'author'
                                }, {
                                    header: "Date",
                                    width: 85,
                                    sortable: true,
                                    dataIndex: 'date',
                                    renderer: Ext.util.Format.dateRenderer('Y/m/d, H:i')
                                }],
                                autoHeight: true,
                                autoExpandColumn: 'content',
                                bodyBorder: false,
                                sm: sm,
                                view: new Ext.grid.GridView({
                                    forceFit: true
                                }),
                                tbar: [{
                                    scope: this,
                                    tooltip: '<b>View</b> the diff',
                                    iconCls: 'iconViewDiff',
                                    id: 'PP-PANEL-btn-log-' + FileID,
                                    disabled: true,
                                    handler: function(){
                                    
                                        var s, rev1, rev2;
                                        
                                        // We get the 2 checked rev
                                        s = sm.getSelections();
                                        rev1 = s[0].data.revision;
                                        rev2 = s[1].data.revision;
                                        
                                        this.winDiff(FilePath, FileName, rev1, rev2);
                                        
                                    }
                                },{
                                    scope: this,
                                    tooltip: '<b>Load/Refresh</b> revisions',
                                    iconCls: 'refresh',
                                    id: 'PP-PANEL-btn-refreshlog-' + FileID,
                                    handler: function(){
                                        storeLog.reload();
                                    }
                                }]
                            });
                            
                            Ext.getCmp('main-panel').add({
                                closable: true,
                                title: FileName,
                                originTitle: FileName,
                                tabTip: 'Patch for ' + FilePath + FileName,
                                iconCls: 'PendingPatch',
                                id: 'PP-' + FileID,
                                layout: 'border',
                                defaults: {
                                    collapsible: true,
                                    split: true
                                },
                                items: [{
                                    xtype: 'panel',
                                    layout: 'fit',
                                    region: 'north',
                                    title: 'Patch content',
                                    id: 'PP-patch-desc-' + FileID,
                                    height: 150,
                                    autoScroll: true,
                                    collapsed: true,
                                    html: '<div id="diff_content_' + FileID + '" class="diff-content"></div>',
                                    listeners: {
                                        render: function(){
                                            // Load diff data
                                            Ext.Ajax.request({
                                                scope: this,
                                                url: './php/controller.php',
                                                params: {
                                                    task: 'get-diff',
                                                    FilePath: FilePath,
                                                    FileName: FileName,
                                                    type: 'patch',
                                                    uniqID: FileUniqID
                                                },
                                                success: function(action){
                                                    var o = Ext.util.JSON.decode(action.responseText);
                                                    if (o.success) {
                                                        // We display in diff div
                                                        Ext.get('diff_content_' + FileID).dom.innerHTML = o.content;
                                                    }
                                                },
                                                failure: function(){
                                                
                                                }
                                            });
                                        }
                                    }
                                }, {
                                    region: 'west',
                                    xtype: 'panel',
                                    layout: 'fit',
                                    bodyBorder: false,
                                    title: 'CvsLog',
                                    collapsed: true,
                                    width: 375,
                                    items: {
                                        xtype: 'tabpanel',
                                        activeTab: 0,
                                        tabPosition: 'bottom',
                                        defaults: {
                                            autoScroll: true
                                        },
                                        items: [{
                                            layout: 'fit',
                                            title: 'Log',
                                            items: [gridLog]
                                        }]
                                    }
                                }, {
                                    title: 'Proposed Patch for ' + FilePath + FileName,
                                    originTitle: 'Proposed Patch for ' + FilePath + FileName,
                                    collapsible: false,
                                    id: 'PP-PATCH-PANEL-' + FileID,
                                    region: 'center',
                                    xtype: 'form',
                                    height: 'auto',
                                    width: 'auto',
                                    items: [{
                                        xtype: 'codemirror',
                                        id: 'PP-PATCH-' + FileID,
                                        isModified: false,
                                        listeners: {
                                            scope: this,
                                            initialize: function(obj){
                                                this.getFile(FileID, FilePath, FileName + '.' + FileUniqID + '.patch', 'PP-PATCH-PANEL-', 'PP-PATCH-');
                                            },
                                            cmcursormove: function(){
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('PP-PATCH-' + FileID).getCursorPosition());
                                                
                                                Ext.get('PP-PATCH-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('PP-PATCH-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                            },
                                            cmchange: function(keyCode, charCode, e){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('PP-PATCH-' + FileID).getCursorPosition());
                                                
                                                Ext.get('PP-PATCH-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('PP-PATCH-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                                
                                                // 38 = arrow up; 40 = arrow down; 37 = arrow left; 39 = arrow right; 34 = pageDown; 33 = pageUp; 27 = esc; 17 = CRTL; 16 = ALT
                                                // 67 = CTRL+C
                                                
                                                if (keyCode !== 27 && keyCode !== 33 && keyCode !== 34 && keyCode !== 37 && keyCode !== 38 && keyCode !== 39 && keyCode !== 40 && keyCode !== 17 && keyCode !== 16 && keyCode !== 67) {
                                                
                                                    if (!Ext.getCmp('PP-PATCH-' + FileID).isModified) {
                                                        // Add an [modified] in title
                                                        Ext.getCmp('PP-PATCH-PANEL-' + FileID).setTitle(Ext.getCmp('PP-PATCH-PANEL-' + FileID).originTitle + ' <span style="color:#ff0000; font-weight: bold;">[modified]</span>');
                                                        Ext.getCmp('PP-' + FileID).setTitle(Ext.getCmp('PP-' + FileID).originTitle + ' <t style="color:#ff0000; font-weight: bold;">*</t>');
                                                        
                                                        // Mark as modified
                                                        Ext.getCmp('PP-PATCH-' + FileID).isModified = true;
                                                    }
                                                    
                                                }
                                            },
                                            cmscroll: function(scrollY){
                                                if (this.userConf.conf_patch_scrollbars === "true") {
                                                    Ext.getCmp('PP-ORIGIN-' + FileID).scrollTo(scrollY);
                                                }
                                            }
                                        }
                                    }],
                                    bbar: [{
                                        scope: this,
                                        xtype: 'checkbox',
                                        hideLabel: true,
                                        checked: (this.userConf.conf_patch_scrollbars === "true") ? true : false,
                                        boxLabel: 'Synchronize scroll bars',
                                        name: 'conf_patch_scrollbars',
                                        listeners: {
                                            scope: this,
                                            check: function(c){
                                                this.confUpdate('conf_patch_scrollbars', c.getValue());
                                            },
                                            render: function(c){
                                                Ext.DomHelper.insertHtml("beforeBegin", c.el.dom, "<div style=\"display: inline;\" class=\"x-statusbar\"><span class=\"x-status-text-panel\">Line: <span id=\"PP-PATCH-status-line-" + FileID + "\">-</span></span>&nbsp;&nbsp;<span class=\"x-status-text-panel\">Col: <span id=\"PP-PATCH-status-col-" + FileID + "\">-</span></span></div>&nbsp;&nbsp;");
                                            }
                                        }
                                    }],
                                    tbar: [{
                                        scope: this,
                                        tooltip: '<b>Accept</b> this patch and <b>Save</b> the file',
                                        iconCls: 'saveFile',
                                        id: 'PP-PATCH-PANEL-btn-save-' + FileID,
                                        handler: function(){
                                            this.saveFileViaPatch(FileID, FilePath, FileName, FileUniqID, rowIndex, this);
                                        }
                                    }, {
                                        scope: this,
                                        tooltip: '<b>Reject</b> this patch',
                                        iconCls: 'iconPageDelete',
                                        id: 'PP-PATCH-PANEL-btn-reject-' + FileID,
                                        handler: function(){
                                            this.rejectPatch(FileID, FilePath, FileName, FileUniqID, rowIndex, this);
                                        }
                                    }, '-', {
                                        tooltip: '<b>Re-indent</b> all this file',
                                        iconCls: 'iconIndent',
                                        handler: function(){
                                            Ext.getCmp('PP-PATCH-' + FileID).reIndentAll();
                                        }
                                        
                                    }]
                                }, {
                                    title: 'Original File: ' + FilePath + FileName,
                                    originTitle: 'Original File: ' + FilePath + FileName,
                                    collapsible: false,
                                    id: 'PP-ORIGIN-PANEL-' + FileID,
                                    region: 'east',
                                    xtype: 'form',
                                    height: 'auto',
                                    width: 575,
                                    items: [{
                                        xtype: 'codemirror',
                                        id: 'PP-ORIGIN-' + FileID,
                                        readOnly: true,
                                        listeners: {
                                            scope: this,
                                            initialize: function(obj){
                                            
                                                this.getFile(FileID, FilePath, FileName, 'PP-ORIGIN-PANEL-', 'PP-ORIGIN-');
                                                
                                            },
                                            cmscroll: function(scrollY){
                                                if (this.userConf.conf_patch_scrollbars === "true") {
                                                    Ext.getCmp('PP-PATCH-' + FileID).scrollTo(scrollY);
                                                }
                                            },
                                            cmcursormove: function(a){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('PP-ORIGIN-' + FileID).getCursorPosition());
                                                
                                                Ext.get('PP-ORIGIN-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('PP-ORIGIN-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                            }
                                        }
                                    }],
                                    bbar: [{
                                        scope: this,
                                        xtype: 'panel',
                                        height: 21,
                                        baseCls: '',
                                        bodyStyle: 'padding-top:5px;',
                                        html: "<div style=\"display: inline;\" class=\"x-statusbar\"><span class=\"x-status-text-panel\">Line: <span id=\"PP-ORIGIN-status-line-" + FileID + "\">-</span></span>&nbsp;&nbsp;<span class=\"x-status-text-panel\">Col: <span id=\"PP-ORIGIN-status-col-" + FileID + "\">-</span></span></div>&nbsp;&nbsp;"
                                    }],
                                    tbar: [{}]
                                }]
                            });
                            
                            Ext.getCmp('main-panel').setActiveTab('PP-' + FileID);
                            
                            // Set the bg image for north collapsed el
                            if (Ext.getCmp('PP-' + FileID).getLayout().north.collapsedEl) {
                                Ext.getCmp('PP-' + FileID).getLayout().north.collapsedEl.addClass('x-layout-collapsed-east-patch-desc');
                            }
                            
                            
                        } // Render only if tab don't exist yet
                        else {
                            Ext.getCmp('main-panel').setActiveTab('PP-' + FileID);
                        }
                    }
                } // listeners
            });
            
            // Grid : Pending for commit
            gridPendingCommit = new Ext.grid.GridPanel({
                store: this.storePendingCommit,
                loadMask: true,
                columns: [{
                    id: 'name',
                    header: "Files",
                    sortable: true,
                    dataIndex: 'name'
                }, {
                    header: "Modified by",
                    width: 45,
                    sortable: true,
                    dataIndex: 'by'
                }, {
                    header: "Date",
                    width: 45,
                    sortable: true,
                    dataIndex: 'date'
                }, {
                    header: "Path",
                    dataIndex: 'path',
                    'hidden': true
                }],
                
                view: new Ext.grid.GroupingView({
                    forceFit: true,
                    groupTextTpl: '{[values.rs[0].data["path"]]} ({[values.rs.length]} {[values.rs.length > 1 ? "Files" : "File"]})',
                    emptyText: '<div style="text-align: center;">No pending for Commit</div>'
                }),
                autoExpandColumn: 'name',
                bodyBorder: false,
                listeners: {
                    scope: this,
                    'rowcontextmenu': function(grid, rowIndex, e){
                    
                        var FilePath, FileName, menu;
                        
                        FilePath = this.storePendingCommit.getAt(rowIndex).data.path;
                        FileName = this.storePendingCommit.getAt(rowIndex).data.name;
                        
                        grid.getSelectionModel().selectRow(rowIndex);
                        
                        menu = new Ext.menu.Menu({
                            items: [{
                                text: '<b>Edit in a new Tab</b>',
                                iconCls: 'PendingCommit',
                                scope: this,
                                handler: function(){
                                    gridPendingCommit.fireEvent('rowdblclick', grid, rowIndex, e);
                                }
                            }, '-', {
                                text: 'View Diff',
                                iconCls: 'iconViewDiff',
                                scope: this,
                                handler: function(){
                                
                                    // Add tab for the diff
                                    Ext.getCmp('main-panel').add({
                                        xtype: 'panel',
                                        id: 'diff_panel_' + rowIndex,
                                        title: 'Diff',
                                        tabTip: 'Diff',
                                        closable: true,
                                        autoScroll: true,
                                        iconCls: 'iconTabLink',
                                        html: '<div id="diff_content_' + rowIndex + '" class="diff-content"></div>'
                                    });
                                    Ext.getCmp('main-panel').setActiveTab('diff_panel_' + rowIndex);
                                    
                                    Ext.get('diff_panel_' + rowIndex).mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Please, Wait...');
                                    
                                    // Load diff data
                                    Ext.Ajax.request({
                                        url: './php/controller.php',
                                        params: {
                                            task: 'get-diff',
                                            FilePath: FilePath,
                                            FileName: FileName
                                        },
                                        success: function(action){
                                            var o = Ext.util.JSON.decode(action.responseText);
                                            if (o.success) {
                                                // We display in diff div
                                                Ext.get('diff_content_' + rowIndex).dom.innerHTML = o.content;
                                                Ext.get('diff_panel_' + rowIndex).unmask();
                                                
                                            }
                                            
                                        },
                                        failure: function(){
                                        
                                        }
                                    });
                                    
                                    
                                }
                            }, {
                                text: 'Download the diff as a patch',
                                iconCls: 'iconCommitFileCvs',
                                scope: this,
                                handler: function(){
                                    window.location.href = './php/controller.php?task=downloadPatch&FilePath=' + FilePath + '&FileName=' + FileName;
                                }
                            }, '-', {
                                text: 'Clear this change',
                                iconCls: 'iconPageDelete',
                                disabled: (this.userLogin === 'cvsread') ? true : false,
                                scope: this,
                                handler: function(){
                                
                                    if (this.userLogin === 'cvsread') {
                                        this.winForbidden();
                                        return;
                                    }
                                    
                                    function goClearChange(btn){
                                        if (btn === 'yes') {
                                        
                                            // Before clear local change, we close the file if there is open
                                            if (Ext.getCmp('main-panel').findById('FNU-' + Ext.util.md5('FNU-' + FilePath + FileName))) {
                                                Ext.getCmp('main-panel').remove('FNU-' + Ext.util.md5('FNU-' + FilePath + FileName));
                                            }
                                            
                                            // 
                                            Ext.Ajax.request({
                                                scope: this,
                                                url: './php/controller.php',
                                                params: {
                                                    task: 'clear-local-change',
                                                    FilePath: FilePath,
                                                    FileName: FileName
                                                },
                                                success: function(action){
                                                    var o = Ext.util.JSON.decode(action.responseText);
                                                    if (o.success) {
                                                    
                                                        if (this.userLang === 'en') {
                                                            // We reload all store
                                                            this.storeFilesNeedUpdate.reload();
                                                            this.storeFilesError.reload();
                                                            this.storeFilesNeedReviewed.reload();
                                                        }
                                                        
                                                        // We delete from this store
                                                        this.storePendingCommit.remove(this.storePendingCommit.getAt(rowIndex));
                                                        
                                                        // We fire event add to update the file count
                                                        this.storePendingCommit.fireEvent('add', this.storePendingCommit);
                                                        
                                                    }
                                                    else {
                                                        this.winForbidden();
                                                    }
                                                    
                                                },
                                                failure: function(){
                                                
                                                }
                                            });
                                        }
                                    }
                                    
                                    Ext.MessageBox.confirm('Confirm', 'This action will clear your local modification and take back this file from his original stats.<br/>You need confirm.', goClearChange, this);
                                }
                            }, '-', {
                                text: 'Commit...',
                                iconCls: 'iconCommitFileCvs',
                                scope: this,
                                handler: function(){
                                    return false;
                                },
                                disabled: (this.userLogin === 'cvsread') ? true : false,
                                menu: new Ext.menu.Menu({
                                    items: [{
                                        text: '...this file',
                                        iconCls: 'iconCommitFileCvs',
                                        scope: this,
                                        handler: function(){
                                            this.WinCommit(true, rowIndex);
                                        }
                                    }, {
                                        text: '...all files modified by me',
                                        iconCls: 'iconCommitFileCvs',
                                        scope: this,
                                        handler: function(){
                                            this.WinCommit(false, '', 'by me');
                                        }
                                    }, {
                                        text: '...all files modified',
                                        iconCls: 'iconCommitFileCvs',
                                        scope: this,
                                        handler: function(){
                                            this.WinCommit(false);
                                        }
                                    }]
                                })
                            }]
                        });
                        menu.showAt(e.getXY());
                    },
                    'rowdblclick': function(grid, rowIndex, e){
                    
                        var FilePath, FileName;
                        
                        FilePath = this.storePendingCommit.getAt(rowIndex).data.path;
                        FileName = this.storePendingCommit.getAt(rowIndex).data.name;
                        
                        this.openFile(FilePath, FileName);
                        
                    } //rowdblclick
                } //listeners
            });
            
            // Grid : Files need update
            gridFilesNeedReviewed = new Ext.grid.GridPanel({
                store: this.storeFilesNeedReviewed,
                loadMask: true,
                columns: [{
                    id: 'name',
                    header: "Files",
                    sortable: true,
                    dataIndex: 'name'
                }, {
                    header: "Reviewed",
                    width: 45,
                    sortable: true,
                    dataIndex: 'reviewed'
                }, {
                    header: "Maintainer",
                    width: 45,
                    sortable: true,
                    dataIndex: 'maintainer'
                }, {
                    header: "Path",
                    dataIndex: 'path',
                    'hidden': true
                }],
                
                view: new Ext.grid.GroupingView({
                    forceFit: true,
                    groupTextTpl: '{[values.rs[0].data["path"]]} ({[values.rs.length]} {[values.rs.length > 1 ? "Files" : "File"]})',
                    getRowClass: function(record, numIndex, rowParams, store){
                        if (record.data.needcommit) {
                            return 'file-need-commit';
                        }
                    },
                    emptyText: '<div style="text-align: center;">No files</div>'
                }),
                autoExpandColumn: 'name',
                bodyBorder: false,
                listeners: {
                    scope: this,
                    'rowcontextmenu': function(grid, rowIndex, e){
                    
                        var FilePath, FileName, FileID, subMenuDiff = '', subMenuGroup = '', group, menu;
                        
                        grid.getSelectionModel().selectRow(rowIndex);
                        
                        FilePath = this.storeFilesNeedReviewed.getAt(rowIndex).data.path;
                        FileName = this.storeFilesNeedReviewed.getAt(rowIndex).data.name;
                        FileID = Ext.util.md5('FNR-' + this.userLang + FilePath + FileName);
                        
                        if (this.storeFilesNeedReviewed.getAt(rowIndex).data.needcommit) {
                        
                            subMenuDiff = {
                                text: 'View Diff',
                                iconCls: 'iconViewDiff',
                                scope: this,
                                handler: function(){
                                
                                    // Add tab for the diff
                                    Ext.getCmp('main-panel').add({
                                        xtype: 'panel',
                                        id: 'diff_panel_' + rowIndex,
                                        title: 'Diff',
                                        tabTip: 'Diff',
                                        closable: true,
                                        autoScroll: true,
                                        iconCls: 'iconTabLink',
                                        html: '<div id="diff_content_' + rowIndex + '" class="diff-content"></div>'
                                    });
                                    Ext.getCmp('main-panel').setActiveTab('diff_panel_' + rowIndex);
                                    
                                    Ext.get('diff_panel_' + rowIndex).mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Please, Wait...');
                                    
                                    // Load diff data
                                    Ext.Ajax.request({
                                        scope: this,
                                        url: './php/controller.php',
                                        params: {
                                            task: 'get-diff',
                                            FilePath: this.userLang + FilePath,
                                            FileName: FileName
                                        },
                                        success: function(action){
                                            var o = Ext.util.JSON.decode(action.responseText);
                                            if (o.success) {
                                                // We display in diff div
                                                Ext.get('diff_content_' + rowIndex).dom.innerHTML = o.content;
                                                Ext.get('diff_panel_' + rowIndex).unmask();
                                                
                                            }
                                            
                                        },
                                        failure: function(){
                                        
                                        }
                                    });
                                }
                            };
                        }
                        
                        // Is this item is part of a group of function ?
                        group = FilePath.split('/');
                        
                        if (group[1] === 'reference') {
                        
                            subMenuGroup = {
                                text: 'Open all files about ' + group[2] + ' extension',
                                iconCls: 'iconViewDiff',
                                scope: this,
                                handler: function(){
                                
                                    Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Open all files about ' + group[2] + ' extension. Please, wait...');
                                    
                                    Ext.Ajax.request({
                                        scope: this,
                                        url: './php/controller.php',
                                        params: {
                                            task: 'all-files-about-extension',
                                            ExtName: group[2]
                                        },
                                        success: function(action, form){
                                        
                                            var o, i;
                                            
                                            o = Ext.util.JSON.decode(action.responseText);
                                            
                                            this.filePendingOpen = [];
                                            
                                            for (i = 0; i < o.files.length; i = i + 1) {
                                                this.filePendingOpen[i] = [this.userLang + o.files[i].path, o.files[i].name];
                                            }
                                            
                                            // Start the first
                                            this.openFile(this.filePendingOpen[0][0], this.filePendingOpen[0][1]);
                                            
                                            Ext.getBody().unmask();
                                            
                                        }
                                    });
                                    
                                } // handler
                            };
                            
                        }
                        
                        menu = new Ext.menu.Menu({
                            scope: this,
                            items: [{
                                text: '<b>Edit in a new Tab</b>',
                                iconCls: 'FilesNeedReviewed',
                                scope: this,
                                handler: function(){
                                    gridFilesNeedReviewed.fireEvent('rowdblclick', grid, rowIndex, e);
                                }
                            }, subMenuDiff, '-', subMenuGroup]
                        });
                        
                        menu.showAt(e.getXY());
                        
                    }, // End event rowcontextmenu
                    'rowdblclick': function(grid, rowIndex, e){
                    
                        var FilePath, FileName, reviewed, needcommit, FileID, storeLogLang, storeLogEn, smLang, gridLogLang, smEn, gridLogEn;
                        
                        FilePath = this.storeFilesNeedReviewed.getAt(rowIndex).data.path;
                        FileName = this.storeFilesNeedReviewed.getAt(rowIndex).data.name;
                        reviewed = this.storeFilesNeedReviewed.getAt(rowIndex).data.reviewed;
                        needcommit = this.storeFilesNeedReviewed.getAt(rowIndex).data.needcommit;
                        
                        FileID = Ext.util.md5('FNR-' + this.userLang + FilePath + FileName);
                        
                        // Render only if this tab don't exist yet
                        if (!Ext.getCmp('main-panel').findById('FNR-' + FileID)) {
                        
                            // We define the store and the grid for log information
                            storeLogLang = new Ext.data.Store({
                                autoLoad: (this.userConf.conf_reviewed_displaylog === "true") ? true : false,
                                proxy: new Ext.data.HttpProxy({
                                    url: './php/controller.php'
                                }),
                                baseParams: {
                                    task: 'get-log',
                                    Path: this.userLang + FilePath,
                                    File: FileName
                                },
                                reader: new Ext.data.JsonReader({
                                    root: 'Items',
                                    totalProperty: 'nbItems',
                                    id: 'id'
                                }, [{
                                    name: 'id',
                                    mapping: 'id'
                                }, {
                                    name: 'revision',
                                    mapping: 'revision'
                                }, {
                                    name: 'date',
                                    mapping: 'date',
                                    type: 'date',
                                    dateFormat: 'Y/m/d H:i:s'
                                }, {
                                    name: 'author',
                                    mapping: 'author'
                                }, {
                                    name: 'content',
                                    mapping: 'content'
                                }])
                            });
                            storeLogLang.setDefaultSort('date', 'desc');
                            
                            storeLogEn = new Ext.data.Store({
                                autoLoad: (this.userConf.conf_reviewed_displaylog === "true") ? true : false,
                                proxy: new Ext.data.HttpProxy({
                                    url: './php/controller.php'
                                }),
                                baseParams: {
                                    task: 'get-log',
                                    Path: 'en' + FilePath,
                                    File: FileName
                                },
                                reader: new Ext.data.JsonReader({
                                    root: 'Items',
                                    totalProperty: 'nbItems',
                                    id: 'id'
                                }, [{
                                    name: 'id',
                                    mapping: 'id'
                                }, {
                                    name: 'revision',
                                    mapping: 'revision'
                                }, {
                                    name: 'date',
                                    mapping: 'date',
                                    type: 'date',
                                    dateFormat: 'Y/m/d H:i:s'
                                }, {
                                    name: 'author',
                                    mapping: 'author'
                                }, {
                                    name: 'content',
                                    mapping: 'content'
                                }])
                            });
                            storeLogEn.setDefaultSort('date', 'desc');
                            
                            smLang = new Ext.grid.CheckboxSelectionModel({
                                singleSelect: false,
                                width: 22,
                                header: '',
                                listeners: {
                                    beforerowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            return false;
                                        }
                                    },
                                    rowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FNR-PANEL-btn-logLang-' + FileID).enable();
                                            Ext.get('FNR-PANEL-btn-logLang-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FNR-PANEL-btn-logLang-' + FileID).disable();
                                        }
                                    },
                                    rowdeselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FNR-PANEL-btn-logLang-' + FileID).enable();
                                            Ext.get('FNR-PANEL-btn-logLang-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FNR-PANEL-btn-logLang-' + FileID).disable();
                                        }
                                    }
                                }
                            });
                            
                            gridLogLang = new Ext.grid.GridPanel({
                                store: storeLogLang,
                                loadMask: true,
                                columns: [smLang, {
                                    id: 'id',
                                    header: "Rev.",
                                    width: 40,
                                    sortable: false,
                                    dataIndex: 'revision'
                                }, {
                                    header: "Content",
                                    width: 130,
                                    sortable: true,
                                    dataIndex: 'content'
                                }, {
                                    header: "By",
                                    width: 50,
                                    sortable: true,
                                    dataIndex: 'author'
                                }, {
                                    header: "Date",
                                    width: 85,
                                    sortable: true,
                                    dataIndex: 'date',
                                    renderer: Ext.util.Format.dateRenderer('Y/m/d, H:i')
                                }],
                                autoHeight: true,
                                autoExpandColumn: 'content',
                                bodyBorder: false,
                                sm: smLang,
                                view: new Ext.grid.GridView({
                                    forceFit: true
                                }),
                                tbar: [{
                                    scope: this,
                                    tooltip: '<b>View</b> the diff',
                                    iconCls: 'iconViewDiff',
                                    id: 'FNR-PANEL-btn-logLang-' + FileID,
                                    disabled: true,
                                    handler: function(){
                                    
                                        var s, rev1, rev2;
                                        
                                        // We get the 2 checked rev
                                        s = smLang.getSelections();
                                        rev1 = s[0].data.revision;
                                        rev2 = s[1].data.revision;
                                        
                                        this.winDiff(this.userLang + FilePath, FileName, rev1, rev2);
                                        
                                    }
                                },{
                                    scope: this,
                                    tooltip: '<b>Load/Refresh</b> revisions',
                                    iconCls: 'refresh',
                                    id: 'FNR-PANEL-btn-refreshlogLang-' + FileID,
                                    handler: function(){
                                        storeLogLang.reload();
                                    }
                                }]
                            });
                            
                            smEn = new Ext.grid.CheckboxSelectionModel({
                                singleSelect: false,
                                width: 22,
                                header: '',
                                listeners: {
                                    beforerowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            return false;
                                        }
                                    },
                                    rowselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FNR-PANEL-btn-logEn-' + FileID).enable();
                                            Ext.get('FNR-PANEL-btn-logEn-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FNR-PANEL-btn-logEn-' + FileID).disable();
                                        }
                                    },
                                    rowdeselect: function(sm){
                                        var nbRowsSelected = sm.getCount();
                                        if (nbRowsSelected === 2) {
                                            Ext.getCmp('FNR-PANEL-btn-logEn-' + FileID).enable();
                                            Ext.get('FNR-PANEL-btn-logEn-' + FileID).frame("3F8538");
                                        }
                                        else {
                                            Ext.getCmp('FNR-PANEL-btn-logEn-' + FileID).disable();
                                        }
                                    }
                                }
                            });
                            
                            gridLogEn = new Ext.grid.GridPanel({
                                store: storeLogEn,
                                loadMask: true,
                                columns: [smEn, {
                                    id: 'id',
                                    header: "Rev.",
                                    width: 40,
                                    sortable: false,
                                    dataIndex: 'revision'
                                }, {
                                    header: "Content",
                                    width: 130,
                                    sortable: true,
                                    dataIndex: 'content'
                                }, {
                                    header: "By",
                                    width: 50,
                                    sortable: true,
                                    dataIndex: 'author'
                                }, {
                                    header: "Date",
                                    width: 85,
                                    sortable: true,
                                    dataIndex: 'date',
                                    renderer: Ext.util.Format.dateRenderer('Y/m/d, H:i')
                                }],
                                autoHeight: true,
                                autoExpandColumn: 'content',
                                bodyBorder: false,
                                sm: smEn,
                                view: new Ext.grid.GridView({
                                    forceFit: true
                                }),
                                tbar: [{
                                    scope: this,
                                    tooltip: '<b>View</b> the diff',
                                    iconCls: 'iconViewDiff',
                                    id: 'FNR-PANEL-btn-logEn-' + FileID,
                                    disabled: true,
                                    handler: function(){
                                    
                                        var s, rev1, rev2;
                                        
                                        // We get the 2 checked rev
                                        s = smEn.getSelections();
                                        rev1 = s[0].data.revision;
                                        rev2 = s[1].data.revision;
                                        
                                        this.winDiff('en' + FilePath, FileName, rev1, rev2);
                                        
                                    }
                                },{
                                    scope: this,
                                    tooltip: '<b>Load/Refresh</b> revisions',
                                    iconCls: 'refresh',
                                    id: 'FNR-PANEL-btn-refreshlogEn-' + FileID,
                                    handler: function(){
                                        storeLogEn.reload();
                                    }
                                }]
                            });
                            
                            
                            Ext.getCmp('main-panel').add({
                                closable: true,
                                title: FileName,
                                originTitle: FileName,
                                tabTip: 'Need Reviewed : in ' + FilePath,
                                iconCls: 'iconTabNeedReviewed',
                                id: 'FNR-' + FileID,
                                isModifiedLang: false,
                                isModifiedEn: false,
                                layout: 'border',
                                defaults: {
                                    collapsible: true,
                                    split: true
                                },
                                items: [{
                                    region: 'west',
                                    xtype: 'panel',
                                    layout: 'fit',
                                    bodyBorder: false,
                                    title: 'CvsLog',
                                    collapsed: true,
                                    width: 375,
                                    items: {
                                        xtype: 'tabpanel',
                                        activeTab: 0,
                                        tabPosition: 'bottom',
                                        defaults: {
                                            autoScroll: true
                                        },
                                        items: [{
                                            layout: 'fit',
                                            title: this.userLang,
                                            items: [gridLogLang]
                                        }, {
                                            layout: 'fit',
                                            title: 'En',
                                            items: [gridLogEn]
                                        }]
                                    }
                                }, {
                                    title: this.userLang + ' File: ' + FilePath + FileName,
                                    originTitle: this.userLang + ' File: ' + FilePath + FileName,
                                    collapsible: false,
                                    id: 'FNR-LANG-PANEL-' + FileID,
                                    region: 'center',
                                    xtype: 'form',
                                    height: 'auto',
                                    width: 'auto',
                                    items: [{
                                        xtype: 'codemirror',
                                        id: 'FNR-LANG-' + FileID,
                                        listeners: {
                                            scope: this,
                                            initialize: function(){
                                                this.getFile(FileID, this.userLang + FilePath, FileName, 'FNR-LANG-PANEL-', 'FNR-LANG-');
                                            },
                                            
                                            cmcursormove: function(a){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FNR-LANG-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FNR-LANG-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FNR-LANG-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                            },
                                            
                                            cmchange: function(keyCode, charCode, obj){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FNR-LANG-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FNR-LANG-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FNR-LANG-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                                
                                                // 38 = arrow up; 40 = arrow down; 37 = arrow left; 39 = arrow right; 34 = pageDown; 33 = pageUp; 27 = esc; 17 = CRTL; 16 = ALT
                                                // 67 = CTRL+C
                                                
                                                if (keyCode !== 27 && keyCode !== 33 && keyCode !== 34 && keyCode !== 37 && keyCode !== 38 && keyCode !== 39 && keyCode !== 40 && keyCode !== 17 && keyCode !== 16 && keyCode !== 67) {
                                                
                                                    if (!Ext.getCmp('FNR-' + FileID).isModifiedLang) {
                                                        // Add an [modified] in title
                                                        Ext.getCmp('FNR-LANG-PANEL-' + FileID).setTitle(Ext.getCmp('FNR-LANG-PANEL-' + FileID).originTitle + ' <span style="color:#ff0000; font-weight: bold;">[modified]</span>');
                                                        Ext.getCmp('FNR-' + FileID).setTitle(Ext.getCmp('FNR-' + FileID).originTitle + ' <t style="color:#ff0000; font-weight: bold;">*</t>');
                                                        
                                                        // Activate save button
                                                        Ext.getCmp('FNR-LANG-PANEL-btn-save-' + FileID).enable();
                                                        Ext.get('FNR-LANG-PANEL-btn-save-' + FileID).frame("3F8538");
                                                        
                                                        Ext.getCmp('FNR-LANG-PANEL-btn-saveas-' + FileID).enable();
                                                        Ext.get('FNR-LANG-PANEL-btn-saveas-' + FileID).frame("3F8538");
                                                        
                                                        // Mark as modified
                                                        Ext.getCmp('FNR-' + FileID).isModifiedLang = true;
                                                    }
                                                }
                                            },
                                            cmscroll: function(scrollY){
                                                if (this.userConf.conf_reviewed_scrollbars === "true") {
                                                    Ext.getCmp('FNR-EN-' + FileID).scrollTo(scrollY);
                                                }
                                            }
                                        }
                                    }],
                                    bbar: [{
                                        scope: this,
                                        xtype: 'checkbox',
                                        hideLabel: true,
                                        checked: (this.userConf.conf_reviewed_scrollbars === "true") ? true : false,
                                        boxLabel: 'Synchronize scroll bars',
                                        name: 'conf_reviewed_scrollbars',
                                        listeners: {
                                            scope: this,
                                            check: function(c){
                                                this.confUpdate('conf_reviewed_scrollbars', c.getValue());
                                            },
                                            render: function(c){
                                                Ext.DomHelper.insertHtml("beforeBegin", c.el.dom, "<div style=\"display: inline;\" class=\"x-statusbar\"><span class=\"x-status-text-panel\">Line: <span id=\"FNR-LANG-status-line-" + FileID + "\">-</span></span>&nbsp;&nbsp;<span class=\"x-status-text-panel\">Col: <span id=\"FNR-LANG-status-col-" + FileID + "\">-</span></span></div>&nbsp;&nbsp;");
                                            }
                                        }
                                    }],
                                    tbar: [{
                                        scope: this,
                                        tooltip: '<b>Save</b> this file',
                                        iconCls: 'saveFile',
                                        id: 'FNR-LANG-PANEL-btn-save-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.saveLangFile(FileID, FilePath, FileName, 'FNR', rowIndex, this);
                                        } // Save handle
                                    }, {
                                        scope: this,
                                        tooltip: '<b>Save as</b> a patch',
                                        iconCls: 'saveAsFile',
                                        id: 'FNR-LANG-PANEL-btn-saveas-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.savePatch(this.userLang, FileID, FilePath, FileName, 'FNR', this);
                                        }
                                    }, '-', {
                                        tooltip: '<b>Re-indent</b> all this file',
                                        iconCls: 'iconIndent',
                                        handler: function(){
                                            Ext.getCmp('FNR-LANG-' + FileID).reIndentAll();
                                        }
                                        
                                    }, this.menuMarkupLANG('FNR-LANG-' + FileID)]
                                }, {
                                
                                    title: 'En File: ' + FilePath + FileName,
                                    originTitle: 'En File: ' + FilePath + FileName,
                                    collapsible: false,
                                    id: 'FNR-EN-PANEL-' + FileID,
                                    region: 'east',
                                    xtype: 'form',
                                    height: 'auto',
                                    width: 575,
                                    items: [{
                                        xtype: 'codemirror',
                                        id: 'FNR-EN-' + FileID,
                                        listeners: {
                                            scope: this,
                                            initialize: function(){
                                            
                                                this.getFile(FileID, 'en' + FilePath, FileName, 'FNR-EN-PANEL-', 'FNR-EN-');
                                            },
                                            cmchange: function(keyCode, charCode, obj){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FNR-EN-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FNR-EN-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FNR-EN-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                                
                                                // 38 = arrow up; 40 = arrow down; 37 = arrow left; 39 = arrow right; 34 = pageDown; 33 = pageUp; 27 = esc; 17 = CRTL; 16 = ALT
                                                // 67 = CTRL+C
                                                
                                                if (keyCode !== 27 && keyCode !== 33 && keyCode !== 34 && keyCode !== 37 && keyCode !== 38 && keyCode !== 39 && keyCode !== 40 && keyCode !== 17 && keyCode !== 16 && keyCode !== 67) {
                                                
                                                    if (!Ext.getCmp('FNR-' + FileID).isModifiedEn) {
                                                        // Add an [modified] in title
                                                        Ext.getCmp('FNR-EN-PANEL-' + FileID).setTitle(Ext.getCmp('FNR-EN-PANEL-' + FileID).originTitle + ' <span style="color:#ff0000; font-weight: bold;">[modified]</span>');
                                                        Ext.getCmp('FNR-' + FileID).setTitle(Ext.getCmp('FNR-' + FileID).originTitle + ' <t style="color:#ff0000; font-weight: bold;">*</t>');
                                                        
                                                        // Activate save button
                                                        Ext.getCmp('FNR-EN-PANEL-btn-save-' + FileID).enable();
                                                        Ext.get('FNR-EN-PANEL-btn-save-' + FileID).frame("3F8538");
                                                        
                                                        Ext.getCmp('FNR-EN-PANEL-btn-saveas-' + FileID).enable();
                                                        Ext.get('FNR-EN-PANEL-btn-saveas-' + FileID).frame("3F8538");
                                                        
                                                        // Mark as modified
                                                        Ext.getCmp('FNR-' + FileID).isModifiedEn = true;
                                                    }
                                                }
                                            },
                                            cmscroll: function(scrollY){
                                                if (this.userConf.conf_reviewed_scrollbars === "true") {
                                                    Ext.getCmp('FNR-LANG-' + FileID).scrollTo(scrollY);
                                                }
                                            },
                                            cmcursormove: function(a){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('FNR-EN-' + FileID).getCursorPosition());
                                                
                                                Ext.get('FNR-EN-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('FNR-EN-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                            }
                                        }
                                    }],
                                    bbar: [{
                                        scope: this,
                                        xtype: 'panel',
                                        height: 21,
                                        baseCls: '',
                                        bodyStyle: 'padding-top:5px;',
                                        html: "<div style=\"display: inline;\" class=\"x-statusbar\"><span class=\"x-status-text-panel\">Line: <span id=\"FNR-EN-status-line-" + FileID + "\">-</span></span>&nbsp;&nbsp;<span class=\"x-status-text-panel\">Col: <span id=\"FNR-EN-status-col-" + FileID + "\">-</span></span></div>&nbsp;&nbsp;"
                                    }],
                                    tbar: [{
                                        scope: this,
                                        tooltip: '<b>Save</b> this file',
                                        iconCls: 'saveFile',
                                        id: 'FNR-EN-PANEL-btn-save-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.saveEnFile(FileID, FilePath, FileName, 'FNR', rowIndex, this);
                                        }
                                        
                                    }, {
                                        scope: this,
                                        tooltip: '<b>Save as</b> a patch',
                                        iconCls: 'saveAsFile',
                                        id: 'FNR-EN-PANEL-btn-saveas-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.savePatch('en', FileID, FilePath, FileName, 'FNR', this);
                                        }
                                        
                                    }, '-', {
                                        tooltip: '<b>Re-indent</b> all this file',
                                        iconCls: 'iconIndent',
                                        handler: function(){
                                            Ext.getCmp('FNR-EN-' + FileID).reIndentAll();
                                        }
                                    }, this.menuMarkupEN('FNR-EN-' + FileID)]
                                }]
                            });
                            
                            Ext.getCmp('main-panel').setActiveTab('FNR-' + FileID);
                            
                        } // End tab don't exist
                        else {
                            // This tab already exist. We focus it.
                            Ext.getCmp('main-panel').setActiveTab('FNR-' + FileID);
                        }
                    } // End listeners rowdblclick
                }
            });
            
            gridSummary = new Ext.grid.GridPanel({
                title: 'Summary',
                iconCls: 'flag-' + this.userLang,
                store: this.storeSummary,
                loadMask: true,
                columns: [new Ext.grid.RowNumberer(), {
                    id: 'StatusType',
                    header: "File status type",
                    width: 180,
                    sortable: true,
                    dataIndex: 'libel'
                }, {
                    header: "Number of files",
                    width: 110,
                    sortable: true,
                    dataIndex: 'nbFiles'
                }, {
                    header: "Percent of files",
                    width: 110,
                    sortable: true,
                    dataIndex: 'percentFiles'
                }, {
                    header: "Size of files (kB)",
                    width: 110,
                    sortable: true,
                    dataIndex: 'sizeFiles'
                }, {
                    header: "Percent of size",
                    width: 110,
                    sortable: true,
                    dataIndex: 'percentSize'
                }],
                autoScroll: true,
                height: 400,
                width: 800,
                view: new Ext.grid.GridView({
                    getRowClass: function(record, numIndex, rowParams, store){
                        if (record.data.id === 1) {
                            return 'summary_1';
                        }
                        if (record.data.id === 2) {
                            return 'summary_2';
                        }
                        if (record.data.id === 3) {
                            return 'summary_3';
                        }
                        if (record.data.id === 4) {
                            return 'summary_4';
                        }
                        if (record.data.id === 5) {
                            return 'summary_5';
                        }
                    }
                }),
                listeners: {
                    scope: this,
                    render: function(grid){
                        grid.store.load.defer(20, grid.store);
                    }
                    
                }
            });
            
            gridTranslators = new Ext.grid.GridPanel({
                title: 'Translators',
                iconCls: 'iconTranslator',
                store: this.storeTranslators,
                loadMask: true,
                columns: [new Ext.grid.RowNumberer(), {
                    id: 'GridTransName',
                    header: "Name",
                    sortable: true,
                    dataIndex: 'name',
                    summaryType: 'count',
                    summaryRenderer: this.rendererTotalTranslator
                }, {
                    header: "Email",
                    width: 110,
                    sortable: true,
                    dataIndex: 'email'
                }, {
                    header: "Nick",
                    width: 70,
                    sortable: true,
                    dataIndex: 'nick'
                }, {
                    header: "Cvs",
                    width: 45,
                    sortable: true,
                    dataIndex: 'cvs'
                }, {
                    header: "UptoDate",
                    width: 60,
                    sortable: true,
                    renderer: this.rendererNumUptodate,
                    dataIndex: 'uptodate',
                    summaryType: 'sum'
                }, {
                    header: "Old",
                    width: 45,
                    sortable: true,
                    renderer: this.rendererSum,
                    dataIndex: 'old',
                    summaryType: 'sum'
                }, {
                    header: "Critical",
                    width: 60,
                    sortable: true,
                    renderer: this.rendererNumCritical,
                    dataIndex: 'critical',
                    summaryType: 'sum'
                }, {
                    header: "Sum",
                    width: 50,
                    sortable: true,
                    renderer: this.rendererSum,
                    dataIndex: 'sum',
                    summaryType: 'sum'
                }],
                plugins: [new Ext.ux.grid.GridSummary()],
                autoScroll: true,
                autoExpandColumn: 'GridTransName',
                height: 400,
                width: 800,
                listeners: {
                    scope: this,
                    render: function(){
                        this.storeTranslators.load.defer(20, this.storeTranslators);
                    },
                    rowdblclick: function(grid, rowIndex, e){
                    
                        var TranslatorEmail, TranslatorName;
                        
                        grid.getSelectionModel().selectRow(rowIndex);
                        
                        TranslatorEmail = this.storeTranslators.getAt(rowIndex).data.email;
                        TranslatorName = this.storeTranslators.getAt(rowIndex).data.name;
                        
                        this.sendEmail(TranslatorName, TranslatorEmail);
                    },
                    rowcontextmenu: function(grid, rowIndex, e){
                    
                        var TranslatorEmail, TranslatorName, menu;
                        
                        grid.getSelectionModel().selectRow(rowIndex);
                        
                        TranslatorEmail = this.storeTranslators.getAt(rowIndex).data.email;
                        TranslatorName = this.storeTranslators.getAt(rowIndex).data.name;
                        
                        menu = new Ext.menu.Menu({
                            id: 'submenu',
                            items: [{
                                scope: this,
                                text: '<b>Send an email to ' + TranslatorName + '</b>',
                                iconCls: 'iconSendEmail',
                                handler: function(){
                                    this.sendEmail(TranslatorName, TranslatorEmail);
                                }
                            }, '-', {
                                scope: this,
                                text: 'Send an email to the doc-' + this.userLang + '@lists.php.net',
                                iconCls: 'iconSendEmail',
                                handler: function(){
                                    this.sendEmail('Php Doc Team ' + this.userLang, 'doc-' + this.userLang + '@lists.php.net');
                                }
                            }]
                        });
                        
                        menu.showAt(e.getXY());
                    }
                }
            });
            
            gridMailing = new Ext.grid.GridPanel({
                store: this.storeMailing,
                title: 'Mails from doc-' + this.userLang,
                iconCls: 'home-mailing-title',
                loadMask: true,
                columns: [new Ext.grid.RowNumberer(), {
                    id: 'GridMailingTitle',
                    header: "Title",
                    sortable: true,
                    dataIndex: 'title'
                }, {
                    header: "By",
                    width: 110,
                    sortable: true,
                    dataIndex: 'description'
                }, {
                    header: "Date",
                    width: 140,
                    sortable: true,
                    dataIndex: 'pubDate',
                    renderer: Ext.util.Format.dateRenderer('Y/m/d, H:i')
                }],
                autoScroll: true,
                height: 400,
                width: 800,
                autoExpandColumn: 'GridMailingTitle',
                sm: new Ext.grid.RowSelectionModel({
                    singleSelect: true
                }),
                tbar: [{
                    scope: this,
                    tooltip: 'Refresh this grid',
                    iconCls: 'refresh',
                    handler: function(){
                        this.storeMailing.reload();
                    }
                }],
                listeners: {
                    scope: this,
                    render: function(){
                        this.storeMailing.load.defer(20, this.storeMailing);
                    },
                    rowcontextmenu: function(grid, rowIndex, e){
                    
                        var menu;
                        
                        grid.getSelectionModel().selectRow(rowIndex);
                        
                        menu = new Ext.menu.Menu({
                            id: 'submenu',
                            items: [{
                                text: '<b>Open in a new Tab</b>',
                                iconCls: 'openInTab',
                                scope: this,
                                handler: function(){
                                    gridMailing.fireEvent('rowdblclick', grid, rowIndex, e);
                                }
                            }, '-', {
                                text: 'Refresh this grid',
                                iconCls: 'refresh',
                                scope: this,
                                handler: function(){
                                    this.storeMailing.reload();
                                }
                            }]
                        });
                        
                        menu.showAt(e.getXY());
                        
                    },
                    rowdblclick: function(grid, rowIndex, e){
                    
                        var MailId, MailUrl, MailTitle;
                        
                        MailId = this.storeMailing.getAt(rowIndex).data.pubDate;
                        MailUrl = this.storeMailing.getAt(rowIndex).data.link;
                        MailTitle = this.storeMailing.getAt(rowIndex).data.title;
                        
                        this.NewTabMailing(MailId, MailUrl, MailTitle);
                    }
                }
            });
            
            gridBugs = new Ext.grid.GridPanel({
                store: this.storeBugs,
                title: 'Open bugs for doc-' + this.userLang,
                iconCls: 'iconBugs',
                loadMask: true,
                columns: [{
                    id: 'GridBugTitle',
                    header: "Title",
                    sortable: true,
                    dataIndex: 'title'
                }],
                stripeRows: true,
                autoHeight: true,
                viewConfig: {
                    emptyText: 'No open Bugs',
                    forceFit: true,
                    enableRowBody: true,
                    getRowClass: function(record, rowIndex, p, store){
                        p.body = '<p class="bug-desc">' + record.data.description + '</p>';
                        return 'x-grid3-row-expanded';
                    }
                },
                autoExpandColumn: 'GridBugTitle',
                sm: new Ext.grid.RowSelectionModel({
                    singleSelect: true
                }),
                width: 800,
                tbar: [{
                    scope: this,
                    tooltip: 'Refresh this grid',
                    iconCls: 'refresh',
                    handler: function(){
                        this.storeBugs.reload();
                    }
                }],
                listeners: {
                    scope: this,
                    render: function(){
                        this.storeBugs.load.defer(20, this.storeBugs);
                    },
                    rowcontextmenu: function(grid, rowIndex, e){
                    
                        var menu;
                        
                        grid.getSelectionModel().selectRow(rowIndex);
                        
                        menu = new Ext.menu.Menu({
                            id: 'submenu',
                            items: [{
                                text: '<b>Open in a new Tab</b>',
                                iconCls: 'openInTab',
                                scope: this,
                                handler: function(){
                                    gridBugs.fireEvent('rowdblclick', grid, rowIndex, e);
                                }
                            }, '-', {
                                text: 'Refresh this grid',
                                iconCls: 'refresh',
                                scope: this,
                                handler: function(){
                                    this.storeBugs.reload();
                                }
                            }]
                        });
                        
                        menu.showAt(e.getXY());
                        
                    },
                    rowdblclick: function(grid, rowIndex, e){
                    
                        var BugsId, BugsUrl, BugsTitle;
                        
                        BugsId = this.storeBugs.getAt(rowIndex).data.id;
                        BugsUrl = this.storeBugs.getAt(rowIndex).data.link;
                        BugsTitle = this.storeBugs.getAt(rowIndex).data.title;
                        
                        this.NewTabBugs(BugsId, BugsUrl, BugsTitle);
                    }
                }
            });
            
            graphPanel = {
                title: 'Graphics',
                layout: 'fit',
                autoHeight: true,
                iconCls: 'home-graphic-title',
                html: '<div align="center" id="graph_container" style="width: 530px; height: 302px">' +
                '<img id="graph_picture" src="" height="300">' +
                '</div>',
                listeners: {
                    afterlayout: function(){
                    
                        var img, imgdiv, loadMask;
                        
                        img = Ext.get('graph_picture');
                        imgdiv = Ext.get('graph_container');
                        img.setVisibilityMode(Ext.Element.VISIBILITY);
                        loadMask = new Ext.LoadMask(imgdiv);
                        
                        img.on('load', function(){
                            img.stopFx();
                            loadMask.hide();
                            img.fadeIn({
                                duration: 2
                            });
                        });
                        
                        loadMask.show();
                        img.hide();
                        img.dom.src = "./php/controller.php?task=translationGraph";
                    } //AfterLayout
                } // Listeners
            };
            
            this.treeAllFiles = new Ext.tree.TreePanel({
                animate: true,
                autoScroll: true,
                useArrows: true,
                loader: new Ext.tree.TreeLoader({
                    dataUrl: './php/controller.php',
                    baseParams: {
                        task: 'getAllFiles'
                    }
                }),
                enableDD: false,
                containerScroll: true,
                bodyBorder: false,
                listeners: {
                    scope: this,
                    dblclick: function(node, e){
                    
                        var FileLang, FileName, FilePath, FileID, t, parserFile, storeLog, sm, gridLog, panelWest, panelCenter, menuMarkUp = '';
                        
                        // Only for files
                        if (node.attributes.type === 'file') {
                        
                            FileName = node.attributes.text;
                            FilePath = node.attributes.id;
                            FileID = Ext.util.md5('AF-' + FilePath + FileName);
                            
                            // Render only if this tab don't exist yet
                            if (!Ext.getCmp('main-panel').findById('AF-' + FileID)) {
                            
                                // CleanUp the path
                                t = FilePath.split('/');
                                t.shift();
                                t.shift();
                                t.pop();
                                
                                FileLang = t[0];
                                FilePath = t.join('/') + '/';
                                
                                if (FileLang !== 'en') {
                                    menuMarkUp = this.menuMarkupLANG('AF-FILE-' + FileID);
                                }
                                else {
                                    menuMarkUp = this.menuMarkupEN('AF-FILE-' + FileID);
                                }
                                
                                parserFile = 'xml'; // By default
                                if (node.attributes.extension === 'xml') {
                                    parserFile = 'xml';
                                }
                                if (node.attributes.extension === 'html') {
                                    parserFile = 'html';
                                }
                                if (node.attributes.extension === 'php') {
                                    parserFile = 'php';
                                }
                                
                                // We define the store and the grid for log information
                                storeLog = new Ext.data.Store({
                                    autoLoad: (this.userConf.conf_allfiles_displaylog === "true") ? true : false,
                                    proxy: new Ext.data.HttpProxy({
                                        url: './php/controller.php'
                                    }),
                                    baseParams: {
                                        task: 'get-log',
                                        Path: FilePath,
                                        File: FileName
                                    },
                                    reader: new Ext.data.JsonReader({
                                        root: 'Items',
                                        totalProperty: 'nbItems',
                                        id: 'id'
                                    }, [{
                                        name: 'id',
                                        mapping: 'id'
                                    }, {
                                        name: 'revision',
                                        mapping: 'revision'
                                    }, {
                                        name: 'date',
                                        mapping: 'date',
                                        type: 'date',
                                        dateFormat: 'Y/m/d H:i:s'
                                    }, {
                                        name: 'author',
                                        mapping: 'author'
                                    }, {
                                        name: 'content',
                                        mapping: 'content'
                                    }])
                                });
                                storeLog.setDefaultSort('date', 'desc');
                                
                                sm = new Ext.grid.CheckboxSelectionModel({
                                    singleSelect: false,
                                    width: 22,
                                    header: '',
                                    listeners: {
                                        beforerowselect: function(sm){
                                            var nbRowsSelected = sm.getCount();
                                            if (nbRowsSelected === 2) {
                                                return false;
                                            }
                                        },
                                        rowselect: function(sm){
                                            var nbRowsSelected = sm.getCount();
                                            if (nbRowsSelected === 2) {
                                                Ext.getCmp('AF-PANEL-btn-log-' + FileID).enable();
                                                Ext.get('AF-PANEL-btn-log-' + FileID).frame("3F8538");
                                            }
                                            else {
                                                Ext.getCmp('AF-PANEL-btn-log-' + FileID).disable();
                                            }
                                        },
                                        rowdeselect: function(sm){
                                            var nbRowsSelected = sm.getCount();
                                            if (nbRowsSelected === 2) {
                                                Ext.getCmp('AF-PANEL-btn-log-' + FileID).enable();
                                                Ext.get('AF-PANEL-btn-log-' + FileID).frame("3F8538");
                                            }
                                            else {
                                                Ext.getCmp('AF-PANEL-btn-log-' + FileID).disable();
                                            }
                                        }
                                    }
                                });
                                
                                gridLog = new Ext.grid.GridPanel({
                                    store: storeLog,
                                    id: 'AF-PANEL-log-' + FileID,
                                    loadMask: true,
                                    columns: [sm, {
                                        id: 'id',
                                        header: "Rev.",
                                        width: 40,
                                        sortable: false,
                                        dataIndex: 'revision'
                                    }, {
                                        header: "Content",
                                        width: 130,
                                        sortable: true,
                                        dataIndex: 'content'
                                    }, {
                                        header: "By",
                                        width: 50,
                                        sortable: true,
                                        dataIndex: 'author'
                                    }, {
                                        header: "Date",
                                        width: 85,
                                        sortable: true,
                                        dataIndex: 'date',
                                        renderer: Ext.util.Format.dateRenderer('Y/m/d, H:i')
                                    }],
                                    autoHeight: true,
                                    autoExpandColumn: 'content',
                                    bodyBorder: false,
                                    sm: sm,
                                    view: new Ext.grid.GridView({
                                        forceFit: true
                                    }),
                                    tbar: [{
                                        scope: this,
                                        tooltip: '<b>View</b> the diff',
                                        iconCls: 'iconViewDiff',
                                        id: 'AF-PANEL-btn-log-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                        
                                            var s, rev1, rev2;
                                            
                                            // We get the 2 checked rev
                                            s = sm.getSelections();
                                            rev1 = s[0].data.revision;
                                            rev2 = s[1].data.revision;
                                            
                                            this.winDiff(FilePath, FileName, rev1, rev2);
                                            
                                        }
                                    },{
                                        scope: this,
                                        tooltip: '<b>Load/Refresh</b> revisions',
                                        iconCls: 'refresh',
                                        id: 'AF-PANEL-btn-refreshlog-' + FileID,
                                        handler: function(){
                                            storeLog.reload();
                                        }
                                    }]
                                });
                                
                                panelWest = {
                                    region: 'west',
                                    xtype: 'panel',
                                    layout: 'fit',
                                    bodyBorder: false,
                                    title: 'CvsLog',
                                    collapsed: true,
                                    width: 375,
                                    items: {
                                        scope: this,
                                        xtype: 'tabpanel',
                                        activeTab: 0,
                                        tabPosition: 'bottom',
                                        defaults: {
                                            autoScroll: true
                                        },
                                        items: [{
                                            layout: 'fit',
                                            title: 'Log',
                                            items: [gridLog]
                                        }]
                                    }
                                };
                                
                                panelCenter = {
                                    title: 'File: ' + FilePath + FileName,
                                    originTitle: 'File: ' + FilePath + FileName,
                                    collapsible: false,
                                    id: 'AF-PANEL-' + FileID,
                                    region: 'center',
                                    xtype: 'form',
                                    height: 'auto',
                                    width: 'auto',
                                    items: [{
                                        xtype: 'codemirror',
                                        id: 'AF-FILE-' + FileID,
                                        isModified: false,
                                        parser: parserFile,
                                        listeners: {
                                            scope: this,
                                            initialize: function(){
                                                this.getFile(FileID, FilePath, FileName, 'AF-PANEL-', 'AF-FILE-');
                                                // Fake resize
                                            },
                                            cmchange: function(keyCode, charCode, obj){
                                            
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('AF-FILE-' + FileID).getCursorPosition());
                                                
                                                Ext.get('AF-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('AF-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                                
                                                // 38 = arrow up; 40 = arrow down; 37 = arrow left; 39 = arrow right; 34 = pageDown; 33 = pageUp; 27 = esc; 17 = CRTL; 16 = ALT
                                                // 67 = CTRL+C
                                                
                                                if (keyCode !== 27 && keyCode !== 33 && keyCode !== 34 && keyCode !== 37 && keyCode !== 38 && keyCode !== 39 && keyCode !== 40 && keyCode !== 17 && keyCode !== 16 && keyCode !== 67) {
                                                
                                                    if (!Ext.getCmp('AF-FILE-' + FileID).isModified) {
                                                        // Add an [modified] in title
                                                        Ext.getCmp('AF-PANEL-' + FileID).setTitle(Ext.getCmp('AF-PANEL-' + FileID).originTitle + ' <span style="color:#ff0000; font-weight: bold;">[modified]</span>');
                                                        Ext.getCmp('AF-' + FileID).setTitle(Ext.getCmp('AF-' + FileID).originTitle + ' <t style="color:#ff0000; font-weight: bold;">*</t>');
                                                        
                                                        // Activate save button
                                                        Ext.getCmp('AF-PANEL-btn-save-' + FileID).enable();
                                                        Ext.get('AF-PANEL-btn-save-' + FileID).frame("3F8538");
                                                        
                                                        Ext.getCmp('AF-PANEL-btn-saveas-' + FileID).enable();
                                                        Ext.get('AF-PANEL-btn-saveas-' + FileID).frame("3F8538");
                                                        
                                                        // Mark as modified
                                                        Ext.getCmp('AF-FILE-' + FileID).isModified = true;
                                                    }
                                                }
                                            },
                                            cmcursormove: function(){
                                                var cursorPosition = Ext.util.JSON.decode(Ext.getCmp('AF-FILE-' + FileID).getCursorPosition());
                                                
                                                Ext.get('AF-status-line-' + FileID).dom.innerHTML = cursorPosition.line;
                                                Ext.get('AF-status-col-' + FileID).dom.innerHTML = cursorPosition.caracter;
                                            }
                                        }
                                    }],
                                    bbar: [{
                                        scope: this,
                                        xtype: 'panel',
                                        height: 21,
                                        baseCls: '',
                                        bodyStyle: 'padding-top:5px;',
                                        html: "<div style=\"display: inline;\" class=\"x-statusbar\"><span class=\"x-status-text-panel\">Line: <span id=\"AF-status-line-" + FileID + "\">-</span></span>&nbsp;&nbsp;<span class=\"x-status-text-panel\">Col: <span id=\"AF-status-col-" + FileID + "\">-</span></span></div>&nbsp;&nbsp;"
                                    }],
                                    tbar: [{
                                        scope: this,
                                        tooltip: '<b>Save</b> this file',
                                        iconCls: 'saveFile',
                                        id: 'AF-PANEL-btn-save-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                        
                                            Ext.getCmp('AF-PANEL-btn-save-' + FileID).disable();
                                            Ext.getCmp('AF-FILE-' + FileID).isModified = false;
                                            Ext.getCmp('AF-PANEL-' + FileID).setTitle(Ext.getCmp('AF-PANEL-' + FileID).originTitle);
                                            Ext.getCmp('AF-' + FileID).setTitle(Ext.getCmp('AF-' + FileID).originTitle);
                                            
                                            var msg = Ext.MessageBox.wait('Saving data...');
                                            // We save LANG File
                                            Ext.Ajax.request({
                                                scope: this,
                                                url: './php/controller.php',
                                                params: {
                                                    task: 'save-file',
                                                    filePath: FilePath,
                                                    fileName: FileName,
                                                    fileLang: 'all',
                                                    fileContent: Ext.getCmp('AF-FILE-' + FileID).getCode()
                                                },
                                                success: function(action, form){
                                                    var o = Ext.util.JSON.decode(action.responseText);
                                                    if (o.success) {
                                                    
                                                        // Update our store
                                                        
                                                        // Add this files into storePendingCommit
                                                        this.addToPendingCommit(FilePath, FileName);
                                                        
                                                        // Remove wait msg
                                                        msg.hide();
                                                    }
                                                    else {
                                                        // Remove wait msg
                                                        msg.hide();
                                                        this.winForbidden();
                                                    }
                                                }
                                            });
                                            
                                        }
                                        
                                    }, {
                                        scope: this,
                                        tooltip: '<b>Save as</b> a patch',
                                        iconCls: 'saveAsFile',
                                        id: 'AF-PANEL-btn-saveas-' + FileID,
                                        disabled: true,
                                        handler: function(){
                                            this.savePatch('all', FileID, FilePath, FileName, 'AF', this);
                                        }
                                    }, '-', {
                                        tooltip: '<b>Re-indent</b> all this file',
                                        iconCls: 'iconIndent',
                                        handler: function(){
                                            Ext.getCmp('AF-FILE-' + FileID).reIndentAll();
                                        }
                                    }, menuMarkUp]
                                };
                                
                                if (node.attributes.extension === 'gif' || node.attributes.extension === 'png') {
                                    panelCenter = {
                                        xtype: 'panel',
                                        layout: 'fit',
                                        bodyStyle: 'padding:5px 5px 0',
                                        html: '<img src="/data/' + this.userLogin + '/phpdoc-' + this.userLang + FilePath + '" />'
                                    };
                                    panelWest = {};
                                }
                                
                                Ext.getCmp('main-panel').add({
                                    closable: true,
                                    title: FileName,
                                    originTitle: FileName,
                                    tabTip: 'in ' + FilePath,
                                    iconCls: 'AllFiles',
                                    id: 'AF-' + FileID,
                                    layout: 'border',
                                    defaults: {
                                        collapsible: true,
                                        split: true
                                    },
                                    items: [panelCenter, panelWest]
                                
                                });
                                
                                Ext.getCmp('main-panel').setActiveTab('AF-' + FileID);
                                
                            }
                            else {
                                // This tab already exist. We focus it.
                                Ext.getCmp('main-panel').setActiveTab('AF-' + FileID);
                            }
                            
                        }// Only for files
                    }
                }
            });
            // add a tree sorter in folder mode
            this.treeSort = new Ext.tree.TreeSorter(this.treeAllFiles, {
                folderSort: true
            });
            
            // set the root node
            this.treeAllFilesRoot = new Ext.tree.AsyncTreeNode({
                text: 'Repository',
                draggable: false, // disable root node dragging
                id: '/'
            });
            this.treeAllFiles.setRootNode(this.treeAllFilesRoot);
            
            mainMenu = new Ext.menu.Menu({
                id: 'mainMenu',
                items: [{
                    scope: this,
                    text: 'Refresh all data',
                    disabled: (this.userLogin === 'cvsread') ? true : false,
                    iconCls: 'refresh',
                    tooltip: '<b>Refresh all data</b><br>Cvs update & apply all tools',
                    handler: this.WinUpdate
                }, {
                    scope: this,
                    text: 'Check Build',
                    disabled: (this.userLogin === 'cvsread') ? true : false,
                    iconCls: 'checkBuild',
                    tooltip: '<b>Check your build</b> using configure.php script',
                    handler: this.WinCheckBuild
                }, {
                    scope: this,
                    text: 'EN tools',
                    handler: function(){
                        return false;
                    },
                    //iconCls: 'iconConf',
                    tooltip: '<b>Configure</b> this tool',
                    menu: new Ext.menu.Menu({
                        items: [{
                            scope: this,
                            text: 'Check doc',
                            iconCls: 'CheckDoc',
                            handler: this.newTabCheckDoc
                        }]
                    })
                }, '-', {
                    scope: this,
                    text: 'Configure',
                    iconCls: 'iconConf',
                    tooltip: '<b>Configure</b> this tool',
                    id: 'winconf-btn',
                    handler: this.WinConf
                }, '-', {
                    scope: this,
                    text: 'Erase my personal data',
                    disabled: (this.userLogin === 'cvsread') ? true : false,
                    iconCls: 'iconErasePersonalData',
                    tooltip: '<b>Log out</b>',
                    handler: function(){
                    
                        Ext.MessageBox.confirm('Confirm', 'This action will erase your personal data. All content about this account will be deleted definitively. Are you sure you want to do that ?', function(btn){
                        
                            if (btn === 'yes') {
                            
                                Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> Please, wait...');
                                //
                                Ext.Ajax.request({
                                    scope: this,
                                    url: './php/controller.php',
                                    params: {
                                        task: 'erase-personal-data'
                                    },
                                    success: function(action){
                                    
                                        Ext.getBody().unmask();
                                        
                                        var o = Ext.util.JSON.decode(action.responseText);
                                        if (o.success) {
                                            Ext.MessageBox.show({
                                                title: 'Thanks !',
                                                msg: 'Thank you for using this application !',
                                                icon: Ext.MessageBox.INFO,
                                                buttons: Ext.MessageBox.OK,
                                                fn: function(){
                                                    window.location.href = './php/controller.php?task=logout';
                                                }
                                            });
                                            
                                        }
                                        else {
                                            this.winForbidden();
                                        }
                                        
                                    }
                                });
                            }
                            
                        }, this);
                    }
                }, '-', {
                    text: 'Log out',
                    iconCls: 'iconLogOut',
                    tooltip: '<b>Log out</b>',
                    handler: function(){
                        Ext.MessageBox.confirm('Confirm', 'Are you sure you want to logout?', function(btn){
                            if (btn === 'yes') {
                                window.location.href = './php/controller.php?task=logout';
                            }
                            
                        });
                    }
                }, '-', {
                    scope: this,
                    text: 'About',
                    iconCls: 'iconHelp',
                    tooltip: '<b>About</b><br/>' + this.appName,
                    id: 'winabout-btn',
                    handler: function(){
                        this.WinAbout();
                    }
                }]
            });
            
            
            if (this.userLang === 'en') {
                mainContent = [gridMailing];
            }
            else {
                mainContent = [gridSummary, gridTranslators, gridMailing, gridBugs, graphPanel];
            }
            
            // Our main window as a viewport
            MainWindow = new Ext.Viewport({
                layout: 'border',
                items: [{
                    region: 'north',
                    html: '<h1 class="x-panel-header"><img src="themes/img/mini_php.png" style="vertical-align: middle;" />&nbsp;&nbsp;' + this.appName + '</h1>',
                    autoHeight: true,
                    border: false,
                    margins: '0 0 5 0'
                }, {
                    region: 'west',
                    collapsible: true,
                    collapseMode: 'mini',
                    animate: true,
                    split: true,
                    layout: 'fit',
                    width: 300,
                    autoScroll: true,
                    items: [{
                        layout: 'accordion',
                        animate: true,
                        bodyBorder: false,
                        border: false,
                        tbar: [{
                            text: 'Main Menu',
                            iconCls: 'MainMenu',
                            menu: mainMenu
                        }],
                        items: [{
                            title: 'Files Need Update - <em id="acc-need-update-nb">0</em>',
                            id: 'acc-need-update',
                            layout: 'fit',
                            iconCls: 'FilesNeedUpdate',
                            hidden: (this.userLang === 'en') ? true : false,
                            items: [gridFilesNeedUpdate],
                            collapsed: true
                        }, {
                            title: 'Error in current translation - <em id="acc-error-nb">0</em>',
                            id: 'acc-error',
                            layout: 'fit',
                            iconCls: 'FilesError',
                            hidden: (this.userLang === 'en') ? true : false,
                            items: [gridFilesError],
                            collapsed: true
                        }, {
                            title: 'Files Need Reviewed - <em id="acc-need-reviewed-nb">0</em>',
                            id: 'acc-need-reviewed',
                            layout: 'fit',
                            iconCls: 'FilesNeedReviewed',
                            hidden: (this.userLang === 'en') ? true : false,
                            items: [gridFilesNeedReviewed],
                            collapsed: true
                        }, {
                            title: 'All files',
                            id: 'acc-all-files',
                            layout: 'fit',
                            iconCls: 'AllFiles',
                            items: [this.treeAllFiles],
                            collapsed: true
                        }, {
                            title: 'Pending for commit - <em id="acc-pendingCommit-nb">0</em>',
                            id: 'acc-need-pendingCommit',
                            layout: 'fit',
                            iconCls: 'PendingCommit',
                            items: [gridPendingCommit],
                            collapsed: true
                        }, {
                            title: 'Pending Patch - <em id="acc-pendingPatch-nb">0</em>',
                            id: 'acc-need-pendingPatch',
                            layout: 'fit',
                            iconCls: 'PendingPatch',
                            items: [gridPendingPatch],
                            collapsed: true
                        }]
                    }]
                
                }, {
                    region: 'center',
                    xtype: 'tabpanel',
                    id: 'main-panel',
                    activeTab: 0,
                    enableTabScroll: true,
                    layoutOnTabChange: true,
                    plugins: new Ext.ux.TabCloseMenu(),
                    listeners: {
                        scope: this,
                        beforeremove: this.removeTabEvent
                    },
                    items: [{
                        title: 'Home',
                        baseCls: 'MainInfoTabPanel',
                        xtype: 'panel',
                        autoScroll: true,
                        id: 'MainInfoTabPanel',
                        plain: true,
                        items: [{
                            xtype: 'panel',
                            border: false,
                            html: '<div class="res-block">' +
                            '<div class="res-block-inner">' +
                            '<h3>Connected as <em>' +
                            this.userLogin +
                            '</em></h3>' +
                            '</div>' +
                            '</div>'
                        }, {
                            xtype: 'tabpanel',
                            activeTab: 0,
                            plain: true,
                            autoScroll: true,
                            height: 400,
                            border: false,
                            defaults: {
                                border: true
                            },
                            items: mainContent
                        }]
                    }]
                }]
            });
            
            // Remove the global loading message
            Ext.get('loading').remove();
            Ext.fly('loading-mask').fadeOut({
                remove: true
            });
            
            // Direct access to a file as cvsread
            if (directAccess) {
                this.openFile(directAccess.lang + directAccess.path, directAccess.name);
            }
            
        } // drawInterface
    }; // Return
}();
Ext.EventManager.onDocumentReady(phpDoc.init, phpDoc, true);

/*

 Ext.util.Observable.prototype.fireEvent = Ext.util.Observable.prototype.fireEvent.createInterceptor(function() {

 // Catch Ajax request

 //if( arguments[0] == 'beforerequest' ) { console.log('start Ajax call'); console.log(arguments); }

 //if( arguments[0] == 'requestcomplete' ) { console.log('end Ajax call'); console.log(arguments); }

 //console.log(arguments[0]);

 console.log(arguments);

 return true;

 });

 */

