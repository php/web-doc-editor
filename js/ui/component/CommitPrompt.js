Ext.namespace('ui','ui.component');

// config - { files: {fid, fpath, fname, fdbid} }
ui.component.CommitPrompt = Ext.extend(Ext.Window,
{
    id         : 'winVCSCommit',
    layout     : 'form',
    title      : _('VCS commit'),
    iconCls    : 'iconPendingCommit',
    closable   : false,
    width      : 400,
    height     : 480,
    resizable  : false,
    modal      : true,
    bodyStyle  : 'padding:5px 5px 0',
    labelAlign : 'top',
    tools      : [{
        id      : 'gear',
        qtip    : _('Configure this tools'),
        handler : function()
        {
            if( ! Ext.getCmp('commit-log-win') )
            {
                new ui.component.CommitLogManager();
            }
            Ext.getCmp('commit-log-win').show(this.id);
        }
    }],
    buttons : [{
        id      : 'win-commit-btn-submit',
        text    : _('Submit'),
        handler : function()
        {
            new ui.task.VCSCommitTask();
        }
    }, {
        id      : 'win-commit-btn-close',
        text    : _('Close'),
        handler : function()
        {
            Ext.getCmp('winVCSCommit').close();
        }
    }],
    initComponent : function()
    {
        var root = new Ext.tree.TreeNode({
            text     : 'root',
            expanded : true
        }), i;

        for (i = 0; i < this.files.length; ++i) {
            root.appendChild(
                new Ext.tree.TreeNode({
                    id         : 'need-commit-' + this.files[i].fid,
                    text       : this.files[i].fpath + this.files[i].fname,
                    FileDBID   : this.files[i].fdbid,
                    FilePath   : this.files[i].fpath,
                    FileName   : this.files[i].fname,
                    leaf       : true,
                    checked    : true
                })
            );
        }

        Ext.apply(this,
        {
            items : [{
                xtype       : 'treepanel',
                id          : 'commit-tree-panel',
                anchor      : '100%',
                height      : 180,
                autoScroll  : true,
                rootVisible : false,
                root        : root
            }, {
                xtype         : 'combo',
                name          : 'first2',
                fieldLabel    : _('Older messages'),
                editable      : false,
                anchor        : '100%',
                store         : ui.component._CommitLogManager.store,
                triggerAction : 'all',
                tpl           : '<tpl for="."><div class="x-combo-list-item">{[values.text.split("\n").join("<br/>")]}</div></tpl>',
                valueField    : 'id',
                displayField  : 'text',
                listeners : {
                    select : function(combo, record, numIndex)
                    {
                        Ext.getCmp('form-commit-message-log').setValue(record.data.text);
                    }
                }
            }, {
                xtype      : 'textarea',
                id         : 'form-commit-message-log',
                name       : 'first3',
                fieldLabel : _('Log message'),
                anchor     : '100%',
                height     : 150,
                value      : ''
            }]
        });
        ui.component.CommitPrompt.superclass.initComponent.call(this);
    }
});