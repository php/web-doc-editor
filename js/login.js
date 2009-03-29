// create namespace for plugins
Ext.namespace('Ext.ux.plugins');
 
/**
 * Ext.ux.plugins.IconCombo plugin for Ext.form.Combobox
 *
 * @author  Ing. Jozef Sakalos
 * @date    January 7, 2008
 *
 * @class Ext.ux.plugins.IconCombo
 * @extends Ext.util.Observable
 */
Ext.ux.plugins.IconCombo = function(config) {
    Ext.apply(this, config);
};
 
// plugin code
Ext.extend(Ext.ux.plugins.IconCombo, Ext.util.Observable, {
    init:function(combo) {
        Ext.apply(combo, {
            tpl:  '<tpl for=".">'
                + '<div class="x-combo-list-item ux-icon-combo-item '
                + '{' + combo.iconClsField + '}">'
                + '{' + combo.displayField + '}'
                + '</div></tpl>',
 
            onRender:combo.onRender.createSequence(function(ct, position) {
                // adjust styles
                this.wrap.applyStyles({position:'relative'});
                this.el.addClass('ux-icon-combo-input');
 
                // add div for icon
                this.icon = Ext.DomHelper.append(this.el.up('div.x-form-field-wrap'), {
                    tag: 'div', style:'position:absolute'
                });
            }), // end of function onRender
 
            setIconCls:function() {
                var rec = this.store.query(this.valueField, this.getValue()).itemAt(0);
                if(rec) {
                    this.icon.className = 'ux-icon-combo-icon ' + rec.get(this.iconClsField);
                }
            }, // end of function setIconCls
 
            setValue:combo.setValue.createSequence(function(value) {
                this.setIconCls();
            })
        });
    } // end of function init
}); // end of extend


