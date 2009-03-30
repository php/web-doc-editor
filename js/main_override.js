Ext.ux.TabCloseMenu = function(){
    var tabs, menu, ctxItem;
    this.init = function(tp){
        tabs = tp;
        tabs.on('contextmenu', onContextMenu);
    }
    
    function onContextMenu(ts, item, e){
        if (!menu) { // create context menu on first right click
            menu = new Ext.menu.Menu([{
                id: tabs.id + '-close',
                text: 'Close Tab',
                handler: function(){
                    tabs.remove(ctxItem);
                }
            }, {
                id: tabs.id + '-close-others',
                iconCls: 'closeOthersTabs',
                text: 'Close Other Tabs',
                handler: function(){
                    tabs.items.each(function(item){
                        if (item.closable && item != ctxItem) {
                            tabs.remove(item);
                        }
                    });
                }
            }]);
        }
        ctxItem = item;
        var items = menu.items;
        items.get(tabs.id + '-close').setDisabled(!item.closable);
        var disableOthers = true;
        tabs.items.each(function(){
            if (this != item && this.closable) {
                disableOthers = false;
                return false;
            }
        });
        items.get(tabs.id + '-close-others').setDisabled(disableOthers);
        menu.showAt(e.getPoint());
    }
};

//Current bug in Radio/Checkbox
// http://extjs.com/forum/showthread.php?t=44603

Ext.override(Ext.form.Checkbox, {
    onRender: function(ct, position){
        Ext.form.Checkbox.superclass.onRender.call(this, ct, position);
        if (this.inputValue !== undefined) {
            this.el.dom.value = this.inputValue;
        }
        //this.el.addClass('x-hidden');
        this.innerWrap = this.el.wrap({
            //tabIndex: this.tabIndex,
            cls: this.baseCls + '-wrap-inner'
        });
        this.wrap = this.innerWrap.wrap({
            cls: this.baseCls + '-wrap'
        });
        this.imageEl = this.innerWrap.createChild({
            tag: 'img',
            src: Ext.BLANK_IMAGE_URL,
            cls: this.baseCls
        });
        if (this.boxLabel) {
            this.labelEl = this.innerWrap.createChild({
                tag: 'label',
                htmlFor: this.el.id,
                cls: 'x-form-cb-label',
                html: this.boxLabel
            });
        }
        //this.imageEl = this.innerWrap.createChild({
        //tag: 'img',
        //src: Ext.BLANK_IMAGE_URL,
        //cls: this.baseCls
        //}, this.el);
        if (this.checked) {
            this.setValue(true);
        }
        else {
            this.checked = this.el.dom.checked;
        }
        this.originalValue = this.checked;
    },
    afterRender: function(){
        Ext.form.Checkbox.superclass.afterRender.call(this);
        //this.wrap[this.checked ? 'addClass' : 'removeClass'](this.checkedCls);
        this.imageEl[this.checked ? 'addClass' : 'removeClass'](this.checkedCls);
    },
    initCheckEvents: function(){
        //this.innerWrap.removeAllListeners();
        this.innerWrap.addClassOnOver(this.overCls);
        this.innerWrap.addClassOnClick(this.mouseDownCls);
        this.innerWrap.on('click', this.onClick, this);
        //this.innerWrap.on('keyup', this.onKeyUp, this);
    },
    onFocus: function(e){
        Ext.form.Checkbox.superclass.onFocus.call(this, e);
        //this.el.addClass(this.focusCls);
        this.innerWrap.addClass(this.focusCls);
    },
    onBlur: function(e){
        Ext.form.Checkbox.superclass.onBlur.call(this, e);
        //this.el.removeClass(this.focusCls);
        this.innerWrap.removeClass(this.focusCls);
    },
    onClick: function(e){
        if (e.getTarget().htmlFor != this.el.dom.id) {
            if (e.getTarget() !== this.el.dom) {
                this.el.focus();
            }
            if (!this.disabled && !this.readOnly) {
                this.toggleValue();
            }
        }
        //e.stopEvent();
    },
    onEnable: Ext.form.Checkbox.superclass.onEnable,
    onDisable: Ext.form.Checkbox.superclass.onDisable,
    onKeyUp: undefined,
    setValue: function(v){
        var checked = this.checked;
        this.checked = (v === true || v === 'true' || v == '1' || String(v).toLowerCase() == 'on');
        if (this.rendered) {
            this.el.dom.checked = this.checked;
            this.el.dom.defaultChecked = this.checked;
            //this.wrap[this.checked ? 'addClass' : 'removeClass'](this.checkedCls);
            this.imageEl[this.checked ? 'addClass' : 'removeClass'](this.checkedCls);
        }
        if (checked != this.checked) {
            this.fireEvent("check", this, this.checked);
            if (this.handler) {
                this.handler.call(this.scope || this, this, this.checked);
            }
        }
    },
    getResizeEl: function(){
        //if(!this.resizeEl){
        //this.resizeEl = Ext.isSafari ? this.wrap : (this.wrap.up('.x-form-element', 5) || this.wrap);
        //}
        //return this.resizeEl;
        return this.wrap;
    }
});
Ext.override(Ext.form.Radio, {
    checkedCls: 'x-form-radio-checked'
});

Ext.layout.SlideLayout = Ext.extend(Ext.layout.FitLayout, {

    deferredRender: false,
    renderHidden: false,
    easing: 'backBoth',
    duration: .5,
    opacity: 1,
    
    setActiveItem: function(itemInt){
    
        if (typeof(itemInt) == 'string') {
            itemInt = this.container.items.keys.indexOf(itemInt);
        }
        else 
            if (typeof(itemInt) == 'object') {
                itemInt = this.container.items.items.indexOf(itemInt);
            }
        var item = this.container.getComponent(itemInt);
        if (this.activeItem != item) {
            if (this.activeItem) {
                if (item && (!item.rendered || !this.isValidParent(item, this.container))) {
                    this.renderItem(item, itemInt, this.container.getLayoutTarget());
                    item.show();
                }
                var s = [this.container.body.getX() - this.container.body.getWidth(), this.container.body.getX() + this.container.body.getWidth()];
                this.activeItem.el.shift({
                    duration: this.duration,
                    easing: this.easing,
                    opacity: this.opacity,
                    x: (this.activeItemNo < itemInt ? s[0] : s[1])
                });
                item.el.setY(this.container.body.getY());
                item.el.setX((this.activeItemNo < itemInt ? s[1] : s[0]));
                item.el.shift({
                    duration: this.duration,
                    easing: this.easing,
                    opacity: 1,
                    x: this.container.body.getX()
                });
            }
            this.activeItemNo = itemInt;
            this.activeItem = item;
            this.layout();
        }
    },
    
    
    renderAll: function(ct, target){
        if (this.deferredRender) {
            this.renderItem(this.activeItem, undefined, target);
        }
        else {
            Ext.layout.CardLayout.superclass.renderAll.call(this, ct, target);
        }
    }
});
Ext.Container.LAYOUTS['slide'] = Ext.layout.SlideLayout;


//http://extjs.com/forum/showthread.php?t=44790
Ext.override(Ext.Editor, {
    doAutoSize: function(){
        if (this.autoSize) {
            var sz = this.boundEl.getSize(), fs = this.field.getSize();
            switch (this.autoSize) {
                case "width":
                    this.setSize(sz.width, fs.height);
                    break;
                case "height":
                    this.setSize(fs.width, sz.height);
                    break;
                case "none":
                    this.setSize(fs.width, fs.height);
                    break;
                default:
                    this.setSize(sz.width, sz.height);
            }
        }
    }
});