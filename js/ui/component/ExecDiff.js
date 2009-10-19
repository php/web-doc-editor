Ext.namespace('ui','ui.component');

// ExecDiff
// config - {prefix, fid, fpath, fname, rev1, rev2}
ui.component.ExecDiff = Ext.extend(Ext.Panel,
{
    layout     : 'fit',
    title      : _('Diff From VCS'),
    height     : 150,
    autoScroll : true,
    collapsed  : true,
    listeners  : {
        render : function()
        {
            // Load diff data
            XHR({
                scope   : this,
                params  : {
                    task     : 'getDiff2',
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
                }
            });
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            html : '<div id="' + this.prefix + '-diff-' + this.fid +
                    '" class="diff-content"></div>'
        });
        ui.component.ExecDiff.superclass.initComponent.call(this);
    }
});
