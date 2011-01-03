Ext.BLANK_IMAGE_URL = 'http://extjs.cachefly.net/ext-3.2.0/resources/images/default/s.gif';

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
}/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
Ext.ux.PortalColumn = Ext.extend(Ext.Container, {
    layout : 'anchor',
    //autoEl : 'div',//already defined by Ext.Component
    defaultType : 'portlet',
    cls : 'x-portal-column'
});

Ext.reg('portalcolumn', Ext.ux.PortalColumn);/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
Ext.ux.Portal = Ext.extend(Ext.Panel, {
    layout : 'column',
    autoScroll : true,
    cls : 'x-portal',
    defaultType : 'portalcolumn',

    initComponent : function(){
        Ext.ux.Portal.superclass.initComponent.call(this);
        this.addEvents({
            validatedrop:true,
            beforedragover:true,
            dragover:true,
            beforedrop:true,
            drop:true
        });
    },

    initEvents : function(){
        Ext.ux.Portal.superclass.initEvents.call(this);
        this.dd = new Ext.ux.Portal.DropZone(this, this.dropConfig);
    },

    beforeDestroy : function() {
        if(this.dd){
            this.dd.unreg();
        }
        Ext.ux.Portal.superclass.beforeDestroy.call(this);
    }
});

Ext.reg('portal', Ext.ux.Portal);


Ext.ux.Portal.DropZone = function(portal, cfg){
    this.portal = portal;
    Ext.dd.ScrollManager.register(portal.body);
    Ext.ux.Portal.DropZone.superclass.constructor.call(this, portal.bwrap.dom, cfg);
    portal.body.ddScrollConfig = this.ddScrollConfig;
};

Ext.extend(Ext.ux.Portal.DropZone, Ext.dd.DropTarget, {
    ddScrollConfig : {
        vthresh: 50,
        hthresh: -1,
        animate: true,
        increment: 200
    },

    createEvent : function(dd, e, data, col, c, pos){
        return {
            portal: this.portal,
            panel: data.panel,
            columnIndex: col,
            column: c,
            position: pos,
            data: data,
            source: dd,
            rawEvent: e,
            status: this.dropAllowed
        };
    },

    notifyOver : function(dd, e, data){
        var xy = e.getXY(), portal = this.portal, px = dd.proxy;

        // case column widths
        if(!this.grid){
            this.grid = this.getGrid();
        }

        // handle case scroll where scrollbars appear during drag
        var cw = portal.body.dom.clientWidth;
        if(!this.lastCW){
            this.lastCW = cw;
        }else if(this.lastCW != cw){
            this.lastCW = cw;
            portal.doLayout();
            this.grid = this.getGrid();
        }

        // determine column
        var col = 0, xs = this.grid.columnX, cmatch = false;
        for(var len = xs.length; col < len; col++){
            if(xy[0] < (xs[col].x + xs[col].w)){
                cmatch = true;
                break;
            }
        }
        // no match, fix last index
        if(!cmatch){
            col--;
        }

        // find insert position
        var p, match = false, pos = 0,
            c = portal.items.itemAt(col),
            items = c.items.items, overSelf = false;

        for(var len = items.length; pos < len; pos++){
            p = items[pos];
            var h = p.el.getHeight();
            if(h === 0){
                overSelf = true;
            }
            else if((p.el.getY()+(h/2)) > xy[1]){
                match = true;
                break;
            }
        }

        pos = (match && p ? pos : c.items.getCount()) + (overSelf ? -1 : 0);
        var overEvent = this.createEvent(dd, e, data, col, c, pos);

        if(portal.fireEvent('validatedrop', overEvent) !== false &&
           portal.fireEvent('beforedragover', overEvent) !== false){

            // make sure proxy width is fluid
            px.getProxy().setWidth('auto');

            if(p){
                px.moveProxy(p.el.dom.parentNode, match ? p.el.dom : null);
            }else{
                px.moveProxy(c.el.dom, null);
            }

            this.lastPos = {c: c, col: col, p: overSelf || (match && p) ? pos : false};
            this.scrollPos = portal.body.getScroll();

            portal.fireEvent('dragover', overEvent);

            return overEvent.status;
        }else{
            return overEvent.status;
        }

    },

    notifyOut : function(){
        delete this.grid;
    },

    notifyDrop : function(dd, e, data){
        delete this.grid;
        if(!this.lastPos){
            return;
        }
        var c = this.lastPos.c, col = this.lastPos.col, pos = this.lastPos.p;

        var dropEvent = this.createEvent(dd, e, data, col, c,
            pos !== false ? pos : c.items.getCount());

        if(this.portal.fireEvent('validatedrop', dropEvent) !== false &&
           this.portal.fireEvent('beforedrop', dropEvent) !== false){

            dd.proxy.getProxy().remove();
            dd.panel.el.dom.parentNode.removeChild(dd.panel.el.dom);

            if(pos !== false){
                if(c == dd.panel.ownerCt && (c.items.items.indexOf(dd.panel) <= pos)){
                    pos++;
                }
                c.insert(pos, dd.panel);
            }else{
                c.add(dd.panel);
            }

            c.doLayout();

            this.portal.fireEvent('drop', dropEvent);

            // scroll position is lost on drop, fix it
            var st = this.scrollPos.top;
            if(st){
                var d = this.portal.body.dom;
                setTimeout(function(){
                    d.scrollTop = st;
                }, 10);
            }

        }
        delete this.lastPos;
    },

    // internal cache of body and column coords
    getGrid : function(){
        var box = this.portal.bwrap.getBox();
        box.columnX = [];
        this.portal.items.each(function(c){
             box.columnX.push({x: c.el.getX(), w: c.el.getWidth()});
        });
        return box;
    },

    // unregister the dropzone from ScrollManager
    unreg: function() {
        //Ext.dd.ScrollManager.unregister(this.portal.body);
        Ext.ux.Portal.DropZone.superclass.unreg.call(this);
    }
});
/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
Ext.ux.Portlet = Ext.extend(Ext.Panel, {
    anchor : '100%',
    frame : true,
    collapsible : true,
    draggable : true,
    cls : 'x-portlet'
});

Ext.reg('portlet', Ext.ux.Portlet);/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ns('Ext.ux.grid');

/**
 * @class Ext.ux.grid.RowEditor
 * @extends Ext.Panel
 * Plugin (ptype = 'roweditor') that adds the ability to rapidly edit full rows in a grid.
 * A validation mode may be enabled which uses AnchorTips to notify the user of all
 * validation errors at once.
 *
 * @ptype roweditor
 */
Ext.ux.grid.RowEditor = Ext.extend(Ext.Panel, {
    floating: true,
    shadow: false,
    layout: 'hbox',
    cls: 'x-small-editor',
    buttonAlign: 'center',
    baseCls: 'x-row-editor',
    elements: 'header,footer,body',
    frameWidth: 5,
    buttonPad: 3,
    clicksToEdit: 'auto',
    monitorValid: true,
    focusDelay: 250,
    errorSummary: true,

    saveText: 'Save',
    cancelText: 'Cancel',
    commitChangesText: 'You need to commit or cancel your changes',
    errorText: 'Errors',

    defaults: {
        normalWidth: true
    },

    initComponent: function(){
        Ext.ux.grid.RowEditor.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event beforeedit
             * Fired before the row editor is activated.
             * If the listener returns <tt>false</tt> the editor will not be activated.
             * @param {Ext.ux.grid.RowEditor} roweditor This object
             * @param {Number} rowIndex The rowIndex of the row just edited
             */
            'beforeedit',
            /**
             * @event canceledit
             * Fired when the editor is cancelled.
             * @param {Ext.ux.grid.RowEditor} roweditor This object
             * @param {Boolean} forced True if the cancel button is pressed, false is the editor was invalid.
             */
            'canceledit',
            /**
             * @event validateedit
             * Fired after a row is edited and passes validation.
             * If the listener returns <tt>false</tt> changes to the record will not be set.
             * @param {Ext.ux.grid.RowEditor} roweditor This object
             * @param {Object} changes Object with changes made to the record.
             * @param {Ext.data.Record} r The Record that was edited.
             * @param {Number} rowIndex The rowIndex of the row just edited
             */
            'validateedit',
            /**
             * @event afteredit
             * Fired after a row is edited and passes validation.  This event is fired
             * after the store's update event is fired with this edit.
             * @param {Ext.ux.grid.RowEditor} roweditor This object
             * @param {Object} changes Object with changes made to the record.
             * @param {Ext.data.Record} r The Record that was edited.
             * @param {Number} rowIndex The rowIndex of the row just edited
             */
            'afteredit'
        );
    },

    init: function(grid){
        this.grid = grid;
        this.ownerCt = grid;
        if(this.clicksToEdit === 2){
            grid.on('rowdblclick', this.onRowDblClick, this);
        }else{
            grid.on('rowclick', this.onRowClick, this);
            if(Ext.isIE){
                grid.on('rowdblclick', this.onRowDblClick, this);
            }
        }

        // stopEditing without saving when a record is removed from Store.
        grid.getStore().on('remove', function() {
            this.stopEditing(false);
        },this);

        grid.on({
            scope: this,
            keydown: this.onGridKey,
            columnresize: this.verifyLayout,
            columnmove: this.refreshFields,
            reconfigure: this.refreshFields,
            beforedestroy : this.beforedestroy,
            destroy : this.destroy,
            bodyscroll: {
                buffer: 250,
                fn: this.positionButtons
            }
        });
        grid.getColumnModel().on('hiddenchange', this.verifyLayout, this, {delay:1});
        grid.getView().on('refresh', this.stopEditing.createDelegate(this, []));
    },

    beforedestroy: function() {
        this.stopMonitoring();
        this.grid.getStore().un('remove', this.onStoreRemove, this);
        this.stopEditing(false);
        Ext.destroy(this.btns, this.tooltip);
    },

    refreshFields: function(){
        this.initFields();
        this.verifyLayout();
    },

    isDirty: function(){
        var dirty;
        this.items.each(function(f){
            if(String(this.values[f.id]) !== String(f.getValue())){
                dirty = true;
                return false;
            }
        }, this);
        return dirty;
    },

    startEditing: function(rowIndex, doFocus){
        if(this.editing && this.isDirty()){
            this.showTooltip(this.commitChangesText);
            return;
        }
        if(Ext.isObject(rowIndex)){
            rowIndex = this.grid.getStore().indexOf(rowIndex);
        }
        if(this.fireEvent('beforeedit', this, rowIndex) !== false){
            this.editing = true;
            var g = this.grid, view = g.getView(),
                row = view.getRow(rowIndex),
                record = g.store.getAt(rowIndex);

            this.record = record;
            this.rowIndex = rowIndex;
            this.values = {};
            if(!this.rendered){
                this.render(view.getEditorParent());
            }
            var w = Ext.fly(row).getWidth();
            this.setSize(w);
            if(!this.initialized){
                this.initFields();
            }
            var cm = g.getColumnModel(), fields = this.items.items, f, val;
            for(var i = 0, len = cm.getColumnCount(); i < len; i++){
                val = this.preEditValue(record, cm.getDataIndex(i));
                f = fields[i];
                f.setValue(val);
                this.values[f.id] = Ext.isEmpty(val) ? '' : val;
            }
            this.verifyLayout(true);
            if(!this.isVisible()){
                this.setPagePosition(Ext.fly(row).getXY());
            } else{
                this.el.setXY(Ext.fly(row).getXY(), {duration:0.15});
            }
            if(!this.isVisible()){
                this.show().doLayout();
            }
            if(doFocus !== false){
                this.doFocus.defer(this.focusDelay, this);
            }
        }
    },

    stopEditing : function(saveChanges){
        this.editing = false;
        if(!this.isVisible()){
            return;
        }
        if(saveChanges === false || !this.isValid()){
            this.hide();
            this.fireEvent('canceledit', this, saveChanges === false);
            return;
        }
        var changes = {},
            r = this.record,
            hasChange = false,
            cm = this.grid.colModel,
            fields = this.items.items;
        for(var i = 0, len = cm.getColumnCount(); i < len; i++){
            if(!cm.isHidden(i)){
                var dindex = cm.getDataIndex(i);
                if(!Ext.isEmpty(dindex)){
                    var oldValue = r.data[dindex],
                        value = this.postEditValue(fields[i].getValue(), oldValue, r, dindex);
                    if(String(oldValue) !== String(value)){
                        changes[dindex] = value;
                        hasChange = true;
                    }
                }
            }
        }
        if(hasChange && this.fireEvent('validateedit', this, changes, r, this.rowIndex) !== false){
            r.beginEdit();
            Ext.iterate(changes, function(name, value){
                r.set(name, value);
            });
            r.endEdit();
            this.fireEvent('afteredit', this, changes, r, this.rowIndex);
        }
        this.hide();
    },

    verifyLayout: function(force){
        if(this.el && (this.isVisible() || force === true)){
            var row = this.grid.getView().getRow(this.rowIndex);
            this.setSize(Ext.fly(row).getWidth(), Ext.isIE ? Ext.fly(row).getHeight() + 9 : undefined);
            var cm = this.grid.colModel, fields = this.items.items;
            for(var i = 0, len = cm.getColumnCount(); i < len; i++){
                if(!cm.isHidden(i)){
                    var adjust = 0;
                    if(i === (len - 1)){
                        adjust += 3; // outer padding
                    } else{
                        adjust += 1;
                    }
                    fields[i].show();
                    fields[i].setWidth(cm.getColumnWidth(i) - adjust);
                } else{
                    fields[i].hide();
                }
            }
            this.doLayout();
            this.positionButtons();
        }
    },

    slideHide : function(){
        this.hide();
    },

    initFields: function(){
        var cm = this.grid.getColumnModel(), pm = Ext.layout.ContainerLayout.prototype.parseMargins;
        this.removeAll(false);
        for(var i = 0, len = cm.getColumnCount(); i < len; i++){
            var c = cm.getColumnAt(i),
                ed = c.getEditor();
            if(!ed){
                ed = c.displayEditor || new Ext.form.DisplayField();
            }
            if(i == 0){
                ed.margins = pm('0 1 2 1');
            } else if(i == len - 1){
                ed.margins = pm('0 0 2 1');
            } else{
                if (Ext.isIE) {
                    ed.margins = pm('0 0 2 0');
                }
                else {
                    ed.margins = pm('0 1 2 0');
                }
            }
            ed.setWidth(cm.getColumnWidth(i));
            ed.column = c;
            if(ed.ownerCt !== this){
                ed.on('focus', this.ensureVisible, this);
                ed.on('specialkey', this.onKey, this);
            }
            this.insert(i, ed);
        }
        this.initialized = true;
    },

    onKey: function(f, e){
        if(e.getKey() === e.ENTER){
            this.stopEditing(true);
            e.stopPropagation();
        }
    },

    onGridKey: function(e){
        if(e.getKey() === e.ENTER && !this.isVisible()){
            var r = this.grid.getSelectionModel().getSelected();
            if(r){
                var index = this.grid.store.indexOf(r);
                this.startEditing(index);
                e.stopPropagation();
            }
        }
    },

    ensureVisible: function(editor){
        if(this.isVisible()){
             this.grid.getView().ensureVisible(this.rowIndex, this.grid.colModel.getIndexById(editor.column.id), true);
        }
    },

    onRowClick: function(g, rowIndex, e){
        if(this.clicksToEdit == 'auto'){
            var li = this.lastClickIndex;
            this.lastClickIndex = rowIndex;
            if(li != rowIndex && !this.isVisible()){
                return;
            }
        }
        this.startEditing(rowIndex, false);
        this.doFocus.defer(this.focusDelay, this, [e.getPoint()]);
    },

    onRowDblClick: function(g, rowIndex, e){
        this.startEditing(rowIndex, false);
        this.doFocus.defer(this.focusDelay, this, [e.getPoint()]);
    },

    onRender: function(){
        Ext.ux.grid.RowEditor.superclass.onRender.apply(this, arguments);
        this.el.swallowEvent(['keydown', 'keyup', 'keypress']);
        this.btns = new Ext.Panel({
            baseCls: 'x-plain',
            cls: 'x-btns',
            elements:'body',
            layout: 'table',
            width: (this.minButtonWidth * 2) + (this.frameWidth * 2) + (this.buttonPad * 4), // width must be specified for IE
            items: [{
                ref: 'saveBtn',
                itemId: 'saveBtn',
                xtype: 'button',
                text: this.saveText,
                width: this.minButtonWidth,
                handler: this.stopEditing.createDelegate(this, [true])
            }, {
                xtype: 'button',
                text: this.cancelText,
                width: this.minButtonWidth,
                handler: this.stopEditing.createDelegate(this, [false])
            }]
        });
        this.btns.render(this.bwrap);
    },

    afterRender: function(){
        Ext.ux.grid.RowEditor.superclass.afterRender.apply(this, arguments);
        this.positionButtons();
        if(this.monitorValid){
            this.startMonitoring();
        }
    },

    onShow: function(){
        if(this.monitorValid){
            this.startMonitoring();
        }
        Ext.ux.grid.RowEditor.superclass.onShow.apply(this, arguments);
    },

    onHide: function(){
        Ext.ux.grid.RowEditor.superclass.onHide.apply(this, arguments);
        this.stopMonitoring();
        this.grid.getView().focusRow(this.rowIndex);
    },

    positionButtons: function(){
        if(this.btns){
            var g = this.grid,
                h = this.el.dom.clientHeight,
                view = g.getView(),
                scroll = view.scroller.dom.scrollLeft,
                bw = this.btns.getWidth(),
                width = Math.min(g.getWidth(), g.getColumnModel().getTotalWidth());

            this.btns.el.shift({left: (width/2)-(bw/2)+scroll, top: h - 2, stopFx: true, duration:0.2});
        }
    },

    // private
    preEditValue : function(r, field){
        var value = r.data[field];
        return this.autoEncode && typeof value === 'string' ? Ext.util.Format.htmlDecode(value) : value;
    },

    // private
    postEditValue : function(value, originalValue, r, field){
        return this.autoEncode && typeof value == 'string' ? Ext.util.Format.htmlEncode(value) : value;
    },

    doFocus: function(pt){
        if(this.isVisible()){
            var index = 0,
                cm = this.grid.getColumnModel(),
                c;
            if(pt){
                index = this.getTargetColumnIndex(pt);
            }
            for(var i = index||0, len = cm.getColumnCount(); i < len; i++){
                c = cm.getColumnAt(i);
                if(!c.hidden && c.getEditor()){
                    c.getEditor().focus();
                    break;
                }
            }
        }
    },

    getTargetColumnIndex: function(pt){
        var grid = this.grid,
            v = grid.view,
            x = pt.left,
            cms = grid.colModel.config,
            i = 0,
            match = false;
        for(var len = cms.length, c; c = cms[i]; i++){
            if(!c.hidden){
                if(Ext.fly(v.getHeaderCell(i)).getRegion().right >= x){
                    match = i;
                    break;
                }
            }
        }
        return match;
    },

    startMonitoring : function(){
        if(!this.bound && this.monitorValid){
            this.bound = true;
            Ext.TaskMgr.start({
                run : this.bindHandler,
                interval : this.monitorPoll || 200,
                scope: this
            });
        }
    },

    stopMonitoring : function(){
        this.bound = false;
        if(this.tooltip){
            this.tooltip.hide();
        }
    },

    isValid: function(){
        var valid = true;
        this.items.each(function(f){
            if(!f.isValid(true)){
                valid = false;
                return false;
            }
        });
        return valid;
    },

    // private
    bindHandler : function(){
        if(!this.bound){
            return false; // stops binding
        }
        var valid = this.isValid();
        if(!valid && this.errorSummary){
            this.showTooltip(this.getErrorText().join(''));
        }
        this.btns.saveBtn.setDisabled(!valid);
        this.fireEvent('validation', this, valid);
    },

    lastVisibleColumn : function() {
        var i = this.items.getCount() - 1,
            c;
        for(; i >= 0; i--) {
            c = this.items.items[i];
            if (!c.hidden) {
                return c;
            }
        }
    },

    showTooltip: function(msg){
        var t = this.tooltip;
        if(!t){
            t = this.tooltip = new Ext.ToolTip({
                maxWidth: 600,
                cls: 'errorTip',
                width: 300,
                title: this.errorText,
                autoHide: false,
                anchor: 'left',
                anchorToTarget: true,
                mouseOffset: [40,0]
            });
        }
        var v = this.grid.getView(),
            top = parseInt(this.el.dom.style.top, 10),
            scroll = v.scroller.dom.scrollTop,
            h = this.el.getHeight();

        if(top + h >= scroll){
            t.initTarget(this.lastVisibleColumn().getEl());
            if(!t.rendered){
                t.show();
                t.hide();
            }
            t.body.update(msg);
            t.doAutoWidth(20);
            t.show();
        }else if(t.rendered){
            t.hide();
        }
    },

    getErrorText: function(){
        var data = ['<ul>'];
        this.items.each(function(f){
            if(!f.isValid(true)){
                data.push('<li>', f.getActiveError(), '</li>');
            }
        });
        data.push('</ul>');
        return data;
    }
});
Ext.preg('roweditor', Ext.ux.grid.RowEditor);
/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
Ext.ns('Ext.ux.form');

/**
 * @class Ext.ux.form.SpinnerField
 * @extends Ext.form.NumberField
 * Creates a field utilizing Ext.ux.Spinner
 * @xtype spinnerfield
 */
Ext.ux.form.SpinnerField = Ext.extend(Ext.form.NumberField, {
    actionMode: 'wrap',
    deferHeight: true,
    autoSize: Ext.emptyFn,
    onBlur: Ext.emptyFn,
    adjustSize: Ext.BoxComponent.prototype.adjustSize,

	constructor: function(config) {
		var spinnerConfig = Ext.copyTo({}, config, 'incrementValue,alternateIncrementValue,accelerate,defaultValue,triggerClass,splitterClass');

		var spl = this.spinner = new Ext.ux.Spinner(spinnerConfig);

		var plugins = config.plugins
			? (Ext.isArray(config.plugins)
				? config.plugins.push(spl)
				: [config.plugins, spl])
			: spl;

		Ext.ux.form.SpinnerField.superclass.constructor.call(this, Ext.apply(config, {plugins: plugins}));
	},

    // private
    getResizeEl: function(){
        return this.wrap;
    },

    // private
    getPositionEl: function(){
        return this.wrap;
    },

    // private
    alignErrorIcon: function(){
        if (this.wrap) {
            this.errorIcon.alignTo(this.wrap, 'tl-tr', [2, 0]);
        }
    },

    validateBlur: function(){
        return true;
    }
});

Ext.reg('spinnerfield', Ext.ux.form.SpinnerField);

//backwards compat
Ext.form.SpinnerField = Ext.ux.form.SpinnerField;

/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.ux.Spinner
 * @extends Ext.util.Observable
 * Creates a Spinner control utilized by Ext.ux.form.SpinnerField
 */
Ext.ux.Spinner = Ext.extend(Ext.util.Observable, {
    incrementValue: 1,
    alternateIncrementValue: 5,
    triggerClass: 'x-form-spinner-trigger',
    splitterClass: 'x-form-spinner-splitter',
    alternateKey: Ext.EventObject.shiftKey,
    defaultValue: 0,
    accelerate: false,

    constructor: function(config){
        Ext.ux.Spinner.superclass.constructor.call(this, config);
        Ext.apply(this, config);
        this.mimicing = false;
    },

    init: function(field){
        this.field = field;

        field.afterMethod('onRender', this.doRender, this);
        field.afterMethod('onEnable', this.doEnable, this);
        field.afterMethod('onDisable', this.doDisable, this);
        field.afterMethod('afterRender', this.doAfterRender, this);
        field.afterMethod('onResize', this.doResize, this);
        field.afterMethod('onFocus', this.doFocus, this);
        field.beforeMethod('onDestroy', this.doDestroy, this);
    },

    doRender: function(ct, position){
        var el = this.el = this.field.getEl();
        var f = this.field;

        if (!f.wrap) {
            f.wrap = this.wrap = el.wrap({
                cls: "x-form-field-wrap"
            });
        }
        else {
            this.wrap = f.wrap.addClass('x-form-field-wrap');
        }

        this.trigger = this.wrap.createChild({
            tag: "img",
            src: Ext.BLANK_IMAGE_URL,
            cls: "x-form-trigger " + this.triggerClass
        });

        if (!f.width) {
            this.wrap.setWidth(el.getWidth() + this.trigger.getWidth());
        }

        this.splitter = this.wrap.createChild({
            tag: 'div',
            cls: this.splitterClass,
            style: 'width:13px; height:2px;'
        });
        this.splitter.setRight((Ext.isIE) ? 1 : 2).setTop(10).show();

        this.proxy = this.trigger.createProxy('', this.splitter, true);
        this.proxy.addClass("x-form-spinner-proxy");
        this.proxy.setStyle('left', '0px');
        this.proxy.setSize(14, 1);
        this.proxy.hide();
        this.dd = new Ext.dd.DDProxy(this.splitter.dom.id, "SpinnerDrag", {
            dragElId: this.proxy.id
        });

        this.initTrigger();
        this.initSpinner();
    },

    doAfterRender: function(){
        var y;
        if (Ext.isIE && this.el.getY() != (y = this.trigger.getY())) {
            this.el.position();
            this.el.setY(y);
        }
    },

    doEnable: function(){
        if (this.wrap) {
            this.wrap.removeClass(this.field.disabledClass);
        }
    },

    doDisable: function(){
        if (this.wrap) {
            this.wrap.addClass(this.field.disabledClass);
            this.el.removeClass(this.field.disabledClass);
        }
    },

    doResize: function(w, h){
        if (typeof w == 'number') {
            this.el.setWidth(w - this.trigger.getWidth());
        }
        this.wrap.setWidth(this.el.getWidth() + this.trigger.getWidth());
    },

    doFocus: function(){
        if (!this.mimicing) {
            this.wrap.addClass('x-trigger-wrap-focus');
            this.mimicing = true;
            Ext.get(Ext.isIE ? document.body : document).on("mousedown", this.mimicBlur, this, {
                delay: 10
            });
            this.el.on('keydown', this.checkTab, this);
        }
    },

    // private
    checkTab: function(e){
        if (e.getKey() == e.TAB) {
            this.triggerBlur();
        }
    },

    // private
    mimicBlur: function(e){
        if (!this.wrap.contains(e.target) && this.field.validateBlur(e)) {
            this.triggerBlur();
        }
    },

    // private
    triggerBlur: function(){
        this.mimicing = false;
        Ext.get(Ext.isIE ? document.body : document).un("mousedown", this.mimicBlur, this);
        this.el.un("keydown", this.checkTab, this);
        this.field.beforeBlur();
        this.wrap.removeClass('x-trigger-wrap-focus');
        this.field.onBlur.call(this.field);
    },

    initTrigger: function(){
        this.trigger.addClassOnOver('x-form-trigger-over');
        this.trigger.addClassOnClick('x-form-trigger-click');
    },

    initSpinner: function(){
        this.field.addEvents({
            'spin': true,
            'spinup': true,
            'spindown': true
        });

        this.keyNav = new Ext.KeyNav(this.el, {
            "up": function(e){
                e.preventDefault();
                this.onSpinUp();
            },

            "down": function(e){
                e.preventDefault();
                this.onSpinDown();
            },

            "pageUp": function(e){
                e.preventDefault();
                this.onSpinUpAlternate();
            },

            "pageDown": function(e){
                e.preventDefault();
                this.onSpinDownAlternate();
            },

            scope: this
        });

        this.repeater = new Ext.util.ClickRepeater(this.trigger, {
            accelerate: this.accelerate
        });
        this.field.mon(this.repeater, "click", this.onTriggerClick, this, {
            preventDefault: true
        });

        this.field.mon(this.trigger, {
            mouseover: this.onMouseOver,
            mouseout: this.onMouseOut,
            mousemove: this.onMouseMove,
            mousedown: this.onMouseDown,
            mouseup: this.onMouseUp,
            scope: this,
            preventDefault: true
        });

        this.field.mon(this.wrap, "mousewheel", this.handleMouseWheel, this);

        this.dd.setXConstraint(0, 0, 10)
        this.dd.setYConstraint(1500, 1500, 10);
        this.dd.endDrag = this.endDrag.createDelegate(this);
        this.dd.startDrag = this.startDrag.createDelegate(this);
        this.dd.onDrag = this.onDrag.createDelegate(this);
    },

    onMouseOver: function(){
        if (this.disabled) {
            return;
        }
        var middle = this.getMiddle();
        this.tmpHoverClass = (Ext.EventObject.getPageY() < middle) ? 'x-form-spinner-overup' : 'x-form-spinner-overdown';
        this.trigger.addClass(this.tmpHoverClass);
    },

    //private
    onMouseOut: function(){
        this.trigger.removeClass(this.tmpHoverClass);
    },

    //private
    onMouseMove: function(){
        if (this.disabled) {
            return;
        }
        var middle = this.getMiddle();
        if (((Ext.EventObject.getPageY() > middle) && this.tmpHoverClass == "x-form-spinner-overup") ||
        ((Ext.EventObject.getPageY() < middle) && this.tmpHoverClass == "x-form-spinner-overdown")) {
        }
    },

    //private
    onMouseDown: function(){
        if (this.disabled) {
            return;
        }
        var middle = this.getMiddle();
        this.tmpClickClass = (Ext.EventObject.getPageY() < middle) ? 'x-form-spinner-clickup' : 'x-form-spinner-clickdown';
        this.trigger.addClass(this.tmpClickClass);
    },

    //private
    onMouseUp: function(){
        this.trigger.removeClass(this.tmpClickClass);
    },

    //private
    onTriggerClick: function(){
        if (this.disabled || this.el.dom.readOnly) {
            return;
        }
        var middle = this.getMiddle();
        var ud = (Ext.EventObject.getPageY() < middle) ? 'Up' : 'Down';
        this['onSpin' + ud]();
    },

    //private
    getMiddle: function(){
        var t = this.trigger.getTop();
        var h = this.trigger.getHeight();
        var middle = t + (h / 2);
        return middle;
    },

    //private
    //checks if control is allowed to spin
    isSpinnable: function(){
        if (this.disabled || this.el.dom.readOnly) {
            Ext.EventObject.preventDefault(); //prevent scrolling when disabled/readonly
            return false;
        }
        return true;
    },

    handleMouseWheel: function(e){
        //disable scrolling when not focused
        if (this.wrap.hasClass('x-trigger-wrap-focus') == false) {
            return;
        }

        var delta = e.getWheelDelta();
        if (delta > 0) {
            this.onSpinUp();
            e.stopEvent();
        }
        else
            if (delta < 0) {
                this.onSpinDown();
                e.stopEvent();
            }
    },

    //private
    startDrag: function(){
        this.proxy.show();
        this._previousY = Ext.fly(this.dd.getDragEl()).getTop();
    },

    //private
    endDrag: function(){
        this.proxy.hide();
    },

    //private
    onDrag: function(){
        if (this.disabled) {
            return;
        }
        var y = Ext.fly(this.dd.getDragEl()).getTop();
        var ud = '';

        if (this._previousY > y) {
            ud = 'Up';
        } //up
        if (this._previousY < y) {
            ud = 'Down';
        } //down
        if (ud != '') {
            this['onSpin' + ud]();
        }

        this._previousY = y;
    },

    //private
    onSpinUp: function(){
        if (this.isSpinnable() == false) {
            return;
        }
        if (Ext.EventObject.shiftKey == true) {
            this.onSpinUpAlternate();
            return;
        }
        else {
            this.spin(false, false);
        }
        this.field.fireEvent("spin", this);
        this.field.fireEvent("spinup", this);
    },

    //private
    onSpinDown: function(){
        if (this.isSpinnable() == false) {
            return;
        }
        if (Ext.EventObject.shiftKey == true) {
            this.onSpinDownAlternate();
            return;
        }
        else {
            this.spin(true, false);
        }
        this.field.fireEvent("spin", this);
        this.field.fireEvent("spindown", this);
    },

    //private
    onSpinUpAlternate: function(){
        if (this.isSpinnable() == false) {
            return;
        }
        this.spin(false, true);
        this.field.fireEvent("spin", this);
        this.field.fireEvent("spinup", this);
    },

    //private
    onSpinDownAlternate: function(){
        if (this.isSpinnable() == false) {
            return;
        }
        this.spin(true, true);
        this.field.fireEvent("spin", this);
        this.field.fireEvent("spindown", this);
    },

    spin: function(down, alternate){
        var v = parseFloat(this.field.getValue());
        var incr = (alternate == true) ? this.alternateIncrementValue : this.incrementValue;
        (down == true) ? v -= incr : v += incr;

        v = (isNaN(v)) ? this.defaultValue : v;
        v = this.fixBoundries(v);
        this.field.setRawValue(v);
    },

    fixBoundries: function(value){
        var v = value;

        if (this.field.minValue != undefined && v < this.field.minValue) {
            v = this.field.minValue;
        }
        if (this.field.maxValue != undefined && v > this.field.maxValue) {
            v = this.field.maxValue;
        }

        return this.fixPrecision(v);
    },

    // private
    fixPrecision: function(value){
        var nan = isNaN(value);
        if (!this.field.allowDecimals || this.field.decimalPrecision == -1 || nan || !value) {
            return nan ? '' : value;
        }
        return parseFloat(parseFloat(value).toFixed(this.field.decimalPrecision));
    },

    doDestroy: function(){
        if (this.trigger) {
            this.trigger.remove();
        }
        if (this.wrap) {
            this.wrap.remove();
            delete this.field.wrap;
        }

        if (this.splitter) {
            this.splitter.remove();
        }

        if (this.dd) {
            this.dd.unreg();
            this.dd = null;
        }

        if (this.proxy) {
            this.proxy.remove();
        }

        if (this.repeater) {
            this.repeater.purgeListeners();
        }
    }
});

//backwards compat
Ext.form.Spinner = Ext.ux.Spinner;/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.ux.StatusBar
 * <p>Basic status bar component that can be used as the bottom toolbar of any {@link Ext.Panel}.  In addition to
 * supporting the standard {@link Ext.Toolbar} interface for adding buttons, menus and other items, the StatusBar
 * provides a greedy status element that can be aligned to either side and has convenient methods for setting the
 * status text and icon.  You can also indicate that something is processing using the {@link #showBusy} method.</p>
 * <pre><code>
new Ext.Panel({
    title: 'StatusBar',
    // etc.
    bbar: new Ext.ux.StatusBar({
        id: 'my-status',

        // defaults to use when the status is cleared:
        defaultText: 'Default status text',
        defaultIconCls: 'default-icon',

        // values to set initially:
        text: 'Ready',
        iconCls: 'ready-icon',

        // any standard Toolbar items:
        items: [{
            text: 'A Button'
        }, '-', 'Plain Text']
    })
});

// Update the status bar later in code:
var sb = Ext.getCmp('my-status');
sb.setStatus({
    text: 'OK',
    iconCls: 'ok-icon',
    clear: true // auto-clear after a set interval
});

// Set the status bar to show that something is processing:
sb.showBusy();

// processing....

sb.clearStatus(); // once completeed
</code></pre>
 * @extends Ext.Toolbar
 * @constructor
 * Creates a new StatusBar
 * @param {Object/Array} config A config object
 */
Ext.ux.StatusBar = Ext.extend(Ext.Toolbar, {
    /**
     * @cfg {String} statusAlign
     * The alignment of the status element within the overall StatusBar layout.  When the StatusBar is rendered,
     * it creates an internal div containing the status text and icon.  Any additional Toolbar items added in the
     * StatusBar's {@link #items} config, or added via {@link #add} or any of the supported add* methods, will be
     * rendered, in added order, to the opposite side.  The status element is greedy, so it will automatically
     * expand to take up all sapce left over by any other items.  Example usage:
     * <pre><code>
// Create a left-aligned status bar containing a button,
// separator and text item that will be right-aligned (default):
new Ext.Panel({
    title: 'StatusBar',
    // etc.
    bbar: new Ext.ux.StatusBar({
        defaultText: 'Default status text',
        id: 'status-id',
        items: [{
            text: 'A Button'
        }, '-', 'Plain Text']
    })
});

// By adding the statusAlign config, this will create the
// exact same toolbar, except the status and toolbar item
// layout will be reversed from the previous example:
new Ext.Panel({
    title: 'StatusBar',
    // etc.
    bbar: new Ext.ux.StatusBar({
        defaultText: 'Default status text',
        id: 'status-id',
        statusAlign: 'right',
        items: [{
            text: 'A Button'
        }, '-', 'Plain Text']
    })
});
</code></pre>
     */
    /**
     * @cfg {String} defaultText
     * The default {@link #text} value.  This will be used anytime the status bar is cleared with the
     * <tt>useDefaults:true</tt> option (defaults to '').
     */
    /**
     * @cfg {String} defaultIconCls
     * The default {@link #iconCls} value (see the iconCls docs for additional details about customizing the icon).
     * This will be used anytime the status bar is cleared with the <tt>useDefaults:true</tt> option (defaults to '').
     */
    /**
     * @cfg {String} text
     * A string that will be <b>initially</b> set as the status message.  This string
     * will be set as innerHTML (html tags are accepted) for the toolbar item.
     * If not specified, the value set for <code>{@link #defaultText}</code>
     * will be used.
     */
    /**
     * @cfg {String} iconCls
     * A CSS class that will be <b>initially</b> set as the status bar icon and is
     * expected to provide a background image (defaults to '').
     * Example usage:<pre><code>
// Example CSS rule:
.x-statusbar .x-status-custom {
    padding-left: 25px;
    background: transparent url(images/custom-icon.gif) no-repeat 3px 2px;
}

// Setting a default icon:
var sb = new Ext.ux.StatusBar({
    defaultIconCls: 'x-status-custom'
});

// Changing the icon:
sb.setStatus({
    text: 'New status',
    iconCls: 'x-status-custom'
});
</code></pre>
     */

    /**
     * @cfg {String} cls
     * The base class applied to the containing element for this component on render (defaults to 'x-statusbar')
     */
    cls : 'x-statusbar',
    /**
     * @cfg {String} busyIconCls
     * The default <code>{@link #iconCls}</code> applied when calling
     * <code>{@link #showBusy}</code> (defaults to <tt>'x-status-busy'</tt>).
     * It can be overridden at any time by passing the <code>iconCls</code>
     * argument into <code>{@link #showBusy}</code>.
     */
    busyIconCls : 'x-status-busy',
    /**
     * @cfg {String} busyText
     * The default <code>{@link #text}</code> applied when calling
     * <code>{@link #showBusy}</code> (defaults to <tt>'Loading...'</tt>).
     * It can be overridden at any time by passing the <code>text</code>
     * argument into <code>{@link #showBusy}</code>.
     */
    busyText : 'Loading...',
    /**
     * @cfg {Number} autoClear
     * The number of milliseconds to wait after setting the status via
     * <code>{@link #setStatus}</code> before automatically clearing the status
     * text and icon (defaults to <tt>5000</tt>).  Note that this only applies
     * when passing the <tt>clear</tt> argument to <code>{@link #setStatus}</code>
     * since that is the only way to defer clearing the status.  This can
     * be overridden by specifying a different <tt>wait</tt> value in
     * <code>{@link #setStatus}</code>. Calls to <code>{@link #clearStatus}</code>
     * always clear the status bar immediately and ignore this value.
     */
    autoClear : 5000,

    /**
     * @cfg {String} emptyText
     * The text string to use if no text has been set.  Defaults to
     * <tt>'&nbsp;'</tt>).  If there are no other items in the toolbar using
     * an empty string (<tt>''</tt>) for this value would end up in the toolbar
     * height collapsing since the empty string will not maintain the toolbar
     * height.  Use <tt>''</tt> if the toolbar should collapse in height
     * vertically when no text is specified and there are no other items in
     * the toolbar.
     */
    emptyText : '&nbsp;',

    // private
    activeThreadId : 0,

    // private
    initComponent : function(){
        if(this.statusAlign=='right'){
            this.cls += ' x-status-right';
        }
        Ext.ux.StatusBar.superclass.initComponent.call(this);
    },

    // private
    afterRender : function(){
        Ext.ux.StatusBar.superclass.afterRender.call(this);

        var right = this.statusAlign == 'right';
        this.currIconCls = this.iconCls || this.defaultIconCls;
        this.statusEl = new Ext.Toolbar.TextItem({
            cls: 'x-status-text ' + (this.currIconCls || ''),
            text: this.text || this.defaultText || ''
        });

        if(right){
            this.add('->');
            this.add(this.statusEl);
        }else{
            this.insert(0, this.statusEl);
            this.insert(1, '->');
        }
        this.doLayout();
    },

    /**
     * Sets the status {@link #text} and/or {@link #iconCls}. Also supports automatically clearing the
     * status that was set after a specified interval.
     * @param {Object/String} config A config object specifying what status to set, or a string assumed
     * to be the status text (and all other options are defaulted as explained below). A config
     * object containing any or all of the following properties can be passed:<ul>
     * <li><tt>text</tt> {String} : (optional) The status text to display.  If not specified, any current
     * status text will remain unchanged.</li>
     * <li><tt>iconCls</tt> {String} : (optional) The CSS class used to customize the status icon (see
     * {@link #iconCls} for details). If not specified, any current iconCls will remain unchanged.</li>
     * <li><tt>clear</tt> {Boolean/Number/Object} : (optional) Allows you to set an internal callback that will
     * automatically clear the status text and iconCls after a specified amount of time has passed. If clear is not
     * specified, the new status will not be auto-cleared and will stay until updated again or cleared using
     * {@link #clearStatus}. If <tt>true</tt> is passed, the status will be cleared using {@link #autoClear},
     * {@link #defaultText} and {@link #defaultIconCls} via a fade out animation. If a numeric value is passed,
     * it will be used as the callback interval (in milliseconds), overriding the {@link #autoClear} value.
     * All other options will be defaulted as with the boolean option.  To customize any other options,
     * you can pass an object in the format:<ul>
     *    <li><tt>wait</tt> {Number} : (optional) The number of milliseconds to wait before clearing
     *    (defaults to {@link #autoClear}).</li>
     *    <li><tt>anim</tt> {Number} : (optional) False to clear the status immediately once the callback
     *    executes (defaults to true which fades the status out).</li>
     *    <li><tt>useDefaults</tt> {Number} : (optional) False to completely clear the status text and iconCls
     *    (defaults to true which uses {@link #defaultText} and {@link #defaultIconCls}).</li>
     * </ul></li></ul>
     * Example usage:<pre><code>
// Simple call to update the text
statusBar.setStatus('New status');

// Set the status and icon, auto-clearing with default options:
statusBar.setStatus({
    text: 'New status',
    iconCls: 'x-status-custom',
    clear: true
});

// Auto-clear with custom options:
statusBar.setStatus({
    text: 'New status',
    iconCls: 'x-status-custom',
    clear: {
        wait: 8000,
        anim: false,
        useDefaults: false
    }
});
</code></pre>
     * @return {Ext.ux.StatusBar} this
     */
    setStatus : function(o){
        o = o || {};

        if(typeof o == 'string'){
            o = {text:o};
        }
        if(o.text !== undefined){
            this.setText(o.text);
        }
        if(o.iconCls !== undefined){
            this.setIcon(o.iconCls);
        }

        if(o.clear){
            var c = o.clear,
                wait = this.autoClear,
                defaults = {useDefaults: true, anim: true};

            if(typeof c == 'object'){
                c = Ext.applyIf(c, defaults);
                if(c.wait){
                    wait = c.wait;
                }
            }else if(typeof c == 'number'){
                wait = c;
                c = defaults;
            }else if(typeof c == 'boolean'){
                c = defaults;
            }

            c.threadId = this.activeThreadId;
            this.clearStatus.defer(wait, this, [c]);
        }
        return this;
    },

    /**
     * Clears the status {@link #text} and {@link #iconCls}. Also supports clearing via an optional fade out animation.
     * @param {Object} config (optional) A config object containing any or all of the following properties.  If this
     * object is not specified the status will be cleared using the defaults below:<ul>
     * <li><tt>anim</tt> {Boolean} : (optional) True to clear the status by fading out the status element (defaults
     * to false which clears immediately).</li>
     * <li><tt>useDefaults</tt> {Boolean} : (optional) True to reset the text and icon using {@link #defaultText} and
     * {@link #defaultIconCls} (defaults to false which sets the text to '' and removes any existing icon class).</li>
     * </ul>
     * @return {Ext.ux.StatusBar} this
     */
    clearStatus : function(o){
        o = o || {};

        if(o.threadId && o.threadId !== this.activeThreadId){
            // this means the current call was made internally, but a newer
            // thread has set a message since this call was deferred.  Since
            // we don't want to overwrite a newer message just ignore.
            return this;
        }

        var text = o.useDefaults ? this.defaultText : this.emptyText,
            iconCls = o.useDefaults ? (this.defaultIconCls ? this.defaultIconCls : '') : '';

        if(o.anim){
            // animate the statusEl Ext.Element
            this.statusEl.el.fadeOut({
                remove: false,
                useDisplay: true,
                scope: this,
                callback: function(){
                    this.setStatus({
	                    text: text,
	                    iconCls: iconCls
	                });

                    this.statusEl.el.show();
                }
            });
        }else{
            // hide/show the el to avoid jumpy text or icon
            this.statusEl.hide();
	        this.setStatus({
	            text: text,
	            iconCls: iconCls
	        });
            this.statusEl.show();
        }
        return this;
    },

    /**
     * Convenience method for setting the status text directly.  For more flexible options see {@link #setStatus}.
     * @param {String} text (optional) The text to set (defaults to '')
     * @return {Ext.ux.StatusBar} this
     */
    setText : function(text){
        this.activeThreadId++;
        this.text = text || '';
        if(this.rendered){
            this.statusEl.setText(this.text);
        }
        return this;
    },

    /**
     * Returns the current status text.
     * @return {String} The status text
     */
    getText : function(){
        return this.text;
    },

    /**
     * Convenience method for setting the status icon directly.  For more flexible options see {@link #setStatus}.
     * See {@link #iconCls} for complete details about customizing the icon.
     * @param {String} iconCls (optional) The icon class to set (defaults to '', and any current icon class is removed)
     * @return {Ext.ux.StatusBar} this
     */
    setIcon : function(cls){
        this.activeThreadId++;
        cls = cls || '';

        if(this.rendered){
	        if(this.currIconCls){
	            this.statusEl.removeClass(this.currIconCls);
	            this.currIconCls = null;
	        }
	        if(cls.length > 0){
	            this.statusEl.addClass(cls);
	            this.currIconCls = cls;
	        }
        }else{
            this.currIconCls = cls;
        }
        return this;
    },

    /**
     * Convenience method for setting the status text and icon to special values that are pre-configured to indicate
     * a "busy" state, usually for loading or processing activities.
     * @param {Object/String} config (optional) A config object in the same format supported by {@link #setStatus}, or a
     * string to use as the status text (in which case all other options for setStatus will be defaulted).  Use the
     * <tt>text</tt> and/or <tt>iconCls</tt> properties on the config to override the default {@link #busyText}
     * and {@link #busyIconCls} settings. If the config argument is not specified, {@link #busyText} and
     * {@link #busyIconCls} will be used in conjunction with all of the default options for {@link #setStatus}.
     * @return {Ext.ux.StatusBar} this
     */
    showBusy : function(o){
        if(typeof o == 'string'){
            o = {text:o};
        }
        o = Ext.applyIf(o || {}, {
            text: this.busyText,
            iconCls: this.busyIconCls
        });
        return this.setStatus(o);
    }
});
Ext.reg('statusbar', Ext.ux.StatusBar);
/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.ux.TabCloseMenu
 * @extends Object
 * Plugin (ptype = 'tabclosemenu') for adding a close context menu to tabs. Note that the menu respects
 * the closable configuration on the tab. As such, commands like remove others and remove all will not
 * remove items that are not closable.
 *
 * @constructor
 * @param {Object} config The configuration options
 * @ptype tabclosemenu
 */
Ext.ux.TabCloseMenu = Ext.extend(Object, {
    /**
     * @cfg {String} closeTabText
     * The text for closing the current tab. Defaults to <tt>'Close Tab'</tt>.
     */
    closeTabText: _('Close Tab'),

    /**
     * @cfg {String} closeOtherTabsText
     * The text for closing all tabs except the current one. Defaults to <tt>'Close Other Tabs'</tt>.
     */
    closeOtherTabsText: _('Close Other Tabs'),

    /**
     * @cfg {Boolean} showCloseAll
     * Indicates whether to show the 'Close All' option. Defaults to <tt>true</tt>.
     */
    showCloseAll: true,

    /**
     * @cfg {String} closeAllTabsText
     * <p>The text for closing all tabs. Defaults to <tt>'Close All Tabs'</tt>.
     */
    closeAllTabsText: _('Close All Tabs'),

    constructor : function(config){
        Ext.apply(this, config || {});
    },

    //public
    init : function(tabs){
        this.tabs = tabs;
        tabs.on({
            scope: this,
            contextmenu: this.onContextMenu,
            destroy: this.destroy
        });
    },

    destroy : function(){
        Ext.destroy(this.menu);
        delete this.menu;
        delete this.tabs;
        delete this.active;
    },

    // private
    onContextMenu : function(tabs, item, e){
        this.active = item;
        var m = this.createMenu(),
            disableAll = true,
            disableOthers = true,
            closeAll = m.getComponent('closeall');

        m.getComponent('close').setDisabled(!item.closable);
        tabs.items.each(function(){
            if(this.closable){
                disableAll = false;
                if(this != item){
                    disableOthers = false;
                    return false;
                }
            }
        });
        m.getComponent('closeothers').setDisabled(disableOthers);
        if(closeAll){
            closeAll.setDisabled(disableAll);
        }

        e.stopEvent();
        m.showAt(e.getPoint());
    },

    createMenu : function(){
        if(!this.menu){
            var items = [{
                itemId: 'close',
                text: this.closeTabText,
                scope: this,
                handler: this.onClose
            }];
            if(this.showCloseAll){
                items.push('-');
            }
            items.push({
                itemId: 'closeothers',
                iconCls: 'iconCloseOthersTabs',
                text: this.closeOtherTabsText,
                scope: this,
                handler: this.onCloseOthers
            });
            if(this.showCloseAll){
                items.push({
                    itemId: 'closeall',
                    text: this.closeAllTabsText,
                    scope: this,
                    handler: this.onCloseAll
                });
            }
            this.menu = new Ext.menu.Menu({
                items: items
            });
        }
        return this.menu;
    },

    onClose : function(){
        this.tabs.remove(this.active);
    },

    onCloseOthers : function(){
        this.doClose(true);
    },

    onCloseAll : function(){
        this.doClose(false);
    },

    doClose : function(excludeActive){
        var items = [];
        this.tabs.items.each(function(item){
            if(item.closable){
                if(!excludeActive || item != this.active){
                    items.push(item);
                }
            }
        }, this);
        Ext.each(items, function(item){
            this.tabs.remove(item);
        }, this);
    }
});

Ext.preg('tabclosemenu', Ext.ux.TabCloseMenu);
/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
Ext.ns('Ext.ux.tree');

/**
 * @class Ext.ux.tree.TreeGridSorter
 * @extends Ext.tree.TreeSorter
 * Provides sorting of nodes in a {@link Ext.ux.tree.TreeGrid}.  The TreeGridSorter automatically monitors events on the
 * associated TreeGrid that might affect the tree's sort order (beforechildrenrendered, append, insert and textchange).
 * Example usage:<br />
 * <pre><code>
 new Ext.ux.tree.TreeGridSorter(myTreeGrid, {
     folderSort: true,
     dir: "desc",
     sortType: function(node) {
         // sort by a custom, typed attribute:
         return parseInt(node.id, 10);
     }
 });
 </code></pre>
 * @constructor
 * @param {TreeGrid} tree
 * @param {Object} config
 */
Ext.ux.tree.TreeGridSorter = Ext.extend(Ext.tree.TreeSorter, {
    /**
     * @cfg {Array} sortClasses The CSS classes applied to a header when it is sorted. (defaults to <tt>['sort-asc', 'sort-desc']</tt>)
     */
    sortClasses : ['sort-asc', 'sort-desc'],
    /**
     * @cfg {String} sortAscText The text displayed in the 'Sort Ascending' menu item (defaults to <tt>'Sort Ascending'</tt>)
     */
    sortAscText : 'Sort Ascending',
    /**
     * @cfg {String} sortDescText The text displayed in the 'Sort Descending' menu item (defaults to <tt>'Sort Descending'</tt>)
     */
    sortDescText : 'Sort Descending',

    constructor : function(tree, config) {
        if(!Ext.isObject(config)) {
            config = {
                property: tree.columns[0].dataIndex || 'text',
                folderSort: true
            }
        }

        Ext.ux.tree.TreeGridSorter.superclass.constructor.apply(this, arguments);

        this.tree = tree;
        tree.on('headerclick', this.onHeaderClick, this);
        tree.ddAppendOnly = true;

        me = this;
        this.defaultSortFn = function(n1, n2){

            var dsc = me.dir && me.dir.toLowerCase() == 'desc';
            var p = me.property || 'text';
            var sortType = me.sortType;
            var fs = me.folderSort;
            var cs = me.caseSensitive === true;
            var leafAttr = me.leafAttr || 'leaf';

            if(fs){
                if(n1.attributes[leafAttr] && !n2.attributes[leafAttr]){
                    return 1;
                }
                if(!n1.attributes[leafAttr] && n2.attributes[leafAttr]){
                    return -1;
                }
            }
            var v1 = sortType ? sortType(n1) : (cs ? n1.attributes[p] : n1.attributes[p].toUpperCase());
            var v2 = sortType ? sortType(n2) : (cs ? n2.attributes[p] : n2.attributes[p].toUpperCase());
            if(v1 < v2){
                return dsc ? +1 : -1;
            }else if(v1 > v2){
                return dsc ? -1 : +1;
            }else{
                return 0;
            }
        };

        tree.on('afterrender', this.onAfterTreeRender, this, {single: true});
        tree.on('headermenuclick', this.onHeaderMenuClick, this);
    },

    onAfterTreeRender : function() {
        if(this.tree.hmenu){
            this.tree.hmenu.insert(0,
                {itemId:'asc', text: this.sortAscText, cls: 'xg-hmenu-sort-asc'},
                {itemId:'desc', text: this.sortDescText, cls: 'xg-hmenu-sort-desc'}
            );
        }
        this.updateSortIcon(0, 'asc');
    },

    onHeaderMenuClick : function(c, id, index) {
        if(id === 'asc' || id === 'desc') {
            this.onHeaderClick(c, null, index);
            return false;
        }
    },

    onHeaderClick : function(c, el, i) {
        if(c && !this.tree.headersDisabled){
            var me = this;

            me.property = c.dataIndex;
            me.dir = c.dir = (c.dir === 'desc' ? 'asc' : 'desc');
            me.sortType = c.sortType;
            me.caseSensitive === Ext.isBoolean(c.caseSensitive) ? c.caseSensitive : this.caseSensitive;
            me.sortFn = c.sortFn || this.defaultSortFn;

            this.tree.root.cascade(function(n) {
                if(!n.isLeaf()) {
                    me.updateSort(me.tree, n);
                }
            });

            this.updateSortIcon(i, c.dir);
        }
    },

    // private
    updateSortIcon : function(col, dir){
        var sc = this.sortClasses;
        var hds = this.tree.innerHd.select('td').removeClass(sc);
        hds.item(col).addClass(sc[dir == 'desc' ? 1 : 0]);
    }
});/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.tree.ColumnResizer
 * @extends Ext.util.Observable
 */
Ext.tree.ColumnResizer = Ext.extend(Ext.util.Observable, {
    /**
     * @cfg {Number} minWidth The minimum width the column can be dragged to.
     * Defaults to <tt>14</tt>.
     */
    minWidth: 14,

    constructor: function(config){
        Ext.apply(this, config);
        Ext.tree.ColumnResizer.superclass.constructor.call(this);
    },

    init : function(tree){
        this.tree = tree;
        tree.on('render', this.initEvents, this);
    },

    initEvents : function(tree){
        tree.mon(tree.innerHd, 'mousemove', this.handleHdMove, this);
        this.tracker = new Ext.dd.DragTracker({
            onBeforeStart: this.onBeforeStart.createDelegate(this),
            onStart: this.onStart.createDelegate(this),
            onDrag: this.onDrag.createDelegate(this),
            onEnd: this.onEnd.createDelegate(this),
            tolerance: 3,
            autoStart: 300
        });
        this.tracker.initEl(tree.innerHd);
        tree.on('beforedestroy', this.tracker.destroy, this.tracker);
    },

    handleHdMove : function(e, t){
        var hw = 5,
            x = e.getPageX(),
            hd = e.getTarget('.x-treegrid-hd', 3, true);
        
        if(hd){                                 
            var r = hd.getRegion(),
                ss = hd.dom.style,
                pn = hd.dom.parentNode;
            
            if(x - r.left <= hw && hd.dom !== pn.firstChild) {
                var ps = hd.dom.previousSibling;
                while(ps && Ext.fly(ps).hasClass('x-treegrid-hd-hidden')) {
                    ps = ps.previousSibling;
                }
                if(ps) {                    
                    this.activeHd = Ext.get(ps);
    				ss.cursor = Ext.isWebKit ? 'e-resize' : 'col-resize';
                }
            } else if(r.right - x <= hw) {
                var ns = hd.dom;
                while(ns && Ext.fly(ns).hasClass('x-treegrid-hd-hidden')) {
                    ns = ns.previousSibling;
                }
                if(ns) {
                    this.activeHd = Ext.get(ns);
    				ss.cursor = Ext.isWebKit ? 'w-resize' : 'col-resize';                    
                }
            } else{
                delete this.activeHd;
                ss.cursor = '';
            }
        }
    },

    onBeforeStart : function(e){
        this.dragHd = this.activeHd;
        return !!this.dragHd;
    },

    onStart : function(e){
        this.tree.headersDisabled = true;
        this.proxy = this.tree.body.createChild({cls:'x-treegrid-resizer'});
        this.proxy.setHeight(this.tree.body.getHeight());

        var x = this.tracker.getXY()[0];

        this.hdX = this.dragHd.getX();
        this.hdIndex = this.tree.findHeaderIndex(this.dragHd);

        this.proxy.setX(this.hdX);
        this.proxy.setWidth(x-this.hdX);

        this.maxWidth = this.tree.outerCt.getWidth() - this.tree.innerBody.translatePoints(this.hdX).left;
    },

    onDrag : function(e){
        var cursorX = this.tracker.getXY()[0];
        this.proxy.setWidth((cursorX-this.hdX).constrain(this.minWidth, this.maxWidth));
    },

    onEnd : function(e){
        var nw = this.proxy.getWidth(),
            tree = this.tree;
        
        this.proxy.remove();
        delete this.dragHd;
        
        tree.columns[this.hdIndex].width = nw;
        tree.updateColumnWidths();
        
        setTimeout(function(){
            tree.headersDisabled = false;
        }, 100);
    }
});/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.ux.tree.TreeGridNodeUI
 * @extends Ext.tree.TreeNodeUI
 */
Ext.ux.tree.TreeGridNodeUI = Ext.extend(Ext.tree.TreeNodeUI, {
    isTreeGridNodeUI: true,

    renderElements : function(n, a, targetNode, bulkRender){
        var t = n.getOwnerTree(),
            cols = t.columns,
            c = cols[0],
            i, buf, len;

        this.indentMarkup = n.parentNode ? n.parentNode.ui.getChildIndent() : '';

        buf = [
             '<tbody class="x-tree-node">',
                '<tr ext:tree-node-id="', n.id ,'" class="x-tree-node-el x-tree-node-leaf ', a.cls, '">',
                    '<td class="x-treegrid-col">',
                        '<span class="x-tree-node-indent">', this.indentMarkup, "</span>",
                        '<img src="', this.emptyIcon, '" class="x-tree-ec-icon x-tree-elbow">',
                        '<img src="', a.icon || this.emptyIcon, '" class="x-tree-node-icon', (a.icon ? " x-tree-node-inline-icon" : ""), (a.iconCls ? " "+a.iconCls : ""), '" unselectable="on">',
                        '<a hidefocus="on" class="x-tree-node-anchor" href="', a.href ? a.href : '#', '" tabIndex="1" ',
                            a.hrefTarget ? ' target="'+a.hrefTarget+'"' : '', '>',
                        '<span unselectable="on">', (c.tpl ? c.tpl.apply(a) : a[c.dataIndex] || c.text), '</span></a>',
                    '</td>'
        ];

        for(i = 1, len = cols.length; i < len; i++){
            c = cols[i];
            buf.push(
                    '<td class="x-treegrid-col ', (c.cls ? c.cls : ''), '">',
                        '<div unselectable="on" class="x-treegrid-text"', (c.align ? ' style="text-align: ' + c.align + ';"' : ''), '>',
                            (c.tpl ? c.tpl.apply(a) : a[c.dataIndex]),
                        '</div>',
                    '</td>'
            );
        }

        buf.push(
            '</tr><tr class="x-tree-node-ct"><td colspan="', cols.length, '">',
            '<table class="x-treegrid-node-ct-table" cellpadding="0" cellspacing="0" style="table-layout: fixed; display: none; width: ', t.innerCt.getWidth() ,'px;"><colgroup>'
        );
        for(i = 0, len = cols.length; i<len; i++) {
            buf.push('<col style="width: ', (cols[i].hidden ? 0 : cols[i].width) ,'px;" />');
        }
        buf.push('</colgroup></table></td></tr></tbody>');

        if(bulkRender !== true && n.nextSibling && n.nextSibling.ui.getEl()){
            this.wrap = Ext.DomHelper.insertHtml("beforeBegin", n.nextSibling.ui.getEl(), buf.join(''));
        }else{
            this.wrap = Ext.DomHelper.insertHtml("beforeEnd", targetNode, buf.join(''));
        }

        this.elNode = this.wrap.childNodes[0];
        this.ctNode = this.wrap.childNodes[1].firstChild.firstChild;
        var cs = this.elNode.firstChild.childNodes;
        this.indentNode = cs[0];
        this.ecNode = cs[1];
        this.iconNode = cs[2];
        this.anchor = cs[3];
        this.textNode = cs[3].firstChild;
    },

    // private
    animExpand : function(cb){
        this.ctNode.style.display = "";
        Ext.ux.tree.TreeGridNodeUI.superclass.animExpand.call(this, cb);
    }
});

Ext.ux.tree.TreeGridRootNodeUI = Ext.extend(Ext.tree.TreeNodeUI, {
    isTreeGridNodeUI: true,

    // private
    render : function(){
        if(!this.rendered){
            this.wrap = this.ctNode = this.node.ownerTree.innerCt.dom;
            this.node.expanded = true;
        }

        if(Ext.isWebKit) {
            // weird table-layout: fixed issue in webkit
            var ct = this.ctNode;
            ct.style.tableLayout = null;
            (function() {
                ct.style.tableLayout = 'fixed';
            }).defer(1);
        }
    },

    destroy : function(){
        if(this.elNode){
            Ext.dd.Registry.unregister(this.elNode.id);
        }
        delete this.node;
    },

    collapse : Ext.emptyFn,
    expand : Ext.emptyFn
});/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.ux.tree.TreeGridLoader
 * @extends Ext.tree.TreeLoader
 */
Ext.ux.tree.TreeGridLoader = Ext.extend(Ext.tree.TreeLoader, {
    createNode : function(attr) {
        if (!attr.uiProvider) {
            attr.uiProvider = Ext.ux.tree.TreeGridNodeUI;
        }
        return Ext.tree.TreeLoader.prototype.createNode.call(this, attr);
    }
});/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
(function() {
    Ext.override(Ext.list.Column, {
        init : function() {    
            var types = Ext.data.Types,
                st = this.sortType;
                    
            if(this.type){
                if(Ext.isString(this.type)){
                    this.type = Ext.data.Types[this.type.toUpperCase()] || types.AUTO;
                }
            }else{
                this.type = types.AUTO;
            }

            // named sortTypes are supported, here we look them up
            if(Ext.isString(st)){
                this.sortType = Ext.data.SortTypes[st];
            }else if(Ext.isEmpty(st)){
                this.sortType = this.type.sortType;
            }
        }
    });

    Ext.tree.Column = Ext.extend(Ext.list.Column, {});
    Ext.tree.NumberColumn = Ext.extend(Ext.list.NumberColumn, {});
    Ext.tree.DateColumn = Ext.extend(Ext.list.DateColumn, {});
    Ext.tree.BooleanColumn = Ext.extend(Ext.list.BooleanColumn, {});

    Ext.reg('tgcolumn', Ext.tree.Column);
    Ext.reg('tgnumbercolumn', Ext.tree.NumberColumn);
    Ext.reg('tgdatecolumn', Ext.tree.DateColumn);
    Ext.reg('tgbooleancolumn', Ext.tree.BooleanColumn);
})();
/*!
 * Ext JS Library 3.2.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.ux.tree.TreeGrid
 * @extends Ext.tree.TreePanel
 * 
 * @xtype treegrid
 */
Ext.ux.tree.TreeGrid = Ext.extend(Ext.tree.TreePanel, {
    rootVisible : false,
    useArrows : true,
    lines : false,
    borderWidth : Ext.isBorderBox ? 0 : 2, // the combined left/right border for each cell
    cls : 'x-treegrid',

    columnResize : true,
    enableSort : true,
    reserveScrollOffset : true,
    enableHdMenu : true,
    
    columnsText : 'Columns',

    initComponent : function() {
        if(!this.root) {
            this.root = new Ext.tree.AsyncTreeNode({text: 'Root'});
        }
        
        // initialize the loader
        var l = this.loader;
        if(!l){
            l = new Ext.ux.tree.TreeGridLoader({
                dataUrl: this.dataUrl,
                requestMethod: this.requestMethod,
                store: this.store
            });
        }else if(Ext.isObject(l) && !l.load){
            l = new Ext.ux.tree.TreeGridLoader(l);
        }
        else if(l) {
            l.createNode = function(attr) {
                if (!attr.uiProvider) {
                    attr.uiProvider = Ext.ux.tree.TreeGridNodeUI;
                }
                return Ext.tree.TreeLoader.prototype.createNode.call(this, attr);
            }
        }
        this.loader = l;
                            
        Ext.ux.tree.TreeGrid.superclass.initComponent.call(this);                    
        
        this.initColumns();
        
        if(this.enableSort) {
            this.treeGridSorter = new Ext.ux.tree.TreeGridSorter(this, this.enableSort);
        }
        
        if(this.columnResize){
            this.colResizer = new Ext.tree.ColumnResizer(this.columnResize);
            this.colResizer.init(this);
        }
        
        var c = this.columns;
        if(!this.internalTpl){                                
            this.internalTpl = new Ext.XTemplate(
                '<div class="x-grid3-header">',
                    '<div class="x-treegrid-header-inner">',
                        '<div class="x-grid3-header-offset">',
                            '<table cellspacing="0" cellpadding="0" border="0"><colgroup><tpl for="columns"><col /></tpl></colgroup>',
                            '<thead><tr class="x-grid3-hd-row">',
                            '<tpl for="columns">',
                            '<td class="x-grid3-hd x-grid3-cell x-treegrid-hd" style="text-align: {align};" id="', this.id, '-xlhd-{#}">',
                                '<div class="x-grid3-hd-inner x-treegrid-hd-inner" unselectable="on">',
                                     this.enableHdMenu ? '<a class="x-grid3-hd-btn" href="#"></a>' : '',
                                     '{header}<img class="x-grid3-sort-icon" src="', Ext.BLANK_IMAGE_URL, '" />',
                                 '</div>',
                            '</td></tpl>',
                            '</tr></thead>',
                        '</div></table>',
                    '</div></div>',
                '</div>',
                '<div class="x-treegrid-root-node">',
                    '<table class="x-treegrid-root-table" cellpadding="0" cellspacing="0" style="table-layout: fixed;"></table>',
                '</div>'
            );
        }
        
        if(!this.colgroupTpl) {
            this.colgroupTpl = new Ext.XTemplate(
                '<colgroup><tpl for="columns"><col style="width: {width}px"/></tpl></colgroup>'
            );
        }
    },

    initColumns : function() {
        var cs = this.columns,
            len = cs.length, 
            columns = [],
            i, c;

        for(i = 0; i < len; i++){
            c = cs[i];
            if(!c.isColumn) {
                c.xtype = c.xtype ? (/^tg/.test(c.xtype) ? c.xtype : 'tg' + c.xtype) : 'tgcolumn';
                c = Ext.create(c);
            }
            c.init(this);
            columns.push(c);
            
            if(this.enableSort !== false && c.sortable !== false) {
                c.sortable = true;
                this.enableSort = true;
            }
        }

        this.columns = columns;
    },

    onRender : function(){
        Ext.tree.TreePanel.superclass.onRender.apply(this, arguments);

        this.el.addClass('x-treegrid');
        
        this.outerCt = this.body.createChild({
            cls:'x-tree-root-ct x-treegrid-ct ' + (this.useArrows ? 'x-tree-arrows' : this.lines ? 'x-tree-lines' : 'x-tree-no-lines')
        });
        
        this.internalTpl.overwrite(this.outerCt, {columns: this.columns});
        
        this.mainHd = Ext.get(this.outerCt.dom.firstChild);
        this.innerHd = Ext.get(this.mainHd.dom.firstChild);
        this.innerBody = Ext.get(this.outerCt.dom.lastChild);
        this.innerCt = Ext.get(this.innerBody.dom.firstChild);
        
        this.colgroupTpl.insertFirst(this.innerCt, {columns: this.columns});
        
        if(this.hideHeaders){
            this.header.dom.style.display = 'none';
        }
        else if(this.enableHdMenu !== false){
            this.hmenu = new Ext.menu.Menu({id: this.id + '-hctx'});
            if(this.enableColumnHide !== false){
                this.colMenu = new Ext.menu.Menu({id: this.id + '-hcols-menu'});
                this.colMenu.on({
                    scope: this,
                    beforeshow: this.beforeColMenuShow,
                    itemclick: this.handleHdMenuClick
                });
                this.hmenu.add({
                    itemId:'columns',
                    hideOnClick: false,
                    text: this.columnsText,
                    menu: this.colMenu,
                    iconCls: 'x-cols-icon'
                });
            }
            this.hmenu.on('itemclick', this.handleHdMenuClick, this);
        }
    },

    setRootNode : function(node){
        node.attributes.uiProvider = Ext.ux.tree.TreeGridRootNodeUI;        
        node = Ext.ux.tree.TreeGrid.superclass.setRootNode.call(this, node);
        if(this.innerCt) {
            this.colgroupTpl.insertFirst(this.innerCt, {columns: this.columns});
        }
        return node;
    },
    
    clearInnerCt : function(){
        if(Ext.isIE){
            var dom = this.innerCt.dom;
            while(dom.firstChild){
                dom.removeChild(dom.firstChild);
            }
        }else{
            Ext.ux.tree.TreeGrid.superclass.clearInnerCt.call(this);
        }
    },
    
    initEvents : function() {
        Ext.ux.tree.TreeGrid.superclass.initEvents.apply(this, arguments);

        this.mon(this.innerBody, 'scroll', this.syncScroll, this);
        this.mon(this.innerHd, 'click', this.handleHdDown, this);
        this.mon(this.mainHd, {
            scope: this,
            mouseover: this.handleHdOver,
            mouseout: this.handleHdOut
        });
    },
    
    onResize : function(w, h) {
        Ext.ux.tree.TreeGrid.superclass.onResize.apply(this, arguments);
        
        var bd = this.innerBody.dom;
        var hd = this.innerHd.dom;

        if(!bd){
            return;
        }

        if(Ext.isNumber(h)){
            bd.style.height = this.body.getHeight(true) - hd.offsetHeight + 'px';
        }

        if(Ext.isNumber(w)){                        
            var sw = Ext.num(this.scrollOffset, Ext.getScrollBarWidth());
            if(this.reserveScrollOffset || ((bd.offsetWidth - bd.clientWidth) > 10)){
                this.setScrollOffset(sw);
            }else{
                var me = this;
                setTimeout(function(){
                    me.setScrollOffset(bd.offsetWidth - bd.clientWidth > 10 ? sw : 0);
                }, 10);
            }
        }
    },

    updateColumnWidths : function() {

        var cols = this.columns,
            colCount = cols.length,
            groups = this.outerCt.query('colgroup'),
            groupCount = groups.length,
            c, g, i, j;

        for(i = 0; i<colCount; i++) {
            c = cols[i];
            for(j = 0; j<groupCount; j++) {
                g = groups[j];
                g.childNodes[i].style.width = (c.hidden ? 0 : c.width) + 'px';
            }
        }
        
        for(i = 0, groups = this.innerHd.query('td'), len = groups.length; i<len; i++) {
            c = Ext.fly(groups[i]);
            if(cols[i] && cols[i].hidden) {
                c.addClass('x-treegrid-hd-hidden');
            }
            else {
                c.removeClass('x-treegrid-hd-hidden');
            }
        }

        var tcw = this.getTotalColumnWidth();                        
        Ext.fly(this.innerHd.dom.firstChild).setWidth(tcw + (this.scrollOffset || 0));
        this.outerCt.select('table').setWidth(tcw);
        this.syncHeaderScroll();    
    },
                    
    getVisibleColumns : function() {
        var columns = [],
            cs = this.columns,
            len = cs.length,
            i;
            
        for(i = 0; i<len; i++) {
            if(!cs[i].hidden) {
                columns.push(cs[i]);
            }
        }        
        return columns;
    },

    getTotalColumnWidth : function() {
        var total = 0;
        for(var i = 0, cs = this.getVisibleColumns(), len = cs.length; i<len; i++) {
            total += cs[i].width;
        }
        return total;
    },

    setScrollOffset : function(scrollOffset) {
        this.scrollOffset = scrollOffset;                        
        this.updateColumnWidths();
    },

    // private
    handleHdDown : function(e, t){
        var hd = e.getTarget('.x-treegrid-hd');

        if(hd && Ext.fly(t).hasClass('x-grid3-hd-btn')){
            var ms = this.hmenu.items,
                cs = this.columns,
                index = this.findHeaderIndex(hd),
                c = cs[index],
                sort = c.sortable;
                
            e.stopEvent();
            Ext.fly(hd).addClass('x-grid3-hd-menu-open');
            this.hdCtxIndex = index;
            
            this.fireEvent('headerbuttonclick', ms, c, hd, index);
            
            this.hmenu.on('hide', function(){
                Ext.fly(hd).removeClass('x-grid3-hd-menu-open');
            }, this, {single:true});
            
            this.hmenu.show(t, 'tl-bl?');
        }
        else if(hd) {
            var index = this.findHeaderIndex(hd);
            this.fireEvent('headerclick', this.columns[index], hd, index);
        }
    },

    // private
    handleHdOver : function(e, t){                    
        var hd = e.getTarget('.x-treegrid-hd');                        
        if(hd && !this.headersDisabled){
            index = this.findHeaderIndex(hd);
            this.activeHdRef = t;
            this.activeHdIndex = index;
            var el = Ext.get(hd);
            this.activeHdRegion = el.getRegion();
            el.addClass('x-grid3-hd-over');
            this.activeHdBtn = el.child('.x-grid3-hd-btn');
            if(this.activeHdBtn){
                this.activeHdBtn.dom.style.height = (hd.firstChild.offsetHeight-1)+'px';
            }
        }
    },
    
    // private
    handleHdOut : function(e, t){
        var hd = e.getTarget('.x-treegrid-hd');
        if(hd && (!Ext.isIE || !e.within(hd, true))){
            this.activeHdRef = null;
            Ext.fly(hd).removeClass('x-grid3-hd-over');
            hd.style.cursor = '';
        }
    },
                    
    findHeaderIndex : function(hd){
        hd = hd.dom || hd;
        var cs = hd.parentNode.childNodes;
        for(var i = 0, c; c = cs[i]; i++){
            if(c == hd){
                return i;
            }
        }
        return -1;
    },
    
    // private
    beforeColMenuShow : function(){
        var cols = this.columns,  
            colCount = cols.length,
            i, c;                        
        this.colMenu.removeAll();                    
        for(i = 1; i < colCount; i++){
            c = cols[i];
            if(c.hideable !== false){
                this.colMenu.add(new Ext.menu.CheckItem({
                    itemId: 'col-' + i,
                    text: c.header,
                    checked: !c.hidden,
                    hideOnClick:false,
                    disabled: c.hideable === false
                }));
            }
        }
    },
                    
    // private
    handleHdMenuClick : function(item){
        var index = this.hdCtxIndex,
            id = item.getItemId();
        
        if(this.fireEvent('headermenuclick', this.columns[index], id, index) !== false) {
            index = id.substr(4);
            if(index > 0 && this.columns[index]) {
                this.setColumnVisible(index, !item.checked);
            }     
        }
        
        return true;
    },
    
    setColumnVisible : function(index, visible) {
        this.columns[index].hidden = !visible;        
        this.updateColumnWidths();
    },

    /**
     * Scrolls the grid to the top
     */
    scrollToTop : function(){
        this.innerBody.dom.scrollTop = 0;
        this.innerBody.dom.scrollLeft = 0;
    },

    // private
    syncScroll : function(){
        this.syncHeaderScroll();
        var mb = this.innerBody.dom;
        this.fireEvent('bodyscroll', mb.scrollLeft, mb.scrollTop);
    },

    // private
    syncHeaderScroll : function(){
        var mb = this.innerBody.dom;
        this.innerHd.dom.scrollLeft = mb.scrollLeft;
        this.innerHd.dom.scrollLeft = mb.scrollLeft; // second time for IE (1/2 time first fails, other browsers ignore)
    },
    
    registerNode : function(n) {
        Ext.ux.tree.TreeGrid.superclass.registerNode.call(this, n);
        if(!n.uiProvider && !n.isRoot && !n.ui.isTreeGridNodeUI) {
            n.ui = new Ext.ux.tree.TreeGridNodeUI(n);
        }
    }
});

Ext.reg('treegrid', Ext.ux.tree.TreeGrid);


Ext.override(Ext.ux.tree.TreeGrid, {
  onResize: function(w, h) {
    Ext.ux.tree.TreeGrid.superclass.onResize.apply(this, arguments);

    var bd = this.innerBody.dom;
    var hd = this.innerHd.dom;

    if (!bd) {
      return;
    }

    if (Ext.isNumber(h)) {
      //bd.style.height = this.body.getHeight(true) - hd.offsetHeight + 'px';
      bd.style.height = this.body.getHeight(true) - 24 + 'px';  // Here is my fix to avoid the vertical scrollBar
    }

    if (Ext.isNumber(w)) {
      if (Ext.isIE && !(Ext.isStrict && Ext.isIE8)) {
        var bdWith = this.body.getWidth(true) + 'px';
        bd.style.width = bdWith;
        hd.style.width = bdWith;
      }
      var sw = Ext.num(this.scrollOffset, Ext.getScrollBarWidth());
      if (this.reserveScrollOffset || ((bd.offsetWidth - bd.clientWidth) > 10)) {
        this.setScrollOffset(sw);
      } else {
        var me = this;
        setTimeout(function() {
          me.setScrollOffset(bd.offsetWidth - bd.clientWidth > 10 ? sw : 0);
        }, 10);
      }
    }
  }
});// Copyright (c) 2010 David Davis - http://xant.us/
// License: MIT
Ext.ux.DblClickCloseTabs = Ext.extend( Object, {

    init: function( panel ) {
        this.panel = panel;
        panel.initEvents = panel.initEvents.createSequence( this.initEvents, this );
    },

    initEvents: function() {
        this.panel.mon(this.panel.strip, {
            dblclick: this.onDblClick.createDelegate( this, [ this.panel ], 0 )
        });
        // cleanup
        delete this.panel;
    },

    onDblClick: function(panel,e) {
        if( panel.getActiveTab().closable ) {
            panel.remove( panel.getActiveTab() );
        }
    }

});

Ext.preg( 'dblclickclosetabs', Ext.ux.DblClickCloseTabs );


Ext.util.md5 = function(s, r, hexcase, chrsz)
{
    r       = (typeof r       === "undefined" ? false:r);
    hexcase = (typeof hexcase === "undefined" ? false:hexcase);
    chrsz   = (typeof chrsz   === "undefined" ? 8:chrsz);

    function safe_add(x, y)
    {
        var lsw = ((x & 0xFFFF) + (y & 0xFFFF)),
            msw = ((x >> 16) + (y >> 16) + (lsw >> 16));
        return (msw << 16) | (lsw & 0xFFFF);
    }

    function bit_rol(num, cnt)
    {
        return (num << cnt) | (num >>> (32 - cnt));
    }

    function md5_cmn(q, a, b, x, s, t)
    {
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
    }

    function md5_ff(a, b, c, d, x, s, t)
    {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function md5_gg(a, b, c, d, x, s, t)
    {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function md5_hh(a, b, c, d, x, s, t)
    {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function md5_ii(a, b, c, d, x, s, t)
    {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    function core_md5(x, len)
    {
        var a =  1732584193,
            b = -271733879,
            c = -1732584194,
            d =  271733878,
            i, olda, oldb, oldc, oldd;

        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        for( i = 0; i < x.length; i += 16 ){

            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;

            a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);
            a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);
            a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);
            a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return [a, b, c, d];
    }

    function str2binl(str)
    {
        var bin  = [],
            mask = ((1 << chrsz) - 1),
            i;

        for( i = 0; i < str.length * chrsz; i += chrsz )
        {
            bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (i%32);
        }
        return bin;
    }

    function binl2str(bin)
    {
        var str = "",
            mask = ((1 << chrsz) - 1),
            i;

        for( i = 0; i < bin.length * 32; i += chrsz )
        {
            str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & mask);
        }
        return str;
    }

    function binl2hex(binarray)
    {
        var hex_tab = ((hexcase) ? "0123456789ABCDEF" : "0123456789abcdef"),
            str     = "",
            i;

        for( i = 0; i < binarray.length * 4; i++ )
        {
            str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) + hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
        }
        return str;
    }

    return (r ? binl2str(core_md5(str2binl(s), s.length * chrsz)) : binl2hex(core_md5(str2binl(s), s.length * chrsz)));
};Ext.ux.CodeMirror = Ext.extend(Ext.BoxComponent, {

    readOnly         : (this.readOnly) ? this.readOnly : false,
    width            : 'auto',
    height           : 'auto',
    autoResize       : true,
    initialised      : false,
    documentDurty    : false,
    spellCheck       : ( this.spellCheck ) ? this.spellCheck : false,
    parser           : (this.parser) ? this.parser : "xml",
    parserFile       : "parsexml.js",
    parserStylesheet : "js/ux/codemirror/css/xmlcolors.css",

    initComponent : function()
    {
        Ext.ux.CodeMirror.superclass.initComponent.apply(this);

        this.addEvents({
            initialize   : true,
            codemodified : true,
            coderestored : true,
            cursormove   : true,
            scroll       : true
        });

        //For the parser
        if( this.parser === 'xml' ) {
            this.parserFile = "parsexml.js";
            this.parserStylesheet = "js/ux/codemirror/css/xmlcolors.css";
        }

        if( this.parser === 'html' ) {
            this.parserFile = ["parsexml.js", "parsecss.js", "tokenizejavascript.js", "parsejavascript.js", "parsehtmlmixed.js"];
            this.parserStylesheet = ["js/ux/codemirror/css/xmlcolors.css", "js/ux/codemirror/css/jscolors.css", "js/ux/codemirror/css/csscolors.css"];
        }

        if( this.parser === 'php' ) {
            this.parserFile = ["parsexml.js", "parsecss.js", "tokenizejavascript.js", "parsejavascript.js",
                             "../contrib/php/js/tokenizephp.js", "../contrib/php/js/parsephp.js",
                             "../contrib/php/js/parsephphtmlmixed.js"];
            this.parserStylesheet = ["js/ux/codemirror/css/xmlcolors.css", "js/ux/codemirror/css/jscolors.css", "js/ux/codemirror/css/csscolors.css", "js/ux/codemirror/contrib/php/css/phpcolors.css"];
        }
    },
    onRender : function(ct, position)
    {
        Ext.ux.CodeMirror.superclass.onRender.apply(this, [ct, position]);
    },

    resize: function()
    {
        this.mirror.frame.style.height = this.ownerCt.lastSize.height - 89 +"px";
        this.mirror.frame.style.width  = this.ownerCt.lastSize.width  - 35 +"px";
    },

    onInit: function(t, cmId)
    {
        var cmp    = Ext.getCmp(cmId),
            mirror = cmp.mirror;

        cmp.ownerCt.fireEvent('resize');

        // Fire the initialize event
        cmp.fireEvent('initialize');
        cmp.initialised = true;

        // Value used to monitor the state of this document (changed or not)
        cmp.documentDurty = false;

        // Attach some others events
        mirror.editor.keyUp = function(e) {

            // On envoie cursormove
            var r        = mirror.cursorPosition(),
                line     = mirror.lineNumber(r.line),
                caracter = r.character;
            cmp.fireEvent('cursormove', line, caracter);

            if( Ext.getCmp(cmId).documentDurty === true && e.keyCode !== 8 && e.keyCode !== 46 ) {

                // Don't need to check if the code has changed

            } else {

                // We check if the code has changed or not
                cmp.manageCodeChange(cmId);
            }
        };

        Ext.EventManager.addListener(mirror.frame.contentWindow, "scroll", function(e){ cmp.monitorScroll(e, cmp); }, this);
    },

    onCursorActivity: function(cmId)
    {
        var cmp      = Ext.getCmp(cmId),
            mirror   = cmp.mirror,
            r        = mirror.cursorPosition(),
            line     = mirror.lineNumber(r.line),
            caracter = r.character;
            cmp.fireEvent('cursormove', line, caracter);
    },

    manageCodeChange: function(cmId, force)
    {
        var cmp             = Ext.getCmp(cmId),
            mirror          = cmp.mirror,
            originalContent = mirror.originalContent,
            currentContent  = mirror.getCode(),
            btnUndo         = Ext.getCmp(cmId + '-btn-undo');

        // If originalContent is false, the editor is not ready
        if( originalContent ) {
            if( originalContent === currentContent ) {
                if( cmp.documentDurty === true ) {
                    cmp.fireEvent('coderestored');
                    cmp.documentDurty = false;
                }
                
            } else {

                // Enable the Undo Btn if it exist (don't exist when we open a fil in readOnly mode
                if( btnUndo ) {
                    btnUndo.enable(); // undo
                }

                if( cmp.documentDurty === false ) {
                    cmp.fireEvent('codemodified');
                    cmp.documentDurty = true;
                }
            }
        }
    },

    saveFunction: function(cmId)
    {
        var saveBtn = Ext.getCmp(cmId + '-btn-save');

        if( ! saveBtn.disabled ) {
            saveBtn.handler.call(saveBtn.scope || saveBtn, saveBtn);
        }
    },

    monitorScroll: function(e, cmp)
    {
        cmp.fireEvent('scroll',e.target.body.scrollTop, this);
    },

    afterRender: function()
    {
        this.mirror = new CodeMirror(CodeMirror.replace(Ext.get(this.id).dom), {
            textWrapping       : false,
            saveFunction       : this.saveFunction,
            width              : '100%',
            height             : this.ownerCt.lastSize.height,
            readOnly           : this.readOnly,
            content            : this.value,
            originalContent    : false,
            parserfile         : this.parserFile,
            parserConfig       : {alignCDATA: true, useHTMLKludges: false},
            indentUnit         : 1,
            cmId               : this.id,
            lineNumbers        : true,
            continuousScanning : (this.readOnly) ? false : 500,
            stylesheet         : this.parserStylesheet,
            path               : "js/ux/codemirror/js/",
            initCallback       : this.onInit,
            autoMatchParens    : true,
            disableSpellcheck  : !this.spellCheck,
            onChange           : this.manageCodeChange,
            cursorActivity     : this.onCursorActivity
        });

        this.ownerCt.on('resize', function(ct, adjW, adjH, rawW, rawH) {
           this.resize();
        }, this);
    },

    getCode : function()
    {
        return this.mirror.getCode();
    },

    setCode : function(code)
    {
        if( !this.initialised ) {
            var wait = new Ext.util.DelayedTask(function() { this.setCode(code); }, this );
            wait.delay(500);
        } else {
            this.mirror.setCode(code);
            this.mirror.originalContent = code;
        }
    },

    reIndentAll : function()
    {
        this.mirror.reindent();
    },

    undo : function(id_prefix, fid)
    {
        this.mirror.undo();

        // Enable the Redo btn
        Ext.getCmp(id_prefix + '-FILE-' + fid + '-btn-redo').enable();

        // Is there more undo history ? If not, we disable this btn
        if( ! this.mirror.editor.history.history.length ) {
            Ext.getCmp(id_prefix + '-FILE-' + fid + '-btn-undo').disable();
        }
    },

    redo : function(id_prefix, fid)
    {
        this.mirror.redo();

        // Enable the undo btn
        Ext.getCmp(id_prefix + '-FILE-' + fid + '-btn-undo').enable();

        // Is there more redo history ? If not, we disable this btn
        if( ! this.mirror.editor.history.redoHistory.length ) {
            Ext.getCmp(id_prefix + '-FILE-' + fid + '-btn-redo').disable();
        }
    },

    setLineContent : function(line, content)
    {
        var lineObj = this.mirror.nthLine(line);
        this.mirror.setLineContent(lineObj, content);
    },

    insertIntoLine : function(line, position, text)
    {
        var lineObj = this.mirror.nthLine(line);
        this.mirror.insertIntoLine(lineObj, position, text);
    },

    scrollTo : function(scrollY)
    {
        this.mirror.frame.contentWindow.document.body.scrollTop = scrollY;
    },

    focus : function()
    {
        this.mirror.focus();
    },

    setOriginalCode : function()
    {
        this.mirror.originalContent = this.getCode();
        this.documentDurty = false;
    },

    getCursorPosition : function()
    {
        var r        = this.mirror.cursorPosition(),
            line     = this.mirror.lineNumber(r.line),
            caracter = r.character;

        return '{line:'+line+', caracter:'+caracter+'}';
    },

    nthLine : function(number)
    {
        return this.mirror.nthLine(number);
    },

    setSpellcheck : function(choice)
    {
        return this.mirror.setSpellcheck(choice);
    }

});
Ext.reg('codemirror', Ext.ux.CodeMirror);Ext.ns('Ext.ux.grid');

Ext.ux.grid.GridSummary = function(config) {
        Ext.apply(this, config);
};

Ext.extend(Ext.ux.grid.GridSummary, Ext.util.Observable, {
    init : function(grid) {
        this.grid = grid;
        this.cm = grid.getColumnModel();
        this.view = grid.getView();

        var v = this.view;

        // override GridView's onLayout() method
        v.onLayout = this.onLayout;

        v.afterMethod('render', this.refreshSummary, this);
        v.afterMethod('refresh', this.refreshSummary, this);
        v.afterMethod('syncScroll', this.syncSummaryScroll, this);
        v.afterMethod('onColumnWidthUpdated', this.doWidth, this);
        v.afterMethod('onAllColumnWidthsUpdated', this.doAllWidths, this);
        v.afterMethod('onColumnHiddenUpdated', this.doHidden, this);

        // update summary row on store's add/remove/clear/update events
        grid.store.on({
            add: this.refreshSummary,
            remove: this.refreshSummary,
            clear: this.refreshSummary,
            update: this.refreshSummary,
            scope: this
        });

        if (!this.rowTpl) {
            this.rowTpl = new Ext.Template(
                '<div class="x-grid3-summary-row x-grid3-gridsummary-row-offset">',
                    '<table class="x-grid3-summary-table" border="0" cellspacing="0" cellpadding="0" style="{tstyle}">',
                        '<tbody><tr>{cells}</tr></tbody>',
                    '</table>',
                '</div>'
            );
            this.rowTpl.disableFormats = true;
        }
        this.rowTpl.compile();

        if (!this.cellTpl) {
            this.cellTpl = new Ext.Template(
                '<td class="x-grid3-col x-grid3-cell x-grid3-td-{id} {css}" style="{style}">',
                    '<div class="x-grid3-cell-inner x-grid3-col-{id}" unselectable="on" {attr}>{value}</div>',
                "</td>"
            );
            this.cellTpl.disableFormats = true;
        }
        this.cellTpl.compile();
    },

    calculate : function(rs, cm) {
        var data = {},
            cfg  = cm.config,
            i, cf, cname, j, r, len, jlen;

        for (i = 0, len = cfg.length; i < len; i++) { // loop through all columns in ColumnModel
            cf = cfg[i]; // get column's configuration
            cname = cf.dataIndex; // get column dataIndex

            // initialise grid summary row data for
            // the current column being worked on
            data[cname] = 0;

            if (cf.summaryType) {
                for (j = 0, jlen = rs.length; j < jlen; j++) {
                    r = rs[j]; // get a single Record
                    data[cname] = Ext.ux.grid.GridSummary.Calculations[cf.summaryType](r.get(cname), r, cname, data, j);
                }
            }
        }

        return data;
    },

    onLayout : function(vw, vh) {
        if (Ext.type(vh) !== 'number') { // handles grid's height:'auto' config
            return;
        }
        // note: this method is scoped to the GridView
        if (!this.grid.getGridEl().hasClass('x-grid-hide-gridsummary')) {
            // readjust gridview's height only if grid summary row is visible
            this.scroller.setHeight(vh - this.summary.getHeight());
        }
    },

    syncSummaryScroll : function() {
        var mb = this.view.scroller.dom;

        this.view.summaryWrap.dom.scrollLeft = mb.scrollLeft;
        this.view.summaryWrap.dom.scrollLeft = mb.scrollLeft; // second time for IE (1/2 time first fails, other browsers ignore)
    },

    doWidth : function(col, w, tw) {
        var s = this.view.summary.dom;

        s.firstChild.style.width = tw;
        s.firstChild.rows[0].childNodes[col].style.width = w;
    },

    doAllWidths : function(ws, tw) {
        var s    = this.view.summary.dom,
            wlen = ws.length,
            cells, j;

        s.firstChild.style.width = tw;
        cells = s.firstChild.rows[0].childNodes;

        for (j = 0; j < wlen; j++) {
            cells[j].style.width = ws[j];
        }
    },

    doHidden : function(col, hidden, tw) {
        var s = this.view.summary.dom,
            display = hidden ? 'none' : '';

        s.firstChild.style.width = tw;
        s.firstChild.rows[0].childNodes[col].style.display = display;
    },

    renderSummary : function(o, cs, cm) {
        cs = cs || this.view.getColumnData();
        var cfg = cm.config,
            buf = [],
            last = cs.length - 1,
            c, cf, p, i, len;

        for (i = 0, len = cs.length; i < len; i++) {
            c = cs[i];
            cf = cfg[i];
            p = {};

            p.id = c.id;
            p.style = c.style;
            p.css = i === 0 ? 'x-grid3-cell-first ' : (i === last ? 'x-grid3-cell-last ' : '');

            if (cf.summaryType || cf.summaryRenderer) {
                p.value = (cf.summaryRenderer || c.renderer)(o.data[c.name], p, o);
            } else {
                p.value = '';
            }
            if (p.value === undefined || p.value === "") {
                p.value = "&#160;";
            }
            buf[buf.length] = this.cellTpl.apply(p);
        }

        return this.rowTpl.apply({
            tstyle: 'width:' + this.view.getTotalWidth() + ';',
            cells: buf.join('')
        });
    },

    refreshSummary : function() {
        var g = this.grid, ds = g.store,
            cs = this.view.getColumnData(),
            cm = this.cm,
            rs = ds.getRange(),
            data = this.calculate(rs, cm),
            buf = this.renderSummary({data: data}, cs, cm);

        if (!this.view.summaryWrap) {
            this.view.summaryWrap = Ext.DomHelper.insertAfter(this.view.scroller, {
                tag: 'div',
                cls: 'x-grid3-gridsummary-row-inner'
            }, true);
        }
        this.view.summary = this.view.summaryWrap.update(buf).first();
    },

    toggleSummary : function(visible) { // true to display summary row
        var el = this.grid.getGridEl();

        if (el) {
            if (visible === undefined) {
                visible = el.hasClass('x-grid-hide-gridsummary');
            }
            el[visible ? 'removeClass' : 'addClass']('x-grid-hide-gridsummary');

            this.view.layout(); // readjust gridview height
        }
    },

    getSummaryNode : function() {
        return this.view.summary;
    }
});
Ext.reg('gridsummary', Ext.ux.grid.GridSummary);

/*
 * all Calculation methods are called on each Record in the Store
 * with the following 5 parameters:
 *
 * v - cell value
 * record - reference to the current Record
 * colName - column name (i.e. the ColumnModel's dataIndex)
 * data - the cumulative data for the current column + summaryType up to the current Record
 * rowIdx - current row index
 */
Ext.ux.grid.GridSummary.Calculations = {
    sum : function(v, record, colName, data, rowIdx) {
        return data[colName] + Ext.num(v, 0);
    },

    count : function(v, record, colName, data, rowIdx) {
        return rowIdx + 1;
    },

    max : function(v, record, colName, data, rowIdx) {
        return Math.max(Ext.num(v, 0), data[colName]);
    },

    min : function(v, record, colName, data, rowIdx) {
        return Math.min(Ext.num(v, 0), data[colName]);
    },

    average : function(v, record, colName, data, rowIdx) {
        var t = data[colName] + Ext.num(v, 0), count = record.store.getCount();
        return rowIdx === count - 1 ? (t / count) : t;
    }
};Ext.ux.IFrameComponent = Ext.extend(Ext.BoxComponent, {
    onRender : function(ct, position){

        ct.mask(
            '<img src="themes/img/loading.gif" ' +
                'style="vertical-align: middle;" /> '+
            _('Loading...')
        );

        var frame    = document.createElement('iframe'),
            callback = function(e) {
                ct.unmask();
            };

        frame.id = this.id;
        frame.name = this.id;
        frame.src = this.url;
        frame.frameBorder = 0;

        this.el = ct.appendChild(frame);

        if(Ext.isIE) {
            document.frames[this.url].name = this.id;
        }

        frame[ Ext.isIE?'onreadystatechange':'onload'] = callback.createDelegate(frame);

    }
});/*
 * MultiSelectTreePanel v 1.1
 *
 * This work is derivative of Ext-JS 2.2. Much of the code is modified versions of default code.
 * Refer to Ext-JS 2.2 licencing for more information. http://extjs.com/license
 *
 * Any and all original code is made available as is for whatever purpose you see fit.
 *
 * Should be a largely drop in replacement for ordinary TreePanel when you require multiselect
 * with drag and drop. Overrides most of the methods and events to pass a nodelist rather than
 * a single node.
 *
 * Note that the code is provided as-is and should be considered experimental and likely to contain
 * bugs, especially when combined with other extensions or modifications to the default library.
 *
 * It has been tested against Ext-JS 2.2 and 2.2.1 with:
 *
 * Firefox 3, Opera 9.5+, Safari 3.1, MSIE 6,7,8rc1 (+5.5 seems to work too)
 *
 * Usage:
 *
 * Add the following CSS to make the floating "drag" version of the tree indent prettily..

.x-dd-drag-ghost .x-tree-node-indent,.x-dd-drag-ghost .x-tree-ec-icon {display: inline !important;}

 *
 * If you are using Ext-JS 2.2.1 or earlier you need to add this override! (reported as a bug)
 
Ext.override(Ext.tree.TreeDropZone, {
	completeDrop : function(de){
		var ns = de.dropNode, p = de.point, t = de.target;
		if(!Ext.isArray(ns)){
			ns = [ns];
		}
		var n, node, ins = false;
		if (p != 'append'){
			ins = true;
			node = (p == 'above') ? t : t.nextSibling;
		}
		for(var i = 0, len = ns.length; i < len; i++){
			n = ns[i];
			if (ins){
				t.parentNode.insertBefore(n, node);
			}else{
				t.appendChild(n);
			}
			if(Ext.enableFx && this.tree.hlDrop){
	   		n.ui.highlight();
			}
		}
		ns[0].ui.focus();
		t.ui.endDrop();
		this.tree.fireEvent("nodedrop", de);
	}
	
}); 
 
 *
 * Instantiate like a normal tree (except DD stuff is enabled by default)
 
	var tree = new Ext.ux.MultiSelectTreePanel({
		autoScroll:true,
		width:400,
		height:500,
		animate:true,
		containerScroll: true,
		enableDD: true,
		root: new Ext.tree.AsyncTreeNode({
			text: 'A Book',
			draggable:false,
			id:'node0'
		}),
		loader: new Ext.tree.TreeLoader({
			dataUrl:'bookdata.json'
		})
	});
 	tree.render("target");

 *
 * When listening for DND events look for dragdata.nodes instead of dragdata.node
 *
 * Use ctrl-click to select multiple nodes.
 * Use shift-click to select a range of nodes.
 *
 * Changelog
 *
 *  v1.0 Initial Release
 *
 *	v1.1
 *		- reinstated enableDD, enableDrag, enableDrop config params. *NEED TO INCLUDE THIS NOW*
 *		- consolidated compareDocumentPosition code into compareNodeOrder (only works with rendered nodes)
 *		- cleaned up select function by above and creating selectNode function.
 *		- cleaned up DDGhost generation code to be less hacky (still not ideal)
 *		- included onContainerOver and onContainerDrop code (awaiting ExtJS fix)
 *		- fixed several lingering postdrag selection bugs
 *		- fixed key events to respect shift/ctrl keys
 *		
 * Enjoy
 */
 
Ext.ux.FixedMultiSelectionModel = Ext.extend(Ext.tree.MultiSelectionModel, {

	normalClick: false,

	// overwrite to change click to mousedown...
	init : function(tree){
		this.tree = tree;
		tree.getTreeEl().on("keydown", this.onKeyDown, this);
		tree.on("dblclick", this.onDoubleClick, this);
		tree.on("click", this.onNodeClick, this);
	},

	onDrag: function() {
		// console.trace("onDrag");
		this.normalClick = false;
	},

	onNodeClick : function(node, e){
		if (e.shiftKey) e.preventDefault();
		// disable select unless not using a dragZone, or a multiselectdragzone
		if (!this.tree.dragZone || !this.tree.dragZone.isMultiSelect) {
			this.onMouseDown(node, e);
			this.onMouseUp(node, e);
		}
	},

	onMouseDown: function(node, e) {
/* 		console.debug("SelModel onMouseDown "+node.id+" "+node.isSelected()+" "+e.ctrlKey+" "+e.shiftKey); */
		// if node is selected delay unselect
		if (node.isSelected()) {
			if (e.ctrlKey) {
				this.unselect(node);
				this.normalClick = false;
				return;
			}
			this.normalClick = !e.shiftKey;
			
		} else {
			this.select(node, e, e.ctrlKey);
			this.normalClick = false;
		}
	},
	
	onMouseUp: function(node, e) {
/* 		console.debug("SelModel onMouseUp this.normalClick "+node.id); */
		if (this.normalClick) {
			// perform delayed single select to override multiselect (if normal click)
//			(function() {
//				if (this.normalClick) {
					this.select(node, e, e.ctrlKey);
					this.normalClick = false;
//				}
//			}).defer(500, this)
		}
	},
	
	onDoubleClick: function() {
/* 		console.debug("onDoubleClick"); */
		this.normalClick = false;
	},	

	// private
	// for comparing node order... (taken from quirksmode.org and googlecode)
	compareNodeOrder: document.compareDocumentPosition ?
		function(node1, node2) {
			// W3C DOM lvl 3 method (Gecko)
			return 3 - (node1.ui.elNode.compareDocumentPosition(node2.ui.elNode) & 6);
		} : 
		(typeof document.documentElement.sourceIndex !== "undefined" ? 
			function(node1, node2) {
				// IE source index method
				return node1.ui.elNode.sourceIndex - node2.ui.elNode.sourceIndex;	
			} :
			function(node1, node2) {
				if (node1 == node2) return 0;
				// Safari doesn't support compareDocumentPosition or sourceIndex
				// from http://code.google.com/p/doctype/wiki/ArticleNodeCompareDocumentOrder
				var range1 = document.createRange();
				range1.selectNode(a.ui.elNode);
				range1.collapse(true);

				var range2 = document.createRange();
				range2.selectNode(b.ui.elNode);
				range2.collapse(true);

				return range1.compareBoundaryPoints(Range.START_TO_END, range2);
			}		
		),

	// private
	sortSelNodes: function() {
		if (this.selNodes.length > 1) {
			if (!this.selNodes[0].ui.elNode) return;
			this.selNodes.sort(this.compareNodeOrder);
		}
	},

	// private single point for selectNode
	selectNode: function(node, push) {
		if (!this.isSelected(node)) {
			this.selNodes.push(node);
			this.selMap[node.id] = node;
			node.ui.onSelectedChange(true);
		}
	},

	// overwritten from MultiSelectionModel to fix unselecting...
	select : function(node, e, keepExisting){
		// Add in setting an array as selected... (for multi-selecting D&D nodes)
		if(node instanceof Array){
			for (var c=0;c<node.length;c++) {
				this.selectNode(node[c]);
			}
			this.sortSelNodes();
			this.fireEvent("selectionchange", this, this.selNodes, this.lastSelNode);
			return node;
		}
		// Shift Select to select a range
		// NOTE: Doesn't change lastSelNode
		// EEK has to be a prettier way to do this
		if (e && e.shiftKey && this.selNodes.length > 0) {
			this.lastSelNode = this.lastSelNode || this.selNodes[0];
			var before = this.compareNodeOrder(this.lastSelNode, node) > 0;
			// if (this.lastSelNode == node) {
			// check dom node ordering (from ppk of quirksmode.org)
			this.clearSelections(true);
			var cont = true;
			var inside = false;
			var parent = this.lastSelNode;
			// ummm... yeah don't read this bit...
			do {
				for (var next=parent;next!=null;next=(before?next.previousSibling:next.nextSibling)) {
					// hack to make cascade work the way I want it to
					inside = inside || (before && (next == node || next.contains(node)));
					if (next.isExpanded()) {
						next.cascade(function(n) {
							if (cont != inside) {
								this.selectNode(n);
							}
							cont = (cont && n != node);
							return true;
						}, this);
					} else {
						this.selectNode(next);
						cont = (next != node);
					}
					if (!cont) break;
				}
				if (!cont) break;
				while ((parent = parent.parentNode) != null) {
					if (before) {
						this.selectNode(parent);
					}
					cont = (cont && parent != node);
					if (before && parent.previousSibling) {
						parent = parent.previousSibling;
						break;
					}
					if (!before && parent.nextSibling) {
						parent = parent.nextSibling;
						break;
					}
				}
				if (!cont) break;
			} while (parent != null);
			this.selectNode(node);
			// sort the list
			this.sortSelNodes();
			this.fireEvent("selectionchange", this, this.selNodes, node);
			e.preventDefault();
			return node;
		} else if(keepExisting !== true) {
			this.clearSelections(true);
		}
		if(this.isSelected(node)) {
			// handle deselect of node...
			if (keepExisting === true) {
				this.unselect(node);
				if (this.lastSelNode === node) {
					this.lastSelNode = this.selNodes[0];
				}
				return node;
			}
			this.lastSelNode = node;
			return node;
		}
		// save a resort later on...
		this.selectNode(node);
		this.sortSelNodes();
		this.lastSelNode = node;
		this.fireEvent("selectionchange", this, this.selNodes, this.lastSelNode);
		return node;
	},
	// returns selected nodes precluding children of other selected nodes...
	// used for multi drag and drop...
	getUniqueSelectedNodes: function() {
		var ret = [];
		for (var c=0;c<this.selNodes.length;c++) {
			var parent = this.selNodes[c];
			ret.push(parent);
			// nodes are sorted(?) so skip over subsequent nodes inside this one..
			while ((c+1)<this.selNodes.length && parent.contains(this.selNodes[c+1])) c++;
		}
		return ret;
	},
	
	// check for descendents when nodes are removed...
	unselect: function(node, subnodes) {
		if (subnodes) {
			for (var c=this.selNodes.length-1;c>=0;c--) {
				if (this.selNodes[c].isAncestor(node)) {
					Ext.ux.FixedMultiSelectionModel.superclass.unselect.call(this, this.selNodes[c]);
				}
			}		
		}
		return Ext.ux.FixedMultiSelectionModel.superclass.unselect.call(this, node);
	},
	
    /**
     * Selects the node above the selected node in the tree, intelligently walking the nodes
     * @return TreeNode The new selection
     */
    selectPrevious : function(keepExisting){
        var s = this.selNodes[0];
        if(!s){
            return null;
        }
        var ps = s.previousSibling;
        if(ps){
            if(!ps.isExpanded() || ps.childNodes.length < 1){
                return this.select(ps, null, keepExisting);
            } else{
                var lc = ps.lastChild;
                while(lc && lc.isExpanded() && lc.childNodes.length > 0){
                    lc = lc.lastChild;
                }
                return this.select(lc, null, keepExisting);
            }
        } else if(s.parentNode && (this.tree.rootVisible || !s.parentNode.isRoot)){
            return this.select(s.parentNode, null, keepExisting);
        }
        return null;
    },

    /**
     * Selects the node above the selected node in the tree, intelligently walking the nodes
     * @return TreeNode The new selection
     */
    selectNext : function(keepExisting){
        var s = this.selNodes[this.selNodes.length-1];
        if(!s){
            return null;
        }
        if(s.firstChild && s.isExpanded()){
             return this.select(s.firstChild, null, keepExisting);
         }else if(s.nextSibling){
             return this.select(s.nextSibling, null, keepExisting);
         }else if(s.parentNode){
            var newS = null;
            s.parentNode.bubble(function(){
                if(this.nextSibling){
                    newS = this.getOwnerTree().selModel.select(this.nextSibling, null, keepExisting);
                    return false;
                }
            });
            return newS;
         }
        return null;
    },

    onKeyDown : function(e){
        var s = this.selNode || this.lastSelNode;
        // undesirable, but required
        var sm = this;
        if(!s){
            return;
        }
        var k = e.getKey();
        switch(k){
             case e.DOWN:
                 e.stopEvent();
                 this.selectNext(e.shiftKey || e.ctrlKey);
             break;
             case e.UP:
                 e.stopEvent();
                 this.selectPrevious(e.shiftKey || e.ctrlKey);
             break;
             case e.RIGHT:
                 e.preventDefault();
                 if(s.hasChildNodes()){
                     if(!s.isExpanded()){
                         s.expand();
                     }else if(s.firstChild){
                         this.select(s.firstChild, e, e.shiftKey || e.ctrlKey);
                     }
                 }
             break;
             case e.LEFT:
                 e.preventDefault();
                 if(s.hasChildNodes() && s.isExpanded()){
                     s.collapse();
                 }else if(s.parentNode && (this.tree.rootVisible || s.parentNode != this.tree.getRootNode())){
                     this.select(s.parentNode, e, e.shiftKey || e.ctrlKey);
                 }
             break;
        };
    }
    	
});
/*
	Enhanced to support dragging multiple nodes...
	
	for extension refer to data.nodes instead of data.node
	
*/
Ext.ux.MultiSelectTreeDragZone = Ext.extend(Ext.tree.TreeDragZone, {

	isMultiSelect: true,

	onBeforeDrag : function(data, e){
		if (data.nodes && data.nodes.length > 0) {
			for (var c=0;c<data.nodes.length;c++) {
				n = data.nodes[c];
				if (n.draggable === false || n.disabled) return false
			}
			return true;
		} else if (data.node) {
			if (data.node.draggable === false || data.node.disabled) return false			
		}
		return false;
		
	},
	
	alignElWithMouse: function(el, iPageX, iPageY) {
		Ext.ux.MultiSelectTreeDragZone.superclass.alignElWithMouse.apply(this, arguments);
		// test if the proxy object is visible (indicating a drag)
		if (Ext.fly(el).isVisible()) {
			var selModel = this.tree.getSelectionModel();
			if (selModel && selModel.onDrag) {
				selModel.onDrag.call(selModel);
			}
		}
	},
	
	onMouseUp: function(e) {
		// if multiselection model, call mouseup code to reevaluate selection..
		var selModel = this.tree.getSelectionModel();
/* 		console.debug("onMouseUp "+!!selModel.onMouseUp); */
		if (selModel && selModel.onMouseUp) {
			var target = Ext.dd.Registry.getHandleFromEvent(e);
			if (target != null) {
				selModel.onMouseUp.call(selModel,target.node,e);
			}
		}
		Ext.ux.MultiSelectTreeDragZone.superclass.onMouseUp.apply(this, arguments);
	},
	
	// v1.0
	// fixed to handle multiSelectionModel
	// Data now calls SelectionModel.select instead of waiting for the click event
	// Creates Ghost inline rather than calling TreeNodeUI.
	//
	// v1.1
	// cleanup to have ghost generation slightly less hacky... still hacky though...
	// fixes problems with using extra tag nesting in a custom TreeNodeUI.
	getDragData : function(e) {
/* 		console.debug("getdragdata"); */
		// get event target
		var target = Ext.dd.Registry.getHandleFromEvent(e);
		// if no target (die)
		if (target == null) return;
		var selNodes = [];
		// use tree selection model..
		var selModel = this.tree.getSelectionModel();
		if (selModel.onMouseDown) {
			// call selmodel code to handle multiselection..
			selModel.onMouseDown.call(selModel, target.node, e);
			// get selected nodes - nested nodes...
			selNodes = selModel.getUniqueSelectedNodes();
		} else {
			// if not multiSelectionModel.. just use the target..
			// let it handle selection with it's own listeners..
			selNodes = [target.node];
		}
		// if no nodes selected stop now...
		if (!selNodes || selNodes.length < 1) return;
		var dragData = { nodes: selNodes };
		// create a container for the proxy...
		var div = document.createElement('ul'); // create the multi element drag "ghost"
		// add classes to keep is pretty...
		div.className = 'x-tree-node-ct x-tree-lines';
		// add actual dom nodes to div (instead of tree nodes)
		var height = 0;
		for(var i = 0, len = selNodes.length; i < len; i++) {
			// add entire node to proxy
			// normally this is done by TreeNodeUI.appendDDGhost(), but overriding that class requires
			// also overriding TreeLoader etc. Ext.extend() is an option though...
			var clonenode = selNodes[i].ui.wrap.cloneNode(true);
			// fix extra indenting by removing extra spacers
			// should really modify UI rendering code to render a duplicate subtree but this is simpler...
			// count current indent nodes from ui indentNode... (add 1 for elbow)
			var subtract = selNodes[i].ui.indentNode.childNodes.length + 1;
			// avoid indent alterations if possible..
			if (subtract > 0) {
				// relies on node ui using the same tag for all elems...
				var subNodes = Ext.query(selNodes[i].ui.indentNode.nodeName+".x-tree-node-indent", clonenode);
				for (var c=0,clen=subNodes.length;c<clen;c++) {
					var inode = subNodes[c];
					var current = inode.childNodes.length;
					if (current <= subtract) {
						inode.innerHTML = "";
						// remove elbow icon as well..
						if (current < subtract) inode.parentNode.removeChild(subNodes[c].nextSibling);
					} else {
						for (var r=0;r<subtract;r++) {
							subNodes[c].removeChild(subNodes[c].firstChild);
						}
					}
				}
			}
			div.appendChild(clonenode);
			Ext.fly(clonenode).removeClass(['x-tree-selected','x-tree-node-over']);
		}
		dragData.ddel = div;
		return dragData;
	},
	// fix from TreeDragZone (references dragData.node instead of dragData.nodes)
	onInitDrag : function(e){
		var data = this.dragData;
		this.tree.eventModel.disable();
		this.proxy.update("");
		this.proxy.ghost.dom.appendChild(data.ddel);
		this.tree.fireEvent("startdrag", this.tree, data.nodes, e);
	},
	// Called from TreeDropZone (looks like hack for handling multiple tree nodes)
	getTreeNode: function() {
		return this.dragData.nodes;
	},
	// fix from TreeDragZone (refers to data.node instead of data.nodes)
	// Don't know what this does, so leaving as first node.
	getRepairXY : function(e, data){
		return data.nodes[0].ui.getDDRepairXY();
	},

	// fix from TreeDragZone (refers to data.node instead of data.nodes)
	onEndDrag : function(data, e){
		this.tree.eventModel.enable.defer(100, this.tree.eventModel);
		this.tree.fireEvent("enddrag", this.tree, data.nodes || [data.node], e);
	},

	// fix from TreeDragZone (refers to dragData.node instead of dragData.nodes)
	onValidDrop : function(dd, e, id){
		this.tree.fireEvent("dragdrop", this.tree, this.dragData.nodes, dd, e);
		this.hideProxy();
	},

	// fix for invalid Drop
	beforeInvalidDrop : function(e, id){
		// this scrolls the original position back into view
		var sm = this.tree.getSelectionModel();
		// sm.clearSelections();
		// sm.select(this.dragData.nodes, e, true);
	}

});

/*

MultiSelectTreeDropZone

Contains following fixups

- modified functions to handle multiple nodes in dd operation
	isValidDropPoint
	afterRepair
- modified getDropPoint such that isValidDropPoint can simulate leaf style below inserting.
	Overriding isValidDropPoint affects getDropPoint affects onNodeOver and onNodeDrop

Refer to data.nodes instead of data.node for events..

*/
Ext.ux.MultiSelectTreeDropZone = Ext.extend(Ext.tree.TreeDropZone, {

	// fix from TreeDropZone (referred to data.node instead of data.nodes)
	isValidDropPoint : function(n, pt, dd, e, data){
		if(!n || !data) { return false; }
		var targetNode = n.node;
		var dropNodes = data.nodes?data.nodes:[data.node];
		// default drop rules
		if(!(targetNode && targetNode.isTarget && pt)){
			return false;
		}
		if(pt == "append" && targetNode.allowChildren === false){
			return false;
		}
		if((pt == "above" || pt == "below") && (targetNode.parentNode && targetNode.parentNode.allowChildren === false)){
			return false;
		}
		// don't allow dropping a treenode inside itself...
		for (var c=0;c<dropNodes.length;c++) {
			if(dropNodes[c] && (targetNode == dropNodes[c] || dropNodes[c].contains(targetNode))){
				return false;
			}
		}
		// reuse the object
		var overEvent = this.dragOverData;
		overEvent.tree = this.tree;
		overEvent.target = targetNode;
		overEvent.data = data;
		overEvent.point = pt;
		overEvent.source = dd;
		overEvent.rawEvent = e;
		overEvent.dropNode = dropNodes;
		overEvent.cancel = false;
		var result = this.tree.fireEvent("nodedragover", overEvent);
		return overEvent.cancel === false && result !== false;
	},

	// override to allow insert "below" when leaf != true...
	getDropPoint : function(e, n, dd, data){
		var tn = n.node;
		if(tn.isRoot){
			return this.isValidDropPoint(n, "append", dd, e, data)? "append" : false;
		}
		var dragEl = n.ddel;
		var t = Ext.lib.Dom.getY(dragEl), b = t + dragEl.offsetHeight;
		var y = Ext.lib.Event.getPageY(e);
		var noAppend = tn.allowChildren === false || tn.isLeaf() || !this.isValidDropPoint(n, "append", dd, e, data);
		if(!this.appendOnly && tn.parentNode.allowChildren !== false){
			var noBelow = false;
			if(!this.allowParentInsert){
				noBelow = tn.hasChildNodes() && tn.isExpanded();
			}
			var q = (b - t) / (noAppend ? 2 : 3);
			if(y >= t && y < (t + q) && this.isValidDropPoint(n, "above", dd, e, data)){
				return "above";
			}else if(!noBelow && (noAppend || y >= b-q && y <= b) && this.isValidDropPoint(n, "below", dd, e, data)){
				return "below";
			}
		}
		return noAppend? false: "append";
	},

	// Override because it calls getDropPoint and isValidDropPoint
	onNodeOver : function(n, dd, e, data){
		var pt = this.getDropPoint(e, n, dd, data);
		var node = n.node;

		if(!this.expandProcId && pt == "append" && node.hasChildNodes() && !n.node.isExpanded()){
			this.queueExpand(node);
		}else if(pt != "append"){
			this.cancelExpand();
		}

		var returnCls = this.dropNotAllowed;
		if(pt){
			var el = n.ddel;
			var cls;
			if(pt == "above"){
				returnCls = n.node.isFirst() ? "x-tree-drop-ok-above" : "x-tree-drop-ok-between";
				cls = "x-tree-drag-insert-above";
			}else if(pt == "below"){
				returnCls = n.node.isLast() ? "x-tree-drop-ok-below" : "x-tree-drop-ok-between";
				cls = "x-tree-drag-insert-below";
			}else{
				returnCls = "x-tree-drop-ok-append";
				cls = "x-tree-drag-append";
			}
			if(this.lastInsertClass != cls){
				Ext.fly(el).replaceClass(this.lastInsertClass, cls);
				this.lastInsertClass = cls;
			}
		}
		return returnCls;
	},

	// Override because it calls getDropPoint and isValidDropPoint
	onNodeDrop : function(n, dd, e, data){
		var point = this.getDropPoint(e, n, dd, data);
		var targetNode = n.node;
		targetNode.ui.startDrop();
		if(point === false) {
			targetNode.ui.endDrop();
			return false;
		}

		var dropNode = data.node || (dd.getTreeNode ? dd.getTreeNode(data, targetNode, point, e) : null);
		var dropEvent = {
			tree : this.tree,
			target: targetNode,
			data: data,
			point: point,
			source: dd,
			rawEvent: e,
			dropNode: dropNode,
			cancel: !dropNode,
			dropStatus: false
		};
		var retval = this.tree.fireEvent("beforenodedrop", dropEvent);
		if(retval === false || dropEvent.cancel === true || !dropEvent.dropNode){
			targetNode.ui.endDrop();
			return dropEvent.dropStatus;
		}

		targetNode = dropEvent.target;
		if(point == "append" && !targetNode.isExpanded()){
			targetNode.expand(false, null, function(){
				this.completeDrop(dropEvent);
			}.createDelegate(this));
		}else{
			this.completeDrop(dropEvent);
		}
		return true;
	},

	// fix from TreeDropZone (referred to data.node instead of data.nodes)
	afterRepair : function(data){
		if(data && Ext.enableFx){
			var nl = data.nodes?data.nodes:[data.node];
			for (var c=0,len=nl.length;c<len;c++) {
				nl[c].ui.highlight();
			}
		}
		this.hideProxy();
	},

	// handle allowContainerDrop (appends nodes to the root node)
	onContainerDrop : function(dd, e, data) {
		if (this.allowContainerDrop && this.isValidDropPoint({ ddel: this.tree.getRootNode().ui.elNode, node: this.tree.getRootNode() }, "append", dd, e, data)) {
			var targetNode = this.tree.getRootNode();		
			targetNode.ui.startDrop();
			var dropNode = data.node || (dd.getTreeNode ? dd.getTreeNode(data, targetNode, "append", e) : null);
			var dropEvent = {
				tree : this.tree,
				target: targetNode,
				data: data,
				point: "append",
				source: dd,
				rawEvent: e,
				dropNode: dropNode,
				cancel: !dropNode,
				dropStatus: false
			};
			var retval = this.tree.fireEvent("beforenodedrop", dropEvent);
			if(retval === false || dropEvent.cancel === true || !dropEvent.dropNode){
				targetNode.ui.endDrop();
				return dropEvent.dropStatus;
			}
	
			targetNode = dropEvent.target;
			if(!targetNode.isExpanded()){
				targetNode.expand(false, null, function(){
					this.completeDrop(dropEvent);
				}.createDelegate(this));
			}else{
				this.completeDrop(dropEvent);
			}
			return true;
		}
		return false;
	},
	
	// handle allowContaineDrop (treat as a drop to the root node)
	onContainerOver : function(dd, e, data) {
		if (this.allowContainerDrop && this.isValidDropPoint({ ddel: this.tree.getRootNode().ui.elNode, node: this.tree.getRootNode() }, "append", dd, e, data)) {
			return this.dropAllowed;
		}
		return this.dropNotAllowed;
	}

});

/*

	MultiSelectTreePanel

	sets up using FixedMultiSelectionModel
	and initing with extended DragZone and DropZone by default

*/

Ext.ux.MultiSelectTreePanel = Ext.extend(Ext.tree.TreePanel, {

	getSelectionModel : function(){
		if(!this.selModel){
			this.selModel = new Ext.ux.FixedMultiSelectionModel();
		}
		return this.selModel;
	},

	initEvents: function() {
		if((this.enableDD || this.enableDrop) && !this.dropZone){
			this.dropZone = new Ext.ux.MultiSelectTreeDropZone(this, this.dropConfig || {
								ddGroup: this.ddGroup || "TreeDD",
								appendOnly: this.ddAppendOnly === true
							});
		}
		if((this.enableDD || this.enableDrag) && !this.dragZone){
			this.dragZone = new Ext.ux.MultiSelectTreeDragZone(this, {
								ddGroup: this.ddGroup || "TreeDD",
								scroll: this.ddScroll
							});
		}
		Ext.ux.MultiSelectTreePanel.superclass.initEvents.apply(this, arguments);

		// This is temporary. Should really Ext.extend on TreeNode.removeChild()
		// and call getOwnerTree().removeNode(node) or similar...

		this.on("remove", function(tree, parent, node) {
			tree.getSelectionModel().unselect(node, true);
		});
	}
});

Ext.reg('multiselecttreepanel', Ext.ux.MultiSelectTreePanel);
/**
 * Ext.ux.ToastWindow
 *
 * @author  Edouard Fattal
 * @date    March 14, 2008
 *
 * @class Ext.ux.ToastWindow
 * @extends Ext.Window
 */

Ext.namespace("Ext.ux");


Ext.ux.NotificationMgr = {
    positions: []
};

Ext.ux.Notification = Ext.extend(Ext.Window, {
    initComponent: function(){
        Ext.apply(this, {
            iconCls: this.iconCls || 'x-icon-information',
            cls: 'x-notification',
            width: 250,
            autoHeight: true,
            //plain: false,
            draggable: false,
            bodyStyle: 'text-align:center; padding: 10px;'
        });
        if(this.autoDestroy) {
            this.task = new Ext.util.DelayedTask(this.hide, this);
        } else {
            this.closable = true;
        }
        Ext.ux.Notification.superclass.initComponent.call(this);
    },
    setMessage: function(msg){
        this.body.update(msg);
    },
    setTitle: function(title, iconCls){
        Ext.ux.Notification.superclass.setTitle.call(this, title, iconCls||this.iconCls);
    },
    onRender:function(ct, position) {
        Ext.ux.Notification.superclass.onRender.call(this, ct, position);
    },
    onDestroy: function(){
        Ext.ux.NotificationMgr.positions.remove(this.pos);
        Ext.ux.Notification.superclass.onDestroy.call(this);
    },
    cancelHiding: function(){
        this.addClass('fixed');
        if(this.autoDestroy) {
            this.task.cancel();
        }
    },
    afterShow: function(){
        Ext.ux.Notification.superclass.afterShow.call(this);
        Ext.fly(this.body.dom).on('click', this.cancelHiding, this);
        if(this.autoDestroy) {
            this.task.delay(this.hideDelay || 5000);
       }
    },
    animShow: function(){
        this.pos = 0;
        while(Ext.ux.NotificationMgr.positions.indexOf(this.pos)>-1) {
            this.pos++;
        }
        Ext.ux.NotificationMgr.positions.push(this.pos);
        this.setSize(200,100);
        this.el.alignTo(document, "br-br", [ -20, -20-((this.getSize().height+10)*this.pos) ]);
        this.el.slideIn('b', {
            duration: 1,
            callback: this.afterShow,
            scope: this
        });
    },
    animHide: function(){
        Ext.ux.NotificationMgr.positions.remove(this.pos);
        this.el.shadow.hide();
        this.el.ghost("b", {
            duration: 1,
            remove: false,
            callback : function () {
                Ext.ux.NotificationMgr.positions.remove(this.pos);
                this.destroy();
            }.createDelegate(this)

        });
    },

    focus: Ext.emptyFn 

}); 
/**
 * Plugin for the Ext.Panel class to support a collapsed header title
 * Also implements vertical rotation for east and west border panels
 *
 * @author  Joeri Sebrechts <joeri at sebrechts.net>
 * @version 1.1
 * @date    January 11th, 2010
 * @license http://www.gnu.org/licenses/lgpl-3.0.txt
 */
Ext.ns('Ext.ux');
Ext.ux.PanelCollapsedTitle = (function() {
  var rotatedCls = 'x-panel-header-rotated';
  var supportsSVG = 
    !!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");
  var patchCollapsedElem = function() {
    var verticalText = ((this.region == 'east') || (this.region == 'west'));    
    var containerStyle = 'overflow: visible; padding: 0; border: none; background: none;';
    // For vertical text, and for browsers that support SVG
    // (Firefox, Chrome, Safari 3+, Opera 8+)
    if (verticalText && supportsSVG) {
      this.collapsedHeader = this.ownerCt.layout[this.region].getCollapsedEl().createChild({
        tag: 'div',
        style: 'height: 100%; overflow: hidden;'
      });
      // embed svg code inside this container div
      var SVGNS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(SVGNS, 'svg');
      this.collapsedHeader.dom.appendChild(svg);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      var textContainer = document.createElementNS(SVGNS, 'text');
      textContainer.setAttribute('x', 6);
      textContainer.setAttribute('y', 1);
      textContainer.setAttribute('transform', 'rotate(90 6 1)');
      textContainer.setAttribute('class', 'x-panel-header ' + rotatedCls);
      svg.appendChild(textContainer);
      this.collapsedHeaderText = document.createTextNode(this.title);
      textContainer.appendChild(this.collapsedHeaderText);
      // set the style to override the unwanted aspects of the x-panel-header class
      // also copy the x-panel-header "color" to "fill", to color the SVG text node
      var color = Ext.fly(textContainer).getStyle('color');
      textContainer.setAttribute('style', containerStyle + ';fill: ' + color + ';');            
    // For horizontal text or IE
    } else {
      var titleElemStyle = 'position: relative;';
      if (verticalText) {
        // use writing-mode for vertical text
        titleElemStyle += 
          'white-space: nowrap; writing-mode: tb-rl; top: 1px; left: 3px;';
      } else {
        titleElemStyle += 'top: 2px;';
        // margin-right to ensure no overlap with uncollapse button
        containerStyle += 'padding-left: 4px; margin-right: 18px;';
      };
      this.collapsedHeader = this.ownerCt.layout[this.region].getCollapsedEl().createChild({
        tag: 'div',
        // overrides x-panel-header to remove unwanted aspects
        style: containerStyle,
        cls: 'x-panel-header ' + rotatedCls,
        html: '<span style="'+ titleElemStyle + '">'+this.title+'</span>'
      });
      this.collapsedHeaderText = this.collapsedHeader.first();
    };
    if (this.collapsedIconCls) this.setCollapsedIconClass(this.collapsedIconCls);
  };
  this.init = function(p) {
    if (p.collapsible) {
      var verticalText = ((p.region == 'east') || (p.region == 'west'));
      // update the collapsed header title also
      p.setTitle = Ext.Panel.prototype.setTitle.createSequence(function(t) {
        if (this.rendered && this.collapsedHeaderText) {
          // if the collapsed title element is regular html dom
          if (this.collapsedHeaderText.dom) {
            this.collapsedHeaderText.dom.innerHTML = t;
          // or if this is an SVG text node
          } else if (this.collapsedHeaderText.replaceData) {
            this.collapsedHeaderText.nodeValue = t;
          };
        };
      });
      // update the collapsed icon class also
      p.setCollapsedIconClass = function(cls) {
        var old = this.collapsedIconCls;
        this.collapsedIconCls = cls;
        if(this.rendered && this.collapsedHeader){
          var hd = this.collapsedHeader,
          img = hd.child('img.x-panel-inline-icon');
          // if an icon image is already shown, modify it or remove it
          if(img) {
            if (this.collapsedIconCls) {
              Ext.fly(img).replaceClass(old, this.collapsedIconCls);
            } else {
              // remove img node if the icon class is removed
              Ext.fly(img).remove();
            };
          // otherwise create the img for the icon
          } else if (this.collapsedIconCls) {
            Ext.DomHelper.insertBefore(hd.dom.firstChild, {
              tag:'img', src: Ext.BLANK_IMAGE_URL, 
              cls:'x-panel-inline-icon '+this.collapsedIconCls,
              style: verticalText 
                ? 'display: block; margin: 1px 2px;' 
                : 'margin-top: 2px; margin-right: 4px'
            });
          };
        };
      };
      p.on('render', function() {
        if (this.ownerCt.rendered && this.ownerCt.layout.hasLayout) {
          patchCollapsedElem.call(p);
        } else {
          // the panel's container first needs to render/layout its collapsed title bars
          this.ownerCt.on('afterlayout', patchCollapsedElem, p, {single:true});
        };
      }, p);
    }
  };
  return this;
})();/*
 * By Jake Knerr - Copyright 2010 - supersonicecho@gmail.com
 * 
 * Version 1.0
 * 
 * LICENSE
 * GPL v3
 * 
 */
 
Ext.ux.SlidingTabPanel = Ext.extend(Ext.TabPanel, {
	
	initTab: function(item, index){
		Ext.ux.SlidingTabPanel.superclass.initTab.call(this, item, index);

                this.addEvents({
                    startDrag : true,
                    endDrag   : true
                });

		var p = this.getTemplateArgs(item);
		if(!this.slidingTabsID) this.slidingTabsID = Ext.id(); // Create a unique ID for this tabpanel
		new Ext.ux.DDSlidingTab(p, this.slidingTabsID, {
			tabpanel:this // Pass a reference to the tabpanel for each dragObject
		});
	}
	
});

Ext.ux.DDSlidingTab = Ext.extend(Ext.dd.DDProxy, {
	
	// Constructor
	constructor: function() {
		Ext.ux.DDSlidingTab.superclass.constructor.apply(this, arguments);
		this.setYConstraint(0,0,0); // Lock the proxy to its initial Y coordinate
		
		// Create a convenient reference to the tab's tabpanel
		this.tabpanel = this.config.tabpanel;
		
		// Set the slide duration
		this.slideDuration = this.tabpanel.slideDuration;
		if(!this.slideDuration) this.slideDuration = .1;
	}
	
	// Pseudo Private Methods
	,handleMouseDown: function(e, oDD){
		if(this.primaryButtonOnly && e.button != 0) return;
		if(this.isLocked()) return;
		this.DDM.refreshCache(this.groups);
		var pt = new Ext.lib.Point(Ext.lib.Event.getPageX(e), Ext.lib.Event.getPageY(e));
		if (!this.hasOuterHandles && !this.DDM.isOverTarget(pt, this) )  {
		} else {
			if (this.clickValidator(e)) {
				this.setStartPosition(); // Set the initial element position
				this.b4MouseDown(e);
				this.onMouseDown(e);
				this.DDM.handleMouseDown(e, this);
				// this.DDM.stopEvent(e); // Must remove this event swallower for the tabpanel to work
			}
		}
	}
	,startDrag: function(x, y) {

                // Fire the startDrag event
                this.tabpanel.fireEvent('startDrag', this.tabpanel, this.tabpanel.getActiveTab());

		Ext.dd.DDM.useCache = false; // Disable caching of element location
		Ext.dd.DDM.mode = 1; // Point mode
		
		this.proxyWrapper = Ext.get(this.getDragEl()); // Grab a reference to the proxy element we are creating
		this.proxyWrapper.update(); // Clear out the proxy's nodes
		this.proxyWrapper.applyStyles('z-index:1001;border:0 none;');
		this.proxyWrapper.addClass('tab-proxy');
			
			// Use 2 nested divs to mimic the default tab styling
			// You may need to customize the proxy to get it to look like your custom tabpanel if you use a bunch of custom css classes and styles
		this.stripWrap = this.proxyWrapper.insertHtml('afterBegin', '<div class="x-tab-strip x-tab-strip-top"></div>', true);
		this.dragEl = this.stripWrap.insertHtml('afterBegin','<div></div>', true);
		
		this.tab = Ext.get(this.getEl()); // Grab a reference to the tab being dragged
		this.tab.applyStyles('visibility:hidden;'); // Hide the tab being dragged
		
		// Insert the html and css classes for the dragged tab into the proxy
		this.dragEl.insertHtml('afterBegin', this.tab.dom.innerHTML, false);
		this.dragEl.dom.className = this.tab.dom.className; 
		
		// Constrain the proxy drag in the X coordinate to the tabpanel
		var panelWidth = this.tabpanel.el.getWidth();
		var panelX = this.tabpanel.el.getX();
		var tabX = this.tab.getX();
		var tabWidth = this.tab.getWidth();
		var left = tabX - panelX;
		var right = panelX + panelWidth - tabX - tabWidth;
		this.resetConstraints();
		this.setXConstraint(left, right);
	}
	,onDragOver: function(e, targetArr) {
		e.stopEvent();
		
		// Grab the tab you have dragged the proxy over
		var target = Ext.get(targetArr[0].id);
		var targetWidth = target.getWidth();
		var targetX = target.getX();
		var targetMiddle = targetX + (targetWidth / 2);
		var elX = this.tab.getX();
		var dragX = this.proxyWrapper.getX();
		var dragW = this.proxyWrapper.getWidth();
		if(dragX < targetX && ((dragX + dragW) > targetMiddle) ) {
			if(target.next() != this.tab) {
				target.applyStyles('visibility:hidden;');
				this.tab.insertAfter(target);
				this.targetProxy = this.createSliderProxy(targetX, target);
				if(!this.targetProxy.hasActiveFx()) this.animateSliderProxy(target, this.targetProxy, elX);
			}
		}
		if(dragX > targetX && (dragX < targetMiddle)  ) {
			if(this.tab.next() != target) {
				target.applyStyles('visibility:hidden;');
				this.tab.insertBefore(target);
				this.targetProxy = this.createSliderProxy(targetX, target);
				if(!this.targetProxy.hasActiveFx()) this.animateSliderProxy(target, this.targetProxy, elX);
			}
		}
	}
	,animateSliderProxy: function(target, targetProxy, elX){
		targetProxy.shift({
			x: elX
			,easing: 'easeOut'
			,duration: this.slideDuration
			,callback: function() {
				targetProxy.remove();
				target.applyStyles('visibility:visible;');
			}
			,scope:this
		}); 
	}
	,createSliderProxy: function(targetX, target) {
		var sliderWrapperEl = Ext.getBody().insertHtml('afterBegin', '<div class="tab-proxy" style="position:absolute;visibility:visible;z-index:999;left:' + targetX + 'px;"></div>', true);
		sliderWrapperEl.stripWrapper = sliderWrapperEl.insertHtml('afterBegin', '<div class="x-tab-strip x-tab-strip-top"></div>', true);
		sliderWrapperEl.dragEl = sliderWrapperEl.stripWrapper.insertHtml('afterBegin', '<div></div>', true);
		sliderWrapperEl.dragEl.update(target.dom.innerHTML);
		sliderWrapperEl.dragEl.dom.className = target.dom.className;
		var h = parseInt(target.getTop(false));
		sliderWrapperEl.setTop(h)
		return sliderWrapperEl;
	}
	,onDragDrop: function(e, targetId) {
		e.stopEvent();
	}
	,endDrag: function(e){
		var elX 		= this.tab.getX();
		this.proxyWrapper.applyStyles('visibility:visible;');
		
		// Animate the dragProxy to the proper position
		this.proxyWrapper.shift({
			x: elX
			,easing: 'easeOut'
			,duration: this.slideDuration
			,callback: function() {
				this.proxyWrapper.applyStyles('visibility:hidden;');
				this.tab.applyStyles('visibility:visible;');
				
				// Cleanup
				this.stripWrap.remove();
				this.dragEl.remove();
				if(!this.targetProxy) return;
				this.targetProxy.stripWrapper.remove();
				this.targetProxy.dragEl.remove();
			}
			,scope:this
		});
		
		Ext.dd.DDM.useCache = true;

                this.reorderTab();

                // Fire the startDrag event
                this.tabpanel.fireEvent('endDrag', this.tabpanel, this.tabpanel.getActiveTab());

	},
        reorderTab: function() {

            var tabsEl = this.tabpanel.header.child('ul').dom.children,
                tabsId = [],
                tabsOrigin = [];

            for ( var i=0; i < tabsEl.length; i++ ) {
                if( tabsEl[i].id.substr(0, this.tabpanel.id.length) == this.tabpanel.id ) {
                    tabsId.push( tabsEl[i].id.substr((this.tabpanel.id.length+2), tabsEl[i].id.length ) );
                }
            }

            // Now, tabsId is the real list ordered of the tab's id
            // We put this order into parent element

            // We get the original reference of this tabs
            for( var i=0; i < this.tabpanel.items.items.length; i++ ) {
                tabsOrigin[this.tabpanel.items.items[i].id] = this.tabpanel.items.items[i];
            }

            for( var i=0; i < tabsId.length; i++ ) {
                // the keys
                this.tabpanel.items.keys[i] = tabsId[i];
                // the elements
                this.tabpanel.items.items[i] = tabsOrigin[tabsId[i]];
            }

        }
});Ext.ux.UserNotes = Ext.extend(Ext.Button, {

    originalTitle : _('Notes (<b>{0}</b>)'),
    text  : String.format(_('Notes (<b>{0}</b>)'), '-'),

    //var n = Ext.data.Record.create([{name:'name'},{name:'date'}, {name:'content'}]);
    //this.store.insert(0, new n({name:'Machin', date:'10/02/10, 19h00', content: 'Contenu inséré'}));

    initComponent: function() {

        Ext.ux.UserNotes.superclass.initComponent.apply(this);
        Ext.apply(this, {
            iconCls : 'iconUserNotes',
            id : this.fid + '-userNotes',
            menu : new Ext.menu.Menu({

                showSeparator: false,
                allowOtherMenus: true,
                plain: true,
                autoHeight: true,
                forceLayout: true,
                enableScrolling: false,
                items: [{
                    xtype: 'grid',
                    loadMask: true,
                    width: 500,
                    height: 200,
                    contextMenuFrom: false,
                    contextMenuRowIndex: false,
                    sm: new Ext.grid.RowSelectionModel({
                        singleSelect:true
                    }),
                    winNotes : new Ext.Window({
                        scope       : this,
                        title       : _('Add a new note'),
                        iconCls     : 'iconUserNotes',
                        closeAction : 'hide',
                        width       : 600,
                        height      : 300,
                        layout      :'form',
                        hideLabel   : true,
                        modal       : true,
                        items       : [{
                            xtype      : 'htmleditor',
                            hideLabel  : true,
                            enableLinks: false,
                            anchor     : '100%'
                        }],
                        listeners: {
                            show: function(win) {
                                win.items.items[0].setValue('');
                            }

                        },
                        buttons: [{
                            text: _('Add'),
                            handler: function()
                            {
                                var mainBtn = this.ownerCt.ownerCt.scope,
                                win = this.ownerCt.ownerCt;
                        
                                // Stay the mainMenu open event a clic
                                mainBtn.menu.show(mainBtn.el);

                                var fieldValue = this.ownerCt.ownerCt.items.items[0].getValue();
                                var file = mainBtn.file;

                                XHR({
                                    scope  : this,
                                    params : {
                                        task : 'addUserNote',
                                        file : file,
                                        note : fieldValue

                                    },
                                    success : function()
                                    {
                                        // We close the window
                                        win.hide();

                                        // We must refresh the store
                                        mainBtn.menu.items.items[0].store.reload();

                                        // Notify
                                        PhDOE.notify('info', _('Note added'), _('The note was added successfully !'));

                                    },
                                    failure : function()
                                    {
                                        PhDOE.winForbidden();
                                    }
                                });


                            }
                        },{
                            text   : _('Cancel'),
                            handler: function()
                            {
                                var mainBtn = this.ownerCt.ownerCt.scope;

                                // Stay the mainMenu open event a clic
                                mainBtn.menu.show(mainBtn.el);
                        
                                this.ownerCt.ownerCt.hide();
                            }
                        }]


                    }),
                    contextMenu : new Ext.menu.Menu({
                        scope    : this,
                        listeners: {
                            show: function(m) {
                                // We hide item according for the right click origin
                                if( this.scope.menu.items.items[0].contextMenuFrom === 'containercontextmenu') {
                                    this.items.items[2].disable();
                                } else {

                                    // We must check if this note is owned by the current use.
                                    // If so, he can delete it. If not, he can't.
                                    var grid = this.scope.menu.items.items[0];

                                    var noteOwner = grid.store.getAt(grid.contextMenuRowIndex).data.user
                                    if( PhDOE.userLogin == noteOwner ) {
                                        this.items.items[2].enable();
                                    } else {
                                        this.items.items[2].disable();
                                    }
                                }

                                // Not depending of above condition, we disable items for anonymous
                                if( PhDOE.userLogin == "anonymous" ) {
                                    this.items.items[0].disable();
                                    this.items.items[2].disable();
                                }
                            }
                        },
                        items : [{
                            text    : _('Add a new note'),
                            iconCls : 'iconUserNotes',
                            handler : function()
                            {
                                var grid = this.ownerCt.scope.menu.items.items[0];

                                grid.winNotes.show();
                            }
                        }, '-', {
                            text    : _('Delete this note'),
                            iconCls : 'iconDelete',
                            handler : function()
                            {
                                var grid = this.ownerCt.scope.menu.items.items[0],
                                noteID = grid.store.getAt(grid.contextMenuRowIndex).data.id;

                                XHR({
                                    scope  : this,
                                    params : {
                                        task   : 'delUserNote',
                                        noteID : noteID

                                    },
                                    success : function(r)
                                    {
                                        var o = Ext.util.JSON.decode(r.responseText);

                                        // We must refresh the store
                                        grid.store.reload();

                                        // o.result can be false if we try to delete a note not owned by userLogin

                                        if( o.result ) {
                                            // Notify
                                            PhDOE.notify('info', _('Note deleted'), _('The note was deleted successfully !'));
                                        }

                                    },
                                    failure : function()
                                    {
                                        PhDOE.winForbidden();
                                    }
                                });


                            }
                        },'-', {
                            text    : _('Reload data'),
                            iconCls : 'iconRefresh',
                            handler : function()
                            {
                                var grid = this.ownerCt.scope.menu.items.items[0];

                                grid.store.reload();
                            }
                        }]
                    }),
                    store: new Ext.data.Store({
                        autoLoad: true,
                        proxy : new Ext.data.HttpProxy({
                            url : './do/getUserNotes'
                        }),
                        baseParams: {
                            file: this.file
                        },
                        reader : new Ext.data.JsonReader({
                            root          : 'Items',
                            totalProperty : 'nbItems',
                            idProperty    : 'id',
                            fields        : [
                            {
                                name : 'id'
                            },

                            {
                                name : 'user'
                            },

                            {
                                name : 'note'
                            },

                            {
                                name : 'date',
                                type : 'date',
                                dateFormat : 'Y-m-d H:i:s'
                            }
                            ]
                        }),
                        sortInfo : {
                            field     : 'date',
                            direction : 'DESC'
                        },
                        listeners: {
                            scope: this,
                            datachanged: function(ds) {
                                var total = ds.getCount();
                                this.setText(String.format(this.originalTitle, total));

                            }
                        }
                    }),
                    listeners: {
                        scope: this,
                        rowclick: function(grid) {
                            // If the contextMenu is show, we hide it
                            if( !grid.contextMenu.hidden ) {
                                grid.contextMenu.hide();
                            }
                        },
                        containercontextmenu: function(grid, e) {
                            e.stopEvent();

                            // We deselect all previous rows
                            grid.getSelectionModel().clearSelections();

                            grid.contextMenuFrom = 'containercontextmenu';

                            grid.contextMenu.showAt(e.getXY());

                            // When we display the contextMenu, the initial menu disappears.
                            // We must re-show him and set a zindex for contextmenu higher than the initial menu to be visible.
                            this.menu.show(this.el);
                            var zindex = this.menu.el.zindex + 2000;
                            grid.contextMenu.el.setStyle('z-index', zindex);
                        },
                        rowcontextmenu: function(grid, rowIndex, e) {
                            e.stopEvent();

                            // We select this row
                            grid.getSelectionModel().selectRow(rowIndex);

                            grid.contextMenuFrom = 'rowcontextmenu';
                            grid.contextMenuRowIndex = rowIndex;

                            grid.contextMenu.showAt(e.getXY());

                            // When we display the contextMenu, the initial menu disappears.
                            // We must re-show him and set a zindex for contextmenu higher than the initial menu to be visible.
                            this.menu.show(this.el);
                            var zindex = this.menu.el.zindex + 2000;
                            grid.contextMenu.el.setStyle('z-index', zindex);
                        }

                    },
                    colModel: new Ext.grid.ColumnModel({
                        defaults: {
                            sortable: true
                        },
                        columns: [{
                            id: 'user',
                            header: _('By'),
                            sortable: true,
                            dataIndex: 'user'
                        }, {
                            header: _('Date'),
                            dataIndex: 'date',
                            renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
                        }]
                    }),
                    autoExpandColumn: 'user',
                    viewConfig: {
                        forceFit: true,
                        deferEmptyText: false,
                        emptyText    : '<div style="text-align: center;">' + _('No user notes') + '<br><br>' + _('Right click to add a new note') + '</div>',
                        enableRowBody : true,
                        getRowClass   : function(record, rowIndex, p)
                        {
                            p.body = '<p class="x-usernotes-content">' + record.data.note + '</p>';
                            return 'x-grid3-row-expanded';
                        }
                    }

                }]
            })
        });
    }

});

Ext.reg('usernotes', Ext.ux.UserNotes);
Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.ChangeFileOwner = function(config)
{
    Ext.apply(this, config);

    var msg = Ext.MessageBox.wait(_('Saving data...'));
        
    XHR({
        scope  : this,
        params : {
            task        : 'setFileOwner',
            fileIdDB    : this.fileIdDB,
            newOwner    : this.newOwner
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            // We reload 2 stores to reflect this change
            ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload(function() {
                ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload();
            });
            
            // We reload the information Portlet to reflect this change
            ui.cmp.PortletInfo.getInstance().store.reload();
            
            // Remove wait msg
            msg.hide();
            
            this.from.close();
            
            // Notify
            PhDOE.notify('info', _('Owner changed'), _('The owner for this file have been changed successfully !'));
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            // Remove wait msg
            msg.hide();
            PhDOE.winForbidden(o.type);
            
            this.from.close();
        }
    });
};Ext.namespace('ui','ui.task','ui.task._CheckBuildTask');

ui.task._CheckBuildTask.display = function()
{
    XHR({
        params  : {
            task : 'getLogFile',
            file : 'project_' + PhDOE.project + '_log_check_build_' + PhDOE.user.lang
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            Ext.getBody().unmask();

            // Re-enable TaskPing
            ui.task.PingTask.getInstance().delay(30000);

            // Display
            if ( Ext.getCmp('main-panel').findById('check_build_panel_' + PhDOE.user.lang) ) {
                Ext.getCmp('main-panel').remove('check_build_panel_' + PhDOE.user.lang);
            }

            Ext.getCmp('main-panel').add({
                xtype      : 'panel',
                id         : 'check_build_panel_' + PhDOE.user.lang,
                title      : String.format(_('Check build result for {0}'),Ext.util.Format.uppercase(PhDOE.user.lang)),
                tabTip     : String.format(_('Check build result for the documentation {0}'), Ext.util.Format.uppercase(PhDOE.user.lang)),
                closable   : true,
                autoScroll : true,
                iconCls    : 'iconCheckBuild',
                html       : '<div class="check-build-content">' + o.mess + '</div>'
            });
            Ext.getCmp('main-panel').setActiveTab('check_build_panel_' + PhDOE.user.lang);
        }
    });
};

ui.task._CheckBuildTask.poll = new Ext.util.DelayedTask(function()
{
    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'project_' + PhDOE.project + '_lock_check_build_' + PhDOE.user.lang
        },
        success : function()
        {
            ui.task._CheckBuildTask.poll.delay(5000);
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            if (o && o.success === false) {
                new ui.task._CheckBuildTask.display();
            } else {
                ui.task._CheckBuildTask.poll.delay(5000);
            }
        }
    });
});

ui.task.CheckBuildTask = function()
{
    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until the build is checked...')
    );

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    XHR({
        params  : {
            task       : 'checkBuild',
            xmlDetails : Ext.getCmp('option-xml-details').checked
        },
        success : function()
        {
            new ui.task._CheckBuildTask.display();
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (o && o.success === false) {
                // Re-enable TaskPing
                ui.task.PingTask.getInstance().delay(30000);
                Ext.getBody().unmask();
                PhDOE.winForbidden();
            } else {
                // take over 30sec (max Keep-Alive time)
                // poll every XX secondes if the check build is finish
                ui.task._CheckBuildTask.poll.delay(5000);
            }
        }
    });
};
Ext.namespace('ui','ui.task','ui.task._CheckEntitiesTask');

ui.task._CheckEntitiesTask.display = function()
{
    BtnViewResult = Ext.getCmp('btn-check-entities-view-last-result');

    Ext.getBody().unmask();

    // Re-enable TaskPing
    ui.task.PingTask.getInstance().delay(30000);

    // If the tab "view result of check entities" is open, we close it
    if ( Ext.getCmp('main-panel').findById('tab-check-entities' ) ) {
        Ext.getCmp('main-panel').remove('tab-check-entities');
    }
    // We simulate a click onto the Btn to display the result of the check
    BtnViewResult.handler.call(BtnViewResult.scope || BtnViewResult, BtnViewResult);

};

ui.task._CheckEntitiesTask.poll = new Ext.util.DelayedTask(function()
{
    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'project_' + PhDOE.project + '_lock_check_entities'
        },
        success : function()
        {
            ui.task._CheckEntitiesTask.poll.delay(5000);
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            if (o && o.success === false) {
                new ui.task._CheckEntitiesTask.display();
            } else {
                ui.task._CheckEntitiesTask.poll.delay(5000);
            }
        }
    });
});

ui.task.CheckEntitiesTask = function()
{
    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until entities are checked...')
    );

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    XHR({
        params : {
            task : 'checkEntities'
        },
        success : function()
        {
            new ui.task._CheckEntitiesTask.display();
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (o && o.success === false) {
                // Re-enable TaskPing
                ui.task.PingTask.getInstance().delay(30000);
                Ext.getBody().unmask();
                PhDOE.winForbidden();
            } else {
                // take over 30sec (max Keep-Alive time)
                // poll every XX secondes if the check build is finish
                ui.task._CheckEntitiesTask.poll.delay(5000);
            }
        }
    });
};Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeIdx}
ui.task.CheckFileTask = function(config)
{
    Ext.apply(this,config);

    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Checking for error. Please, wait...')
    );

    XHR({
        scope  : this,
        params : {
            task        : 'checkFileError',
            FilePath    : this.fpath,
            FileName    : this.fname,
            FileLang    : this.lang,
            FileContent : Ext.getCmp(this.prefix + '-' + this.ftype +
                                        '-FILE-' + this.fid).getCode()
        },
        success : function(r)
        {
            Ext.getBody().unmask();

            var o = Ext.util.JSON.decode(r.responseText);

            // If there is some errors, we display this
            if (o.error && o.error_first !== '-No error-') {

                Ext.getCmp('main-panel').add({
                    id         : 'FE-help-' + this.fid,
                    title      : 'Error in ' + this.fname,
                    iconCls    : 'iconFilesError',
                    closable   : true,
                    autoScroll : true,
                    autoLoad   : './error?dir='  + this.fpath +
                                        '&file=' + this.fname
                });

                Ext.getCmp('main-panel').setActiveTab('FE-help-' + this.fid);

            } else {
                // If there is no error, we display an information message
                Ext.MessageBox.show({
                    title   : _('Check for errors'),
                    msg     : _('There is no error.'),
                    buttons : Ext.MessageBox.OK,
                    icon    : Ext.MessageBox.INFO
                });
            }

            // Now, We save  File
            new ui.task.SaveFileTask({
                prefix      : this.prefix,
                ftype       : this.ftype,
                fid         : this.fid,
                fpath       : this.fpath,
                fname       : this.fname,
                lang        : this.lang,
                storeRecord : this.storeRecord
            });

            if (this.prefix === 'FE') {
                // We must reload the iframe of error description
                Ext.getCmp('FE-error-desc-' + this.fid).body.updateManager.refresh();
            }

            ui.cmp.ErrorFileGrid.getInstance().store.reload();
        }
    });
};Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.CheckXml = function(config)
{
    Ext.apply(this, config);

    var id_prefix = this.prefix + '-' + this.ftype,
        msg       = Ext.MessageBox.wait(_('XML check. Please, wait...'));

    XHR({
        scope  : this,
        params : {
            task        : 'checkXml',
            fileContent : Ext.getCmp(this.idPrefix + '-FILE-' + this.fid).getCode()
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            // Remove wait msg
            msg.hide();
            
            // Is there some errors ?
            if( o.errors !== 'no_error' ) {
                
                new ui.cmp.CheckXmlWin({
                    errors : o.errors
                });
                
            } else {
                PhDOE.notify('info', _('XML check'), _('There is no error.'));
            }
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            // Remove wait msg
            msg.hide();
        }
    });
};Ext.namespace('ui','ui.task');

// config - { ftype, fpath, fname }
ui.task.ClearLocalChangeTask = function(config)
{
    Ext.apply(this, config);

    Ext.MessageBox.confirm(
        _('Confirm'),
        _('This action will clear your local modification and take back this file from his original stats.<br/>You need confirm.'),
        function(btn)
        {
            if (btn === 'yes') {
                Ext.getBody().mask(
                    '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                    _('Please, wait...')
                );

                // Before clear local change, we close the file if there is open

                var panel = ["FNT", "FNU", "FE", "FNR", "FNIEN", "AF"];

                for( var i=0; i < panel.length; i++) {
                    if (Ext.getCmp('main-panel').findById(panel[i] + '-' + Ext.util.md5(panel[i] + '-' + this.fpath + this.fname))) {
                        Ext.getCmp('main-panel').remove(  panel[i] + '-' + Ext.util.md5(panel[i] + '-' + this.fpath + this.fname));
                    }
                }

                XHR({
                    scope  : this,
                    params : {
                        task     : 'clearLocalChange',
                        FileType : this.ftype,
                        FilePath : this.fpath,
                        FileName : this.fname
                    },
                    success : function(r)
                    {
                        var o = Ext.util.JSON.decode(r.responseText),
                            node;

                        // We delete this record from the work in progress module
                        ui.cmp.WorkTreeGrid.getInstance().delRecord(o.oldIdDB);
                        // .. and Patches module
                        ui.cmp.PatchesTreeGrid.getInstance().delRecord(o.oldIdDB);

                        // Action for EN file
                        if( o.lang === 'en' && this.ftype === 'update' ) {

                            // trow StaleFile store
                            ui.cmp.StaleFileGrid.getInstance().store.each(
                                function(record)
                                {
                                    if ((record.data.path) === '/'+o.path && record.data.name === o.name ) {
                                        record.set('fileModifiedEN', false);
                                        record.set('en_revision', o.revision);
                                        record.commit();
                                    }
                                }, this);

                            // Browse FileError
                            ui.cmp.ErrorFileGrid.getInstance().store.each(
                                function(record)
                                {
                                    if ((PhDOE.user.lang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                        record.set('fileModifiedEN', false);
                                    }
                                }, this);

                            // find open node in All Files modules
                            node = false;
                            node = ui.cmp.RepositoryTree.getInstance().getNodeById('/'+this.fpath+this.fname);
                            if (node) {
                              node.getUI().removeClass('fileModifiedByMe');
                            }

                            Ext.getBody().unmask();
                            return;
                        }

                        // All after this is only available for LANG file

                        // We try to search in others stores if this file is marked as needCommit

                        // Browse PendingTranslate store
                        ui.cmp.PendingTranslateGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.user.lang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('fileModified', false);
                                    record.commit();
                                }
                            }, this);

                        // Browse StaleFile store
                        ui.cmp.StaleFileGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.user.lang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('fileModifiedLang', false);
                                    record.set('revision', o.revision);
                                    record.set('maintainer', o.maintainer);
                                    record.commit();
                                }
                            }, this);

                        // Browse FileError
                        ui.cmp.ErrorFileGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.user.lang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('fileModifiedLang', false);
                                    record.commit();
                                }
                            }, this);

                        // Browse storeFilesNeedReviewed
                        ui.cmp.PendingReviewGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.user.lang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('fileModifiedLang', false);
                                    record.commit();
                                }
                            }, this);

                        // Browse storeNotInEn
                        ui.cmp.NotInENGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.user.lang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('fileModified', false);
                                }
                            }, this);

                        // find open node in All Files modules
                        node = false;
                        node = ui.cmp.RepositoryTree.getInstance().getNodeById('/'+this.fpath+this.fname);
                        if (node) {
                          node.getUI().removeClass('fileModifiedByMe');
                        }

                        Ext.getBody().unmask();
                    },

                    failure : function(r)
                    {
                        Ext.getBody().unmask();

                        var o = Ext.util.JSON.decode(r.responseText);
                        
                        if( o.err ) { 
                            PhDOE.winForbidden(o.err);
                        }
                    }
                });
            }
        }, this
    );
};Ext.namespace('ui','ui.task');

// config - { patchID }
ui.task.DeletePatchTask = function(config)
{
        Ext.apply(this, config);
        
        Ext.getBody().mask(
            '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
            _('Please, wait...')
            );

        XHR({
            scope   : this,
            params  : {
                task    : 'deletePatch',
                patchID : this.patchID
            },
            success : function()
            {
                Ext.getBody().unmask();

                // We remove the patch from Patches for review module
                ui.cmp.PatchesTreeGrid.getInstance().deletePatch(this.patchID);

                // Notify
                PhDOE.notify('info', _('Patch deleted'), _('The patch have been deleted !'));

            },
            failure : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText);

                // Remove wait msg
                Ext.getBody().unmask();
                if( o.err ) {
                    PhDOE.winForbidden(o.err);
                } else {
                    PhDOE.winForbidden();
                }   
            }
        });
};Ext.namespace('ui','ui.task');

// config - { xmlID }
ui.task.GetFileInfoByXmlID = function(config)
{
    Ext.apply(this, config);

    // We load the File
    XHR({
        scope   : this,
        params  : {
            task  : 'getFileInfoByXmlID',
            xmlID : this.xmlID
        },
        success : function(r)
        {
            var o    = Ext.util.JSON.decode(r.responseText);

            ui.cmp.RepositoryTree.getInstance().openFile(
                o.lang + o.path,
                o.name
            );
        }
    });
};Ext.namespace('ui','ui.task');

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
                fileModifiedInfo = (o.fileModified) ? Ext.util.JSON.decode(o.fileModified) : false,
                dataModified, mess;

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
                p.permlink = (o.xmlid !== 'NULL') ? perm : '';
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
            if( o.fileModified && 
                
                (
                    ( !PhDOE.isAnonymous && fileModifiedInfo.user !== PhDOE.user.login ) ||
                    ( PhDOE.isAnonymous && fileModifiedInfo.anonymousIdent !== PhDOE.user.anonymousIdent )
                )
                
            ) {

                // If the current user is an authenticate user & the user who have modified this file is an anonymous, we allow to modify this file
                if( fileModifiedInfo.isAnonymous  && !PhDOE.isAnonymous ) {
                    Ext.MessageBox.show({
                        title   : _('Information'),
                        msg     : String.format(_('File modified by {0} (anonymous user) but you are an authenticated user, so you can modify it.'), fileModifiedInfo.user.ucFirst()),
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
                    
                    mess = Ext.MessageBox.show({
                        title   : _('Information'),
                        msg     : String.format(_('File modified by {0}.'), fileModifiedInfo.user.ucFirst()),
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
            if( this.prefix === 'FNT' ) {
                if( this.ftype === 'TRANS' ) {
                    tab.panTRANSLoaded = true;
                }
                if( this.ftype === 'GGTRANS' ) {
                    tab.panGGTRANSLoaded = true;
                }
            }

            // Mark FNU panel as loaded
            if( this.prefix === 'FNU' ) {
                if( this.ftype === 'LANG' ) {
                    tab.panLANGLoaded = true;
                }
                if( this.ftype === 'EN' ) {
                    tab.panENLoaded = true;
                }
            }

            // Mark FE panel as loaded
            if( this.prefix === 'FE' ) {
                if( this.ftype === 'LANG' ) {
                    tab.panLANGLoaded = true;
                }
                if( this.ftype === 'EN' ) {
                    tab.panENLoaded = true;
                }
            }

            // Mark FNR panel as loaded
            if( this.prefix === 'FNR' ) {
                if( this.ftype === 'LANG' ) {
                    tab.panLANGLoaded = true;
                }
                if( this.ftype === 'EN' ) {
                    tab.panENLoaded = true;
                }
            }

            // Mark FNIEN panel as loaded
            if( this.prefix === 'FNIEN' ) {
                tab.panLANGLoaded = true;
            }

            // Mark AF panel as loaded
            if( this.prefix === 'AF' ) {
                tab.panLoaded = true;
            }

            Ext.getCmp('main-panel').fireEvent('tabLoaded', this.prefix, this.fid);
        }
    });
};Ext.namespace('ui','ui.task');

// config - { str }
ui.task.GetGGTranslation = function(config)
{
    Ext.apply(this, config);

    // CleanUp the current result area
    Ext.get('GGTranslate-result').dom.innerHTML = '';

    // Disable the button & add a wait message into it
    Ext.getCmp('GGTranslate-btn').disable();
    Ext.getCmp('GGTranslate-btn').setText(_('Please, wait...'));

    // We load the File
    XHR({
        scope  : this,
        params : {
            task : 'getGGTranslation',
            str  : this.str
        },
        success : function(response)
        {
            var o    = Ext.util.JSON.decode(response.responseText);

            Ext.get('GGTranslate-result').dom.innerHTML = o.translation;
            Ext.getCmp('GGTranslate-btn').setText(_('Translate !'));
            Ext.getCmp('GGTranslate-btn').enable();
        }
    });
};Ext.namespace('ui','ui.task');

ui.task.LoadConfigTask = function(config)
{
    Ext.apply(this, config);

    XHR({
        params  : { task : 'getConf' },
        success : function(r)
        {
            var o = Ext.decode(r.responseText);

            PhDOE.user.login = o.mess.userLogin;
            PhDOE.user.lang  = o.mess.userLang;
            PhDOE.user.isAnonymous = o.mess.userIsAnonymous;
            PhDOE.user.isGlobalAdmin = o.mess.userIsGlobalAdmin;
            PhDOE.user.isLangAdmin = o.mess.userIsLangAdmin;
            PhDOE.user.conf = o.mess.userConf;

            PhDOE.project   = o.mess.project;
            PhDOE.app.conf   = o.mess.appConf;

            //For the theme, we apply it.
            Ext.get('appTheme').dom.href = PhDOE.user.conf.main.theme;

            // Draw the interface
            PhDOE.drawInterface();
        }
    });
};Ext.namespace('ui','ui.task');

// config - { fpath, fname, storeRecord }
ui.task.MarkDeleteTask = function(config)
{
    Ext.apply(this, config);

    Ext.MessageBox.confirm(
        _('Confirm'),
        _('This action will mark this file as need deleted.<br/><br/>You need commit this change to take it effect.<br/><br/>Please, confirm this action.'),
        function(btn)
        {
            if (btn === 'yes') {
                Ext.getBody().mask(
                    '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                    _('Please, wait...')
                );

                XHR({
                    scope   : this,
                    params  : {
                        task     : 'markAsNeedDelete',
                        FilePath : PhDOE.user.lang + this.fpath,
                        FileName : this.fname
                    },
                    success : function(r)
                    {
                        var o = Ext.util.JSON.decode(r.responseText);

                        Ext.getBody().unmask();
                        ui.cmp.WorkTreeGrid.getInstance().addRecord(
                            o.id, PhDOE.user.lang + this.fpath, this.fname, 'delete'
                        );
                        this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    }
                });
            }
        }, this
    );
};Ext.namespace('ui','ui.task');

// config - { patchID, patchName, nodesToAdd }
ui.task.MoveToPatch = function(config)
{
        Ext.apply(this, config);
        
        var filesID=[];

        Ext.each(this.nodesToAdd, function(node) {
            filesID.push(node.attributes.idDB);
        });

        Ext.getBody().mask(
            '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
            _('Please, wait...')
            );

        XHR({
            scope   : this,
            params  : {
                task    : 'moveToPatch',
                patchID : this.patchID,
                filesID : filesID.join(',')
            },
            success : function()
            {
                Ext.getBody().unmask();

                // We add this new patch, and nodesToAdd into Patches for review component
                ui.cmp.PatchesTreeGrid.getInstance().addToPatch(this.patchID, this.patchName, this.nodesToAdd);

                // We get all idDB from this nodes to delete record from Work in progress
                if( this.nodesToAdd ) {
                    Ext.each(this.nodesToAdd, function(node) {
                        ui.cmp.WorkTreeGrid.getInstance().delRecord(node.attributes.idDB);
                    });
                }

            },
            failure : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText);
                Ext.getBody().unmask();

                Ext.MessageBox.alert('Error', o.err);
            }
        });
};Ext.namespace('ui','ui.task');

// config - { patchID, patchName, nodesToAdd }
ui.task.MoveToWork = function(config)
{
        Ext.apply(this, config);
        
        var filesID=[];

        Ext.each(this.nodesToAdd, function(node) {
            filesID.push(node.attributes.idDB);
        });

        Ext.getBody().mask(
            '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
            _('Please, wait...')
            );

        XHR({
            scope   : this,
            params  : {
                task    : 'moveToWork',
                filesID : filesID.join(',')
            },
            success : function()
            {
                Ext.getBody().unmask();

                // We add this files into work component
                ui.cmp.WorkTreeGrid.getInstance().addToWork(this.nodesToAdd);

                // We get all idDB from this nodes to delete record from Patch for review
                if( this.nodesToAdd ) {
                    Ext.each(this.nodesToAdd, function(node) {
                        ui.cmp.PatchesTreeGrid.getInstance().delRecord(node.attributes.idDB);
                    });
                }

            },
            failure : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText);
                Ext.getBody().unmask();

                Ext.MessageBox.alert('Error', o.err);
            }
        });
};Ext.namespace('ui', 'ui.task', 'ui.task._PingTask');

ui.task.PingTask = function()
{
    this.task = new Ext.util.DelayedTask(function()
    {
        XHR({
            params  : {
                task : 'ping'
            },
            success : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText), needReloadSummary;

                if (o.ping !== 'pong') {
                    window.location.href = './';
                } else {

                    // We look if there is a modification of the count for all modules. If so, we reload the corresponding module
                    if( PhDOE.user.lang !== 'en' ) {

                        needReloadSummary = false;

                        // We look for modules specifics for translation
                        if( ui.cmp.PendingTranslateGrid.getInstance().store.getTotalCount() !== o.totalData.NbPendingTranslate ) {
                            ui.cmp.PendingTranslateGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.StaleFileGrid.getInstance().store.getTotalCount() !== o.totalData.NbPendingUpdate ) {
                            ui.cmp.StaleFileGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.ErrorFileGrid.getInstance().store.getTotalCount() !== o.totalData.NbFilesError ) {
                            ui.cmp.ErrorFileGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.PendingReviewGrid.getInstance().store.getTotalCount() !== o.totalData.NbPendingReview ) {
                            ui.cmp.PendingReviewGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.NotInENGrid.getInstance().store.getTotalCount() !== o.totalData.NbNotInEn ) {
                            ui.cmp.NotInENGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( needReloadSummary ) {
                            ui.cmp.PortletSummary.getInstance().store.reload();
                        }

                    }

                    // This 3 modules is commun with EN and LANG
					
					// TODO : find a way to detect modification into WorkTreeGrid & Patches for review
					/*
                    if( ui.cmp.PendingCommitGrid.getInstance().store.getCount() != o.totalData.NbPendingCommit ) {
                        ui.cmp.PendingCommitGrid.getInstance().store.reload();
                    }

                    if( ui.cmp.PendingPatchGrid.getInstance().store.getCount() != o.totalData.NbPendingPatch ) {
                        ui.cmp.PendingPatchGrid.getInstance().store.reload();
                    }
                    */

                    if( o.totalData.lastInfoDate !== PhDOE.lastInfoDate ) {
                        ui.cmp.PortletInfo.getInstance().store.reload();
                    }

                }
            },
            failure: function()
            {
                window.location.href = './';
            }
        });
        this.task.delay(30000);
    }, this);
};

// delegates
ui.task.PingTask.prototype.delay = function(delay, newFn, newScope, newArgs)
{
    this.task.delay(delay, newFn, newScope, newArgs);
};
ui.task.PingTask.prototype.cancel = function()
{
    this.task.cancel();
};

// singleton
ui.task._PingTask.instance = null;
ui.task.PingTask.getInstance = function()
{
    if (!ui.task._PingTask.instance) {
        ui.task._PingTask.instance = new ui.task.PingTask();
    }
    return ui.task._PingTask.instance;
};Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.SaveFileTask = function(config)
{
    Ext.apply(this, config);

    var id_prefix = this.prefix + '-' + this.ftype,
        msg       = Ext.MessageBox.wait(_('Saving data...'));

    XHR({
        scope  : this,
        params : {
            task        : 'saveFile',
            filePath    : this.fpath,
            fileName    : this.fname,
            fileLang    : this.lang,
            fileContent : Ext.getCmp(this.prefix + '-' + this.ftype +
                                        '-FILE-' + this.fid).getCode()
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (this.prefix === 'FNU') {
                // Update our store
                if( this.ftype === 'EN' ) {
                    this.storeRecord.set('en_revision', o.revision);
                    this.storeRecord.set('fileModifiedEN', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                } else {
                    this.storeRecord.set('revision', o.en_revision);
                    this.storeRecord.set('fileModifiedLang', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.set('maintainer', o.maintainer);
                }
                this.storeRecord.commit();
            }

            if (this.prefix === 'FE') {
                // Update our store
                if( this.ftype === 'EN' ) {
                    this.storeRecord.set('fileModifiedEN', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.commit();
                } else {
                    this.storeRecord.set('maintainer', o.maintainer);
                    this.storeRecord.set('fileModifiedLang', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.commit();
                }
            }
            
            if (this.prefix === 'FNR') {
                // Update our store
                if( this.ftype === 'EN' ) {
                    this.storeRecord.set('reviewed', o.reviewed);
                    this.storeRecord.set('fileModifiedEN', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.commit();
                } else {
                    this.storeRecord.set('maintainer', o.maintainer);
                    this.storeRecord.set('fileModifiedLang', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.commit();

                }
            }

            if (this.prefix === 'AF') {
                this.storeRecord.getUI().addClass('fileModifiedByMe'); // tree node
            }

            // Add this files into WorkTreeGrid. Before, we delete it from WorkTreeGrid if this file have been same by anothers users.
            ui.cmp.WorkTreeGrid.getInstance().delRecord(o.id);
			ui.cmp.PatchesTreeGrid.getInstance().delRecord(o.id);
			
            ui.cmp.WorkTreeGrid.getInstance().addRecord(
                o.id, this.lang + this.fpath, this.fname, 'update'
            );

            // reset file
            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').disable();
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;

            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).permlink +
                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle
            );

            var cmp;
            if( this.lang === 'en' ) {
                cmp = Ext.getCmp(this.prefix + '-LANG-FILE-' + this.fid);
            } else {
                cmp = Ext.getCmp(this.prefix + '-EN-FILE-' + this.fid);
            }

            if (this.ftype === 'ALL' || !cmp.isModified) {
                // reset tab-panel
                Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                    Ext.getCmp(this.prefix + '-' + this.fid).originTitle
                );
            }

            // Remove wait msg
            msg.hide();

            // Notify
            PhDOE.notify('info', _('Document saved'), String.format(_('Document <br><br><b>{0}</b><br><br> was saved successfully !'), this.lang + this.fpath + this.fname));
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            // Remove wait msg
            msg.hide();
            if( o.type ) {
                PhDOE.winForbidden(o.type);
            } else {
                PhDOE.winForbidden();
            }
        }
    });
};Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.SaveTransFileTask = function(config){
    Ext.apply(this, config);
    
    var id_prefix = this.prefix + '-' + this.ftype, msg = Ext.MessageBox.wait(_('Saving data...'));
    
    XHR({
        scope: this,
        params: {
            task: 'saveFile',
            type: 'trans',
            filePath: this.fpath,
            fileName: this.fname,
            fileLang: this.lang,
            fileContent: Ext.getCmp(this.prefix + '-' + this.ftype +
            '-FILE-' +
            this.fid).getCode()
        },
        
        success: function(r){
            var o = Ext.util.JSON.decode(r.responseText);
            
            if (this.ftype != 'NEW') {
                this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                this.storeRecord.commit();
            }
            else {
                this.storeRecord.data.node.reload();
            }
            
            // Add this files into WorkTreeGrid
            ui.cmp.WorkTreeGrid.getInstance().addRecord(o.id, this.lang + this.fpath, this.fname, 'new');
            
            // reset file
            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').disable();
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
            
            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle);
            // reset tab-panel
            Ext.getCmp(this.prefix + '-' + this.fid).setTitle(Ext.getCmp(this.prefix + '-' + this.fid).originTitle);
            
            // Remove wait msg
            msg.hide();
            
            // Notify
            PhDOE.notify('info', _('Document saved'), String.format(_('Document <br><br><b>{0}</b><br><br> was saved successfully !'), this.lang + this.fpath + this.fname));
        },
        
        failure: function(r){
            var o = Ext.util.JSON.decode(r.responseText);
            
            // Remove wait msg
            msg.hide();
            if (o.type) {
                PhDOE.winForbidden(o.type);
            }
            else {
                PhDOE.winForbidden();
            }
        }
    });
};
Ext.namespace('ui','ui.task');

// config - { item, value, [notify=true] }
ui.task.SetFileProgressTask = function(config)
{
    Ext.apply(this, config);

    // Apply modification in DB
    XHR({
        scope   : this,
        params  : {
            task     : 'SetFileProgress',
            idDB     : this.idDB,
            progress : this.progress
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText),
                mess;
            
            if( o.err ) {                
                if( o.err == 'file_dont_exist_in_workInProgress' ) {
                    mess = _('The file you want to change the estimated progress don\'t exist into the database.');
                }            
                if( o.err == 'file_isnt_owned_by_current_user' ) {
                    mess = _('The file you want to change the estimated progress isn\'t own by you.<br>You only can modify this information for yours files.');
                }
            }
            
            if( mess ) {
                PhDOE.notify('error', _('Error'), mess);
            }
        }
    });
};Ext.namespace('ui','ui.task','ui.task._SystemUpdateTask');

ui.task._SystemUpdateTask.refresh_ui = function()
{
    Ext.get('wizard-step-3').replaceClass('wizard-step-before', 'wizard-step-working');

    PhDOE.reloadAllStore();

    Ext.get('wizard-step-3').replaceClass('wizard-step-working', 'wizard-step-done');

    // Re-enable Finish button
    Ext.getCmp('btn-start-refresh').setIconClass('iconFinishRefresh');
    Ext.getCmp('btn-start-refresh').setText(_('Finish !'));
    Ext.getCmp('btn-start-refresh').setHandler(function()
    {
        Ext.getCmp('sys-update-win').close();
    });
    Ext.getCmp('btn-start-refresh').enable();

    // Re-enable TaskPing
    ui.task.PingTask.getInstance().delay(30000);

    // Re-enable win's close button
    Ext.getCmp('sys-update-win').tools.close.setVisible(true);
};

ui.task._SystemUpdateTask.poll_apply_tool = new Ext.util.DelayedTask(function()
{
    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'project_' + PhDOE.project + '_lock_apply_tools'
        },
        success : function()
        {
            ui.task._SystemUpdateTask.poll_apply_tool.delay(5000);
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            if (o && o.success === false) {
                Ext.get('wizard-step-2').replaceClass('wizard-step-working', 'wizard-step-done');
                new ui.task._SystemUpdateTask.refresh_ui();
            } else {
                ui.task._SystemUpdateTask.poll_apply_tool.delay(5000);
            }
        }
    });
});

ui.task._SystemUpdateTask.apply_tool = function()
{
    Ext.get('wizard-step-2').replaceClass('wizard-step-before', 'wizard-step-working');
    XHR({
        params  : {
            task: 'applyTools'
        },
        success : function()
        {
            Ext.get('wizard-step-2').replaceClass('wizard-step-working', 'wizard-step-done');
            new ui.task._SystemUpdateTask.refresh_ui();
        },
        failure : function()
        {
            ui.task._SystemUpdateTask.poll_apply_tool.delay(5000);
        }
    });
};

ui.task._SystemUpdateTask.vcs_poll = new Ext.util.DelayedTask(function()
{
    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'project_' + PhDOE.project + '_lock_update_repository'
        },
        success : function()
        {
            ui.task._SystemUpdateTask.vcs_poll.delay(5000);
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (o && o.success === false) {
                Ext.get('wizard-step-1').replaceClass('wizard-step-working', 'wizard-step-done');
                Ext.get('wizard-step-1.1').replaceClass('wizard-show', 'wizard-wait');

                new ui.task._SystemUpdateTask.apply_tool();
            } else {
                ui.task._SystemUpdateTask.vcs_poll.delay(5000);
            }
        }
    });
});

ui.task.SystemUpdateTask = function()
{
    ui.task.PingTask.getInstance().cancel();

    Ext.get('wizard-step-1').replaceClass('wizard-step-before', 'wizard-step-working');
    Ext.get('wizard-step-1.1').replaceClass('wizard-wait', 'wizard-show');

    XHR({
        params  : { task : 'updateRepository' },
        success : function()
        {
            Ext.get('wizard-step-1').replaceClass('wizard-step-working', 'wizard-step-done');
            Ext.get('wizard-step-1.1').replaceClass('wizard-show', 'wizard-wait');

            new ui.task._SystemUpdateTask.apply_tool();
        },
        failure: function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (o && o.success === false) {
                Ext.getCmp('sys-update-win').close();
                PhDOE.winForbidden(o.type);
            } else {
                ui.task._SystemUpdateTask.vcs_poll.delay(5000);
            }
        }
    });
};Ext.namespace('ui','ui.task');

// config - { item, value, [notify=true] }
ui.task.UpdateConfTask = function(config)
{
    Ext.apply(this, config);
    
    // Apply modification in DB
    XHR({
        scope   : this,
        params  : {
            task      : 'confUpdate',
            module    : this.module,
            itemName  : this.itemName,
            value     : this.value
        },
        success : function()
        {
            // Update userConf object
            PhDOE.user.conf[this.module][this.itemName] = this.value;
            
            // If we touch this config option, we need to reload this store too
            if( this.module == "newFile" &&  this.itemName == "nbDisplay" ) {
                ui.cmp.PendingTranslateGrid.getInstance().store.reload();
            }
            if( this.module == "needUpdate" &&  this.itemName == "nbDisplay" ) {
                ui.cmp.StaleFileGrid.getInstance().store.reload();
            }
            if( this.module == "error" &&  (this.itemName == "skipNbLiteralTag" || this.itemName == "nbDisplay") ) {
                ui.cmp.ErrorFileGrid.getInstance().store.reload();
            }
            if( this.module == "reviewed" &&  this.itemName == "nbDisplay" ) {
                ui.cmp.PendingReviewGrid.getInstance().store.reload();
            }
            
            if( this.module == "main" &&  this.itemName == "displayENWork" ) {
                ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload(function() {
                    ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload();
                });
            }
            
            // Notify
            if( this.notify !== false ) {
                PhDOE.notify('info', _('Option saved'), _('Option has been saved successfully !'));
            }
        }
    });
};Ext.namespace('ui','ui.task','ui.task._UpdateSingleFolderTask');

ui.task._UpdateSingleFolderTask.getUpdateFolderResponse = function(node)
{
    XHR({
        params  : {
            task: 'getUpdateFolderResponse'
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            ui.task._UpdateSingleFolderTask.afterUpdate(o, node);
        }
    });
}

ui.task._UpdateSingleFolderTask.poll = new Ext.util.DelayedTask(function()
{
    var node = arguments[0],
        u    = node.attributes.id.split('/'),
        FirstFolder, t = new Array();

        u.shift();
        FirstFolder = u[0];

        t.push(node);

    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'project_' + PhDOE.project + '_' + FirstFolder + '_lock_update_folder'
        },
        success : function()
        {
            ui.task._UpdateSingleFolderTask.poll.delay(5000, null, this, t);
        },
        failure : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);
            
            if (o && o.success === false) {
                new ui.task._UpdateSingleFolderTask.getUpdateFolderResponse(node);

            } else {
                ui.task._UpdateSingleFolderTask.poll.delay(5000, null, this, t);
            }
        }
    });
});

ui.task._UpdateSingleFolderTask.afterUpdate = function(o, node)
{
    Ext.getBody().unmask();

    // Re-enable TaskPing
    ui.task.PingTask.getInstance().delay(30000);

    // TODO: we must handle the response here
    var r = Ext.util.JSON.decode(o.result);

    // We reload and highlight the modified node
    node.reload(function() {

        Ext.iterate(r.newFiles, function(prop, val){
            node.findChild('text', prop).getUI().addClass('treeFileUpdated');
        });

    }, this);

    // Reload all store
    PhDOE.reloadAllStore();

};

ui.task._UpdateSingleFolderTask.update = function(node)
{
    var t = new Array();
    t.push(node);

    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until update this folder...')
    );

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    XHR({
        params  : {
            task : 'updateFolder',
            path : node.id
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);            
            ui.task._UpdateSingleFolderTask.afterUpdate(o, node);
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (o && o.success === false) {
                // Re-enable TaskPing
                ui.task.PingTask.getInstance().delay(30000);
                Ext.getBody().unmask();
                PhDOE.winForbidden();
            } else {
                // take over 30sec (max Keep-Alive time)
                // poll every XX secondes if the update is finish
                ui.task._UpdateSingleFolderTask.poll.delay(5000, null, this, t);
            }
        }
    });
};

ui.task.UpdateSingleFolderTask = function(node)
{
    // If the user is anonymous, we don't update anything
    if (PhDOE.user.isAnonymous) {
        Ext.getCmp('winVCSCommit').close();
        PhDOE.winForbidden();
        return;
    }
    ui.task._UpdateSingleFolderTask.update(node);
};Ext.namespace('ui','ui.task','ui.task._VCSCommitTask');

ui.task._VCSCommitTask.getCommitResponse = function()
{
    XHR({
        params  : {
            task : 'getCommitResponse'
        },
        success : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);
            
            ui.task._VCSCommitTask.afterCommit(o.mess);
        }
    });
}

ui.task._VCSCommitTask.poll = new Ext.util.DelayedTask(function()
{
    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'project_' + PhDOE.project + '_lock_'+ PhDOE.user.login +'_commit'
        },
        success : function()
        {
            ui.task._VCSCommitTask.poll.delay(5000);
        },
        failure : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);
            
            if (o && o.success === false) {
                new ui.task._VCSCommitTask.getCommitResponse();

            } else {
                ui.task._VCSCommitTask.poll.delay(5000);
            }
        }
    });
});

ui.task._VCSCommitTask.afterCommit = function(mess)
{
    Ext.getBody().unmask();

    // Re-enable TaskPing
    ui.task.PingTask.getInstance().delay(30000);

    // Display commit output message
    new Ext.Window({
        title      : _('Status'),
        width      : 450,
        height     : 350,
        resizable  : false,
        modal      : true,
        autoScroll : true,
        bodyStyle  : 'background-color: white; padding: 5px;',
        html       : mess.join("<br/>"),
        buttons    : [{
            text    : _('Close'),
            handler : function()
            {
                this.ownerCt.ownerCt.close();
            }
        }]
    }).show();

    // Reload all store
    PhDOE.reloadAllStore();

};

ui.task._VCSCommitTask.commit = function(files)
{
    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until commit...')
    );

    var nodes = [], node, LogMessage, i;

    // Go for VCS commit
    for (i = 0; i < files.length; i = i + 1)
    {
        node = Ext.getCmp('commit-grid-panel').store.getById(files[i].id);
        nodes.push(node.data.FileDBID);
    }

    // We must choose at least one file
    if( nodes.length == 0 ) {
        Ext.getBody().unmask();

        Ext.MessageBox.show({
           title   : _('Error'),
           msg     : _('You must choose at least one file.'),
           buttons : Ext.MessageBox.OK,
           icon    : Ext.MessageBox.ERROR
        });

        return;
    }

    // Get log message
    LogMessage = Ext.getCmp('form-commit-message-log').getValue();

    // The LogMessage is required
    LogMessage = Ext.util.Format.trim(LogMessage);

    if( Ext.isEmpty(LogMessage) ) {

        Ext.getBody().unmask();

        Ext.getCmp('form-commit-message-log').markInvalid(_('The log message is required.'));

        Ext.MessageBox.show({
           title   : _('Error'),
           msg     : _('The log message is required.'),
           buttons : Ext.MessageBox.OK,
           icon    : Ext.MessageBox.ERROR
        });

        return;
    }

    // Close this window
    Ext.getCmp('winVCSCommit').close();

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    XHR({
        params  : {
            task       : 'vcsCommit',
            nodes      : Ext.util.JSON.encode(nodes),
            logMessage : LogMessage
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            
            ui.task._VCSCommitTask.afterCommit(o.mess);
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (o && o.success === false) {
                // Re-enable TaskPing
                ui.task.PingTask.getInstance().delay(30000);
                Ext.getBody().unmask();
                PhDOE.winForbidden();
            } else {
                // take over 30sec (max Keep-Alive time)
                // poll every XX secondes if the check build is finish
                ui.task._VCSCommitTask.poll.delay(5000);
            }
        }
    });
};

ui.task.VCSCommitTask = function()
{
    // If the user is anonymous, we don't commit anything
    if (PhDOE.user.isAnonymous) {
        Ext.getCmp('winVCSCommit').close();
        PhDOE.winForbidden();

        return;
    }

    var files         = Ext.getCmp('commit-grid-panel').selModel.getSelections(),
        NeedToBeClose = [],
        checkNode, paneID_AF, paneID_FE, paneID_FNU, paneID_FNIEN, paneID_FNR, paneID_FNT, paneID, labelNeedToBeClose = '', i, j;

    for (i = 0; i < files.length; ++i) {
        checkNode = files[i].data;

        paneID_AF    = 'AF-'    + Ext.util.md5('AF-'    + checkNode.path + checkNode.name);
        paneID_FE    = 'FE-'    + Ext.util.md5('FE-'    + checkNode.path + checkNode.name);
        paneID_FNU   = 'FNU-'   + Ext.util.md5('FNU-'   + checkNode.path + checkNode.name);
        paneID_FNIEN = 'FNIEN-' + Ext.util.md5('FNIEN-' + checkNode.path + checkNode.name);
        paneID_FNR   = 'FNR-'   + Ext.util.md5('FNR-'   + checkNode.path + checkNode.name);
        paneID_FNT   = 'FNT-'   + Ext.util.md5('FNT-'   + checkNode.path + checkNode.name);

        if ( Ext.getCmp('main-panel').findById(paneID_AF)    ||
             Ext.getCmp('main-panel').findById(paneID_FE)    ||
             Ext.getCmp('main-panel').findById(paneID_FNIEN) ||
             Ext.getCmp('main-panel').findById(paneID_FNU)   ||
             Ext.getCmp('main-panel').findById(paneID_FNR)   ||
             Ext.getCmp('main-panel').findById(paneID_FNT) )
        {

            if (Ext.getCmp('main-panel').findById(paneID_AF)) {
                paneID = paneID_AF;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FE)) {
                paneID = paneID_FE;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNU)) {
                paneID = paneID_FNU;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNIEN)) {
                paneID = paneID_FNIEN;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNR)) {
                paneID = paneID_FNR;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNT)) {
                paneID = paneID_FNT;
            }

            NeedToBeClose.push([paneID, checkNode.name]);
        }
    }

    if (NeedToBeClose.length > 0) {
        for ( j = 0; j < NeedToBeClose.length; ++j ) {
            labelNeedToBeClose += NeedToBeClose[j][1] + '<br/>';
        }

        Ext.MessageBox.show({
            title   : 'Warning',
            icon    : Ext.MessageBox.INFO,
            buttons : Ext.MessageBox.YESNOCANCEL,
            msg     : (NeedToBeClose.length > 1) ? String.format(
                        _('There are {0} files to close before commit.<br><br>{1}<br/><br/>Would you like me to close them for you ?'),
                        NeedToBeClose.length, labelNeedToBeClose)
                    : String.format(
                        _('There is {0} file to close before commit.<br><br>{1}<br/><br/>Would you like me to close it for you ?'),
                          NeedToBeClose.length, labelNeedToBeClose),
            fn : function(btn)
            {
                if (btn === 'yes') {
                    for (var j = 0; j < NeedToBeClose.length; ++j) {
                        Ext.getCmp('main-panel').remove(NeedToBeClose[j][0]);
                    }

                    ui.task._VCSCommitTask.commit(files);
                }
            }
        });
    } else {
        ui.task._VCSCommitTask.commit(files);
    }
};Ext.namespace('ui','ui.cmp');

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
                    title     : _('Credits'),
                    bodyStyle : 'padding:15px',
                    html      : '<div id="phd-oe-credit"><ul>' +
                                    '<li><a href="http://extjs.com" target="_blank">ExtJs Team</a><div class="phd-oe-credit-info">' + _('Javascript FrameWork') + '</div></li>' +
                                    '<li><a href="http://marijn.haverbeke.nl/codemirror/" target="_blank">CodeMirror</a><div class="phd-oe-credit-info">' + _('Code editor') + '</div></li>' +
                                    '<li><a href="http://www.oxygen-icons.org/" target="_blank">Oxygen project from KDE</a><div class="phd-oe-credit-info">' + _('Icon pack') + '</div></li>' +
                                '</ul></div>'
                }, {
                    title    : _('License'),
                    autoLoad : { url : './LICENSE' }
                }]
            }
        });
        ui.cmp.About.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._BuildStatus');

//------------------------------------------------------------------------------
// BuildStatus Internals
ui.cmp._BuildStatus.display = function(config)
{

    Ext.apply(this, config);

    // Display
    if ( Ext.getCmp('main-panel').findById('last_failed_build_' + this.lang) ) {
        Ext.getCmp('main-panel').remove('last_failed_build_' + this.lang);
    }

    Ext.getCmp('main-panel').add({
        xtype      : 'panel',
        id         : 'last_failed_build_' + this.lang,
        title      : String.format(_('Last failed build for {0}'),Ext.util.Format.uppercase(this.lang)),
        tabTip     : String.format(_('Last failed build for the documentation {0}'), Ext.util.Format.uppercase(this.lang)),
        closable   : true,
        autoScroll : true,
        iconCls    : 'iconCheckBuild',
        html       : '<div class="check-build-content" id="check-build-content"></div>'
    });
    Ext.getCmp('main-panel').setActiveTab('last_failed_build_' + this.lang);

    Ext.getCmp('main-panel').el.mask(_('Please, wait...'));

    XHR({
        scope   : this,
        params  : {
            task          : 'getFailedBuildData',
            idFailedBuild : this.idFailedBuild
        },
        success : function(r)
        {
            var o    = Ext.decode(r.responseText),
                mess = o.mess.join("<br/>");

            // If the result is too large, the controller have limitated it. So, we add a button to allow the download of the full content
            if( o.state === 'truncate' ) {

                Ext.get('check-build-content').dom.innerHTML = mess + '<div style="text-align: center; margin: 20px 0 20px 0" class="x-toolbar">' + _('This log is too large and have been truncated. Use the following button to download the full content of it.') + '<div id="check-build-content-download-btn"></div></div>';

                new Ext.Button({
                    scope: this,
                    text: _('Download the full content of this log'),
                    renderTo: 'check-build-content-download-btn',
                    style: {margin: 'auto'},
                    handler : function()
                    {
                        window.location.href = './do/downloadFailedBuildLog' +
                                               '?idFailedBuild=' + this.idFailedBuild;
                    }

                });

            } else {
                Ext.get('check-build-content').dom.innerHTML = mess;
            }

            Ext.getCmp('main-panel').el.unmask();

        }
    });
};

// BuildStatus Grid datastore
ui.cmp._BuildStatus.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getFailedBuild'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'lang'},
            {name : 'date', type : 'date',dateFormat : 'Y-m-d H:i:s' }
        ]
    })
});
ui.cmp._BuildStatus.ds.setDefaultSort('date', 'desc');

// BuildStatus Grid language cell renderer
ui.cmp._BuildStatus.rendererLanguage = function(value)
{
    return '<div><div class="flags flag-' + value + '" style="float: left;"></div><div style="padding-left: 24px">' + value + '</div></div>';
};

// BuildStatus Grid columns definition
ui.cmp._BuildStatus.columns = [
    {
        id        : 'date',
        header    : _("Date"),
        sortable  : true,
        dataIndex : 'date',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }, {
        header    : _('Language'),
        width     : 45,
        sortable  : true,
        dataIndex : 'lang',
        renderer  : ui.cmp._BuildStatus.rendererLanguage
    }
];

// BuildStatus context menu
ui.cmp._BuildStatus.menu = Ext.extend(Ext.menu.Menu,
{
    setRowIndex : function(rowIndex) {
        this.rowIndex = rowIndex;
    },

    initComponent : function()
    {
        Ext.apply(this, {
            items : [{
                scope   : this,
                text    : '<b>' + _('View in a new Tab') + '</b>',
                iconCls : 'iconOpenInTab',
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIndex, this.event
                    );
                }
            }]
        });
        ui.cmp._BuildStatus.menu.superclass.initComponent.call(this);
    }
});

//------------------------------------------------------------------------------
// BuildStatus Grid
ui.cmp.BuildStatus = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    bodyBorder       : false,
    autoExpandColumn : 'date',
    store            : ui.cmp._BuildStatus.ds,
    columns          : ui.cmp._BuildStatus.columns,

    view             : new Ext.grid.GridView({
                           forceFit: true
    }),
    listeners : {
        render : function()
        {
            this.store.load.defer(20, this.store);
        }
    },

    onRowdblclick: function(grid, rowIndex, e)
    {
        var storeRecord = this.store.getAt(rowIndex);

        new ui.cmp._BuildStatus.display({
            idFailedBuild : storeRecord.id,
            lang          : storeRecord.data.lang
        });
    },

    onRowContextMenu: function(grid, rowIndex, e)
    {
            if( ! this.menu ) {
                this.menu = new ui.cmp._BuildStatus.menu({
                    grid   : grid,
                    rowIdx : '',
                    event  : e
                });
            }

            e.stopEvent();
            this.getSelectionModel().selectRow(rowIndex);
            this.menu.setRowIndex(rowIndex);
            this.menu.showAt(e.getXY());
    },

    initComponent: function(config)
    {
        ui.cmp.BuildStatus.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowdblclick',    this.onRowdblclick,  this);
        this.on('rowcontextmenu', this.onRowContextMenu, this);
    }
});
Ext.namespace('ui','ui.cmp','ui.cmp._ChangeFileOwner');

ui.cmp._ChangeFileOwner.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getVCSUsers'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        fields        : [
            {name : 'id'},
            {name : 'userName'}
        ]
    }),
    sortInfo: {
        field: 'userName',
        direction: 'ASC'
    }
});


ui.cmp.ChangeFileOwner = Ext.extend(Ext.Window,
{
    title      : _('Change file\'s owner'),
    iconCls    : 'iconSwitchLang',
    width      : 550,
    height     : 255,
    layout     : 'form',
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closeAction: 'close',
    padding    : 10,
    buttons    : [{
        text    : _('Save'),
        disabled: true,
        handler : function()
        {
            var win = this.ownerCt.ownerCt,
                newOwner = win.items.items[1].items.items[0].getValue();
            
            new ui.task.ChangeFileOwner({
                fileIdDB : win.fileIdDB,
                newOwner : newOwner,
                from     : win
            });
            
        }
    },{
        text    : _('Close'),
        handler : function()
        {
            var win = this.ownerCt.ownerCt;
            win.close();
        }
    }],

    initComponent : function()
    {
        var win = this;
        
        Ext.apply(this,
        {
            defaults: {
                labelWidth : 120
            },
            items : [{
                xtype   : 'fieldset',
                title   : _('Information'),
                iconCls : 'iconInfo',
                width   : 515,
                items   : [{
                    xtype:'displayfield',
                    fieldLabel: _('File'),
                    value: this.fileFolder + this.fileName
                },{
                    xtype:'displayfield',
                    fieldLabel: _('Current owner'),
                    value: this.currentOwner
                }]
            },{
                xtype   : 'fieldset',
                title   : _('Action'),
                iconCls : 'iconSwitchLang',
                width   : 515,
                items   : [{
                    xtype         : 'combo',
                    name          : 'newOwner',
                    fieldLabel    : _('New owner'),
                    editable      : false,
                    store         : ui.cmp._ChangeFileOwner.store,
                    triggerAction : 'all',
                    valueField    : 'userName',
                    displayField  : 'userName',
                    listeners     : {
                        afterrender : function()
                        {
                            this.store.load();
                        },
                        select : function()
                        {
                            win.fbar.items.items[0].enable();
                        }
                    }
                }]
            }]
        });
        
        ui.cmp.ChangeFileOwner.superclass.initComponent.call(this);
        
        this.show();
    }
});Ext.namespace('ui','ui.cmp');

ui.cmp.CheckBuildPrompt = Ext.extend(Ext.Window,
{
    title      : _('Check build'),
    iconCls    : 'iconCheckBuild',
    layout     : 'form',
    width      : 350,
    height     : 200,
    resizable  : false,
    modal      : true,
    bodyStyle  : 'padding:5px 5px 0',
    labelAlign : 'top',
    buttons : [{
        id      : 'win-check-build-btn-submit',
        text    : _('Go !'),
        handler : function()
        {
            new ui.task.CheckBuildTask();
            this.ownerCt.ownerCt.close();
        }
    }],
    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype     : 'panel',
                modal     : false,
                baseCls   : 'x-plain',
                bodyStyle : 'padding:5px 5px 0',
                html      : _('You\'re about to check the build via this command:') +
                            '<br/><br/>/usr/bin/php configure.php --with-lang=' + PhDOE.user.lang + '<span id="option-xml-details-span" style="color: red; visibility: hidden;"> --enable-xml-details</span><br/><div id="option-xml-details-div" style="text-align: center; color: red; visibility: hidden;">'+_('<b>WARNING !</b><br/> This option use a lot of server ressource. If you don\'t know what are the consequence, please, don\'t use it.')+'</div>'
            }, {
                xtype     : 'checkbox',
                id        : 'option-xml-details',
                name      : 'option-xml-details',
                checked   : false,
                hideLabel : true,
                boxLabel  : _('Enable detailed XML error messages'),
                listeners : {
                    check: function(c, state) {
                        Ext.get('option-xml-details-span').dom.style.visibility = (state) ? 'visible' : 'hidden';
                        Ext.get('option-xml-details-div').dom.style.visibility  = (state) ? 'visible' : 'hidden';
                    }
                }
            }]
        });
        ui.cmp.CheckBuildPrompt.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._CheckDoc');

//------------------------------------------------------------------------------
// CheckDoc Internals

// CheckDoc Grid datastore
ui.cmp._CheckDoc.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getCheckDocData'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'path'},
            {name : 'extension'},
            {name : 'check_oldstyle',       type : 'int'},
            {name : 'check_undoc',          type : 'int'},
            {name : 'check_roleerror',      type : 'int'},
            {name : 'check_badorder',       type : 'int'},
            {name : 'check_noseealso',      type : 'int'},
            {name : 'check_noreturnvalues', type : 'int'},
            {name : 'check_noparameters',   type : 'int'},
            {name : 'check_noexamples',     type : 'int'},
            {name : 'check_noerrors',       type : 'int'}
        ]
    })
});
ui.cmp._CheckDoc.ds.setDefaultSort('extension', 'asc');

// CheckDoc Grid non-extension cell renderer
ui.cmp._CheckDoc.renderer = function(value, metadata)
{
    if (value > 0) {
        metadata.css = 'check_doc_cell';
        metadata.attr = 'ext:qtip="<img src=\'themes/img/help.png\' style=\'vertical-align: middle;\' /> ' + _('Double-click the cell to open the file selection') + '"';
        return value;
    } else {
        return;
    }
};

// CheckDoc Grid columns definition
ui.cmp._CheckDoc.columns = [
    new Ext.grid.RowNumberer(), {
        id        : 'extension',
        header    : _('Extension'),
        sortable  : true,
        dataIndex : 'extension'
    }, {
        header    : _('Not documented'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_undoc',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('Old style'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_oldstyle',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('Bad refsect1 order'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_badorder',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No parameters'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noparameters',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No return values'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noreturnvalues',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No examples'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noexamples',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No errors section'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noerrors',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No see also'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noseealso',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('Refsect1 role error'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_roleerror',
        renderer  : ui.cmp._CheckDoc.renderer
    }
];

// CheckDoc File-Win Grid datastore
ui.cmp._CheckDoc.fs = new Ext.data.SimpleStore({
    fields : [
        {name: 'id'},
        {name: 'file'}
    ]
});

// CheckDoc Internal File-Win Grid
//  config - {fpath}
ui.cmp._CheckDoc.FileGrid = Ext.extend(Ext.grid.GridPanel,
{
    id               : 'check-doc-file-grid',
    store            : ui.cmp._CheckDoc.fs,
    loadMask         : true,
    bodyBorder       : false,
    autoExpandColumn : 'file',
    sm               : new Ext.grid.RowSelectionModel({}),
    columns          : [ new Ext.grid.RowNumberer(), {
                           id        : 'file',
                           header    : _('Files'),
                           sortable  : true,
                           dataIndex : 'file'
                       } ],

    onRowClick: function()
    {
        Ext.getCmp('check-doc-btn-open-selected-files').enable();
    },

    onRowContextMenu: function(grid, rowIndex, e)
    {
        e.stopEvent();
        grid.getSelectionModel().selectRow(rowIndex);
    },

    onRowDblClick: function(grid, rowIndex)
    {
        ui.cmp.RepositoryTree.getInstance().openFile(
            'byPath',
            'en' + grid.fpath,
            grid.store.getAt(rowIndex).data.file
        );
        Ext.getCmp('check-doc-file-win').close();
    },

    initComponent: function(config)
    {
        ui.cmp._CheckDoc.FileGrid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu',    this.onRowContextMenu, this);
        this.on('rowdblclick',       this.onRowDblClick,    this);
        this.on('rowclick',          this.onRowClick,      this);
    }
});

// CheckDoc Internal File-Win
//  config - {fpath}
ui.cmp._CheckDoc.FileWin = Ext.extend(Ext.Window,
{
    id         : 'check-doc-file-win',
    title      : _('Files'),
    width      : 450,
    height     : 350,
    labelWidth : 50,
    resizable  : false,
    modal      : true,
    autoScroll : true,
    layout     : 'fit',
    iconCls    : 'iconFiles',
    buttons    : [{
        text    : _('Open all files'),
        handler : function()
        {
            var win   = Ext.getCmp('check-doc-file-win'),
                store = ui.cmp._CheckDoc.fs,
                i;

            PhDOE.AFfilePendingOpen = [];

            for (i = 0; i < store.getCount(); ++i) {
                PhDOE.AFfilePendingOpen[i] = {
                    fpath : 'en' + win.fpath,
                    fname : store.getAt(i).data.file
                };
            }

            ui.cmp.RepositoryTree.getInstance().openFile(
                'byPath',
                PhDOE.AFfilePendingOpen[0].fpath,
                PhDOE.AFfilePendingOpen[0].fname
            );

            PhDOE.AFfilePendingOpen.shift();

            win.close();
        }
    }, {
        text     : _('Open selected files'),
        id       : 'check-doc-btn-open-selected-files',
        disabled : true,
        handler  : function()
        {
            var win = Ext.getCmp('check-doc-file-win'),
                r   = Ext.getCmp('check-doc-file-grid')
                      .getSelectionModel()
                      .getSelections(),
                i;

            PhDOE.AFfilePendingOpen = [];

            for (i = 0; i < r.length; ++i) {
                PhDOE.AFfilePendingOpen[i] = {
                    fpath : 'en' + win.fpath,
                    fname : r[i].data.file
                };
            }

            ui.cmp.RepositoryTree.getInstance().openFile(
                'byPath',
                PhDOE.AFfilePendingOpen[0].fpath,
                PhDOE.AFfilePendingOpen[0].fname
            );

            PhDOE.AFfilePendingOpen.shift();
            
            win.close();
        }
    }]
});

//------------------------------------------------------------------------------
// CheckDoc Grid
ui.cmp.CheckDoc = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    bodyBorder       : false,
    store            : ui.cmp._CheckDoc.ds,
    columns          : ui.cmp._CheckDoc.columns,
    autoExpandColumn : 'extension',
    sm               : new Ext.grid.CellSelectionModel({ singleSelect : true }),
    view             : new Ext.grid.GridView({ forceFit : true }),
    listeners        :
    {
        render : function(grid)
        {
            // on render, load data
            this.store.load.defer(20, grid.store);
        }
    },

    onCellContextMenu : function (grid, rowIndex, cellIndex, e)
    {
        e.stopEvent();
        this.sm.select(rowIndex, cellIndex);
    },

    onCellDblClick : function(grid, rowIndex, columnIndex, e)
    {
        var record    = this.store.getAt(rowIndex),
            errorType = this.getColumnModel().getDataIndex(columnIndex),
            data      = record.get(errorType),
            fpath     = record.data.path;

        if (Ext.num(data, false) && data !== 0) {

            this.el.mask(_('Please, wait...'));
            
            XHR({
                params   : {
                    task      : 'getCheckDocFiles',
                    path      : fpath,
                    errorType : errorType
                },
                success : function(response)
                {
                    // Must choose the file
                    var o = Ext.decode(response.responseText),
                        i;

                    // file store
                    ui.cmp._CheckDoc.fs.removeAll();
                    for (i = 0; i < o.files.length; ++i) {

                        ui.cmp._CheckDoc.fs.insert(
                            0, new ui.cmp._CheckDoc.fs.recordType({
                                id   : i,
                                file : o.files[i].name
                            })
                        );
                    }
                    ui.cmp._CheckDoc.fs.sort('file', 'asc');

                    grid.el.unmask();

                    new ui.cmp._CheckDoc.FileWin({
                        fpath : fpath,
                        items : [
                            new ui.cmp._CheckDoc.FileGrid({
                                fpath : fpath
                            })
                        ]
                    }).show();
                }
            });
        } // data is not empty
    },

    initComponent: function(config)
    {
        ui.cmp.CheckDoc.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('celldblclick',    this.onCellDblClick,    this);
        this.on('cellcontextmenu', this.onCellContextMenu, this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._CheckEntities');

//------------------------------------------------------------------------------
// CheckDoc Internals

// CheckDoc Grid datastore
ui.cmp._CheckEntities.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getCheckEntitiesData'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'entities'},
            {name : 'url'},
            {name : 'result'},
            {name : 'date', type : 'date', dateFormat : 'Y-m-d H:i:s'}
        ]
    })
});
ui.cmp._CheckEntities.ds.setDefaultSort('entities', 'asc');

ui.cmp._CheckEntities.rendererEntities = function(value, metadata)
{
    return '&' + value + ';';
};

// CheckDoc Grid columns definition
ui.cmp._CheckEntities.columns = [
    new Ext.grid.RowNumberer(), 
    {
        id        : 'entities',
        header    : _('Entities'),
        sortable  : true,
        dataIndex : 'entities',
        width     : 30,
        renderer  : ui.cmp._CheckEntities.rendererEntities
    }, {
        header    : _('Url'),
        sortable  : true,
        dataIndex : 'url'
    }, {
        header    : _('Result'),
        width     : 30,
        sortable  : true,
        dataIndex : 'result'
    }, {
        header    : _('Date'),
        width     : 30,
        sortable  : true,
        dataIndex : 'date',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// CheckDoc Grid
ui.cmp.CheckEntities = Ext.extend(Ext.grid.GridPanel,
{
    id               : 'check-entities-grid',
    loadMask         : true,
    bodyBorder       : false,
    store            : ui.cmp._CheckEntities.ds,
    columns          : ui.cmp._CheckEntities.columns,
    autoExpandColumn : 'url',
    sm               : new Ext.grid.RowSelectionModel({ singleSelect : true }),
    view             : new Ext.grid.GridView({ forceFit : true }),

    onRender: function(ct, position)
    {
        ui.cmp.CheckEntities.superclass.onRender.call(this, ct, position);
        this.store.load.defer(20, this.store);
    },

    openTab: function(rowIndex)
    {
        var storeRecord = this.store.getAt(rowIndex),
            url         = storeRecord.data.url,
            urlMd5      = Ext.util.md5(url),
            tabId       = 'tab-check-entities-'+urlMd5,
            tab         = Ext.getCmp(tabId);

        if( ! tab )
        {
            Ext.getCmp('main-panel').add({
                id         : tabId,
                xtype      : 'panel',
                title      : Ext.util.Format.ellipsis(url,20),
                tabTip     : url,
                iconCls    : 'iconCheckEntities',
                closable   : true,
                layout     : 'fit',
                items: [ new Ext.ux.IFrameComponent({ id: 'frame-'+tabId, url: url }) ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab(tabId);
    },

    onRowdblclick: function(grid, rowIndex)
    {
        this.openTab(rowIndex);
    },

    onContextClick: function(grid, rowIndex, e)
    {

        if(!this.menu) {
            this.menu = new Ext.menu.Menu({
                id    : 'submenu-checkentities',
                items : [{
                    scope   : this,
                    text    : '<b>'+_('Open in a new Tab')+'</b>',
                    iconCls : 'iconOpenInTab',
                    handler : function()
                    {
                        this.openTab(this.ctxRowIndex);
                        this.menu.hide();
                    }
                }]
            });
        }

        this.getSelectionModel().selectRow(rowIndex);
        e.stopEvent();

        if( this.ctxRowIndex ) {
            this.ctxRowIndex  = null;
        }
        this.ctxRowIndex  = rowIndex;

        this.menu.showAt(e.getXY());

    },

    initComponent: function(config)
    {
        this.tbar = [{
            xtype : 'label',
            text  : _('Status: ')
        }, {
            xtype         : 'combo',
            typeAhead     : true,
            triggerAction : 'all',
            lazyRender    :true,
            mode          : 'local',
            store         : new Ext.data.ArrayStore({
                id     : 0,
                fields : [
                    'myId',
                    'displayText'
                ],
                data: [
                       ['all',                 _('All status')],
                       ['FTP_CONNECT',         'FTP_CONNECT'],
                       ['FTP_LOGIN',           'FTP_LOGIN'],
                       ['FTP_NO_FILE',         'FTP_NO_FILE'],
                       ['HTTP_CONNECT',        'HTTP_CONNECT'],
                       ['HTTP_INTERNAL_ERROR', 'HTTP_INTERNAL_ERROR'],
                       ['HTTP_NOT_FOUND',      'HTTP_NOT_FOUND'],
                       ['HTTP_MOVED',          'HTTP_MOVED'],
                       ['HTTP_WRONG_HEADER',   'HTTP_WRONG_HEADER'],
                       ['SUCCESS',             'SUCCESS'],
                       ['UNKNOWN_HOST',        'UNKNOWN_HOST']
                      ]
            }),
            value         : 'all',
            valueField    : 'myId',
            displayField  : 'displayText',
            editable      : false,
            listeners: {
                select: function(c, record) {
                    var val = record.id;

                    if( val === 'all' ) {
                        Ext.getCmp('check-entities-grid').store.clearFilter();
                    } else {
                        Ext.getCmp('check-entities-grid').store.filter('result', record.id);
                    }
                }
            }
        }];

        ui.cmp.CheckEntities.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowdblclick,  this);
    }
});Ext.namespace('ui','ui.cmp');

ui.cmp.CheckEntitiesPrompt = Ext.extend(Ext.Window,
{
    title      : _('Check entities'),
    iconCls    : 'iconRun',
    id         : 'win-check-entities',
    layout     : 'fit',
    width      : 250,
    height     : 140,
    resizable  : false,
    modal      : true,
    bodyStyle  : 'padding:5px 5px 0; text-align: center;',
    labelAlign : 'top',
    closeAction: 'hide',
    buttons    : [{
        id      : 'win-check-entities-btn',
        text    : _('Go !'),
        handler : function()
        {
            new ui.task.CheckEntitiesTask();
            Ext.getCmp('win-check-entities').hide();
        }
    }],
    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype     : 'panel',
                modal     : false,
                baseCls   : 'x-plain',
                bodyStyle : 'padding:5px 5px 0',
                html      : _('You\'re about to check all entities.<br><br>This action takes time.')
            }]
        });
        ui.cmp.CheckEntitiesPrompt.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._CheckXmlWin');

ui.cmp._CheckXmlWin.store = new Ext.data.Store({
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        fields        : [
            {name : 'line'},
            {name : 'libel'}
        ]
    })
});

ui.cmp._CheckXmlWin.cm = new Ext.grid.ColumnModel([
    {
        header    : _('Line'),
        dataIndex : 'line'
    },
    {
        id        : 'libel_id',
        header    : _('Libel'),
        dataIndex : 'libel'
    }
]);


ui.cmp._CheckXmlWin.sm = new Ext.grid.RowSelectionModel({
    singleSelect: true
});

ui.cmp._CheckXmlWin.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoExpandColumn : 'libel_id',
    cm               : ui.cmp._CheckXmlWin.cm,
    sm               : ui.cmp._CheckXmlWin.sm,
    store            : ui.cmp._CheckXmlWin.store,

    initComponent: function(config)
    {
        ui.cmp._CheckXmlWin.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);
    }
});

ui.cmp.CheckXmlWin = Ext.extend(Ext.Window,
{
    id         : 'xml-errors-win',
    title      : _('XML Errors'),
    iconCls    : 'iconXml',
    width      : 650,
    height     : 350,
    layout     : 'fit',
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closeAction: 'close',
    buttons    : [{
        text    : _('Close'),
        handler : function()
        {
            Ext.getCmp('xml-errors-win').close();
        }
    }],
    
    addErrorsInStore : function() {
        
        var record = Ext.data.Record.create({name: 'line'}, {name: 'libel'});

        for( i=0; i < this.errors.length; i++ ) {
            this.items.items[0].store.add( new record({'line': this.errors[i].line, 'libel' : this.errors[i].libel+"<br>"+Ext.util.Format.htmlEncode(this.errors[i].ctx1)}) );
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [new ui.cmp._CheckXmlWin.grid()]
        });
        
        ui.cmp.CheckXmlWin.superclass.initComponent.call(this);
        
        // We add errors into the store
        this.addErrorsInStore();
        
        this.show();
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._CommitLogManager');

ui.cmp._CommitLogManager.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getCommitLogMessage'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'text'}
        ]
    })
});

ui.cmp._CommitLogManager.editor = new Ext.ux.grid.RowEditor({
    saveText   : _('Update'),
    cancelText : _('Cancel'),
    listeners  : {
        afteredit: function(editor, changes, record)
        {
            XHR({
                params : {
                    task   : 'saveLogMessage',
                    messID : record.data.id,
                    mess   : record.data.text
                },
                success : function()
                {
                   record.commit();
                   // Notify
                   PhDOE.notify('info', _('Message updated'), _('Log Message was updated successfully !'));
                },
                failure : function()
                {
                    PhDOE.winForbidden();
                }
            });
        }
    }
});

ui.cmp._CommitLogManager.cm = new Ext.grid.ColumnModel([
    new Ext.grid.RowNumberer(),
    {
        id        : 'log_msg',
        header    : _('Log message'),
        dataIndex : 'text',
        editor    : {
            xtype : 'textarea'
        },
        renderer  : function(value)
        {
            return value.split("\n").join("<br/>");
        }
    }
]);

ui.cmp._CommitLogManager.sm = new Ext.grid.RowSelectionModel({
    singleSelect: true
});

// config - { rowIdx }
ui.cmp._CommitLogManager.menu = Ext.extend(Ext.menu.Menu,
{
    setRowIdx: function(rowIdx) {
        this.rowIdx = rowIdx;
    },

    initComponent : function()
    {
        Ext.apply(this,{

            items  : [{
                scope   : this,
                text    : _('Delete this Log Message'),
                iconCls : 'iconTrash',
                handler : function()
                {
                    XHR({
                        scope  : this,
                        params : {
                            task   : 'deleteLogMessage',
                            messID : ui.cmp._CommitLogManager.store.getAt(this.rowIdx).data.id
                        },
                        success : function()
                        {
                            ui.cmp._CommitLogManager.store.remove(ui.cmp._CommitLogManager.store.getAt(this.rowIdx));

                            // Notify
                            PhDOE.notify('info', _('Message deleted'), _('Log Message was deleted successfully !'));

                        },
                        failure : function()
                        {
                            PhDOE.winForbidden();
                        }
                    });
                }
            }]
        });
        ui.cmp._CommitLogManager.menu.superclass.initComponent.call(this);
    }
});

ui.cmp._CommitLogManager.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoExpandColumn : 'log_msg',
    cm               : ui.cmp._CommitLogManager.cm,
    sm               : ui.cmp._CommitLogManager.sm,
    store            : ui.cmp._CommitLogManager.store,
    plugins          : [ui.cmp._CommitLogManager.editor],
    viewConfig       : {
        emptyText : '<div class="x-grid-empty" style="text-align:center;">'+_('No log message currently')+'</div>'
    },
    listeners        : {
        render : function(grid)
        {
            grid.store.load();
        }
    },

    onRowContextMenu: function(grid, rowIndex, e) {

        e.stopEvent();
        this.getSelectionModel().selectRow(rowIndex);

        if( ! this.menu ) {
            this.menu = new ui.cmp._CommitLogManager.menu();
        }
        this.menu.setRowIdx(rowIndex);
        this.menu.showAt(e.getXY());

    },

    initComponent: function(config)
    {
        ui.cmp._CommitLogManager.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
    }
});

ui.cmp.CommitLogManager = Ext.extend(Ext.Window,
{
    id         : 'commit-log-win',
    title      : _('Manage Log Message'),
    iconCls    : 'iconWinManageLog',
    width      : 650,
    height     : 350,
    layout     : 'fit',
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closeAction: 'hide',
    store      : ui.cmp._CommitLogManager.store,
    buttons    : [{
        text    : _('Close'),
        handler : function()
        {
            Ext.getCmp('commit-log-win').hide();
        }
    }],

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [new ui.cmp._CommitLogManager.grid()]
        });
        ui.cmp.CommitLogManager.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp', 'ui.cmp._CommitPrompt');

ui.cmp._CommitPrompt.store = new Ext.data.GroupingStore(
{
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'path'},
            {name : 'name'},
            {name : 'by'},
            {name : 'date', type : 'date', dateFormat : 'Y-m-d H:i:s'},
            {name : 'type'}
        ]
    }),
    sortInfo : {
        field     : 'name',
        direction : 'ASC'
    },
    groupField : 'path'
});

// PendingCommitGrid columns definition
ui.cmp._CommitPrompt.columns = [
    new Ext.grid.CheckboxSelectionModel(),
{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name'
}, {
    header    : _('Modified by'),
    width     : 45,
    sortable  : true,
    dataIndex : 'by'
}, {
    header    : _('Date'),
    width     : 45,
    sortable  : true,
    dataIndex : 'date',
    renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
}, {
    header    : _('Path'),
    dataIndex : 'path',
    hidden    : true
}];

// PendingCommitGrid view
ui.cmp._CommitPrompt.view = new Ext.grid.GroupingView({
    forceFit       : true,
    groupTextTpl   : '{[values.rs[0].data["path"]]} ' +
                     '({[values.rs.length]} ' +
                     '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})'
});

ui.cmp._CommitPrompt.grid = Ext.extend(Ext.grid.GridPanel,
{
    id               : 'commit-grid-panel',
    loadMask         : true,
    autoExpandColumn : 'name',
    height           : 180,
    columns          : ui.cmp._CommitPrompt.columns,
    view             : ui.cmp._CommitPrompt.view,
    enableDragDrop   : true,
    sm               : new Ext.grid.CheckboxSelectionModel(),
    listeners        : {
        viewready: function()
        {
            this.selModel.selectAll();
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : ui.cmp._CommitPrompt.store
        });
        ui.cmp._CommitPrompt.grid.superclass.initComponent.call(this);
    }
});

// config - { files: {fid, fpath, fname, fdbid} }
ui.cmp.CommitPrompt = Ext.extend(Ext.Window,
{
    id         : 'winVCSCommit',
    layout     : 'form',
    title      : _('VCS commit'),
    iconCls    : 'iconPendingCommit',
    closable   : false,
    width      : 600,
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
                new ui.cmp.CommitLogManager();
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
    listeners: {
        show: function()
        {
            var t = new Ext.util.DelayedTask(function() {
                Ext.getCmp('form-commit-message-log').focus();
            });

            t.delay(200);
        }
    },

    initComponent : function()
    {
        var i;

        // We remove all data who are in the store
        ui.cmp._CommitPrompt.store.removeAll();
        
        for (i = 0; i < this.files.length; ++i) {

            ui.cmp._CommitPrompt.store.insert(0,
                new ui.cmp._CommitPrompt.store.recordType({
                    id       : 'need-commit-' + this.files[i].fid,
                    path     : this.files[i].fpath,
                    name     : this.files[i].fname,
                    by       : this.files[i].fby,
                    date     : this.files[i].fdate,
                    type     : this.files[i].ftype,
                    FileDBID : this.files[i].fdbid
                })
            );
        }
        ui.cmp._CommitPrompt.store.groupBy('path', true); // regroup

        Ext.apply(this,
        {
            items : [new ui.cmp._CommitPrompt.grid(), {
                xtype         : 'combo',
                name          : 'first2',
                fieldLabel    : _('Older messages'),
                editable      : false,
                anchor        : '100%',
                store         : ui.cmp._CommitLogManager.store,
                triggerAction : 'all',
                tpl           : '<tpl for="."><div class="x-combo-list-item">{[values.text.split("\n").join("<br/>")]}</div></tpl>',
                valueField    : 'id',
                displayField  : 'text',
                listEmptyText : '<div class="x-grid-empty" style="text-align:center;">'+_('No log message currently')+'</div>',
                listeners     : {
                    select : function(combo, record)
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
        ui.cmp.CommitPrompt.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._DictionaryGrid');

//------------------------------------------------------------------------------
// DictionaryGrid internals
ui.cmp._DictionaryGrid.store = Ext.extend(Ext.data.Store,
{    
    proxy    : new Ext.data.HttpProxy({
        url : "./do/getDictionaryWords"
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'valueEn'},
            {name : 'valueLang'},
            {name : 'lastUser', hideField : true},
            {name : 'lastDate', type : 'date', dateFormat : 'Y-m-d H:i:s', hideField : true}
        ]
    }),
    sortInfo : {
        field     : 'valueEn',
        direction : 'ASC'
    },
    listeners: {
        load: function() {
            if( !PhDOE.user.isAnonymous ) {
                // Enable the "add new word" button"
                Ext.getCmp(this.fid + '-btn-new-word').enable();
            }
        }
    },

    initComponent : function(config)
    {
       Ext.apply(this, config);
       ui.cmp._DictionaryGrid.store.superclass.initComponent.call(this);
    }

});

ui.cmp._DictionaryGrid.editor = Ext.extend(Ext.ux.grid.RowEditor,
{
    saveText   : _('Update'),
    cancelText : _('Cancel'),
    listeners  : {
        afteredit: function(editor, changes, record, rowIdx)
        {
            XHR({
                params : {
                    task      : 'manageDictionaryWord',
                    wordId    : record.data.id,
                    valueEn   : record.data.valueEn,
                    valueLang : record.data.valueLang
                },
                success : function(r)
                {
                    var o = Ext.util.JSON.decode(r.responseText);

                    record.set('lastUser', PhDOE.user.login);
                    record.set('lastDate', Date.parseDate(o.dateUpdate, 'Y-m-d H:i:s'));

                    record.commit();
                    
                    // Notify
                    PhDOE.notify('info', _('Word in dictionary added/updated'), _('The word have been added/updated successfully !'));
                },
                failure : function()
                {
                    PhDOE.winForbidden();
                }
            });
        },
        canceledit: function(editor) {            
            // If we cancel Edit on a new word
            if( editor.record.data.id === "new" ) {
                editor.record.store.remove(editor.record);
            }
        }
    }
});

ui.cmp._DictionaryGrid.sm = Ext.extend(Ext.grid.RowSelectionModel,
{
    singleSelect: true
}
);

ui.cmp._DictionaryGrid.viewConfig = {
    forceFit      : true,
    emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '</div>',
    deferEmptyText: false
};

ui.cmp._DictionaryGrid.menu = Ext.extend(Ext.menu.Menu,
{
    setRowIdx: function(rowIdx) {
        this.rowIdx = rowIdx;
    },

    initComponent : function()
    {
        Ext.apply(this,{

            items  : [{
                scope   : this,
                text    : _('Delete this word'),
                iconCls : 'iconTrash',
                disabled: (PhDOE.user.isAnonymous),
                handler : function()
                {
                    XHR({
                        scope  : this,
                        params : {
                            task   : 'delDictionaryWord',
                            wordId : this.grid.store.getAt(this.rowIdx).data.id
                        },
                        success : function()
                        {                            
                            this.grid.store.remove(this.grid.store.getAt(this.rowIdx));

                            // Notify
                            PhDOE.notify('info', _('Word deleted'), _('The word was deleted successfully !'));

                        },
                        failure : function()
                        {
                            PhDOE.winForbidden();
                        }
                    });

                }
            }]
        });
        ui.cmp._DictionaryGrid.menu.superclass.initComponent.call(this);
    }
});

ui.cmp._DictionaryGrid.grid = Ext.extend(Ext.grid.GridPanel,
{
    onRowContextMenu: function(grid, rowIndex, e)
    {
        e.stopEvent();
        this.getSelectionModel().selectRow(rowIndex);

        if( ! this.menu ) {
            this.menu = new ui.cmp._DictionaryGrid.menu({grid: grid});
        }
        this.menu.setRowIdx(rowIndex);
        this.menu.showAt(e.getXY());
    },

    initComponent : function()
    {
       Ext.apply(this, {
           region           : 'center',
           split            : true,
           loadMask         : true,
           autoScroll       : true,
           bodyBorder       : false,
           border           : false,
           autoExpandColumn : this.dataType,
           columns          : [
               {
                   id: 'id',
                   header: _('En word'),
                   sortable: true,
                   dataIndex: 'valueEn',
                   editor    : {
                       xtype : 'textfield'
                   }
               },
               {
                   header: String.format(_('{0} word'), PhDOE.user.lang.ucFirst() ),
                   sortable: true,
                   dataIndex: 'valueLang',
                   editor    : {
                       xtype : 'textfield'
                   }
               },
               {
                   header: _('Last User Update'),
                   sortable: true,
                   dataIndex: 'lastUser',
                   editor    : {
                       xtype     : 'displayfield',
                       hideField : true
                   }
               },
               {
                   header: _('Last Date Update'),
                   sortable: true,
                   dataIndex: 'lastDate',
                   editor    : {
                       xtype : 'displayfield',
                       hideField : true
                   },
                   renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
               }
           ],
           viewConfig       : ui.cmp._DictionaryGrid.viewConfig,
           sm               : new ui.cmp._DictionaryGrid.sm(),
           store            : new ui.cmp._DictionaryGrid.store({ fid : this.fid}),
           plugins          : [new ui.cmp._DictionaryGrid.editor()],
           tbar: [
           {
                scope   : this,
                tooltip : _('<b>Load/Refresh</b>'),
                iconCls : 'iconRefresh',
                handler : function()
                {
                    this.store.reload();
                }
           }, '->', {
                scope   : this,
                id      : this.fid + '-btn-new-word',
                disabled: true,
                text    : _('Add a new word'),
                iconCls : 'iconNewWord',
                handler : function()
                {
                    var Record = Ext.data.Record.create([{
                            name: 'id'
                        }, {
                            name: 'valueEn'
                        }, {
                            name: 'valueLang'
                        },{
                            name: 'lastUser'
                        },{
                            name: 'lastDate'
                        }]),
                    newDate = new Date(),
                    e = new Record({
                        id: 'new',
                        valueEn: '',
                        valueLang: '',
                        lastUser: PhDOE.user.login,
                        lastDate: newDate
                    });

                    this.plugins[0].stopEditing();
                    this.store.insert(0, e);
                    this.getView().refresh();
                    this.getSelectionModel().selectRow(0);
                    this.plugins[0].startEditing(0);
                }
           }
           ]
       });
       ui.cmp._DictionaryGrid.grid.superclass.initComponent.call(this);

       this.on('rowcontextmenu', this.onRowContextMenu, this);
    }
});


//------------------------------------------------------------------------------
// DictionaryGrid
// config - {prefix, fid, ftype, loadStore}
ui.cmp.DictionaryGrid = Ext.extend(Ext.Panel,
{
    initComponent : function()
    {
        Ext.apply(this,
        {
            layout: 'border',
            border: false,
            items : [
                new ui.cmp._DictionaryGrid.grid({
                    dataType : this.dataType,
                    prefix   : this.prefix,
                    fid      : this.fid,
                    ftype    : this.ftype,
                    loadStore: this.loadStore
                })
            ]
        });
        ui.cmp.DictionaryGrid.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._EditorConf');

//------------------------------------------------------------------------------
// EditorConf Win internals

// EditorConf Win-Menu template
ui.cmp._EditorConf.tplMenu = new Ext.XTemplate(
    '<tpl for=".">',
        '<div class="menu-wrap" id="tplMenu-{id}">',
            '<div class="menu {card}"></div>',
            '<span>{label}</span>',
        '</div>',
    '</tpl>'
);
ui.cmp._EditorConf.tplMenu.compile();

// EditorConf Win-Menu items definition for EN
ui.cmp._EditorConf.menuDefEn = [
    ['1', 'card1', _('Main')],
    ['4', 'card4', _('Module "Files with error"')],
    ['6', 'card6', _('Module "All files"')]
];

// EditorConf Win-Menu items definition for Non-EN
ui.cmp._EditorConf.menuDefNonEn = [
    ['1', 'card1', _('Main')],
    ['2', 'card2', _('Module "Files need translate"')],
    ['3', 'card3', _('Module "Files need update"')],
    ['4', 'card4', _('Module "Files with error"')],
    ['5', 'card5', _('Module "Files need reviewed"')],
    ['6', 'card6', _('Module "All files"')]
];

// EditorConf Win-Menu items store
ui.cmp._EditorConf.menuStore = new Ext.data.SimpleStore({
    id     : 0,
    fields : [
        { name : 'id'},
        { name : 'card'},
        { name : 'label'}
    ]
});

// EditorConf Win-Menu view
ui.cmp._EditorConf.viewMenu = Ext.extend(Ext.DataView,
{
    id           : 'conf-menu-view',
    tpl          : ui.cmp._EditorConf.tplMenu,
    singleSelect : true,
    overClass    : 'x-view-over',
    itemSelector : 'div.menu-wrap',
    store        : ui.cmp._EditorConf.menuStore,
    listeners : {
        selectionchange : function(view)
        {
            var r = view.getSelectedRecords();
            Ext.getCmp('confCard').layout.setActiveItem('conf-card-' + r[0].data.id);
        }
    }
});

// doc-editor Theme datastore
ui.cmp._EditorConf.themeStore = new Ext.data.SimpleStore({
    fields : ['themeFile', {
        name : 'themeName',
        type : 'string'
    }],
    data : [
        ['themes/ExtJsThemes/black/css/xtheme-black.css',                     _('Black')],
        ['themes/empty.css',                                                  _('Default')],
        ['themes/ExtJsThemes/darkgray/css/xtheme-darkgray.css',               _('DarkGray')],
        ['http://extjs.cachefly.net/ext-' + ExtJsVersion + '/resources/css/xtheme-gray.css', _('Gray')],
        ['themes/ExtJsThemes/gray-extend/css/xtheme-gray-extend.css',         _('Gray Extend')],
        ['themes/ExtJsThemes/indigo/css/xtheme-indigo.css',                   _('Indigo')],
        ['themes/ExtJsThemes/midnight/css/xtheme-midnight.css',               _('Midnight')],
        ['themes/ExtJsThemes/olive/css/xtheme-olive.css',                     _('Olive')],
        ['themes/ExtJsThemes/purple/css/xtheme-purple.css',                   _('Purple')],
        ['themes/ExtJsThemes/silverCherry/css/xtheme-silverCherry.css',       _('SilverCherry')],
        ['themes/ExtJsThemes/ubuntu_human/css/xtheme-human.css',              _('Ubuntu Human')]
    ]
});

ui.cmp._EditorConf.CommitChange = new Ext.util.DelayedTask(function()
{
    new ui.task.UpdateConfTask({
        module   : this.module,
        itemName : this.itemName,
        value    : this.getValue()
    });
});

// EditorConf card1 - mainApp
ui.cmp._EditorConf.card1 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-1',
    autoScroll : true,
    activeTab  : 0,
    defaults   : { bodyStyle: 'padding: 5px;', autoHeight : true, autoScroll : true },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype   : 'fieldset',
                    title   : _('Main menu'),
                    iconCls : 'iconMenu',
                    items   : [{
                        xtype      : 'spinnerfield',
                        width      : 60,
                        name       : 'PhDOE.user.conf.main.mainMenuWidth',
                        module     : 'main',
                        itemName   : 'mainMenuWidth',
                        value      : PhDOE.user.conf.main.mainMenuWidth || 300,
                        fieldLabel : _('Main menu width'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                    var cmp = Ext.getCmp('main-menu-panel'),
                                        val = this.getValue();
                                    PhDOE.user.conf.main.mainMenuWidth = val;
                                    cmp.setWidth(val);
                                    cmp.ownerCt.doLayout();

                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                    var cmp = Ext.getCmp('main-menu-panel'),
                                        val = this.getValue();
                                    PhDOE.user.conf.main.mainMenuWidth = val;
                                    cmp.setWidth(val);
                                    cmp.ownerCt.doLayout();

                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }
                    }]
                }, {
                    xtype   : 'fieldset',
                    iconCls : 'iconThemes',
                    title   : _('Appearance'),
                    items   : [{
                        xtype          : 'combo',
                        fieldLabel     : _('Choose a theme'),
                        id             : 'conf-combo-theme',
                        valueField     : 'themeFile',
                        displayField   : 'themeName',
                        triggerAction  : 'all',
                        mode           : 'local',
                        forceSelection : true,
                        editable       : false,
                        value          : PhDOE.user.conf.main.theme,
                        store          : ui.cmp._EditorConf.themeStore,
                        listeners      : {
                            render : function()
                            {
                                Ext.getCmp('conf-combo-theme').store.sort('themeName');
                            },
                            select : function(c)
                            {
                                var hrefTheme = c.getValue();

                                Ext.get('appTheme').dom.href = hrefTheme;

                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'theme',
                                    value    : hrefTheme
                                });
                            }
                        }
                    }]
                }, {
                    xtype      : 'fieldset',
                    title      : _('On save file'),
                    iconCls    : 'iconSaveFile',
                    autoHeight : true,
                    defaults   : { hideLabel: true },
                    defaultType: 'radio',
                    items      : [{
                        autoHeight : true,
                        name       : 'PhDOE.user.conf.main.onSaveFile',
                        module     : 'main',
                        itemName   : 'onSaveFile',
                        checked    : (PhDOE.user.conf.main.onSaveFile === "ask-me") ? true : false,
                        boxLabel   : _('Ask me if I want to check for error before saving the file'),
                        inputValue : 'ask-me',
                        listeners  : {
                            check  : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'main',
                                        itemName : 'onSaveFile',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }, {
                        autoHeight : true,
                        name       : 'PhDOE.user.conf.main.onSaveFile',
                        module     : 'main',
                        itemName   : 'onSaveFile',
                        checked    : (PhDOE.user.conf.main.onSaveFile === "always") ? true : false,
                        boxLabel   : _('Always check for error before saving the file'),
                        inputValue : 'always',
                        listeners  : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'main',
                                        itemName : 'onSaveFile',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }, {
                        autoHeight : true,
                        name       : 'PhDOE.user.conf.main.onSaveFile',
                        module     : 'main',
                        itemName   : 'onSaveFile',
                        checked    : (PhDOE.user.conf.main.onSaveFile === "never") ? true : false,
                        boxLabel   : _('Never check for error before saving the file'),
                        inputValue : 'never',
                        listeners  : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'main',
                                        itemName : 'onSaveFile',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }]
                 },{
                        xtype       : 'checkbox',
                        name        : 'PhDOE.user.conf.main.displayENWork',
                        checked     : PhDOE.user.conf.main.displayENWork,
                        boxLabel    : _('Display EN work in "Work in progress" & "Patches for review" modules'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'displayENWork',
                                    value : field.getValue()
                                });
                            }
                        }
                 }]
             }, {
                title   : _('External Data'),
                iconCls : 'iconExternalData',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('About mails'),
                    iconCls     : 'iconMailing',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        autoHeight  : true,
                        name        : 'PhDOE.user.conf.main.loadMailsAtStartUp',
                        checked     : PhDOE.user.conf.main.loadMailsAtStartUp,
                        boxLabel    : _('Load mail at startUp'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'loadMailsAtStartUp',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('About bugs'),
                    iconCls     : 'iconBugs',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        autoHeight  : true,
                        name        : 'PhDOE.user.conf.main.loadBugsAtStartUp',
                        checked     : PhDOE.user.conf.main.loadBugsAtStartUp,
                        boxLabel    : _('Load bugs at startUp'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'loadBugsAtStartUp',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
             }]
        });
        ui.cmp._EditorConf.card1.superclass.initComponent.call(this);
    }
});

// EditorConf card2 - Module "Files Need Translate" Config
ui.cmp._EditorConf.card2 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-2',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('Menu'),
                iconCls : 'iconMenu',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Nb files to display'),
                    iconCls     : 'iconFilesToDisplay',
                    defaults    : { hideLabel: true },
                    items       : [{
                        xtype      : 'spinnerfield',
                        width      : 60,
                        name       : 'PhDOE.user.conf.newFile.nbDisplay',
                        module     : 'newFile',
                        itemName   : 'nbDisplay',
                        value      : PhDOE.user.conf.newFile.nbDisplay || 0,
                        boxLabel   : _('files to display'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }
                    }, {
                        xtype : 'displayfield',
                        value : _('0 means no limit'),
                        style : { fontStyle: 'italic'}
                    }]
                }]
            }, {
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('ScrollBars'),
                    iconCls     : 'iconScrollBar',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name        : 'PhDOE.user.conf.newFile.syncScrollbars',
                        checked     : PhDOE.user.conf.newFile.syncScrollbars,
                        boxLabel    : _('Synchronize scroll bars'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'syncScrollbars',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                },{
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.newFile.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'newFile.toolsPanelWidth',
                            module     : 'newFile',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.newFile.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Google translate Panel'),
                    iconCls     : 'iconGoogle',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name        : 'PhDOE.user.conf.newFile.googlePanelDisplay',
                        checked     : PhDOE.user.conf.newFile.googlePanelDisplay,
                        boxLabel    : _('Display the Google Translation Panel'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'googlePanelDisplay',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
            }, {
                title   : _('Editor'),
                iconCls : 'iconEditor',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('SpellChecking'),
                    iconCls     : 'iconSpellCheck',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        autoHeight  : true,
                        name        : 'PhDOE.user.conf.newFile.enableSpellCheck',
                        checked     : PhDOE.user.conf.newFile.enableSpellCheck,
                        boxLabel    : _('Enable spell checking'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'enableSpellCheck',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card2.superclass.initComponent.call(this);
    }
});

// EditorConf card3 - Module "Files Need Update" Config
ui.cmp._EditorConf.card3 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-3',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('Menu'),
                iconCls : 'iconMenu',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Nb files to display'),
                    iconCls     : 'iconFilesToDisplay',
                    defaults    : { hideLabel: true },
                    defaultType : 'spinnerfield',
                    items       : [{
                        width      : 60,
                        name       : 'PhDOE.user.conf.needUpdate.nbDisplay',
                        module     : 'needUpdate',
                        itemName   : 'nbDisplay',
                        value      : PhDOE.user.conf.needUpdate.nbDisplay || 0,
                        boxLabel   : _('files to display'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }

                    }, {
                        xtype : 'displayfield',
                        value : _('0 means no limit'),
                        style : { fontStyle: 'italic'}
                    }]
                }]
            }, {
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('ScrollBars'),
                    iconCls     : 'iconScrollBar',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name        : 'needUpdate.syncScrollbars',
                        checked     : PhDOE.user.conf.needUpdate.syncScrollbars,
                        boxLabel    : _('Synchronize scroll bars'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'syncScrollbars',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name        : 'needUpdate.toolsPanelLogLoad',
                        checked     : PhDOE.user.conf.needUpdate.toolsPanelLogLoad,
                        boxLabel    : _('Automatically load the log when displaying the file'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelLogLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.needUpdate.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'needUpdate.toolsPanelWidth',
                            module     : 'needUpdate',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.needUpdate.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Diff view'),
                    iconCls     : 'iconDiffView',
                    defaults    : { hideLabel: true },
                    defaultType : 'radio',
                    items       : [{
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.needUpdate.diffPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'diffPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'diffPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'needUpdate.diffPanelHeight',
                            module     : 'needUpdate',
                            itemName   : 'diffPanelHeight',
                            value      : PhDOE.user.conf.needUpdate.diffPanelHeight || 150,
                            fieldLabel : _('Panel height'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }, {
                        name       : 'needUpdate.diffMethod',
                        checked    : (PhDOE.user.conf.needUpdate.diffMethod === "using-viewvc") ? true : false,
                        boxLabel   : _('Using ViewVc from php web site'),
                        inputValue : 'using-viewvc',
                        listeners  : {
                            check  : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'needUpdate',
                                        itemName : 'diffMethod',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }, {
                        name       : 'needUpdate.diffMethod',
                        checked    : (PhDOE.user.conf.needUpdate.diffMethod === "using-exec") ? true : false,
                        boxLabel   : _('Using diff -u command line'),
                        inputValue : 'using-exec',
                        listeners : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'needUpdate',
                                        itemName : 'diffMethod',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }]
                }]
            }, {
                title   : _('Editor'),
                iconCls : 'iconEditor',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('SpellChecking'),
                    iconCls     : 'iconSpellCheck',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name      : 'needUpdate.enableSpellCheckEn',
                        checked   : PhDOE.user.conf.needUpdate.enableSpellCheckEn,
                        boxLabel  : String.format(_('Enable spell checking for the <b>{0}</b> file'), 'EN'),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'enableSpellCheckEn',
                                    value : field.getValue()
                                });
                            }
                        }
                    },{
                        name      : 'needUpdate.enableSpellCheckLang',
                        checked   : PhDOE.user.conf.needUpdate.enableSpellCheckLang,
                        boxLabel  : String.format(_('Enable spell checking for the <b>{0}</b> file'), Ext.util.Format.uppercase(PhDOE.user.lang)),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'enableSpellCheckLang',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card3.superclass.initComponent.call(this);
    }
});

// EditorConf card4 - Module "Files with Error" Config
ui.cmp._EditorConf.card4 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-4',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('Menu'),
                iconCls : 'iconMenu',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Nb files to display'),
                    iconCls     : 'iconFilesToDisplay',
                    defaults    : { hideLabel: true },
                    defaultType : 'spinnerfield',
                    items       : [{
                        width      : 60,
                        name       : 'PhDOE.user.conf.error.nbDisplay',
                        module     : 'error',
                        itemName   : 'nbDisplay',
                        value      : PhDOE.user.conf.error.nbDisplay || 0,
                        boxLabel   : _('files to display'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }

                    }, {
                        xtype : 'displayfield',
                        value : _('0 means no limit'),
                        style : { fontStyle: 'italic'}
                    }]
                }, {
                    hidden      : ( PhDOE.user.lang === 'en' ),
                    xtype       : 'fieldset',
                    title       : _('Error type'),
                    iconCls     : 'iconFilesError',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'error.skipNbLiteralTag',
                        checked    : PhDOE.user.conf.error.skipNbLiteralTag,
                        boxLabel   : _('Skip nbLiteralTag error'),
                        listeners  : {
                            check  : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'skipNbLiteralTag',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
            }, {
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('ScrollBars'),
                    iconCls     : 'iconScrollBar',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'error.syncScrollbars',
                        checked    : PhDOE.user.conf.error.syncScrollbars,
                        boxLabel   : _('Synchronize scroll bars'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'syncScrollbars',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'error.toolsPanelLogLoad',
                        checked    : PhDOE.user.conf.error.toolsPanelLogLoad,
                        boxLabel   : _('Automatically load the log when displaying the file'),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelLogLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        name       : 'error.toolsPanelEntitiesLoad',
                        checked    : PhDOE.user.conf.error.toolsPanelEntitiesLoad,
                        boxLabel   : _('Automatically load entities data when displaying the file'),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelEntitiesLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        name       : 'error.toolsPanelAcronymsLoad',
                        checked    : PhDOE.user.conf.error.toolsPanelAcronymsLoad,
                        boxLabel   : _('Automatically load acronyms data when displaying the file'),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelAcronymsLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.error.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items: [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'error.toolsPanelWidth',
                            module     : 'error',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.error.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Error description'),
                    iconCls     : 'iconFilesError',
                    defaults    : { hideLabel: true },
                    defaultType : 'radio',
                    items       : [{
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.error.descPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'descPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'descPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'error.descPanelHeight',
                            module     : 'error',
                            itemName   : 'descPanelHeight',
                            value      : PhDOE.user.conf.error.descPanelHeight || 150,
                            fieldLabel : _('Panel height'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }]
            }, {
                title   : _('Editor'),
                iconCls : 'iconEditor',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('SpellChecking'),
                    iconCls     : 'iconSpellCheck',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        hidden      : ( PhDOE.user.lang === 'en' ),
                        name        : 'error.enableSpellCheckEn',
                        checked     : PhDOE.user.conf.error.enableSpellCheckEn,
                        boxLabel    : String.format(_('Enable spell checking for the <b>{0}</b> file'), 'EN'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'enableSpellCheckEn',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        name        : 'error.enableSpellCheckLang',
                        checked     : PhDOE.user.conf.error.enableSpellCheckLang,
                        boxLabel    : String.format(_('Enable spell checking for the <b>{0}</b> file'), Ext.util.Format.uppercase(PhDOE.user.lang)),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'enableSpellCheckLang',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card4.superclass.initComponent.call(this);
    }
});

// EditorConf card5 - Module "Files need Reviewed" Config
ui.cmp._EditorConf.card5 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-5',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('Menu'),
                iconCls : 'iconMenu',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Nb files to display'),
                    iconCls     : 'iconFilesToDisplay',
                    defaults    : { hideLabel: true },
                    defaultType : 'spinnerfield',
                    items       : [{
                        width      : 60,
                        name       : 'reviewed.nbDisplay',
                        module     : 'reviewed',
                        itemName   : 'nbDisplay',
                        value      : PhDOE.user.conf.reviewed.nbDisplay || 0,
                        boxLabel   : _('files to display'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }

                    }, {
                        xtype: 'displayfield',
                        value: _('0 means no limit'),
                        style: { fontStyle: 'italic'}
                    }]
                }]
            }, {
                title   : 'User Interface',
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('ScrollBars'),
                    iconCls     : 'iconScrollBar',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'reviewed.syncScrollbars',
                        checked    : PhDOE.user.conf.reviewed.syncScrollbars,
                        boxLabel   : _('Synchronize scroll bars'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'syncScrollbars',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'reviewed.toolsPanelLogLoad',
                        checked    : PhDOE.user.conf.reviewed.toolsPanelLogLoad,
                        boxLabel   : _('Automatically load the log when displaying the file'),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'toolsPanelLogLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.reviewed.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'reviewed.toolsPanelWidth',
                            module     : 'reviewed',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.reviewed.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }]
            }, {
                title   : 'Editor',
                iconCls : 'iconEditor',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('SpellChecking'),
                    iconCls     : 'iconSpellCheck',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name        : 'reviewed.enableSpellCheckEn',
                        checked     : PhDOE.user.conf.reviewed.enableSpellCheckEn,
                        boxLabel    : String.format(_('Enable spell checking for the <b>{0}</b> file'), 'EN'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'enableSpellCheckEn',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        name        : 'reviewed.enableSpellCheckLang',
                        checked     : PhDOE.user.conf.reviewed.enableSpellCheckLang,
                        boxLabel    : String.format(_('Enable spell checking for the <b>{0}</b> file'), Ext.util.Format.uppercase(PhDOE.user.lang)),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'enableSpellCheckLang',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card5.superclass.initComponent.call(this);
    }
});

// EditorConf card6 - Module "All files" Config
ui.cmp._EditorConf.card6 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-6',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'allFiles.toolsPanelLogLoad',
                        checked    : PhDOE.user.conf.allFiles.toolsPanelLogLoad,
                        boxLabel   : _('Automatically load the log when displaying the file'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelLogLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        name       : 'allFiles.toolsPanelEntitiesLoad',
                        checked    : PhDOE.user.conf.allFiles.toolsPanelEntitiesLoad,
                        boxLabel   : _('Automatically load entities data when displaying the file'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelEntitiesLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    },{
                        name       : 'allFiles.toolsPanelAcronymsLoad',
                        checked    : PhDOE.user.conf.allFiles.toolsPanelAcronymsLoad,
                        boxLabel   : _('Automatically load acronyms data when displaying the file'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelAcronymsLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.allFiles.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items: [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'allFiles.toolsPanelWidth',
                            module     : 'allFiles',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.allFiles.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }]
            }, {
                title   : _('Editor'),
                iconCls : 'iconEditor',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('SpellChecking'),
                    iconCls     : 'iconSpellCheck',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name        : 'allFiles.enableSpellCheck',
                        checked     : PhDOE.user.conf.allFiles.enableSpellCheck,
                        boxLabel    : _('Enable spell checking'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'enableSpellCheck',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card6.superclass.initComponent.call(this);
    }
});

//------------------------------------------------------------------------------
// EditorConf Win
ui.cmp.EditorConf = Ext.extend(Ext.Window,
{
    id          : 'win-conf',
    layout      : 'border',
    width       : 700,
    height      : 470,
    iconCls     : 'iconConf',
    title       : _('Configuration'),
    modal       : true,
    plain       : true,
    bodyBorder  : false,
    closeAction : 'hide',
    buttons     : [{
        text   : _('Close'),
        handler: function()
        {
            Ext.getCmp('win-conf').hide();
        }
    }],

    listeners : {
        show : function()
        {
            var view = Ext.getCmp('conf-menu-view');
            view.select(view.getNode(0));
        }
    },

    initComponent : function()
    {
        if (PhDOE.user.lang === 'en') {
            ui.cmp._EditorConf.menuStore.loadData(ui.cmp._EditorConf.menuDefEn);
        } else {
            ui.cmp._EditorConf.menuStore.loadData(ui.cmp._EditorConf.menuDefNonEn);
        }

        Ext.apply(this,
        {
            items : [{
                id         : 'confMenu',
                region     : 'west',
                border     : false,
                width      : 190,
                autoScroll : true,
                items      : [new ui.cmp._EditorConf.viewMenu()]
            }, {
                id         : 'confCard',
                region     : 'center',
                border     : false,
                layout     : 'card',
                width      : 375,
                frame      : true,
                activeItem : 0,

                bbar : new Ext.ux.StatusBar({
                    defaultText    : _('All changes take effect immediately'),
                    defaultIconCls : 'confStatusBar'
                }),

                items : [
                    new ui.cmp._EditorConf.card1(),
                    new ui.cmp._EditorConf.card2(),
                    new ui.cmp._EditorConf.card3(),
                    new ui.cmp._EditorConf.card4(),
                    new ui.cmp._EditorConf.card5(),
                    new ui.cmp._EditorConf.card6()
                ]
            }]
        });
        ui.cmp.EditorConf.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._EmailPrompt');

// config - { name, email }
ui.cmp.EmailPrompt = Ext.extend(Ext.Window,
{
    title       : _('Send an email'),
    width       : 500,
    height      : 300,
    minWidth    : 300,
    minHeight   : 200,
    layout      : 'fit',
    plain       : true,
    bodyStyle   : 'padding:5px;',
    buttonAlign : 'center',
    iconCls     : 'iconSendEmail',
    closeAction : 'hide',
    buttons     : [{
        text   : _('Send'),
        handler: function()
        {
            var win    = this.ownerCt.ownerCt,
                values = win.findByType('form').shift().getForm().getValues();

            XHR({
                params  : {
                    task    : 'sendEmail',
                    to      : values.to,
                    subject : values.subject,
                    msg     : values.msg
                },
                success : function()
                {
                    win.hide();

                    Ext.Msg.alert(
                        _('Status'),
                        String.format(_('Email sent to {0} with success!'), win.name.ucFirst()),
                        Ext.emptyFn
                    );
                }
            });

        }
    }, {
        text    : _('Cancel'),
        handler : function()
        {
            this.ownerCt.ownerCt.hide();
        }
    }],

    setData : function (name, email)
    {
        this.name  = name;
        this.email = email;

        this.items.items[0].items.items[0].setValue('"' + this.name.ucFirst() + '" <' + this.email + '>');
        this.items.items[0].items.items[1].setValue('');
        this.items.items[0].items.items[2].setValue('');
    },

    initComponent : function()
    {
        Ext.apply(this, {
            items : new Ext.form.FormPanel({
                baseCls     : 'x-plain',
                labelWidth  : 55,
                defaultType : 'textfield',
                items : [{
                    name       : 'to',
                    fieldLabel : _('Send To'),
                    readOnly   : true,
                    anchor     : '100%',
                    value      : ''
                }, {
                    name       : 'subject',
                    fieldLabel : _('Subject'),
                    anchor     : '100%'
                }, {
                    name      : 'msg',
                    xtype     : 'textarea',
                    hideLabel : true,
                    anchor    : '100% -53'
                }]
            })
        });
        ui.cmp.EmailPrompt.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._EntitiesAcronymsPanel');

//------------------------------------------------------------------------------
// EntitiesAcronymsGrid internals

ui.cmp._EntitiesAcronymsPanel.grid = Ext.extend(Ext.grid.GridPanel,
{
    onRowClick: function(grid)
    {
        var data = grid.getSelectionModel().getSelected().data;

        Ext.getCmp(this.dataType + '-details-' + this.fid).update(data.value);

    },

    onRowDblClick: function(grid)
    {        
        var data           = grid.getSelectionModel().getSelected().data,
            cmp            = Ext.getCmp(this.prefix + '-' + this.ftype + '-FILE-' + this.fid),
            cursorPosition = Ext.util.JSON.decode(cmp.getCursorPosition()),
            dataInserted   = (this.dataType === 'entities') ? '&' + data.items + ';' : '<acronym>' + data.items + '</acronym>';

        //Insert the entities at the cursor position
        cmp.insertIntoLine(cursorPosition.line, cursorPosition.caracter, dataInserted);
    },

    initComponent : function()
    {
       var url;

       if( this.dataType === 'entities' ) {
           url = "./do/getEntities";
       } else if( this.dataType === 'acronyms' ) {
           url = "./do/getAcronyms";
       }

       Ext.apply(this, {
           region           : 'center',
           split            : true,
           loadMask         : true,
           autoScroll       : true,
           bodyBorder       : false,
           border           : false,
           autoExpandColumn : this.dataType,
           columns          : [
               {id: 'items', header: _('Items'), sortable: true, dataIndex: 'items'},
               {header: _('From'), sortable: true, dataIndex: 'from', width: 50}
           ],
           viewConfig : {
               forceFit      : true,
               emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '<br><br>'+_('(You can change this behavior by setting an option in the configuration window)') + '</div>',
               deferEmptyText: false
           },
           sm         : new Ext.grid.RowSelectionModel({singleSelect: true}),
           store      : new Ext.data.Store({
               autoLoad : this.loadStore,
               proxy    : new Ext.data.HttpProxy({
                   url : url
               }),
               listeners: {
                   scope : this,
                   load  : function()
                   {
                       if( this.dataType === 'entities' ) {
                           Ext.getCmp(this.prefix + '-' + this.fid).panEntities = true;
                       } else if( this.dataType === 'acronyms' ) {
                           Ext.getCmp(this.prefix + '-' + this.fid).panAcronyms = true;
                       }
                       Ext.getCmp('main-panel').fireEvent('tabLoaded', this.prefix, this.fid);
                   }

               },
               reader : new Ext.data.JsonReader(
               {
                   root          : 'Items',
                   totalProperty : 'nbItems',
                   idProperty    : 'id',
                   fields        : [
                       {name : 'id'},
                       {name : 'from'},
                       {name : 'items'},
                       {name : 'value'}
                   ]
               })
           }),
           tbar: [
           {
                scope   : this,
                tooltip : _('<b>Load/Refresh</b>'),
                iconCls : 'iconRefresh',
                handler : function()
                {
                    this.store.reload();
                }
            },
               _('Filter: '), ' ',
               new Ext.form.TwinTriggerField({
                    width           : 180,
                    hideTrigger1    : true,
                    enableKeyEvents : true,
                    validateOnBlur  : false,
                    validationEvent : false,
                    trigger1Class   : 'x-form-clear-trigger',
                    trigger2Class   : 'x-form-search-trigger',
                    listeners : {
                        specialkey : function(f, e)
                        {
                            if (e.getKey() === e.ENTER) {
                                this.onTrigger2Click();
                            }
                        }
                    },
                    onTrigger1Click: function()
                    {
                        this.setValue('');
                        this.triggers[0].hide();
                        this.setSize(180,10);
                        this.ownerCt.ownerCt.store.clearFilter();
                    },
                    onTrigger2Click: function()
                    {
                        var v = this.getValue(), regexp;

                        if (v === '' || v.length < 3) {
                            this.markInvalid(
                                _('Your filter must contain at least 3 characters')
                            );
                            return;
                        }
                        this.clearInvalid();
                        this.triggers[0].show();
                        this.setSize(180,10);

                        regexp = new RegExp(v, 'i');

                        // We filter on 'from', 'items', 'value'
                        this.ownerCt.ownerCt.store.filterBy(function(record) {

                            if( regexp.test(record.data.from)  ||
                                regexp.test(record.data.items) ||
                                regexp.test(record.data.value)
                            ) {
                                return true;
                            } else {
                                return false;
                            }
                        }, this);
                    }
                })
           ]
       });
       ui.cmp._EntitiesAcronymsPanel.grid.superclass.initComponent.call(this);

       this.on('rowclick',    this.onRowClick,    this);
       this.on('rowdblclick', this.onRowDblClick, this);

    }
});


//------------------------------------------------------------------------------
// EntitiesAcronymsGrid
// config - {prefix, fid, ftype, loadStore}
ui.cmp.EntitiesAcronymsPanel = Ext.extend(Ext.Panel,
{
    initComponent : function()
    {
        var panelDesc;

        if( this.dataType === 'entities' ) {
            panelDesc = _('Click on a row to display the content of the entitie.<br>Double-click on it to insert it at the cursor position.');
        } else if( this.dataType === 'acronyms' ) {
            panelDesc = _('Click on a row to display the content of the acronym.<br>Double-click on it to insert it at the cursor position.');
        }

        Ext.apply(this,
        {
            layout: 'border',
            border: false,
            items : [
                new ui.cmp._EntitiesAcronymsPanel.grid({
                    dataType : this.dataType,
                    prefix   : this.prefix,
                    fid      : this.fid,
                    ftype    : this.ftype,
                    loadStore: this.loadStore
                }),
                {
                    xtype        : 'panel',
                    id           : this.dataType + '-details-'+this.fid,
                    region       : 'south',
                    split        : true,
                    height       : 100,
                    autoScroll   : true,
                    bodyBorder   : false,
                    bodyCssClass : this.dataType + '-details',
                    html         : panelDesc
                }
            ]
        });

        ui.cmp.EntitiesAcronymsPanel.superclass.initComponent.call(this);
    }
});Ext.namespace('ui', 'ui.cmp', 'ui.cmp._ErrorFileGrid');

//------------------------------------------------------------------------------
// ErrorFileGrid internals

// ErrorFileGrid store
ui.cmp._ErrorFileGrid.store = new Ext.data.GroupingStore({
    proxy: new Ext.data.HttpProxy({
        url: './do/getFilesError'
    }),
    reader: new Ext.data.JsonReader({
        root: 'Items',
        totalProperty: 'nbItems',
        idProperty: 'id',
        fields: [{
            name: 'id'
        }, {
            name: 'path'
        }, {
            name: 'name'
        }, {
            name: 'maintainer'
        }, {
            name: 'type'
        }, {
            name: 'value_en'
        }, {
            name: 'value_lang'
        }, {
            name: 'fileModifiedEN'
        }, {
            name: 'fileModifiedLang'
        }]
    }),
    sortInfo: {
        field: 'path',
        direction: 'ASC'
    },
    groupField: 'path',
    listeners: {
        datachanged: function(ds){
            Ext.getDom('acc-error-nb').innerHTML = ds.getCount();
        }
    }
});

// ErrorFileGrid columns definition
ui.cmp._ErrorFileGrid.columns = [{
    id: 'name',
    header: _('Files'),
    sortable: true,
    dataIndex: 'name',
    renderer: function(v, metada, r){
        var mess = '', infoEN, infoLang;
        
        if (r.data.fileModifiedEN) {
        
            infoEN = Ext.util.JSON.decode(r.data.fileModifiedEN);
            
            if (infoEN.user === PhDOE.user.login && infoEN.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess = _('File EN modified by me') + "<br>";
            }
            else {
                mess = String.format(_('File EN modified by {0}'), infoEN.user.ucFirst()) + "<br>";
            }
        }
        
        if (r.data.fileModifiedLang) {
        
            infoLang = Ext.util.JSON.decode(r.data.fileModifiedLang);
            
            if (infoLang.user === PhDOE.user.login && infoLang.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess += String.format(_('File {0} modified by me'), PhDOE.user.lang.ucFirst());
            }
            else {
                mess += String.format(_('File {0} modified by {1}'), PhDOE.user.lang.ucFirst(), infoLang.user.ucFirst());
            }
        }
        
        if (mess !== '') {
            return "<span ext:qtip='" + mess + "'>" + v + "</span>";
        }
        else {
            return v;
        }
    }
}, {
    header: _('Type'),
    width: 45,
    sortable: true,
    dataIndex: 'type'
}, {
    header: _('Maintainer'),
    width: 45,
    sortable: true,
    dataIndex: 'maintainer'
}, {
    header: _('Path'),
    dataIndex: 'path',
    hidden: true
}];

// ErrorFileGrid view
ui.cmp._ErrorFileGrid.view = new Ext.grid.GroupingView({
    emptyText: '<div style="text-align: center;">' + _('No Files') + '</div>',
    deferEmptyText: false,
    forceFit: true,
    startCollapsed: true,
    groupTextTpl: '{[values.rs[0].data.path]} ' +
    '({[values.rs.length]} ' +
    '{[values.rs.length > 1 ? "' +
    _('Files') +
    '" : "' +
    _('File') +
    '"]})',
    getRowClass: function(r){
        if (r.data.fileModifiedEN || r.data.fileModifiedLang) {
        
            var infoEN = Ext.util.JSON.decode(r.data.fileModifiedEN), infoLang = Ext.util.JSON.decode(r.data.fileModifiedLang);
            
            return ((infoEN.user === PhDOE.user.login && infoEN.anonymousIdent === PhDOE.user.anonymousIdent) ||
            (infoLang.user === PhDOE.user.login && infoLang.anonymousIdent === PhDOE.user.anonymousIdent)) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
        }
        return false;
    }
});

// ErrorFileGrid context menu
// config - { hideDiffMenu, grid, rowIdx, event, lang, fpath, fname }
ui.cmp._ErrorFileGrid.menu = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._ErrorFileGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._ErrorFileGrid.menu, Ext.menu.Menu, {
    init: function(){
        Ext.apply(this, {
            items: [{
                scope: this,
                text: '<b>' + _('Edit in a new tab') + '</b>',
                iconCls: 'iconFilesError',
                handler: function(){
                    this.grid.fireEvent('rowdblclick', this.grid, this.rowIdx, this.event);
                }
            }, {
                scope: this,
                hidden: this.hideDiffMenu,
                text: _('View diff...'),
                iconCls: 'iconViewDiff',
                menu: new Ext.menu.Menu({
                    items: [{
                        scope: this,
                        hidden: (this.grid.store.getAt(this.rowIdx).data.fileModifiedEN === false),
                        text: String.format(_('... of the {0} file'), 'EN'),
                        handler: function(){
                            
                            Ext.getCmp('main-panel').openDiffTab({
                                DiffType: 'file',
                                FileName: this.fname,
                                FilePath: 'en'+this.fpath
                            });
                            //this.openTab(this.rowIdx, 'en', this.fpath, this.fname);
                        }
                    }, {
                        scope: this,
                        hidden: (this.grid.store.getAt(this.rowIdx).data.fileModifiedLang === false),
                        text: String.format(_('... of the {0} file'), PhDOE.user.lang.ucFirst()),
                        handler: function(){
                            
                            Ext.getCmp('main-panel').openDiffTab({
                                DiffType: 'file',
                                FileName: this.fname,
                                FilePath: PhDOE.user.lang+this.fpath
                            });
                            //this.openTab(this.rowIdx, PhDOE.user.lang, this.fpath, this.fname);
                        }
                    }]
                })
            }, '-', {
                text: _('About error type'),
                iconCls: 'iconHelp',
                handler: function(){
                    if (!Ext.getCmp('main-panel').findById('FE-help')) {
                    
                        Ext.getCmp('main-panel').add({
                            id: 'FE-help',
                            title: _('About error type'),
                            iconCls: 'iconHelp',
                            closable: true,
                            autoScroll: true,
                            autoLoad: './error'
                        });
                        
                    }
                    Ext.getCmp('main-panel').setActiveTab('FE-help');
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// ErrorFileGrid
ui.cmp.ErrorFileGrid = Ext.extend(Ext.grid.GridPanel, {
    loadMask: true,
    border: false,
    autoExpandColumn: 'name',
    enableDragDrop: true,
    ddGroup: 'mainPanelDDGroup',
    view: ui.cmp._ErrorFileGrid.view,
    columns: ui.cmp._ErrorFileGrid.columns,
    listeners: {
        render: function(grid){
            grid.view.refresh();
        }
    },
    
    onRowContextMenu: function(grid, rowIndex, e){
        e.stopEvent();
        
        var data = grid.store.getAt(rowIndex).data, FilePath = data.path, FileName = data.name;
        
        grid.getSelectionModel().selectRow(rowIndex);
        
        new ui.cmp._ErrorFileGrid.menu({
            hideDiffMenu: (data.fileModifiedEN === false && data.fileModifiedLang === false),
            grid: grid,
            event: e,
            rowIdx: rowIndex,
            lang: PhDOE.user.lang,
            fpath: FilePath,
            fname: FileName
        }).showAt(e.getXY());
    },
    
    onRowDblClick: function(grid, rowIndex, e){
        this.openFile(grid.store.getAt(rowIndex).data.id);
    },
    
    openFile: function(rowId){
        var storeRecord = this.store.getById(rowId), FilePath = storeRecord.data.path, FileName = storeRecord.data.name, FileID = Ext.util.md5('FE-' + PhDOE.user.lang + FilePath + FileName), error = [], vcsPanel, filePanel;
        
        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FE-' + FileID)) {
        
            // Find all error for this file to pass to error_type.php page
            error = [];
            
            this.store.each(function(record){
                if (record.data.path === FilePath && record.data.name === FileName && !error[record.data.type]) {
                    error.push(record.data.type);
                }
            });
            
            vcsPanel = (PhDOE.user.lang === 'en') ? [new ui.cmp.VCSLogGrid({
                layout: 'fit',
                title: String.format(_('{0} Log'), PhDOE.user.lang.ucFirst()),
                prefix: 'FE-LANG',
                fid: FileID,
                fpath: PhDOE.user.lang + FilePath,
                fname: FileName,
                loadStore: PhDOE.user.conf.error.toolsPanelLogLoad
            })] : [new ui.cmp.VCSLogGrid({
                layout: 'fit',
                title: String.format(_('{0} Log'), PhDOE.user.lang.ucFirst()),
                prefix: 'FE-LANG',
                fid: FileID,
                fpath: PhDOE.user.lang + FilePath,
                fname: FileName,
                loadStore: PhDOE.user.conf.error.toolsPanelLogLoad
            }), new ui.cmp.VCSLogGrid({
                layout: 'fit',
                title: String.format(_('{0} Log'), 'En'),
                prefix: 'FE-EN',
                fid: FileID,
                fpath: 'en' + FilePath,
                fname: FileName,
                loadStore: PhDOE.user.conf.error.toolsPanelLogLoad
            })];
            
            filePanel = (PhDOE.user.lang === 'en') ? [new ui.cmp.FilePanel({
                id: 'FE-LANG-PANEL-' + FileID,
                region: 'center',
                title: String.format(_('{0} File: '), PhDOE.user.lang) + FilePath + FileName,
                prefix: 'FE',
                ftype: 'LANG',
                spellCheck: PhDOE.user.conf.error.enableSpellCheckLang,
                spellCheckConf: { module : 'error', itemName : 'enableSpellCheckLang' },
                fid: FileID,
                fpath: FilePath,
                fname: FileName,
                lang: PhDOE.user.lang,
                parser: 'xml',
                storeRecord: storeRecord,
                syncScrollCB: false,
                syncScroll: false
            })] : [new ui.cmp.FilePanel({
                id: 'FE-LANG-PANEL-' + FileID,
                region: 'center',
                title: String.format(_('{0} File: '), PhDOE.user.lang.ucFirst()) + FilePath + FileName,
                prefix: 'FE',
                ftype: 'LANG',
                spellCheck: PhDOE.user.conf.error.enableSpellCheckLang,
                spellCheckConf: { module : 'error', itemName : 'enableSpellCheckLang' },
                fid: FileID,
                fpath: FilePath,
                fname: FileName,
                lang: PhDOE.user.lang,
                parser: 'xml',
                storeRecord: storeRecord,
                syncScrollCB: true,
                syncScroll: true,
                syncScrollConf: { module : 'error', itemName : 'syncScrollbars' }
            }), new ui.cmp.FilePanel({
                id: 'FE-EN-PANEL-' + FileID,
                region: 'east',
                title: _('en File: ') + FilePath + FileName,
                prefix: 'FE',
                ftype: 'EN',
                spellCheck: PhDOE.user.conf.error.enableSpellCheckEn,
                spellCheckConf: { module : 'error', itemName : 'enableSpellCheckEn' },
                fid: FileID,
                fpath: FilePath,
                fname: FileName,
                lang: 'en',
                parser: 'xml',
                storeRecord: storeRecord,
                syncScroll: true,
                syncScrollConf: { module : 'error', itemName : 'syncScrollbars' }
            })];
            
            Ext.getCmp('main-panel').add({
                id: 'FE-' + FileID,
                title: FileName,
                layout: 'border',
                iconCls: 'iconTabError',
                closable: true,
                tabLoaded: false,
                panVCSLang: !PhDOE.user.conf.errorDisplayLog,
                panVCSEn: (PhDOE.user.lang === 'en') ? true : !PhDOE.user.conf.errorDisplayLog,
                panLANGLoaded: false,
                panENLoaded: (PhDOE.user.lang === 'en') ? true : false,
                originTitle: FileName,
                defaults: {
                    split: true
                },
                tabTip: String.format(_('File with error : in {0}'), FilePath),
                listeners: {
                    resize: function(panel){
                        (PhDOE.user.lang !== 'en') ? Ext.getCmp('FE-EN-PANEL-' + FileID).setWidth(panel.getWidth() / 2) : '';
                    }
                },
                items: [{
                    xtype: 'panel',
                    id: 'FE-error-desc-' + FileID,
                    region: 'north',
                    layout: 'fit',
                    title: _('Error description'),
                    iconCls: 'iconFilesError',
                    collapsedIconCls: 'iconFilesError',
                    plugins: [Ext.ux.PanelCollapsedTitle],
                    height: PhDOE.user.conf.error.descPanelHeight || 150,
                    collapsible: true,
                    collapsed: !PhDOE.user.conf.error.descPanelDisplay,
                    autoScroll: true,
                    autoLoad: './error?dir=' + FilePath +
                    '&file=' +
                    FileName,
                    listeners: {
                        collapse: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'descPanelDisplay',
                                    value: false
                                });
                            }
                        },
                        expand: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'descPanelDisplay',
                                    value: true
                                });
                            }
                        },
                        resize: function(a, b, newHeight){
                        
                            if (this.ownerCt.tabLoaded && newHeight && newHeight > 50 && newHeight != PhDOE.user.conf.error.descPanelHeight) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    module     : 'error',
                                    itemName   : 'descPanelHeight',
                                    value: newHeight
                                });
                            }
                        }
                    }
                }, {
                    region: 'west',
                    xtype: 'panel',
                    title: _('Tools'),
                    iconCls: 'iconConf',
                    collapsedIconCls: 'iconConf',
                    plugins: [Ext.ux.PanelCollapsedTitle],
                    collapsible: true,
                    collapsed: !PhDOE.user.conf.error.toolsPanelDisplay,
                    layout: 'fit',
                    bodyBorder: false,
                    width: PhDOE.user.conf.error.toolsPanelWidth || 375,
                    listeners: {
                        collapse: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelDisplay',
                                    value: false
                                });
                            }
                        },
                        expand: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelDisplay',
                                    value: true
                                });
                            }
                        },
                        resize: function(a, newWidth){
                            if (this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.user.conf.error.toolsPanelWidth) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    module     : 'error',
                                    itemName   : 'toolsPanelWidth',
                                    value: newWidth
                                });
                            }
                        }
                    },
                    items: {
                        xtype: 'tabpanel',
                        activeTab: 0,
                        tabPosition: 'bottom',
                        enableTabScroll: true,
                        defaults: {
                            autoScroll: true
                        },
                        items: [vcsPanel, new ui.cmp.DictionaryGrid({
                            layout: 'fit',
                            title: _('Dictionary'),
                            prefix: 'FE',
                            fid: FileID
                        }), {
                            title: _('Entities'),
                            layout: 'fit',
                            items: [new ui.cmp.EntitiesAcronymsPanel({
                                dataType: 'entities',
                                prefix: 'FE',
                                ftype: 'LANG',
                                fid: FileID,
                                loadStore: PhDOE.user.conf.error.toolsPanelEntitiesLoad
                            })]
                        }, {
                            title: _('Acronyms'),
                            layout: 'fit',
                            items: [new ui.cmp.EntitiesAcronymsPanel({
                                dataType: 'acronyms',
                                prefix: 'FE',
                                ftype: 'LANG',
                                fid: FileID,
                                loadStore: PhDOE.user.conf.error.toolsPanelAcronymsLoad
                            })]
                        }]
                    }
                }, filePanel]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FE-' + FileID);
    },
    
    initComponent: function(){
        Ext.apply(this, {
            store: ui.cmp._ErrorFileGrid.store,
            tbar: [_('Filter: '), ' ', new Ext.form.TwinTriggerField({
                id: 'FE-filter',
                width: 180,
                hideTrigger1: true,
                enableKeyEvents: true,
                
                validateOnBlur: false,
                validationEvent: false,
                
                trigger1Class: 'x-form-clear-trigger',
                trigger2Class: 'x-form-search-trigger',
                
                listeners: {
                    keypress: function(f, e){
                        if (e.getKey() === e.ENTER) {
                            this.onTrigger2Click();
                        }
                    }
                },
                onTrigger1Click: function(){
                    this.setValue('');
                    this.triggers[0].hide();
                    this.setSize(180, 10);
                    ui.cmp._ErrorFileGrid.instance.store.clearFilter();
                },
                onTrigger2Click: function(){
                    var v = this.getValue(), regexp;
                    
                    if (v === '' || v.length < 3) {
                        this.markInvalid(_('Your filter must contain at least 3 characters'));
                        return;
                    }
                    this.clearInvalid();
                    this.triggers[0].show();
                    this.setSize(180, 10);
                    
                    regexp = new RegExp(v, 'i');
                    
                    // We filter on 'path', 'name', 'maintainer' and 'type'
                    ui.cmp._ErrorFileGrid.instance.store.filterBy(function(record){
                    
                        if (regexp.test(record.data.path) ||
                        regexp.test(record.data.name) ||
                        regexp.test(record.data.maintainer) ||
                        regexp.test(record.data.type)) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }, this);
                }
            })]
        });
        ui.cmp.ErrorFileGrid.superclass.initComponent.call(this);
        
        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick', this.onRowDblClick, this);
        
        // For EN, we hide the column 'maintainer'
        if (PhDOE.user.lang === 'en') {
            this.getColumnModel().setHidden(2, true);
        }
        
    }
});

// singleton
ui.cmp._ErrorFileGrid.instance = null;
ui.cmp.ErrorFileGrid.getInstance = function(config){
    if (!ui.cmp._ErrorFileGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._ErrorFileGrid.instance = new ui.cmp.ErrorFileGrid(config);
    }
    return ui.cmp._ErrorFileGrid.instance;
};
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
Ext.namespace('ui','ui.cmp','ui.cmp._FilePanel');

//------------------------------------------------------------------------------
// FilePanel internals
Ext.namespace('ui.cmp._FilePanel.tbar.menu');
Ext.namespace('ui.cmp._FilePanel.tbar.items');

// FilePanel editor indo/redo items
ui.cmp._FilePanel.tbar.items.undoRedo = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.items.undoRedo.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.items.undoRedo, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {

            id    : this.id_prefix + '-FILE-' + this.fid + '-grp-undoRedo',
            items : [{
                id      : this.id_prefix + '-FILE-' + this.fid + '-btn-undo',
                scope   : this,
                tooltip : _('<b>Undo</b>'),
                disabled: true,
                iconCls : 'iconUndo',
                handler : function()
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).undo(this.id_prefix, this.fid);
                }
            },{
                id      : this.id_prefix + '-FILE-' + this.fid + '-btn-redo',
                scope   : this,
                tooltip : _('<b>Redo</b>'),
                disabled: true,
                iconCls : 'iconRedo',
                handler : function()
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).redo(this.id_prefix, this.fid);
                }
            }]
        });
    }
});


// FilePanel editor user notes item
ui.cmp._FilePanel.tbar.items.usernotes = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.items.usernotes.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.items.usernotes, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype: 'usernotes',
                file : this.file,
                fid  : Ext.id()
            }]
        });
    }
});


// FilePanel editor commun items
ui.cmp._FilePanel.tbar.items.common = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.items.common.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.items.common, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                tooltip : _('Close Tab'),
                iconCls : 'iconClose',
                handler : function()
                {
                    Ext.getCmp('main-panel').remove(this.prefix + '-' + this.fid);
                }
            },{
                id      : this.prefix + '-' + this.fid + '-btn-tabLeft-' + this.ftype,
                scope   : this,
                tooltip : _('Go to previous tab'),
                iconCls : 'iconArrowLeft',
                handler : this.goToPreviousTab
            },{
                id      : this.prefix + '-' + this.fid + '-btn-tabRight-' + this.ftype,
                scope   : this,
                tooltip : _('Go to next tab'),
                disabled: true,
                iconCls : 'iconArrowRight',
                handler : this.goToNextTab
            }]
        });
    }
});

// FilePanel editor menu for LangFile
ui.cmp._FilePanel.tbar.menu.lang = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.menu.lang.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.menu.lang, Ext.Toolbar.Button,
{
    text    : _('MarkUp'),
    iconCls : 'iconInsertCode',
    init    : function()
    {
        Ext.apply(this,
        {
            menu : new Ext.menu.Menu({
                items : [{
                    scope   : this,
                    text    : _('Reviewed tag'),
                    handler : function()
                    {
                        Ext.getCmp(this.comp_id).insertIntoLine(
                            2, 'end', "\n<!-- Reviewed: no -->"
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Revcheck tag'),
                    handler : function()
                    {
                        Ext.getCmp(this.comp_id).insertIntoLine(
                            2, "end",
                            "\n<!-- EN-Revision: XX Maintainer: " +
                            PhDOE.user.login + " Status: ready -->"
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }]
            })
        });
    }
});

// FilePanel editor menu for ENFile
ui.cmp._FilePanel.tbar.menu.en = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.menu.en.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.menu.en, Ext.Toolbar.Button,
{
    text    : _('MarkUp'),
    iconCls : 'iconInsertCode',
    init    : function()
    {
        Ext.apply(this,
        {
            menu : new Ext.menu.Menu({
                items : [{
                    scope   : this,
                    text    : _('Description section'),
                    handler : function()
                    {
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
                            [
                            " <refsect1 role=\"description\"><!-- {{{ -->\r\n  ",
                            "&reftitle.description;\r\n  ",
                            "<methodsynopsis>\r\n   ",
                            "<!-- Example: All functions have this -->\r\n   ",
                            "<type>thereturned type</type><methodname>func_name</methodname>\r\n   ",
                            "<!-- Example: Required parameter -->\r\n   ",
                            "<methodparam><type>param1type</type><parameter>firstparameter</parameter></methodparam>\r\n   ",
                            "<!-- Example: Optional parameter, also by reference -->\r\n   ",
                            "<methodparam choice=\"opt\"><type>int</type><parameter role=\"reference\">secondparameter</parameter></methodparam>\r\n   ",
                            "<!-- Example: If no methodparams exist (void), use this -->\r\n   ",
                            "<void />\r\n  ",
                            "</methodsynopsis>\r\n  ",
                            "<para>\r\n   ",
                            "The function description goes here.\r\n  ",
                            "</para>\r\n ",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Parameters section'),
                    handler : function()
                    {
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
                            [
                            "\r\n<refsect1 role=\"parameters\"><!-- {{{ -->\r\n",
                            "&reftitle.parameters;\r\n",
                            "<para>\r\n",
                            "<variablelist>\r\n",
                            "<varlistentry>\r\n",
                            "<term><parameter>firstparameter</parameter></term>\r\n",
                            "<listitem>\r\n",
                            "<para>\r\n",
                            "Its description\r\n",
                            "</para>\r\n",
                            "</listitem>\r\n",
                            "</varlistentry>\r\n",
                            "<varlistentry>\r\n",
                            "<term>\r\n",
                            "<parameter>secondparameter</parameter>\r\n",
                            "</term>\r\n",
                            "<listitem>\r\n",
                            "<para>\r\n",
                            "Its description\r\n",
                            "</para>\r\n",
                            "</listitem>\r\n",
                            "</varlistentry>\r\n",
                            "</variablelist>\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Return section'),
                    handler : function()
                    {
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
                            [
                            "\r\n<refsect1 role=\"returnvalues\"><!-- {{{ -->\r\n",
                            "&reftitle.returnvalues;\r\n",
                            "<para>\r\n",
                            "What this function returns, first on success, then failure.\r\n",
                            "If simply true on success and false on failure, just use &return.success; here.\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Error section'),
                    handler : function()
                    {
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
                            [
                            "\r\n<refsect1 role=\"errors\"><!-- {{{ -->\r\n",
                            "&reftitle.errors;\r\n",
                            "<para>\r\n",
                            "When does this function issue E_* level errors, and/or throw exceptions.\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->\r\n"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Unicode section'),
                    handler : function()
                    {
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
                            [
                            "\r\n<refsect1 role=\"unicode\"><!-- {{{ -->\r\n",
                            "&reftitle.unicode;\r\n",
                            "<para>\r\n",
                            "Information specific to unicode, from the PHP 6 changes.\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Changelog section'),
                    handler : function()
                    {
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
                            [
                            "\r\n<refsect1 role=\"changelog\"><!-- {{{ -->\r\n",
                            "&reftitle.changelog;\r\n",
                            "<para>\r\n",
                            "<informaltable>\r\n",
                            "<tgroup cols=\"2\">\r\n",
                            "<thead>\r\n",
                            "<row>\r\n",
                            "<entry>&Version;</entry>\r\n",
                            "<entry>&Description;</entry>\r\n",
                            "</row>\r\n",
                            "</thead>\r\n",
                            "<tbody>\r\n",
                            "<row>\r\n",
                            "<entry>Enter the version of change here</entry>\r\n",
                            "<entry>\r\n",
                            "Describe the change\r\n",
                            "</entry>\r\n",
                            "</row>\r\n",
                            "</tbody>\r\n",
                            "</tgroup>\r\n",
                            "</informaltable>\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Examples section'),
                    handler : function()
                    {
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
                            [
                            "\r\n<refsect1 role=\"examples\"><!-- {{{ -->\r\n",
                            "&reftitle.examples;\r\n",
                            "<para>\r\n",
                            "<example xml:id=\"function-name.example.basic\"><!-- {{{ -->\r\n",
                            "<title><function>function-name</function> example</title>\r\n",
                            "<para>\r\n",
                            "Any text that describes the purpose of the example, or what\r\n",
                            "goes on in the example should be here. (Inside the <example> tag, not out).\r\n",
                            "</para>\r\n",
                            "<programlisting role=\"php\">\r\n",
                            "<![CDATA[\r\n",
                            "<?php\r\n",
                            "if ($anexample === true) {\r\n",
                            "echo 'Use the PEAR Coding standards';\r\n",
                            "}\r\n",
                            "if ($thereisoutput === 'and it is multiple lines') {\r\n",
                            "echo 'Use a screen like we did below';\r\n",
                            "}\r\n",
                            "?>\r\n",
                            "]]>\r\n",
                            "</programlisting>\r\n",
                            "&example.outputs.similar;\r\n",
                            "<screen>\r\n",
                            "<![CDATA[\r\n",
                            "Use the PEAR Coding standards\r\n",
                            "Use a screen like we did below\r\n",
                            "]]>\r\n",
                            "</screen>\r\n",
                            "</example><!-- }}} -->\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Notes section'),
                    handler : function()
                    {
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
                            [
                            "\r\n<refsect1 role=\"notes\"><!-- {{{ -->\r\n",
                            "&reftitle.notes;\r\n",
                            "<caution>\r\n",
                            "<para>\r\n",
                            "Any notes that don't fit anywhere else should go here.\r\n",
                            "90% of the time, notes, warnings or cautions are better placed in the\r\n",
                            "parameters section. Consider that before using this section!\r\n",
                            "</para>\r\n",
                            "</caution>\r\n",
                            "&note.language-construct;\r\n",
                            "&note.not-bin-safe;\r\n",
                            "&note.registerglobals;\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('SeeAlso section'),
                    handler : function()
                    {
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
                            [
                            "\r\n<refsect1 role=\"seealso\"><!-- {{{ -->\r\n",
                            "&reftitle.seealso;\r\n",
                            "<para>\r\n",
                            "<simplelist>\r\n",
                            "<member><function>somefunc</function></member>\r\n",
                            "<member><function>another_func</function></member>\r\n",
                            "<member>The <link linkend=\"something\">something appendix</link></member>\r\n",
                            "</simplelist>\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }]
            })
        });
    }
});

// FilePanel editor reindent item & tags menu
ui.cmp._FilePanel.tbar.items.reindentTags = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.items.reindentTags.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.items.reindentTags, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {
            id    : this.id_prefix + '-FILE-' + this.fid + '-grp-tools',
            items : [{
                scope        : this,
                tooltip      : _('<b>Check</b> XML with XmlLint'),
                iconCls      : 'iconXml',
                handler      : function(btn)
                {
                    new ui.task.CheckXml({
                        idPrefix : this.id_prefix,
                        fid      : this.fid
                    });
                }
            },{
                scope        : this,
                tooltip      : _('<b>Enable / Disable</b> spellChecking'),
                enableToggle : true,
                iconCls      : 'iconSpellCheck',
                pressed      : PhDOE.user.conf[this.spellCheckConf],
                handler      : function(btn)
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).setSpellcheck(btn.pressed);

                    new ui.task.UpdateConfTask({
                        module    : this.spellCheckConf.module,
                        itemName  : this.spellCheckConf.itemName,
                        value     : btn.pressed,
                        notify    : false
                    });
                    
                }
            },{
                scope   : this,
                tooltip : _('<b>Re-indent</b> all this file'),
                iconCls : 'iconIndent',
                handler : function()
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).reIndentAll();
                }
            },(this.lang === 'en') ? new ui.cmp._FilePanel.tbar.menu.en({
                comp_id : this.id_prefix + '-FILE-' + this.fid
            }) :
            new ui.cmp._FilePanel.tbar.menu.lang({
                comp_id : this.id_prefix + '-FILE-' + this.fid
            })
            ]
        });
    }
});

//------------------------------------------------------------------------------
// FilePanel
// config - {
//    id, title, prefix, ftype {'EN' | 'LANG'},
//    fid, fpath, fname, lang,
//    readOnly,                    indicate this file is readonly
//    isTrans                      pendingTranslate file config
//    isPatch, fuid,               pending patch file config // TODO: obsolète. Inutile de fournir une interface spécifique pour les patchs
//    parser, storeRecord,
//    syncScrollCB {true | false}, display sync-scroll checkbox
//    syncScroll {true | false},   indicate whether sync the scroll with corresponding file
//    syncScrollConf               syncScrollConf attribute name in userConf
//    spellCheck {true | false},   indicate whether spellCheck is enable or not
//    spellCheckConf               spellCheckConf attribute name in userConf
// }
ui.cmp.FilePanel = Ext.extend(Ext.form.FormPanel,
{
    activeScroll : false,  // scroll lock

    goToPreviousTab : function()
    {
        var currentTabId = this.prefix+'-'+this.fid,
            tabs         = Ext.getCmp('main-panel').layout.container.items.items,
            previousTabId, currentTabIndex, i;

        for( i=0; i < tabs.length; i++ ) {
            if( tabs[i].id === currentTabId ) {
                currentTabIndex = i;
            }
        }

        // What's the ID of the previous tab ? There is always the first tab, with id's MainInfoTabPanel
        // If currentTabIndex is 1, the previous is always MainInfoTabPanel, so we don't compute it
        if( currentTabIndex === 1 ) {
            previousTabId = 'MainInfoTabPanel';
        } else {
            previousTabId = tabs[currentTabIndex - 1].id;
        }

        // We go to the previous
        Ext.getCmp('main-panel').setActiveTab(previousTabId);
    },

    goToNextTab : function()
    {
        var currentTabId = this.prefix+'-'+this.fid,
            tabs         = Ext.getCmp('main-panel').layout.container.items.items,
            nextTabId    = false, currentTabIndex, i;

        for( i=0; i < tabs.length; i++ ) {
            if( tabs[i].id === currentTabId ) {
                currentTabIndex = i;
            }
        }

        // What's the ID of the next tab ?
        if( tabs[currentTabIndex + 1] ) {
            // We go to the previous
            nextTabId = tabs[currentTabIndex + 1].id;
            Ext.getCmp('main-panel').setActiveTab(nextTabId);
        }
    },

    initComponent : function()
    {
        var id_prefix = this.prefix + '-' + this.ftype;

        this.bbar = (this.syncScrollCB) ? [{
            height    : 22,
            xtype     : 'checkbox',
            name      : 'syncScrollConf.module',
            hideLabel : true,
            checked   : PhDOE.user.conf[this.syncScrollConf.module][this.syncScrollConf.itemName],
            boxLabel  : _('Synchronize scroll bars'),
            listeners : {
                scope : this,
                check : function(c)
                {
                    new ui.task.UpdateConfTask({
                        module   : this.syncScrollConf.module,
                        itemName : this.syncScrollConf.itemName,
                        value    : c.getValue(),
                        notify   : false
                    });
                },
                render : function(c)
                {
                    Ext.DomHelper.insertHtml(
                        'beforeBegin', c.el.dom,
                        [
                        '<div style="display: inline;" class="x-statusbar">',
                        '<span class="x-status-text-panel">', _('Line: '),
                        '<span id="', id_prefix, '-status-line-', this.fid, '">-</span></span>',
                        '&nbsp;&nbsp;<span class="x-status-text-panel">', _('Col: '),
                        '<span id="', id_prefix, '-status-col-', this.fid, '">-</span></span>',
                        '</div>&nbsp;&nbsp;'
                        ].join('')
                        );
                }
            }
        }] : [{
            xtype     : 'panel',
            height    : 22,
            baseCls   : '',
            bodyStyle : 'padding-top:5px;',
            html      : [
                '<div style="display: inline;" class="x-statusbar">',
                '<span class="x-status-text-panel">', _('Line: '),
                '<span id="', id_prefix, '-status-line-', this.fid, '">-</span></span>',
                '&nbsp;&nbsp;<span class="x-status-text-panel">', _('Col: '),
                '<span id="', id_prefix, '-status-col-', this.fid, '">-</span></span>',
                '</div>&nbsp;&nbsp;'
            ].join('')
        }];

        if (!this.readOnly) {

            // Tbar definition
            // en/lang file panel tbar
            this.tbar = [
            new ui.cmp._FilePanel.tbar.items.common({
                prefix          : this.prefix,
                fid             : this.fid,
                ftype           : this.ftype,
                goToPreviousTab : this.goToPreviousTab,
                goToNextTab     : this.goToNextTab
            }), {
                xtype : 'buttongroup',
                id    : id_prefix + '-FILE-' + this.fid + '-grp-save',
                items : [{
                    id       : id_prefix + '-FILE-' + this.fid + '-btn-save',
                    scope    : this,
                    tooltip  : _('<b>Save</b> this file (CTRL+s)'),
                    iconCls  : 'iconSaveFile',
                    disabled : true,
                    handler  : function()
                    {
                        // From "All files" or "Need translate file", we only save the file
                        if (this.prefix === 'AF') {
                            new ui.task.SaveFileTask({
                                prefix      : this.prefix,
                                ftype       : this.ftype,
                                fid         : this.fid,
                                fpath       : this.fpath,
                                fname       : this.fname,
                                lang        : this.lang,
                                storeRecord : this.storeRecord
                            });
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                            return;
                        }
                        if (this.prefix === 'FNT' ) {
                            new ui.task.SaveTransFileTask({
                                prefix      : this.prefix,
                                ftype       : this.ftype,
                                fid         : this.fid,
                                fpath       : this.fpath,
                                fname       : this.fname,
                                lang        : this.lang,
                                storeRecord : this.storeRecord
                            });
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                            return;
                        }

                        // We check the conf option : onSaveFile. Can be : ask-me, always or never
                        if( !PhDOE.user.conf.main.onSaveFile ) {
                            PhDOE.user.conf.main.onSaveFile = 'ask-me';
                        }

                        switch (PhDOE.user.conf.main.onSaveFile) {

                            case 'always':
                                new ui.task.CheckFileTask({
                                    prefix      : this.prefix,
                                    ftype       : this.ftype,
                                    fid         : this.fid,
                                    fpath       : this.fpath,
                                    fname       : this.fname,
                                    lang        : this.lang,
                                    storeRecord : this.storeRecord
                                }); // include SaveFileTask when no err
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                                break;

                            case 'never':
                                new ui.task.SaveFileTask({
                                    prefix      : this.prefix,
                                    ftype       : this.ftype,
                                    fid         : this.fid,
                                    fpath       : this.fpath,
                                    fname       : this.fname,
                                    lang        : this.lang,
                                    storeRecord : this.storeRecord
                                });
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                                break;

                            case 'ask-me':
                                Ext.MessageBox.show({
                                    title   : _('Confirm'),
                                    msg     : _('Do you want to check for errors before saving?'),
                                    icon    : Ext.MessageBox.INFO,
                                    buttons : Ext.MessageBox.YESNOCANCEL,
                                    scope   : this,
                                    fn      : function (btn)
                                    {
                                        if (btn === 'no') {

                                            new ui.task.SaveFileTask({
                                                prefix      : this.prefix,
                                                ftype       : this.ftype,
                                                fid         : this.fid,
                                                fpath       : this.fpath,
                                                fname       : this.fname,
                                                lang        : this.lang,
                                                storeRecord : this.storeRecord
                                            });
                                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();

                                        } else if (btn === 'yes') {

                                            new ui.task.CheckFileTask({
                                                prefix      : this.prefix,
                                                ftype       : this.ftype,
                                                fid         : this.fid,
                                                fpath       : this.fpath,
                                                fname       : this.fname,
                                                lang        : this.lang,
                                                storeRecord : this.storeRecord
                                            }); // include SaveFileTask when no err
                                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                                        }
                                    }
                                });
                                break;
                        }
                    }
                }]
            }, new ui.cmp._FilePanel.tbar.items.undoRedo({
                id_prefix : id_prefix,
                fid       : this.fid
            }),
            new ui.cmp._FilePanel.tbar.items.reindentTags({
                id_prefix      : id_prefix,
                fid            : this.fid,
                lang           : this.lang,
                spellCheck     : this.spellCheck,
                spellCheckConf : this.spellCheckConf
            }), '->',
            new ui.cmp._FilePanel.tbar.items.usernotes({
                fid : this.fid,
                file: this.lang + this.fpath + this.fname
            })
            ];
        } else {
            this.tbar = [
                new ui.cmp._FilePanel.tbar.items.common({
                    prefix          : this.prefix,
                    fid             : this.fid,
                    ftype           : this.ftype,
                    goToPreviousTab : this.goToPreviousTab,
                    goToNextTab     : this.goToNextTab
                }), '->', (( this.ftype !== 'GGTRANS' ) ?
                            new ui.cmp._FilePanel.tbar.items.usernotes({
                                fid : this.fid,
                                file: this.lang + this.fpath + this.fname
                            })
                            : '' )
            ];
        }

        Ext.apply(this,
        {
            title       : this.title,
            cls         : 'code-mirror-panel',
            originTitle : this.title,
            items       : [{
                xtype      : 'codemirror',
                id         : id_prefix + '-FILE-' + this.fid,
                readOnly   : this.readOnly,
                parser     : this.parser,
                spellCheck : this.spellCheck,
                isModified : false,
                listeners  : {
                    scope      : this,
                    initialize : function()
                    {
                        var herePath, hereName;

                        if ( this.isTrans )
                        {
                            if( this.storeRecord.data.fileModified )
                            {
                                herePath = this.lang + this.fpath;
                                hereName = this.fname;
                            } else {
                                herePath = 'en' + this.fpath;
                                hereName = this.fname;
                            }
                        } else {
                            herePath = this.lang + this.fpath;
                            hereName = this.fname;
                        }

                        new ui.task.GetFileTask({
                            prefix   : this.prefix,
                            ftype    : this.ftype,
                            fid      : this.fid,
                            fpath    : herePath,
                            freadOnly: this.readOnly,
                            fname    : hereName,
                            skeleton : this.skeleton,
                            storeRecord: this.storeRecord
                        });
                    },

                    coderestored : function()
                    {
                        // This should never occurs on readOnly file
                        if( this.readOnly ) {
                            return;
                        }

                        if ( Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified ) {
                            // Remove [modified] in title
                            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).permlink +
                                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle
                                );

                            // Do we need to remove the red mark into the Tab title ?
                            if(
                                ( this.ftype === 'LANG' && PhDOE.user.lang !== 'en' )
                                ||
                                this.ftype === 'EN'
                            ) {

                                if( (this.ftype === 'EN'   && !Ext.getCmp(this.prefix + '-LANG-FILE-' + this.fid).isModified ) ||
                                    (this.ftype === 'LANG' && !Ext.getCmp(this.prefix + '-EN-FILE-'   + this.fid).isModified ) ) {

                                    Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                                        Ext.getCmp(this.prefix + '-' + this.fid).originTitle
                                    );
                                }
                            } else {
                                Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                                    Ext.getCmp(this.prefix + '-' + this.fid).originTitle
                                );
                            }

                            // Desactivate save button
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').disable();

                            // Mark as modified
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
                        }
                    },

                    codemodified : function()
                    {
                        // This should never occurs on readOnly file
                        if( this.readOnly ) {
                            return;
                        }
						
						// We follow the same rules as defined in GetFileTask.js.
						// So, if the toolsBar is disabled here, we just skeep this function and return asap.
						if( Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-grp-save').disabled ) {
							return;
						}
						
                        var cmpFile  = Ext.getCmp(id_prefix + '-FILE-' + this.fid),
                            cmpPanel = Ext.getCmp(id_prefix + '-PANEL-' + this.fid);

                        if ( !cmpFile.isModified )
                        {
                            // Add an [modified] in title
                            cmpPanel.setTitle(
                                cmpPanel.permlink    +
                                cmpPanel.originTitle +
                                ' <span style="color:#ff0000; font-weight: bold;">[' + _('modified') + ']</span>'
                            );

                            // Add in tabpanel
                            Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                                Ext.getCmp(this.prefix + '-' + this.fid).originTitle +
                                ' <t style="color:#ff0000; font-weight: bold;">*</t>'
                            );

                            // Activate save button
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').enable();

                            // Enable the undo btn
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-undo').enable();

                            // Mark as modified
                            cmpFile.isModified = true;
                        }
                    },

                    cursormove : function(line, caracter)
                    {
                        Ext.get(id_prefix + '-status-line-' + this.fid).dom.innerHTML = line;
                        Ext.get(id_prefix + '-status-col-'  + this.fid).dom.innerHTML = caracter;
                    },

                    scroll : function(scrollY)
                    {
                        var opp_prefix, opp_panel, opp_file;

                        if( this.syncScroll && PhDOE.user.conf[this.syncScrollConf.module][this.syncScrollConf.itemName] )
                        {
                            switch (this.ftype) {
                                case 'EN':
                                    opp_prefix = this.prefix + '-LANG';
                                    break;
                                case 'LANG':
                                    opp_prefix = this.prefix + '-EN';
                                    break;
                                case 'TRANS':
                                    opp_prefix = this.prefix + '-GGTRANS';
                                    break;
                                case 'GGTRANS':
                                    opp_prefix = this.prefix + '-TRANS';
                                    break;
                            }

                            opp_panel = Ext.getCmp(opp_prefix + '-PANEL-' + this.fid);
                            opp_file  = Ext.getCmp(opp_prefix + '-FILE-'  + this.fid);

                            // scroll lock logic:
                            // 1. panel-A gains lock if panel-B is not scrolling
                            // 2. panel-B cannot gain lock to scoll as panel-A gained
                            // 3. panel-B force panel-A to release the lock
                            // 4. So.. scrolling won't be propagated
                            // 5. if panel-A/panel-B scroll again, lock can be gained
                            if (opp_panel.activeScroll === false) {
                                this.activeScroll = true;   // gain scroll lock
                                opp_file.scrollTo(scrollY);
                            } else {
                                opp_panel.activeScroll = false; // force release opponent's scroll lock
                            }
                        }
                    }
                }
            }]
        });
        ui.cmp.FilePanel.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp');

//------------------------------------------------------------------------------
// GoogleTranslationPanel
ui.cmp.GoogleTranslationPanel = Ext.extend(Ext.FormPanel,
{
    border     : false,
    labelAlign : 'top',
    bodyStyle  : 'padding:5px',
    autoScroll : true,

    getTranslation : function(str)
    {
        new ui.task.GetGGTranslation({
            str : str
        });

    },

    initComponent : function()
    {
        Ext.apply(this, {
            items:[{
                xtype      : 'textarea',
                anchor     : '90%',
                fieldLabel : String.format(_('String to translate (en => {0})'), PhDOE.user.lang),
                name       : 'GGTranslate-string',
                id         : 'GGTranslate-string',
                allowBlank : false
            },{
                scope   : this,
                xtype   : 'button',
                text    : _('Translate !'),
                id      : 'GGTranslate-btn',
                handler : function() {
                    this.getTranslation(Ext.getCmp('GGTranslate-string').getValue());
                }
            },{
                xtype     : 'panel',
                anchor    : '100%',
                border    : false,
                bodyStyle :'padding:5px',
                html      : '<div id="GGTranslate-result" style="width: 90%; font: 12px tahoma,arial,sans-serif"></div>'
            }]
        });
        ui.cmp.GoogleTranslationPanel.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._MainMenu');

ui.cmp.MainMenu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp.MainMenu.superclass.constructor.call(this);
};


// Load all available language
ui.cmp._MainMenu.store = new Ext.data.Store({
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

ui.cmp._MainMenu.store.on('load', function(store)
{
    // We put the lang libel into Info-Language
    Ext.getDom('Info-Language').innerHTML = store.getById(PhDOE.user.lang).data.name;

    store.each(function(record) {

        var tmp = new Ext.menu.Item({
            text    : record.data.name + ' (' + record.data.code + ')',
            iconCls : 'mainMenuLang flags ' + record.data.iconCls,
            disabled: (record.data.code === PhDOE.user.lang),
            handler : function() {
                
                XHR({
                    params  : { task : 'switchLang', lang: record.data.code },
                    success : function()
                    {
                        window.location.reload();
                    }
                });
            }
        });

        Ext.getCmp('MenuLang-ct').add(tmp);
    });

}, this);

Ext.extend(ui.cmp.MainMenu, Ext.menu.Menu,
{
    id : 'mainMenu',
    init : function()
    {
        var MenuLang = new Ext.menu.Menu({id: 'MenuLang-ct'});

        Ext.apply(this,
        {
            items: [{
                text     : _('Refresh all data'),
                disabled : (!PhDOE.user.isGlobalAdmin),
                iconCls  : 'iconRefresh',
                tooltip: 'test',
                handler  : function()
                {
                    // We test if there is an update in progress or not
                    Ext.getBody().mask(
                        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                        _('Verify if there is an update in progress. Please, wait...')
                    );

                    XHR({
                        params  : {
                            task      : 'checkLockFile',
                            lockFiles : 'project_' + PhDOE.project + '_lock_update_repository|project_' + PhDOE.project + '_lock_apply_tools'
                        },
                        success : function()
                        {
                            // Remove wait msg
                            Ext.getBody().unmask();
                            Ext.MessageBox.show({
                                title   : _('Status'),
                                msg     : _('There is currently an update in progress.<br/>You can\'t perform an update now.'),
                                buttons : Ext.MessageBox.OK,
                                icon    : Ext.MessageBox.INFO
                            });
                        },
                        failure: function() {
                            Ext.getBody().unmask();
                            new ui.cmp.SystemUpdatePrompt().show(Ext.get('acc-need-update'));
                        }
                    });
                }
            }, {
                text    : _('Build tools'),
                handler : function() { return false; },
                menu    : new Ext.menu.Menu({
                    items : [{
                        text     : _('Check build'),
                        disabled : (PhDOE.user.isAnonymous),
                        iconCls  : 'iconCheckBuild',
                        handler  : function()
                        {
                            // We test if there is a check in progress for this language
                            Ext.getBody().mask(
                                '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                                _('Verify if there is a check in progress. Please, wait...')
                            );

                            XHR({
                                params  :
                                {
                                    task     : 'checkLockFile',
                                    lockFile : 'project_' + PhDOE.project + '_lock_check_build_' + PhDOE.user.lang
                                },
                                success : function()
                                {
                                    // Remove wait msg
                                    Ext.getBody().unmask();

                                    Ext.MessageBox.show({
                                        title   : _('Status'),
                                        msg     : _('There is currently a check in progress for this language.<br/>You can\'t perform a new check now.'),
                                        buttons : Ext.MessageBox.OK,
                                        icon    : Ext.MessageBox.INFO
                                    });
                                },
                                failure : function()
                                {
                                    // Remove wait msg
                                    Ext.getBody().unmask();

                                    new ui.cmp.CheckBuildPrompt().show(
                                        Ext.get('acc-need-update')
                                    );
                                }
                            });
                        }
                    }, {
                        text    : _('Show last failed build'),
                        iconCls : 'iconBuildStatus',
                        handler : function()
                        {
                            var tab = Ext.getCmp('tab-build-status');

                            if (! tab ) {
                                // if tab not exist, create new tab
                                Ext.getCmp('main-panel').add({
                                    id       : 'tab-build-status',
                                    title    : _('Last failed build'),
                                    iconCls  : 'iconBuildStatus',
                                    layout   : 'fit',
                                    closable : true,
                                    items    : [ new ui.cmp.BuildStatus() ]
                                });
                            }

                            Ext.getCmp('main-panel').setActiveTab('tab-build-status');
                        }
                    }]
                })
            }, {
                text    : _('EN tools'),
                handler : function() { return false; },
                menu    : new Ext.menu.Menu({
                    items : [{
                        text    : _('Script check entities'),
                        iconCls : 'iconCheckEntities',
                        handler : function() { return false; },
                        menu    : new Ext.menu.Menu({
                            items   : [{
                                text    : _('View the last result'),
                                id      : 'btn-check-entities-view-last-result',
                                iconCls : 'iconTabView',
                                handler : function()
                                {
                                    var tab = Ext.getCmp('tab-check-entities');

                                    if ( ! tab ) {
                                        // if tab not exist, create new tab
                                        Ext.getCmp('main-panel').add({
                                            id       : 'tab-check-entities',
                                            title    : _('Check entities'),
                                            iconCls  : 'iconCheckEntities',
                                            layout   : 'fit',
                                            closable : true,
                                            items    : [new ui.cmp.CheckEntities()]
                                        });
                                    }
                                    Ext.getCmp('main-panel').setActiveTab('tab-check-entities');
                                }
                            }, {
                                text    : _('Run this script'),
                                iconCls : 'iconRun',
                                disabled: (PhDOE.user.isAnonymous),
                                handler : function()
                                {
                                    // We test if there is a check in progress for this language
                                    Ext.getBody().mask(
                                        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                                        _('Verify if there is an entities check in progress. Please, wait...')
                                    );

                                    XHR({
                                        params :
                                        {
                                            task     : 'checkLockFile',
                                            lockFile : 'project_' + PhDOE.project + '_lock_check_entities'
                                        },
                                        success : function()
                                        {
                                            // Remove wait msg
                                            Ext.getBody().unmask();

                                            Ext.MessageBox.show({
                                                title   : _('Status'),
                                                msg     : _('There is currently a check in progress for the entities.<br/>You can\'t perform a new check now.'),
                                                buttons : Ext.MessageBox.OK,
                                                icon    : Ext.MessageBox.INFO
                                            });
                                        },
                                        failure : function()
                                        {
                                            // Remove wait msg
                                            Ext.getBody().unmask();

                                            if( ! Ext.getCmp('win-check-entities') ) {
                                                new ui.cmp.CheckEntitiesPrompt();
                                            }
                                            Ext.getCmp('win-check-entities').show(Ext.get('mainMenu'));

                                        }
                                    });
                                }
                            }]
                        })
                    }, {
                        text    : _('Script check document'),
                        iconCls : 'iconCheckDoc',
                        handler : function()
                        {
                            var tab = Ext.getCmp('tab-check-doc');

                            if ( ! tab ) {
                                // if tab not exist, create new tab
                                Ext.getCmp('main-panel').add({
                                    id       : 'tab-check-doc',
                                    title    : 'Check Doc',
                                    iconCls  : 'iconCheckDoc',
                                    layout   : 'fit',
                                    closable : true,
                                    items    : [ new ui.cmp.CheckDoc() ]
                                });
                            }
                            Ext.getCmp('main-panel').setActiveTab('tab-check-doc');
                        }
                    }]
                })
            }, '-', {
                text    : _('Configure'),
                iconCls : 'iconConf',
                tooltip : '<b>Configure</b> this tool',
                id      : 'winconf-btn',
                handler : function()
                {
                    if( ! Ext.getCmp('win-conf') ) {
                        new ui.cmp.EditorConf();
                    }
                    Ext.getCmp('win-conf').show(Ext.get('mainMenu'));

                }
            }, '-', {
                id      : 'menuLang',
                iconCls : 'iconSwitchLang',
                text    : _('Switch to language...'),
                handler : function() { return false; },
                menu    : MenuLang
            }, {
                text     : _('Erase my personal data'),
                iconCls  : 'iconErasePersonalData',
                disabled : (PhDOE.user.isAnonymous),
                handler  : function()
                {
                    Ext.MessageBox.confirm(_('Confirm'),
                        _('This action will erase your personal data. All content about this account will be deleted definitively. Are you sure you want to do that ?'),
                        function(btn)
                        {
                            if (btn === 'yes') {
                                Ext.getBody().mask(
                                    '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                                    _('Please, wait...')
                                );

                                XHR({
                                    params  : { task : 'erasePersonalData' },
                                    success : function()
                                    {
                                        Ext.getBody().unmask();

                                        Ext.MessageBox.show({
                                            title   : _('Thanks !'),
                                            msg     : _('Thank you for using this application !'),
                                            icon    : Ext.MessageBox.INFO,
                                            buttons : Ext.MessageBox.OK,
                                            fn      : function()
                                            {
                                                window.location.href = './do/logout';
                                            }
                                        });
                                    },
                                    failure : function()
                                    {
                                        Ext.getBody().unmask();
                                        PhDOE.winForbidden();
                                    }
                                });
                            } // btn yes
                        }
                    );
                }
            }, {
                text    : _('Log out'),
                iconCls : 'iconLogOut',
                handler : function()
                {
                    Ext.MessageBox.confirm(_('Confirm'),
                        _('Are you sure you want to logout?'),
                        function(btn)
                        {
                            if (btn === 'yes') {
                                window.location.href = './do/logout';
                            }
                        }
                    );
                }
            }, '-', {
                id      : 'tab-report-bug-btn',
                text    : _('Report bugs'),
                iconCls : 'iconBugs',
                handler : function()
                {
                    if (!Ext.getCmp('main-panel').findById('tab-report-bug')) {

                        Ext.getCmp('main-panel').add({
                            id         : 'tab-report-bug',
                            xtype      : 'panel',
                            title      : _('Report bugs'),
                            iconCls    : 'iconBugs',
                            closable   : true,
                            layout     : 'fit',
                            items: [ new Ext.ux.IFrameComponent({ id: 'frame-tab-report-bug', url: 'http://bugs.php.net/' }) ]
                        });

                        Ext.getCmp('main-panel').setActiveTab('tab-report-bug');

                    } else {
                        Ext.getCmp('main-panel').setActiveTab('tab-report-bug');
                    }
                }
            }, {
                id      : 'tab-documentation-btn',
                text    : _('Documentation'),
                iconCls : 'iconBook',
                handler : function()
                {
                    if (!Ext.getCmp('main-panel').findById('tab-documentation')) {

                        Ext.getCmp('main-panel').add({
                            id         : 'tab-documentation',
                            xtype      : 'panel',
                            title      : _('Documentation'),
                            iconCls    : 'iconBook',
                            closable   : true,
                            layout     : 'fit',
                            items: [ new Ext.ux.IFrameComponent({ id: 'frame-tab-documentation', url: 'http://wiki.php.net/doc/editor/' }) ]
                        });

                        Ext.getCmp('main-panel').setActiveTab('tab-documentation');

                    } else {
                        Ext.getCmp('main-panel').setActiveTab('tab-documentation');
                    }
                }
            }, '-', {
                id      : 'winabout-btn',
                text    : _('About'),
                iconCls : 'iconHelp',
                handler : function()
                {
                    new ui.cmp.About().show(Ext.get('winabout-btn'));
                }
            }]
        });
    }
});Ext.namespace('ui','ui.cmp','ui.cmp.MainPanel');

ui.cmp.MainPanel = Ext.extend(Ext.ux.SlidingTabPanel, {
    activeTab       : 0,
    enableTabScroll : true,
    plugins         : ['tabclosemenu', 'dblclickclosetabs'],

    initComponent: function(config)
    {
        Ext.apply(this, config);
        ui.cmp.MainPanel.superclass.initComponent.call(this);

        this.addEvents({
            tabLoaded : true
        });

        this.on('beforeremove', this.onBeforeRemove, this);
        this.on('tabchange',    this.onTabChange,    this);
        this.on('endDrag',      this.onTabChange,    this);
        this.on('tabLoaded',    this.onTabLoaded,    this);

    },

    onTabLoaded: function(prefix, fid)
    {
        var cmp = Ext.getCmp(prefix + '-' + fid);

        // FNT panel
        if( prefix === 'FNT' ) {
            if( cmp.panTRANSLoaded && cmp.panGGTRANSLoaded ) {

                cmp.tabLoaded = true;

                cmp.panTRANSLoaded = cmp.panGGTRANSLoaded = false;

                if (PhDOE.FNTfilePendingOpen[0]) {
                    ui.cmp.PendingTranslateGrid.getInstance().openFile(PhDOE.FNTfilePendingOpen[0].id);
                    PhDOE.FNTfilePendingOpen.shift();
                }

            }
        }
        // FNU panel
        if( prefix === 'FNU' ) {
            if( cmp.panLANGLoaded && cmp.panENLoaded && cmp.panDiffLoaded && cmp.panVCSLang && cmp.panVCSEn ) {

                cmp.tabLoaded = true;

                cmp.panLANGLoaded = cmp.panENLoaded = cmp.panDiffLoaded = cmp.panVCSLang = cmp.panVCSEn = false;

                if (PhDOE.FNUfilePendingOpen[0]) {
                    ui.cmp.StaleFileGrid.getInstance().openFile(PhDOE.FNUfilePendingOpen[0].id);
                    PhDOE.FNUfilePendingOpen.shift();
                }
            }
        }
        // FE panel
        if( prefix === 'FE' ) {
            if( cmp.panLANGLoaded && cmp.panENLoaded && cmp.panVCSLang && cmp.panVCSEn ) {

                cmp.tabLoaded = true;
                
                cmp.panLANGLoaded = cmp.panENLoaded = cmp.panVCSLang = cmp.panVCSEn = false;

                if (PhDOE.FEfilePendingOpen[0]) {
                    ui.cmp.ErrorFileGrid.getInstance().openFile(PhDOE.FEfilePendingOpen[0].id);
                    PhDOE.FEfilePendingOpen.shift();
                }
            }
        }
        // FNR panel
        if( prefix === 'FNR' ) {
            if( cmp.panLANGLoaded && cmp.panENLoaded && cmp.panVCSLang && cmp.panVCSEn ) {

                cmp.tabLoaded = true;
                
                cmp.panLANGLoaded = cmp.panENLoaded = cmp.panVCSLang = cmp.panVCSEn = false;

                if (PhDOE.FNRfilePendingOpen[0]) {
                    ui.cmp.PendingReviewGrid.getInstance().openFile(PhDOE.FNRfilePendingOpen[0].id);
                    PhDOE.FNRfilePendingOpen.shift();
                }
            }
        }

        // FNIEN panel
        if( prefix === 'FNIEN' ) {
            if( cmp.panLANGLoaded ) {

                cmp.tabLoaded = true;
                
                cmp.panLANGLoaded = false;
                if (PhDOE.FNIENfilePendingOpen[0]) {
                    ui.cmp.NotInENGrid.getInstance().openFile(PhDOE.FNIENfilePendingOpen[0].id);
                    PhDOE.FNIENfilePendingOpen.shift();
                }
            }
        }

        // AF panel
        if( prefix === 'AF' ) {
            if( cmp.panLoaded && cmp.panVCS && cmp.panEntities && cmp.panAcronyms ) {

                cmp.tabLoaded = true;
                
                cmp.panLoaded = cmp.panVCS = false;
                if (PhDOE.AFfilePendingOpen[0]) {
                    ui.cmp.RepositoryTree.getInstance().openFile(
                    ( PhDOE.AFfilePendingOpen[0].nodeID ) ? 'byId' : 'byPath',
                    ( PhDOE.AFfilePendingOpen[0].nodeID ) ? PhDOE.AFfilePendingOpen[0].nodeID : PhDOE.AFfilePendingOpen[0].fpath,
                    ( PhDOE.AFfilePendingOpen[0].nodeID ) ? false                             : PhDOE.AFfilePendingOpen[0].fname
                );
                    PhDOE.AFfilePendingOpen.shift();
                }
            }
        }

        // PP panel
        if( prefix === 'PP' ) {
            if( cmp.panPatchLoaded && cmp.panOriginLoaded  && cmp.panVCS && cmp.panPatchContent ) {

                cmp.tabLoaded = true;
                
                cmp.panPatchLoaded = cmp.panOriginLoaded  = cmp.panVCS = cmp.panPatchContent = false;
                if (PhDOE.PPfilePendingOpen[0]) {
                    ui.cmp.PendingPatchGrid.getInstance().openFile(PhDOE.PPfilePendingOpen[0].id);
                    PhDOE.PPfilePendingOpen.shift();
                }
            }
        }

    },

    onTabChange : function(panel, tab)
    {
        // We do somethings only if this panel contains a tab's navigation button
        if ( Ext.getCmp(tab.id + '-btn-tabRight-LANG')    ||
             Ext.getCmp(tab.id + '-btn-tabRight-EN')      ||
             Ext.getCmp(tab.id + '-btn-tabRight-ALL')     ||
             Ext.getCmp(tab.id + '-btn-tabRight-NotInEN') ||
             Ext.getCmp(tab.id + '-btn-tabRight-PATCH')   ||
             Ext.getCmp(tab.id + '-btn-tabRight-TRANS')   ||
             Ext.getCmp(tab.id + '-btn-tabRight-NEW')  ) {

            var currentTabId = tab.id,
                tabs         = Ext.getCmp('main-panel').layout.container.items.items,
                currentTabIndex,
                i;

            for( i=0; i < tabs.length; i++ ) {
                if( tabs[i].id === currentTabId ) {
                    currentTabIndex = i;
                }
            }

            // Do we need to activate some button ?
            if( tabs[currentTabIndex + 1] ) {
                if ( Ext.getCmp(tab.id + '-btn-tabRight-LANG'    ) ) { Ext.getCmp(tab.id + '-btn-tabRight-LANG'    ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-EN'      ) ) { Ext.getCmp(tab.id + '-btn-tabRight-EN'      ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-ALL'     ) ) { Ext.getCmp(tab.id + '-btn-tabRight-ALL'     ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-NotInEN' ) ) { Ext.getCmp(tab.id + '-btn-tabRight-NotInEN' ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-PATCH'   ) ) { Ext.getCmp(tab.id + '-btn-tabRight-PATCH'   ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-TRANS'   ) ) { Ext.getCmp(tab.id + '-btn-tabRight-TRANS'   ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-NEW'     ) ) { Ext.getCmp(tab.id + '-btn-tabRight-NEW'     ).enable(); }
            }

        }
    },

    // Need confirm if we want to close a tab and the content have been modified.
    onBeforeRemove : function(tabpanel, tab)
    {
        var stateLang, stateEn, state, PanType = tab.id.split('-');

        if ((PanType[0] === 'FE' || PanType[0] === 'FNU' || PanType[0] === 'FNR' || PanType[0] === 'PP' || PanType[0] === 'AF' || PanType[0] === 'FNT') && PanType[1] !== 'help') {

            if (PanType[0] === 'FE') {
                stateLang = Ext.getCmp('FE-LANG-FILE-' + PanType[1]).isModified;
                stateEn   = ( PhDOE.user.lang === 'en' ) ? false : Ext.getCmp('FE-EN-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'FNU') {
                stateLang = Ext.getCmp('FNU-LANG-FILE-' + PanType[1]).isModified;
                stateEn   = Ext.getCmp('FNU-EN-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'FNR') {
                stateLang = Ext.getCmp('FNR-LANG-FILE-' + PanType[1]).isModified;
                stateEn   = Ext.getCmp('FNR-EN-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'PP') {
                state = Ext.getCmp('PP-PATCH-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'AF') {
                state = Ext.getCmp('AF-ALL-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'FNT') {
                state = (Ext.getCmp('FNT-TRANS-FILE-' + PanType[1])) ? Ext.getCmp('FNT-TRANS-FILE-' + PanType[1]).isModified : Ext.getCmp('FNT-NEW-FILE-' + PanType[1]).isModified ;
            }

            if (stateEn || stateLang || state) {
                Ext.Msg.show({
                    scope   : this,
                    title   : _('Confirm'),
                    msg     : _('This file has been modified without being saved.<br/>Do you really want to close?'),
                    buttons : Ext.Msg.YESNO,
                    icon    : Ext.Msg.QUESTION,
                    fn : function(btn, text)
                    {
                        if (btn === 'yes') {
                            tabpanel.un('beforeremove', this.onBeforeRemove, this);
                            tabpanel.remove(tab);
                            tabpanel.addListener('beforeremove', this.onBeforeRemove, this);
                        }
                    }
                });
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }

    },
    openDiffTab: function(DiffOption)
    {
        var DiffType = DiffOption.DiffType,
            FileName = DiffOption.FileName,
            FilePath = DiffOption.FilePath,
            FileMD5  = Ext.util.md5(FilePath+FileName);
        
        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('diff_panel_' + FileMD5)) {
        
            // Add tab for the diff
            Ext.getCmp('main-panel').add({
                xtype: 'panel',
                id: 'diff_panel_' + FileMD5,
                title: _('Diff'),
                tabTip: String.format(_('Diff for file: {0}'), FilePath + FileName),
                closable: true,
                autoScroll: true,
                iconCls: 'iconTabLink',
                html: '<div id="diff_content_' + FileMD5 + '" class="diff-content"></div>'
            });
            
            // We need to activate HERE this tab, otherwise, we can't mask it (el() is not defined)
            Ext.getCmp('main-panel').setActiveTab('diff_panel_' + FileMD5);
            
            Ext.get('diff_panel_' + FileMD5).mask('<img src="themes/img/loading.gif" ' +
            'style="vertical-align: middle;" />' +
            _('Please, wait...'));
            
            // Load diff data
            XHR({
                params: {
                    task: 'getDiff',
                    DiffType: DiffType,
                    FilePath: FilePath,
                    FileName: FileName
                },
                success: function(r){
                    var o = Ext.util.JSON.decode(r.responseText);
                    
                    // We add the perm link into the content
                    o.content = '<a href="http://' + window.location.host + ':' + window.location.port + window.location.pathname + '?patch='+FilePath+FileName+'&project='+PhDOE.project+'"><h2>'+_('Direct link to this patch')+' ; ' + _('File: ') + FilePath+FileName+'</h2></a>' + o.content;
                    
                    // We display in diff div
                    Ext.get('diff_content_' + FileMD5).dom.innerHTML = o.content;
                    Ext.get('diff_panel_' + FileMD5).unmask();
                }
            });
        }
        else {
            Ext.getCmp('main-panel').setActiveTab('diff_panel_' + FileMD5);
        }
    }
});
Ext.reg('mainpanel', ui.cmp.MainPanel);Ext.namespace('ui','ui.cmp');

//config - { name, email }
ui.cmp.ManagePatchPrompt = Ext.extend(Ext.Window,
{
    title       : '',
    width       : 250,
    height      : 100,
    minWidth    : 250,
    minHeight   : 100,
    layout      : 'fit',
    plain       : true,
    bodyStyle   : 'padding:5px;',
    buttonAlign : 'center',
    iconCls     : 'iconPatch',
    closeAction : 'hide',

    nodesToAdd  : false,
    defaultValue: '',
    patchID     : false,

    buttons     : [{
        text   : _('Create'),
        handler: function()
        {
            var win    = this.ownerCt.ownerCt,
                values = win.findByType('form').shift().getForm().getValues();

            XHR({
                params  : {
                    task    : 'managePatch',
                    name    : values.name,
                    patchID : win.patchID
                },
                success : function(r)
                {
                    var o = Ext.util.JSON.decode(r.responseText);

                    win.hide();

                    // If we want to modify the path name
                    if( win.patchID ) {
                        ui.cmp.PatchesTreeGrid.getInstance().modPatchName({
                            newPatchName : values.name,
                            patchID      : win.patchID
                        });
                    }
					
					// If there is some node to Add, we call this.
					if (win.nodesToAdd) {
						ui.task.MoveToPatch({
							patchID: o.patchID,
							patchName: values.name,
							nodesToAdd: win.nodesToAdd
						});
					}
                }
            });
        }
    }, {
        text    : _('Cancel'),
        handler : function()
        {
            this.ownerCt.ownerCt.hide();
        }
    }],

    initComponent : function()
    {
        Ext.apply(this, {
            items : new Ext.form.FormPanel({
                baseCls     : 'x-plain',
                labelWidth  : 55,
                defaultType : 'textfield',
                items : [{
                    name       : 'name',
                    fieldLabel : _('Name'),
                    anchor     : '100%',
                    value      : this.defaultValue
                }]
            })
        });
        ui.cmp.ManagePatchPrompt.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._NotInENGrid');

//------------------------------------------------------------------------------
// NotInENGrid internals

// NotInENGrid store
ui.cmp._NotInENGrid.store = new Ext.data.GroupingStore(
{
    proxy : new Ext.data.HttpProxy({
        url : './do/getFilesNotInEn'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'path'},
            {name : 'name'},
            {name : 'fileModified'}
        ]
    }),
    sortInfo : {
        field     : 'path',
        direction : 'ASC'
    },
    groupField : 'path',
    listeners  : {
        datachanged : function(ds)
        {
            Ext.getDom('acc-notInEn-nb').innerHTML = ds.getCount();
        }
    }
});

// NotInENGrid columns definition
ui.cmp._NotInENGrid.columns = [{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name',
    renderer  : function(v, m, r)
    {
        if( r.data.fileModified ) {
        
            var info = Ext.util.JSON.decode(r.data.fileModified);
			
            if(info.user === PhDOE.user.login && info.anonymousIdent === PhDOE.user.anonymousIdent) {
                return "<span ext:qtip='" + _('File removed by me') + "'>" + v + "</span>";
            } else {
                return "<span ext:qtip='" + String.format(_('File removed by {0}'), info.user.ucFirst()) + "'>" + v + "</span>";
            }
        } else {
            return v;
        }
    }
}, {
    header    : _('Path'),
    dataIndex : 'path',
    hidden    : true
}];

// NotInENGrid view
ui.cmp._NotInENGrid.view = new Ext.grid.GroupingView({
    forceFit      : true,
    startCollapsed: true,
    groupTextTpl  : '{[values.rs[0].data["path"]]} ' +
                   '({[values.rs.length]} ' +
                   '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    deferEmptyText: false,
    emptyText     : '<div style="text-align: center;">' + _('No Files') + '</div>',
    getRowClass   : function(r)
    {
        if ( r.data.fileModified ) {
        
            var info = Ext.util.JSON.decode(r.data.fileModified);
			
            return (info.user === PhDOE.user.login && info.anonymousIdent === PhDOE.user.anonymousIdent) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
        }
        return false;
    }
});

// NotInENGrid context menu
// config - { grid, rowIdx, event }
ui.cmp._NotInENGrid.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._NotInENGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._NotInENGrid.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                text    : '<b>'+_('View in a new tab')+'</b>',
                iconCls : 'iconView',
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIdx, this.event
                    );
                }
            }, {
                scope   : this,
                text    : _('Remove this file'),
                hidden  : ( this.grid.store.getAt(this.rowIdx).data.fileModified ),
                iconCls : 'iconTrash',
                handler : function()
                {
                   var storeRecord = this.grid.store.getAt(this.rowIdx),
                       FilePath    = storeRecord.data.path,
                       FileName    = storeRecord.data.name;

                   new ui.task.MarkDeleteTask({
                       fpath       : FilePath,
                       fname       : FileName,
                       storeRecord : storeRecord
                   });
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// NotInENGrid
ui.cmp.NotInENGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    border           : false,
    autoExpandColumn : 'name',
    enableDragDrop   : true,
    ddGroup          : 'mainPanelDDGroup',
    view             : ui.cmp._NotInENGrid.view,
    columns          : ui.cmp._NotInENGrid.columns,

    onRowContextMenu : function(grid, rowIndex, e)
    {
        e.stopEvent();
    
        grid.getSelectionModel().selectRow(rowIndex);

        new ui.cmp._NotInENGrid.menu({
            grid   : grid,
            rowIdx : rowIndex,
            event  : e
        }).showAt(e.getXY());
    },

    onRowDblClick: function(grid, rowIndex, e)
    {
        this.openFile(grid.store.getAt(rowIndex).data.id);
    },

    openFile: function(rowId)
    {
        var storeRecord = this.store.getById(rowId),
            FilePath    = storeRecord.data.path,
            FileName    = storeRecord.data.name,
            FileID      = Ext.util.md5('FNIEN-' + PhDOE.user.lang + FilePath + FileName);

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNIEN-' + FileID))
        {
            Ext.getCmp('main-panel').add(
            {
                id             : 'FNIEN-' + FileID,
                layout         : 'border',
                title          : FileName,
                originTitle    : FileName,
                iconCls        : 'iconTabView',
                closable       : true,
                tabLoaded      : false,
                panLANGLoaded  : false, // Use to monitor if the LANG panel is loaded
                defaults       : { split : true },
                tabTip         : String.format(
                    _('Not In EN: in {0}'), FilePath
                ),
                items : [
                   new ui.cmp.FilePanel(
                    {
                        id             : 'FNIEN-NotInEN-PANEL-' + FileID,
                        region         : 'center',
                        title          : _('File: ') + FilePath + FileName,
                        prefix         : 'FNIEN',
                        ftype          : 'NotInEN',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        readOnly       : true,
                        lang           : PhDOE.user.lang,
                        parser         : 'xml',
                        storeRecord    : storeRecord,
                        syncScroll     : false
                    })
                ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNIEN-' + FileID);
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : ui.cmp._NotInENGrid.store
        });
        ui.cmp.NotInENGrid.superclass.initComponent.call(this);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

// singleton
ui.cmp._NotInENGrid.instance = null;
ui.cmp.NotInENGrid.getInstance = function(config)
{
    if (!ui.cmp._NotInENGrid.instance) {
        if (!config) {
           config = {};
        }
        ui.cmp._NotInENGrid.instance = new ui.cmp.NotInENGrid(config);
    }
    return ui.cmp._NotInENGrid.instance;
};Ext.namespace('ui', 'ui.cmp', 'ui.cmp._PatchesTreeGrid', 'ui.cmp._PatchesTreeGrid.menu');

//------------------------------------------------------------------------------
// PatchesTreeGrid internals

// PatchesTreeGrid : context menu for users items
// config - { node }
ui.cmp._PatchesTreeGrid.menu.users = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PatchesTreeGrid.menu.users.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PatchesTreeGrid.menu.users, Ext.menu.Menu, {
    init: function(){
        var allFiles = [];
        
        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder' && node.attributes.type !== 'patch' && node.attributes.type !== 'user') {
                allFiles.push(node);
            }
        }, this);
        
        Ext.apply(this, {
        
            items: [{
                scope: this,
                text: String.format(_('Send an email to {0}'), "<b>" + this.node.attributes.task.ucFirst() + "</b>"),
                iconCls: 'iconSendEmail',
                hidden: (this.node.attributes.task === PhDOE.user.login || this.node.attributes.email === 'false'),
                handler: function(){
                    var win = new ui.cmp.EmailPrompt();
                    
                    win.setData(this.node.attributes.task, this.node.attributes.email);
                    win.show(this.node.el);
                }
            }, {
                text: _('Back all files to work in progress module'),
                hidden: (this.node.attributes.task !== PhDOE.user.login),
                disabled: Ext.isEmpty(allFiles),
                iconCls: 'iconWorkInProgress',
                handler: function(){
                    ui.task.MoveToWork({
                        nodesToAdd: allFiles
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: (this.node.attributes.task !== PhDOE.user.login || PhDOE.user.isAnonymous)
            }, ((this.node.attributes.task === PhDOE.user.login && !PhDOE.user.isAnonymous) ? new ui.cmp._WorkTreeGrid.menu.commit({
                module: 'patches',
                from: 'user',
                node: false,
                folderNode: false,
                patchNode: false,
                userNode: this.node
            }) : '')]
        });
    }
});

// PatchesTreeGrid : context menu for patches items
// config - { node, e }
ui.cmp._PatchesTreeGrid.menu.patches = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PatchesTreeGrid.menu.patches.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PatchesTreeGrid.menu.patches, Ext.menu.Menu, {
    init: function(){
        var node = this.node, allFiles = [],
        currentUser = this.node.parentNode.attributes.task;
        
        // We don't display all of this menu if the current user isn't the owner
        if (currentUser !== PhDOE.user.login && !PhDOE.user.isGlobalAdmin ) {
            return false;
        }
        
        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder' && node.attributes.type !== 'patch' && node.attributes.type !== 'user') {
                allFiles.push(node);
            }
        }, this);
        
        
        Ext.apply(this, {
            items: [{
                text: _('Edit the name of this patch'),
                iconCls: 'iconPendingPatch',
                hidden: (currentUser !== PhDOE.user.login),
                handler: function(){
                    var win = new ui.cmp.ManagePatchPrompt({
                        title: _('Modify this patch name'),
                        defaultValue: node.attributes.task,
                        patchID: node.attributes.idDB
                    });
                    win.show(this.el);
                }
            }, {
                text: _('Delete this patch'),
                iconCls: 'iconTrash',
                hidden: (currentUser !== PhDOE.user.login),
                handler: function(){
                    ui.task.DeletePatchTask({
                        patchID: node.attributes.idDB
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: !((!PhDOE.user.isAnonymous && currentUser === PhDOE.user.login) || !PhDOE.user.isGlobalAdmin)
            }, {
                text: _('Back all this patch to work in progress module'),
                iconCls: 'iconWorkInProgress',
                hidden: (currentUser !== PhDOE.user.login),
                disabled: Ext.isEmpty(allFiles),
                handler: function(){
                    ui.task.MoveToWork({
                        nodesToAdd: allFiles
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: !((!PhDOE.user.isAnonymous && currentUser === PhDOE.user.login) || !PhDOE.user.isGlobalAdmin)
            },
            ((!PhDOE.user.isAnonymous && currentUser === PhDOE.user.login) ?
                new ui.cmp._WorkTreeGrid.menu.commit({
                    module: 'patches',
                    from: 'patch',
                    node: false,
                    folderNode: false,
                    patchNode: this.node,
                    userNode: this.node.parentNode
                }) : ''
            ),
            (( PhDOE.user.isGlobalAdmin ) ? new ui.cmp._WorkTreeGrid.menu.admin({
                from: 'patch',
                node: this.node
            }) : '')
            ]
        });
    }
});

// PatchesTreeGrid : context menu for folders items
// config - { node }
ui.cmp._PatchesTreeGrid.menu.folders = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PatchesTreeGrid.menu.folders.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PatchesTreeGrid.menu.folders, Ext.menu.Menu, {
    init: function(){
        var allFiles = [];
        
        // We don't display all of this menu if the current user isn't the owner
        if (this.node.parentNode.parentNode.attributes.task !== PhDOE.user.login) {
            return false;
        }
        
        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder' && node.attributes.type !== 'patch' && node.attributes.type !== 'user') {
                allFiles.push(node);
            }
        }, this);
        
        Ext.apply(this, {
            items: [{
                text: _('Back all this folder to work in progress module'),
                iconCls: 'iconWorkInProgress',
                handler: function(){
                    ui.task.MoveToWork({
                        nodesToAdd: allFiles
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: (PhDOE.user.isAnonymous)
            }, 
            ((!PhDOE.user.isAnonymous) ?
                new ui.cmp._WorkTreeGrid.menu.commit({
                    module: 'patches',
                    from: 'folder',
                    node: false,
                    folderNode: this.node,
                    patchNode: this.node.parentNode,
                    userNode: this.node.parentNode.parentNode
                }) : ''
            )]
        });
    }
});

// PatchesTreeGrid : context menu for files items
// config - { node }
ui.cmp._PatchesTreeGrid.menu.files = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PatchesTreeGrid.menu.files.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PatchesTreeGrid.menu.files, Ext.menu.Menu, {
    init: function(){
        var node = this.node, FileType = node.attributes.type, FileLang, FilePath = node.parentNode.attributes.task, FileName = node.attributes.task, treeGrid = node.ownerTree, FileID = node.attributes.idDB, allFiles = [], owner = this.node.parentNode.parentNode.parentNode.attributes.task, tmp;
        
        tmp = node.parentNode.attributes.task.split('/');
        FileLang = tmp[0];
        
        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder' && node.attributes.type !== 'patch' && node.attributes.type !== 'user') {
                allFiles.push(node);
            }
        }, this);
        
        Ext.apply(this, {
            items: [{
                text: '<b>' + ((FileType === 'delete') ? _('View in a new tab') : _('Edit in a new tab')) + '</b>',
                iconCls: 'iconEdit',
                handler: function(){
                    ui.cmp.WorkTreeGrid.getInstance().openFile(node);
                }
            }, {
                text: _('Back this file to work in progress module'),
                hidden: (owner !== PhDOE.user.login),
                iconCls: 'iconWorkInProgress',
                handler: function(){
                    ui.task.MoveToWork({
                        nodesToAdd: allFiles
                    });
                }
            }, '-', {
                text: _('View diff'),
                iconCls: 'iconViewDiff',
                hidden: (FileType === 'delete' || FileType === 'new'),
                handler: function(){
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FileName: FileName,
                        FilePath: FilePath
                    });
                }
            }, {
                text: _('Download the diff as a patch'),
                iconCls: 'iconDownloadDiff',
                hidden: (FileType === 'delete' || FileType === 'new'),
                handler: function(){
                    window.location.href = './do/downloadPatch' +
                    '?FilePath=' +
                    FilePath +
                    '&FileName=' +
                    FileName;
                }
            }, {
                xtype: 'menuseparator',
                hidden: (FileType === 'delete' || FileType === 'new' || owner !== PhDOE.user.login)
            }, {
                text: ((FileType === 'delete') ? _('Cancel this deletion') : _('Clear this change')),
                hidden: (owner !== PhDOE.user.login),
                iconCls: 'iconPageDelete',
                handler: function(){
                    new ui.task.ClearLocalChangeTask({
                        ftype: FileType,
                        fpath: FilePath,
                        fname: FileName
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: (PhDOE.user.isAnonymous || owner !== PhDOE.user.login)
            }, ((owner === PhDOE.user.login && !PhDOE.user.isAnonymous) ? new ui.cmp._WorkTreeGrid.menu.commit({
                module: 'patches',
                from: 'file',
                node: this.node,
                folderNode: this.node.parentNode,
                patchNode: this.node.parentNode.parentNode,
                userNode: this.node.parentNode.parentNode.parentNode
            }) : ''),
            {
                xtype: 'menuseparator',
                hidden: ( !PhDOE.user.isGlobalAdmin && !(PhDOE.user.lang === FileLang && PhDOE.user.isLangAdmin) )
            },
                (( PhDOE.user.isGlobalAdmin || (PhDOE.user.lang === FileLang && PhDOE.user.isLangAdmin) ) ? new ui.cmp._WorkTreeGrid.menu.admin({
                    fileLang: FileLang,
                    from: 'file',
                    node: this.node,
                    folderNode: this.node.parentNode,
                    userNode: this.node.parentNode.parentNode.parentNode
                }) : '')
            ]
        });
    }
});

//------------------------------------------------------------------------------
// PatchesTreeGrid
ui.cmp.PatchesTreeGrid = Ext.extend(Ext.ux.tree.TreeGrid, {
    onContextMenu: function(node, e){
        e.stopEvent();
        
        var type = node.attributes.type, contextMenu;
        
        switch (type) {
        
            case "user":
                node.select();
                contextMenu = new ui.cmp._PatchesTreeGrid.menu.users({
                    node: node
                });
                break;
                
            case "folder":
                node.select();
                contextMenu = new ui.cmp._PatchesTreeGrid.menu.folders({
                    node: node
                });
                break;
                
            case "patch":
                node.select();
                contextMenu = new ui.cmp._PatchesTreeGrid.menu.patches({
                    node: node
                });
                break;
                
            default: // Use default for file as the type can be update, delete or new
                node.select();
                contextMenu = new ui.cmp._PatchesTreeGrid.menu.files({
                    node: node
                });
                break;
                
        }
        
        contextMenu.showAt(e.getXY());
        
    },
    
    modPatchName: function(a){
        var rootNode  = this.getRootNode(),
            patchNode = rootNode.findChild('idDB', a.patchID, true);
        patchNode.setText(a.newPatchName);
    },
    
    initComponent: function(){
    
        Ext.apply(this, {
            animate: true,
            //enableDD        : true,
            //ddGroup         : 'mainPanelDDGroup',
            useArrows: true,
            autoScroll: true,
            border: false,
            containerScroll: true,
            selModel: new Ext.tree.MultiSelectionModel(),
            columns: [{
                header: _('Users'),
                dataIndex: 'task',
                uiProvider: {
                    editable: true,
                    qtip: 'help'
                },
                tpl: new Ext.XTemplate('{task:this.formatUserName}', {
                    formatUserName: function(v, data){
                        // Only ucFirst user's name
                        if( data.type === 'user' ) {
                            return v.ucFirst();
                        }
                        
                        if( data.type === 'patch' ) {
                            
                            if( data.creationDate ) {
                                data.qtip= _('Creation date: ') + Date.parseDate(data.creationDate, 'Y-m-d H:i:s').format(_('Y-m-d, H:i'));
                            }
                            
                            return v;
                        }
                        
                        return v;
                    }
                    
                })
            }, {
                header: _('Last modified'),
                width: 120,
                dataIndex: 'last_modified',
                align: 'center',
                tpl: new Ext.XTemplate('{last_modified:this.formatDate}', {
                    formatDate: function(v, data){
                        if( data.type !== 'user' && data.type !== 'folder'  && data.type !== 'patch') {
                            return Date.parseDate(v, 'Y-m-d H:i:s').format(_('Y-m-d, H:i'));
                        } else {
                            return '';
                        }
                    }
                })
            }],
            loader: {
                dataUrl: './do/getWork',
                baseParams: {
                    module: 'PatchesForReview'
                }
            }    
        });
        ui.cmp.PatchesTreeGrid.superclass.initComponent.call(this);
        
        this.on('contextmenu', this.onContextMenu, this);
        this.on('resize', this.resizeCmp, this);
        this.on('dblclick', ui.cmp.WorkTreeGrid.getInstance().openFile, this);
        
        this.getRootNode().on('beforechildrenrendered', function(){
            this.updateFilesCounter.defer(200, this);
        }, this);
    },
    
    resizeCmp: function(c, a, b, w){
    
        this.columns[0].width = w - (this.columns[1].width + 5);
        this.updateColumnWidths();
    },
    
    deletePatch: function(patchID){
        var rootNode = this.getRootNode(), user, patches, folders, file, nodesToAdd = [], i, j, k, l;
        
        for (i = 0; i < rootNode.childNodes.length; i++) {
            user = rootNode.childNodes[i];
            
            for (j = 0; j < user.childNodes.length; j++) {
                patches = user.childNodes[j];
                
                if (patches.attributes.idDB === patchID) {
                
                    // If this patch contains some folders/Files, we get it to put into work in progress module
                    if (!Ext.isEmpty(patches.childNodes)) {
                    
                        for (k = 0; k < patches.childNodes.length; k++) {
                            folders = patches.childNodes[k];
                            
                            for (l = 0; l < folders.childNodes.length; l++) {
                                file = folders.childNodes[k];
                                nodesToAdd.push(file);
                            }
                        }
                        
                        // We put this files to work in progress module
                        ui.cmp.WorkTreeGrid.getInstance().addToWork(nodesToAdd);
                        
                    }
                    
                    // Now, we remove this patches
                    patches.remove(true);
                    
                    // Is Folder contains some others child ? If not, we remove this user too.
                    if (Ext.isEmpty(user.childNodes)) {
                        user.remove(true);
                    }
                    
                    // We update the FilesCounter
                    this.updateFilesCounter();
                    
                    return;
                    
                    
                }
            }
        }
    },
    
    delRecord: function(fid){
        var rootNode = this.getRootNode(), user, patches, folder, file, i, j, g, h;
        
        for (i = 0; i < rootNode.childNodes.length; i++) {
            user = rootNode.childNodes[i];
            
            for (j = 0; j < user.childNodes.length; j++) {
                patches = user.childNodes[j];
                
                for (g = 0; g < patches.childNodes.length; g++) {
                    folder = patches.childNodes[g];
                    
                    for (h = 0; h < folder.childNodes.length; h++) {
                        file = folder.childNodes[h];
                        
                        if (file.attributes.idDB === fid) {
                        
                            file.remove(true);
                            
                            // Is Folder contains some others child ?
                            if (Ext.isEmpty(folder.childNodes)) {
                            
                                folder.remove(true);
                                
                                // Is User contains some others child ?
                                if (Ext.isEmpty(user.childNodes)) {
                                
                                    user.remove(true);
                                    
                                    this.updateFilesCounter();
                                    return;
                                }
                                this.updateFilesCounter();
                                return;
                            }
                            this.updateFilesCounter();
                            return;
                        }
                    }
                }
                
            }
        }
        
        // We update the FilesCounter
        this.updateFilesCounter();
    },
    
    getUserPatchesList: function(){
        var rootNode = this.getRootNode(), userNode = rootNode.findChild('task', PhDOE.user.login), patchesList = [];
        
        // We start by searching if this user have a node
        if (!userNode) {
            return false;
        }
        else {
        
            if (!userNode.hasChildNodes()) {
                return false;
            }
            else {
            
                userNode.eachChild(function(node){
                    patchesList.push(node);
                }, this);
                
                return patchesList;
            }
        }
    },
    
    addToPatch: function(PatchID, PatchName, nodesToAdd){
        var rootNode, userNode, PatchNode, folderNode, type, iconCls, fileNode, nowDate, i;
        
        rootNode = this.getRootNode();
        
        // We start by searching if this user have a node
        userNode = rootNode.findChild('task', PhDOE.user.login);
        
        // If the user node don't exist, we create it
        if (!userNode) {
        
            userNode = new Ext.tree.TreeNode({
                task: PhDOE.user.login,
                type: 'user',
                email: PhDOE.user.email,
                iconCls: 'iconUser',
                expanded: true
            });
            
            rootNode.appendChild(userNode);
            rootNode.expand(); // This allow to show our new node
        }
        
        // We search now into this user the right patch
        PatchNode = userNode.findChild('task', PatchName);
        
        // If this folder don't exist, we create it
        if (!PatchNode) {
        
            PatchNode = new Ext.tree.TreeNode({
                task: PatchName,
                type: 'patch',
                iconCls: 'iconPatch',
                expanded: true,
                idDB: PatchID
            });
            
            userNode.appendChild(PatchNode);
            userNode.expand(); // This allow to show our new node
        }
        
        /* Now, our patch exist into the tree. If there is some files to add in, we add it now */
        if (nodesToAdd) {
        
            // We walk into the nodes to add
            for (i = 0; i < nodesToAdd.length; i++) {
            
                // We search now into this patch the right folder
                folderNode = PatchNode.findChild('task', nodesToAdd[i].parentNode.attributes.task);
                
                // If this folder don't exist, we create it
                if (!folderNode) {
                
                    folderNode = new Ext.tree.TreeNode({
                        task: nodesToAdd[i].parentNode.attributes.task,
                        type: 'folder',
                        iconCls: 'iconFolderOpen',
                        expanded: true
                    });
                    
                    PatchNode.appendChild(folderNode);
                    PatchNode.expand(); // This allow to show our new node
                }
                
                // We add now this file into this folder
                type = nodesToAdd[i].attributes.type;
                
                if (type === 'update') {
                    iconCls = 'iconRefresh';
                }
                if (type === 'new') {
                    iconCls = 'iconNewFiles';
                }
                if (type === 'delete') {
                    iconCls = 'iconTrash';
                }
                
                nowDate = new Date();
                
                fileNode = new Ext.tree.TreeNode({
                    task: nodesToAdd[i].attributes.task,
                    type: type,
                    iconCls: iconCls,
                    expanded: true,
                    last_modified: nowDate.format('Y-m-d H:i:s'),
                    progress: nodesToAdd[i].attributes.progress,
                    idDB: nodesToAdd[i].attributes.idDB
                });
                
                folderNode.appendChild(fileNode);
                folderNode.expand(); // This allow to show our new node
            }
            
        } // End of adding folders/files into this patch
        // We update the FilesCounter
        this.updateFilesCounter();
        
    },
    
    addRecord: function(fid, fpath, fname, type){
        var rootNode, userNode, folderNode, fileNode, nowDate, iconCls;
        
        rootNode = this.getRootNode();
        
        // We start by searching if this user have a node
        userNode = rootNode.findChild('task', PhDOE.user.login);
        
        // If the user node don't exist, we create it
        if (!userNode) {
        
            userNode = new Ext.tree.TreeNode({
                task: PhDOE.user.login,
                type: 'user',
                email: PhDOE.user.email,
                iconCls: 'iconUser',
                expanded: true,
                nbFiles: 1
            });
            
            rootNode.appendChild(userNode);
            rootNode.expand(); // This allow to show our new node
        }
        
        // We search now into this user the right folder
        folderNode = userNode.findChild('task', fpath);
        
        // If this folder don't exist, we create it
        if (!folderNode) {
        
            folderNode = new Ext.tree.TreeNode({
                task: fpath,
                type: 'folder',
                iconCls: 'iconFolderOpen',
                expanded: true
            });
            
            userNode.appendChild(folderNode);
            userNode.expand(); // This allow to show our new node
        }
        
        // We search now into this folder the right file
        fileNode = folderNode.findChild('task', fname);
        
        // If this folder don't exist, we create it
        if (!fileNode) {
        
            if (type === 'update') {
                iconCls = 'iconRefresh';
            }
            if (type === 'new') {
                iconCls = 'iconNewFiles';
            }
            if (type === 'delete') {
                iconCls = 'iconTrash';
            }
            
            nowDate = new Date();
            
            fileNode = new Ext.tree.TreeNode({
                task: fname,
                type: type,
                iconCls: iconCls,
                expanded: true,
                last_modified: nowDate.format('Y-m-d H:i:s'),
                progress: 100,
                idDB: fid
            });
            
            folderNode.appendChild(fileNode);
            folderNode.expand(); // This allow to show our new node
        }
        
        // We update the FilesCounter
        this.updateFilesCounter();
    },
    
    countFiles: function(){
        var rootNode = this.getRootNode(), nbFiles = 0, user, folder, files, i, j, h, g;
        
		rootNode.cascade(function(node){
			if( !node.isRoot && node.attributes.type !== 'user' && node.attributes.type !== 'folder' && node.attributes.type !== 'patch') {
				if (node.parentNode.parentNode.parentNode.attributes.task === PhDOE.user.login) {
					nbFiles++;
				}
			}
		}, this);
		
        return nbFiles;
    },
    
    updateFilesCounter: function(){
        var count = this.countFiles();
        
        Ext.getDom('acc-patches-nb').innerHTML = count;
        
    }
});

// singleton
ui.cmp._PatchesTreeGrid.instance = null;
ui.cmp.PatchesTreeGrid.getInstance = function(config){
    if (!ui.cmp._PatchesTreeGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PatchesTreeGrid.instance = new ui.cmp.PatchesTreeGrid(config);
    }
    return ui.cmp._PatchesTreeGrid.instance;
};
Ext.namespace('ui','ui.cmp');

// config - {defaultEmail, prefix, ftype, fid, fpath, fname, lang}
ui.cmp.PatchPrompt = Ext.extend(Ext.Window,
{
    title      : _('Do you want to be alerted ?'),
    iconCls    : 'iconPatchAlert',
    layout     : 'form',
    bodyStyle  : 'padding: 5px;',
    labelWidth : 50,
    width      : 350,
    height     : 150,
    resizable  : false,
    modal      : true,
    autoScroll : true,

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype     : 'panel',
                baseCls   : 'x-plain',
                bodyStyle : 'padding-bottom: 10px;',
                html      : _('If you want to be notified when your patch will be dealt with, thank you to leave an email address below.')
            }, {
                id         : 'patch-email-alert',
                xtype      : 'textfield',
                name       : 'patch-email-alert',
                fieldLabel : _('Email'),
                anchor     : '100%',
                value      : this.defaultEmail
            }],
            buttons : [{
                scope   : this,
                text    : _('Save'),
                handler : function()
                {
                    new ui.task.SavePatchTask({
                        prefix : this.prefix,
                        fid    : this.fid,
                        ftype  : this.ftype,
                        lang   : this.lang,
                        fpath  : this.fpath,
                        fname  : this.fname,
                        email  : Ext.getCmp('patch-email-alert').getValue()
                    });

                    this.close();
                }
            }, {
                scope   : this,
                text    : _('Cancel'),
                handler : function()
                {
                    this.close();
                }
            }]
        });
        ui.cmp.PatchPrompt.superclass.initComponent.call(this);
    }
});Ext.namespace('ui', 'ui.cmp', 'ui.cmp._PendingReviewGrid');

//------------------------------------------------------------------------------
// PendingReviewGrid internals

// PendingReviewGrid store
ui.cmp._PendingReviewGrid.store = new Ext.data.GroupingStore({
    proxy: new Ext.data.HttpProxy({
        url: './do/getFilesNeedReviewed'
    }),
    reader: new Ext.data.JsonReader({
        root: 'Items',
        totalProperty: 'nbItems',
        idProperty: 'id',
        fields: [{
            name: 'id'
        }, {
            name: 'path'
        }, {
            name: 'name'
        }, {
            name: 'reviewed'
        }, {
            name: 'maintainer'
        }, {
            name: 'fileModifiedEN'
        }, {
            name: 'fileModifiedLang'
        }]
    }),
    sortInfo: {
        field: 'name',
        direction: 'ASC'
    },
    groupField: 'path',
    listeners: {
        datachanged: function(ds){
            Ext.getDom('acc-need-reviewed-nb').innerHTML = ds.getCount();
        }
    }
});

// PendingReviewGrid columns definition
ui.cmp._PendingReviewGrid.columns = [{
    id: 'name',
    header: _('Files'),
    sortable: true,
    dataIndex: 'name',
    renderer: function(v, m, r){
        var mess = '', infoEN, infoLang;
        
        if (r.data.fileModifiedEN) {
        
            infoEN = Ext.util.JSON.decode(r.data.fileModifiedEN);
            
            if (infoEN.user === PhDOE.user.login && infoEN.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess = _('File EN modified by me') + "<br>";
            }
            else {
                mess = String.format(_('File EN modified by {0}'), infoEN.user.ucFirst()) + "<br>";
            }
        }
        
        if (r.data.fileModifiedLang) {
        
            infoLang = Ext.util.JSON.decode(r.data.fileModifiedLang);
            
            if (infoLang.user === PhDOE.user.login && infoLang.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess += String.format(_('File {0} modified by me'), PhDOE.user.lang.ucFirst());
            }
            else {
                mess += String.format(_('File {0} modified by {1}'), PhDOE.user.lang.ucFirst(), infoLang.user.ucFirst());
            }
        }
        
        if (mess !== '') {
            return "<span ext:qtip='" + mess + "'>" + v + "</span>";
        }
        else {
            return v;
        }
    }
}, {
    header: _('Reviewed'),
    width: 45,
    sortable: true,
    dataIndex: 'reviewed'
}, {
    header: _('Maintainer'),
    width: 45,
    sortable: true,
    dataIndex: 'maintainer'
}, {
    header: _('Path'),
    dataIndex: 'path',
    hidden: true
}];

// PendingReviewGrid view
ui.cmp._PendingReviewGrid.view = new Ext.grid.GroupingView({
    forceFit: true,
    startCollapsed: true,
    groupTextTpl: '{[values.rs[0].data["path"]]} ' +
    '({[values.rs.length]} ' +
    '{[values.rs.length > 1 ? "' +
    _('Files') +
    '" : "' +
    _('File') +
    '"]})',
    getRowClass: function(r){
        if (r.data.fileModifiedEN || r.data.fileModifiedLang) {
        
            var infoEN = Ext.util.JSON.decode(r.data.fileModifiedEN), infoLang = Ext.util.JSON.decode(r.data.fileModifiedLang);
            return ((infoEN.user === PhDOE.user.login && infoEN.anonymousIdent === PhDOE.user.anonymousIdent) ||
            (infoLang.user === PhDOE.user.login && infoLang.anonymousIdent === PhDOE.user.anonymousIdent)) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
        }
        return false;
    },
    deferEmptyText: false,
    emptyText: '<div style="text-align: center;">' + _('No Files') + '</div>'
});

Ext.namespace('ui.cmp._PendingReviewGrid.menu');
// PendingReviewGrid refence group menu
// config - { gname }
ui.cmp._PendingReviewGrid.menu.group = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PendingReviewGrid.menu.group.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PendingReviewGrid.menu.group, Ext.menu.Item, {
    iconCls: 'iconViewDiff',
    init: function(){
        
        Ext.apply(this, {
            text: String.format(_('Open all files about {0} extension'), this.gname.ucFirst()),
            handler: function(){
                Ext.getBody().mask('<img src="themes/img/loading.gif" ' +
                'style="vertical-align: middle;" /> ' +
                String.format(_('Open all files about {0} extension'), this.gname.ucFirst()) +
                '. ' +
                _('Please, wait...'));
                
                XHR({
                    params: {
                        task: 'getAllFilesAboutExtension',
                        ExtName: this.gname
                    },
                    success: function(r){
                        var o = Ext.util.JSON.decode(r.responseText), i;
                        
                        PhDOE.AFfilePendingOpen = [];
                        
                        for (i = 0; i < o.files.length; i = i + 1) {
                            PhDOE.AFfilePendingOpen[i] = {
                                fpath: PhDOE.user.lang + o.files[i].path,
                                fname: o.files[i].name
                            };
                        }
                        
                        // Start the first
                        ui.cmp.RepositoryTree.getInstance().openFile('byPath', PhDOE.AFfilePendingOpen[0].fpath, PhDOE.AFfilePendingOpen[0].fname);
                        
                        PhDOE.AFfilePendingOpen.shift();
                        
                        Ext.getBody().unmask();
                    }
                });
            }
        });
    }
});

// PendingReviewGrid menu
// config - { hideDiffMenu, hideGroup, gname, grid, rowIdx, event, fpath, fname }
ui.cmp._PendingReviewGrid.menu.main = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PendingReviewGrid.menu.main.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PendingReviewGrid.menu.main, Ext.menu.Menu, {
    init: function(){
        Ext.apply(this, {
            items: [{
                text: '<b>' + _('Edit in a new tab') + '</b>',
                iconCls: 'iconFilesNeedReviewed',
                scope: this,
                handler: function(){
                    this.grid.fireEvent('rowdblclick', this.grid, this.rowIdx, this.event);
                }
            }, {
                scope: this,
                hidden: this.hideDiffMenu,
                text: _('View diff...'),
                iconCls: 'iconViewDiff',
                menu: new Ext.menu.Menu({
                    items: [{
                        scope: this,
                        hidden: (this.grid.store.getAt(this.rowIdx).data.fileModifiedEN === false),
                        text: String.format(_('... of the {0} file'), 'EN'),
                        handler: function(){
                            Ext.getCmp('main-panel').openDiffTab({
                                DiffType: 'file',
                                FileName: this.fname,
                                FilePath: 'en'+this.fpath
                            });
                        }
                    }, {
                        scope: this,
                        hidden: (this.grid.store.getAt(this.rowIdx).data.fileModifiedLang === false),
                        text: String.format(_('... of the {0} file'), PhDOE.user.lang.ucFirst()),
                        handler: function(){
                            Ext.getCmp('main-panel').openDiffTab({
                                DiffType: 'file',
                                FileName: this.fname,
                                FilePath: PhDOE.user.lang+this.fpath
                            });
                        }
                    }]
                })
            }, new Ext.menu.Separator({ // Only display a separator when we display the group menu
                hidden: this.hideGroup
            }), new ui.cmp._PendingReviewGrid.menu.group({
                gname: this.gname,
                hidden: this.hideGroup
            })]
        });
    }
});

//------------------------------------------------------------------------------
// PendingReviewGrid
ui.cmp.PendingReviewGrid = Ext.extend(Ext.grid.GridPanel, {
    loadMask: true,
    border: false,
    autoExpandColumn: 'name',
    enableDragDrop: true,
    ddGroup: 'mainPanelDDGroup',
    columns: ui.cmp._PendingReviewGrid.columns,
    view: ui.cmp._PendingReviewGrid.view,
    
    onRowContextMenu: function(grid, rowIndex, e){
        e.stopEvent();
        
        var storeRecord = grid.store.getAt(rowIndex), FilePath = storeRecord.data.path, FileName = storeRecord.data.name, fpath_split = FilePath.split('/');
        
        grid.getSelectionModel().selectRow(rowIndex);
        
        new ui.cmp._PendingReviewGrid.menu.main({
            grid: grid,
            rowIdx: rowIndex,
            event: e,
            fpath: FilePath,
            fname: FileName,
            hideDiffMenu: (storeRecord.data.fileModifiedEN === false && storeRecord.data.fileModifiedLang === false),
            hideGroup: (fpath_split[1] !== 'reference'),
            gname: (fpath_split[2]) ? fpath_split[2] : ''
        }).showAt(e.getXY());
    },
    
    onRowDblClick: function(grid, rowIndex, e){
        this.openFile(grid.store.getAt(rowIndex).data.id);
    },
    
    openFile: function(rowId){
        var storeRecord = this.store.getById(rowId), FilePath = storeRecord.data.path, FileName = storeRecord.data.name, FileID = Ext.util.md5('FNR-' + PhDOE.user.lang + FilePath + FileName);
        
        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNR-' + FileID)) {
        
            Ext.getCmp('main-panel').add({
                id: 'FNR-' + FileID,
                title: FileName,
                layout: 'border',
                iconCls: 'iconTabNeedReviewed',
                closable: true,
                tabLoaded: false,
                panVCSLang: !PhDOE.user.conf.reviewed.toolsPanelLogLoad,
                panVCSEn: !PhDOE.user.conf.reviewed.toolsPanelLogLoad,
                panLANGLoaded: false,
                panENLoaded: false,
                originTitle: FileName,
                defaults: {
                    split: true
                },
                tabTip: String.format(_('Need Reviewed in: {0}'), FilePath),
                listeners: {
                    resize: function(panel){
                        Ext.getCmp('FNR-EN-PANEL-' + FileID).setWidth(panel.getWidth() / 2);
                    }
                },
                items: [{
                    region: 'west',
                    xtype: 'panel',
                    title: _('Tools'),
                    iconCls: 'iconConf',
                    collapsedIconCls: 'iconConf',
                    plugins: [Ext.ux.PanelCollapsedTitle],
                    collapsible: true,
                    collapsed: !PhDOE.user.conf.reviewed.toolsPanelDisplay,
                    layout: 'fit',
                    bodyBorder: false,
                    width: PhDOE.user.conf.reviewed.toolsPanelWidth || 375,
                    listeners: {
                        collapse: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'toolsPanelDisplay',
                                    value: false,
                                    notify: false
                                });
                            }
                        },
                        expand: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'toolsPanelDisplay',
                                    value: true,
                                    notify: false
                                });
                            }
                        },
                        resize: function(a, newWidth){
                            if (this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.user.conf.reviewed.toolsPanelWidth) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    module     : 'reviewed',
                                    itemName   : 'toolsPanelWidth',
                                    value: newWidth,
                                    notify: false
                                });
                            }
                        }
                    },
                    items: {
                        xtype: 'tabpanel',
                        activeTab: 0,
                        tabPosition: 'bottom',
                        enableTabScroll: true,
                        defaults: {
                            autoScroll: true
                        },
                        items: [new ui.cmp.VCSLogGrid({
                            layout: 'fit',
                            title: String.format(_('{0} Log'), PhDOE.user.lang.ucFirst()),
                            prefix: 'FNR-LANG',
                            fid: FileID,
                            fpath: PhDOE.user.lang + FilePath,
                            fname: FileName,
                            loadStore: PhDOE.user.conf.reviewed.toolsPanelLogLoad
                        }), new ui.cmp.VCSLogGrid({
                            layout: 'fit',
                            title: String.format(_('{0} Log'), 'En'),
                            prefix: 'FNR-EN',
                            fid: FileID,
                            fpath: 'en' + FilePath,
                            fname: FileName,
                            loadStore: PhDOE.user.conf.reviewed.toolsPanelLogLoad
                        }), new ui.cmp.DictionaryGrid({
                            layout: 'fit',
                            title: _('Dictionary'),
                            prefix: 'FNR',
                            fid: FileID
                        })]
                    }
                }, new ui.cmp.FilePanel({
                    id: 'FNR-LANG-PANEL-' + FileID,
                    region: 'center',
                    title: String.format(_('{0} File: '), PhDOE.user.lang.ucFirst()) + FilePath + FileName,
                    prefix: 'FNR',
                    ftype: 'LANG',
                    spellCheck: PhDOE.user.conf.reviewed.enableSpellCheckLang,
                    spellCheckConf: { module : 'reviewed', itemName : 'enableSpellCheckLang' },
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: PhDOE.user.lang,
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScrollCB: true,
                    syncScroll: true,
                    syncScrollConf: { module : 'reviewed', itemName : 'syncScrollbars' }
                }), new ui.cmp.FilePanel({
                    id: 'FNR-EN-PANEL-' + FileID,
                    region: 'east',
                    title: _('en File: ') + FilePath + FileName,
                    prefix: 'FNR',
                    ftype: 'EN',
                    spellCheck: PhDOE.user.conf.reviewed.enableSpellCheckEn,
                    spellCheckConf: { module : 'reviewed', itemName : 'enableSpellCheckEn' },
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: 'en',
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScroll: true,
                    syncScrollConf: { module : 'reviewed', itemName : 'syncScrollbars' }
                })]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNR-' + FileID);
    },
    
    initComponent: function(){
        Ext.apply(this, {
            store: ui.cmp._PendingReviewGrid.store,
            tbar: [_('Filter: '), ' ', new Ext.form.TwinTriggerField({
                id: 'FNR-filter',
                width: 180,
                hideTrigger1: true,
                enableKeyEvents: true,
                validateOnBlur: false,
                validationEvent: false,
                trigger1Class: 'x-form-clear-trigger',
                trigger2Class: 'x-form-search-trigger',
                listeners: {
                    keypress: function(field, e){
                        if (e.getKey() === e.ENTER) {
                            this.onTrigger2Click();
                        }
                    }
                },
                onTrigger1Click: function(){
                    this.setValue('');
                    this.triggers[0].hide();
                    this.setSize(180, 10);
                    ui.cmp._PendingReviewGrid.instance.store.clearFilter();
                },
                onTrigger2Click: function(){
                    var v = this.getValue(), regexp;
                    
                    if (v === '' || v.length < 3) {
                        this.markInvalid(_('Your filter must contain at least 3 characters'));
                        return;
                    }
                    this.clearInvalid();
                    this.triggers[0].show();
                    this.setSize(180, 10);
                    
                    regexp = new RegExp(v, 'i');
                    
                    // We filter on 'path', 'name', 'reviewed', 'maintainer'
                    ui.cmp._PendingReviewGrid.instance.store.filterBy(function(record){
                    
                        if (regexp.test(record.data.path) ||
                        regexp.test(record.data.name) ||
                        regexp.test(record.data.reviewed) ||
                        regexp.test(record.data.maintainer)) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }, this);
                }
            })]
        });
        ui.cmp.PendingReviewGrid.superclass.initComponent.call(this);
        
        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick', this.onRowDblClick, this);
    }
});

// singleton
ui.cmp._PendingReviewGrid.instance = null;
ui.cmp.PendingReviewGrid.getInstance = function(config){
    if (!ui.cmp._PendingReviewGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PendingReviewGrid.instance = new ui.cmp.PendingReviewGrid(config);
    }
    return ui.cmp._PendingReviewGrid.instance;
};
Ext.namespace('ui', 'ui.cmp', 'ui.cmp._PendingTranslateGrid');

//------------------------------------------------------------------------------
// PendingTranslateGrid data store
ui.cmp._PendingTranslateGrid.store = new Ext.data.GroupingStore({
    proxy: new Ext.data.HttpProxy({
        url: './do/getFilesNeedTranslate'
    }),
    reader: new Ext.data.JsonReader({
        root: 'Items',
        totalProperty: 'nbItems',
        idProperty: 'id',
        fields: [{
            name: 'id'
        }, {
            name: 'path'
        }, {
            name: 'name'
        }, {
            name: 'fileModified'
        }]
    }),
    sortInfo: {
        field: 'name',
        direction: 'ASC'
    },
    groupField: 'path',
    listeners: {
        datachanged: function(ds){
            Ext.getDom('acc-need-translate-nb').innerHTML = ds.getCount();
        }
    }
});

// PendingTranslateGrid view
ui.cmp._PendingTranslateGrid.view = new Ext.grid.GroupingView({
    forceFit: true,
    startCollapsed: true,
    groupTextTpl: '{[values.rs[0].data["path"]]} ' +
    '({[values.rs.length]} ' +
    '{[values.rs.length > 1 ? "' +
    _('Files') +
    '" : "' +
    _('File') +
    '"]})',
    deferEmptyText: false,
    getRowClass: function(r){
        if (r.data.fileModified) {
        
            var info = Ext.util.JSON.decode(r.data.fileModified);
            
            return (info.user === PhDOE.user.login && info.anonymousIdent === PhDOE.user.anonymousIdent) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
        }
        
        return false;
    },
    emptyText: '<div style="text-align: center;">' + _('No Files') + '</div>'
});

// PendingTranslateGrid columns definition
ui.cmp._PendingTranslateGrid.columns = [{
    id: 'name',
    header: _('Files'),
    sortable: true,
    dataIndex: 'name',
    renderer: function(v, metada, r){
        if (r.data.fileModified) {
        
            var info = Ext.util.JSON.decode(r.data.fileModified);
            
            if (info.user === PhDOE.user.login && info.anonymousIdent === PhDOE.user.anonymousIdent) {
                return "<span ext:qtip='" + _('File modified by me') + "'>" + v + "</span>";
            }
            else {
                return "<span ext:qtip='" + String.format(_('File modified by {0}'), info.user.ucFirst()) + "'>" + v + "</span>";
            }
            
        }
        else {
            return v;
        }
    }
}, {
    header: _('Path'),
    dataIndex: 'path',
    hidden: true
}];

// PendingTranslateGrid context menu
// config - { grid, rowIdx, event }
ui.cmp._PendingTranslateGrid.menu = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._StaleFileGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PendingTranslateGrid.menu, Ext.menu.Menu, {
    init: function(){
        Ext.apply(this, {
            items: [{
                scope: this,
                text: '<b>' + _('Edit in a new tab') + '</b>',
                iconCls: 'iconTabNeedTranslate',
                handler: function(){
                    this.grid.fireEvent('rowdblclick', this.grid, this.rowIdx, this.event);
                }
            }]
        });
    }
});


//------------------------------------------------------------------------------
// PendingTranslateGrid
ui.cmp.PendingTranslateGrid = Ext.extend(Ext.grid.GridPanel, {
    view: ui.cmp._PendingTranslateGrid.view,
    loadMask: true,
    autoExpandColumn: 'name',
    enableDragDrop: true,
    ddGroup: 'mainPanelDDGroup',
    border: false,
    
    onRowContextMenu: function(grid, rowIndex, e){
        e.stopEvent();
        
        grid.getSelectionModel().selectRow(rowIndex);
        
        new ui.cmp._PendingTranslateGrid.menu({
            grid: grid,
            event: e,
            rowIdx: rowIndex
        }).showAt(e.getXY());
    },
    
    onRowDblClick: function(grid, rowIndex){
        this.openFile(grid.store.getAt(rowIndex).data.id);
    },
    
    openFile: function(rowId){
        var storeRecord = this.store.getById(rowId), FilePath = storeRecord.data.path, FileName = storeRecord.data.name, FileID = Ext.util.md5('FNT-' + PhDOE.user.lang + FilePath + FileName);
        
        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNT-' + FileID)) {
        
            Ext.getCmp('main-panel').add({
                id: 'FNT-' + FileID,
                layout: 'border',
                title: FileName,
                originTitle: FileName,
                iconCls: 'iconTabNeedTranslate',
                closable: true,
                tabLoaded: false,
                panTRANSLoaded: false,
                panGGTRANSLoaded: !PhDOE.user.conf.newFile.googlePanelDisplay,
                defaults: {
                    split: true
                },
                tabTip: String.format(_('Need translate: in {0}'), FilePath),
                listeners: {
                    resize: function(panel){
                        if (PhDOE.user.conf.newFile.googlePanelDisplay) {
                            Ext.getCmp('FNT-GGTRANS-PANEL-' + FileID).setWidth(panel.getWidth() / 2);
                        }
                    }
                },
                items: [{
                    region: 'west',
                    xtype: 'panel',
                    title: _('Tools'),
                    iconCls: 'iconConf',
                    collapsedIconCls: 'iconConf',
                    plugins: [Ext.ux.PanelCollapsedTitle],
                    collapsible: true,
                    collapsed: !PhDOE.user.conf.newFile.toolsPanelDisplay,
                    layout: 'fit',
                    bodyBorder: false,
                    width: PhDOE.user.conf.newFile.toolsPanelWidth || 375,
                    listeners: {
                        collapse: function(){
                            if ( this.ownerCt.tabLoaded ) {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'toolsPanelDisplay',
                                    value : false,
                                    notify: false
                                });
                            }
                        },
                        expand: function(){
                            if ( this.ownerCt.tabLoaded ) {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'toolsPanelDisplay',
                                    value : true,
                                    notify: false
                                });
                            }
                        },
                        resize: function(a, newWidth){
                            if (this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.user.conf.newFile.toolsPanelWidth) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    module     : 'newFile',
                                    itemName   : 'toolsPanelWidth',
                                    value: newWidth,
                                    notify: false
                                });
                            }
                        }
                    },
                    items: {
                        xtype: 'tabpanel',
                        activeTab: 0,
                        tabPosition: 'bottom',
                        defaults: {
                            autoScroll: true
                        },
                        items: [new ui.cmp.DictionaryGrid({
                            layout: 'fit',
                            title: _('Dictionary'),
                            prefix: 'FNT',
                            fid: FileID
                        })]
                    }
                }, new ui.cmp.FilePanel({
                    id: 'FNT-TRANS-PANEL-' + FileID,
                    region: 'center',
                    title: _('New file: ') + PhDOE.user.lang + FilePath + FileName,
                    isTrans: true,
                    prefix: 'FNT',
                    ftype: 'TRANS',
                    spellCheck: PhDOE.user.conf.newFile.enableSpellCheck,
                    spellCheckConf: { module : 'newFile', itemName : 'enableSpellCheck' },
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: PhDOE.user.lang,
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScrollCB: PhDOE.user.conf.newFile.googlePanelDisplay,
                    syncScroll: PhDOE.user.conf.newFile.googlePanelDisplay,
                    syncScrollConf: { module : 'newFile', itemName : 'syncScrollbars' }
                }), ((PhDOE.user.conf.newFile.googlePanelDisplay) ? new ui.cmp.FilePanel({
                    id: 'FNT-GGTRANS-PANEL-' + FileID,
                    region: 'east',
                    title: _('Automatic translation: ') + PhDOE.user.lang + FilePath + FileName,
                    isTrans: true,
                    prefix: 'FNT',
                    ftype: 'GGTRANS',
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    readOnly: true,
                    lang: PhDOE.user.lang,
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScroll: true,
                    syncScrollConf: { module : 'newFile', itemName : 'syncScrollbars' }
                }) : false)]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNT-' + FileID);
    },
    
    initComponent: function(){
        Ext.apply(this, {
            columns: ui.cmp._PendingTranslateGrid.columns,
            store: ui.cmp._PendingTranslateGrid.store,
            tbar: [_('Filter: '), ' ', new Ext.form.TwinTriggerField({
                id: 'FNT-filter',
                width: 180,
                hideTrigger1: true,
                enableKeyEvents: true,
                validateOnBlur: false,
                validationEvent: false,
                trigger1Class: 'x-form-clear-trigger',
                trigger2Class: 'x-form-search-trigger',
                listeners: {
                    keypress: function(field, e){
                        if (e.getKey() === e.ENTER) {
                            this.onTrigger2Click();
                        }
                    }
                },
                onTrigger1Click: function(){
                    this.setValue('');
                    this.triggers[0].hide();
                    this.setSize(180, 10);
                    ui.cmp._PendingTranslateGrid.instance.store.clearFilter();
                },
                onTrigger2Click: function(){
                    var v = this.getValue(), regexp;
                    
                    if (v === '' || v.length < 3) {
                        this.markInvalid(_('Your filter must contain at least 3 characters'));
                        return;
                    }
                    this.clearInvalid();
                    this.triggers[0].show();
                    this.setSize(180, 10);
                    
                    regexp = new RegExp(v, 'i');
                    
                    // We filter on 'path' and 'name'
                    ui.cmp._PendingTranslateGrid.instance.store.filterBy(function(record){
                    
                        if (regexp.test(record.data.path) || regexp.test(record.data.name)) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }, this);
                }
            })]
        });
        ui.cmp.PendingTranslateGrid.superclass.initComponent.call(this);
        
        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick', this.onRowDblClick, this);
    }
});

// singleton
ui.cmp._PendingTranslateGrid.instance = null;
ui.cmp.PendingTranslateGrid.getInstance = function(config){
    if (!ui.cmp._PendingTranslateGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PendingTranslateGrid.instance = new ui.cmp.PendingTranslateGrid(config);
    }
    return ui.cmp._PendingTranslateGrid.instance;
};
Ext.namespace('ui','ui.cmp','ui.cmp._PortletBugs');

//------------------------------------------------------------------------------
// PortletBugs internals

// Store : All open bugs for documentation
ui.cmp._PortletBugs.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getOpenBugs'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'title'},
            {name : 'link' },
            {name : 'description' },
            {name : 'xmlID' }
        ]
    })
});

ui.cmp._PortletBugs.gridFormatTitle = function(v) {
    return String.format('<div class="topic"><b>{0}</b></div>', v);
};

// BugsGrid columns definition
ui.cmp._PortletBugs.gridColumns = [{
    id        : 'GridBugTitle',
    header    : _("Title"),
    sortable  : true,
    dataIndex : 'title',
    renderer  : ui.cmp._PortletBugs.gridFormatTitle
}];


ui.cmp._PortletBugs.gridView = new Ext.grid.GridView({
    forceFit      : true,
    emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '</div>',
    deferEmptyText: false,
    enableRowBody : true,
    showPreview   : false,
    getRowClass   : function(record, rowIndex, p)
    {
        if (this.showPreview) {
            p.body = '<p>' + record.data.description + '</p>';
            return 'x-grid3-row-expanded';
        }
        return 'x-grid3-row-collapsed';
    }
});

//------------------------------------------------------------------------------
// BugsGrid
ui.cmp._PortletBugs.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    height           : 250,
    autoExpandColumn : 'GridBugTitle',
    id               : 'PortletBugs-grid-id',
    store            : ui.cmp._PortletBugs.store,
    columns          : ui.cmp._PortletBugs.gridColumns,
    view             : ui.cmp._PortletBugs.gridView,
    sm               : new Ext.grid.RowSelectionModel({ singleSelect: true }),

    onRowDblClick : function(grid, rowIndex)
    {
        var BugsId    = grid.store.getAt(rowIndex).data.id,
            BugsUrl   = grid.store.getAt(rowIndex).data.link,
            BugsTitle = grid.store.getAt(rowIndex).data.title;

        if (!Ext.getCmp('main-panel').findById('bugs-' + BugsId)) {

            Ext.getCmp('main-panel').add({
                id         : 'bugs-' + BugsId,
                xtype      : 'panel',
                title      : Ext.util.Format.substr(BugsTitle, 0, 20) + '...',
                tabTip     : BugsTitle,
                iconCls    : 'iconBugs',
                closable   : true,
                layout     : 'fit',
                items: [ new Ext.ux.IFrameComponent({ id: 'frame-bugs-' + BugsId, url: BugsUrl }) ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('bugs-' + BugsId);
    },

    openRelatedFile : function(xmlID)
    {
        new ui.task.GetFileInfoByXmlID({xmlID: xmlID});
    },

    onContextClick : function(grid, rowIndex, e)
    {

        if(!this.menu) {
            this.menu = new Ext.menu.Menu({
                id    : 'submenu-bugs',
                items : [{
                    scope   : this,
                    text    : '<b>'+_('Open in a new Tab')+'</b>',
                    iconCls : 'iconOpenInTab',
                    handler : function()
                    {
                        this.fireEvent('rowdblclick', grid, this.ctxIndex, e);
                        this.menu.hide();
                    }
                }, '-', {
                    scope   : this,
                    text    : _('Refresh this grid'),
                    iconCls : 'iconRefresh',
                    handler : function()
                    {
                        this.ctxIndex = null;
                        ui.cmp._PortletBugs.reloadData();
                    }
                }, {
                    scope   : this,
                    text    : _('Open the related file'),
                    iconCls : 'iconAllFiles',
                    id      : 'bugs-open-related-file',
                    handler : function()
                    {
                        this.openRelatedFile(this.ctxXmlID);
                    }
                }]
            });
        }

        this.getSelectionModel().selectRow(rowIndex);
        e.stopEvent();

        if(this.ctxIndex){
            this.ctxIndex = null;
        }
        if(this.ctxXmlID){
            this.ctxXmlID = null;
        }

        this.ctxIndex = rowIndex;
        this.ctxXmlID = grid.store.getAt(this.ctxIndex).data.xmlID;
        this.menu.showAt(e.getXY());

        if( !this.ctxXmlID ) {
          Ext.getCmp('bugs-open-related-file').disable();
        } else {
          Ext.getCmp('bugs-open-related-file').enable();
        }

    },

    togglePreview : function(show) 
    {
        this.view.showPreview = show;
        this.view.refresh();
    }, 

    initComponent : function(config)
    {

        this.tbar = [{
            text          : _('Summary'),
            pressed       : false,
            enableToggle  : true, 
            iconCls       : 'iconSummary',
            scope         : this,
            toggleHandler : function(btn, pressed){
                this.togglePreview(pressed);
            }
        }];

        ui.cmp._PortletBugs.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);

    }
});

ui.cmp._PortletBugs.reloadData = function() {
    ui.cmp._PortletBugs.store.reload({
        callback : function(r,o,success) {
          if( !success ) {
              Ext.getCmp('PortletBugs-grid-id').getView().mainBody.update('<div id="PortletBugs-grid-defaultMess-id" style="text-align: center" class="x-grid-empty">' + _('Error when loading open bugs from Php.net !') + '</div>');
              Ext.get('PortletBugs-grid-defaultMess-id').highlight();

          } else {
              if (ui.cmp._PortletBugs.store.getTotalCount() === 0 ) {
                  Ext.getCmp('PortletBugs-grid-id').getView().mainBody.update('<div id="PortletBugs-grid-defaultMess-id" style="text-align: center" class="x-grid-empty">'+_('No open bugs')+'</div>');
                  Ext.get('PortletBugs-grid-defaultMess-id').highlight();
              }
          }
        }
    });
};

//------------------------------------------------------------------------------
// PortletSummary
ui.cmp.PortletBugs = Ext.extend(Ext.ux.Portlet,
{
    title      : '',
    iconCls    : 'iconBugs',
    layout     : 'fit',
    store      : ui.cmp._PortletBugs.store,
    reloadData : ui.cmp._PortletBugs.reloadData,
    tools      : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletBugs.reloadData();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletBugsCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletBugsCollapsed',
                    value : true,
                    notify: false
                });
            }
        },
        afterrender : function(cmp) {
            if( PhDOE.user.conf.portletBugsCollapsed ) {
                cmp.collapse();
            } else {
                cmp.expand();
            }
        }
    },

    initComponent: function(config)
    {
        this.id = 'portletBugs';
        this.title   = String.format(_('Open bugs for {0}'), 'doc-' + this.lang);
        
        Ext.apply(this, config);
        
        ui.cmp.PortletBugs.superclass.initComponent.apply(this);
        this.add(new ui.cmp._PortletBugs.grid());

    }
});

// singleton
ui.cmp._PortletBugs.instance = null;
ui.cmp.PortletBugs.getInstance = function(config)
{
    if (!ui.cmp._PortletBugs.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletBugs.instance = new ui.cmp.PortletBugs(config);
    }
    return ui.cmp._PortletBugs.instance;
};Ext.namespace('ui','ui.cmp','ui.cmp._PortletInfo');

//------------------------------------------------------------------------------
// PortletInfo Internals

// Store : storeInfo
ui.cmp._PortletInfo.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getInfos'
    }),
    baseParams : {
        start : 0,
        limit : 10
    },
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'field'},
            {name : 'value'},
            {name : 'date', type : 'date', dateFormat : 'Y-m-d H:i:s' },
            {name : 'elapsedTime'}
        ]
    }),
    listeners : {
        load : function(s)
        {
            var d = s.data.items[0].data.date;
            PhDOE.lastInfoDate = d.format("Y-m-d H:i:s");
        }
    }
});
ui.cmp._PortletInfo.store.setDefaultSort('date', 'desc');

// PortletInfo cell renderer for type column
ui.cmp._PortletInfo.typeRenderer = function(value, md, record)
{
    var user, lang, nbFolders, nbFilesCreate, nbFilesDelete, nbFilesUpdate, nbFiles;

    switch (value) {

        // Update datas
        case 'updateData' :
            user = record.data.value.user;

            return String.format(
                    _('{0} updated app\'s data'),
                    user.ucFirst());

        break;
        case 'changeFilesOwner' :
            user = record.data.value.user;

            return String.format(
                    _('{0} changed file\'s owner'),
                    user.ucFirst());

        break;
        case 'checkEntities' :
            user = record.data.value.user;

            return String.format(
                    _('{0} check all entitites'),
                    user.ucFirst());

        break;

        // Login / logout
        case 'logout' :
            user = record.data.value.user;

            return String.format(
                    _('{0} logged out'),
                    user.ucFirst());

        break;
        case 'login' :
            user = record.data.value.user;
            lang = record.data.value.lang;

            return String.format(
                    _('{0} is logged in using the {1} language'),
                    user.ucFirst(),
                    lang.ucFirst());

        break;
        
        // Commit
        case 'commitFolders' :
            user      = record.data.value.user;
            lang      = record.data.value.lang;
            nbFolders = record.data.value.nbFolders;

            return String.format(
                    _('{0} committed {1} new folder(s) in the {2} language'),
                    user.ucFirst(),
                    nbFolders,
                    lang.ucFirst());

        break;
        case 'commitFiles' :
            user          = record.data.value.user;
            lang          = record.data.value.lang;
            nbFilesCreate = record.data.value.nbFilesCreate;
            nbFilesDelete = record.data.value.nbFilesDelete;
            nbFilesUpdate = record.data.value.nbFilesUpdate;
            nbFiles       = nbFilesCreate + nbFilesDelete + nbFilesUpdate;

            return String.format(
                    _('{0} committed {1} file(s) ({2} new, {3} update, {4} delete) in the language {5}'),
                    user.ucFirst(),
                    nbFiles,
                    nbFilesCreate,
                    nbFilesUpdate,
                    nbFilesDelete,
                    lang.ucFirst()
                   );

        break;

    }
};

// PortletInfo grid's columns definition
ui.cmp._PortletInfo.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id        : 'Type',
        header    : _('Type'),
        width     : 180,
        sortable  : true,
        dataIndex : 'field',
        renderer  : ui.cmp._PortletInfo.typeRenderer
    }, {
        header    : _('Since'),
        width     : 110,
        sortable  : false,
        dataIndex : 'elapsedTime',
        renderer  : function(v, m, r) {
            
            if( !v ) {
                v = _('Less than one second');
            } else {
                v = String.format(_('{0} ' + v.units), v.value);
            }
            return "<span ext:qtip='" + r.data.date.format(_('Y-m-d, H:i')) + "'>" + v + "</span>";
            
        }
    },{
        header    : _('Date'),
        width     : 110,
        sortable  : true,
        dataIndex : 'date',
        hidden    : true,
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// PortletInfo grid
ui.cmp._PortletInfo.grid = Ext.extend(Ext.grid.GridPanel,
{
    autoExpandColumn : 'Type',
    loadMask         : true,
    autoScroll       : true,
    autoHeight       : true,
    store            : ui.cmp._PortletInfo.store,
    columns          : ui.cmp._PortletInfo.gridColumns,
    view             : ui.cmp._PortletInfo.gridView,

    initComponent : function()
    {
        
        Ext.apply(this, {
            bbar: new Ext.PagingToolbar({
                pageSize: 10,
                store: this.store,
                displayInfo: true
            })
        });
        
        ui.cmp._PortletInfo.grid.superclass.initComponent.call(this);
        
        this.on('rowdblclick', this.onRowdblclick, this);
    }
});

//------------------------------------------------------------------------------
// PortletInfo
ui.cmp.PortletInfo = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Information'),
    iconCls : 'iconInfo',
    layout  : 'fit',
    store   : ui.cmp._PortletInfo.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletInfo.store.reload();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletInfoCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletInfoCollapsed',
                    value : true,
                    notify: false
                });
            }
        },
        afterrender : function(cmp) {
            if( PhDOE.user.conf.portletInfoCollapsed ) {
                cmp.collapse();
            } else {
                cmp.expand();
            }
        }
    },

    initComponent: function(config)
    {
        this.id = 'portletInfo';
        Ext.apply(this, config);
        ui.cmp.PortletInfo.superclass.initComponent.apply(this);

        this.add(new ui.cmp._PortletInfo.grid());

    }
});

// singleton
ui.cmp._PortletInfo.instance = null;
ui.cmp.PortletInfo.getInstance = function(config)
{
    if (!ui.cmp._PortletInfo.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletInfo.instance = new ui.cmp.PortletInfo(config);
    }
    return ui.cmp._PortletInfo.instance;
};Ext.namespace('ui','ui.cmp','ui.cmp._PortletLocalMail');

//------------------------------------------------------------------------------
// PortletLocalMail internals

// Store : Mailing with Informations about phpdoc-LANG mailing
ui.cmp._PortletLocalMail.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getLastNews'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'title'},
            {name : 'link'},
            {name : 'description'},
            {name : 'pubDate', type : 'date',dateFormat : 'Y/m/d H:i:s' }
        ]

    })
});
ui.cmp._PortletLocalMail.store.setDefaultSort('pubDate', 'desc');

// PortletLocalMail columns definition
ui.cmp._PortletLocalMail.columns = [
    new Ext.grid.RowNumberer(), {
        id        : 'GridMailingTitle',
        header    : _('Title'),
        sortable  : true,
        dataIndex : 'title'
    }, {
        header    : _('By'),
        width     : 100,
        sortable  : true,
        dataIndex : 'description'
    }, {
        header    : _('Date'),
        width     : 100,
        sortable  : true,
        dataIndex : 'pubDate',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// _PortletLocalMail
ui.cmp._PortletLocalMail.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    height           : 250,
    autoExpandColumn : 'GridMailingTitle',
    id               : 'PortletLocalMail-grid-id',
    store            : ui.cmp._PortletLocalMail.store,
    columns          : ui.cmp._PortletLocalMail.columns,
    sm               : new Ext.grid.RowSelectionModel({ singleSelect: true }),

    view             : new Ext.grid.GridView({
                           forceFit:true,
                           enableRowBody:true,
                           ignoreAdd: true,
                           emptyText: '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '</div>',
                           deferEmptyText: false
                       }),

    onRowDblClick : function(grid, rowIndex)
    {
        var MailId    = grid.store.getAt(rowIndex).data.pubDate,
            MailUrl   = grid.store.getAt(rowIndex).data.link,
            MailTitle = grid.store.getAt(rowIndex).data.title;

        if (!Ext.getCmp('main-panel').findById('mail-' + MailId)) {

            Ext.getCmp('main-panel').add({
                xtype      : 'panel',
                id         : 'mail-' + MailId,
                title      : Ext.util.Format.substr(MailTitle, 0, 20) + '...',
                tabTip     : MailTitle,
                iconCls    : 'iconMailing',
                closable   : true,
                layout     : 'fit',
                items: [ new Ext.ux.IFrameComponent({ id: 'frame-mail-' + MailId, url: MailUrl }) ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('mail-' + MailId);
    },

    onContextClick : function(grid, rowIndex, e)
    {
        if(!this.menu) {
            this.menu = new Ext.menu.Menu({
                id    : 'submenu-mail',
                items : [{
                    scope   : this,
                    text    : '<b>'+_('Open in a new Tab')+'</b>',
                    iconCls : 'iconOpenInTab',
                    handler : function()
                    {
                        this.fireEvent('rowdblclick', grid, this.ctxIndex, e);
                        this.menu.hide();
                    }
                }, '-', {
                    scope   : this,
                    text    : _('Refresh this grid'),
                    iconCls : 'iconRefresh',
                    handler : function()
                    {
                        this.ctxIndex = null;
                        ui.cmp._PortletLocalMail.reloadData();
                    }
                }]
            });
        }

        this.getSelectionModel().selectRow(rowIndex);
        e.stopEvent();

        if(this.ctxIndex){
            this.ctxIndex = null;
        }

        this.ctxIndex = rowIndex;
        this.menu.showAt(e.getXY());

    },

    initComponent : function(config)
    {
        ui.cmp._PortletLocalMail.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

ui.cmp._PortletLocalMail.reloadData = function() {
    ui.cmp._PortletLocalMail.store.reload({
        callback: function(r,o,s) {
          if( !s ) {
              Ext.getCmp('PortletLocalMail-grid-id').getView().mainBody.update('<div id="PortletLocalMail-grid-defaultMess-id" style="text-align: center" class="x-grid-empty">' + _('Error when loading mails from this mailing list !') + '</div>');
              Ext.get('PortletLocalMail-grid-defaultMess-id').highlight();

          }
        }
    });
};

//------------------------------------------------------------------------------
// PortletLocalMail
ui.cmp.PortletLocalMail = Ext.extend(Ext.ux.Portlet,
{
    title      : '',
    iconCls    : 'iconMailing',
    layout     : 'fit',
    store      : ui.cmp._PortletLocalMail.store,
    reloadData : ui.cmp._PortletLocalMail.reloadData,
    tools      : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletLocalMail.reloadData();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletLocalMailCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletLocalMailCollapsed',
                    value : true,
                    notify: false
                });
            }
        },
        afterrender : function(cmp) {
            if( PhDOE.user.conf.portletLocalMailCollapsed ) {
                cmp.collapse();
            } else {
                cmp.expand();
            }
        }
    },

    initComponent: function(config)
    {
        this.id = 'portletLocalMail';
        
        Ext.apply(this, config);
        ui.cmp.PortletLocalMail.superclass.initComponent.apply(this);

        this.title = String.format(_('Mail from {0}'), 'doc-' + this.lang);
        this.add(new ui.cmp._PortletLocalMail.grid());
    }
});

// singleton
ui.cmp._PortletLocalMail.instance = null;
ui.cmp.PortletLocalMail.getInstance = function(config)
{
    if (!ui.cmp._PortletLocalMail.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletLocalMail.instance = new ui.cmp.PortletLocalMail(config);
    }
    return ui.cmp._PortletLocalMail.instance;
};Ext.namespace('ui','ui.cmp','ui.cmp._PortletSummary');

//------------------------------------------------------------------------------
// PortletSummary Internals

// Store : storeSummary with Informations like Revcheck second table
ui.cmp._PortletSummary.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getSummaryInfo'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'libel'},
            {name : 'nbFiles'},
            {name : 'percentFiles'},
            {name : 'sizeFiles'},
            {name : 'percentSize'}
        ]
    }),
    listeners : {
        load : function()
        {
            this.each(function(record)
            {
                switch (record.id) {
                    case 1: record.set('libel', _('Up to date files'));                break;
                    case 2: record.set('libel', _('Stale files'));                     break;
                    case 3: record.set('libel', _('Files available for translation')); break;
                    case 4: record.set('libel', _('Total'));                           break;
                    default: record.set('libel', '');                                  break;
                }
                record.commit();
            });
        }
    }
});

// PortletSummary grid's columns definition
ui.cmp._PortletSummary.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id        : 'StatusType',
        header    : _('File status type'),
        width     : 180,
        sortable  : true,
        dataIndex : 'libel'
    }, {
        header    : _('Number of files'),
        width     : 110,
        sortable  : true,
        dataIndex : 'nbFiles'
    }, {
        header    : _('Percent of files'),
        width     : 110,
        sortable  : true,
        dataIndex : 'percentFiles'
    }, {
        header    : _('Size of files (kB)'),
        width     : 110,
        sortable  : true,
        dataIndex : 'sizeFiles'
    }, {
        header    : _('Percent of size'),
        width     : 110,
        sortable  : true,
        dataIndex : 'percentSize'
    }
];

// PortletSummary gridview
ui.cmp._PortletSummary.gridView = new Ext.grid.GridView({
    getRowClass : function(r)
    {
        switch (r.data.id) {
            case 1: return 'summary_1';
            case 2: return 'summary_2';
            case 3: return 'summary_3';
            case 4: return 'summary_4';
            default: return '';
        }
    }
});

//------------------------------------------------------------------------------
// PortletSummary grid
ui.cmp._PortletSummary.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask   : true,
    autoScroll : true,
    autoHeight : true,
    store      : ui.cmp._PortletSummary.store,
    columns    : ui.cmp._PortletSummary.gridColumns,
    view       : ui.cmp._PortletSummary.gridView,

    onRowdblclick : function ( grid, rowIndex )
    {
        var id = grid.store.getAt(rowIndex).data.id;

        // Stales files
        if( id === 2 ) {
            Ext.getCmp('acc-need-update').expand();
        }
        
        // Available for translation
        if( id === 3 ) {
            Ext.getCmp('acc-need-translate').expand();
        }
    },
    initComponent: function(config)
    {
        ui.cmp._PortletSummary.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.on('rowdblclick', this.onRowdblclick, this);
    }
});

//------------------------------------------------------------------------------
// PortletSummary
ui.cmp.PortletSummary = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Summary'),
    iconCls : '',
    layout  : 'fit',
    store   : ui.cmp._PortletSummary.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletSummary.store.reload();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletSummaryCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletSummaryCollapsed',
                    value : true,
                    notify: false
                });
            }
        }
    },

    initComponent : function(config)
    {
        this.id = 'portletSummary';
        
        Ext.apply(this, config);
        ui.cmp.PortletSummary.superclass.initComponent.apply(this);

        this.add(new ui.cmp._PortletSummary.grid());

    },

    afterRender : function()
    {
        ui.cmp.PortletSummary.superclass.afterRender.call(this);

        this.header.insertFirst({
            tag   : 'div',
            id    : Ext.id(),
            style : 'float: left; margin-right: 2px;',
            cls   : 'flags flag-'+this.lang
        }, 'first');

        if( PhDOE.user.conf.portletSummaryCollapsed ) {
            this.collapse();
        } else {
            this.expand();
        }
    }
});

// singleton
ui.cmp._PortletSummary.instance = null;
ui.cmp.PortletSummary.getInstance = function(config)
{
    if (!ui.cmp._PortletSummary.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletSummary.instance = new ui.cmp.PortletSummary(config);
    }
    return ui.cmp._PortletSummary.instance;
};Ext.namespace('ui','ui.cmp','ui.cmp._PortletTranslationGraph');

function renderLibel(v) {
 return _(v);
}

ui.cmp._PortletTranslationGraph.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getGraphLang'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'libel', convert : renderLibel},
            {name : 'total'}
        ]

    })
});

ui.cmp._PortletTranslationGraph.chart = Ext.extend(Ext.chart.PieChart,
{
    height        : 400,
    url           : 'http://extjs.cachefly.net/ext-' + ExtJsVersion + '/resources/charts.swf',
    dataField     : 'total',
    categoryField : 'libel',
    store         : ui.cmp._PortletTranslationGraph.store,
    series        :[{
        style : {
            colors : ["#68D888", "#FF6347", "#EEE8AA"]
        }
    }],
    extraStyle :
    {
        legend :
        {
            display : 'bottom',
            padding : 5,
            font    :
            {
                family : 'Tahoma',
                size   : 13
            }
         }
    },

    initComponent : function(config)
    {
        ui.cmp._PortletTranslationGraph.chart.superclass.initComponent.call(this);
        Ext.apply(this, config);
    }

});

//------------------------------------------------------------------------------
// PortletTranslationGraph
ui.cmp.PortletTranslationGraph = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Graphics'),
    iconCls : 'iconGraphic',
    layout  : 'fit',
    store   : ui.cmp._PortletTranslationGraph.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this graph'),
        handler : function() {
            ui.cmp._PortletTranslationGraph.store.reload();
        }
    }],
    initComponent : function(config)
    {
        this.id = 'portletTranslationGraph';
        Ext.apply(this, config);
        ui.cmp.PortletTranslationGraph.superclass.initComponent.apply(this);
        this.add(new ui.cmp._PortletTranslationGraph.chart());
    }

});

// singleton
ui.cmp._PortletTranslationGraph.instance = null;
ui.cmp.PortletTranslationGraph.getInstance = function(config)
{
    if (!ui.cmp._PortletTranslationGraph.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletTranslationGraph.instance = new ui.cmp.PortletTranslationGraph(config);
    }
    return ui.cmp._PortletTranslationGraph.instance;
};Ext.namespace('ui','ui.cmp','ui.cmp._PortletTranslationsGraph');

ui.cmp._PortletTranslationsGraph.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getGraphLangs'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'libel',     type : 'string'},
            {name : 'fullLibel', type : 'string'},
            {name : 'total',     type : 'int'},
            {name : 'percent',   type : 'float'}
        ]
    })
});

ui.cmp._PortletTranslationsGraph.chart = Ext.extend(Ext.chart.ColumnChart,
{
    height      : 400,
    url         : 'http://extjs.cachefly.net/ext-' + ExtJsVersion + '/resources/charts.swf',
    xField      : 'libel',
    tipRenderer : function(chart, record){
        return _('Lang:') + ' ' + record.data.fullLibel + "\r" + _('Total:') + ' ' + record.data.total + ' ' + _('files')+ ' (' + record.data.percent + '%)';
    },

    series : [{
        type        : 'column',
        displayName : 'Total',
        yField      : 'total',
        style       : {
            image :'themes/img/bar.gif',
            mode  : 'stretch',
            color : 0x99BBE8
        }
    }],
    store : ui.cmp._PortletTranslationsGraph.store,

    initComponent : function(config)
    {
        ui.cmp._PortletTranslationsGraph.chart.superclass.initComponent.call(this);
        Ext.apply(this, config);
    }

});

//------------------------------------------------------------------------------
// PortletTranslationGraph
ui.cmp.PortletTranslationsGraph = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Graphics for all languages'),
    iconCls : 'iconGraphic',
    layout  : 'fit',
    store   : ui.cmp._PortletTranslationsGraph.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this graph'),
        handler : function() {
            ui.cmp._PortletTranslationsGraph.store.reload();
        }
    }],
    initComponent : function(config)
    {
        this.id = 'portletTranslationsGraph';
        Ext.apply(this, config);
        ui.cmp.PortletTranslationsGraph.superclass.initComponent.apply(this);
        this.add(new ui.cmp._PortletTranslationsGraph.chart());
    }

});

// singleton
ui.cmp._PortletTranslationsGraph.instance = null;
ui.cmp.PortletTranslationsGraph.getInstance = function(config)
{
    if (!ui.cmp._PortletTranslationsGraph.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletTranslationsGraph.instance = new ui.cmp.PortletTranslationsGraph(config);
    }
    return ui.cmp._PortletTranslationsGraph.instance;
};Ext.namespace('ui','ui.cmp','ui.cmp._PortletTranslator');

//------------------------------------------------------------------------------
// PortletTranslator internals

// Store : Translator with Informations like Revcheck first table
ui.cmp._PortletTranslator.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url: './do/getTranslatorInfo'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'name'},
            {name : 'email',    mapping : 'mail'},
            {name : 'nick'},
            {name : 'vcs'},
            {name : 'uptodate', type : 'int'},
            {name : 'stale',    type : 'int'},
            {name : 'sum',      type : 'int' }
        ]

    })
});
ui.cmp._PortletTranslator.store.setDefaultSort('nick', 'asc');

// PortletTranslator cell renderer for translator count
ui.cmp._PortletTranslator.translatorSumRenderer = function(v)
{
    if (v) {
        v = (v === 0 || v > 1) ? v : 1;
        return String.format('('+_('{0} Translators')+')', v);
    } else {
        return false;
    }
};

// PortletTranslator cell renderer for up-to-date column
ui.cmp._PortletTranslator.uptodateRenderer = function(v)
{
    if (v === '0') {
        return false;
    } else {
        return '<span style="color:green; font-weight: bold;">' + v + '</span>';
    }
};

// PortletTranslator cell renderer for stale column
ui.cmp._PortletTranslator.staleRenderer = function(v)
{
    if (v === '0') {
        return false;
    } else {
        return '<span style="color:red; font-weight: bold;">' + v + '</span>';
    }
};

// PortletTranslator cell renderer for sum column
ui.cmp._PortletTranslator.sumRenderer = function(v)
{
    return (v === '0') ? '' : v;
};

// PortletTranslator columns definition
ui.cmp._PortletTranslator.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id              : 'GridTransName',
        header          : _('Name'),
        sortable        : true,
        dataIndex       : 'name',
        summaryType     : 'count',
        summaryRenderer : ui.cmp._PortletTranslator.translatorSumRenderer
    }, {
        header    : _('Email'),
        width     : 110,
        sortable  : true,
        dataIndex : 'email'
    }, {
        header    : _('Nick'),
        width     : 70,
        sortable  : true,
        dataIndex : 'nick'
    }, {
        header    : _('VCS'),
        width     : 45,
        sortable  : true,
        dataIndex : 'vcs'
    }, {
        header      : _('UptoDate'),
        width       : 60,
        sortable    : true,
        renderer    : ui.cmp._PortletTranslator.uptodateRenderer,
        dataIndex   : 'uptodate',
        summaryType : 'sum'
    }, {
        header      : _('Stale'),
        width       : 90,
        sortable    : true,
        renderer    : ui.cmp._PortletTranslator.staleRenderer,
        dataIndex   : 'stale',
        summaryType : 'sum'
    }, {
        header      : _('Sum'),
        width       : 50,
        sortable    : true,
        renderer    : ui.cmp._PortletTranslator.sumRenderer,
        dataIndex   : 'sum',
        summaryType : 'sum'
    }
];

//------------------------------------------------------------------------------
// PortletTranslator
ui.cmp._PortletTranslator.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    autoHeight       : true,
    plugins          : [new Ext.ux.grid.GridSummary()],
    store            : ui.cmp._PortletTranslator.store,
    columns          : ui.cmp._PortletTranslator.gridColumns,
    autoExpandColumn : 'GridTransName',
    sm               : new Ext.grid.RowSelectionModel({singleSelect:true}),
    lang             : this.lang,
    EmailPrompt      : new ui.cmp.EmailPrompt(),

    onRowDblClick : function(grid, rowIndex)
    {

        this.getSelectionModel().selectRow(rowIndex);

        if( this.ctxTranslatorName ) {
            this.ctxTranslatorEmail = null;
            this.ctxTranslatorName  = null;
        }

        this.ctxTranslatorEmail = this.store.getAt(rowIndex).data.email;
        this.ctxTranslatorName  = this.store.getAt(rowIndex).data.name;
        var nick  = this.store.getAt(rowIndex).data.nick;

        // Don't open the email Prompt if the user is "nobody"
        if( nick === 'nobody' ) {
            return;
        }

        this.EmailPrompt.setData(this.ctxTranslatorName, this.ctxTranslatorEmail);
        this.EmailPrompt.show('lastUpdateTime');
    },

    onContextClick : function(grid, rowIndex, e)
    {
        if(!this.menu) {
            this.menu = new Ext.menu.Menu({
                id    : 'submenu-translators',
                items : [{
                    scope   : this,
                    text    : '',
                    iconCls : 'iconSendEmail',
                    handler : function()
                    {
                        this.EmailPrompt.setData(this.ctxTranslatorName, this.ctxTranslatorEmail);
                        this.EmailPrompt.show('lastUpdateTime');
                    }
                }, '-', {
                    scope   : this,
                    text    : String.format(_('Send an email to the {0}'), String.format(PhDOE.app.conf.projectMailList, this.lang)),
                    iconCls : 'iconSendEmail',
                    handler : function()
                    {
                        this.EmailPrompt.setData('Php Doc Team ' + this.lang, String.format(PhDOE.app.conf.projectMailList, this.lang));
                        this.EmailPrompt.show('lastUpdateTime');
                    }
                }]
            });
        }

        this.getSelectionModel().selectRow(rowIndex);
        e.stopEvent();

        if( this.ctxTranslatorName ) {
            this.ctxTranslatorName  = null;
            this.ctxTranslatorEmail = null;
        }
        this.ctxTranslatorName  = this.store.getAt(rowIndex).data.name;
        this.ctxTranslatorEmail = this.store.getAt(rowIndex).data.email;

        var nick  = this.store.getAt(rowIndex).data.nick;

        // Don't open the contextMenu if the user is "nobody"
        if( nick === 'nobody' ) {
            return;
        }

        // Set the title for items[0]
        this.menu.items.items[0].setText('<b>' + String.format(_('Send an email to {0}'), this.ctxTranslatorName) + '</b>');

        this.menu.showAt(e.getXY());

    },

    initComponent: function(config)
    {
        ui.cmp._PortletTranslator.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

//------------------------------------------------------------------------------
// PortletTranslator
ui.cmp.PortletTranslator = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Translators'),
    iconCls : 'iconTranslator',
    layout  : 'fit',
    store   : ui.cmp._PortletTranslator.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletTranslator.store.reload();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletTranslatorCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletTranslatorCollapsed',
                    value : true,
                    notify: false
                });
            }
        },
        afterrender : function(cmp) {
            if( PhDOE.user.conf.portletTranslatorCollapsed ) {
                cmp.collapse();
            } else {
                cmp.expand();
            }
        }
    },

    initComponent : function(config)
    {
        this.id = 'portletTranslator';
        
        Ext.apply(this, config);
        ui.cmp.PortletTranslator.superclass.initComponent.apply(this);

        this.add(new ui.cmp._PortletTranslator.grid({lang: this.lang}));

    }
});

// singleton
ui.cmp._PortletTranslator.instance = null;
ui.cmp.PortletTranslator.getInstance = function(config)
{
    if (!ui.cmp._PortletTranslator.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletTranslator.instance = new ui.cmp.PortletTranslator(config);
    }
    return ui.cmp._PortletTranslator.instance;
};Ext.namespace('ui', 'ui.cmp', 'ui.cmp._RepositoryTree');

//------------------------------------------------------------------------------
// RepositoryTree internals

// RepositoryTree root node
ui.cmp._RepositoryTree.root = {
    nodeType: 'async',
    id: '/',
    text: _('Repository'),
    draggable: false
};

// RepositoryTree default tree loader
ui.cmp._RepositoryTree.loader = new Ext.tree.TreeLoader({
    dataUrl: './do/getAllFiles'
});

// RepositoryTree : window to add a new file
ui.cmp._RepositoryTree.winAddNewFile = Ext.extend(Ext.Window, {
    title: _('Add a new file'),
    iconCls: 'iconFilesNeedTranslate',
    id: 'win-add-new-file',
    layout: 'form',
    width: 350,
    height: 170,
    resizable: false,
    modal: true,
    bodyStyle: 'padding:5px 5px 0',
    labelWidth: 150,
    buttons: [{
        id: 'win-add-new-file-btn',
        text: _('Open the editor'),
        disabled: true,
        handler: function(){
            var cmp = Ext.getCmp('win-add-new-file'), parentFolder = cmp.node.id, newFileName = cmp.items.items[1].getValue(), skeleton = cmp.items.items[2].getValue();
            
            if (cmp.node.findChild("id", parentFolder + "/" + newFileName)) {
                // This file already exist.
                PhDOE.winForbidden('file_already_exist');
                return true;
            }
            
            cmp.openFile(parentFolder + "/", newFileName, skeleton);
            cmp.close();
            return true;
            
        }
    }],
    
    openFile: function(FilePath, FileName, skeleton){
        var FileID = Ext.util.md5('FNT-' + FilePath + FileName), storeRecord = {
            data: {
                fileModified: false,
                node: this.node
            }
        }, // simulate a needCommit option to fit with the classic comportement of FNT panel
        t = FilePath.split('/'), FileLang;
        
        t.shift();
        
        FileLang = t[0];
        
        t.shift();
        t.pop();
        
        FilePath = '/' + t.join('/') + '/';
        if (FilePath === "//") {
            FilePath = "/";
        }
        
        FileID = Ext.util.md5('FNT-' + FilePath + FileName);
        
        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNT-' + FileID)) {
        
            Ext.getCmp('main-panel').add({
                id: 'FNT-' + FileID,
                layout: 'border',
                title: FileName,
                originTitle: FileName,
                iconCls: 'iconTabNeedTranslate',
                closable: true,
                tabLoaded: false,
                panTRANSLoaded: false,
                panGGTRANSLoaded: true, // Simulate true for google translate panel
                defaults: {
                    split: true
                },
                tabTip: String.format(_('New file: in {0}'), FileLang + FilePath),
                items: [new ui.cmp.FilePanel({
                    id: 'FNT-NEW-PANEL-' + FileID,
                    region: 'center',
                    title: _('New file: ') + FileLang + FilePath + FileName,
                    isTrans: true,
                    prefix: 'FNT',
                    ftype: 'NEW',
                    spellCheck: PhDOE.user.conf.newFile.enableSpellCheck,
                    spellCheckConf: { module : 'newFile', itemName : 'enableSpellCheck' },
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: FileLang,
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScrollCB: false,
                    syncScroll: false,
                    skeleton: skeleton
                })]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNT-' + FileID);
    },
    
    initComponent: function(){
        Ext.apply(this, {
            items: [{
                xtype: 'displayfield',
                fieldLabel: _('Parent Folder'),
                value: this.node.id
            }, {
                xtype: 'textfield',
                fieldLabel: _('Name for the new file'),
                name: 'newFolderName',
                listeners: {
                    valid: function(){
                        Ext.getCmp('win-add-new-file-btn').enable();
                    },
                    invalid: function(){
                        Ext.getCmp('win-add-new-file-btn').disable();
                    }
                }
            }, {
                xtype: 'combo',
                triggerAction: 'all',
                width: 160,
                editable: false,
                store: new Ext.data.Store({
                    proxy: new Ext.data.HttpProxy({
                        url: './do/getSkeletonsNames'
                    }),
                    reader: new Ext.data.JsonReader({
                        root: 'Items',
                        idProperty: 'name',
                        fields: [{
                            name: 'name'
                        }, {
                            name: 'path'
                        }]
                    })
                }),
                listeners: {
                    select: function(c, r, n){
                        // If we haven't set any name for this file, we put the name of the skeleton
                        if (c.ownerCt.items.items[1].getValue() === "") {
                            c.ownerCt.items.items[1].setValue(r.data.name);
                        }
                        
                    }
                },
                valueField: 'path',
                displayField: 'name',
                fieldLabel: _('Chose a skeleton')
            }]
        });
        ui.cmp._RepositoryTree.winAddNewFile.superclass.initComponent.call(this);
    }
});

// RepositoryTree : window to add a new folder
ui.cmp._RepositoryTree.winAddNewFolder = Ext.extend(Ext.Window, {
    title: _('Add a new folder'),
    iconCls: 'iconFolderNew',
    id: 'win-add-new-folder',
    layout: 'form',
    width: 350,
    height: 200,
    resizable: false,
    modal: true,
    bodyStyle: 'padding:5px 5px 0',
    labelWidth: 150,
    buttons: [{
        id: 'win-add-new-folder-btn',
        text: 'Add',
        disabled: true,
        handler: function(){
            var cmp = Ext.getCmp('win-add-new-folder'),
                parentFolder = cmp.node.id,
                newFolderName = cmp.items.items[1].getValue();
            
            XHR({
                params: {
                    task: 'addNewFolder',
                    parentFolder: parentFolder,
                    newFolderName: newFolderName
                },
                success: function(){
                    Ext.getCmp('win-add-new-folder').close();
                    
                    cmp.node.reload();
                    
                    // Notify
                    PhDOE.notify('info', _('Folder created'), String.format(_('Folder <br><br><b>{0}</b><br><br> was created sucessfully under {1} !'), newFolderName, parentFolder));
                },
                failure: function(r){
                    //Ext.getCmp('win-add-new-folder').close();
                    var o = Ext.util.JSON.decode(r.responseText);
                    
                    if (o.type) {
                        PhDOE.winForbidden(o.type);
                    }
                    else {
                        PhDOE.winForbidden();
                    }
                }
            });
        }
    }],
    initComponent: function(){
        Ext.apply(this, {
            items: [{
                xtype: 'displayfield',
                fieldLabel: _('Parent Folder'),
                value: this.node.id
            }, {
                xtype: 'textfield',
                fieldLabel: _('Name for the new folder'),
                name: 'newFolderName',
                vtype: 'alphanum',
                listeners: {
                    valid: function(){
                        Ext.getCmp('win-add-new-folder-btn').enable();
                    },
                    invalid: function(){
                        Ext.getCmp('win-add-new-folder-btn').disable();
                    }
                }
            }, {
                xtype: 'box',
                html: _('Info: This new folder won\'t be commited until a new file will be commited into it. If you don\'t commit any new file into it until 8 days, it will be automatically deleted.')
            }]
        });
        ui.cmp._RepositoryTree.winAddNewFolder.superclass.initComponent.call(this);
    }
});

Ext.namespace('ui.cmp._RepositoryTree.menu');
// RepositoryTree folder context menu
// config - { node }
ui.cmp._RepositoryTree.menu.folder = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._RepositoryTree.menu.folder.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._RepositoryTree.menu.folder, Ext.menu.Menu, {
    init: function(){
        Ext.apply(this, {
            items: [{
                text: (this.node.isExpanded()) ? '<b>' + _('Collapse') + '</b>' : '<b>' + _('Expand') + '</b>',
                iconCls: 'iconFolderClose',
                scope: this,
                handler: function(){
                    if (this.node.isExpanded()) {
                        this.node.collapse();
                    }
                    else {
                        this.node.expand();
                    }
                }
            }, '-', {
                text: _('Update this folder'),
                iconCls: 'iconFilesNeedUpdate',
                scope: this,
                handler: function(){
                    // We start by expand this node.
                    this.node.expand();
                    
                    //... and fire the update processus
                    new ui.task.UpdateSingleFolderTask(this.node);
                }
            }, {
                text: _('Add a new folder'),
                iconCls: 'iconFolderNew',
                hidden: (this.node.id === '/' ||
                (Ext.util.Format.substr(this.node.id, 0, 3) !== '/en' && Ext.util.Format.substr(this.node.id, 0, 9) !== '/doc-base')), // Don't allow to add a new folder into root system & in others root folder than /en & /doc-base
                scope: this,
                handler: function(){
                    // We start by expand this node.
                    this.node.expand();
                    
                    // We display the Add New Folder window
                    var win = new ui.cmp._RepositoryTree.winAddNewFolder({
                        node: this.node
                    });
                    win.show(this.node.ui.getEl());
                }
            }, {
                text: _('Add a new file'),
                iconCls: 'iconFilesNeedTranslate',
                hidden: (this.node.id === '/' ||
                (Ext.util.Format.substr(this.node.id, 0, 3) !== '/en' && Ext.util.Format.substr(this.node.id, 0, 9) !== '/doc-base')), // Don't allow to add a new folder into root system & in others root folder than /en & /doc-base
                scope: this,
                handler: function(){
                    // We start by expand this node.
                    this.node.expand();
                    
                    // We display the Add New Folder window
                    var win = new ui.cmp._RepositoryTree.winAddNewFile({
                        node: this.node
                    });
                    win.show(this.node.ui.getEl());
                }
            }]
        });
    }
});

// RepositoryTree file context menu
// config - { node }
ui.cmp._RepositoryTree.menu.file = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._RepositoryTree.menu.file.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._RepositoryTree.menu.file, Ext.menu.Menu, {
    init: function(){
        var FileName = this.node.attributes.text, t = this.node.attributes.id.split('/'), FileLang, FilePath;
        
        t.shift();
        FileLang = t[0];
        t.shift();
        t.pop();
        
        FilePath = t.join('/') + '/';
        
        Ext.apply(this, {
            items: [{
                text: '<b>' + _('Edit in a new tab') + '</b>',
                iconCls: 'iconTabNeedReviewed',
                scope: this,
                handler: function(){
                    ui.cmp._RepositoryTree.instance.fireEvent('dblclick', this.node);
                }
            }, {
                hidden: (this.node.attributes.from === 'search' || PhDOE.user.lang === 'en'),
                text: (FileLang === 'en') ? String.format(_('Open the same file in <b>{0}</b>'), Ext.util.Format.uppercase(PhDOE.user.lang)) : String.format(_('Open the same file in <b>{0}</b>'), 'EN'),
                iconCls: 'iconTabNeedReviewed',
                scope: this,
                handler: function(){
                    if (FileLang === 'en') {
                        ui.cmp._RepositoryTree.instance.openFile('byPath', PhDOE.user.lang + '/' + FilePath, FileName);
                    }
                    else {
                        ui.cmp._RepositoryTree.instance.openFile('byPath', 'en/' + FilePath, FileName);
                    }
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// RepositoryTree
ui.cmp.RepositoryTree = Ext.extend(Ext.ux.MultiSelectTreePanel, {
    animate: true,
    enableDD: true,
    ddGroup: 'mainPanelDDGroup',
    useArrows: true,
    autoScroll: true,
    border: false,
    containerScroll: true,
    root: ui.cmp._RepositoryTree.root,
    loader: ui.cmp._RepositoryTree.loader,
    
    onContextMenu: function(node, e){
        e.stopEvent();
        node.select();
        
        if (node.attributes.type === 'folder' || node.isRoot) {
            new ui.cmp._RepositoryTree.menu.folder({
                node: node
            }).showAt(e.getXY());
        }
        else 
            if (node.attributes.type === 'file') {
                new ui.cmp._RepositoryTree.menu.file({
                    node: node
                }).showAt(e.getXY());
            }
    },
    
    onDblClick: function(node){
        if (node.attributes.type === 'file') // files only
        {
            this.openFile('byId', node.attributes.id, false);
        }
    },
    
    openFile: function(ftype, first, second){
        
        // Here, first argument is fpath and second, fname
        if (ftype === 'byPath') {
            Ext.getCmp('acc-all-files').expand();
            
            var fpath = first, fname = second, t = fpath.split('/'), cb = function(node){
                node.ensureVisible();
                if (t[0] && t[0] !== '') {
                    // walk into childs
                    for (var j = 0; j < node.childNodes.length; ++j) {
                        if (node.childNodes[j].text === t[0]) {
                            t.shift();
                            node.childNodes[j].expand(false, true, cb.createDelegate(this));
                        }
                    }
                }
                else {
                    // leaf node
                    for (var i = 0; i < node.childNodes.length; ++i) {
                        if (node.childNodes[i].text === fname) {
                            node.childNodes[i].ensureVisible();
                            node.childNodes[i].ui.highlight();
                            this.openFile('byId', node.childNodes[i].id, false);
                            //this.fireEvent('dblclick', node.childNodes[i]);
                        }
                    }
                }
            };
            this.root.expand(false, true, cb.createDelegate(this));
        }
        
        // Here, first argument is a nodeID. Second arguments don't exist
        if (ftype === 'byId') {
            var node = this.getNodeById(first), FilePath = node.attributes.id, extension = node.attributes.extension, t, FileID, FileLang, FileName, parser, panelWest, panelCenter;
            
            // CleanUp the path
            t = FilePath.split('/');
            t.shift();
            
            FileName = t.pop();
            
            FileLang = t.shift();
            FilePath = (t.length > 0) ? '/' + t.join('/') + '/' : '/';
            
            FileID = Ext.util.md5('AF-' + FileLang + FilePath + FileName);
            
            // Render only if this tab don't exist yet
            if (!Ext.getCmp('main-panel').findById('AF-' + FileID)) {
            
                if (extension !== 'html') {
                    parser = extension;
                }
                else {
                    parser = 'xml';
                }
                
                if (extension === 'gif' || extension === 'png') {
                    panelWest = {};
                    
                    panelCenter = {
                        id: 'AF' + '-ALL-FILE-' + FileID, // We fake the content ID to allow closing this panel
                        xtype: 'panel',
                        region: 'center',
                        layout: 'fit',
                        bodyStyle: 'padding:5px 5px 0',
                        html: '<img src="./do/getImageContent?' +
                        'FileLang=' +
                        FileLang +
                        '&' +
                        'FilePath=' +
                        FilePath +
                        '&' +
                        'FileName=' +
                        FileName +
                        '" />'
                    };
                    
                }
                else {
                
                    panelWest = {
                        xtype: 'panel',
                        region: 'west',
                        title: _('Tools'),
                        iconCls: 'iconConf',
                        collapsedIconCls: 'iconConf',
                        plugins: [Ext.ux.PanelCollapsedTitle],
                        layout: 'fit',
                        bodyBorder: false,
                        split: true,
                        collapsible: true,
                        collapsed: !PhDOE.user.conf.allFiles.toolsPanelDisplay,
                        width: PhDOE.user.conf.allFiles.toolsPanelWidth || 375,
                        listeners: {
                            collapse: function(){
                                if (this.ownerCt.tabLoaded) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'allFiles',
                                        itemName : 'toolsPanelDisplay',
                                        value: false,
                                        notify: false
                                    });
                                }
                            },
                            expand: function(){
                                if (this.ownerCt.tabLoaded) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'allFiles',
                                        itemName : 'toolsPanelDisplay',
                                        value: true,
                                        notify: false
                                    });
                                }
                            },
                            resize: function(a, newWidth){
                                if (this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.user.conf.allFiles.toolsPanelWidth) { // As the type is different, we can't use !== to compare with !
                                    new ui.task.UpdateConfTask({
                                        module     : 'allFiles',
                                        itemName   : 'toolsPanelWidth',
                                        value: newWidth,
                                        notify: false
                                    });
                                }
                            }
                        },
                        items: {
                            xtype: 'tabpanel',
                            activeTab: 0,
                            defaults: {
                                autoScroll: true
                            },
                            items: [{
                                title: _('Log'),
                                layout: 'fit',
                                items: [new ui.cmp.VCSLogGrid({
                                    prefix: 'AF',
                                    fid: FileID,
                                    fpath: FileLang + FilePath,
                                    fname: FileName,
                                    loadStore: PhDOE.user.conf.allFiles.toolsPanelLogLoad
                                })]
                            }, {
                                title: _('Entities'),
                                layout: 'fit',
                                items: [new ui.cmp.EntitiesAcronymsPanel({
                                    dataType: 'entities',
                                    prefix: 'AF',
                                    ftype: 'ALL',
                                    fid: FileID,
                                    loadStore: PhDOE.user.conf.allFiles.toolsPanelEntitiesLoad
                                })]
                            }, {
                                title: _('Acronyms'),
                                layout: 'fit',
                                items: [new ui.cmp.EntitiesAcronymsPanel({
                                    dataType: 'acronyms',
                                    prefix: 'AF',
                                    ftype: 'ALL',
                                    fid: FileID,
                                    loadStore: PhDOE.user.conf.allFiles.toolsPanelAcronymsLoad
                                })]
                            }]
                        }
                    };
                    
                    panelCenter = new ui.cmp.FilePanel({
                        id: 'AF' + '-ALL-PANEL-' + FileID,
                        region: 'center',
                        title: _('File: ') + FileLang + FilePath + FileName,
                        prefix: 'AF',
                        ftype: 'ALL',
                        spellCheck: PhDOE.user.conf.allFiles.enableSpellCheck,
                        spellCheckConf: {module : 'allFiles', itemName : 'enableSpellCheck'},
                        fid: FileID,
                        fpath: FilePath,
                        fname: FileName,
                        lang: FileLang,
                        parser: parser,
                        storeRecord: node,
                        syncScrollCB: false,
                        syncScroll: false
                    });
                }
                
                Ext.getCmp('main-panel').add({
                    id: 'AF-' + FileID,
                    layout: 'border',
                    title: FileName,
                    originTitle: FileName,
                    closable: true,
                    tabLoaded: false,
                    panEntities: !PhDOE.user.conf.allFiles.toolsPanelEntitiesLoad,
                    panAcronyms: !PhDOE.user.conf.allFiles.toolsPanelAcronymsLoad,
                    panVCS: !PhDOE.user.conf.allFiles.toolsPanelLogLoad,
                    panLoaded: false,
                    tabTip: String.format(_('in {0}'), FilePath),
                    iconCls: 'iconAllFiles',
                    items: [panelCenter, panelWest]
                });
            }
            Ext.getCmp('main-panel').setActiveTab('AF-' + FileID);
        }
    },
    
    initComponent: function(){
        Ext.apply(this, {
            tbar: [_('Search: '), ' ', new Ext.form.TwinTriggerField({
                id: 'AF-search',
                validationEvent: false,
                validateOnBlur: false,
                trigger1Class: 'x-form-clear-trigger',
                trigger2Class: 'x-form-search-trigger',
                hideTrigger1: true,
                width: 180,
                enableKeyEvents: true,
                listeners: {
                    keypress: function(field, e){
                        if (e.getKey() === e.ENTER) {
                            this.onTrigger2Click();
                        }
                    }
                },
                onTrigger1Click: function(){
                    var instance = ui.cmp._RepositoryTree.instance;
                    this.setValue('');
                    this.triggers[0].hide();
                    this.setSize(180, 10);
                    instance.root.setText(_('Repository'));
                    
                    // clear search
                    delete instance.loader.baseParams.search;
                    instance.root.reload();
                },
                onTrigger2Click: function(){
                    var instance = ui.cmp._RepositoryTree.instance, v = this.getValue();
                    
                    if (v === '' || v.length < 3) {
                        this.markInvalid(_('Your search must contain at least 3 characters'));
                        return;
                    }
                    this.clearInvalid();
                    
                    this.triggers[0].show();
                    this.setSize(180, 10);
                    
                    // carry search
                    instance.loader.baseParams.search = v;
                    instance.root.reload(function(){
                        instance.root.setText(String.format(_('Search result: {0}'), instance.root.childNodes.length));
                    });
                }
            })]
        });
        ui.cmp.RepositoryTree.superclass.initComponent.call(this);
        
        this.on('contextmenu', this.onContextMenu, this);
        this.on('dblclick', this.onDblClick, this);
        
        new Ext.tree.TreeSorter(this, {
            folderSort: true
        });
    }
});

// singleton
ui.cmp._RepositoryTree.instance = null;
ui.cmp.RepositoryTree.getInstance = function(config){
    if (!ui.cmp._RepositoryTree.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._RepositoryTree.instance = new ui.cmp.RepositoryTree(config);
    }
    return ui.cmp._RepositoryTree.instance;
};
Ext.namespace('ui', 'ui.cmp', 'ui.cmp._StaleFileGrid');

//------------------------------------------------------------------------------
// StaleFileGrid data store

ui.cmp._StaleFileGrid.store = new Ext.data.GroupingStore({
    proxy: new Ext.data.HttpProxy({
        url: './do/getFilesNeedUpdate'
    }),
    reader: new Ext.data.JsonReader({
        root: 'Items',
        totalProperty: 'nbItems',
        idProperty: 'id',
        fields: [{
            name: 'id'
        }, {
            name: 'path'
        }, {
            name: 'name'
        }, {
            name: 'revision'
        }, {
            name: 'original_revision'
        }, {
            name: 'en_revision'
        }, {
            name: 'maintainer'
        }, {
            name: 'fileModifiedEN'
        }, {
            name: 'fileModifiedLang'
        }]
    }),
    sortInfo: {
        field: 'name',
        direction: 'ASC'
    },
    groupField: 'path',
    listeners: {
        datachanged: function(ds){
            Ext.getDom('acc-need-update-nb').innerHTML = ds.getCount();
        }
    }
});

// StaleFileGrid view
ui.cmp._StaleFileGrid.view = new Ext.grid.GroupingView({
    forceFit: true,
    startCollapsed: true,
    groupTextTpl: '{[values.rs[0].data["path"]]} ' +
    '({[values.rs.length]} ' +
    '{[values.rs.length > 1 ? "' +
    _('Files') +
    '" : "' +
    _('File') +
    '"]})',
    deferEmptyText: false,
    getRowClass: function(r){
        if (r.data.fileModifiedEN || r.data.fileModifiedLang) {
        
            var infoEN = Ext.util.JSON.decode(r.data.fileModifiedEN), infoLang = Ext.util.JSON.decode(r.data.fileModifiedLang);
            
            return ((infoEN.user === PhDOE.user.login && infoEN.anonymousIdent === PhDOE.user.anonymousIdent) ||
            (infoLang.user === PhDOE.user.login && infoLang.anonymousIdent === PhDOE.user.anonymousIdent)) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
        }
        
        return false;
    },
    emptyText: '<div style="text-align: center;">' + _('No Files') + '</div>'
});

// StaleFileGrid columns definition
ui.cmp._StaleFileGrid.columns = [{
    id: 'name',
    header: _('Files'),
    sortable: true,
    dataIndex: 'name',
    renderer: function(v, metada, r){
    
        var mess = '', infoEN, infoLang;
        
        if (r.data.fileModifiedEN) {
        
            infoEN = Ext.util.JSON.decode(r.data.fileModifiedEN);
            
            if (infoEN.user === PhDOE.user.login && infoEN.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess = _('File EN modified by me') + "<br>";
            }
            else {
                mess = String.format(_('File EN modified by {0}'), infoEN.user.ucFirst()) + "<br>";
            }
        }
        
        if (r.data.fileModifiedLang) {
        
            infoLang = Ext.util.JSON.decode(r.data.fileModifiedLang);
            
            if (infoLang.user === PhDOE.user.login && infoLang.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess += String.format(_('File {0} modified by me'), PhDOE.user.lang.ucFirst());
            }
            else {
                mess += String.format(_('File {0} modified by {1}'), PhDOE.user.lang.ucFirst(), infoLang.user.ucFirst());
            }
        }
        
        if (mess !== '') {
            return "<span ext:qtip='" + mess + "'>" + v + "</span>";
        }
        else {
            return v;
        }
    }
}, {
    header: _('EN revision'),
    width: 45,
    sortable: true,
    dataIndex: 'en_revision'
}, {
    header: '', // bounded in StaleFileGrid.initComponent
    width: 45,
    sortable: true,
    dataIndex: 'revision'
}, {
    header: _('Maintainer'),
    width: 45,
    sortable: true,
    dataIndex: 'maintainer'
}, {
    header: _('Path'),
    dataIndex: 'path',
    'hidden': true
}];

// StaleFileGrid context menu
// config - { hideDiffMenu, grid, rowIdx, event, lang, fpath, fname }
ui.cmp._StaleFileGrid.menu = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._StaleFileGrid.menu.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._StaleFileGrid.menu, Ext.menu.Menu, {
    init: function(){
        Ext.apply(this, {
            items: [{
                scope: this,
                text: '<b>' + _('Edit in a new tab') + '</b>',
                iconCls: 'iconTabNeedUpdate',
                handler: function(){
                    this.grid.fireEvent('rowdblclick', this.grid, this.rowIdx, this.event);
                }
            }, {
                scope: this,
                hidden: this.hideDiffMenu,
                text: _('View diff...'),
                iconCls: 'iconViewDiff',
                menu: new Ext.menu.Menu({
                    items: [{
                        scope: this,
                        hidden: (this.grid.store.getAt(this.rowIdx).data.fileModifiedEN === false),
                        text: String.format(_('... of the {0} file'), 'EN'),
                        handler: function(){
                            Ext.getCmp('main-panel').openDiffTab({
                                DiffType: 'file',
                                FileName: this.fname,
                                FilePath: 'en'+this.fpath
                            });
                        }
                    }, {
                        scope: this,
                        hidden: (this.grid.store.getAt(this.rowIdx).data.fileModifiedLang === false),
                        text: String.format(_('... of the {0} file'), PhDOE.user.lang.ucFirst()),
                        handler: function(){
                            Ext.getCmp('main-panel').openDiffTab({
                                DiffType: 'file',
                                FileName: this.fname,
                                FilePath: PhDOE.user.lang+this.fpath
                            });
                        }
                    }]
                })
            }]
        });
    }
});


//------------------------------------------------------------------------------
// StaleFileGrid
ui.cmp.StaleFileGrid = Ext.extend(Ext.grid.GridPanel, {
    view: ui.cmp._StaleFileGrid.view,
    loadMask: true,
    autoExpandColumn: 'name',
    border: false,
    enableDragDrop: true,
    ddGroup: 'mainPanelDDGroup',
    
    onRowContextMenu: function(grid, rowIndex, e){
        e.stopEvent();
        
        var data = this.store.getAt(rowIndex).data, FilePath = data.path, FileName = data.name;
        
        this.getSelectionModel().selectRow(rowIndex);
        
        new ui.cmp._StaleFileGrid.menu({
            hideDiffMenu: (data.fileModifiedEN === false && data.fileModifiedLang === false),
            grid: this,
            event: e,
            rowIdx: rowIndex,
            lang: PhDOE.user.lang,
            fpath: FilePath,
            fname: FileName
        }).showAt(e.getXY());
    },
    
    onRowDblClick: function(grid, rowIndex){
        this.openFile(this.store.getAt(rowIndex).data.id);
    },
    
    openFile: function(rowId){
        var storeRecord = this.store.getById(rowId), FilePath = storeRecord.data.path, FileName = storeRecord.data.name, en_revision = storeRecord.data.en_revision, revision = storeRecord.data.revision, originalRevision = storeRecord.data.original_revision, FileID = Ext.util.md5('FNU-' + PhDOE.user.lang + FilePath + FileName), diff = '';
        
        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNU-' + FileID)) {
        
            if (PhDOE.user.conf.needUpdate.diffMethod === "using-viewvc") {
                diff = ui.cmp.ViewVCDiff;
            }
            else 
                if (PhDOE.user.conf.needUpdate.diffMethod === "using-exec") {
                    diff = ui.cmp.ExecDiff;
                }
            
            Ext.getCmp('main-panel').add({
                id: 'FNU-' + FileID,
                layout: 'border',
                title: FileName,
                originTitle: FileName,
                iconCls: 'iconTabNeedUpdate',
                closable: true,
                tabLoaded: false,
                panVCSLang: !PhDOE.user.conf.needUpdate.toolsPanelLogLoad,
                panVCSEn: !PhDOE.user.conf.needUpdate.toolsPanelLogLoad,
                panDiffLoaded: (PhDOE.user.conf.needUpdate.diffMethod === "using-viewvc"),
                panLANGLoaded: false,
                panENLoaded: false,
                defaults: {
                    split: true
                },
                tabTip: String.format(_('Need Update: in {0}'), FilePath),
                listeners: {
                    resize: function(panel){
                        Ext.getCmp('FNU-EN-PANEL-' + FileID).setWidth(panel.getWidth() / 2);
                    }
                },
                items: [new diff({
                    region: 'north',
                    collapsible: true,
                    height: PhDOE.user.conf.needUpdate.diffPanelHeight || 150,
                    prefix: 'FNU',
                    collapsed: !PhDOE.user.conf.needUpdate.diffPanelDisplay,
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    rev1: (originalRevision) ? originalRevision : revision,
                    rev2: en_revision,
                    listeners: {
                        collapse: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'diffPanelDisplay',
                                    value: false,
                                    notify: false
                                });
                            }
                        },
                        expand: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'diffPanelDisplay',
                                    value: true,
                                    notify: false
                                });
                            }
                        },
                        resize: function(a, b, newHeight){
                        
                            if (this.ownerCt.tabLoaded && newHeight && newHeight > 50 && newHeight != PhDOE.user.conf.needUpdate.diffPanelHeight) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    module     : 'needUpdate',
                                    itemName   : 'diffPanelHeight',
                                    value: newHeight,
                                    notify: false
                                });
                            }
                        }
                    }
                }), {
                    region: 'west',
                    xtype: 'panel',
                    title: _('Tools'),
                    iconCls: 'iconConf',
                    collapsedIconCls: 'iconConf',
                    collapsible: true,
                    collapsed: !PhDOE.user.conf.needUpdate.toolsPanelDisplay,
                    layout: 'fit',
                    bodyBorder: false,
                    plugins: [Ext.ux.PanelCollapsedTitle],
                    width: PhDOE.user.conf.needUpdate.toolsPanelWidth || 375,
                    listeners: {
                        collapse: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelDisplay',
                                    value: false,
                                    notify: false
                                });
                            }
                        },
                        expand: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelDisplay',
                                    value: true,
                                    notify: false
                                });
                            }
                        },
                        resize: function(a, newWidth){
                            if (this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.user.conf.needUpdate.toolsPanelWidth) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    module     : 'needUpdate',
                                    itemName   : 'toolsPanelWidth',
                                    value: newWidth,
                                    notify: false
                                });
                            }
                        }
                    },
                    items: {
                        xtype: 'tabpanel',
                        activeTab: 0,
                        tabPosition: 'bottom',
                        enableTabScroll: true,
                        defaults: {
                            autoScroll: true
                        },
                        items: [new ui.cmp.VCSLogGrid({
                            layout: 'fit',
                            title: String.format(_('{0} Log'), PhDOE.user.lang.ucFirst()),
                            prefix: 'FNU-LANG',
                            fid: FileID,
                            fpath: PhDOE.user.lang + FilePath,
                            fname: FileName,
                            loadStore: PhDOE.user.conf.needUpdate.toolsPanelLogLoad
                        }), new ui.cmp.VCSLogGrid({
                            layout: 'fit',
                            title: String.format(_('{0} Log'), 'En'),
                            prefix: 'FNU-EN',
                            fid: FileID,
                            fpath: 'en' + FilePath,
                            fname: FileName,
                            loadStore: PhDOE.user.conf.needUpdate.toolsPanelLogLoad
                        }), new ui.cmp.DictionaryGrid({
                            layout: 'fit',
                            title: _('Dictionary'),
                            prefix: 'FNU',
                            fid: FileID
                        })]
                    }
                }, new ui.cmp.FilePanel({
                    id: 'FNU-LANG-PANEL-' + FileID,
                    region: 'center',
                    title: String.format(_('{0} File: '), PhDOE.user.lang) + FilePath + FileName,
                    prefix: 'FNU',
                    ftype: 'LANG',
                    spellCheck: PhDOE.user.conf.needUpdate.enableSpellCheckLang,
                    spellCheckConf: { module : 'needUpdate', itemName : 'enableSpellCheckLang' },
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: PhDOE.user.lang,
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScrollCB: true,
                    syncScroll: true,
                    syncScrollConf: { module : 'needUpdate', itemName : 'syncScrollbars' }
                }), new ui.cmp.FilePanel({
                    id: 'FNU-EN-PANEL-' + FileID,
                    region: 'east',
                    title: _('en File: ') + FilePath + FileName,
                    prefix: 'FNU',
                    ftype: 'EN',
                    spellCheck: PhDOE.user.conf.needUpdate.enableSpellCheckEn,
                    spellCheckConf: { module : 'needUpdate', itemName : 'enableSpellCheckEn' },
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: 'en',
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScroll: true,
                    syncScrollConf: { module : 'needUpdate', itemName : 'syncScrollbars' }
                })]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNU-' + FileID);
    },
    
    initComponent: function(){
        ui.cmp._StaleFileGrid.columns[2].header = String.format(_('{0} revision'), Ext.util.Format.uppercase(PhDOE.user.lang));
        
        Ext.apply(this, {
            columns: ui.cmp._StaleFileGrid.columns,
            store: ui.cmp._StaleFileGrid.store,
            tbar: [_('Filter: '), ' ', new Ext.form.TwinTriggerField({
                id: 'FNU-filter',
                width: 180,
                hideTrigger1: true,
                enableKeyEvents: true,
                validateOnBlur: false,
                validationEvent: false,
                trigger1Class: 'x-form-clear-trigger',
                trigger2Class: 'x-form-search-trigger',
                listeners: {
                    specialkey: function(field, e){
                        if (e.getKey() === e.ENTER) {
                            this.onTrigger2Click();
                        }
                    }
                },
                onTrigger1Click: function(){
                    this.setValue('');
                    this.triggers[0].hide();
                    this.setSize(180, 10);
                    ui.cmp._StaleFileGrid.instance.store.clearFilter();
                },
                onTrigger2Click: function(){
                    var v = this.getValue(), regexp;
                    
                    if (v === '' || v.length < 3) {
                        this.markInvalid(_('Your filter must contain at least 3 characters'));
                        return;
                    }
                    this.clearInvalid();
                    this.triggers[0].show();
                    this.setSize(180, 10);
                    
                    regexp = new RegExp(v, 'i');
                    
                    // We filter on 'path', 'name', 'revision', 'en_revision', 'maintainer'
                    ui.cmp._StaleFileGrid.instance.store.filterBy(function(record){
                    
                        if (regexp.test(record.data.path) ||
                        regexp.test(record.data.name) ||
                        regexp.test(record.data.revision) ||
                        regexp.test(record.data.en_revision) ||
                        regexp.test(record.data.maintainer)) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }, this);
                }
            })]
        });
        ui.cmp.StaleFileGrid.superclass.initComponent.call(this);
        
        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick', this.onRowDblClick, this);
    }
});

// singleton
ui.cmp._StaleFileGrid.instance = null;
ui.cmp.StaleFileGrid.getInstance = function(config){
    if (!ui.cmp._StaleFileGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._StaleFileGrid.instance = new ui.cmp.StaleFileGrid(config);
    }
    return ui.cmp._StaleFileGrid.instance;
};
Ext.namespace('ui','ui.cmp');

ui.cmp.SystemUpdatePrompt = Ext.extend(Ext.Window,
{
    id        : 'sys-update-win',
    title     : _('Refresh all data'),
    layout    : 'form',
    width     : 300,
    height    : 200,
    resizable : false,
    modal     : true,
    bodyStyle : 'padding:15px 15px 0',
    iconCls   : 'iconRefresh',
    html      : [
        '<div id="wizard-step-1" class="wizard-step-before">',
            _('Update all files from VCS'),
        '</div>',
        '<div id="wizard-step-1.1" class="wizard-wait">',
            _('This may take time. Thank you for your patience...'),
        '</div>',
        '<div id="wizard-step-2" class="wizard-step-before">',
            _('Apply all tools'),
        '</div>',
        '<div id="wizard-step-3" class="wizard-step-before">',
            _('Reload data'),
        '</div>'
    ].join(''),
    buttons : [{
        id      : 'btn-start-refresh',
        text    : _('Start'),
        iconCls : 'iconStartRefresh',
        handler : function()
        {
            // Disable start button
            Ext.getCmp('btn-start-refresh').disable();

            // Disable the close button for this win
            this.ownerCt.ownerCt.tools.close.setVisible(false);

            new ui.task.SystemUpdateTask();
        }
    }]
});Ext.namespace('ui','ui.cmp','ui.cmp._VCSLogGrid');

//------------------------------------------------------------------------------
// VCSLogGrid internals

// VCSLogGrid log information store
ui.cmp._VCSLogGrid.store = Ext.extend(Ext.data.Store,
{
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'revision'},
            {name : 'date', type : 'date',dateFormat : 'Y-m-d H:i:s' },
            {name : 'author'},
            {name : 'content'}
        ]
    })
});

// VCSLogGrid selection model
// config - {fid}
ui.cmp._VCSLogGrid.sm = Ext.extend(Ext.grid.CheckboxSelectionModel,
{
    singleSelect : false,
    header       : '',
    width        : 22,

    listeners : {
        beforerowselect : function(sm)
        {
            var nbRowsSelected = sm.getCount();
            if (nbRowsSelected === 2) {
                return false;
            }
            return true;
        },
        rowselect : function(sm)
        {
            var nbRowsSelected = sm.getCount();
            if (nbRowsSelected === 2) {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).enable();
                Ext.get(sm.prefix + '-PANEL-btn-log-' + sm.fid).frame("3F8538");
            } else {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).disable();
            }
        },
        rowdeselect : function(sm)
        {
            var nbRowsSelected = sm.getCount();
            if (nbRowsSelected === 2) {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).enable();
                Ext.get(sm.prefix + '-PANEL-btn-log-' + sm.fid).frame("3F8538");
            } else {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).disable();
            }
        }
    }
});

// VCSLogGrid columns definition
ui.cmp._VCSLogGrid.columns = [
    {
        id        : 'id',
        header    : _('Rev.'),
        width     : 40,
        sortable  : false,
        dataIndex : 'revision'
    }, {
        header    : _('Content'),
        width     : 130,
        sortable  : true,
        dataIndex : 'content'
    }, {
        header    : _('By'),
        width     : 50,
        sortable  : true,
        dataIndex : 'author'
    }, {
        header    : _('Date'),
        width     : 85,
        sortable  : true,
        dataIndex : 'date',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// VCSLogGrid
// config - {prefix, fid, fpath, fname, loadStore}
ui.cmp.VCSLogGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    bodyBorder       : false,
    border           : false,
    autoExpandColumn : 'content',

    initComponent : function()
    {
        var sm = new ui.cmp._VCSLogGrid.sm({
            fid    : this.fid,
            prefix : this.prefix
        }),
        store = new ui.cmp._VCSLogGrid.store({
            autoLoad : this.loadStore,
            proxy : new Ext.data.HttpProxy({
                url : './do/getLog'
            }),
            baseParams : {
                Path : this.fpath,
                File : this.fname
            },
            listeners: {
                scope: this,
                load: function(store, records) {

                    // FNU Panel
                    if( this.prefix === 'FNU-EN' ) {
                        Ext.getCmp('FNU-' + this.fid).panVCSEn = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FNU', this.fid);
                    }
                    if( this.prefix === 'FNU-LANG' ) {
                        Ext.getCmp('FNU-' + this.fid).panVCSLang = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FNU', this.fid);
                    }

                    // FE panel
                    if( this.prefix === 'FE-EN' ) {
                        Ext.getCmp('FE-' + this.fid).panVCSEn = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FE', this.fid);
                    }
                    if( this.prefix === 'FE-LANG' ) {
                        Ext.getCmp('FE-' + this.fid).panVCSLang = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FE', this.fid);
                    }

                    // FE panel
                    if( this.prefix === 'FNR-EN' ) {
                        Ext.getCmp('FNR-' + this.fid).panVCSEn = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FNR', this.fid);
                    }
                    if( this.prefix === 'FNR-LANG' ) {
                        Ext.getCmp('FNR-' + this.fid).panVCSLang = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FNR', this.fid);
                    }

                    // AF panel
                    if( this.prefix === 'AF' ) {
                        Ext.getCmp('AF-' + this.fid).panVCS = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'AF', this.fid);
                    }

                    // PP panel
                    if( this.prefix === 'PP' ) {
                        Ext.getCmp('PP-' + this.fid).panVCS = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'PP', this.fid);
                    }
                }
            }
        }),
        columns = [], i;

        columns.push(sm);
        for (i = 0; i < ui.cmp._VCSLogGrid.columns.length; ++i) {
            columns.push(ui.cmp._VCSLogGrid.columns[i]);
        }

        store.setDefaultSort('date', 'desc');

        Ext.apply(this,
        {
            sm      : sm,
            store   : store,
            columns : columns,
            view    : new Ext.grid.GridView({
                forceFit      : true, 
                emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '<br><br>'+_('(You can change this behavior by setting an option in the configuration window)') + '</div>',
                deferEmptyText: false
            }),
            tbar : [{
                scope   : this,
                id      : this.prefix + '-PANEL-btn-refreshlog-' + this.fid,
                tooltip : _('<b>Load/Refresh</b> revisions'),
                iconCls : 'iconRefresh',
                handler : function()
                {
                    this.store.reload();
                }
            }, {
                scope    : this,
                id       : this.prefix + '-PANEL-btn-log-' + this.fid,
                tooltip  : _('<b>View</b> the diff'),
                iconCls  : 'iconViewDiff',
                disabled : true,
                handler  : function()
                {
                    var s    = this.getSelectionModel().getSelections(),
                        rev1 = s[0].data.revision,
                        rev2 = s[1].data.revision;

                    Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> '+_('Finding the diff. Please, wait...'));

                    // Load diff data
                    XHR({
                        params : {
                            task     : 'getDiff',
                            DiffType : 'vcs',
                            FilePath : this.fpath,
                            FileName : this.fname,
                            Rev1     : rev1,
                            Rev2     : rev2
                        },
                        success : function(r)
                        {
                            var o = Ext.util.JSON.decode(r.responseText), winStatus;

                            Ext.getBody().unmask();

                            // We display in diff window
                            winStatus = new Ext.Window({
                                title      : String.format(_('Diff between {0} & {1}'), rev1, rev2),
                                width      : 650,
                                height     : 350,
                                resizable  : false,
                                modal      : true,
                                autoScroll : true,
                                bodyStyle  : 'background-color: white; padding: 5px;',
                                html       : '<div class="diff-content">' + o.content + '</div>',
                                buttons    : [{
                                    text    : _('Close'),
                                    handler : function()
                                    {
                                        winStatus.close();
                                    }
                                }]
                            });
                            winStatus.show();
                        }
                    });
                }
            }]
        });
        ui.cmp.VCSLogGrid.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp');

// ViewVCDiff
// config - {prefix, fid, fpath, fname, rev1, rev2}
ui.cmp.ViewVCDiff = Ext.extend(Ext.Panel,
{
    layout           : 'fit',
    title            : _('Diff From VCS'),
    iconCls          : 'iconDiffView',
    collapsedIconCls : 'iconDiffView',
    plugins          : [Ext.ux.PanelCollapsedTitle],

    initComponent    : function()
    {
        Ext.apply(this,
        {
            items : {
                id         : this.prefix + '-diff-' + this.fid,
                xtype      : 'panel',
                layout     : 'fit',
                items      : [
                    new Ext.ux.IFrameComponent({
                        id  : 'frame-' + this.prefix + '-diff-' + this.fid,
                        url : String.format(PhDOE.app.conf.viewVcUrl, this.fpath + this.fname, this.rev1, this.rev2)
                    })
                ]
            }
        });
        ui.cmp.ViewVCDiff.superclass.initComponent.call(this);
    }
});Ext.namespace('ui', 'ui.cmp', 'ui.cmp._WorkTreeGrid', 'ui.cmp._WorkTreeGrid.menu');

//------------------------------------------------------------------------------
// WorkTreeGrid internals
ui.cmp._WorkTreeGrid.SetProgress = new Ext.util.DelayedTask(function(){
    new ui.task.SetFileProgressTask({
        idDB: this.node.attributes.idDB,
        progress: this.node.attributes.progress
    });
});

// WorkTreeGrid : adminstrator items for the context menu
// config - { module, from, node, folderNode, userNode }

ui.cmp._WorkTreeGrid.menu.admin = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.admin.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.admin, Ext.menu.Item, {
    init: function() {
        
        var items;
        
        switch(this.from) {
            case 'file' :
                items = [{
                    scope: this,
                    iconCls: 'iconSwitchLang',
                    text: _('Change file\'s owner'),
                    handler: function()
                    {
                        new ui.cmp.ChangeFileOwner({
                            fileIdDB: this.node.attributes.idDB,
                            fileLang: this.fileLang,
                            fileFolder: this.folderNode.attributes.task,
                            fileName: this.node.attributes.task,
                            currentOwner: this.userNode.attributes.task
                        });
                    }
                },{
                    scope: this,
                    iconCls: 'iconPageDelete',
                    text: ((this.node.attributes.type === 'delete') ? _('Cancel this deletion') : _('Clear this change')),
                    handler: function()
                    {
                        new ui.task.ClearLocalChangeTask({
                            ftype: this.node.attributes.type,
                            fpath: this.folderNode.attributes.task,
                            fname: this.node.attributes.task
                        });
                    }
                }];
                break;
                
            case 'patch' :
                items = [{
                    scope: this,
                    iconCls: 'iconTrash',
                    text: _('Delete this patch'),
                    handler: function()
                    {
                        ui.task.DeletePatchTask({
                            patchID: this.node.attributes.idDB
                        });
                    }
                }];
                break;
        }
        
        Ext.apply(this, {
            text: _('Administrator menu'),
            iconCls: 'iconAdmin',
            handler: function(){
                return false;
            },
            menu: new Ext.menu.Menu({
                items: items
            })
        });
    }
});



// WorkTreeGrid : commit items for the context menu
// config - { module, from, node, folderNode, userNode }
ui.cmp._WorkTreeGrid.menu.commit = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.commit.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.commit, Ext.menu.Item, {
    init: function(){

        Ext.apply(this, {
            text: _('Commit...'),
            iconCls: 'iconCommitFileVcs',
            disabled: (PhDOE.user.isAnonymous),
            handler: function(){
                return false;
            },
            menu: new Ext.menu.Menu({
                items: [{
                    scope: this,
                    text: _('...this file'),
                    hidden: (this.from === 'user' || this.from === 'folder' || this.from === 'patch'),
                    iconCls: 'iconCommitFileVcs',
                    handler: function(){
                        
                        var file = [{
                            fid: Ext.util.md5(this.folderNode.attributes.task + this.node.attributes.task),
                            fpath: this.folderNode.attributes.task,
                            fname: this.node.attributes.task,
                            fdbid: this.node.attributes.idDB,
                            ftype: this.node.attributes.type,
                            fdate: Date.parseDate(this.node.attributes.last_modified,'Y-m-d H:i:s'),
                            fby: this.userNode.attributes.task
                        }];
                        
                        new ui.cmp.CommitPrompt({
                            files: file
                        }).show();
                    }
                }, {
                    scope: this,
                    text: _('...all files from this folder'),
                    hidden: (this.from === 'user' || this.from === 'patch'),
                    iconCls: 'iconCommitFileVcs',
                    handler: function(){
                        var files = [];
                        
                        this.folderNode.cascade(function(node){
                            if (node.attributes.type !== 'folder' && node.attributes.type !== 'user') {
                                files.push({
                                    fid: Ext.util.md5(this.folderNode.attributes.task + node.attributes.task),
                                    fpath: this.folderNode.attributes.task,
                                    fname: node.attributes.task,
                                    fdbid: node.attributes.idDB,
                                    ftype: node.attributes.type,
                                    fdate: Date.parseDate(node.attributes.last_modified,'Y-m-d H:i:s'),
                                    fby: this.userNode.attributes.task
                                });
                            }
                        }, this);
                        
                        new ui.cmp.CommitPrompt({
                            files: files
                        }).show();
                        
                    }
                }, {
                    scope: this,
                    text: _('...all files from this patch'),
                    hidden: (this.module !== 'patches' || this.from === 'user'),
                    iconCls: 'iconCommitFileVcs',
                    handler: function(){
                        var files = [];
                        
                        this.patchNode.cascade(function(node){
                            if (node.attributes.type !== 'folder' && node.attributes.type !== 'user' && node.attributes.type !== 'patch') {
                                files.push({
                                    fid: Ext.util.md5(node.parentNode.attributes.task + node.attributes.task),
                                    fpath: node.parentNode.attributes.task,
                                    fname: node.attributes.task,
                                    fdbid: node.attributes.idDB,
                                    ftype: node.attributes.type,
                                    fdate: Date.parseDate(node.attributes.last_modified,'Y-m-d H:i:s'),
                                    fby: this.userNode.attributes.task
                                });
                            }
                        }, this);
                        
                        new ui.cmp.CommitPrompt({
                            files: files
                        }).show();
                        
                    }
                }, {
                    scope: this,
                    text: _('...all files modified by me'),
                    iconCls: 'iconCommitFileVcs',
                    handler: function(){
                        var files = [];
                        
                        this.userNode.cascade(function(node){
                            if (node.attributes.type !== 'folder' && node.attributes.type !== 'user' && node.attributes.type !== 'patch') {
                                files.push({
                                    fid: Ext.util.md5(node.parentNode.attributes.task + node.attributes.task),
                                    fpath: node.parentNode.attributes.task,
                                    fname: node.attributes.task,
                                    fdbid: node.attributes.idDB,
                                    ftype: node.attributes.type,
                                    fdate: Date.parseDate(node.attributes.last_modified,'Y-m-d H:i:s'),
                                    fby: this.userNode.attributes.task
                                });
                            }
                        }, this);
                        
                        new ui.cmp.CommitPrompt({
                            files: files
                        }).show();
                    }
                }]
            })
        });
    }
});

ui.cmp._WorkTreeGrid.menu.usersPatch = function(config){
    Ext.apply(this, config);
    
    var menu = Ext.getCmp(this.menuID), newItem, patchesList;
    
    if (!menu.itemRendered) {
        menu.removeAll();
        menu.doLayout();
        
        patchesList = ui.cmp.PatchesTreeGrid.getInstance().getUserPatchesList();
        
        if (patchesList) {
        
            Ext.each(patchesList, function(item){
            
                newItem = new Ext.menu.Item({
                    id: Ext.id(),
                    text: item.attributes.task,
                    handler: function(){
                        ui.task.MoveToPatch({
                            patchID: item.attributes.idDB,
                            patchName: item.attributes.task,
                            nodesToAdd: menu.nodesToAdd
                        });
                    }
                });
                menu.add(newItem);
                
            }, this);
            
        }
        else {
            newItem = new Ext.menu.Item({
                disabled: true,
                text: _('You have no patch currently. You must create one.')
            });
            menu.add(newItem);
        }
        
        // Set the default action : Add a new patch
        newItem = new Ext.menu.Item({
            text: _('Create a new patch'),
            iconCls: 'iconAdd',
            handler: function(){
                var win = new ui.cmp.ManagePatchPrompt({
                    title: _('Create a new patch'),
                    nodesToAdd: menu.nodesToAdd
                });
                win.show(this.el);
            }
        });
        menu.add('-', newItem);
        
        menu.doLayout();
        menu.itemRendered = true;
    }
    
};


// WorkTreeGrid : context menu for users items
// config - { node }
ui.cmp._WorkTreeGrid.menu.users = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.users.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.users, Ext.menu.Menu, {
    listeners: {
        show: function(){
            if (this.node.attributes.task === PhDOE.user.login) {
                ui.cmp._WorkTreeGrid.menu.usersPatch({
                    menuID: 'usersPatchesMenu'
                });
            }
        }
    },
    
    init: function(){
        var allFiles = [], items;
        
        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'user' && node.attributes.type !== 'folder') {
                allFiles.push(node);
            }
        }, this);
        
        items = (this.node.attributes.task === PhDOE.user.login) ? [{
            text: _('Submit all files for review in patch:'),
            iconCls: 'iconPendingPatch',
            handler: function(){
                return false;
            },
            menu: new Ext.menu.Menu({
                id: 'usersPatchesMenu',
                itemRendered: false,
                nodesToAdd: allFiles
            })
        }, {
            xtype: 'menuseparator',
            hidden: (PhDOE.user.isAnonymous)
        }, 

        (( !PhDOE.user.isAnonymous ) ?
            new ui.cmp._WorkTreeGrid.menu.commit({
                from: 'user',
                node: false,
                folderNode: false,
                userNode: this.node
            }) : ''
        )
        ] : [{
            scope: this,
            text: String.format(_('Send an email to {0}'), "<b>" + this.node.attributes.task.ucFirst() + "</b>"),
            iconCls: 'iconSendEmail',
            hidden: (this.node.attributes.email === 'false'),
            handler: function(){
                var win = new ui.cmp.EmailPrompt();
                
                win.setData(this.node.attributes.task, this.node.attributes.email);
                win.show(this.node.el);
            }
        }];
        
        Ext.apply(this, {
            items: items
        });
    }
});

// WorkTreeGrid : context menu for folders items
// config - { node }
ui.cmp._WorkTreeGrid.menu.folders = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.folders.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.folders, Ext.menu.Menu, {
    listeners: {
        show: function(){
        
            if (this.node.parentNode.attributes.task === PhDOE.user.login) {
                ui.cmp._WorkTreeGrid.menu.usersPatch({
                    menuID: 'foldersPatchesMenu'
                });
            }
        }
    },
    
    init: function(){
        var allFiles = [];
        
        // We don't display all of this menu if the current user isn't the owner
        if (this.node.parentNode.attributes.task !== PhDOE.user.login) {
            return false;
        }
        
        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder') {
                allFiles.push(node);
            }
        }, this);
        
        
        Ext.apply(this, {
            items: [{
                text: _('Submit all files in this directory in patch:'),
                iconCls: 'iconPendingPatch',
                handler: function(){
                    return false;
                },
                menu: new Ext.menu.Menu({
                    id: 'foldersPatchesMenu',
                    itemRendered: false,
                    nodesToAdd: allFiles
                })
            }, {
                xtype: 'menuseparator',
                hidden: (PhDOE.user.isAnonymous)
            },
            ((!PhDOE.user.isAnonymous) ?
                new ui.cmp._WorkTreeGrid.menu.commit({
                    from: 'folder',
                    node: false,
                    folderNode: this.node,
                    userNode: this.node.parentNode
                }) : ''
            )]
        });
    }
});



// WorkTreeGrid : context menu for files items
// config - { node, progressValue }
ui.cmp._WorkTreeGrid.menu.files = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.files.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.files, Ext.menu.Menu, {
    listeners: {
        show: function(){
            if (this.node.parentNode.parentNode.attributes.task === PhDOE.user.login) {
                ui.cmp._WorkTreeGrid.menu.usersPatch({
                    menuID: 'filePatchesMenu'
                });
            }
        }
    },
    
    init: function(){
        var node = this.node, FileType = node.attributes.type, FileLang, FilePath = node.parentNode.attributes.task, FileName = node.attributes.task, treeGrid = node.ownerTree, owner = node.parentNode.parentNode.attributes.task, allFiles = [], tmp;
        
        // Get the lang of this file
        tmp = node.parentNode.attributes.task.split('/');
        FileLang = tmp[0];
        
        allFiles.push(this.node);
        
        Ext.apply(this, {
            items: [{
                text: '<b>' + ((FileType === 'delete') ? _('View in a new tab') : _('Edit in a new tab')) + '</b>',
                iconCls: 'iconEdit',
                handler: function(){
                    treeGrid.openFile(node);
                }
            }, {
                text: _('Submit as patch for review in:'),
                iconCls: 'iconPendingPatch',
                hidden: (owner !== PhDOE.user.login),
                handler: function(){
                    return false;
                },
                menu: new Ext.menu.Menu({
                    id: 'filePatchesMenu',
                    itemRendered: false,
                    nodesToAdd: allFiles
                })
            }, {
                text: _('Set the progress...'),
                iconCls: 'iconProgress',
                hidden: (FileType === 'delete' || owner !== PhDOE.user.login),
                menu: {
                    xtype: 'menu',
                    showSeparator: false,
                    items: [{
                        xtype: 'slider',
                        width: 200,
                        value: this.node.attributes.progress,
                        increment: 10,
                        minValue: 0,
                        maxValue: 100,
                        plugins: new Ext.slider.Tip({
                            getText: function(thumb){
                                return String.format('<b>' + _('{0}% complete') + '</b>', thumb.value);
                            }
                        }),
                        refreshNodeColumns: function(n){
                            var t = n.getOwnerTree(), a = n.attributes, cols = t.columns, el = n.ui.getEl().firstChild, cells = el.childNodes, i, d, v, len;
                            
                            for (i = 1, len = cols.length; i < len; i++) {
                                d = cols[i].dataIndex;
                                v = (a[d] !== null) ? a[d] : '';
                                
                                if (cols[i].tpl && cols[i].tpl.html === "{progress:this.formatProgress}") {
                                    cells[i].firstChild.innerHTML = cols[i].tpl.apply('out:' + v);
                                }
                            }
                        },
                        listeners: {
                            scope: this,
                            change: function(s, n){
                                this.node.attributes.progress = n;
                                s.refreshNodeColumns(this.node);
                                
                                ui.cmp._WorkTreeGrid.SetProgress.delay(1000, null, this);
                            }
                        }
                    }]
                }
            }, '-', {
                scope: this,
                text: _('View diff'),
                iconCls: 'iconViewDiff',
                hidden: (FileType === 'delete' || FileType === 'new'),
                handler: function(){
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FileName: FileName,
                        FilePath: FilePath
                    });
                }
            }, {
                text: _('Download the diff as a patch'),
                iconCls: 'iconDownloadDiff',
                hidden: (FileType === 'delete' || FileType === 'new'),
                handler: function(){
                    window.location.href = './do/downloadPatch' +
                    '?FilePath=' +
                    FilePath +
                    '&FileName=' +
                    FileName;
                }
            }, {
                xtype: 'menuseparator',
                hidden: owner !== PhDOE.user.login
            }, {
                text: ((FileType === 'delete') ? _('Cancel this deletion') : _('Clear this change')),
                iconCls: 'iconPageDelete',
                hidden: owner !== PhDOE.user.login,
                handler: function(){
                    
                    new ui.task.ClearLocalChangeTask({
                        ftype: FileType,
                        fpath: FilePath,
                        fname: FileName
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: (PhDOE.user.isAnonymous || owner !== PhDOE.user.login)
            }, ((owner === PhDOE.user.login && !PhDOE.user.isAnonymous) ? new ui.cmp._WorkTreeGrid.menu.commit({
                from: 'file',
                node: this.node,
                folderNode: this.node.parentNode,
                userNode: this.node.parentNode.parentNode
            }) : ''),
            {
                xtype: 'menuseparator',
                hidden: ( !PhDOE.user.isGlobalAdmin && !(PhDOE.user.lang === FileLang && PhDOE.user.isLangAdmin) )
            },
                (( PhDOE.user.isGlobalAdmin || (PhDOE.user.lang === FileLang && PhDOE.user.isLangAdmin) ) ? new ui.cmp._WorkTreeGrid.menu.admin({
                    fileLang: FileLang,
                    from: 'file',
                    node: this.node,
                    folderNode: this.node.parentNode,
                    userNode: this.node.parentNode.parentNode
                }) : '')
            ]
        });
    }
});

//------------------------------------------------------------------------------
// WorkTreeGrid
ui.cmp.WorkTreeGrid = Ext.extend(Ext.ux.tree.TreeGrid, {
    onContextMenu: function(node, e){
        e.stopEvent();
        
        var type = node.attributes.type, contextMenu;
        
        switch (type) {
        
            case "user":
                // We only select this row/ If there is multi-selection, this clear the selection and select only the current one.
                node.select();
                
                contextMenu = new ui.cmp._WorkTreeGrid.menu.users({
                    node: node
                });
                break;
                
            case "folder":
                node.select();
                contextMenu = new ui.cmp._WorkTreeGrid.menu.folders({
                    node: node
                });
                break;
                
            default: // Use default for file as the type can be update, delete or new
                node.select();
                contextMenu = new ui.cmp._WorkTreeGrid.menu.files({
                    node: node
                });
                break;
                
        }
        
        contextMenu.showAt(e.getXY());
        
    },
    
    initComponent: function(){
        
        function renderProgress(v, p){
            p.css += ' x-grid3-progresscol';
            
            return String.format('<div class="x-progress-wrap"><div class="x-progress-inner"><div class="x-progress-bar{0}" style="width:{1}%;">{2}</div></div>', this.getStyle(v), (v / this.ceiling) * 100, this.getText(v));
        }
        
        Ext.apply(this, {
            animate: true,
            useArrows: true,
            autoScroll: true,
            border: false,
            containerScroll: true,
            defaults: {
                autoScroll: true
            },
            selModel: new Ext.tree.MultiSelectionModel(),
            columns: [{
                // By default, it's the first column who is an autoExpandColumn
                header: _('Users'),
                dataIndex: 'task',
                tpl: new Ext.XTemplate('{task:this.formatUserName}', {
                    formatUserName: function(v, data){
                        // Only ucFirst user's name
                        return (data.type === 'user') ? v.ucFirst() : v;
                    }
                    
                })
            }, {
                header: _('Last modified'),
                width: 120,
                dataIndex: 'last_modified',
                align: 'center',
                tpl: new Ext.XTemplate('{last_modified:this.formatDate}', {
                    formatDate: function(v, data){
                        if( data.type !== 'user' && data.type !== 'folder' ) {
                            return Date.parseDate(v, 'Y-m-d H:i:s').format(_('Y-m-d, H:i'));
                        } else {
                            return '';
                        }
                    }
                })
            }, {
                header: _('Estimated progress'),
                dataIndex: 'progress',
                width: 100,
                align: 'center',
                tpl: new Ext.XTemplate('{progress:this.formatProgress}', {
                    formatProgress: function(v, v2){
                    
                        // We re-use this template from the slider. So, we must use this hack to pass the new value
                        if (Ext.util.Format.substr(v2, 0, 4) === 'out:') {
                            var t = v2.split(':');
                            v = t[1];
                        }
                        
                        if (!v && v !== 0) {
                            return '';
                        }
                        
                        function getText(v){
                            var textClass = (v < (100 / 2)) ? 'x-progress-text-back' : 'x-progress-text-front' +
                            (Ext.isIE6 ? '-ie6' : ''), text;
                            
                            // ugly hack to deal with IE6 issue
                            text = String.format('</div><div class="x-progress-text {0}" style="width:100%;" id="{1}">{2}</div></div>', textClass, Ext.id(), v + '%');
                            
                            return (v < (100 / 1.05)) ? text.substring(0, text.length - 6) : text.substr(6);
                        }
                        
                        function getStyle(v){
                            if (v <= 100 && v > (100 * 0.67)) {
                                return '-green';
                            }
                            if (v < (100 * 0.67) && v > (100 * 0.33)) {
                                return '-orange';
                            }
                            if (v < (100 * 0.33)) {
                                return '-red';
                            }
                            return '';
                        }
                        
                        return String.format('<div class="x-progress-wrap"><div class="x-progress-inner"><div class="x-progress-bar{0}" style="width:{1}%;">{2}</div></div>', getStyle(v), (v / 100) * 100, getText(v));
                    }
                })
            
            }],
            loader: {
                dataUrl: './do/getWork',
                baseParams: {
                    module: 'workInProgress'
                }
            }
        });
        ui.cmp.WorkTreeGrid.superclass.initComponent.call(this);
        
        this.on('contextmenu', this.onContextMenu, this);
        this.on('resize', this.resizeCmp, this);
        this.on('dblclick', this.openFile, this);
        
        this.getRootNode().on('beforechildrenrendered', function(){
            this.updateFilesCounter.defer(200, this);
        }, this);
    },
    
    resizeCmp: function(c, a, b, w){
    
        this.columns[0].width = w - (this.columns[1].width + this.columns[2].width + 5);
        this.updateColumnWidths();
    },
                  
    delRecord: function(fid){
        var rootNode = this.getRootNode(), i, j, h, user, folder, file;
        
        for (i = 0; i < rootNode.childNodes.length; i++) {
            user = rootNode.childNodes[i];
            
            for (j = 0; j < user.childNodes.length; j++) {
                folder = user.childNodes[j];
                
                for (h = 0; h < folder.childNodes.length; h++) {
                    file = folder.childNodes[h];
                    
                    if (file.attributes.idDB === fid) {
                    
                        file.remove(true);
                        
                        // Is Folder contains some others child ?
                        if (Ext.isEmpty(folder.childNodes)) {
                        
                            folder.remove(true);
                            
                            // Is User contains some others child ?
                            if (Ext.isEmpty(user.childNodes)) {
                            
                                user.remove(true);
                                
                                this.updateFilesCounter();
                                return;
                            }
                            this.updateFilesCounter();
                            return;
                        }
                        this.updateFilesCounter();
                        return;
                    }
                }
                
            }
        }
        
        // We update the FilesCounter
        this.updateFilesCounter();
    },
    
    addToWork: function(nodesToAdd){
        var rootNode, userNode, folderNode, type, iconCls, fileNode, nowDate, i;
        
        rootNode = this.getRootNode();
        
        // We start by searching if this user have a node
        userNode = rootNode.findChild('task', PhDOE.user.login);
        
        // If the user node don't exist, we create it
        if (!userNode) {
        
            userNode = new Ext.tree.TreeNode({
                task: PhDOE.user.login,
                type: 'user',
                email: PhDOE.user.email,
                iconCls: 'iconUser',
                expanded: true
            });
            
            rootNode.appendChild(userNode);
            rootNode.expand(); // This allow to show our new node
        }
        
        if (nodesToAdd) {
        
            // We walk into the nodes to add
            for (i = 0; i < nodesToAdd.length; i++) {
            
                // We search now into this patch the right folder
                folderNode = userNode.findChild('task', nodesToAdd[i].parentNode.attributes.task);
                
                // If this folder don't exist, we create it
                if (!folderNode) {
                
                    folderNode = new Ext.tree.TreeNode({
                        task: nodesToAdd[i].parentNode.attributes.task,
                        type: 'folder',
                        iconCls: 'iconFolderOpen',
                        expanded: true
                    });
                    
                    userNode.appendChild(folderNode);
                    userNode.expand(); // This allow to show our new node
                }
                
                // We add now this file into this folder
                type = nodesToAdd[i].attributes.type;
                
                if (type === 'update') {
                    iconCls = 'iconRefresh';
                }
                if (type === 'new') {
                    iconCls = 'iconNewFiles';
                }
                if (type === 'delete') {
                    iconCls = 'iconTrash';
                }
                
                nowDate = new Date();
                
                fileNode = new Ext.tree.TreeNode({
                    task: nodesToAdd[i].attributes.task,
                    type: type,
                    iconCls: iconCls,
                    expanded: true,
                    last_modified: nowDate.format('Y-m-d H:i:s'),
                    progress: nodesToAdd[i].attributes.progress,
                    idDB: nodesToAdd[i].attributes.idDB
                });
                
                folderNode.appendChild(fileNode);
                folderNode.expand(); // This allow to show our new node
            }
            
        } // End of adding folders/files into this patch
        // We update the FilesCounter
        this.updateFilesCounter();
        
    },
    
    addRecord: function(fid, fpath, fname, type){
        var rootNode = this.getRootNode(), userNode, folderNode, fileNode, nowDate, iconCls;
        
        // We start by searching if this user have a node
        userNode = rootNode.findChild('task', PhDOE.user.login);
        
        // If the user node don't exist, we create it
        if (!userNode) {
        
            userNode = new Ext.tree.TreeNode({
                task: PhDOE.user.login,
                type: 'user',
                email: PhDOE.user.email,
                iconCls: 'iconUser',
                expanded: true,
                nbFiles: 1
            });
            
            rootNode.appendChild(userNode);
            rootNode.expand(); // This allow to show our new node
        }
        
        // We search now into this user the right folder
        folderNode = userNode.findChild('task', fpath);
        
        // If this folder don't exist, we create it
        if (!folderNode) {
        
            folderNode = new Ext.tree.TreeNode({
                task: fpath,
                type: 'folder',
                iconCls: 'iconFolderOpen',
                expanded: true
            });
            
            userNode.appendChild(folderNode);
            userNode.expand(); // This allow to show our new node
        }
        
        // We search now into this folder the right file
        fileNode = folderNode.findChild('task', fname);
        
        // If this folder don't exist, we create it
        if (!fileNode) {
        
            if (type === 'update') {
                iconCls = 'iconRefresh';
            }
            if (type === 'new') {
                iconCls = 'iconNewFiles';
            }
            if (type === 'delete') {
                iconCls = 'iconTrash';
            }
            
            nowDate = new Date();
            
            fileNode = new Ext.tree.TreeNode({
                task: fname,
                type: type,
                iconCls: iconCls,
                expanded: true,
                last_modified: nowDate.format('Y-m-d H:i:s'),
                progress: 100,
                idDB: fid
            });
            
            folderNode.appendChild(fileNode);
            folderNode.expand(); // This allow to show our new node
        }
        
        // We update the FilesCounter
        this.updateFilesCounter();
    },
    
    countFiles: function(){
        var rootNode = this.getRootNode(), nbFiles = 0;
        
        rootNode.cascade(function(node){
            if( !node.isRoot && node.attributes.type !== 'user' && node.attributes.type !== 'folder' ) {
                if (node.parentNode.parentNode.attributes.task === PhDOE.user.login) {
                    nbFiles++;
                }
            }
        }, this);

        return nbFiles;
    },
    
    updateFilesCounter: function(){
        var count = this.countFiles();
        
        Ext.getDom('acc-work-in-progress-nb').innerHTML = count;
        
    },
    
    openFile: function(node){
        var FileType = node.attributes.type, FilePath = node.parentNode.attributes.task, FileName = node.attributes.task, tmp;
        
        if (FileType === 'user' || FileType === 'folder') {
            return false;
        }
        
        tmp = FilePath.split('/');
        FileLang = tmp[0];
        tmp.shift();
        
        FilePath = "/" + tmp.join('/');
        
        switch (FileType) {
            case "new":
                // Find the id of this row into PendingTranslateGrid.store and open it !
                ui.cmp.PendingTranslateGrid.getInstance().store.each(function(row){
                    if ((row.data.path) === FilePath && row.data.name === FileName) {
                        ui.cmp.PendingTranslateGrid.getInstance().openFile(row.data.id);
                        return;
                    }
                });
                break;
                
            case "delete":
                // Find the id of this row into NotInENGrid.store and open it !
                ui.cmp.NotInENGrid.getInstance().store.each(function(row){
                
                    if ((row.data.path) === FilePath && row.data.name === FileName) {
                        ui.cmp.NotInENGrid.getInstance().openFile(row.data.id);
                        return;
                    }
                });
                break;
                
            case "update":
                // For EN file, we open this new file into the "All files" module
                if (FileLang === 'en') {
                    ui.cmp.RepositoryTree.getInstance().openFile('byPath', FileLang + FilePath, FileName);
                }
                else {
                
                    found = false;
                    
                    // Find the id of this row into StaleFileGrid.store and open it !
                    ui.cmp.StaleFileGrid.getInstance().store.each(function(row){
                    
                        if ((row.data.path) === FilePath && row.data.name === FileName) {
                            ui.cmp.StaleFileGrid.getInstance().openFile(row.data.id);
                            found = true;
                            return;
                        }
                    });
                    
                    // If we haven't found this file in StaleFileGrid, we try into File in error grid.
                    if (!found) {
                    
                        // Find the id of this row into ErrorFileGrid.store and open it !
                        ui.cmp.ErrorFileGrid.getInstance().store.each(function(row){
                        
                            if ((row.data.path) === FilePath && row.data.name === FileName) {
                                ui.cmp.ErrorFileGrid.getInstance().openFile(row.data.id);
                                found = true;
                                return;
                            }
                        });
                    }
                    
                    // If we haven't found this file in File in error grid, we search in Pending Reviewed grid.
                    if (!found) {
                    
                        // Find the id of this row into PendingReviewGrid.store and open it !
                        ui.cmp.PendingReviewGrid.getInstance().store.each(function(row){
                        
                            if ((row.data.path) === FilePath && row.data.name === FileName) {
                                ui.cmp.PendingReviewGrid.getInstance().openFile(row.data.id);
                                found = true;
                                return;
                            }
                        });
                    }
                    
                    // FallBack : We open it into "All files" modules
                    if (!found) {
                        ui.cmp.RepositoryTree.getInstance().openFile('byPath', FileLang + FilePath, FileName);
                    }
                }
                break;
        }
    }
});

// singleton
ui.cmp._WorkTreeGrid.instance = null;
ui.cmp.WorkTreeGrid.getInstance = function(config){
    if (!ui.cmp._WorkTreeGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._WorkTreeGrid.instance = new ui.cmp.WorkTreeGrid(config);
    }
    return ui.cmp._WorkTreeGrid.instance;
};
var PhDOE = function()
{
    Ext.QuickTips.init();

    return {

        /**
         * Hold user's variable such as login, configuration or email
         */
        user : {
            login: null,
            anonymousIdent: Ext.util.Cookies.get("anonymousIdent"),
            isAnonymous: null,
            isAdmin: false,
            lang: null,
            conf: '',
            email: ''
        },
        
        /**
         * Hold application's variable such as name, version or configuration
         */
        app: {
            name: 'Php Docbook Online Editor',
            ver : 'X.XX',
            loaded: false,
            uiRevision: '$Revision: 306969 $',
            conf: ''
        },

        lastInfoDate : null,

        project    : '',

        FNTfilePendingOpen   : [],
        FNUfilePendingOpen   : [],
        FEfilePendingOpen    : [],
        FNRfilePendingOpen   : [],
        FNIENfilePendingOpen : [],
        AFfilePendingOpen    : [],
        PPfilePendingOpen    : [],

        init : function()
        {
            // We load the configuration for this user
            new ui.task.LoadConfigTask();
        },

        notify : function (type, title, message) {

            var _notify, iconCls;

            if( type == 'info' ) {
                iconCls = 'iconInfo';
            }

            if( type == 'error' ) {
                iconCls = 'iconError';
            }

            _notify = new Ext.ux.Notification({
                iconCls     : iconCls,
                title       : title,
                html        : message,
                autoDestroy : true,
                hideDelay   :  5000
            });

            _notify.show(document); 

        },

        winForbidden : function(type)
        {
            var title = _('Forbidden'),
                mess  = '';

            switch (type) {
                case 'fs_error' :
                    title = _('Error');
                    mess  = _('File system error. Check read/write permission under data folder.');
                    break;
                case 'encoding_error' :
                    title = _('Error');
                    mess  = _('You have used characters that require the use of UTF-8 despite the XML header.<br>Please delete these characters or change the header of the XML file in UTF-8 ; i.e.:<br><br><center><i>&lt;?xml version="1.0" encoding="utf-8"?&gt;</i></center>');
                    break;
                case 'tabs_found' :
                    title = _('Error');
                    mess  = _('It seems that you have inserted some tabs caracters into this files. Please, replace each one by one space.<br>Tip: You can use the "Re-indent all this file" button to replace all tabs by spaces.');
                    break;
                case 'folder_already_exist' :
                    title = _('Error');
                    mess  = _('This folder already exist in the current folder.');
                    break;
                case 'file_already_exist' :
                    title = _('Error');
                    mess  = _('This file already exist in the current folder.');
                    break;
                case 'save_you_cant_modify_it' :
                    title = _('Error');
                    mess  = _('You can\'t modify this file as it was modify by another user. Contact an administrator if you want to be able to modify it.');
                    break;
                case 'file_isnt_owned_by_current_user' :
                    title = _('Error');
                    mess  = _('The file you want to clear local change isn\'t own by you.<br>You can only do this action for yours files.');
                    break;
                case 'file_localchange_didnt_exist' :
                    title = _('Error');
                    mess  = _('The file you want to clear local change isn\'t exist as work in progress.');
                    break;
                case 'changeFilesOwnerNotAdmin' :
                    title = _('Error');
                    mess  = _('You can\'t change file\'s owner. You must be a global administrator or an administrator for this lang.');
                    break;
                case 'patch_delete_dont_exist' :
                    title = _('Error');
                    mess  = _('The patch you want to delete didn\'t exist.');
                    break;
                case 'patch_delete_isnt_own_by_current_user' :
                    title = _('Error');
                    mess  = _('The patch you want to delete isn\'t own by you. Only the user how create it or a global administrator can delete it.');
                    break;
                case 'action_only_global_admin' :
                    title = _('Error');
                    mess  = _('This action is available only to global administrator.');
                    break;

            }

            Ext.MessageBox.alert(
                title,
                mess
            );
        },

        runDirectAccess: function()
        {
            if (directAccess) {
                if( directAccess.link == 'perm' ) {
                    ui.cmp.RepositoryTree.getInstance().openFile('byPath',
                        directAccess.lang + directAccess.path,
                        directAccess.name
                    );
                }
                if( directAccess.link == 'patch' ) {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FilePath: directAccess.path,
                        FileName: directAccess.name
                    });
                }
            }
        },

        // All we want to do after all dataStore are loaded
        afterLoadAllStore : function()
        {
            this.app.loaded = true;

            // Run DirectAccess if present
            this.runDirectAccess();

            //Load external data
            // Mails ?
            if( this.user.conf.main.loadMailsAtStartUp ) {
                ui.cmp.PortletLocalMail.getInstance().reloadData();
            }
            // Bugs ?
            if( this.user.conf.main.loadBugsAtStartUp ) {
                ui.cmp.PortletBugs.getInstance().reloadData();
            }
        },

        loadAllStore : function()
        {
            var progressBar = new Ext.ProgressBar({
                    width:300,
                    renderTo:'loading-progressBar'
                });
            progressBar.show();

            // Store to load for LANG project
            if (PhDOE.userLang !== 'en') {

                // We load all stores, one after the others
                document.getElementById("loading-msg").innerHTML = "Loading data...";
                progressBar.updateProgress(1/11, '1 of 11...');
                ui.cmp._MainMenu.store.load({
                    callback: function() {
                        progressBar.updateProgress(2/11, '2 of 11...');
                        ui.cmp.StaleFileGrid.getInstance().store.load({
                            callback: function() {
                                progressBar.updateProgress(3/11, '3 of 11...');
                                ui.cmp.ErrorFileGrid.getInstance().store.load({
                                    callback: function() {
                                        progressBar.updateProgress(4/11, '4 of 11...');
                                        ui.cmp.PendingReviewGrid.getInstance().store.load({
                                            callback: function() {
                                                progressBar.updateProgress(5/11, '5 of 11...');
                                                ui.cmp.NotInENGrid.getInstance().store.load({
                                                    callback: function() {
	                                                    progressBar.updateProgress(6/11, '6 of 11...');
	                                                    ui.cmp.PortletSummary.getInstance().store.load({
	                                                        callback: function() {
	                                                            progressBar.updateProgress(7/11, '7 of 11...');
	                                                            ui.cmp.PortletTranslationGraph.getInstance().store.load({
	                                                                callback: function() {
	                                                                    progressBar.updateProgress(8/11, '8 of 11...');
	                                                                    ui.cmp.PortletTranslationsGraph.getInstance().store.load({
	                                                                        callback: function() {
	                                                                            progressBar.updateProgress(9/11, '9 of 11...');
	                                                                            ui.cmp.PortletTranslator.getInstance().store.load({
	                                                                                callback: function() {
	                                                                                    progressBar.updateProgress(10/11, '10 of 11...');
	                                                                                    ui.cmp.PendingTranslateGrid.getInstance().store.load({
	                                                                                        callback: function() {
	                                                                                            progressBar.updateProgress(11/11, '11 of 11...');
	                                                                                            ui.cmp.PortletInfo.getInstance().store.load({
	                                                                                                callback: function() {
	                                                                                                    // Now, we can to remove the global mask
	                                                                                                    Ext.get('loading').remove();
	                                                                                                    Ext.fly('loading-mask').fadeOut({ remove : true });
	                                                                                                    progressBar.destroy();
	                                                                                                    PhDOE.afterLoadAllStore();
	                                                                                                }
	                                                                                            });
	                                                                                        }
	                                                                                    });
	                                                                                }
	                                                                            });
	                                                                        }
	                                                                    });
	                                                                }
	                                                            });
	                                                        }
	                                                    });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                // Store to load only for EN project
                document.getElementById("loading-msg").innerHTML = "Loading data...";
                progressBar.updateProgress(1/4, '1 of 4...');
                ui.cmp._MainMenu.store.load({
                    callback: function() {
	                    progressBar.updateProgress(2/4, '2 of 4...');
	                    ui.cmp.PortletTranslationsGraph.getInstance().store.load({
	                        callback: function() {
	                            progressBar.updateProgress(3/4, '3 of 4...');
	                            ui.cmp.ErrorFileGrid.getInstance().store.load({
	                                callback: function() {
	                                    progressBar.updateProgress(4/4, '4 of 4...');
	                                    ui.cmp.PortletInfo.getInstance().store.load({
	                                        callback: function() {
	                                            // Now, we can to remove the global mask
	                                            Ext.get('loading').remove();
	                                            Ext.fly('loading-mask').fadeOut({ remove : true });
	                                            progressBar.destroy();
	                                            PhDOE.afterLoadAllStore();
	                                        }
	                                    });
	                                }
	                            });
	                        }
	                    });
                    }
                });
            }
        },

        reloadAllStore: function() {

            // Store to reload for LANG project
            if (PhDOE.userLang !== 'en') {
                // We reload all stores, one after the others
                ui.cmp.PendingTranslateGrid.getInstance().store.reload({
                    callback: function() {
                        ui.cmp.StaleFileGrid.getInstance().store.reload({
                            callback: function() {
                                ui.cmp.ErrorFileGrid.getInstance().store.reload({
                                    callback: function() {
                                        ui.cmp.PendingReviewGrid.getInstance().store.reload({
                                            callback: function() {
                                                ui.cmp.NotInENGrid.getInstance().store.reload({
                                                    callback: function() {
                                                        ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload(
                                                            function() {
                                                                ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload(
                                                                    function() {
                                                                        ui.cmp.PortletSummary.getInstance().store.reload({
                                                                            callback: function() {
                                                                                ui.cmp.PortletTranslator.getInstance().store.reload({
                                                                                    callback: function() {
                                                                                        ui.cmp.PortletTranslationGraph.getInstance().store.reload({
                                                                                            callback: function() {
                                                                                                ui.cmp.PortletTranslationsGraph.getInstance().store.reload({
                                                                                                    callback: function() {
                                                                                                        ui.cmp.PortletInfo.getInstance().store.reload();
                                                                                                    }
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                );
                                                            }
                                                        );
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                // Store to reload only for EN project
                ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload(
                    function() {
                        ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload(
                            function() {
                                ui.cmp.PortletInfo.getInstance().store.reload();
                            }
                        );
                    }
                );
            }
        },

        drawInterface: function()
        {
            var portal, portalEN, portalLANG, mainContentLeft=[], mainContentRight=[], allPortlet=[];
            
            // Default value for portalEN & portalLANG sort

            portalEN = {
                'col1' : ["portletLocalMail","portletBugs"],
                'col2' : ["portletInfo","portletTranslationsGraph"]
            };
            
            portalLANG = {
                'col1' : ["portletSummary","portletTranslator","portletLocalMail","portletBugs"],
                'col2' : ["portletInfo","portletTranslationGraph","portletTranslationsGraph"]
            };
            
            // Get user conf
            if ( PhDOE.user.lang === 'en' ) {
                portal = (PhDOE.user.conf.main.portalSortEN) ? Ext.util.JSON.decode(PhDOE.user.conf.main.portalSortEN) : portalEN;

                allPortlet["portletLocalMail"] = ui.cmp.PortletLocalMail.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletBugs"] = ui.cmp.PortletBugs.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletInfo"] = ui.cmp.PortletInfo.getInstance();
                allPortlet["portletTranslationsGraph"] = ui.cmp.PortletTranslationsGraph.getInstance();
            }
            else
            {
                portal = (PhDOE.user.conf.main.portalSortLANG) ? Ext.util.JSON.decode(PhDOE.user.conf.main.portalSortLANG) : portalLANG;
                
                allPortlet["portletSummary"] = ui.cmp.PortletSummary.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletTranslator"] = ui.cmp.PortletTranslator.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletLocalMail"] = ui.cmp.PortletLocalMail.getInstance({lang: PhDOE.user.lang});
                allPortlet["portletBugs"] = ui.cmp.PortletBugs.getInstance({lang: PhDOE.user.lang});

                allPortlet["portletInfo"] = ui.cmp.PortletInfo.getInstance();
                allPortlet["portletTranslationGraph"] = ui.cmp.PortletTranslationGraph.getInstance();
                allPortlet["portletTranslationsGraph"] = ui.cmp.PortletTranslationsGraph.getInstance();
            }


            for( var i=0; i < portal.col1.length; i++ ) {
                mainContentLeft.push(allPortlet[portal.col1[i]]);
            }
            for( var j=0; j < portal.col2.length; j++ ) {
                mainContentRight.push(allPortlet[portal.col2[j]]);
            }

            // We keel alive our session by sending a ping every minute
            ui.task.PingTask.getInstance().delay(30000); // start after 1 minute.

            new Ext.Viewport({
                layout : 'border',
                id     : 'main-app',
                items  : [{
                    // logo
                    region     : 'north',
                    html       : '<h1 class="x-panel-header">' +
                                    '<img src="themes/img/mini_php.png" ' +
                                        'style="vertical-align: middle;" />&nbsp;&nbsp;' +
                                    this.app.name +
                                 '</h1>',
                    autoHeight : true,
                    border     : false,
                    margins    : '0 0 5 0'
                }, {
                    // accordion
                    region       : 'west',
                    id           : 'main-menu-panel',
                    layout       : 'accordion',
                    collapsible  : true,
                    collapseMode : 'mini',
                    animate      : true,
                    split        : true,
                    width        : PhDOE.user.conf.main.mainMenuWidth || 300,
                    header       : false,
                    listeners    : {
                        resize : function(a, newWidth) {

                            if( newWidth && newWidth != PhDOE.user.conf.main.mainMenuWidth ) { // As the type is different, we can't use !== to compare with !
                                var tmp = new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'mainMenuWidth',
                                    value : newWidth,
                                    notify: false
                                });
                            }
                        }
                    },
                    tbar : [{
                        text    : _('Main menu'),
                        iconCls : 'MainMenu',
                        menu    : new ui.cmp.MainMenu()
                    }],
                    items : [{
                        id        : 'acc-need-translate',
                        title     : _('Files need translate') + ' (<em id="acc-need-translate-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedTranslate',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ ui.cmp.PendingTranslateGrid.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('FNT-filter').wrap.setWidth(180);
                                Ext.getCmp('FNT-filter').syncSize();
                            }
                        }
                    },{
                        id        : 'acc-need-update',
                        title     : _('Files need update') + ' (<em id="acc-need-update-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedUpdate',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ ui.cmp.StaleFileGrid.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('FNU-filter').wrap.setWidth(180);
                                Ext.getCmp('FNU-filter').syncSize();
                            }
                        }
                    }, {
                        id        : 'acc-error',
                        title     : (PhDOE.user.lang === 'en') ? "Number of failures to meet 'strict standards'" + ' (<em id="acc-error-nb">0</em>)' : _('Error in current translation') + ' (<em id="acc-error-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesError',
                        items     : [ ui.cmp.ErrorFileGrid.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('FE-filter').wrap.setWidth(180);
                                Ext.getCmp('FE-filter').syncSize();
                            }
                        }
                    }, {
                        id        : 'acc-need-reviewed',
                        title     : _('Files need reviewed') + ' (<em id="acc-need-reviewed-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedReviewed',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ ui.cmp.PendingReviewGrid.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('FNR-filter').wrap.setWidth(180);
                                Ext.getCmp('FNR-filter').syncSize();
                            }
                        }
                    }, {
                        id        : 'acc-notInEn',
                        title     : _('Not in EN tree') + ' (<em id="acc-notInEn-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconNotInEn',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ ui.cmp.NotInENGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-all-files',
                        title     : _('All files'),
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconAllFiles',
                        items     : [ ui.cmp.RepositoryTree.getInstance() ],
                        collapsed : true,
                        listeners : {
                            expand: function(cmp) {
                                Ext.getCmp('AF-search').wrap.setWidth(180);
                                Ext.getCmp('AF-search').syncSize();
                            }
                        }
                    }, {
                        id        : 'acc-work-in-progress',
                        title     : _('Work in progress') + ' (<em id="acc-work-in-progress-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconWorkInProgress',
                        items     : [ ui.cmp.WorkTreeGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-patches',
                        tools     : [{
                            id      : 'gear',
                            hidden  : (this.user.isAnonymous ),
                            qtip    : _('Open the Log Message Manager'),
                            handler : function() {
                                if( ! Ext.getCmp('commit-log-win') )
                                {
                                    var win = new ui.cmp.CommitLogManager();
                                }
                                Ext.getCmp('commit-log-win').show('acc-patches');
                            }
                        }],
                        title     : _('Patches for review') + ' (<em id="acc-patches-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconPatch',
                        items     : [ ui.cmp.PatchesTreeGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-google-translate',
                        title     : _('Google translation'),
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconGoogle',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ new ui.cmp.GoogleTranslationPanel() ],
                        collapsed : true
                    }]
                }, {
                    // main panel
                    xtype  : 'mainpanel',
                    id     : 'main-panel',
                    region : 'center',
                    items  : [{
                        xtype      : 'panel',
                        id         : 'MainInfoTabPanel',
                        title      : _('Home'),
                        baseCls    : 'MainInfoTabPanel',
                        autoScroll : true,
                        plain      : true,
                        items      : [{
                            xtype  : 'panel',
                            border : false,
                            html   : '<div class="res-block">' +
                                        '<div class="res-block-inner">' +
                                            '<h3>' +
                                                String.format(_('Connected as {0}'), (( PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin ) ? "<em class='userAdmin' ext:qtip='"+_('Administrator')+"'>"+PhDOE.user.login.ucFirst()+"</em>" : "<em>"+PhDOE.user.login.ucFirst()+"</em>")) +
                                                ', ' + _('Project: ') + '<em id="Info-Project">' + PhDOE.project + '</em>, '+_('Language: ')+' <em id="Info-Language">-</em>'+
                                            '</h3>' +
                                        '</div>' +
                                     '</div>'

                        }, {
                            xtype  : 'portal',
                            border : false,
                            items  : [{
                                columnWidth : 0.5,
                                style       : 'padding:10px 5px 10px 5px',
                                items       : mainContentLeft
                            },{
                                columnWidth : 0.5,
                                style       : 'padding:10px 5px 10px 5px',
                                items       : mainContentRight
                            }],
                            listeners : {
                                drop : function(a) {
                                    var portal, col1Sort = [], col2Sort = [], id;

                                    // Column 1
                                    for( var i=0; i < a.portal.items.items[0].items.items.length; i++ ) {
                                        id = a.portal.items.items[0].items.items[i].id;
                                        col1Sort.push(id);
                                    }
                                    
                                    // Column 2
                                    for( var j=0; j < a.portal.items.items[1].items.items.length; j++ ) {
                                        id = a.portal.items.items[1].items.items[j].id;
                                        col2Sort.push(id);
                                    }

                                    portal = {
                                        'col1' : col1Sort,
                                        'col2' : col2Sort
                                    };
                                    
                                    // We store this config var into portalSortEN for EN users, and portalSortLANG for LANG users

                                    new ui.task.UpdateConfTask({
                                        module:'main',
                                        itemName  : (PhDOE.userLang === 'en') ? 'portalSortEN' : 'portalSortLANG',
                                        value : Ext.util.JSON.encode(portal),
                                        notify: false
                                    });
                                    
                                }
                            }
                        }]
                    }]
                }]
            });

            new Ext.dd.DropTarget(Ext.get('main-panel'), {
                ddGroup    : 'mainPanelDDGroup',
                notifyDrop : function(ddSource, e, data) {

                    var i, idToOpen;

                    // Special case for the repositoryTree
                    if( data.nodes ) {
                        for( i=0; i < data.nodes.length; i++ ) {
                            PhDOE.AFfilePendingOpen[i] = {
                                nodeID: data.nodes[i].attributes.id
                            };
                        }
                        
                        // Start the first
                        ui.cmp.RepositoryTree.getInstance().openFile(
                            'byId',
                            PhDOE.AFfilePendingOpen[0].nodeID,
                            false
                        );

                        PhDOE.AFfilePendingOpen.shift();
                        return true;
                    }

                    // Special case for PendingCommit grid. As this grid can open a file in all modules, we can't use this mechanism. As it, we have disable the possibility to open multi-files. Just one can be open at once.
                    if( data.grid.ownerCt.id === 'acc-need-pendingCommit' ) {
                        data.grid.openFile(data.selections[0].data.id);
                        return true;
                    }

                    // We store the data
                    for( i=0; i < data.selections.length; i++ ) {
                        if( data.grid.ownerCt.id === 'acc-need-translate' ) {
                            PhDOE.FNTfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-update' ) {
                            PhDOE.FNUfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-error' ) {
                            PhDOE.FEfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-reviewed' ) {
                            PhDOE.FNRfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-notInEn' ) {
                            PhDOE.FNIENfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                            PhDOE.PPfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                            PhDOE.PPfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                    }

                    // We open the first file

                    if( data.grid.ownerCt.id === 'acc-need-translate' ) {
                        idToOpen = PhDOE.FNTfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNTfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-update' ) {
                        idToOpen = PhDOE.FNUfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNUfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-error' ) {
                        idToOpen = PhDOE.FEfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FEfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-reviewed' ) {
                        idToOpen = PhDOE.FNRfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNRfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-notInEn' ) {
                        idToOpen = PhDOE.FNIENfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNIENfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                        idToOpen = PhDOE.PPfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.PPfilePendingOpen.shift();
                    }

                    data.grid.openFile(idToOpen.id);

                    return true;
                }
            });

            // Load all store & remove the mask after all store are loaded
            this.loadAllStore();

        } // drawInterface
    }; // Return
}();

Ext.EventManager.onDocumentReady(PhDOE.init, PhDOE, true);