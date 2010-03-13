Ext.namespace('ui','ui.task');

// config - { prefix, ftype, fid, fpath, fname }
ui.task.GetFileTask = function(config)
{
    Ext.apply(this, config);

    var id_prefix    = this.prefix + '-' + this.ftype,
        readOriginal = (this.ftype == 'NotInEN')    ? true : false,
        ggTranslate  = ( this.ftype === 'GGTRANS' ) ? true : false;

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
            ggTranslate : ggTranslate
        },
        success : function(r)
        {
            var o    = Ext.util.JSON.decode(r.responseText),
                path = 'http://' + window.location.host + ':' + window.location.port + window.location.pathname
                       + '?perm=/' + this.fpath.split('/')[0] + '/' + o.xmlid.split('|')[0] + '.php&project=' + PhDOE.project,
                perm = '<a href="' + path + '" target="_blank"><img src="themes/img/anchor.png" alt="permlink" style="vertical-align: middle;" ext:qtip="' + _('Permanent link to this page') + '" /></a>&nbsp;',
                p    = Ext.getCmp(id_prefix + '-PANEL-' + this.fid);

            // We set the permLink (exclude for file patch)
            if( this.prefix === 'PP' ||
                this.ftype  === 'TRANS' ||
                this.prefix === 'FNIEN'
              )
            {
                p.permlink = '';
            } else if( this.ftype  === 'GGTRANS' )
            {
                p.setTitle('<img src="themes/img/google.png" alt="permlink" style="vertical-align: middle;"> ' + p.originTitle);
            } else {
                p.permlink = (o.xmlid != 'NULL') ? perm : '';
                p.setTitle(p.permlink + p.originTitle);
            }

            // We define the content into the editor
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).setCode(o.content);

            // If this is and automatic translation from Google API, we reint the file now.
            if( this.ftype  === 'GGTRANS' ) {
                Ext.getCmp(id_prefix + '-FILE-' + this.fid).reIndentAll();
            }

            // Remove the mask from the editor
            Ext.get(id_prefix + '-PANEL-' + this.fid).unmask();

            if( o.warn_tab ) {

                // Display a warn message if this file containes some tab caracter.
                Ext.MessageBox.show({
                    title: _('Warning'),
                    msg: String.format(_('The file <b> {0}</b> contains some tab caracters.<br>The editor have replace it with space caracters.'), this.fpath+this.fname),
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });

                // Mark as dirty this editor now
                Ext.getCmp(id_prefix + '-FILE-' + this.fid).manageCodeChange(id_prefix + '-FILE-' + this.fid);

            }

        },
        callback : function()
        {

            // Mark FNT panel as loaded
            if( this.prefix == 'FNT' ) {
                if( this.ftype == 'TRANS' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panTRANSLoaded = true;
                }
                if( this.ftype == 'GGTRANS' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panGGTRANSLoaded = true;
                }
            }

            // Mark FNU panel as loaded
            if( this.prefix == 'FNU' ) {
                if( this.ftype == 'LANG' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panLANGLoaded = true;
                }
                if( this.ftype == 'EN' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panENLoaded = true;
                }
            }

            // Mark FE panel as loaded
            if( this.prefix == 'FE' ) {
                if( this.ftype == 'LANG' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panLANGLoaded = true;
                }
                if( this.ftype == 'EN' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panENLoaded = true;
                }
            }

            // Mark FNR panel as loaded
            if( this.prefix == 'FNR' ) {
                if( this.ftype == 'LANG' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panLANGLoaded = true;
                }
                if( this.ftype == 'EN' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panENLoaded = true;
                }
            }

            // Mark FNIEN panel as loaded
            if( this.prefix == 'FNIEN' ) {
                Ext.getCmp(this.prefix + '-' + this.fid).panLANGLoaded = true;
            }

            // Mark AF panel as loaded
            if( this.prefix == 'AF' ) {
                Ext.getCmp(this.prefix + '-' + this.fid).panLoaded = true;
            }

            // Mark PP panel as loaded
            if( this.prefix == 'PP' ) {
                if( this.ftype == 'PATCH' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panPatchLoaded = true;
                }
                if( this.ftype == 'ORIGIN' ) {
                    Ext.getCmp(this.prefix + '-' + this.fid).panOriginLoaded = true;
                }
            }

            Ext.getCmp('main-panel').fireEvent('tabLoaded', this.prefix, this.fid);

        }
    });
};