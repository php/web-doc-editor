Ext.BLANK_IMAGE_URL = 'js/ExtJs/resources/images/default/s.gif';

// Add ucFirst to string object
String.prototype.ucFirst = function () {
	return this.substr(0,1).toUpperCase() + this.substr(1,this.length);
};

// Allow to deselect just one row when we use CheckBoxSelectionModel, for example, in CommitPrompt
// Found here : http://www.extjs.com/forum/showthread.php?69172-Rows-are-deselected-in-grid-CheckboxSelectionModel&p=348647#post348647
Ext.override( Ext.grid.CheckboxSelectionModel, {
    handleMouseDown : function(g, rowIndex, e){
        if(e.button !== 0 || this.isLocked()){
            return;
        };
        var view = this.grid.getView();
        if(e.shiftKey && this.last !== false){
            var last = this.last;
            this.selectRange(last, rowIndex, e.ctrlKey);
            this.last = last;
            view.focusRow(rowIndex);
        }else{
            var isSelected = this.isSelected(rowIndex);
            if(isSelected){
                this.deselectRow(rowIndex);
            }else if(!isSelected){
                this.selectRow(rowIndex, ! this.singleSelect);
                view.focusRow(rowIndex);
            }
        }
    }
});

// javascript debug-logging wrapper
function log()
{
    if(console) {
        console.log.apply(this, arguments);
    }
}

// i18n function
function _(key)
{
    try {
        var str = i18n[key];

        if (str === undefined) {
            str = key;
            log("FIX ME : i18n not found for the string: " + key);
        }

        return str;
    } catch(e) {
        return key;
    }
}

// XHR wrapper
// config - Ext.ajax.request config
function XHR(config)
{
    var success_cb  = config.success,
        failure_cb  = config.failure,
        original_cb = config.callback;

    config.url = './do/' + config.params.task;
    delete config.params.task;
    config.params = Ext.applyIf({csrfToken: csrfToken}, config.params);
    config.failure  = config.success = Ext.emptyFn;
    config.callback = function(options, success, response)
    {
        var o = null;
        try {
            o = Ext.decode(response.responseText);
        } catch(e) {
            log("Invalid XHR JSON Response:" + response.responseText);
        }

        if (success && o && o.success) {
            if (success_cb !== undefined) {
                Ext.callback(success_cb, config.scope, [response, options]);
            }
        } else {
            if (failure_cb !== undefined) {
                Ext.callback(failure_cb, config.scope, [response, options]);
            }
        }

        if (original_cb !== undefined) {
            Ext.callback(original_cb, config.scope, [options, success, response]);
        }
    };

    Ext.Ajax.request(config);
}

Ext.override(Ext.form.Field, {

    afterRender: function() {

        var findLabel = function(field) {
            var wrapDiv = null;
            var label = null

            //find form-item and label
            wrapDiv = field.getEl().up("div.x-form-item");

            if (wrapDiv) label = wrapDiv.child("label");
            if (label) return label;
        };

        if (this.tooltipText) {
            var label = findLabel(this);

            if (label) {

                label.addClass(this.tooltipClass || "x-textfield-tooltip");

                new Ext.ToolTip({
                    target:  label,
                    html: this.tooltipText,
                    //enabled: true,
                    trackMouse:true
                    //dismissDelay: 60000 * 30
                });
            }
        }

        Ext.form.Field.superclass.afterRender.call(this);
        this.initEvents();
        this.initValue();
    }

});// create namespace for plugins
Ext.namespace('Ext.ux.plugins');

/**
  * Ext.ux.IconCombo Extension Class for Ext 2.x Library -
  *
  * @author  Ing. Jozef Sakalos
  * @version $Id: Ext.ux.IconCombo.js 617 2007-12-20 11:29:56Z jozo $
  *
  * @class Ext.ux.IconCombo
  * @extends Ext.form.ComboBox
  */