var loginPage = function() {
  Ext.QuickTips.init();
  Ext.BLANK_IMAGE_URL = '/extjs/resources/images/default/s.gif';

  return {

    init: function() {

      this.drawForm();

    }, //init

    drawForm: function() {

    var win, language;



        if( !win ) {
            win = new Ext.Window({
                layout      : 'border',
                width       : 380,
                height      : 250,
                closable    : false,
                closeAction :'hide',
                resizable   : false,
                plain       : true,
                title       : 'Control Access',
                iconCls     : 'key',
                listeners: {
                  render: function() {
                    new Ext.util.DelayedTask(function(){
                        Ext.getCmp('login-form-cvsLogin').focus();
                    }).delay(200);
                  }
                },
                items       : [{
                            xtype     : 'panel',
                            baseCls   : 'x-plain',
                            id        : 'login-logo',
                            region    : 'center',
                            bodyStyle : 'margin:4px 4px 4px 8px',
                            html      : '<img src="/img/logo.png" />'
                        },{
                            xtype       : 'form',
                            region      : 'south',
                            id          : 'login-form',
                            url         : '../php/controller.php',
                            bodyStyle   : 'padding:5px 5px 0',
                            border      : false,
                            height      : 100,
                            width       : 350,
                            labelWidth  : 110,
                            defaults    : {width: 217},
                            defaultType : 'textfield',
                            items: [{
                                    fieldLabel : 'Cvs login',
                                    name       : 'cvsLogin',
                                    id         : 'login-form-cvsLogin',
                                    allowBlank : false,
                                    enableKeyEvents: true,
                                    listeners: {
                                      keypress: function(field, e) {
                                        if( e.getKey() == e.ENTER ) {
                                          Ext.getCmp('login-form-cvsPasswd').focus();
                                        }
                                      }
                                    }
                                },{
                                    fieldLabel : 'Cvs password',
                                    allowBlank : false,
                                    name       : 'cvsPassword',
                                    id         : 'login-form-cvsPasswd',
                                    inputType  : 'password',
                                    enableKeyEvents: true,
                                    listeners: {
                                      keypress: function(field, e) {
                                        if( e.getKey() == e.ENTER ) {
                                          Ext.getCmp('login-btn').fireEvent('click');
                                        }
                                      }
                                    }
                                },{
                                    xtype     : 'combo',
                                    width     : 235,
                                    fieldLabel: 'Translate module',
                                    store     : new Ext.data.SimpleStore({
                                                  fields: ['countryCode', 'countryName', 'countryFlag'],
                                                  data  : [
                                                      ['ar', 'Arabic', 'flag-ar'],
                                                      ['pt_BR', 'Brazilian Portuguese', 'flag-pt_BR'],
                                                      ['bg', 'Bulgarian', 'flag-bg'],
                                                      ['zh', 'Chinese (Simplified)', 'flag-zh'],
                                                      ['hk', 'Chinese (Hong Kong Cantonese)', 'flag-hk'],
                                                      ['tw', 'Chinese (Traditional)', 'flag-tw'],
                                                      ['cs', 'Czech', 'flag-cs'],
                                                      ['da', 'Denmark', 'flag-da'],
                                                      ['nl', 'Dutch', 'flag-nl'],
                                                      ['en', 'English', 'flag-en'],
                                                      ['fi', 'Finnish', 'flag-fi'],
                                                      ['fr', 'French', 'flag-fr'],
                                                      ['de', 'Germany', 'flag-de'],
                                                      ['el', 'Greek', 'flag-el'],
                                                      ['he', 'Hebrew', 'flag-he'],
                                                      ['hu', 'Hungarian', 'flag-hu'],
                                                      ['it', 'Italian', 'flag-it'],
                                                      ['ja', 'Japanese', 'flag-ja'],
                                                      ['kr', 'Korean', 'flag-kr'],
                                                      ['no', 'Norwegian', 'flag-no'],
                                                      ['fa', 'Persian', 'flag-fa'],
                                                      ['pl', 'Polish', 'flag-pl'],
                                                      ['pt', 'Portuguese', 'flag-pt'],
                                                      ['ro', 'Romanian', 'flag-ro'],
                                                      ['ru', 'Russian', 'flag-ru'],
                                                      ['se', 'Serbian', 'flag-se'],
                                                      ['sk', 'Slovak', 'flag-sk'],
                                                      ['sl', 'Slovenian', 'flag-sl'],
                                                      ['es', 'Spanish', 'flag-es'],
                                                      ['sv', 'Swedish', 'flag-fi'],
                                                      ['tr', 'Turkish', 'flag-tr']
                                                  ]
                                    }),
                                    plugins       : new Ext.ux.plugins.IconCombo(),
                                    valueField    : 'countryCode',
                                    listWidth     : 235,
                                    maxHeight     : 150,
                                    editable      : false,
                                    value         : 'ar',
                                    id            : 'login-form-lang',
                                    name          : 'langDisplay',
                                    displayField  : 'countryName',
                                    iconClsField  : 'countryFlag',
                                    triggerAction : 'all',
                                    mode          : 'local'
                                }
                            ]
                        }],
                        buttons: [{
                            text     : 'Login',
                            id       : 'login-btn',
                            disabled : false,
                            listeners: {
                              click: function() {
                                Ext.getCmp('login-form').getForm().submit({
                                  method:'POST', 
                                  params: {
                                    lang : Ext.getCmp('login-form-lang').getValue(),
                                    task : 'login'
                                  },
                                  waitTitle:'Connecting', 
                                  waitMsg:'Sending data...',
                                  success:function(form, action) {
                                    window.location.href = '/';
                                  },
                                  failure:function(form, action) {
                                   if( action.response ) {
                                    var o = Ext.util.JSON.decode(action.response.responseText); 

                                    if( o.msg == 'Bad cvs password' || o.msg == 'Bad db password' ) {
                                      Ext.Msg.show({
                                         title:'Error',
                                         msg: 'Bad password.<br>Please, try again.',
                                         buttons: Ext.Msg.OK,
                                         fn: function() { Ext.getCmp('login-form-cvsPasswd').focus(); },
                                         icon: Ext.MessageBox.ERROR
                                      });
                                    }
                                    if( o.msg == 'unknow from cvs' ) {
                                      Ext.Msg.show({
                                         title:'Error',
                                         msg: 'This user is unknow from Php cvs server.<br>Please, try again.',
                                         buttons: Ext.Msg.OK,
                                         fn: function() { Ext.getCmp('login-form-cvsPasswd').focus(); },
                                         icon: Ext.MessageBox.ERROR
                                      });
                                    }


                                   }
                                  }

                                });
                              }
                            }
                        }]
            });
        }
        win.show();

        // Remove the global loading message
        Ext.get('loading').remove();
        Ext.fly('loading-mask').fadeOut({remove:true});

    } //drawForm

  };

}();

Ext.EventManager.onDocumentReady(loginPage.init, loginPage, true);
