/*
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

Ext.reg('windowdrawer', Ext.ux.plugins.WindowDrawer);