Ext.ux.IconCombo = Ext.extend(Ext.form.ComboBox, {
    initComponent : function()
    {

        Ext.apply(this, {
            tpl:  '<tpl for=".">'
                + '<div class="x-combo-list-item ux-icon-combo-item">'
                + '<div class="{' + this.iconClsField + '}" style="position:absolute"></div>'
                + '<div class="ux-icon-combo-value">{' + this.displayField + '}</div>'
                + '</div></tpl>'
        });

        // call parent initComponent
        Ext.ux.IconCombo.superclass.initComponent.call(this);

    }, // end of function initComponent

    onRender:function(ct, position)
    {
        // call parent onRender
        Ext.ux.IconCombo.superclass.onRender.call(this, ct, position);

        // adjust styles
        this.wrap.applyStyles({position:'relative'});
        this.el.addClass('ux-icon-combo-input');

        // add div for icon
        this.icon = Ext.DomHelper.append(this.el.up('div.x-form-field-wrap'), {
            tag: 'div', style:'position:absolute'
        });

    }, // end of function onRender

    setIconCls : function()
    {
        var rec = this.store.query(this.valueField, this.getValue()).itemAt(0);
        if(rec) {
            this.icon.className = rec.get(this.iconClsField);
        }
    }, // end of function setIconCls

    setValue : function(value)
    {
        Ext.ux.IconCombo.superclass.setValue.call(this, value);
        this.setIconCls();
    } // end of function setValue
});

// register xtype
Ext.reg('iconcombo', Ext.ux.IconCombo);/*
 Author       : Jay Garcia
 Site         : http://tdg-i.com
 Contact Info : jgarcia@tdg-i.com
 Purpose      : Window Drawers for Ext 2.x Ext.Window class, which emulates OS X behaviors
 Contributors : Mystix, http://extjs.com/forum/member.php?u=1459
                Hendricd, http://extjs.com/forum/member.php?u=8730

 Warranty     : none
 Price        : free
 Version      : ??? IT'S UP TO JAY TO DECIDE =)
 Date         : ???
 */

// Need to override the Window DnD to allow events to fire.
Ext.override(Ext.Window.DD, {
    // private - used for dragging
    startDrag : function()
    {
        var w = this.win, so, s;

        w.fireEvent('ghost', []);
        this.proxy = w.ghost();
        if (w.constrain !== false) {
            so = w.el.shadowOffset;
            this.constrainTo(w.container, {right: so, left: so, bottom: so});
        } else if (w.constrainHeader !== false) {
            s = this.proxy.getSize();
            this.constrainTo(w.container, {right: -(s.width - this.headerOffsets[0]), bottom: -(s.height - this.headerOffsets[1])});
        }
    }
});

// Need to override the Window class to allow events to fire for front and back movement.
Ext.override(Ext.Window, {
    setZIndex : function(index)
    {
        var newZIndex = ++index;

        if (this.modal) {
            this.mask.setStyle("z-index", index);
        }

        this.el.setZIndex(newZIndex);
        index += 5;

        if (this.resizer) {
            this.resizer.proxy.setStyle("z-index", ++index);
        }
        if (newZIndex > this.lastZIndex) {
            this.fireEvent('tofront', this);
        } else {
            this.fireEvent('toback', this);
        }
        this.lastZIndex = index;
    }
});

Ext.namespace('Ext.ux','Ext.ux.plugins');

