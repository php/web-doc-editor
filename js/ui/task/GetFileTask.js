Ext.namespace('ui','ui.task');

// config - { prefix, ftype, fid, fpath, fname }
ui.task.GetFileTask = function(config)
{
    Ext.apply(this, config);

    var id_prefix    = this.prefix + '-' + this.ftype,
        readOriginal = ( this.ftype === 'NotInEN')    ? true : false,
        ggTranslate  = ( this.ftype === 'GGTRANS' ) ? true : false,
        skeleton     = ( this.ftype === 'NEW' ) ? this.skeleton : false;

    // Mask the panel
    Ext.get(id_prefix + '-PANEL-' + this.fid).mask(
        '<img src="themes/img/loading.gif" ' +
            'style="vertical-align: middle;" /> '+
        _('Loading...')
    );

    // We load the File
    XHR({
        scope  : this,
        params : {
            task        : 'getFile',
            FilePath    : this.fpath,
            FileName    : this.fname,
            readOriginal: readOriginal,
            ggTranslate : ggTranslate,
            skeleton    : skeleton
        },
        success : function(r)
        {
            var o    = Ext.util.JSON.decode(r.responseText),
                path = 'http://' + window.location.host + ':' + window.location.port + window.location.pathname
                       + '?perm=/' + this.fpath.split('/')[0] + '/' + o.xmlid.split('|')[0] + '.php&project=' + PhDOE.project,
                perm = '<a href="' + path + '" target="_blank"><img src="themes/img/anchor.png" alt="permlink" style="vertical-align: middle;" ext:qtip="' + _('Permanent link to this page') + '" /></a>&nbsp;',
                p    = Ext.getCmp(id_prefix + '-PANEL-' + this.fid),
                pEl  = Ext.get(id_prefix + '-PANEL-' + this.fid),
                f    = Ext.getCmp(id_prefix + '-FILE-' + this.fid),
				fileModifiedInfo = (o.fileModified) ? Ext.util.JSON.decode(o.fileModified) : false;

            // We set the permLink (exclude for file patch)
            if( this.prefix === 'PP' ||
                this.ftype  === 'TRANS' ||
                this.prefix === 'FNIEN'
              )
            {
                p.permlink = '';
            } else if( this.ftype  === 'GGTRANS' ) {
                p.setTitle(p.originTitle);
                p.setIconClass('iconGoogle');
            } else {
                p.permlink = (o.xmlid != 'NULL') ? perm : '';
                p.setTitle(p.permlink + p.originTitle);
            }

            // We define the content into the editor
            f.setCode(o.content);

            // If this is and automatic translation from Google API, we reint the file now.
            if( this.ftype  === 'GGTRANS' ) {
                f.reIndentAll();
            }

            // Remove the mask from the editor
            pEl.unmask();

            if( o.warn_tab && !this.freadOnly  ) {

                // Display a warn message if this file containes some tab caracter.
                Ext.MessageBox.show({
                    title   : _('Warning'),
                    msg     : String.format(_('The file <b> {0}</b> contains some tab characters.<br>The editor have replace it with space characters.'), this.fpath+this.fname),
                    buttons : Ext.MessageBox.OK,
                    icon    : Ext.MessageBox.WARNING
                });

                // Mark as dirty this editor now
                f.manageCodeChange(id_prefix + '-FILE-' + this.fid);
            }

            if( o.warn_encoding && !this.freadOnly ) {

                // Display a warn message if this file containes some tab caracter.
                Ext.MessageBox.show({
                    title   : _('Warning'),
                    msg     : String.format(_('The editor have modified automatically the file {0} into UTF-8 encoding.'), this.fpath+this.fname),
                    buttons : Ext.MessageBox.OK,
                    icon    : Ext.MessageBox.WARNING
                });

                f.setLineContent(1, '<?xml version="1.0" encoding="utf-8"?>');

                // Mark as dirty this editor now
                Ext.getCmp(id_prefix + '-FILE-' + this.fid +'-btn-save').enable();
            }
            
            var dataModified;
            
            if( this.prefix === 'FNT' || this.prefix === 'FNIEN' ) { dataModified = 'fileModified'; }
            if( this.prefix === 'FNU' ) { dataModified = (this.ftype === 'LANG') ? 'fileModifiedLang' : 'fileModifiedEN'; }
            if( this.prefix === 'FE'  ) { dataModified = (this.ftype === 'LANG') ? 'fileModifiedLang' : 'fileModifiedEN'; }
            if( this.prefix === 'FNR' ) { dataModified = (this.ftype === 'LANG') ? 'fileModifiedLang' : 'fileModifiedEN'; }


            // We ensure that this file have been marked as modified into the store
            if( o.fileModified && this.prefix !== 'AF' ) {
                this.storeRecord.set(dataModified, o.fileModified);
                this.storeRecord.commit();
            }

            // Special case for AF module
            if( this.prefix === 'AF' ) {

                this.storeRecord.data = {};

                this.storeRecord.data.fileModified = false;
                if( o.fileModified ) {
                    this.storeRecord.data.fileModified = o.fileModified;
                }
            }

            // This file have been modified by a different user than the current one.
            if( o.fileModified && ( fileModifiedInfo.user !== PhDOE.user.login || fileModifiedInfo.anonymousIdent !== PhDOE.user.anonymousIdent ) ) {

                // If the current user is an authenticate user & the user who have modified this file is an anonymous, we allow to modify this file
				if( fileModifiedInfo.isAnonymous  && !PhDOE.isAnonymous ) {
					
					Ext.MessageBox.show({
                        title   : _('Information'),
                        msg     : 'Fichier modifié par '+fileModifiedInfo.user.ucFirst()+' mais vous êtes un utilisateur authentifié, vous pouvez donc le modifier.',
                        buttons : Ext.MessageBox.OK,
                        icon    : Ext.MessageBox.INFO
                    });
					
				} else {						
	                if( !this.freadOnly ) {
	                    // We disable save group, undoRdeo group, and tools group from the toolBars
	                    Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-grp-save').disable();
	                    Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-grp-undoRedo').disable();
	                    Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-grp-tools').disable();
	                }
	
	                // If the current user isn't the user who have modified this file, we disable the panel
	
	                var mess = Ext.MessageBox.show({
	                    title   : _('Information'),
	                    msg     : 'Fichier modifié par '+fileModifiedInfo.user.ucFirst(),
	                    buttons : Ext.MessageBox.OK,
	                    icon    : Ext.MessageBox.INFO
	                });
	
	                mess.getDialog().mask.resize(pEl.getSize().width, pEl.getSize().height);
	                mess.getDialog().mask.alignTo(pEl.dom, "tl");
				}
            }
        },
        callback : function()
        {
            var tab = Ext.getCmp(this.prefix + '-' + this.fid);

            // Mark FNT panel as loaded
            if( this.prefix == 'FNT' ) {
                if( this.ftype == 'TRANS' ) {
                    tab.panTRANSLoaded = true;
                }
                if( this.ftype == 'GGTRANS' ) {
                    tab.panGGTRANSLoaded = true;
                }
            }

            // Mark FNU panel as loaded
            if( this.prefix == 'FNU' ) {
                if( this.ftype == 'LANG' ) {
                    tab.panLANGLoaded = true;
                }
                if( this.ftype == 'EN' ) {
                    tab.panENLoaded = true;
                }
            }

            // Mark FE panel as loaded
            if( this.prefix == 'FE' ) {
                if( this.ftype == 'LANG' ) {
                    tab.panLANGLoaded = true;
                }
                if( this.ftype == 'EN' ) {
                    tab.panENLoaded = true;
                }
            }

            // Mark FNR panel as loaded
            if( this.prefix == 'FNR' ) {
                if( this.ftype == 'LANG' ) {
                    tab.panLANGLoaded = true;
                }
                if( this.ftype == 'EN' ) {
                    tab.panENLoaded = true;
                }
            }

            // Mark FNIEN panel as loaded
            if( this.prefix == 'FNIEN' ) {
                tab.panLANGLoaded = true;
            }

            // Mark AF panel as loaded
            if( this.prefix == 'AF' ) {
                tab.panLoaded = true;
            }

            // Mark PP panel as loaded
            if( this.prefix == 'PP' ) {
                if( this.ftype == 'PATCH' ) {
                    tab.panPatchLoaded = true;
                }
                if( this.ftype == 'ORIGIN' ) {
                    tab.panOriginLoaded = true;
                }
            }

            Ext.getCmp('main-panel').fireEvent('tabLoaded', this.prefix, this.fid);
        }
    });
};