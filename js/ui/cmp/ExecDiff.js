Ext.namespace('ui','ui.cmp');

// ExecDiff
// config - {prefix, fid, fpath, fname, rev1, rev2}
ui.cmp.ExecDiff = Ext.extend(Ext.Panel,
{
    layout           : 'fit',
    title            : _('Diff From VCS'),
    iconCls          : 'iconDiffView',
    collapsedIconCls : 'iconDiffView',
    autoScroll       : true,
    plugins          : [Ext.ux.PanelCollapsedTitle],
    onRender         : function(ct, position)
    {
        ui.cmp.ExecDiff.superclass.onRender.call(this, ct, position);
        this.el.mask(
            '<img src="themes/img/loading.gif" ' +
                'style="vertical-align: middle;" /> '+
            _('Loading...')
        );

        // Load diff data
        XHR({
            scope   : this,
            params  : {
                task     : 'getDiff',
                DiffType : 'vcs',
                FilePath : 'en' + this.fpath,
                FileName : this.fname,
                Rev1     : this.rev1,
                Rev2     : this.rev2
            },
            success : function(response)
            {
                var o = Ext.util.JSON.decode(response.responseText);
                // We display in diff div
                Ext.get(this.prefix + '-diff-' + this.fid).dom.innerHTML = o.content;

                this.el.unmask();

            },
            callback: function() {
                Ext.getCmp(this.prefix + '-' + this.fid).panDiffLoaded = true;
                Ext.getCmp('main-panel').fireEvent('tabLoaded', this.prefix, this.fid);
            }
        });
    },
    initComponent : function()
    {
        Ext.apply(this,
        {
            html : '<div id="' + this.prefix + '-diff-' + this.fid +
                    '" class="diff-content"></div>'
        });
        ui.cmp.ExecDiff.superclass.initComponent.call(this);
    }
});