// Drawer Base Class
Ext.ux.plugins.WindowDrawer = Ext.extend(Ext.Window, {
    closable : false,
    resizable : false,

    show : function(skipAnim, cb, scope)
    {
        if (this.hidden && this.fireEvent("beforeshow", this) !== false) {
            this.hidden = false;
            this.onBeforeShow();
            this.afterShow(!!skipAnim, cb, scope);
        }
    },

    hide : function(skipAnim, cb, scope)
    {
        if (this.hidden) {
            return;
        }

        if (this.animate === true && !skipAnim) {
            if (this.el.shadow) { // honour WindowDrawer's "shadow" config
                this.el.disableShadow();
            }

            this.el.slideOut(this.alignToParams.slideDirection, {
                scope    : this,
                duration : this.animDuration || .25,
                callback : function() {
                    this.el.removeClass('x-panel-animated');

                    if (typeof cb == 'function') {
                        cb.call(scope || this);
                    }
                }
            });
        } else {
            Ext.ux.plugins.WindowDrawer.superclass.hide.call(this, null, cb, scope);
        }

        // REQUIRED!!!
        this.hidden = true;
    },

    // private
    init : function(parent)
    {
        this.win = parent;
        this.resizeHandles = this.side; // allow resizing only on 1 side (if resizing is allowed)
        this.shim = parent.shim; // shim the kids too (modification by @hendricd -- http://extjs.com/forum/showthread.php?p=281140#post281140)

        parent.drawers = parent.drawers || {};
        parent.drawers[this.side] = this; // add this WindowDrawer to the parent's drawer collection
        parent.on({
            scope   : this,
            tofront : this.onBeforeShow,
            toback  : this.onBeforeShow,
            ghost   : this.onBeforeResize,
            move    : this.alignAndShow,
            resize  : this.alignAndShow,
            destroy : this.destroy,

            // modifications by @hendricd -- http://extjs.com/forum/showthread.php?p=281140#post281140
            render  : function(p)
            {
                // render WindowDrawer to parent's container, if available
                this.render(p.el.parent());
            },
            beforecollapse : function()
            {
                if (!this.hidden) {
                    this.wasVisible = true;
                    this.hide(true);
                }
            },
            expand : function()
            {
                if (this.showAgain === this.wasVisible) {
                    this.alignAndShow();
                }
            },
            beforehide: function()
            {
                this.wasVisible = !this.hidden;
                this.hide(true);
            }
        });
    },

    // private
    initComponent : function()
    {
        Ext.apply(this, {
            frame         : true,
            draggable     : false,
            modal         : false,
            closeAction   : 'hide',
            alignToParams : {}
        });

        this.on({
            scope      : this,
            beforeshow : this.onBeforeShow,
            beforehide : this.onBeforeHide
        });

        if (this.size) {
            if (this.side == 'e' || this.side == 'w') {
                this.width = this.size;
            } else {
                this.height = this.size;
            }
        }

        Ext.ux.plugins.WindowDrawer.superclass.initComponent.call(this);
    },

    // private
    onBeforeResize : function()
    {
        if (!this.hidden) {
            this.showAgain = true;
        }
        this.hide(true);
    },

    // private
    onBeforeHide : function()
    {
        if (this.animate) {
            this.getEl().addClass('x-panel-animated');
        }
    },

    // private
    onBeforeShow : function()
    {
        if (this.animate) {
            this.el.addClass('x-panel-animated');
        }
        this.setAlignment();
        this.setZIndex(this.win.el.getZIndex() - 3);
    },

    // private
    afterShow : function(skipAnim, cb, scope)
    {
        if (this.animate && !skipAnim) {
            this.el.slideIn(this.alignToParams.slideDirection, {
                scope    : this,
                duration : this.animDuration || .25,
                callback : function() {
                    this.el.removeClass('x-panel-animated');

                    if (this.el.shadow) { // honour WindowDrawer's "shadow" config
                        // re-enable shadows after animation
                        this.el.enableShadow(true);
                    }

                    // REQUIRED!!
                    this.el.show(); // somehow forces the shadow to appear

                    if (typeof cb == 'function') {
                        cb.call(scope || this);
                    }
                }
            });
        } else {
            Ext.ux.plugins.WindowDrawer.superclass.afterShow.call(this);

            if (typeof cb == 'function') {
                cb.call(scope || this);
            }
        }

        // modification by @hendricd -- http://extjs.com/forum/showthread.php?p=281140#post281140
        this.wasVisible  = true;
    },

    // private
    alignAndShow : function()
    {
        this.setAlignment();

        if (this.showAgain) {
            this.show(true);
        }
        this.showAgain = false;
    },

    // private
    setAlignment:  function()
    {
        switch(this.side) {
            case 'n' :
                this.setWidth(this.win.el.getWidth() - 10);
                Ext.apply(this.alignToParams, {
                    alignTo        : 'tl',
                    alignToXY      :  [5, (this.el.getComputedHeight() * -1) + 5],
                    slideDirection : 'b'
                });
                break;

            case 's' :
                this.setWidth(this.win.el.getWidth() - 10);
                Ext.apply(this.alignToParams, {
                    alignTo        : 'bl',
                    alignToXY      :  [5, (Ext.isIE6)? -2 : -7],
                    slideDirection : 't'
                });
                break;

            case 'e' :
                this.setHeight(this.win.el.getHeight() - 10);
                Ext.apply(this.alignToParams, {
                    alignTo        : 'tr',
                    alignToXY      :  [-5, 5],
                    slideDirection : 'l'
                });
                break;

            case 'w' :
                this.setHeight(this.win.el.getHeight() - 10);
                Ext.apply(this.alignToParams, {
                    alignTo        : 'tl',
                    alignToXY      :  [(this.el.getComputedWidth() * -1) + 5, 5],
                    slideDirection : 'r'
                });
                break;
        }

        if (!this.hidden) {
            this.el.alignTo(this.win.el, this.alignToParams.alignTo, this.alignToParams.alignToXY);

            // Simple fix for IE, where the bwrap doesn't properly resize.
            if (Ext.isIE) {
                this.bwrap.hide();
                this.bwrap.show();
            }
        }

        // force doLayout()
        this.doLayout();
    },

    // private
    toFront: function() {
        this.win.toFront(); // first bring WindowDrawer's parent to the front
        return this;
    }
});

Ext.reg('windowdrawer', Ext.ux.plugins.WindowDrawer);var PhDOE_loginPage = function()
{
    Ext.QuickTips.init();
    Ext.BLANK_IMAGE_URL = 'js/ExtJs/resources/images/default/s.gif';

    return {

        storeLang    : '',
        storeProject : '',
        storeFlickr : '',
        email : Ext.util.Cookies.get("email"),
        authService: 'VCS',
        authServiceID: '',

        init : function()
        {
            // Load all available language
            this.storeLang = new Ext.data.Store({
                proxy    : new Ext.data.HttpProxy({
                    url : './do/getAvailableLanguage'
                }),
                reader   : new Ext.data.JsonReader({
                    root          : 'Items',
                    totalProperty : 'nbItems',
                    idProperty    : 'code',
                    fields        : [
                        {name : 'code'},
                        {name : 'iconCls'},
                        {name : 'name'}
                    ]
                })
            });

            this.storeLang.load({
                scope    : this,
                callback : function() {
                    this.storeProject.load();
                }
            });

            // Load all available language
            this.storeProject = new Ext.data.Store({
                proxy    : new Ext.data.HttpProxy({
                    url : './do/getAvailableProject'
                }),
                reader : new Ext.data.JsonReader({
                    root          : 'Items',
                    totalProperty : 'nbItems',
                    idProperty    : 'code',
                    fields        : [
                        {name : 'code'},
                        {name : 'iconCls'},
                        {name : 'name'},
                        {name : 'request_account_uri'}
                    ]
                })
            });

            // Load Flickr elephpants
            this.storeFlickr = new Ext.data.Store({
                autoLoad: false,
                proxy    : new Ext.data.HttpProxy({
                    url : './do/getElephpants'
                }),
                reader : new Ext.data.JsonReader({
                    root          : 'Items',
                    fields        : [
                        {name : 'img'},
                        {name : 'link'}
                    ]
                })
            });

            this.storeProject.on('load', function() {
                this.drawForm();
            }, this);

        },

        externalCredentials : function(service, name, id, email) {

            this.authService = service;
            this.authServiceID = id;

            // Name is always given
            Ext.getCmp('login-form-vcsLogin').setValue(name);
            Ext.getCmp('login-form-vcsLogin').disable();
            Ext.getCmp('login-form-vcsPasswd').disable();
            Ext.getCmp('login-form-auth').setText('<img src="themes/img/auth_'+service+'.png" style="vertical-align: middle" /> <b>' + service.ucFirst() +'</b>', false);

            if( email ) {
                Ext.getCmp('login-form-email').setValue(email);
            }

            Ext.getCmp('login-btn').setText('Anonymous login');
        },

        drawForm : function()
        {
            var win;

            if (!win) {
                win = new Ext.Window({
                    layout      : 'border',
                    width       : 440,
                    height      : 300,
                    closable    : false,
                    closeAction : 'hide',
                    resizable   : false,
                    plain       : true,
                    title       : 'Control Access',
                    iconCls     : 'iconKey',
                    listeners: {
                        show: function(w) {
                            win.drawers.e.show();
                            win.drawers.e.setHeight(240);
                        },
                        afterrender: function(w) {

                            if( auth && auth.service ) {

                                PhDOE_loginPage.externalCredentials(auth.service, auth.login, auth.serviceID, auth.email);

                            }

                        }
                    },
                    plugins     : [
                        new Ext.ux.plugins.WindowDrawer({
                            html      : 'To request a VCS account please read :<div style="text-align: center; margin-top: 20px;"><span id="request-account"></span></div>',
                            side      : 's',
                            bodyStyle : 'margin: 10px;',
                            animate   : true,
                            resizable : false,
                            height    : 80
                        }),
                        new Ext.ux.plugins.WindowDrawer({
                            title:'&nbsp;&nbsp;Sign in with...',
                            side      : 'e',
                            animate   : true,
                            resizable : false,
                            width     : 210,
                            height    : 200,
                            bodyStyle : 'margin: 10px;',
                            html      : '<div id="auth-login">'+
                                        '<a href="?oauth=facebook" title="Facebook">'+
                                            '<img id="auth-img-fb" src="themes/img/auth_facebook_40.png" class="" />'+
                                        '</a> '+
                                        '<a href="?oauth=github" title="Github">'+
                                            '<img id="auth-img-github" src="themes/img/auth_github_40.png" class="" />'+
                                        '</a>'+
                                        '<a href="?oauth=google" title="Google">'+
                                            '<img id="auth-img-google" src="themes/img/auth_google_40.png" />'+
                                        '</a> '+
                                        '<br/>'+
                                        '<a href="?oauth=linkedin" title="Linkedin">'+
                                            '<img id="auth-img-linkedin" src="themes/img/auth_linkedin_40.png" />'+
                                        '</a>'+
                                        '<a href="?oauth=stackoverflow" title="Stackoverflow">'+
                                            '<img id="auth-img-stackoverflow" src="themes/img/auth_stackoverflow_40.png" />'+
                                        '</a>'+
                                        '<a href="?oauth=instagram" title="Instagram">'+
                                            '<img id="auth-img-instagram" src="themes/img/auth_instagram_40.png" />'+
                                        '</a>'+
                                        '<br/>'+
                                        '<a href="?oauth=twitter" title="Twitter">'+
                                            '<img id="auth-img-twitter" src="themes/img/auth_twitter_40.png" />'+
                                        '</a>'+
                                        '</div>',
                            listeners: {
                                    afterrender: function() {

                                        if( auth.service ) {

                                            switch(auth.service) {
                                                case "facebook" :
                                                    Ext.get('auth-img-fb').addClass('oauth-enable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "github" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-enable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "google" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-enable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "linkedin" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-enable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "stackoverflow" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-enable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "instagram" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-enable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "twitter" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-enable');
                                                    break;
                                            }

                                        } else {
                                            Ext.get('auth-img-fb').addClass('oauth-disable');
                                            Ext.get('auth-img-github').addClass('oauth-disable');
                                            Ext.get('auth-img-google').addClass('oauth-disable');
                                            Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                            Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                            Ext.get('auth-img-instagram').addClass('oauth-disable');
                                            Ext.get('auth-img-twitter').addClass('oauth-disable');
                                        }
                                    }
                            }
                        })
                    ],
                    items : [{
                        xtype     : 'panel',
                        baseCls   : 'x-plain',
                        id        : 'login-logo',
                        region    : 'center',
                        bodyStyle : 'margin:4px 4px 4px 8px',
                        html      : '<div id="app-logo"><img src="themes/img/php.png"></div><div id="app-title">PhD O.E.</div><div id="app-description">Php Docbook Online Editor</div>'
                    }, {
                        xtype       : 'form',
                        region      : 'south',
                        id          : 'login-form',
                        url         : './do/login',
                        bodyStyle   : 'padding:5px 5px 0',
                        border      : false,
                        height      : 170,
                        width       : 350,
                        labelWidth  : 110,
                        defaults    : { width : 217 },
                        defaultType : 'textfield',
                        items : [{
                            xtype         : 'iconcombo',
                            width         : 235,
                            fieldLabel    : 'Project',
                            store         : this.storeProject,
                            triggerAction : 'all',
                            allowBlank    : false,
                            valueField    : 'code',
                            displayField  : 'name',
                            iconClsField  : 'iconCls',
                            iconClsBase   : 'project',
                            mode          : 'local',
                            listWidth     : 235,
                            maxHeight     : 150,
                            editable      : true,
                            id            : 'login-form-project',
                            name          : 'projectDisplay',
                            listeners     : {
                                afterrender : function(c) {
                                    if( directAccess )
                                    {
                                        c.focus();
                                        c.onLoad();
                                        c.setValue(directAccess.project);
                                        c.collapse();
                                        c.disable();

                                        // Get the URI for svn account request
                                        var url = c.store.getById(directAccess.project.toLowerCase()).data.request_account_uri;
                                        Ext.get("request-account").dom.innerHTML = '<a href="' + url + '" target="_blank">' + url + '</a>';

                                    } else {
                                        c.setValue('php');

                                        var url = c.store.getById('php').data.request_account_uri;
                                        Ext.get("request-account").dom.innerHTML = '<a href="' + url + '" target="_blank">' + url + '</a>';
                                    }

                                },
                                select : function(c, record) {
                                    var url = record.data.request_account_uri;
                                    Ext.get("request-account").dom.innerHTML = '<a href="' + url + '" target="_blank">' + url + '</a>';
                                }
                            }
                        }, {
                            fieldLabel      : 'Login',
                            name            : 'vcsLogin',
                            value           : ( loginApp ) ? loginApp : 'anonymous',
                            id              : 'login-form-vcsLogin',
                            enableKeyEvents : true,
                            listeners       : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-form-vcsPasswd').focus();
                                    }
                                },
                                keyup: function(f,e)
                                {
                                    var v = this.getValue(),
                                        currentLoginText = Ext.getCmp('login-btn').getText();

                                    if( v == 'anonymous' || v == '' ) {
                                        if( currentLoginText != 'Anonymous login' ) {
                                            Ext.getCmp('login-btn').setText('Anonymous login');
                                        }
                                    } else {
                                        if( currentLoginText == 'Anonymous login' ) {
                                            Ext.getCmp('login-btn').setText('Login');
                                        }
                                    }

                                },
                                focus : function(f)
                                {
                                    var v = this.getValue();
                                    if( v == 'anonymous' )
                                    {
                                        this.setValue('');
                                        Ext.getCmp('login-btn').setText('Login');
                                    }

                                },
                                blur : function(f)
                                {
                                    var v = this.getValue();
                                    if( v == 'anonymous' || v == '' )
                                    {
                                        this.setValue('');
                                        Ext.getCmp('login-btn').setText('Anonymous login');
                                    }

                                }
                            }
                        }, {
                            fieldLabel      : 'Password',
                            name            : 'vcsPassword',
                            id              : 'login-form-vcsPasswd',
                            inputType       : 'password',
                            enableKeyEvents : true,
                            listeners       : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-form-email').focus();
                                    }
                                }
                            }
                        }, {
                            fieldLabel      : 'Email',
                            name            : 'email',
                            id              : 'login-form-email',
                            vtype           : 'email',
                            value           : this.email,
                            enableKeyEvents : true,
                            listeners       : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-form-lang').focus();
                                    }
                                }
                            }
                        },{
                            xtype           : 'label',
                            fieldLabel      : 'Auth. Service',
                            id              : 'login-form-auth',
                            name            : 'authService',
                            html            : '<img src="themes/img/auth_php.png" style="vertical-align: middle" /> <b>Php.net</b>'
                        },{
                            xtype           : 'iconcombo',
                            width           : 235,
                            fieldLabel      : 'Language module',
                            store           : this.storeLang,
                            triggerAction   : 'all',
                            allowBlank      : false,
                            valueField      : 'code',
                            displayField    : 'name',
                            iconClsField    : 'iconCls',
                            iconClsBase     : 'flags',
                            mode            : 'local',
                            value           : ( Ext.util.Cookies.get("lang") ) ? Ext.util.Cookies.get("lang") : 'en',
                            listWidth       : 235,
                            maxHeight       : 150,
                            editable        : true,
                            id              : 'login-form-lang',
                            name            : 'langDisplay',
                            enableKeyEvents : true,
                            listeners       : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-btn').fireEvent('click');
                                    }
                                },
                                afterrender : function(c) {
                                    if( directAccess.lang )
                                    {
                                        c.focus();
                                        c.onLoad();
                                        c.setValue(directAccess.lang);
                                        c.collapse();
                                        c.disable();
                                    }
                                }
                            }
                        }]
                    }],
                    buttonAlign : 'left',
                    buttons     : [{
                        text     : 'Help',
                        iconCls  : 'iconHelp2',
                        tabIndex : -1,
                        tooltip  :'A little reference to this application',
                        handler  : function() {
                            window.open("https://wiki.php.net/doc/editor", "_blank");
                        }
                    },{
                        text     : 'Request an account',
                        iconCls  : 'iconHelp',
                        tabIndex : -1,
                        handler  : function() {
                            if( win.drawers.s.hidden ) {
                                win.drawers.s.show();
                            } else {
                                win.drawers.s.hide();
                            }
                        }
                    }, '->', {
                        text      :  ( loginApp && loginApp != 'anonymous' ) ? 'Login' : 'Anonymous login',
                        id        : 'login-btn',
                        disabled  : false,
                        listeners : {
                            click : function()
                            {
                                if (Ext.getCmp('login-form').getForm().isValid()) {

                                    Ext.getCmp('login-form').getForm().submit({
                                        method : 'POST',
                                        params : {
                                            vcsLogin: Ext.getCmp('login-form-vcsLogin').getValue(),
                                            vcsPassword: Ext.getCmp('login-form-vcsPasswd').getValue(),
                                            lang    : Ext.getCmp('login-form-lang').getValue(),
                                            project : Ext.getCmp('login-form-project').getValue(),
                                            authService: PhDOE_loginPage.authService,
                                            authServiceID: PhDOE_loginPage.authServiceID

                                        },
                                        waitTitle : 'Connecting',
                                        waitMsg   : 'Sending data...',
                                        success   : function()
                                        {
                                            window.location.reload();
                                        },
                                        failure : function(form, action)
                                        {
                                            if (action.response) {
                                                var o = Ext.util.JSON.decode(action.response.responseText);

                                                Ext.Msg.show({
                                                    title   : 'Error',
                                                    msg     : o.msg,
                                                    buttons : Ext.Msg.OK,
                                                    icon    : Ext.MessageBox.ERROR,
                                                    fn      : function()
                                                    {
                                                        Ext.getCmp('login-form-vcsPasswd').focus();
                                                    }
                                                });
                                            }
                                        }
                                    });

                                } // validate
                            }
                        }
                    },{
                        scope: this,
                        text: 'Reset',
                        handler: function() {

                            Ext.getCmp('login-form-vcsLogin').enable();

                            Ext.getCmp('login-form-vcsPasswd').enable();
                            Ext.getCmp('login-form-vcsPasswd').setValue('');
                            Ext.getCmp('login-form-auth').setText('<img src="themes/img/auth_php.png" style="vertical-align: middle" /> <b>Php.net</b>', false);

                            this.authService = 'VCS';
                            this.authServiceID = '';

                            if( loginApp ) {
                                Ext.getCmp('login-form-vcsLogin').setValue(loginApp);
                                Ext.getCmp('login-btn').setText('Login');
                                Ext.getCmp('login-form-email').setValue(Ext.util.Cookies.get("email"));

                            } else {
                                Ext.getCmp('login-form-vcsLogin').setValue('anonymous');
                                Ext.getCmp('login-btn').setText('Anonymous login');
                                Ext.getCmp('login-form-email').setValue('');
                            }

                        }
                    }]
                });
            }

            win.show();

            //

            // Remove the global loading message
            Ext.get('loading').remove();
            Ext.fly('loading-mask').fadeOut({ remove : true });

            // We load flickR
            this.storeFlickr.load({

                callback: function() {

                    // We put the elephpants !
                    Ext.each(this.data.items, function(item) {

                        Ext.DomHelper.append('elephpants-images', {
                            tag: 'a',
                            href: item.data.link,
                            html: '<img src="'+ item.data.img +'" />',
                            target: '_blank'
                        });
                    });
                }
            });
        }
    };
}();

Ext.EventManager.onDocumentReady(PhDOE_loginPage.init, PhDOE_loginPage, true);
