// CodeMirror version 2.21
//
// All functions that need access to the editor's state live inside
// the CodeMirror function. Below that, at the bottom of the file,
// some utilities are defined.

// CodeMirror is the only global var we claim
var CodeMirror = (function() {
  // This is the function that produces an editor instance. It's
  // closure is used to store the editor state.
  function CodeMirror(place, givenOptions) {
    // Determine effective options based on given values and defaults.
    var options = {}, defaults = CodeMirror.defaults;
    for (var opt in defaults)
      if (defaults.hasOwnProperty(opt))
        options[opt] = (givenOptions && givenOptions.hasOwnProperty(opt) ? givenOptions : defaults)[opt];

    var targetDocument = options["document"];
    // The element in which the editor lives.
    var wrapper = targetDocument.createElement("div");
    wrapper.className = "CodeMirror" + (options.lineWrapping ? " CodeMirror-wrap" : "");
    // This mess creates the base DOM structure for the editor.
    wrapper.innerHTML =
      '<div style="overflow: hidden; position: relative; width: 3px; height: 0px;">' + // Wraps and hides input textarea
        '<textarea style="position: absolute; padding: 0; width: 1px; height: 1em" wrap="off" ' +
          'autocorrect="off" autocapitalize="off"></textarea></div>' +
      '<div class="CodeMirror-scroll" tabindex="-1">' +
        '<div style="position: relative">' + // Set to the height of the text, causes scrolling
          '<div style="position: relative">' + // Moved around its parent to cover visible view
            '<div class="CodeMirror-gutter"><div class="CodeMirror-gutter-text"></div></div>' +
            // Provides positioning relative to (visible) text origin
            '<div class="CodeMirror-lines"><div style="position: relative; z-index: 0">' +
              '<div style="position: absolute; width: 100%; height: 0; overflow: hidden; visibility: hidden; outline: 5px auto none"></div>' +
              '<pre class="CodeMirror-cursor">&#160;</pre>' + // Absolutely positioned blinky cursor
              '<div style="position: relative; z-index: -1"></div><div></div>' + // DIVs containing the selection and the actual code
            '</div></div></div></div></div>';
    if (place.appendChild) place.appendChild(wrapper); else place(wrapper);
    // I've never seen more elegant code in my life.
    var inputDiv = wrapper.firstChild, input = inputDiv.firstChild,
        scroller = wrapper.lastChild, code = scroller.firstChild,
        mover = code.firstChild, gutter = mover.firstChild, gutterText = gutter.firstChild,
        lineSpace = gutter.nextSibling.firstChild, measure = lineSpace.firstChild,
        cursor = measure.nextSibling, selectionDiv = cursor.nextSibling,
        lineDiv = selectionDiv.nextSibling;
    themeChanged();
    // Needed to hide big blue blinking cursor on Mobile Safari
    if (ios) input.style.width = "0px";
    if (!webkit) lineSpace.draggable = true;
    lineSpace.style.outline = "none";
    if (options.tabindex != null) input.tabIndex = options.tabindex;
    if (!options.gutter && !options.lineNumbers) gutter.style.display = "none";

    // Check for problem with IE innerHTML not working when we have a
    // P (or similar) parent node.
    try { stringWidth("x"); }
    catch (e) {
      if (e.message.match(/runtime/i))
        e = new Error("A CodeMirror inside a P-style element does not work in Internet Explorer. (innerHTML bug)");
      throw e;
    }

    // Delayed object wrap timeouts, making sure only one is active. blinker holds an interval.
    var poll = new Delayed(), highlight = new Delayed(), blinker;

    // mode holds a mode API object. doc is the tree of Line objects,
    // work an array of lines that should be parsed, and history the
    // undo history (instance of History constructor).
    var mode, doc = new BranchChunk([new LeafChunk([new Line("")])]), work, focused;
    loadMode();
    // The selection. These are always maintained to point at valid
    // positions. Inverted is used to remember that the user is
    // selecting bottom-to-top.
    var sel = {from: {line: 0, ch: 0}, to: {line: 0, ch: 0}, inverted: false};
    // Selection-related flags. shiftSelecting obviously tracks
    // whether the user is holding shift.
    var shiftSelecting, lastClick, lastDoubleClick, lastScrollPos = 0, draggingText,
        overwrite = false, suppressEdits = false;
    // Variables used by startOperation/endOperation to track what
    // happened during the operation.
    var updateInput, userSelChange, changes, textChanged, selectionChanged, leaveInputAlone,
        gutterDirty, callbacks;
    // Current visible range (may be bigger than the view window).
    var displayOffset = 0, showingFrom = 0, showingTo = 0, lastSizeC = 0;
    // bracketHighlighted is used to remember that a backet has been
    // marked.
    var bracketHighlighted;
    // Tracks the maximum line length so that the horizontal scrollbar
    // can be kept static when scrolling.
    var maxLine = "", maxWidth, tabText = computeTabText();

    // Initialize the content.
    operation(function(){setValue(options.value || ""); updateInput = false;})();
    var history = new History();

    // Register our event handlers.
    connect(scroller, "mousedown", operation(onMouseDown));
    connect(scroller, "dblclick", operation(onDoubleClick));
    connect(lineSpace, "dragstart", onDragStart);
    connect(lineSpace, "selectstart", e_preventDefault);
    // Gecko browsers fire contextmenu *after* opening the menu, at
    // which point we can't mess with it anymore. Context menu is
    // handled in onMouseDown for Gecko.
    if (!gecko) connect(scroller, "contextmenu", onContextMenu);
    connect(scroller, "scroll", function() {
      lastScrollPos = scroller.scrollTop;
      updateDisplay([]);
      if (options.fixedGutter) gutter.style.left = scroller.scrollLeft + "px";
      if (options.onScroll) options.onScroll(instance);
    });
    connect(window, "resize", function() {updateDisplay(true);});
    connect(input, "keyup", operation(onKeyUp));
    connect(input, "input", fastPoll);
    connect(input, "keydown", operation(onKeyDown));
    connect(input, "keypress", operation(onKeyPress));
    connect(input, "focus", onFocus);
    connect(input, "blur", onBlur);

    connect(scroller, "dragenter", e_stop);
    connect(scroller, "dragover", e_stop);
    connect(scroller, "drop", operation(onDrop));
    connect(scroller, "paste", function(){focusInput(); fastPoll();});
    connect(input, "paste", fastPoll);
    connect(input, "cut", operation(function(){
      if (!options.readOnly) replaceSelection("");
    }));

    // IE throws unspecified error in certain cases, when
    // trying to access activeElement before onload
    var hasFocus; try { hasFocus = (targetDocument.activeElement == input); } catch(e) { }
    if (hasFocus) setTimeout(onFocus, 20);
    else onBlur();

    function isLine(l) {return l >= 0 && l < doc.size;}
    // The instance object that we'll return. Mostly calls out to
    // local functions in the CodeMirror function. Some do some extra
    // range checking and/or clipping. operation is used to wrap the
    // call so that changes it makes are tracked, and the display is
    // updated afterwards.
    var instance = wrapper.CodeMirror = {
      getValue: getValue,
      setValue: operation(setValue),
      getSelection: getSelection,
      replaceSelection: operation(replaceSelection),
      focus: function(){focusInput(); onFocus(); fastPoll();},
      setOption: function(option, value) {
        var oldVal = options[option];
        options[option] = value;
        if (option == "mode" || option == "indentUnit") loadMode();
        else if (option == "readOnly" && value == "nocursor") {onBlur(); input.blur();}
        else if (option == "readOnly" && !value) {resetInput(true);}
        else if (option == "theme") themeChanged();
        else if (option == "lineWrapping" && oldVal != value) operation(wrappingChanged)();
        else if (option == "tabSize") operation(tabsChanged)();
        if (option == "lineNumbers" || option == "gutter" || option == "firstLineNumber" || option == "theme")
          updateDisplay(true);
      },
      getOption: function(option) {return options[option];},
      undo: operation(undo),
      redo: operation(redo),
      indentLine: operation(function(n, dir) {
        if (typeof dir != "string") {
          if (dir == null) dir = options.smartIndent ? "smart" : "prev";
          else dir = dir ? "add" : "subtract";
        }
        if (isLine(n)) indentLine(n, dir);
      }),
      indentSelection: operation(indentSelected),
      historySize: function() {return {undo: history.done.length, redo: history.undone.length};},
      clearHistory: function() {history = new History();},
      matchBrackets: operation(function(){matchBrackets(true);}),
      getTokenAt: operation(function(pos) {
        pos = clipPos(pos);
        return getLine(pos.line).getTokenAt(mode, getStateBefore(pos.line), pos.ch);
      }),
      getStateAfter: function(line) {
        line = clipLine(line == null ? doc.size - 1: line);
        return getStateBefore(line + 1);
      },
      cursorCoords: function(start){
        if (start == null) start = sel.inverted;
        return pageCoords(start ? sel.from : sel.to);
      },
      charCoords: function(pos){return pageCoords(clipPos(pos));},
      coordsChar: function(coords) {
        var off = eltOffset(lineSpace);
        return coordsChar(coords.x - off.left, coords.y - off.top);
      },
      markText: operation(markText),
      setBookmark: setBookmark,
      setMarker: operation(addGutterMarker),
      clearMarker: operation(removeGutterMarker),
      setLineClass: operation(setLineClass),
      hideLine: operation(function(h) {return setLineHidden(h, true);}),
      showLine: operation(function(h) {return setLineHidden(h, false);}),
      onDeleteLine: function(line, f) {
        if (typeof line == "number") {
          if (!isLine(line)) return null;
          line = getLine(line);
        }
        (line.handlers || (line.handlers = [])).push(f);
        return line;
      },
      lineInfo: lineInfo,
      addWidget: function(pos, node, scroll, vert, horiz) {
        pos = localCoords(clipPos(pos));
        var top = pos.yBot, left = pos.x;
        node.style.position = "absolute";
        code.appendChild(node);
        if (vert == "over") top = pos.y;
        else if (vert == "near") {
          var vspace = Math.max(scroller.offsetHeight, doc.height * textHeight()),
              hspace = Math.max(code.clientWidth, lineSpace.clientWidth) - paddingLeft();
          if (pos.yBot + node.offsetHeight > vspace && pos.y > node.offsetHeight)
            top = pos.y - node.offsetHeight;
          if (left + node.offsetWidth > hspace)
            left = hspace - node.offsetWidth;
        }
        node.style.top = (top + paddingTop()) + "px";
        node.style.left = node.style.right = "";
        if (horiz == "right") {
          left = code.clientWidth - node.offsetWidth;
          node.style.right = "0px";
        } else {
          if (horiz == "left") left = 0;
          else if (horiz == "middle") left = (code.clientWidth - node.offsetWidth) / 2;
          node.style.left = (left + paddingLeft()) + "px";
        }
        if (scroll)
          scrollIntoView(left, top, left + node.offsetWidth, top + node.offsetHeight);
      },

      lineCount: function() {return doc.size;},
      clipPos: clipPos,
      getCursor: function(start) {
        if (start == null) start = sel.inverted;
        return copyPos(start ? sel.from : sel.to);
      },
      somethingSelected: function() {return !posEq(sel.from, sel.to);},
      setCursor: operation(function(line, ch, user) {
        if (ch == null && typeof line.line == "number") setCursor(line.line, line.ch, user);
        else setCursor(line, ch, user);
      }),
      setSelection: operation(function(from, to, user) {
        (user ? setSelectionUser : setSelection)(clipPos(from), clipPos(to || from));
      }),
      getLine: function(line) {if (isLine(line)) return getLine(line).text;},
      getLineHandle: function(line) {if (isLine(line)) return getLine(line);},
      setLine: operation(function(line, text) {
        if (isLine(line)) replaceRange(text, {line: line, ch: 0}, {line: line, ch: getLine(line).text.length});
      }),
      removeLine: operation(function(line) {
        if (isLine(line)) replaceRange("", {line: line, ch: 0}, clipPos({line: line+1, ch: 0}));
      }),
      replaceRange: operation(replaceRange),
      getRange: function(from, to) {return getRange(clipPos(from), clipPos(to));},

      execCommand: function(cmd) {return commands[cmd](instance);},
      // Stuff used by commands, probably not much use to outside code.
      moveH: operation(moveH),
      deleteH: operation(deleteH),
      moveV: operation(moveV),
      toggleOverwrite: function() {overwrite = !overwrite;},

      posFromIndex: function(off) {
        var lineNo = 0, ch;
        doc.iter(0, doc.size, function(line) {
          var sz = line.text.length + 1;
          if (sz > off) { ch = off; return true; }
          off -= sz;
          ++lineNo;
        });
        return clipPos({line: lineNo, ch: ch});
      },
      indexFromPos: function (coords) {
        if (coords.line < 0 || coords.ch < 0) return 0;
        var index = coords.ch;
        doc.iter(0, coords.line, function (line) {
          index += line.text.length + 1;
        });
        return index;
      },
      scrollTo: function(x, y) {
        if (x != null) scroller.scrollTop = x;
        if (y != null) scroller.scrollLeft = y;
        updateDisplay([]);
      },

      operation: function(f){return operation(f)();},
      refresh: function(){
        updateDisplay(true);
        if (scroller.scrollHeight > lastScrollPos)
          scroller.scrollTop = lastScrollPos;
      },
      getInputField: function(){return input;},
      getWrapperElement: function(){return wrapper;},
      getScrollerElement: function(){return scroller;},
      getGutterElement: function(){return gutter;}
    };

    function getLine(n) { return getLineAt(doc, n); }
    function updateLineHeight(line, height) {
      gutterDirty = true;
      var diff = height - line.height;
      for (var n = line; n; n = n.parent) n.height += diff;
    }

    function setValue(code) {
      var top = {line: 0, ch: 0};
      updateLines(top, {line: doc.size - 1, ch: getLine(doc.size-1).text.length},
                  splitLines(code), top, top);
      updateInput = true;
    }
    function getValue(code) {
      var text = [];
      doc.iter(0, doc.size, function(line) { text.push(line.text); });
      return text.join("\n");
    }

    function onMouseDown(e) {
      setShift(e_prop(e, "shiftKey"));
      // Check whether this is a click in a widget
      for (var n = e_target(e); n != wrapper; n = n.parentNode)
        if (n.parentNode == code && n != mover) return;

      // See if this is a click in the gutter
      for (var n = e_target(e); n != wrapper; n = n.parentNode)
        if (n.parentNode == gutterText) {
          if (options.onGutterClick)
            options.onGutterClick(instance, indexOf(gutterText.childNodes, n) + showingFrom, e);
          return e_preventDefault(e);
        }

      var start = posFromMouse(e);

      switch (e_button(e)) {
      case 3:
        if (gecko && !mac) onContextMenu(e);
        return;
      case 2:
        if (start) setCursor(start.line, start.ch, true);
        return;
      }
      // For button 1, if it was clicked inside the editor
      // (posFromMouse returning non-null), we have to adjust the
      // selection.
      if (!start) {if (e_target(e) == scroller) e_preventDefault(e); return;}

      if (!focused) onFocus();

      var now = +new Date;
      if (lastDoubleClick && lastDoubleClick.time > now - 400 && posEq(lastDoubleClick.pos, start)) {
        e_preventDefault(e);
        setTimeout(focusInput, 20);
        return selectLine(start.line);
      } else if (lastClick && lastClick.time > now - 400 && posEq(lastClick.pos, start)) {
        lastDoubleClick = {time: now, pos: start};
        e_preventDefault(e);
        return selectWordAt(start);
      } else { lastClick = {time: now, pos: start}; }

      var last = start, going;
      if (dragAndDrop && !options.readOnly && !posEq(sel.from, sel.to) &&
          !posLess(start, sel.from) && !posLess(sel.to, start)) {
        // Let the drag handler handle this.
        if (webkit) lineSpace.draggable = true;
        var up = connect(targetDocument, "mouseup", operation(function(e2) {
          if (webkit) lineSpace.draggable = false;
          draggingText = false;
          up();
          if (Math.abs(e.clientX - e2.clientX) + Math.abs(e.clientY - e2.clientY) < 10) {
            e_preventDefault(e2);
            setCursor(start.line, start.ch, true);
            focusInput();
          }
        }), true);
        draggingText = true;
        return;
      }
      e_preventDefault(e);
      setCursor(start.line, start.ch, true);

      function extend(e) {
        var cur = posFromMouse(e, true);
        if (cur && !posEq(cur, last)) {
          if (!focused) onFocus();
          last = cur;
          setSelectionUser(start, cur);
          updateInput = false;
          var visible = visibleLines();
          if (cur.line >= visible.to || cur.line < visible.from)
            going = setTimeout(operation(function(){extend(e);}), 150);
        }
      }

      var move = connect(targetDocument, "mousemove", operation(function(e) {
        clearTimeout(going);
        e_preventDefault(e);
        extend(e);
      }), true);
      var up = connect(targetDocument, "mouseup", operation(function(e) {
        clearTimeout(going);
        var cur = posFromMouse(e);
        if (cur) setSelectionUser(start, cur);
        e_preventDefault(e);
        focusInput();
        updateInput = true;
        move(); up();
      }), true);
    }
    function onDoubleClick(e) {
      for (var n = e_target(e); n != wrapper; n = n.parentNode)
        if (n.parentNode == gutterText) return e_preventDefault(e);
      var start = posFromMouse(e);
      if (!start) return;
      lastDoubleClick = {time: +new Date, pos: start};
      e_preventDefault(e);
      selectWordAt(start);
    }
    function onDrop(e) {
      e.preventDefault();
      var pos = posFromMouse(e, true), files = e.dataTransfer.files;
      if (!pos || options.readOnly) return;
      if (files && files.length && window.FileReader && window.File) {
        function loadFile(file, i) {
          var reader = new FileReader;
          reader.onload = function() {
            text[i] = reader.result;
            if (++read == n) {
	      pos = clipPos(pos);
	      operation(function() {
                var end = replaceRange(text.join(""), pos, pos);
                setSelectionUser(pos, end);
              })();
	    }
          };
          reader.readAsText(file);
        }
        var n = files.length, text = Array(n), read = 0;
        for (var i = 0; i < n; ++i) loadFile(files[i], i);
      }
      else {
        try {
          var text = e.dataTransfer.getData("Text");
          if (text) {
            var curFrom = sel.from, curTo = sel.to;
            setSelectionUser(pos, pos);
            if (draggingText) replaceRange("", curFrom, curTo);
            replaceSelection(text);
	    focusInput();
	  }
        }
        catch(e){}
      }
    }
    function onDragStart(e) {
      var txt = getSelection();
      // This will reset escapeElement
      htmlEscape(txt);
      e.dataTransfer.setDragImage(escapeElement, 0, 0);
      e.dataTransfer.setData("Text", txt);
    }
    function handleKeyBinding(e) {
      var name = keyNames[e_prop(e, "keyCode")], next = keyMap[options.keyMap].auto, bound, dropShift;
      function handleNext() {
        return next.call ? next.call(null, instance) : next;
      }
      if (name == null || e.altGraphKey) {
        if (next) options.keyMap = handleNext();
        return null;
      }
      if (e_prop(e, "altKey")) name = "Alt-" + name;
      if (e_prop(e, "ctrlKey")) name = "Ctrl-" + name;
      if (e_prop(e, "metaKey")) name = "Cmd-" + name;
      if (e_prop(e, "shiftKey") &&
          (bound = lookupKey("Shift-" + name, options.extraKeys, options.keyMap))) {
        dropShift = true;
      } else {
        bound = lookupKey(name, options.extraKeys, options.keyMap);
      }
      if (typeof bound == "string") {
        if (commands.propertyIsEnumerable(bound)) bound = commands[bound];
        else bound = null;
      }
      if (next && (bound || !isModifierKey(e))) options.keyMap = handleNext();
      if (!bound) return false;
      var prevShift = shiftSelecting;
      try {
        if (options.readOnly) suppressEdits = true;
        if (dropShift) shiftSelecting = null;
        bound(instance);
      } finally {
        shiftSelecting = prevShift;
        suppressEdits = false;
      }
      e_preventDefault(e);
      return true;
    }
    var lastStoppedKey = null;
    function onKeyDown(e) {
      if (!focused) onFocus();
      if (ie && e.keyCode == 27) { e.returnValue = false; }
      if (options.onKeyEvent && options.onKeyEvent(instance, addStop(e))) return;
      var code = e_prop(e, "keyCode");
      // IE does strange things with escape.
      setShift(code == 16 || e_prop(e, "shiftKey"));
      // First give onKeyEvent option a chance to handle this.
      var handled = handleKeyBinding(e);
      if (window.opera) {
        lastStoppedKey = handled ? code : null;
        // Opera has no cut event... we try to at least catch the key combo
        if (!handled && code == 88 && e_prop(e, mac ? "metaKey" : "ctrlKey"))
          replaceSelection("");
      }
    }
    function onKeyPress(e) {
      var keyCode = e_prop(e, "keyCode"), charCode = e_prop(e, "charCode");
      if (window.opera && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return;}
      if (options.onKeyEvent && options.onKeyEvent(instance, addStop(e))) return;
      if (window.opera && !e.which && handleKeyBinding(e)) return;
      if (options.electricChars && mode.electricChars && options.smartIndent && !options.readOnly) {
        var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
        if (mode.electricChars.indexOf(ch) > -1)
          setTimeout(operation(function() {indentLine(sel.to.line, "smart");}), 75);
      }
      fastPoll();
    }
    function onKeyUp(e) {
      if (options.onKeyEvent && options.onKeyEvent(instance, addStop(e))) return;
      if (e_prop(e, "keyCode") == 16) shiftSelecting = null;
    }

    function onFocus() {
      if (options.readOnly == "nocursor") return;
      if (!focused) {
        if (options.onFocus) options.onFocus(instance);
        focused = true;
        if (wrapper.className.search(/\bCodeMirror-focused\b/) == -1)
          wrapper.className += " CodeMirror-focused";
        if (!leaveInputAlone) resetInput(true);
      }
      slowPoll();
      restartBlink();
    }
    function onBlur() {
      if (focused) {
        if (options.onBlur) options.onBlur(instance);
        focused = false;
        if (bracketHighlighted)
          operation(function(){
            if (bracketHighlighted) { bracketHighlighted(); bracketHighlighted = null; }
          })();
        wrapper.className = wrapper.className.replace(" CodeMirror-focused", "");
      }
      clearInterval(blinker);
      setTimeout(function() {if (!focused) shiftSelecting = null;}, 150);
    }

    // Replace the range from from to to by the strings in newText.
    // Afterwards, set the selection to selFrom, selTo.
    function updateLines(from, to, newText, selFrom, selTo) {
      if (suppressEdits) return;
      if (history) {
        var old = [];
        doc.iter(from.line, to.line + 1, function(line) { old.push(line.text); });
        history.addChange(from.line, newText.length, old);
        while (history.done.length > options.undoDepth) history.done.shift();
      }
      updateLinesNoUndo(from, to, newText, selFrom, selTo);
    }
    function unredoHelper(from, to, dir) {
      var set = from.pop(), len = set ? set.length : 0, out = [];
      for (var i = dir > 0 ? 0 : len - 1, e = dir > 0 ? len : -1; i != e; i += dir) {
        var change = set[i];
        var replaced = [], end = change.start + change.added;
        doc.iter(change.start, end, function(line) { replaced.push(line.text); });
        out.push({start: change.start, added: change.old.length, old: replaced});
        var pos = clipPos({line: change.start + change.old.length - 1,
                           ch: editEnd(replaced[replaced.length-1], change.old[change.old.length-1])});
        updateLinesNoUndo({line: change.start, ch: 0}, {line: end - 1, ch: getLine(end-1).text.length}, change.old, pos, pos);
      }
      updateInput = true;
      to.push(out);
    }
    function undo() {unredoHelper(history.done, history.undone, -1);}
    function redo() {unredoHelper(history.undone, history.done, 1);}

    function updateLinesNoUndo(from, to, newText, selFrom, selTo) {
      if (suppressEdits) return;
      var recomputeMaxLength = false, maxLineLength = maxLine.length;
      if (!options.lineWrapping)
        doc.iter(from.line, to.line, function(line) {
          if (line.text.length == maxLineLength) {recomputeMaxLength = true; return true;}
        });
      if (from.line != to.line || newText.length > 1) gutterDirty = true;

      var nlines = to.line - from.line, firstLine = getLine(from.line), lastLine = getLine(to.line);
      // First adjust the line structure, taking some care to leave highlighting intact.
      if (from.ch == 0 && to.ch == 0 && newText[newText.length - 1] == "") {
        // This is a whole-line replace. Treated specially to make
        // sure line objects move the way they are supposed to.
        var added = [], prevLine = null;
        if (from.line) {
          prevLine = getLine(from.line - 1);
          prevLine.fixMarkEnds(lastLine);
        } else lastLine.fixMarkStarts();
        for (var i = 0, e = newText.length - 1; i < e; ++i)
          added.push(Line.inheritMarks(newText[i], prevLine));
        if (nlines) doc.remove(from.line, nlines, callbacks);
        if (added.length) doc.insert(from.line, added);
      } else if (firstLine == lastLine) {
        if (newText.length == 1)
          firstLine.replace(from.ch, to.ch, newText[0]);
        else {
          lastLine = firstLine.split(to.ch, newText[newText.length-1]);
          firstLine.replace(from.ch, null, newText[0]);
          firstLine.fixMarkEnds(lastLine);
          var added = [];
          for (var i = 1, e = newText.length - 1; i < e; ++i)
            added.push(Line.inheritMarks(newText[i], firstLine));
          added.push(lastLine);
          doc.insert(from.line + 1, added);
        }
      } else if (newText.length == 1) {
        firstLine.replace(from.ch, null, newText[0]);
        lastLine.replace(null, to.ch, "");
        firstLine.append(lastLine);
        doc.remove(from.line + 1, nlines, callbacks);
      } else {
        var added = [];
        firstLine.replace(from.ch, null, newText[0]);
        lastLine.replace(null, to.ch, newText[newText.length-1]);
        firstLine.fixMarkEnds(lastLine);
        for (var i = 1, e = newText.length - 1; i < e; ++i)
          added.push(Line.inheritMarks(newText[i], firstLine));
        if (nlines > 1) doc.remove(from.line + 1, nlines - 1, callbacks);
        doc.insert(from.line + 1, added);
      }
      if (options.lineWrapping) {
        var perLine = scroller.clientWidth / charWidth() - 3;
        doc.iter(from.line, from.line + newText.length, function(line) {
          if (line.hidden) return;
          var guess = Math.ceil(line.text.length / perLine) || 1;
          if (guess != line.height) updateLineHeight(line, guess);
        });
      } else {
        doc.iter(from.line, i + newText.length, function(line) {
          var l = line.text;
          if (l.length > maxLineLength) {
            maxLine = l; maxLineLength = l.length; maxWidth = null;
            recomputeMaxLength = false;
          }
        });
        if (recomputeMaxLength) {
          maxLineLength = 0; maxLine = ""; maxWidth = null;
          doc.iter(0, doc.size, function(line) {
            var l = line.text;
            if (l.length > maxLineLength) {
              maxLineLength = l.length; maxLine = l;
            }
          });
        }
      }

      // Add these lines to the work array, so that they will be
      // highlighted. Adjust work lines if lines were added/removed.
      var newWork = [], lendiff = newText.length - nlines - 1;
      for (var i = 0, l = work.length; i < l; ++i) {
        var task = work[i];
        if (task < from.line) newWork.push(task);
        else if (task > to.line) newWork.push(task + lendiff);
      }
      var hlEnd = from.line + Math.min(newText.length, 500);
      highlightLines(from.line, hlEnd);
      newWork.push(hlEnd);
      work = newWork;
      startWorker(100);
      // Remember that these lines changed, for updating the display
      changes.push({from: from.line, to: to.line + 1, diff: lendiff});
      var changeObj = {from: from, to: to, text: newText};
      if (textChanged) {
        for (var cur = textChanged; cur.next; cur = cur.next) {}
        cur.next = changeObj;
      } else textChanged = changeObj;

      // Update the selection
      function updateLine(n) {return n <= Math.min(to.line, to.line + lendiff) ? n : n + lendiff;}
      setSelection(selFrom, selTo, updateLine(sel.from.line), updateLine(sel.to.line));

      // Make sure the scroll-size div has the correct height.
      if (scroller.clientHeight)
        code.style.height = (doc.height * textHeight() + 2 * paddingTop()) + "px";
    }

    function replaceRange(code, from, to) {
      from = clipPos(from);
      if (!to) to = from; else to = clipPos(to);
      code = splitLines(code);
      function adjustPos(pos) {
        if (posLess(pos, from)) return pos;
        if (!posLess(to, pos)) return end;
        var line = pos.line + code.length - (to.line - from.line) - 1;
        var ch = pos.ch;
        if (pos.line == to.line)
          ch += code[code.length-1].length - (to.ch - (to.line == from.line ? from.ch : 0));
        return {line: line, ch: ch};
      }
      var end;
      replaceRange1(code, from, to, function(end1) {
        end = end1;
        return {from: adjustPos(sel.from), to: adjustPos(sel.to)};
      });
      return end;
    }
    function replaceSelection(code, collapse) {
      replaceRange1(splitLines(code), sel.from, sel.to, function(end) {
        if (collapse == "end") return {from: end, to: end};
        else if (collapse == "start") return {from: sel.from, to: sel.from};
        else return {from: sel.from, to: end};
      });
    }
    function replaceRange1(code, from, to, computeSel) {
      var endch = code.length == 1 ? code[0].length + from.ch : code[code.length-1].length;
      var newSel = computeSel({line: from.line + code.length - 1, ch: endch});
      updateLines(from, to, code, newSel.from, newSel.to);
    }

    function getRange(from, to) {
      var l1 = from.line, l2 = to.line;
      if (l1 == l2) return getLine(l1).text.slice(from.ch, to.ch);
      var code = [getLine(l1).text.slice(from.ch)];
      doc.iter(l1 + 1, l2, function(line) { code.push(line.text); });
      code.push(getLine(l2).text.slice(0, to.ch));
      return code.join("\n");
    }
    function getSelection() {
      return getRange(sel.from, sel.to);
    }

    var pollingFast = false; // Ensures slowPoll doesn't cancel fastPoll
    function slowPoll() {
      if (pollingFast) return;
      poll.set(options.pollInterval, function() {
        startOperation();
        readInput();
        if (focused) slowPoll();
        endOperation();
      });
    }
    function fastPoll() {
      var missed = false;
      pollingFast = true;
      function p() {
        startOperation();
        var changed = readInput();
        if (!changed && !missed) {missed = true; poll.set(60, p);}
        else {pollingFast = false; slowPoll();}
        endOperation();
      }
      poll.set(20, p);
    }

    // Previnput is a hack to work with IME. If we reset the textarea
    // on every change, that breaks IME. So we look for changes
    // compared to the previous content instead. (Modern browsers have
    // events that indicate IME taking place, but these are not widely
    // supported or compatible enough yet to rely on.)
    var prevInput = "";
    function readInput() {
      if (leaveInputAlone || !focused || hasSelection(input) || options.readOnly) return false;
      var text = input.value;
      if (text == prevInput) return false;
      shiftSelecting = null;
      var same = 0, l = Math.min(prevInput.length, text.length);
      while (same < l && prevInput[same] == text[same]) ++same;
      if (same < prevInput.length)
        sel.from = {line: sel.from.line, ch: sel.from.ch - (prevInput.length - same)};
      else if (overwrite && posEq(sel.from, sel.to))
        sel.to = {line: sel.to.line, ch: Math.min(getLine(sel.to.line).text.length, sel.to.ch + (text.length - same))};
      replaceSelection(text.slice(same), "end");
      prevInput = text;
      return true;
    }
    function resetInput(user) {
      if (!posEq(sel.from, sel.to)) {
        prevInput = "";
        input.value = getSelection();
        input.select();
      } else if (user) prevInput = input.value = "";
    }

    function focusInput() {
      if (options.readOnly != "nocursor") input.focus();
    }

    function scrollEditorIntoView() {
      if (!cursor.getBoundingClientRect) return;
      var rect = cursor.getBoundingClientRect();
      // IE returns bogus coordinates when the instance sits inside of an iframe and the cursor is hidden
      if (ie && rect.top == rect.bottom) return;
      var winH = window.innerHeight || Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
      if (rect.top < 0 || rect.bottom > winH) cursor.scrollIntoView();
    }
    function scrollCursorIntoView() {
      var cursor = localCoords(sel.inverted ? sel.from : sel.to);
      var x = options.lineWrapping ? Math.min(cursor.x, lineSpace.offsetWidth) : cursor.x;
      return scrollIntoView(x, cursor.y, x, cursor.yBot);
    }
    function scrollIntoView(x1, y1, x2, y2) {
      var pl = paddingLeft(), pt = paddingTop(), lh = textHeight();
      y1 += pt; y2 += pt; x1 += pl; x2 += pl;
      var screen = scroller.clientHeight, screentop = scroller.scrollTop, scrolled = false, result = true;
      if (y1 < screentop) {scroller.scrollTop = Math.max(0, y1 - 2*lh); scrolled = true;}
      else if (y2 > screentop + screen) {scroller.scrollTop = y2 + lh - screen; scrolled = true;}

      var screenw = scroller.clientWidth, screenleft = scroller.scrollLeft;
      var gutterw = options.fixedGutter ? gutter.clientWidth : 0;
      if (x1 < screenleft + gutterw) {
        if (x1 < 50) x1 = 0;
        scroller.scrollLeft = Math.max(0, x1 - 10 - gutterw);
        scrolled = true;
      }
      else if (x2 > screenw + screenleft - 3) {
        scroller.scrollLeft = x2 + 10 - screenw;
        scrolled = true;
        if (x2 > code.clientWidth) result = false;
      }
      if (scrolled && options.onScroll) options.onScroll(instance);
      return result;
    }

    function visibleLines() {
      var lh = textHeight(), top = scroller.scrollTop - paddingTop();
      var from_height = Math.max(0, Math.floor(top / lh));
      var to_height = Math.ceil((top + scroller.clientHeight) / lh);
      return {from: lineAtHeight(doc, from_height),
              to: lineAtHeight(doc, to_height)};
    }
    // Uses a set of changes plus the current scroll position to
    // determine which DOM updates have to be made, and makes the
    // updates.
    function updateDisplay(changes, suppressCallback) {
      if (!scroller.clientWidth) {
        showingFrom = showingTo = displayOffset = 0;
        return;
      }
      // Compute the new visible window
      var visible = visibleLines();
      // Bail out if the visible area is already rendered and nothing changed.
      if (changes !== true && changes.length == 0 && visible.from > showingFrom && visible.to < showingTo) return;
      var from = Math.max(visible.from - 100, 0), to = Math.min(doc.size, visible.to + 100);
      if (showingFrom < from && from - showingFrom < 20) from = showingFrom;
      if (showingTo > to && showingTo - to < 20) to = Math.min(doc.size, showingTo);

      // Create a range of theoretically intact lines, and punch holes
      // in that using the change info.
      var intact = changes === true ? [] :
        computeIntact([{from: showingFrom, to: showingTo, domStart: 0}], changes);
      // Clip off the parts that won't be visible
      var intactLines = 0;
      for (var i = 0; i < intact.length; ++i) {
        var range = intact[i];
        if (range.from < from) {range.domStart += (from - range.from); range.from = from;}
        if (range.to > to) range.to = to;
        if (range.from >= range.to) intact.splice(i--, 1);
        else intactLines += range.to - range.from;
      }
      if (intactLines == to - from) return;
      intact.sort(function(a, b) {return a.domStart - b.domStart;});

      var th = textHeight(), gutterDisplay = gutter.style.display;
      lineDiv.style.display = "none";
      patchDisplay(from, to, intact);
      lineDiv.style.display = gutter.style.display = "";

      // Position the mover div to align with the lines it's supposed
      // to be showing (which will cover the visible display)
      var different = from != showingFrom || to != showingTo || lastSizeC != scroller.clientHeight + th;
      // This is just a bogus formula that detects when the editor is
      // resized or the font size changes.
      if (different) lastSizeC = scroller.clientHeight + th;
      showingFrom = from; showingTo = to;
      displayOffset = heightAtLine(doc, from);
      mover.style.top = (displayOffset * th) + "px";
      if (scroller.clientHeight)
        code.style.height = (doc.height * th + 2 * paddingTop()) + "px";

      // Since this is all rather error prone, it is honoured with the
      // only assertion in the whole file.
      if (lineDiv.childNodes.length != showingTo - showingFrom)
        throw new Error("BAD PATCH! " + JSON.stringify(intact) + " size=" + (showingTo - showingFrom) +
                        " nodes=" + lineDiv.childNodes.length);

      if (options.lineWrapping) {
        maxWidth = scroller.clientWidth;
        var curNode = lineDiv.firstChild, heightChanged = false;
        doc.iter(showingFrom, showingTo, function(line) {
          if (!line.hidden) {
            var height = Math.round(curNode.offsetHeight / th) || 1;
            if (line.height != height) {
              updateLineHeight(line, height);
              gutterDirty = heightChanged = true;
            }
          }
          curNode = curNode.nextSibling;
        });
        if (heightChanged)
          code.style.height = (doc.height * th + 2 * paddingTop()) + "px";
      } else {
        if (maxWidth == null) maxWidth = stringWidth(maxLine);
        if (maxWidth > scroller.clientWidth) {
          lineSpace.style.width = maxWidth + "px";
          // Needed to prevent odd wrapping/hiding of widgets placed in here.
          code.style.width = "";
          code.style.width = scroller.scrollWidth + "px";
        } else {
          lineSpace.style.width = code.style.width = "";
        }
      }
      gutter.style.display = gutterDisplay;
      if (different || gutterDirty) updateGutter();
      updateSelection();
      if (!suppressCallback && options.onUpdate) options.onUpdate(instance);
      return true;
    }

    function computeIntact(intact, changes) {
      for (var i = 0, l = changes.length || 0; i < l; ++i) {
        var change = changes[i], intact2 = [], diff = change.diff || 0;
        for (var j = 0, l2 = intact.length; j < l2; ++j) {
          var range = intact[j];
          if (change.to <= range.from && change.diff)
            intact2.push({from: range.from + diff, to: range.to + diff,
                          domStart: range.domStart});
          else if (change.to <= range.from || change.from >= range.to)
            intact2.push(range);
          else {
            if (change.from > range.from)
              intact2.push({from: range.from, to: change.from, domStart: range.domStart});
            if (change.to < range.to)
              intact2.push({from: change.to + diff, to: range.to + diff,
                            domStart: range.domStart + (change.to - range.from)});
          }
        }
        intact = intact2;
      }
      return intact;
    }

    function patchDisplay(from, to, intact) {
      // The first pass removes the DOM nodes that aren't intact.
      if (!intact.length) lineDiv.innerHTML = "";
      else {
        function killNode(node) {
          var tmp = node.nextSibling;
          node.parentNode.removeChild(node);
          return tmp;
        }
        var domPos = 0, curNode = lineDiv.firstChild, n;
        for (var i = 0; i < intact.length; ++i) {
          var cur = intact[i];
          while (cur.domStart > domPos) {curNode = killNode(curNode); domPos++;}
          for (var j = 0, e = cur.to - cur.from; j < e; ++j) {curNode = curNode.nextSibling; domPos++;}
        }
        while (curNode) curNode = killNode(curNode);
      }
      // This pass fills in the lines that actually changed.
      var nextIntact = intact.shift(), curNode = lineDiv.firstChild, j = from;
      var scratch = targetDocument.createElement("div"), newElt;
      doc.iter(from, to, function(line) {
        if (nextIntact && nextIntact.to == j) nextIntact = intact.shift();
        if (!nextIntact || nextIntact.from > j) {
          if (line.hidden) var html = scratch.innerHTML = "<pre></pre>";
          else {
            var html = '<pre>' + line.getHTML(tabText) + '</pre>';
            // Kludge to make sure the styled element lies behind the selection (by z-index)
            if (line.className)
              html = '<div style="position: relative"><pre class="' + line.className +
              '" style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: -2">&#160;</pre>' + html + "</div>";
          }
          scratch.innerHTML = html;
          lineDiv.insertBefore(scratch.firstChild, curNode);
        } else {
          curNode = curNode.nextSibling;
        }
        ++j;
      });
    }

    function updateGutter() {
      if (!options.gutter && !options.lineNumbers) return;
      var hText = mover.offsetHeight, hEditor = scroller.clientHeight;
      gutter.style.height = (hText - hEditor < 2 ? hEditor : hText) + "px";
      var html = [], i = showingFrom;
      doc.iter(showingFrom, Math.max(showingTo, showingFrom + 1), function(line) {
        if (line.hidden) {
          html.push("<pre></pre>");
        } else {
          var marker = line.gutterMarker;
          var text = options.lineNumbers ? i + options.firstLineNumber : null;
          if (marker && marker.text)
            text = marker.text.replace("%N%", text != null ? text : "");
          else if (text == null)
            text = "\u00a0";
          html.push((marker && marker.style ? '<pre class="' + marker.style + '">' : "<pre>"), text);
          for (var j = 1; j < line.height; ++j) html.push("<br/>&#160;");
          html.push("</pre>");
        }
        ++i;
      });
      gutter.style.display = "none";
      gutterText.innerHTML = html.join("");
      var minwidth = String(doc.size).length, firstNode = gutterText.firstChild, val = eltText(firstNode), pad = "";
      while (val.length + pad.length < minwidth) pad += "\u00a0";
      if (pad) firstNode.insertBefore(targetDocument.createTextNode(pad), firstNode.firstChild);
      gutter.style.display = "";
      lineSpace.style.marginLeft = gutter.offsetWidth + "px";
      gutterDirty = false;
    }
    function updateSelection() {
      var collapsed = posEq(sel.from, sel.to);
      var fromPos = localCoords(sel.from, true);
      var toPos = collapsed ? fromPos : localCoords(sel.to, true);
      var headPos = sel.inverted ? fromPos : toPos, th = textHeight();
      var wrapOff = eltOffset(wrapper), lineOff = eltOffset(lineDiv);
      inputDiv.style.top = Math.max(0, Math.min(scroller.offsetHeight, headPos.y + lineOff.top - wrapOff.top)) + "px";
      inputDiv.style.left = Math.max(0, Math.min(scroller.offsetWidth, headPos.x + lineOff.left - wrapOff.left)) + "px";
      if (collapsed) {
        cursor.style.top = headPos.y + "px";
        cursor.style.left = (options.lineWrapping ? Math.min(headPos.x, lineSpace.offsetWidth) : headPos.x) + "px";
        cursor.style.display = "";
        selectionDiv.style.display = "none";
      } else {
        var sameLine = fromPos.y == toPos.y, html = "";
        function add(left, top, right, height) {
          html += '<div class="CodeMirror-selected" style="position: absolute; left: ' + left +
            'px; top: ' + top + 'px; right: ' + right + 'px; height: ' + height + 'px"></div>';
        }
        if (sel.from.ch && fromPos.y >= 0) {
          var right = sameLine ? lineSpace.clientWidth - toPos.x : 0;
          add(fromPos.x, fromPos.y, right, th);
        }
        var middleStart = Math.max(0, fromPos.y + (sel.from.ch ? th : 0));
        var middleHeight = Math.min(toPos.y, lineSpace.clientHeight) - middleStart;
        if (middleHeight > 0.2 * th)
          add(0, middleStart, 0, middleHeight);
        if ((!sameLine || !sel.from.ch) && toPos.y < lineSpace.clientHeight - .5 * th)
          add(0, toPos.y, lineSpace.clientWidth - toPos.x, th);
        selectionDiv.innerHTML = html;
        cursor.style.display = "none";
        selectionDiv.style.display = "";
      }
    }

    function setShift(val) {
      if (val) shiftSelecting = shiftSelecting || (sel.inverted ? sel.to : sel.from);
      else shiftSelecting = null;
    }
    function setSelectionUser(from, to) {
      var sh = shiftSelecting && clipPos(shiftSelecting);
      if (sh) {
        if (posLess(sh, from)) from = sh;
        else if (posLess(to, sh)) to = sh;
      }
      setSelection(from, to);
      userSelChange = true;
    }
    // Update the selection. Last two args are only used by
    // updateLines, since they have to be expressed in the line
    // numbers before the update.
    function setSelection(from, to, oldFrom, oldTo) {
      goalColumn = null;
      if (oldFrom == null) {oldFrom = sel.from.line; oldTo = sel.to.line;}
      if (posEq(sel.from, from) && posEq(sel.to, to)) return;
      if (posLess(to, from)) {var tmp = to; to = from; from = tmp;}

      // Skip over hidden lines.
      if (from.line != oldFrom) from = skipHidden(from, oldFrom, sel.from.ch);
      if (to.line != oldTo) to = skipHidden(to, oldTo, sel.to.ch);

      if (posEq(from, to)) sel.inverted = false;
      else if (posEq(from, sel.to)) sel.inverted = false;
      else if (posEq(to, sel.from)) sel.inverted = true;

      sel.from = from; sel.to = to;
      selectionChanged = true;
    }
    function skipHidden(pos, oldLine, oldCh) {
      function getNonHidden(dir) {
        var lNo = pos.line + dir, end = dir == 1 ? doc.size : -1;
        while (lNo != end) {
          var line = getLine(lNo);
          if (!line.hidden) {
            var ch = pos.ch;
            if (ch > oldCh || ch > line.text.length) ch = line.text.length;
            return {line: lNo, ch: ch};
          }
          lNo += dir;
        }
      }
      var line = getLine(pos.line);
      if (!line.hidden) return pos;
      if (pos.line >= oldLine) return getNonHidden(1) || getNonHidden(-1);
      else return getNonHidden(-1) || getNonHidden(1);
    }
    function setCursor(line, ch, user) {
      var pos = clipPos({line: line, ch: ch || 0});
      (user ? setSelectionUser : setSelection)(pos, pos);
    }

    function clipLine(n) {return Math.max(0, Math.min(n, doc.size-1));}
    function clipPos(pos) {
      if (pos.line < 0) return {line: 0, ch: 0};
      if (pos.line >= doc.size) return {line: doc.size-1, ch: getLine(doc.size-1).text.length};
      var ch = pos.ch, linelen = getLine(pos.line).text.length;
      if (ch == null || ch > linelen) return {line: pos.line, ch: linelen};
      else if (ch < 0) return {line: pos.line, ch: 0};
      else return pos;
    }

    function findPosH(dir, unit) {
      var end = sel.inverted ? sel.from : sel.to, line = end.line, ch = end.ch;
      var lineObj = getLine(line);
      function findNextLine() {
        for (var l = line + dir, e = dir < 0 ? -1 : doc.size; l != e; l += dir) {
          var lo = getLine(l);
          if (!lo.hidden) { line = l; lineObj = lo; return true; }
        }
      }
      function moveOnce(boundToLine) {
        if (ch == (dir < 0 ? 0 : lineObj.text.length)) {
          if (!boundToLine && findNextLine()) ch = dir < 0 ? lineObj.text.length : 0;
          else return false;
        } else ch += dir;
        return true;
      }
      if (unit == "char") moveOnce();
      else if (unit == "column") moveOnce(true);
      else if (unit == "word") {
        var sawWord = false;
        for (;;) {
          if (dir < 0) if (!moveOnce()) break;
          if (isWordChar(lineObj.text.charAt(ch))) sawWord = true;
          else if (sawWord) {if (dir < 0) {dir = 1; moveOnce();} break;}
          if (dir > 0) if (!moveOnce()) break;
        }
      }
      return {line: line, ch: ch};
    }
    function moveH(dir, unit) {
      var pos = dir < 0 ? sel.from : sel.to;
      if (shiftSelecting || posEq(sel.from, sel.to)) pos = findPosH(dir, unit);
      setCursor(pos.line, pos.ch, true);
    }
    function deleteH(dir, unit) {
      if (!posEq(sel.from, sel.to)) replaceRange("", sel.from, sel.to);
      else if (dir < 0) replaceRange("", findPosH(dir, unit), sel.to);
      else replaceRange("", sel.from, findPosH(dir, unit));
      userSelChange = true;
    }
    var goalColumn = null;
    function moveV(dir, unit) {
      var dist = 0, pos = localCoords(sel.inverted ? sel.from : sel.to, true);
      if (goalColumn != null) pos.x = goalColumn;
      if (unit == "page") dist = Math.min(scroller.clientHeight, window.innerHeight || document.documentElement.clientHeight);
      else if (unit == "line") dist = textHeight();
      var target = coordsChar(pos.x, pos.y + dist * dir + 2);
      setCursor(target.line, target.ch, true);
      goalColumn = pos.x;
    }

    function selectWordAt(pos) {
      var line = getLine(pos.line).text;
      var start = pos.ch, end = pos.ch;
      while (start > 0 && isWordChar(line.charAt(start - 1))) --start;
      while (end < line.length && isWordChar(line.charAt(end))) ++end;
      setSelectionUser({line: pos.line, ch: start}, {line: pos.line, ch: end});
    }
    function selectLine(line) {
      setSelectionUser({line: line, ch: 0}, {line: line, ch: getLine(line).text.length});
    }
    function indentSelected(mode) {
      if (posEq(sel.from, sel.to)) return indentLine(sel.from.line, mode);
      var e = sel.to.line - (sel.to.ch ? 0 : 1);
      for (var i = sel.from.line; i <= e; ++i) indentLine(i, mode);
    }

    function indentLine(n, how) {
      if (!how) how = "add";
      if (how == "smart") {
        if (!mode.indent) how = "prev";
        else var state = getStateBefore(n);
      }

      var line = getLine(n), curSpace = line.indentation(options.tabSize),
          curSpaceString = line.text.match(/^\s*/)[0], indentation;
      if (how == "prev") {
        if (n) indentation = getLine(n-1).indentation(options.tabSize);
        else indentation = 0;
      }
      else if (how == "smart") indentation = mode.indent(state, line.text.slice(curSpaceString.length), line.text);
      else if (how == "add") indentation = curSpace + options.indentUnit;
      else if (how == "subtract") indentation = curSpace - options.indentUnit;
      indentation = Math.max(0, indentation);
      var diff = indentation - curSpace;

      if (!diff) {
        if (sel.from.line != n && sel.to.line != n) return;
        var indentString = curSpaceString;
      }
      else {
        var indentString = "", pos = 0;
        if (options.indentWithTabs)
          for (var i = Math.floor(indentation / options.tabSize); i; --i) {pos += options.tabSize; indentString += "\t";}
        while (pos < indentation) {++pos; indentString += " ";}
      }

      replaceRange(indentString, {line: n, ch: 0}, {line: n, ch: curSpaceString.length});
    }

    function loadMode() {
      mode = CodeMirror.getMode(options, options.mode);
      doc.iter(0, doc.size, function(line) { line.stateAfter = null; });
      work = [0];
      startWorker();
    }
    function gutterChanged() {
      var visible = options.gutter || options.lineNumbers;
      gutter.style.display = visible ? "" : "none";
      if (visible) gutterDirty = true;
      else lineDiv.parentNode.style.marginLeft = 0;
    }
    function wrappingChanged(from, to) {
      if (options.lineWrapping) {
        wrapper.className += " CodeMirror-wrap";
        var perLine = scroller.clientWidth / charWidth() - 3;
        doc.iter(0, doc.size, function(line) {
          if (line.hidden) return;
          var guess = Math.ceil(line.text.length / perLine) || 1;
          if (guess != 1) updateLineHeight(line, guess);
        });
        lineSpace.style.width = code.style.width = "";
      } else {
        wrapper.className = wrapper.className.replace(" CodeMirror-wrap", "");
        maxWidth = null; maxLine = "";
        doc.iter(0, doc.size, function(line) {
          if (line.height != 1 && !line.hidden) updateLineHeight(line, 1);
          if (line.text.length > maxLine.length) maxLine = line.text;
        });
      }
      changes.push({from: 0, to: doc.size});
    }
    function computeTabText() {
      for (var str = '<span class="cm-tab">', i = 0; i < options.tabSize; ++i) str += " ";
      return str + "</span>";
    }
    function tabsChanged() {
      tabText = computeTabText();
      updateDisplay(true);
    }
    function themeChanged() {
      scroller.className = scroller.className.replace(/\s*cm-s-\w+/g, "") +
        options.theme.replace(/(^|\s)\s*/g, " cm-s-");
    }

    function TextMarker() { this.set = []; }
    TextMarker.prototype.clear = operation(function() {
      var min = Infinity, max = -Infinity;
      for (var i = 0, e = this.set.length; i < e; ++i) {
        var line = this.set[i], mk = line.marked;
        if (!mk || !line.parent) continue;
        var lineN = lineNo(line);
        min = Math.min(min, lineN); max = Math.max(max, lineN);
        for (var j = 0; j < mk.length; ++j)
          if (mk[j].set == this.set) mk.splice(j--, 1);
      }
      if (min != Infinity)
        changes.push({from: min, to: max + 1});
    });
    TextMarker.prototype.find = function() {
      var from, to;
      for (var i = 0, e = this.set.length; i < e; ++i) {
        var line = this.set[i], mk = line.marked;
        for (var j = 0; j < mk.length; ++j) {
          var mark = mk[j];
          if (mark.set == this.set) {
            if (mark.from != null || mark.to != null) {
              var found = lineNo(line);
              if (found != null) {
                if (mark.from != null) from = {line: found, ch: mark.from};
                if (mark.to != null) to = {line: found, ch: mark.to};
              }
            }
          }
        }
      }
      return {from: from, to: to};
    };

    function markText(from, to, className) {
      from = clipPos(from); to = clipPos(to);
      var tm = new TextMarker();
      function add(line, from, to, className) {
        getLine(line).addMark(new MarkedText(from, to, className, tm.set));
      }
      if (from.line == to.line) add(from.line, from.ch, to.ch, className);
      else {
        add(from.line, from.ch, null, className);
        for (var i = from.line + 1, e = to.line; i < e; ++i)
          add(i, null, null, className);
        add(to.line, null, to.ch, className);
      }
      changes.push({from: from.line, to: to.line + 1});
      return tm;
    }

    function setBookmark(pos) {
      pos = clipPos(pos);
      var bm = new Bookmark(pos.ch);
      getLine(pos.line).addMark(bm);
      return bm;
    }

    function addGutterMarker(line, text, className) {
      if (typeof line == "number") line = getLine(clipLine(line));
      line.gutterMarker = {text: text, style: className};
      gutterDirty = true;
      return line;
    }
    function removeGutterMarker(line) {
      if (typeof line == "number") line = getLine(clipLine(line));
      line.gutterMarker = null;
      gutterDirty = true;
    }

    function changeLine(handle, op) {
      var no = handle, line = handle;
      if (typeof handle == "number") line = getLine(clipLine(handle));
      else no = lineNo(handle);
      if (no == null) return null;
      if (op(line, no)) changes.push({from: no, to: no + 1});
      else return null;
      return line;
    }
    function setLineClass(handle, className) {
      return changeLine(handle, function(line) {
        if (line.className != className) {
          line.className = className;
          return true;
        }
      });
    }
    function setLineHidden(handle, hidden) {
      return changeLine(handle, function(line, no) {
        if (line.hidden != hidden) {
          line.hidden = hidden;
          updateLineHeight(line, hidden ? 0 : 1);
          var fline = sel.from.line, tline = sel.to.line;
          if (hidden && (fline == no || tline == no)) {
            var from = fline == no ? skipHidden({line: fline, ch: 0}, fline, 0) : sel.from;
            var to = tline == no ? skipHidden({line: tline, ch: 0}, tline, 0) : sel.to;
            setSelection(from, to);
          }
          return (gutterDirty = true);
        }
      });
    }

    function lineInfo(line) {
      if (typeof line == "number") {
        if (!isLine(line)) return null;
        var n = line;
        line = getLine(line);
        if (!line) return null;
      }
      else {
        var n = lineNo(line);
        if (n == null) return null;
      }
      var marker = line.gutterMarker;
      return {line: n, handle: line, text: line.text, markerText: marker && marker.text,
              markerClass: marker && marker.style, lineClass: line.className};
    }

    function stringWidth(str) {
      measure.innerHTML = "<pre><span>x</span></pre>";
      measure.firstChild.firstChild.firstChild.nodeValue = str;
      return measure.firstChild.firstChild.offsetWidth || 10;
    }
    // These are used to go from pixel positions to character
    // positions, taking varying character widths into account.
    function charFromX(line, x) {
      if (x <= 0) return 0;
      var lineObj = getLine(line), text = lineObj.text;
      function getX(len) {
        measure.innerHTML = "<pre><span>" + lineObj.getHTML(tabText, len) + "</span></pre>";
        return measure.firstChild.firstChild.offsetWidth;
      }
      var from = 0, fromX = 0, to = text.length, toX;
      // Guess a suitable upper bound for our search.
      var estimated = Math.min(to, Math.ceil(x / charWidth()));
      for (;;) {
        var estX = getX(estimated);
        if (estX <= x && estimated < to) estimated = Math.min(to, Math.ceil(estimated * 1.2));
        else {toX = estX; to = estimated; break;}
      }
      if (x > toX) return to;
      // Try to guess a suitable lower bound as well.
      estimated = Math.floor(to * 0.8); estX = getX(estimated);
      if (estX < x) {from = estimated; fromX = estX;}
      // Do a binary search between these bounds.
      for (;;) {
        if (to - from <= 1) return (toX - x > x - fromX) ? from : to;
        var middle = Math.ceil((from + to) / 2), middleX = getX(middle);
        if (middleX > x) {to = middle; toX = middleX;}
        else {from = middle; fromX = middleX;}
      }
    }

    var tempId = Math.floor(Math.random() * 0xffffff).toString(16);
    function measureLine(line, ch) {
      if (ch == 0) return {top: 0, left: 0};
      var extra = "";
      // Include extra text at the end to make sure the measured line is wrapped in the right way.
      if (options.lineWrapping) {
        var end = line.text.indexOf(" ", ch + 2);
        extra = htmlEscape(line.text.slice(ch + 1, end < 0 ? line.text.length : end + (ie ? 5 : 0)));
      }
      measure.innerHTML = "<pre>" + line.getHTML(tabText, ch) +
        '<span id="CodeMirror-temp-' + tempId + '">' + htmlEscape(line.text.charAt(ch) || " ") + "</span>" +
        extra + "</pre>";
      var elt = document.getElementById("CodeMirror-temp-" + tempId);
      var top = elt.offsetTop, left = elt.offsetLeft;
      // Older IEs report zero offsets for spans directly after a wrap
      if (ie && top == 0 && left == 0) {
        var backup = document.createElement("span");
        backup.innerHTML = "x";
        elt.parentNode.insertBefore(backup, elt.nextSibling);
        top = backup.offsetTop;
      }
      return {top: top, left: left};
    }
    function localCoords(pos, inLineWrap) {
      var x, lh = textHeight(), y = lh * (heightAtLine(doc, pos.line) - (inLineWrap ? displayOffset : 0));
      if (pos.ch == 0) x = 0;
      else {
        var sp = measureLine(getLine(pos.line), pos.ch);
        x = sp.left;
        if (options.lineWrapping) y += Math.max(0, sp.top);
      }
      return {x: x, y: y, yBot: y + lh};
    }
    // Coords must be lineSpace-local
    function coordsChar(x, y) {
      if (y < 0) y = 0;
      var th = textHeight(), cw = charWidth(), heightPos = displayOffset + Math.floor(y / th);
      var lineNo = lineAtHeight(doc, heightPos);
      if (lineNo >= doc.size) return {line: doc.size - 1, ch: getLine(doc.size - 1).text.length};
      var lineObj = getLine(lineNo), text = lineObj.text;
      var tw = options.lineWrapping, innerOff = tw ? heightPos - heightAtLine(doc, lineNo) : 0;
      if (x <= 0 && innerOff == 0) return {line: lineNo, ch: 0};
      function getX(len) {
        var sp = measureLine(lineObj, len);
        if (tw) {
          var off = Math.round(sp.top / th);
          return Math.max(0, sp.left + (off - innerOff) * scroller.clientWidth);
        }
        return sp.left;
      }
      var from = 0, fromX = 0, to = text.length, toX;
      // Guess a suitable upper bound for our search.
      var estimated = Math.min(to, Math.ceil((x + innerOff * scroller.clientWidth * .9) / cw));
      for (;;) {
        var estX = getX(estimated);
        if (estX <= x && estimated < to) estimated = Math.min(to, Math.ceil(estimated * 1.2));
        else {toX = estX; to = estimated; break;}
      }
      if (x > toX) return {line: lineNo, ch: to};
      // Try to guess a suitable lower bound as well.
      estimated = Math.floor(to * 0.8); estX = getX(estimated);
      if (estX < x) {from = estimated; fromX = estX;}
      // Do a binary search between these bounds.
      for (;;) {
        if (to - from <= 1) return {line: lineNo, ch: (toX - x > x - fromX) ? from : to};
        var middle = Math.ceil((from + to) / 2), middleX = getX(middle);
        if (middleX > x) {to = middle; toX = middleX;}
        else {from = middle; fromX = middleX;}
      }
    }
    function pageCoords(pos) {
      var local = localCoords(pos, true), off = eltOffset(lineSpace);
      return {x: off.left + local.x, y: off.top + local.y, yBot: off.top + local.yBot};
    }

    var cachedHeight, cachedHeightFor, measureText;
    function textHeight() {
      if (measureText == null) {
        measureText = "<pre>";
        for (var i = 0; i < 49; ++i) measureText += "x<br/>";
        measureText += "x</pre>";
      }
      var offsetHeight = lineDiv.clientHeight;
      if (offsetHeight == cachedHeightFor) return cachedHeight;
      cachedHeightFor = offsetHeight;
      measure.innerHTML = measureText;
      cachedHeight = measure.firstChild.offsetHeight / 50 || 1;
      measure.innerHTML = "";
      return cachedHeight;
    }
    var cachedWidth, cachedWidthFor = 0;
    function charWidth() {
      if (scroller.clientWidth == cachedWidthFor) return cachedWidth;
      cachedWidthFor = scroller.clientWidth;
      return (cachedWidth = stringWidth("x"));
    }
    function paddingTop() {return lineSpace.offsetTop;}
    function paddingLeft() {return lineSpace.offsetLeft;}

    function posFromMouse(e, liberal) {
      var offW = eltOffset(scroller, true), x, y;
      // Fails unpredictably on IE[67] when mouse is dragged around quickly.
      try { x = e.clientX; y = e.clientY; } catch (e) { return null; }
      // This is a mess of a heuristic to try and determine whether a
      // scroll-bar was clicked or not, and to return null if one was
      // (and !liberal).
      if (!liberal && (x - offW.left > scroller.clientWidth || y - offW.top > scroller.clientHeight))
        return null;
      var offL = eltOffset(lineSpace, true);
      return coordsChar(x - offL.left, y - offL.top);
    }
    function onContextMenu(e) {
      var pos = posFromMouse(e);
      if (!pos || window.opera) return; // Opera is difficult.
      if (posEq(sel.from, sel.to) || posLess(pos, sel.from) || !posLess(pos, sel.to))
        operation(setCursor)(pos.line, pos.ch);

      var oldCSS = input.style.cssText;
      inputDiv.style.position = "absolute";
      input.style.cssText = "position: fixed; width: 30px; height: 30px; top: " + (e.clientY - 5) +
        "px; left: " + (e.clientX - 5) + "px; z-index: 1000; background: white; " +
        "border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
      leaveInputAlone = true;
      var val = input.value = getSelection();
      focusInput();
      input.select();
      function rehide() {
        var newVal = splitLines(input.value).join("\n");
        if (newVal != val) operation(replaceSelection)(newVal, "end");
        inputDiv.style.position = "relative";
        input.style.cssText = oldCSS;
        leaveInputAlone = false;
        resetInput(true);
        slowPoll();
      }

      if (gecko) {
        e_stop(e);
        var mouseup = connect(window, "mouseup", function() {
          mouseup();
          setTimeout(rehide, 20);
        }, true);
      }
      else {
        setTimeout(rehide, 50);
      }
    }

    // Cursor-blinking
    function restartBlink() {
      clearInterval(blinker);
      var on = true;
      cursor.style.visibility = "";
      blinker = setInterval(function() {
        cursor.style.visibility = (on = !on) ? "" : "hidden";
      }, 650);
    }

    var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};
    function matchBrackets(autoclear) {
      var head = sel.inverted ? sel.from : sel.to, line = getLine(head.line), pos = head.ch - 1;
      var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
      if (!match) return;
      var ch = match.charAt(0), forward = match.charAt(1) == ">", d = forward ? 1 : -1, st = line.styles;
      for (var off = pos + 1, i = 0, e = st.length; i < e; i+=2)
        if ((off -= st[i].length) <= 0) {var style = st[i+1]; break;}

      var stack = [line.text.charAt(pos)], re = /[(){}[\]]/;
      function scan(line, from, to) {
        if (!line.text) return;
        var st = line.styles, pos = forward ? 0 : line.text.length - 1, cur;
        for (var i = forward ? 0 : st.length - 2, e = forward ? st.length : -2; i != e; i += 2*d) {
          var text = st[i];
          if (st[i+1] != null && st[i+1] != style) {pos += d * text.length; continue;}
          for (var j = forward ? 0 : text.length - 1, te = forward ? text.length : -1; j != te; j += d, pos+=d) {
            if (pos >= from && pos < to && re.test(cur = text.charAt(j))) {
              var match = matching[cur];
              if (match.charAt(1) == ">" == forward) stack.push(cur);
              else if (stack.pop() != match.charAt(0)) return {pos: pos, match: false};
              else if (!stack.length) return {pos: pos, match: true};
            }
          }
        }
      }
      for (var i = head.line, e = forward ? Math.min(i + 100, doc.size) : Math.max(-1, i - 100); i != e; i+=d) {
        var line = getLine(i), first = i == head.line;
        var found = scan(line, first && forward ? pos + 1 : 0, first && !forward ? pos : line.text.length);
        if (found) break;
      }
      if (!found) found = {pos: null, match: false};
      var style = found.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
      var one = markText({line: head.line, ch: pos}, {line: head.line, ch: pos+1}, style),
          two = found.pos != null && markText({line: i, ch: found.pos}, {line: i, ch: found.pos + 1}, style);
      var clear = operation(function(){one.clear(); two && two.clear();});
      if (autoclear) setTimeout(clear, 800);
      else bracketHighlighted = clear;
    }

    // Finds the line to start with when starting a parse. Tries to
    // find a line with a stateAfter, so that it can start with a
    // valid state. If that fails, it returns the line with the
    // smallest indentation, which tends to need the least context to
    // parse correctly.
    function findStartLine(n) {
      var minindent, minline;
      for (var search = n, lim = n - 40; search > lim; --search) {
        if (search == 0) return 0;
        var line = getLine(search-1);
        if (line.stateAfter) return search;
        var indented = line.indentation(options.tabSize);
        if (minline == null || minindent > indented) {
          minline = search - 1;
          minindent = indented;
        }
      }
      return minline;
    }
    function getStateBefore(n) {
      var start = findStartLine(n), state = start && getLine(start-1).stateAfter;
      if (!state) state = startState(mode);
      else state = copyState(mode, state);
      doc.iter(start, n, function(line) {
        line.highlight(mode, state, options.tabSize);
        line.stateAfter = copyState(mode, state);
      });
      if (start < n) changes.push({from: start, to: n});
      if (n < doc.size && !getLine(n).stateAfter) work.push(n);
      return state;
    }
    function highlightLines(start, end) {
      var state = getStateBefore(start);
      doc.iter(start, end, function(line) {
        line.highlight(mode, state, options.tabSize);
        line.stateAfter = copyState(mode, state);
      });
    }
    function highlightWorker() {
      var end = +new Date + options.workTime;
      var foundWork = work.length;
      while (work.length) {
        if (!getLine(showingFrom).stateAfter) var task = showingFrom;
        else var task = work.pop();
        if (task >= doc.size) continue;
        var start = findStartLine(task), state = start && getLine(start-1).stateAfter;
        if (state) state = copyState(mode, state);
        else state = startState(mode);

        var unchanged = 0, compare = mode.compareStates, realChange = false,
            i = start, bail = false;
        doc.iter(i, doc.size, function(line) {
          var hadState = line.stateAfter;
          if (+new Date > end) {
            work.push(i);
            startWorker(options.workDelay);
            if (realChange) changes.push({from: task, to: i + 1});
            return (bail = true);
          }
          var changed = line.highlight(mode, state, options.tabSize);
          if (changed) realChange = true;
          line.stateAfter = copyState(mode, state);
          if (compare) {
            if (hadState && compare(hadState, state)) return true;
          } else {
            if (changed !== false || !hadState) unchanged = 0;
            else if (++unchanged > 3 && (!mode.indent || mode.indent(hadState, "") == mode.indent(state, "")))
              return true;
          }
          ++i;
        });
        if (bail) return;
        if (realChange) changes.push({from: task, to: i + 1});
      }
      if (foundWork && options.onHighlightComplete)
        options.onHighlightComplete(instance);
    }
    function startWorker(time) {
      if (!work.length) return;
      highlight.set(time, operation(highlightWorker));
    }

    // Operations are used to wrap changes in such a way that each
    // change won't have to update the cursor and display (which would
    // be awkward, slow, and error-prone), but instead updates are
    // batched and then all combined and executed at once.
    function startOperation() {
      updateInput = userSelChange = textChanged = null;
      changes = []; selectionChanged = false; callbacks = [];
    }
    function endOperation() {
      var reScroll = false, updated;
      if (selectionChanged) reScroll = !scrollCursorIntoView();
      if (changes.length) updated = updateDisplay(changes, true);
      else {
        if (selectionChanged) updateSelection();
        if (gutterDirty) updateGutter();
      }
      if (reScroll) scrollCursorIntoView();
      if (selectionChanged) {scrollEditorIntoView(); restartBlink();}

      if (focused && !leaveInputAlone &&
          (updateInput === true || (updateInput !== false && selectionChanged)))
        resetInput(userSelChange);

      if (selectionChanged && options.matchBrackets)
        setTimeout(operation(function() {
          if (bracketHighlighted) {bracketHighlighted(); bracketHighlighted = null;}
          if (posEq(sel.from, sel.to)) matchBrackets(false);
        }), 20);
      var tc = textChanged, cbs = callbacks; // these can be reset by callbacks
      if (selectionChanged && options.onCursorActivity)
        options.onCursorActivity(instance);
      if (tc && options.onChange && instance)
        options.onChange(instance, tc);
      for (var i = 0; i < cbs.length; ++i) cbs[i](instance);
      if (updated && options.onUpdate) options.onUpdate(instance);
    }
    var nestedOperation = 0;
    function operation(f) {
      return function() {
        if (!nestedOperation++) startOperation();
        try {var result = f.apply(this, arguments);}
        finally {if (!--nestedOperation) endOperation();}
        return result;
      };
    }

    for (var ext in extensions)
      if (extensions.propertyIsEnumerable(ext) &&
          !instance.propertyIsEnumerable(ext))
        instance[ext] = extensions[ext];
    return instance;
  } // (end of function CodeMirror)

  // The default configuration options.
  CodeMirror.defaults = {
    value: "",
    mode: null,
    theme: "default",
    indentUnit: 2,
    indentWithTabs: false,
    smartIndent: true,
    tabSize: 4,
    keyMap: "default",
    extraKeys: null,
    electricChars: true,
    onKeyEvent: null,
    lineWrapping: false,
    lineNumbers: false,
    gutter: false,
    fixedGutter: false,
    firstLineNumber: 1,
    readOnly: false,
    onChange: null,
    onCursorActivity: null,
    onGutterClick: null,
    onHighlightComplete: null,
    onUpdate: null,
    onFocus: null, onBlur: null, onScroll: null,
    matchBrackets: false,
    workTime: 100,
    workDelay: 200,
    pollInterval: 100,
    undoDepth: 40,
    tabindex: null,
    document: window.document
  };

  var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
  var mac = ios || /Mac/.test(navigator.platform);
  var win = /Win/.test(navigator.platform);

  // Known modes, by name and by MIME
  var modes = {}, mimeModes = {};
  CodeMirror.defineMode = function(name, mode) {
    if (!CodeMirror.defaults.mode && name != "null") CodeMirror.defaults.mode = name;
    modes[name] = mode;
  };
  CodeMirror.defineMIME = function(mime, spec) {
    mimeModes[mime] = spec;
  };
  CodeMirror.getMode = function(options, spec) {
    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec))
      spec = mimeModes[spec];
    if (typeof spec == "string")
      var mname = spec, config = {};
    else if (spec != null)
      var mname = spec.name, config = spec;
    var mfactory = modes[mname];
    if (!mfactory) {
      if (window.console) console.warn("No mode " + mname + " found, falling back to plain text.");
      return CodeMirror.getMode(options, "text/plain");
    }
    return mfactory(options, config || {});
  };
  CodeMirror.listModes = function() {
    var list = [];
    for (var m in modes)
      if (modes.propertyIsEnumerable(m)) list.push(m);
    return list;
  };
  CodeMirror.listMIMEs = function() {
    var list = [];
    for (var m in mimeModes)
      if (mimeModes.propertyIsEnumerable(m)) list.push({mime: m, mode: mimeModes[m]});
    return list;
  };

  var extensions = CodeMirror.extensions = {};
  CodeMirror.defineExtension = function(name, func) {
    extensions[name] = func;
  };

  var commands = CodeMirror.commands = {
    selectAll: function(cm) {cm.setSelection({line: 0, ch: 0}, {line: cm.lineCount() - 1});},
    killLine: function(cm) {
      var from = cm.getCursor(true), to = cm.getCursor(false), sel = !posEq(from, to);
      if (!sel && cm.getLine(from.line).length == from.ch) cm.replaceRange("", from, {line: from.line + 1, ch: 0});
      else cm.replaceRange("", from, sel ? to : {line: from.line});
    },
    deleteLine: function(cm) {var l = cm.getCursor().line; cm.replaceRange("", {line: l, ch: 0}, {line: l});},
    undo: function(cm) {cm.undo();},
    redo: function(cm) {cm.redo();},
    goDocStart: function(cm) {cm.setCursor(0, 0, true);},
    goDocEnd: function(cm) {cm.setSelection({line: cm.lineCount() - 1}, null, true);},
    goLineStart: function(cm) {cm.setCursor(cm.getCursor().line, 0, true);},
    goLineStartSmart: function(cm) {
      var cur = cm.getCursor();
      var text = cm.getLine(cur.line), firstNonWS = Math.max(0, text.search(/\S/));
      cm.setCursor(cur.line, cur.ch <= firstNonWS && cur.ch ? 0 : firstNonWS, true);
    },
    goLineEnd: function(cm) {cm.setSelection({line: cm.getCursor().line}, null, true);},
    goLineUp: function(cm) {cm.moveV(-1, "line");},
    goLineDown: function(cm) {cm.moveV(1, "line");},
    goPageUp: function(cm) {cm.moveV(-1, "page");},
    goPageDown: function(cm) {cm.moveV(1, "page");},
    goCharLeft: function(cm) {cm.moveH(-1, "char");},
    goCharRight: function(cm) {cm.moveH(1, "char");},
    goColumnLeft: function(cm) {cm.moveH(-1, "column");},
    goColumnRight: function(cm) {cm.moveH(1, "column");},
    goWordLeft: function(cm) {cm.moveH(-1, "word");},
    goWordRight: function(cm) {cm.moveH(1, "word");},
    delCharLeft: function(cm) {cm.deleteH(-1, "char");},
    delCharRight: function(cm) {cm.deleteH(1, "char");},
    delWordLeft: function(cm) {cm.deleteH(-1, "word");},
    delWordRight: function(cm) {cm.deleteH(1, "word");},
    indentAuto: function(cm) {cm.indentSelection("smart");},
    indentMore: function(cm) {cm.indentSelection("add");},
    indentLess: function(cm) {cm.indentSelection("subtract");},
    insertTab: function(cm) {cm.replaceSelection("\t", "end");},
    transposeChars: function(cm) {
      var cur = cm.getCursor(), line = cm.getLine(cur.line);
      if (cur.ch > 0 && cur.ch < line.length - 1)
        cm.replaceRange(line.charAt(cur.ch) + line.charAt(cur.ch - 1),
                        {line: cur.line, ch: cur.ch - 1}, {line: cur.line, ch: cur.ch + 1});
    },
    newlineAndIndent: function(cm) {
      cm.replaceSelection("\n", "end");
      cm.indentLine(cm.getCursor().line);
    },
    toggleOverwrite: function(cm) {cm.toggleOverwrite();}
  };

  var keyMap = CodeMirror.keyMap = {};
  keyMap.basic = {
    "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
    "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
    "Delete": "delCharRight", "Backspace": "delCharLeft", "Tab": "indentMore", "Shift-Tab": "indentLess",
    "Enter": "newlineAndIndent", "Insert": "toggleOverwrite"
  };
  // Note that the save and find-related commands aren't defined by
  // default. Unknown commands are simply ignored.
  keyMap.pcDefault = {
    "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
    "Ctrl-Home": "goDocStart", "Alt-Up": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Down": "goDocEnd",
    "Ctrl-Left": "goWordLeft", "Ctrl-Right": "goWordRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
    "Ctrl-Backspace": "delWordLeft", "Ctrl-Delete": "delWordRight", "Ctrl-S": "save", "Ctrl-F": "find",
    "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
    fallthrough: "basic"
  };
  keyMap.macDefault = {
    "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
    "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goWordLeft",
    "Alt-Right": "goWordRight", "Cmd-Left": "goLineStart", "Cmd-Right": "goLineEnd", "Alt-Backspace": "delWordLeft",
    "Ctrl-Alt-Backspace": "delWordRight", "Alt-Delete": "delWordRight", "Cmd-S": "save", "Cmd-F": "find",
    "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
    fallthrough: ["basic", "emacsy"]
  };
  keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;
  keyMap.emacsy = {
    "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
    "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
    "Ctrl-V": "goPageUp", "Shift-Ctrl-V": "goPageDown", "Ctrl-D": "delCharRight", "Ctrl-H": "delCharLeft",
    "Alt-D": "delWordRight", "Alt-Backspace": "delWordLeft", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars"
  };

  function lookupKey(name, extraMap, map) {
    function lookup(name, map, ft) {
      var found = map[name];
      if (found != null) return found;
      if (ft == null) ft = map.fallthrough;
      if (ft == null) return map.catchall;
      if (typeof ft == "string") return lookup(name, keyMap[ft]);
      for (var i = 0, e = ft.length; i < e; ++i) {
        found = lookup(name, keyMap[ft[i]]);
        if (found != null) return found;
      }
      return null;
    }
    return extraMap ? lookup(name, extraMap, map) : lookup(name, keyMap[map]);
  }
  function isModifierKey(event) {
    var name = keyNames[e_prop(event, "keyCode")];
    return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod";
  }

  CodeMirror.fromTextArea = function(textarea, options) {
    if (!options) options = {};
    options.value = textarea.value;
    if (!options.tabindex && textarea.tabindex)
      options.tabindex = textarea.tabindex;

    function save() {textarea.value = instance.getValue();}
    if (textarea.form) {
      // Deplorable hack to make the submit method do the right thing.
      var rmSubmit = connect(textarea.form, "submit", save, true);
      if (typeof textarea.form.submit == "function") {
        var realSubmit = textarea.form.submit;
        function wrappedSubmit() {
          save();
          textarea.form.submit = realSubmit;
          textarea.form.submit();
          textarea.form.submit = wrappedSubmit;
        }
        textarea.form.submit = wrappedSubmit;
      }
    }

    textarea.style.display = "none";
    var instance = CodeMirror(function(node) {
      textarea.parentNode.insertBefore(node, textarea.nextSibling);
    }, options);
    instance.save = save;
    instance.getTextArea = function() { return textarea; };
    instance.toTextArea = function() {
      save();
      textarea.parentNode.removeChild(instance.getWrapperElement());
      textarea.style.display = "";
      if (textarea.form) {
        rmSubmit();
        if (typeof textarea.form.submit == "function")
          textarea.form.submit = realSubmit;
      }
    };
    return instance;
  };

  // Utility functions for working with state. Exported because modes
  // sometimes need to do this.
  function copyState(mode, state) {
    if (state === true) return state;
    if (mode.copyState) return mode.copyState(state);
    var nstate = {};
    for (var n in state) {
      var val = state[n];
      if (val instanceof Array) val = val.concat([]);
      nstate[n] = val;
    }
    return nstate;
  }
  CodeMirror.copyState = copyState;
  function startState(mode, a1, a2) {
    return mode.startState ? mode.startState(a1, a2) : true;
  }
  CodeMirror.startState = startState;

  // The character stream used by a mode's parser.
  function StringStream(string, tabSize) {
    this.pos = this.start = 0;
    this.string = string;
    this.tabSize = tabSize || 8;
  }
  StringStream.prototype = {
    eol: function() {return this.pos >= this.string.length;},
    sol: function() {return this.pos == 0;},
    peek: function() {return this.string.charAt(this.pos);},
    next: function() {
      if (this.pos < this.string.length)
        return this.string.charAt(this.pos++);
    },
    eat: function(match) {
      var ch = this.string.charAt(this.pos);
      if (typeof match == "string") var ok = ch == match;
      else var ok = ch && (match.test ? match.test(ch) : match(ch));
      if (ok) {++this.pos; return ch;}
    },
    eatWhile: function(match) {
      var start = this.pos;
      while (this.eat(match)){}
      return this.pos > start;
    },
    eatSpace: function() {
      var start = this.pos;
      while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
      return this.pos > start;
    },
    skipToEnd: function() {this.pos = this.string.length;},
    skipTo: function(ch) {
      var found = this.string.indexOf(ch, this.pos);
      if (found > -1) {this.pos = found; return true;}
    },
    backUp: function(n) {this.pos -= n;},
    column: function() {return countColumn(this.string, this.start, this.tabSize);},
    indentation: function() {return countColumn(this.string, null, this.tabSize);},
    match: function(pattern, consume, caseInsensitive) {
      if (typeof pattern == "string") {
        function cased(str) {return caseInsensitive ? str.toLowerCase() : str;}
        if (cased(this.string).indexOf(cased(pattern), this.pos) == this.pos) {
          if (consume !== false) this.pos += pattern.length;
          return true;
        }
      }
      else {
        var match = this.string.slice(this.pos).match(pattern);
        if (match && consume !== false) this.pos += match[0].length;
        return match;
      }
    },
    current: function(){return this.string.slice(this.start, this.pos);}
  };
  CodeMirror.StringStream = StringStream;

  function MarkedText(from, to, className, set) {
    this.from = from; this.to = to; this.style = className; this.set = set;
  }
  MarkedText.prototype = {
    attach: function(line) { this.set.push(line); },
    detach: function(line) {
      var ix = indexOf(this.set, line);
      if (ix > -1) this.set.splice(ix, 1);
    },
    split: function(pos, lenBefore) {
      if (this.to <= pos && this.to != null) return null;
      var from = this.from < pos || this.from == null ? null : this.from - pos + lenBefore;
      var to = this.to == null ? null : this.to - pos + lenBefore;
      return new MarkedText(from, to, this.style, this.set);
    },
    dup: function() { return new MarkedText(null, null, this.style, this.set); },
    clipTo: function(fromOpen, from, toOpen, to, diff) {
      if (this.from != null && this.from >= from)
        this.from = Math.max(to, this.from) + diff;
      if (this.to != null && this.to > from)
        this.to = to < this.to ? this.to + diff : from;
      if (fromOpen && to > this.from && (to < this.to || this.to == null))
        this.from = null;
      if (toOpen && (from < this.to || this.to == null) && (from > this.from || this.from == null))
        this.to = null;
    },
    isDead: function() { return this.from != null && this.to != null && this.from >= this.to; },
    sameSet: function(x) { return this.set == x.set; }
  };

  function Bookmark(pos) {
    this.from = pos; this.to = pos; this.line = null;
  }
  Bookmark.prototype = {
    attach: function(line) { this.line = line; },
    detach: function(line) { if (this.line == line) this.line = null; },
    split: function(pos, lenBefore) {
      if (pos < this.from) {
        this.from = this.to = (this.from - pos) + lenBefore;
        return this;
      }
    },
    isDead: function() { return this.from > this.to; },
    clipTo: function(fromOpen, from, toOpen, to, diff) {
      if ((fromOpen || from < this.from) && (toOpen || to > this.to)) {
        this.from = 0; this.to = -1;
      } else if (this.from > from) {
        this.from = this.to = Math.max(to, this.from) + diff;
      }
    },
    sameSet: function(x) { return false; },
    find: function() {
      if (!this.line || !this.line.parent) return null;
      return {line: lineNo(this.line), ch: this.from};
    },
    clear: function() {
      if (this.line) {
        var found = indexOf(this.line.marked, this);
        if (found != -1) this.line.marked.splice(found, 1);
        this.line = null;
      }
    }
  };

  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  function Line(text, styles) {
    this.styles = styles || [text, null];
    this.text = text;
    this.height = 1;
    this.marked = this.gutterMarker = this.className = this.handlers = null;
    this.stateAfter = this.parent = this.hidden = null;
  }
  Line.inheritMarks = function(text, orig) {
    var ln = new Line(text), mk = orig && orig.marked;
    if (mk) {
      for (var i = 0; i < mk.length; ++i) {
        if (mk[i].to == null && mk[i].style) {
          var newmk = ln.marked || (ln.marked = []), mark = mk[i];
          var nmark = mark.dup(); newmk.push(nmark); nmark.attach(ln);
        }
      }
    }
    return ln;
  }
  Line.prototype = {
    // Replace a piece of a line, keeping the styles around it intact.
    replace: function(from, to_, text) {
      var st = [], mk = this.marked, to = to_ == null ? this.text.length : to_;
      copyStyles(0, from, this.styles, st);
      if (text) st.push(text, null);
      copyStyles(to, this.text.length, this.styles, st);
      this.styles = st;
      this.text = this.text.slice(0, from) + text + this.text.slice(to);
      this.stateAfter = null;
      if (mk) {
        var diff = text.length - (to - from);
        for (var i = 0; i < mk.length; ++i) {
          var mark = mk[i];
          mark.clipTo(from == null, from || 0, to_ == null, to, diff);
          if (mark.isDead()) {mark.detach(this); mk.splice(i--, 1);}
        }
      }
    },
    // Split a part off a line, keeping styles and markers intact.
    split: function(pos, textBefore) {
      var st = [textBefore, null], mk = this.marked;
      copyStyles(pos, this.text.length, this.styles, st);
      var taken = new Line(textBefore + this.text.slice(pos), st);
      if (mk) {
        for (var i = 0; i < mk.length; ++i) {
          var mark = mk[i];
          var newmark = mark.split(pos, textBefore.length);
          if (newmark) {
            if (!taken.marked) taken.marked = [];
            taken.marked.push(newmark); newmark.attach(taken);
          }
        }
      }
      return taken;
    },
    append: function(line) {
      var mylen = this.text.length, mk = line.marked, mymk = this.marked;
      this.text += line.text;
      copyStyles(0, line.text.length, line.styles, this.styles);
      if (mymk) {
        for (var i = 0; i < mymk.length; ++i)
          if (mymk[i].to == null) mymk[i].to = mylen;
      }
      if (mk && mk.length) {
        if (!mymk) this.marked = mymk = [];
        outer: for (var i = 0; i < mk.length; ++i) {
          var mark = mk[i];
          if (!mark.from) {
            for (var j = 0; j < mymk.length; ++j) {
              var mymark = mymk[j];
              if (mymark.to == mylen && mymark.sameSet(mark)) {
                mymark.to = mark.to == null ? null : mark.to + mylen;
                if (mymark.isDead()) {
                  mymark.detach(this);
                  mk.splice(i--, 1);
                }
                continue outer;
              }
            }
          }
          mymk.push(mark);
          mark.attach(this);
          mark.from += mylen;
          if (mark.to != null) mark.to += mylen;
        }
      }
    },
    fixMarkEnds: function(other) {
      var mk = this.marked, omk = other.marked;
      if (!mk) return;
      for (var i = 0; i < mk.length; ++i) {
        var mark = mk[i], close = mark.to == null;
        if (close && omk) {
          for (var j = 0; j < omk.length; ++j)
            if (omk[j].sameSet(mark)) {close = false; break;}
        }
        if (close) mark.to = this.text.length;
      }
    },
    fixMarkStarts: function() {
      var mk = this.marked;
      if (!mk) return;
      for (var i = 0; i < mk.length; ++i)
        if (mk[i].from == null) mk[i].from = 0;
    },
    addMark: function(mark) {
      mark.attach(this);
      if (this.marked == null) this.marked = [];
      this.marked.push(mark);
      this.marked.sort(function(a, b){return (a.from || 0) - (b.from || 0);});
    },
    // Run the given mode's parser over a line, update the styles
    // array, which contains alternating fragments of text and CSS
    // classes.
    highlight: function(mode, state, tabSize) {
      var stream = new StringStream(this.text, tabSize), st = this.styles, pos = 0;
      var changed = false, curWord = st[0], prevWord;
      if (this.text == "" && mode.blankLine) mode.blankLine(state);
      while (!stream.eol()) {
        var style = mode.token(stream, state);
        var substr = this.text.slice(stream.start, stream.pos);
        stream.start = stream.pos;
        if (pos && st[pos-1] == style)
          st[pos-2] += substr;
        else if (substr) {
          if (!changed && (st[pos+1] != style || (pos && st[pos-2] != prevWord))) changed = true;
          st[pos++] = substr; st[pos++] = style;
          prevWord = curWord; curWord = st[pos];
        }
        // Give up when line is ridiculously long
        if (stream.pos > 5000) {
          st[pos++] = this.text.slice(stream.pos); st[pos++] = null;
          break;
        }
      }
      if (st.length != pos) {st.length = pos; changed = true;}
      if (pos && st[pos-2] != prevWord) changed = true;
      // Short lines with simple highlights return null, and are
      // counted as changed by the driver because they are likely to
      // highlight the same way in various contexts.
      return changed || (st.length < 5 && this.text.length < 10 ? null : false);
    },
    // Fetch the parser token for a given character. Useful for hacks
    // that want to inspect the mode state (say, for completion).
    getTokenAt: function(mode, state, ch) {
      var txt = this.text, stream = new StringStream(txt);
      while (stream.pos < ch && !stream.eol()) {
        stream.start = stream.pos;
        var style = mode.token(stream, state);
      }
      return {start: stream.start,
              end: stream.pos,
              string: stream.current(),
              className: style || null,
              state: state};
    },
    indentation: function(tabSize) {return countColumn(this.text, null, tabSize);},
    // Produces an HTML fragment for the line, taking selection,
    // marking, and highlighting into account.
    getHTML: function(tabText, endAt) {
      var html = [], first = true;
      function span(text, style) {
        if (!text) return;
        // Work around a bug where, in some compat modes, IE ignores leading spaces
        if (first && ie && text.charAt(0) == " ") text = "\u00a0" + text.slice(1);
        first = false;
        if (style) html.push('<span class="', style, '">', htmlEscape(text).replace(/\t/g, tabText), "</span>");
        else html.push(htmlEscape(text).replace(/\t/g, tabText));
      }
      var st = this.styles, allText = this.text, marked = this.marked;
      var len = allText.length;
      if (endAt != null) len = Math.min(endAt, len);
      function styleToClass(style) {
        if (!style) return null;
        return "cm-" + style.replace(/ +/g, " cm-");
      }

      if (!allText && endAt == null)
        span(" ");
      else if (!marked || !marked.length)
        for (var i = 0, ch = 0; ch < len; i+=2) {
          var str = st[i], style = st[i+1], l = str.length;
          if (ch + l > len) str = str.slice(0, len - ch);
          ch += l;
          span(str, styleToClass(style));
        }
      else {
        var pos = 0, i = 0, text = "", style, sg = 0;
        var nextChange = marked[0].from || 0, marks = [], markpos = 0;
        function advanceMarks() {
          var m;
          while (markpos < marked.length &&
                 ((m = marked[markpos]).from == pos || m.from == null)) {
            if (m.style != null) marks.push(m);
            ++markpos;
          }
          nextChange = markpos < marked.length ? marked[markpos].from : Infinity;
          for (var i = 0; i < marks.length; ++i) {
            var to = marks[i].to || Infinity;
            if (to == pos) marks.splice(i--, 1);
            else nextChange = Math.min(to, nextChange);
          }
        }
        var m = 0;
        while (pos < len) {
          if (nextChange == pos) advanceMarks();
          var upto = Math.min(len, nextChange);
          while (true) {
            if (text) {
              var end = pos + text.length;
              var appliedStyle = style;
              for (var j = 0; j < marks.length; ++j)
                appliedStyle = (appliedStyle ? appliedStyle + " " : "") + marks[j].style;
              span(end > upto ? text.slice(0, upto - pos) : text, appliedStyle);
              if (end >= upto) {text = text.slice(upto - pos); pos = upto; break;}
              pos = end;
            }
            text = st[i++]; style = styleToClass(st[i++]);
          }
        }
      }
      return html.join("");
    },
    cleanUp: function() {
      this.parent = null;
      if (this.marked)
        for (var i = 0, e = this.marked.length; i < e; ++i) this.marked[i].detach(this);
    }
  };
  // Utility used by replace and split above
  function copyStyles(from, to, source, dest) {
    for (var i = 0, pos = 0, state = 0; pos < to; i+=2) {
      var part = source[i], end = pos + part.length;
      if (state == 0) {
        if (end > from) dest.push(part.slice(from - pos, Math.min(part.length, to - pos)), source[i+1]);
        if (end >= from) state = 1;
      }
      else if (state == 1) {
        if (end > to) dest.push(part.slice(0, to - pos), source[i+1]);
        else dest.push(part, source[i+1]);
      }
      pos = end;
    }
  }

  // Data structure that holds the sequence of lines.
  function LeafChunk(lines) {
    this.lines = lines;
    this.parent = null;
    for (var i = 0, e = lines.length, height = 0; i < e; ++i) {
      lines[i].parent = this;
      height += lines[i].height;
    }
    this.height = height;
  }
  LeafChunk.prototype = {
    chunkSize: function() { return this.lines.length; },
    remove: function(at, n, callbacks) {
      for (var i = at, e = at + n; i < e; ++i) {
        var line = this.lines[i];
        this.height -= line.height;
        line.cleanUp();
        if (line.handlers)
          for (var j = 0; j < line.handlers.length; ++j) callbacks.push(line.handlers[j]);
      }
      this.lines.splice(at, n);
    },
    collapse: function(lines) {
      lines.splice.apply(lines, [lines.length, 0].concat(this.lines));
    },
    insertHeight: function(at, lines, height) {
      this.height += height;
      this.lines.splice.apply(this.lines, [at, 0].concat(lines));
      for (var i = 0, e = lines.length; i < e; ++i) lines[i].parent = this;
    },
    iterN: function(at, n, op) {
      for (var e = at + n; at < e; ++at)
        if (op(this.lines[at])) return true;
    }
  };
  function BranchChunk(children) {
    this.children = children;
    var size = 0, height = 0;
    for (var i = 0, e = children.length; i < e; ++i) {
      var ch = children[i];
      size += ch.chunkSize(); height += ch.height;
      ch.parent = this;
    }
    this.size = size;
    this.height = height;
    this.parent = null;
  }
  BranchChunk.prototype = {
    chunkSize: function() { return this.size; },
    remove: function(at, n, callbacks) {
      this.size -= n;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var rm = Math.min(n, sz - at), oldHeight = child.height;
          child.remove(at, rm, callbacks);
          this.height -= oldHeight - child.height;
          if (sz == rm) { this.children.splice(i--, 1); child.parent = null; }
          if ((n -= rm) == 0) break;
          at = 0;
        } else at -= sz;
      }
      if (this.size - n < 25) {
        var lines = [];
        this.collapse(lines);
        this.children = [new LeafChunk(lines)];
        this.children[0].parent = this;
      }
    },
    collapse: function(lines) {
      for (var i = 0, e = this.children.length; i < e; ++i) this.children[i].collapse(lines);
    },
    insert: function(at, lines) {
      var height = 0;
      for (var i = 0, e = lines.length; i < e; ++i) height += lines[i].height;
      this.insertHeight(at, lines, height);
    },
    insertHeight: function(at, lines, height) {
      this.size += lines.length;
      this.height += height;
      for (var i = 0, e = this.children.length; i < e; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at <= sz) {
          child.insertHeight(at, lines, height);
          if (child.lines && child.lines.length > 50) {
            while (child.lines.length > 50) {
              var spilled = child.lines.splice(child.lines.length - 25, 25);
              var newleaf = new LeafChunk(spilled);
              child.height -= newleaf.height;
              this.children.splice(i + 1, 0, newleaf);
              newleaf.parent = this;
            }
            this.maybeSpill();
          }
          break;
        }
        at -= sz;
      }
    },
    maybeSpill: function() {
      if (this.children.length <= 10) return;
      var me = this;
      do {
        var spilled = me.children.splice(me.children.length - 5, 5);
        var sibling = new BranchChunk(spilled);
        if (!me.parent) { // Become the parent node
          var copy = new BranchChunk(me.children);
          copy.parent = me;
          me.children = [copy, sibling];
          me = copy;
        } else {
          me.size -= sibling.size;
          me.height -= sibling.height;
          var myIndex = indexOf(me.parent.children, me);
          me.parent.children.splice(myIndex + 1, 0, sibling);
        }
        sibling.parent = me.parent;
      } while (me.children.length > 10);
      me.parent.maybeSpill();
    },
    iter: function(from, to, op) { this.iterN(from, to - from, op); },
    iterN: function(at, n, op) {
      for (var i = 0, e = this.children.length; i < e; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var used = Math.min(n, sz - at);
          if (child.iterN(at, used, op)) return true;
          if ((n -= used) == 0) break;
          at = 0;
        } else at -= sz;
      }
    }
  };

  function getLineAt(chunk, n) {
    while (!chunk.lines) {
      for (var i = 0;; ++i) {
        var child = chunk.children[i], sz = child.chunkSize();
        if (n < sz) { chunk = child; break; }
        n -= sz;
      }
    }
    return chunk.lines[n];
  }
  function lineNo(line) {
    if (line.parent == null) return null;
    var cur = line.parent, no = indexOf(cur.lines, line);
    for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
      for (var i = 0, e = chunk.children.length; ; ++i) {
        if (chunk.children[i] == cur) break;
        no += chunk.children[i].chunkSize();
      }
    }
    return no;
  }
  function lineAtHeight(chunk, h) {
    var n = 0;
    outer: do {
      for (var i = 0, e = chunk.children.length; i < e; ++i) {
        var child = chunk.children[i], ch = child.height;
        if (h < ch) { chunk = child; continue outer; }
        h -= ch;
        n += child.chunkSize();
      }
      return n;
    } while (!chunk.lines);
    for (var i = 0, e = chunk.lines.length; i < e; ++i) {
      var line = chunk.lines[i], lh = line.height;
      if (h < lh) break;
      h -= lh;
    }
    return n + i;
  }
  function heightAtLine(chunk, n) {
    var h = 0;
    outer: do {
      for (var i = 0, e = chunk.children.length; i < e; ++i) {
        var child = chunk.children[i], sz = child.chunkSize();
        if (n < sz) { chunk = child; continue outer; }
        n -= sz;
        h += child.height;
      }
      return h;
    } while (!chunk.lines);
    for (var i = 0; i < n; ++i) h += chunk.lines[i].height;
    return h;
  }

  // The history object 'chunks' changes that are made close together
  // and at almost the same time into bigger undoable units.
  function History() {
    this.time = 0;
    this.done = []; this.undone = [];
  }
  History.prototype = {
    addChange: function(start, added, old) {
      this.undone.length = 0;
      var time = +new Date, cur = this.done[this.done.length - 1], last = cur && cur[cur.length - 1];
      var dtime = time - this.time;
      if (dtime > 400 || !last) {
        this.done.push([{start: start, added: added, old: old}]);
      } else if (last.start > start + added || last.start + last.added < start - last.added + last.old.length) {
        cur.push({start: start, added: added, old: old});
      } else {
        var oldoff = 0;
        if (start < last.start) {
          for (var i = last.start - start - 1; i >= 0; --i)
            last.old.unshift(old[i]);
          last.added += last.start - start;
          last.start = start;
        }
        else if (last.start < start) {
          oldoff = start - last.start;
          added += oldoff;
        }
        for (var i = last.added - oldoff, e = old.length; i < e; ++i)
          last.old.push(old[i]);
        if (last.added < added) last.added = added;
      }
      this.time = time;
    }
  };

  function stopMethod() {e_stop(this);}
  // Ensure an event has a stop method.
  function addStop(event) {
    if (!event.stop) event.stop = stopMethod;
    return event;
  }

  function e_preventDefault(e) {
    if (e.preventDefault) e.preventDefault();
    else e.returnValue = false;
  }
  function e_stopPropagation(e) {
    if (e.stopPropagation) e.stopPropagation();
    else e.cancelBubble = true;
  }
  function e_stop(e) {e_preventDefault(e); e_stopPropagation(e);}
  CodeMirror.e_stop = e_stop;
  CodeMirror.e_preventDefault = e_preventDefault;
  CodeMirror.e_stopPropagation = e_stopPropagation;

  function e_target(e) {return e.target || e.srcElement;}
  function e_button(e) {
    if (e.which) return e.which;
    else if (e.button & 1) return 1;
    else if (e.button & 2) return 3;
    else if (e.button & 4) return 2;
  }

  // Allow 3rd-party code to override event properties by adding an override
  // object to an event object.
  function e_prop(e, prop) {
    var overridden = e.override && e.override.hasOwnProperty(prop);
    return overridden ? e.override[prop] : e[prop];
  }

  // Event handler registration. If disconnect is true, it'll return a
  // function that unregisters the handler.
  function connect(node, type, handler, disconnect) {
    if (typeof node.addEventListener == "function") {
      node.addEventListener(type, handler, false);
      if (disconnect) return function() {node.removeEventListener(type, handler, false);};
    }
    else {
      var wrapHandler = function(event) {handler(event || window.event);};
      node.attachEvent("on" + type, wrapHandler);
      if (disconnect) return function() {node.detachEvent("on" + type, wrapHandler);};
    }
  }
  CodeMirror.connect = connect;

  function Delayed() {this.id = null;}
  Delayed.prototype = {set: function(ms, f) {clearTimeout(this.id); this.id = setTimeout(f, ms);}};

  // Detect drag-and-drop
  var dragAndDrop = function() {
    // IE8 has ondragstart and ondrop properties, but doesn't seem to
    // actually support ondragstart the way it's supposed to work.
    if (/MSIE [1-8]\b/.test(navigator.userAgent)) return false;
    var div = document.createElement('div');
    return "draggable" in div;
  }();

  var gecko = /gecko\/\d{7}/i.test(navigator.userAgent);
  var ie = /MSIE \d/.test(navigator.userAgent);
  var webkit = /WebKit\//.test(navigator.userAgent);

  var lineSep = "\n";
  // Feature-detect whether newlines in textareas are converted to \r\n
  (function () {
    var te = document.createElement("textarea");
    te.value = "foo\nbar";
    if (te.value.indexOf("\r") > -1) lineSep = "\r\n";
  }());

  // Counts the column offset in a string, taking tabs into account.
  // Used mostly to find indentation.
  function countColumn(string, end, tabSize) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/);
      if (end == -1) end = string.length;
    }
    for (var i = 0, n = 0; i < end; ++i) {
      if (string.charAt(i) == "\t") n += tabSize - (n % tabSize);
      else ++n;
    }
    return n;
  }

  function computedStyle(elt) {
    if (elt.currentStyle) return elt.currentStyle;
    return window.getComputedStyle(elt, null);
  }

  // Find the position of an element by following the offsetParent chain.
  // If screen==true, it returns screen (rather than page) coordinates.
  function eltOffset(node, screen) {
    var bod = node.ownerDocument.body;
    var x = 0, y = 0, skipBody = false;
    for (var n = node; n; n = n.offsetParent) {
      var ol = n.offsetLeft, ot = n.offsetTop;
      // Firefox reports weird inverted offsets when the body has a border.
      if (n == bod) { x += Math.abs(ol); y += Math.abs(ot); }
      else { x += ol, y += ot; }
      if (screen && computedStyle(n).position == "fixed")
        skipBody = true;
    }
    var e = screen && !skipBody ? null : bod;
    for (var n = node.parentNode; n != e; n = n.parentNode)
      if (n.scrollLeft != null) { x -= n.scrollLeft; y -= n.scrollTop;}
    return {left: x, top: y};
  }
  // Use the faster and saner getBoundingClientRect method when possible.
  if (document.documentElement.getBoundingClientRect != null) eltOffset = function(node, screen) {
    // Take the parts of bounding client rect that we are interested in so we are able to edit if need be,
    // since the returned value cannot be changed externally (they are kept in sync as the element moves within the page)
    try { var box = node.getBoundingClientRect(); box = { top: box.top, left: box.left }; }
    catch(e) { box = {top: 0, left: 0}; }
    if (!screen) {
      // Get the toplevel scroll, working around browser differences.
      if (window.pageYOffset == null) {
        var t = document.documentElement || document.body.parentNode;
        if (t.scrollTop == null) t = document.body;
        box.top += t.scrollTop; box.left += t.scrollLeft;
      } else {
        box.top += window.pageYOffset; box.left += window.pageXOffset;
      }
    }
    return box;
  };

  // Get a node's text content.
  function eltText(node) {
    return node.textContent || node.innerText || node.nodeValue || "";
  }
  function selectInput(node) {
    if (ios) { // Mobile Safari apparently has a bug where select() is broken.
      node.selectionStart = 0;
      node.selectionEnd = node.value.length;
    } else node.select();
  }

  // Operations on {line, ch} objects.
  function posEq(a, b) {return a.line == b.line && a.ch == b.ch;}
  function posLess(a, b) {return a.line < b.line || (a.line == b.line && a.ch < b.ch);}
  function copyPos(x) {return {line: x.line, ch: x.ch};}

  var escapeElement = document.createElement("pre");
  function htmlEscape(str) {
    escapeElement.textContent = str;
    return escapeElement.innerHTML;
  }
  // Recent (late 2011) Opera betas insert bogus newlines at the start
  // of the textContent, so we strip those.
  if (htmlEscape("a") == "\na")
    htmlEscape = function(str) {
      escapeElement.textContent = str;
      return escapeElement.innerHTML.slice(1);
    };
  // Some IEs don't preserve tabs through innerHTML
  else if (htmlEscape("\t") != "\t")
    htmlEscape = function(str) {
      escapeElement.innerHTML = "";
      escapeElement.appendChild(document.createTextNode(str));
      return escapeElement.innerHTML;
    };
  CodeMirror.htmlEscape = htmlEscape;

  // Used to position the cursor after an undo/redo by finding the
  // last edited character.
  function editEnd(from, to) {
    if (!to) return 0;
    if (!from) return to.length;
    for (var i = from.length, j = to.length; i >= 0 && j >= 0; --i, --j)
      if (from.charAt(i) != to.charAt(j)) break;
    return j + 1;
  }

  function indexOf(collection, elt) {
    if (collection.indexOf) return collection.indexOf(elt);
    for (var i = 0, e = collection.length; i < e; ++i)
      if (collection[i] == elt) return i;
    return -1;
  }
  function isWordChar(ch) {
    return /\w/.test(ch) || ch.toUpperCase() != ch.toLowerCase();
  }

  // See if "".split is the broken IE version, if so, provide an
  // alternative way to split lines.
  var splitLines = "\n\nb".split(/\n/).length != 3 ? function(string) {
    var pos = 0, nl, result = [];
    while ((nl = string.indexOf("\n", pos)) > -1) {
      result.push(string.slice(pos, string.charAt(nl-1) == "\r" ? nl - 1 : nl));
      pos = nl + 1;
    }
    result.push(string.slice(pos));
    return result;
  } : function(string){return string.split(/\r?\n/);};
  CodeMirror.splitLines = splitLines;

  var hasSelection = window.getSelection ? function(te) {
    try { return te.selectionStart != te.selectionEnd; }
    catch(e) { return false; }
  } : function(te) {
    try {var range = te.ownerDocument.selection.createRange();}
    catch(e) {}
    if (!range || range.parentElement() != te) return false;
    return range.compareEndPoints("StartToEnd", range) != 0;
  };

  CodeMirror.defineMode("null", function() {
    return {token: function(stream) {stream.skipToEnd();}};
  });
  CodeMirror.defineMIME("text/plain", "null");

  var keyNames = {3: "Enter", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
                  19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
                  36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
                  46: "Delete", 59: ";", 91: "Mod", 92: "Mod", 93: "Mod", 186: ";", 187: "=", 188: ",",
                  189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: "'", 63276: "PageUp",
                  63277: "PageDown", 63275: "End", 63273: "Home", 63234: "Left", 63232: "Up", 63235: "Right",
                  63233: "Down", 63302: "Insert", 63272: "Delete"};
  CodeMirror.keyNames = keyNames;
  (function() {
    // Number keys
    for (var i = 0; i < 10; i++) keyNames[i + 48] = String(i);
    // Alphabetic keys
    for (var i = 65; i <= 90; i++) keyNames[i] = String.fromCharCode(i);
    // Function keys
    for (var i = 1; i <= 12; i++) keyNames[i + 111] = keyNames[i + 63235] = "F" + i;
  })();

  return CodeMirror;
})();
/**
 * Author: Hans Engel
 * Branched from CodeMirror's Scheme mode (by Koh Zi Han, based on implementation by Koh Zi Chun)
 */
CodeMirror.defineMode("clojure", function (config, mode) {
    var BUILTIN = "builtin", COMMENT = "comment", STRING = "string", TAG = "tag",
        ATOM = "atom", NUMBER = "number", BRACKET = "bracket", KEYWORD="keyword";
    var INDENT_WORD_SKIP = 2, KEYWORDS_SKIP = 1;

    function makeKeywords(str) {
        var obj = {}, words = str.split(" ");
        for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
    }

    var atoms = makeKeywords("true false nil");

    var keywords = makeKeywords(
        // Control structures
        "defn defn- def def- defonce defmulti defmethod defmacro defstruct deftype defprotocol defrecord deftest slice defalias defhinted defmacro- defn-memo defnk defnk defonce- defunbound defunbound- defvar defvar- let letfn do case cond condp for loop recur when when-not when-let when-first if if-let if-not . .. -> ->> doto and or dosync doseq dotimes dorun doall load import unimport ns in-ns refer try catch finally throw with-open with-local-vars binding gen-class gen-and-load-class gen-and-save-class handler-case handle" +

        // Built-ins
        "* *1 *2 *3 *agent* *allow-unresolved-vars* *assert *clojure-version* *command-line-args* *compile-files* *compile-path* *e *err* *file* *flush-on-newline* *in* *macro-meta* *math-context* *ns* *out* *print-dup* *print-length* *print-level* *print-meta* *print-readably* *read-eval* *source-path* *use-context-classloader* *warn-on-reflection* + - / < <= = == > >= accessor aclone agent agent-errors aget alength alias all-ns alter alter-meta! alter-var-root amap ancestors and apply areduce array-map aset aset-boolean aset-byte aset-char aset-double aset-float aset-int aset-long aset-short assert assoc assoc! assoc-in associative? atom await await-for await1 bases bean bigdec bigint binding bit-and bit-and-not bit-clear bit-flip bit-not bit-or bit-set bit-shift-left bit-shift-right bit-test bit-xor boolean boolean-array booleans bound-fn bound-fn* butlast byte byte-array bytes case cast char char-array char-escape-string char-name-string char? chars chunk chunk-append chunk-buffer chunk-cons chunk-first chunk-next chunk-rest chunked-seq? class class? clear-agent-errors clojure-version coll? comment commute comp comparator compare compare-and-set! compile complement concat cond condp conj conj! cons constantly construct-proxy contains? count counted? create-ns create-struct cycle dec decimal? declare definline defmacro defmethod defmulti defn defn- defonce defstruct delay delay? deliver deref derive descendants destructure disj disj! dissoc dissoc! distinct distinct? doall doc dorun doseq dosync dotimes doto double double-array doubles drop drop-last drop-while empty empty? ensure enumeration-seq eval even? every? extend extend-protocol extend-type extends? extenders false? ffirst file-seq filter find find-doc find-ns find-var first float float-array float? floats flush fn fn? fnext for force format future future-call future-cancel future-cancelled? future-done? future? gen-class gen-interface gensym get get-in get-method get-proxy-class get-thread-bindings get-validator hash hash-map hash-set identical? identity if-let if-not ifn? import in-ns inc init-proxy instance? int int-array integer? interleave intern interpose into into-array ints io! isa? iterate iterator-seq juxt key keys keyword keyword? last lazy-cat lazy-seq let letfn line-seq list list* list? load load-file load-reader load-string loaded-libs locking long long-array longs loop macroexpand macroexpand-1 make-array make-hierarchy map map? mapcat max max-key memfn memoize merge merge-with meta method-sig methods min min-key mod name namespace neg? newline next nfirst nil? nnext not not-any? not-empty not-every? not= ns ns-aliases ns-imports ns-interns ns-map ns-name ns-publics ns-refers ns-resolve ns-unalias ns-unmap nth nthnext num number? odd? or parents partial partition pcalls peek persistent! pmap pop pop! pop-thread-bindings pos? pr pr-str prefer-method prefers primitives-classnames print print-ctor print-doc print-dup print-method print-namespace-doc print-simple print-special-doc print-str printf println println-str prn prn-str promise proxy proxy-call-with-super proxy-mappings proxy-name proxy-super push-thread-bindings pvalues quot rand rand-int range ratio? rational? rationalize re-find re-groups re-matcher re-matches re-pattern re-seq read read-line read-string reify reduce ref ref-history-count ref-max-history ref-min-history ref-set refer refer-clojure release-pending-sends rem remove remove-method remove-ns repeat repeatedly replace replicate require reset! reset-meta! resolve rest resultset-seq reverse reversible? rseq rsubseq satisfies? second select-keys send send-off seq seq? seque sequence sequential? set set-validator! set? short short-array shorts shutdown-agents slurp some sort sort-by sorted-map sorted-map-by sorted-set sorted-set-by sorted? special-form-anchor special-symbol? split-at split-with str stream? string? struct struct-map subs subseq subvec supers swap! symbol symbol? sync syntax-symbol-anchor take take-last take-nth take-while test the-ns time to-array to-array-2d trampoline transient tree-seq true? type unchecked-add unchecked-dec unchecked-divide unchecked-inc unchecked-multiply unchecked-negate unchecked-remainder unchecked-subtract underive unquote unquote-splicing update-in update-proxy use val vals var-get var-set var? vary-meta vec vector vector? when when-first when-let when-not while with-bindings with-bindings* with-in-str with-loading-context with-local-vars with-meta with-open with-out-str with-precision xml-seq");

    var indentKeys = makeKeywords(
        // Built-ins
        "ns fn def defn defmethod bound-fn if if-not case condp when while when-not when-first do future comment doto locking proxy with-open with-precision reify deftype defrecord defprotocol extend extend-protocol extend-type try catch" +

        // Binding forms
        "let letfn binding loop for doseq dotimes when-let if-let" +

        // Data structures
        "defstruct struct-map assoc" +

        // clojure.test
        "testing deftest" +

        // contrib
        "handler-case handle dotrace deftrace");

    var tests = {
        digit: /\d/,
        digit_or_colon: /[\d:]/,
        hex: /[0-9a-fA-F]/,
        sign: /[+-]/,
        exponent: /[eE]/,
        keyword_char: /[^\s\(\[\;\)\]]/,
        basic: /[\w\$_\-]/,
        lang_keyword: /[\w*+!\-_?:\/]/
    };

    function stateStack(indent, type, prev) { // represents a state stack object
        this.indent = indent;
        this.type = type;
        this.prev = prev;
    }

    function pushStack(state, indent, type) {
        state.indentStack = new stateStack(indent, type, state.indentStack);
    }

    function popStack(state) {
        state.indentStack = state.indentStack.prev;
    }

    function isNumber(ch, stream){
        // hex
        if ( ch === '0' && 'x' == stream.peek().toLowerCase() ) {
            stream.eat('x');
            stream.eatWhile(tests.hex);
            return true;
        }

        // leading sign
        if ( ch == '+' || ch == '-' ) {
          stream.eat(tests.sign);
          ch = stream.next();
        }

        if ( tests.digit.test(ch) ) {
            stream.eat(ch);
            stream.eatWhile(tests.digit);

            if ( '.' == stream.peek() ) {
                stream.eat('.');
                stream.eatWhile(tests.digit);
            }

            if ( 'e' == stream.peek().toLowerCase() ) {
                stream.eat(tests.exponent);
                stream.eat(tests.sign);
                stream.eatWhile(tests.digit);
            }

            return true;
        }

        return false;
    }

    return {
        startState: function () {
            return {
                indentStack: null,
                indentation: 0,
                mode: false,
            };
        },

        token: function (stream, state) {
            if (state.indentStack == null && stream.sol()) {
                // update indentation, but only if indentStack is empty
                state.indentation = stream.indentation();
            }

            // skip spaces
            if (stream.eatSpace()) {
                return null;
            }
            var returnType = null;

            switch(state.mode){
                case "string": // multi-line string parsing mode
                    var next, escaped = false;
                    while ((next = stream.next()) != null) {
                        if (next == "\"" && !escaped) {

                            state.mode = false;
                            break;
                        }
                        escaped = !escaped && next == "\\";
                    }
                    returnType = STRING; // continue on in string mode
                    break;
                default: // default parsing mode
                    var ch = stream.next();

                    if (ch == "\"") {
                        state.mode = "string";
                        returnType = STRING;
                    } else if (ch == "'" && !( tests.digit_or_colon.test(stream.peek()) )) {
                        returnType = ATOM;
                    } else if (ch == ";") { // comment
                        stream.skipToEnd(); // rest of the line is a comment
                        returnType = COMMENT;
                    } else if (isNumber(ch,stream)){
                        returnType = NUMBER;
                    } else if (ch == "(" || ch == "[") {
                        var keyWord = ''; var indentTemp = stream.column();
                        /**
                        Either
                        (indent-word ..
                        (non-indent-word ..
                        (;something else, bracket, etc.
                        */

                        while ((letter = stream.eat(tests.keyword_char)) != null) {
                            keyWord += letter;
                        }

                        if (keyWord.length > 0 && indentKeys.propertyIsEnumerable(keyWord)) { // indent-word

                            pushStack(state, indentTemp + INDENT_WORD_SKIP, ch);
                        } else { // non-indent word
                            // we continue eating the spaces
                            stream.eatSpace();
                            if (stream.eol() || stream.peek() == ";") {
                                // nothing significant after
                                // we restart indentation 1 space after
                                pushStack(state, indentTemp + 1, ch);
                            } else {
                                pushStack(state, indentTemp + stream.current().length, ch); // else we match
                            }
                        }
                        stream.backUp(stream.current().length - 1); // undo all the eating

                        returnType = BRACKET;
                    } else if (ch == ")" || ch == "]") {
                        returnType = BRACKET;
                        if (state.indentStack != null && state.indentStack.type == (ch == ")" ? "(" : "[")) {
                            popStack(state);
                        }
                    } else if ( ch == ":" ) {
                        stream.eatWhile(tests.lang_keyword);
                        return TAG;
                    } else {
                        stream.eatWhile(tests.basic);

                        if (keywords && keywords.propertyIsEnumerable(stream.current())) {
                            returnType = BUILTIN;
                        } else if ( atoms && atoms.propertyIsEnumerable(stream.current()) ) {
                            returnType = ATOM;
                        } else returnType = null;
                    }
            }

            return returnType;
        },

        indent: function (state, textAfter) {
            if (state.indentStack == null) return state.indentation;
            return state.indentStack.indent;
        }
    };
});

CodeMirror.defineMIME("text/x-clojure", "clojure");
CodeMirror.defineMode("xml", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var Kludges = parserConfig.htmlMode ? {
    autoSelfClosers: {"br": true, "img": true, "hr": true, "link": true, "input": true,
                      "meta": true, "col": true, "frame": true, "base": true, "area": true},
    doNotIndent: {"pre": true},
    allowUnquoted: true
  } : {autoSelfClosers: {}, doNotIndent: {}, allowUnquoted: false};
  var alignCDATA = parserConfig.alignCDATA;

  // Return variables for tokenizers
  var tagName, type;

  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }

    var ch = stream.next();
    if (ch == "<") {
      if (stream.eat("!")) {
        if (stream.eat("[")) {
          if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
          else return null;
        }
        else if (stream.match("--")) return chain(inBlock("comment", "-->"));
        else if (stream.match("DOCTYPE", true, true)) {
          stream.eatWhile(/[\w\._\-]/);
          return chain(doctype(1));
        }
        else return null;
      }
      else if (stream.eat("?")) {
        stream.eatWhile(/[\w\._\-]/);
        state.tokenize = inBlock("meta", "?>");
        return "meta";
      }
      else {
        type = stream.eat("/") ? "closeTag" : "openTag";
        stream.eatSpace();
        tagName = "";
        var c;
        while ((c = stream.eat(/[^\s\u00a0=<>\"\'\/?]/))) tagName += c;
        state.tokenize = inTag;
        return "tag";
      }
    }
    else if (ch == "&") {
      var ok;
      if (stream.eat("#")) {
        if (stream.eat("x")) {
          ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
        } else {
          ok = stream.eatWhile(/[\d]/) && stream.eat(";");
        }
      } else {
        ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
      }
      return ok ? "atom" : "error";
    }
    else {
      stream.eatWhile(/[^&<]/);
      return null;
    }
  }

  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == ">" || (ch == "/" && stream.eat(">"))) {
      state.tokenize = inText;
      type = ch == ">" ? "endTag" : "selfcloseTag";
      return "tag";
    }
    else if (ch == "=") {
      type = "equals";
      return null;
    }
    else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      return state.tokenize(stream, state);
    }
    else {
      stream.eatWhile(/[^\s\u00a0=<>\"\'\/?]/);
      return "word";
    }
  }

  function inAttribute(quote) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return "string";
    };
  }

  function inBlock(style, terminator) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    };
  }
  function doctype(depth) {
    return function(stream, state) {
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "<") {
          state.tokenize = doctype(depth + 1);
          return state.tokenize(stream, state);
        } else if (ch == ">") {
          if (depth == 1) {
            state.tokenize = inText;
            break;
          } else {
            state.tokenize = doctype(depth - 1);
            return state.tokenize(stream, state);
          }
        }
      }
      return "meta";
    };
  }

  var curState, setStyle;
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) curState.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }

  function pushContext(tagName, startOfLine) {
    var noIndent = Kludges.doNotIndent.hasOwnProperty(tagName) || (curState.context && curState.context.noIndent);
    curState.context = {
      prev: curState.context,
      tagName: tagName,
      indent: curState.indented,
      startOfLine: startOfLine,
      noIndent: noIndent
    };
  }
  function popContext() {
    if (curState.context) curState.context = curState.context.prev;
  }

  function element(type) {
    if (type == "openTag") {
      curState.tagName = tagName;
      return cont(attributes, endtag(curState.startOfLine));
    } else if (type == "closeTag") {
      var err = false;
      if (curState.context) {
        err = curState.context.tagName != tagName;
      } else {
        err = true;
      }
      if (err) setStyle = "error";
      return cont(endclosetag(err));
    }
    return cont();
  }
  function endtag(startOfLine) {
    return function(type) {
      if (type == "selfcloseTag" ||
          (type == "endTag" && Kludges.autoSelfClosers.hasOwnProperty(curState.tagName.toLowerCase())))
        return cont();
      if (type == "endTag") {pushContext(curState.tagName, startOfLine); return cont();}
      return cont();
    };
  }
  function endclosetag(err) {
    return function(type) {
      if (err) setStyle = "error";
      if (type == "endTag") { popContext(); return cont(); }
      setStyle = "error";
      return cont(arguments.callee);
    }
  }

  function attributes(type) {
    if (type == "word") {setStyle = "attribute"; return cont(attributes);}
    if (type == "equals") return cont(attvalue, attributes);
    if (type == "string") {setStyle = "error"; return cont(attributes);}
    return pass();
  }
  function attvalue(type) {
    if (type == "word" && Kludges.allowUnquoted) {setStyle = "string"; return cont();}
    if (type == "string") return cont(attvaluemaybe);
    return pass();
  }
  function attvaluemaybe(type) {
    if (type == "string") return cont(attvaluemaybe);
    else return pass();
  }

  return {
    startState: function() {
      return {tokenize: inText, cc: [], indented: 0, startOfLine: true, tagName: null, context: null};
    },

    token: function(stream, state) {
      if (stream.sol()) {
        state.startOfLine = true;
        state.indented = stream.indentation();
      }
      if (stream.eatSpace()) return null;

      setStyle = type = tagName = null;
      var style = state.tokenize(stream, state);
      state.type = type;
      if ((style || type) && style != "comment") {
        curState = state;
        while (true) {
          var comb = state.cc.pop() || element;
          if (comb(type || style)) break;
        }
      }
      state.startOfLine = false;
      return setStyle || style;
    },

    indent: function(state, textAfter, fullLine) {
      var context = state.context;
      if ((state.tokenize != inTag && state.tokenize != inText) ||
          context && context.noIndent)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      if (alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
      if (context && /^<\//.test(textAfter))
        context = context.prev;
      while (context && !context.startOfLine)
        context = context.prev;
      if (context) return context.indent + indentUnit;
      else return 0;
    },

    compareStates: function(a, b) {
      if (a.indented != b.indented || a.tokenize != b.tokenize) return false;
      for (var ca = a.context, cb = b.context; ; ca = ca.prev, cb = cb.prev) {
        if (!ca || !cb) return ca == cb;
        if (ca.tagName != cb.tagName) return false;
      }
    },

    electricChars: "/"
  };
});

CodeMirror.defineMIME("application/xml", "xml");
CodeMirror.defineMIME("text/html", {name: "xml", htmlMode: true});
CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var jsonMode = parserConfig.json;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};
    return {
      "if": A, "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": C, "break": C, "continue": C, "new": C, "delete": C, "throw": C,
      "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom
    };
  }();

  var isOperatorChar = /[+\-*&%=<>!?|]/;

  function chain(stream, state, f) {
    state.tokenize = f;
    return f(stream, state);
  }

  function nextUntilUnescaped(stream, end) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (next == end && !escaped)
        return false;
      escaped = !escaped && next == "\\";
    }
    return escaped;
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }

  function jsTokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'")
      return chain(stream, state, jsTokenString(ch));
    else if (/[\[\]{}\(\),;\:\.]/.test(ch))
      return ret(ch);
    else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret("number", "number");
    }
    else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret("number", "number");
    }
    else if (ch == "/") {
      if (stream.eat("*")) {
        return chain(stream, state, jsTokenComment);
      }
      else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      }
      else if (state.reAllowed) {
        nextUntilUnescaped(stream, "/");
        stream.eatWhile(/[gimy]/); // 'y' is "sticky" option in Mozilla
        return ret("regexp", "string-2");
      }
      else {
        stream.eatWhile(isOperatorChar);
        return ret("operator", null, stream.current());
      }
    }
    else if (ch == "#") {
        stream.skipToEnd();
        return ret("error", "error");
    }
    else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret("operator", null, stream.current());
    }
    else {
      stream.eatWhile(/[\w\$_]/);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return (known && state.kwAllowed) ? ret(known.type, known.style, word) :
                     ret("variable", "variable", word);
    }
  }

  function jsTokenString(quote) {
    return function(stream, state) {
      if (!nextUntilUnescaped(stream, quote))
        state.tokenize = jsTokenBase;
      return ret("string", "string");
    };
  }

  function jsTokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = jsTokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    var state = cx.state;
    if (state.context) {
      cx.marked = "def";
      for (var v = state.localVars; v; v = v.next)
        if (v.name == varname) return;
      state.localVars = {name: varname, next: state.localVars};
    }
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    if (!cx.state.context) cx.state.localVars = defaultVars;
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state;
      state.lexical = new JSLexical(state.indented, cx.stream.column(), type, null, state.lexical, info)
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    return function expecting(type) {
      if (type == wanted) return cont();
      else if (wanted == ";") return pass();
      else return cont(arguments.callee);
    };
  }

  function statement(type) {
    if (type == "var") return cont(pushlex("vardef"), vardef1, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), expression, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "{") return cont(pushlex("}"), block, poplex);
    if (type == ";") return cont();
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), expect("("), pushlex(")"), forspec1, expect(")"),
                                      poplex, statement, poplex);
    if (type == "variable") return cont(pushlex("stat"), maybelabel);
    if (type == "switch") return cont(pushlex("form"), expression, pushlex("}", "switch"), expect("{"),
                                         block, poplex, poplex);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
                                        statement, poplex, popcontext);
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function expression(type) {
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeoperator);
    if (type == "function") return cont(functiondef);
    if (type == "keyword c") return cont(maybeexpression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, expect(")"), poplex, maybeoperator);
    if (type == "operator") return cont(expression);
    if (type == "[") return cont(pushlex("]"), commasep(expression, "]"), poplex, maybeoperator);
    if (type == "{") return cont(pushlex("}"), commasep(objprop, "}"), poplex, maybeoperator);
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }

  function maybeoperator(type, value) {
    if (type == "operator" && /\+\+|--/.test(value)) return cont(maybeoperator);
    if (type == "operator") return cont(expression);
    if (type == ";") return;
    if (type == "(") return cont(pushlex(")"), commasep(expression, ")"), poplex, maybeoperator);
    if (type == ".") return cont(property, maybeoperator);
    if (type == "[") return cont(pushlex("]"), expression, expect("]"), poplex, maybeoperator);
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperator, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type) {
    if (type == "variable") cx.marked = "property";
    if (atomicTypes.hasOwnProperty(type)) return cont(expect(":"), expression);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ",") return cont(what, proceed);
      if (type == end) return cont();
      return cont(expect(end));
    }
    return function commaSeparated(type) {
      if (type == end) return cont();
      else return pass(what, proceed);
    };
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function vardef1(type, value) {
    if (type == "variable"){register(value); return cont(vardef2);}
    return cont();
  }
  function vardef2(type, value) {
    if (value == "=") return cont(expression, vardef2);
    if (type == ",") return cont(vardef1);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef1, forspec2);
    if (type == ";") return pass(forspec2);
    if (type == "variable") return cont(formaybein);
    return pass(forspec2);
  }
  function formaybein(type, value) {
    if (value == "in") return cont(expression);
    return cont(maybeoperator, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in") return cont(expression);
    return cont(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushlex(")"), pushcontext, commasep(funarg, ")"), poplex, statement, popcontext);
  }
  function funarg(type, value) {
    if (type == "variable") {register(value); return cont();}
  }

  // Interface

  return {
    startState: function(basecolumn) {
      return {
        tokenize: jsTokenBase,
        reAllowed: true,
        kwAllowed: true,
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: null,
        context: null,
        indented: 0
      };
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
      }
      if (stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.reAllowed = type == "operator" || type == "keyword c" || type.match(/^[\[{}\(,;:]$/);
      state.kwAllowed = type != '.';
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize != jsTokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical,
          type = lexical.type, closing = firstChar == type;
      if (type == "vardef") return lexical.indented + 4;
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "stat" || type == "form") return lexical.indented + indentUnit;
      else if (lexical.info == "switch" && !closing)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricChars: ":{}"
  };
});

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
CodeMirror.defineMode("clike", function(config, parserConfig) {
  var indentUnit = config.indentUnit,
      keywords = parserConfig.keywords || {},
      blockKeywords = parserConfig.blockKeywords || {},
      atoms = parserConfig.atoms || {},
      hooks = parserConfig.hooks || {},
      multiLineStrings = parserConfig.multiLineStrings;
  var isOperatorChar = /[+\-*&%=<>!?|\/]/;

  var curPunc;

  function tokenBase(stream, state) {
    var ch = stream.next();
    if (hooks[ch]) {
      var result = hooks[ch](stream, state);
      if (result !== false) return result;
    }
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      curPunc = ch;
      return null
    }
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\w\.]/);
      return "number";
    }
    if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      }
      if (stream.eat("/")) {
        stream.skipToEnd();
        return "comment";
      }
    }
    if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return "operator";
    }
    stream.eatWhile(/[\w\$_]/);
    var cur = stream.current();
    if (keywords.propertyIsEnumerable(cur)) {
      if (blockKeywords.propertyIsEnumerable(cur)) curPunc = "newstatement";
      return "keyword";
    }
    if (atoms.propertyIsEnumerable(cur)) return "atom";
    return "word";
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next, end = false;
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) {end = true; break;}
        escaped = !escaped && next == "\\";
      }
      if (end || !(escaped || multiLineStrings))
        state.tokenize = tokenBase;
      return "string";
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return "comment";
  }

  function Context(indented, column, type, align, prev) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.align = align;
    this.prev = prev;
  }
  function pushContext(state, col, type) {
    return state.context = new Context(state.indented, col, type, null, state.context);
  }
  function popContext(state) {
    var t = state.context.type;
    if (t == ")" || t == "]" || t == "}")
      state.indented = state.context.indented;
    return state.context = state.context.prev;
  }

  // Interface

  return {
    startState: function(basecolumn) {
      return {
        tokenize: null,
        context: new Context((basecolumn || 0) - indentUnit, 0, "top", false),
        indented: 0,
        startOfLine: true
      };
    },

    token: function(stream, state) {
      var ctx = state.context;
      if (stream.sol()) {
        if (ctx.align == null) ctx.align = false;
        state.indented = stream.indentation();
        state.startOfLine = true;
      }
      if (stream.eatSpace()) return null;
      curPunc = null;
      var style = (state.tokenize || tokenBase)(stream, state);
      if (style == "comment" || style == "meta") return style;
      if (ctx.align == null) ctx.align = true;

      if ((curPunc == ";" || curPunc == ":") && ctx.type == "statement") popContext(state);
      else if (curPunc == "{") pushContext(state, stream.column(), "}");
      else if (curPunc == "[") pushContext(state, stream.column(), "]");
      else if (curPunc == "(") pushContext(state, stream.column(), ")");
      else if (curPunc == "}") {
        while (ctx.type == "statement") ctx = popContext(state);
        if (ctx.type == "}") ctx = popContext(state);
        while (ctx.type == "statement") ctx = popContext(state);
      }
      else if (curPunc == ctx.type) popContext(state);
      else if (ctx.type == "}" || ctx.type == "top" || (ctx.type == "statement" && curPunc == "newstatement"))
        pushContext(state, stream.column(), "statement");
      state.startOfLine = false;
      return style;
    },

    indent: function(state, textAfter) {
      if (state.tokenize != tokenBase && state.tokenize != null) return 0;
      var ctx = state.context, firstChar = textAfter && textAfter.charAt(0);
      if (ctx.type == "statement" && firstChar == "}") ctx = ctx.prev;
      var closing = firstChar == ctx.type;
      if (ctx.type == "statement") return ctx.indented + (firstChar == "{" ? 0 : indentUnit);
      else if (ctx.align) return ctx.column + (closing ? 0 : 1);
      else return ctx.indented + (closing ? 0 : indentUnit);
    },

    electricChars: "{}"
  };
});

(function() {
  function words(str) {
    var obj = {}, words = str.split(" ");
    for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
    return obj;
  }
  var cKeywords = "auto if break int case long char register continue return default short do sizeof " +
    "double static else struct entry switch extern typedef float union for unsigned " +
    "goto while enum void const signed volatile";

  function cppHook(stream, state) {
    if (!state.startOfLine) return false;
    stream.skipToEnd();
    return "meta";
  }

  // C#-style strings where "" escapes a quote.
  function tokenAtString(stream, state) {
    var next;
    while ((next = stream.next()) != null) {
      if (next == '"' && !stream.eat('"')) {
        state.tokenize = null;
        break;
      }
    }
    return "string";
  }

  CodeMirror.defineMIME("text/x-csrc", {
    name: "clike",
    keywords: words(cKeywords),
    blockKeywords: words("case do else for if switch while struct"),
    atoms: words("null"),
    hooks: {"#": cppHook}
  });
  CodeMirror.defineMIME("text/x-c++src", {
    name: "clike",
    keywords: words(cKeywords + " asm dynamic_cast namespace reinterpret_cast try bool explicit new " +
                    "static_cast typeid catch operator template typename class friend private " +
                    "this using const_cast inline public throw virtual delete mutable protected " +
                    "wchar_t"),
    blockKeywords: words("catch class do else finally for if struct switch try while"),
    atoms: words("true false null"),
    hooks: {"#": cppHook}
  });
  CodeMirror.defineMIME("text/x-java", {
    name: "clike",
    keywords: words("abstract assert boolean break byte case catch char class const continue default " +
                    "do double else enum extends final finally float for goto if implements import " +
                    "instanceof int interface long native new package private protected public " +
                    "return short static strictfp super switch synchronized this throw throws transient " +
                    "try void volatile while"),
    blockKeywords: words("catch class do else finally for if switch try while"),
    atoms: words("true false null"),
    hooks: {
      "@": function(stream, state) {
        stream.eatWhile(/[\w\$_]/);
        return "meta";
      }
    }
  });
  CodeMirror.defineMIME("text/x-csharp", {
    name: "clike",
    keywords: words("abstract as base bool break byte case catch char checked class const continue decimal" +
                    " default delegate do double else enum event explicit extern finally fixed float for" +
                    " foreach goto if implicit in int interface internal is lock long namespace new object" +
                    " operator out override params private protected public readonly ref return sbyte sealed short" +
                    " sizeof stackalloc static string struct switch this throw try typeof uint ulong unchecked" +
                    " unsafe ushort using virtual void volatile while add alias ascending descending dynamic from get" +
                    " global group into join let orderby partial remove select set value var yield"),
    blockKeywords: words("catch class do else finally for foreach if struct switch try while"),
    atoms: words("true false null"),
    hooks: {
      "@": function(stream, state) {
        if (stream.eat('"')) {
          state.tokenize = tokenAtString;
          return tokenAtString(stream, state);
        }
        stream.eatWhile(/[\w\$_]/);
        return "meta";
      }
    }
  });
}());
/**
 * xmlpure.js
 *
 * Building upon and improving the CodeMirror 2 XML parser
 * @author: Dror BG (deebug.dev@gmail.com)
 * @date: August, 2011
 */

CodeMirror.defineMode("xmlpure", function(config, parserConfig) {
    // constants
    var STYLE_ERROR = "error";
    var STYLE_INSTRUCTION = "comment";
    var STYLE_COMMENT = "comment";
    var STYLE_ELEMENT_NAME = "tag";
    var STYLE_ATTRIBUTE = "attribute";
    var STYLE_WORD = "string";
    var STYLE_TEXT = "atom";
    var STYLE_ENTITIES = "string";

    var TAG_INSTRUCTION = "!instruction";
    var TAG_CDATA = "!cdata";
    var TAG_COMMENT = "!comment";
    var TAG_TEXT = "!text";

    var doNotIndent = {
        "!cdata": true,
        "!comment": true,
        "!text": true,
        "!instruction": true
    };

    // options
    var indentUnit = config.indentUnit;

    ///////////////////////////////////////////////////////////////////////////
    // helper functions

    // chain a parser to another parser
    function chain(stream, state, parser) {
        state.tokenize = parser;
        return parser(stream, state);
    }

    // parse a block (comment, CDATA or text)
    function inBlock(style, terminator, nextTokenize) {
        return function(stream, state) {
            while (!stream.eol()) {
                if (stream.match(terminator)) {
                    popContext(state);
                    state.tokenize = nextTokenize;
                    break;
                }
                stream.next();
            }
            return style;
        };
    }

    // go down a level in the document
    // (hint: look at who calls this function to know what the contexts are)
    function pushContext(state, tagName) {
        var noIndent = doNotIndent.hasOwnProperty(tagName) || (state.context && state.context.doIndent);
        var newContext = {
            tagName: tagName,
            prev: state.context,
            indent: state.context ? state.context.indent + indentUnit : 0,
            lineNumber: state.lineNumber,
            indented: state.indented,
            noIndent: noIndent
        };
        state.context = newContext;
    }

    // go up a level in the document
    function popContext(state) {
        if (state.context) {
            var oldContext = state.context;
            state.context = oldContext.prev;
            return oldContext;
        }

        // we shouldn't be here - it means we didn't have a context to pop
        return null;
    }

    // return true if the current token is seperated from the tokens before it
    // which means either this is the start of the line, or there is at least
    // one space or tab character behind the token
    // otherwise returns false
    function isTokenSeparated(stream) {
        return stream.sol() ||
            stream.string.charAt(stream.start - 1) == " " ||
            stream.string.charAt(stream.start - 1) == "\t";
    }

    ///////////////////////////////////////////////////////////////////////////
    // context: document
    //
    // an XML document can contain:
    // - a single declaration (if defined, it must be the very first line)
    // - exactly one root element
    // @todo try to actually limit the number of root elements to 1
    // - zero or more comments
    function parseDocument(stream, state) {
        if(stream.eat("<")) {
            if(stream.eat("?")) {
                // processing instruction
                pushContext(state, TAG_INSTRUCTION);
                state.tokenize = parseProcessingInstructionStartTag;
                return STYLE_INSTRUCTION;
            } else if(stream.match("!--")) {
                // new context: comment
                pushContext(state, TAG_COMMENT);
                return chain(stream, state, inBlock(STYLE_COMMENT, "-->", parseDocument));
            } else if(stream.eatSpace() || stream.eol() ) {
                stream.skipToEnd();
                return STYLE_ERROR;
            } else {
                // element
                state.tokenize = parseElementTagName;
                return STYLE_ELEMENT_NAME;
            }
        }

        // error on line
        stream.skipToEnd();
        return STYLE_ERROR;
    }

    ///////////////////////////////////////////////////////////////////////////
    // context: XML element start-tag or end-tag
    //
    // - element start-tag can contain attributes
    // - element start-tag may self-close (or start an element block if it doesn't)
    // - element end-tag can contain only the tag name
    function parseElementTagName(stream, state) {
        // get the name of the tag
        var startPos = stream.pos;
        if(stream.match(/^[a-zA-Z_:][-a-zA-Z0-9_:.]*/)) {
            // element start-tag
            var tagName = stream.string.substring(startPos, stream.pos);
            pushContext(state, tagName);
            state.tokenize = parseElement;
            return STYLE_ELEMENT_NAME;
        } else if(stream.match(/^\/[a-zA-Z_:][-a-zA-Z0-9_:.]*( )*>/)) {
            // element end-tag
            var endTagName = stream.string.substring(startPos + 1, stream.pos - 1).trim();
            var oldContext = popContext(state);
            state.tokenize = state.context == null ? parseDocument : parseElementBlock;
            if(oldContext == null || endTagName != oldContext.tagName) {
                // the start and end tag names should match - error
                return STYLE_ERROR;
            }
            return STYLE_ELEMENT_NAME;
        } else {
            // no tag name - error
            state.tokenize = state.context == null ? parseDocument : parseElementBlock;
            stream.eatWhile(/[^>]/);
            stream.eat(">");
            return STYLE_ERROR;
        }

        stream.skipToEnd();
        return null;
    }

    function parseElement(stream, state) {
        if(stream.match(/^\/>/)) {
            // self-closing tag
            popContext(state);
            state.tokenize = state.context == null ? parseDocument : parseElementBlock;
            return STYLE_ELEMENT_NAME;
        } else if(stream.eat(/^>/)) {
            state.tokenize = parseElementBlock;
            return STYLE_ELEMENT_NAME;
        } else if(isTokenSeparated(stream) && stream.match(/^[a-zA-Z_:][-a-zA-Z0-9_:.]*( )*=/)) {
            // attribute
            state.tokenize = parseAttribute;
            return STYLE_ATTRIBUTE;
        }

        // no other options - this is an error
        state.tokenize = state.context == null ? parseDocument : parseDocument;
        stream.eatWhile(/[^>]/);
        stream.eat(">");
        return STYLE_ERROR;
    }

    ///////////////////////////////////////////////////////////////////////////
    // context: attribute
    //
    // attribute values may contain everything, except:
    // - the ending quote (with ' or ") - this marks the end of the value
    // - the character "<" - should never appear
    // - ampersand ("&") - unless it starts a reference: a string that ends with a semi-colon (";")
    // ---> note: this parser is lax in what may be put into a reference string,
    // ---> consult http://www.w3.org/TR/REC-xml/#NT-Reference if you want to make it tighter
    function parseAttribute(stream, state) {
        var quote = stream.next();
        if(quote != "\"" && quote != "'") {
            // attribute must be quoted
            stream.skipToEnd();
            state.tokenize = parseElement;
            return STYLE_ERROR;
        }

        state.tokParams.quote = quote;
        state.tokenize = parseAttributeValue;
        return STYLE_WORD;
    }

    // @todo: find out whether this attribute value spans multiple lines,
    //        and if so, push a context for it in order not to indent it
    //        (or something of the sort..)
    function parseAttributeValue(stream, state) {
        var ch = "";
        while(!stream.eol()) {
            ch = stream.next();
            if(ch == state.tokParams.quote) {
                // end quote found
                state.tokenize = parseElement;
                return STYLE_WORD;
            } else if(ch == "<") {
                // can't have less-than signs in an attribute value, ever
                stream.skipToEnd()
                state.tokenize = parseElement;
                return STYLE_ERROR;
            } else if(ch == "&") {
                // reference - look for a semi-colon, or return error if none found
                ch = stream.next();

                // make sure that semi-colon isn't right after the ampersand
                if(ch == ';') {
                    stream.skipToEnd()
                    state.tokenize = parseElement;
                    return STYLE_ERROR;
                }

                // make sure no less-than characters slipped in
                while(!stream.eol() && ch != ";") {
                    if(ch == "<") {
                        // can't have less-than signs in an attribute value, ever
                        stream.skipToEnd()
                        state.tokenize = parseElement;
                        return STYLE_ERROR;
                    }
                    ch = stream.next();
                }
                if(stream.eol() && ch != ";") {
                    // no ampersand found - error
                    stream.skipToEnd();
                    state.tokenize = parseElement;
                    return STYLE_ERROR;
                }
            }
        }

        // attribute value continues to next line
        return STYLE_WORD;
    }

    ///////////////////////////////////////////////////////////////////////////
    // context: element block
    //
    // a block can contain:
    // - elements
    // - text
    // - CDATA sections
    // - comments
    function parseElementBlock(stream, state) {
        if(stream.eat("<")) {
            if(stream.match("?")) {
                pushContext(state, TAG_INSTRUCTION);
                state.tokenize = parseProcessingInstructionStartTag;
                return STYLE_INSTRUCTION;
            } else if(stream.match("!--")) {
                // new context: comment
                pushContext(state, TAG_COMMENT);
                return chain(stream, state, inBlock(STYLE_COMMENT, "-->",
                    state.context == null ? parseDocument : parseElementBlock));
            } else if(stream.match("![CDATA[")) {
                // new context: CDATA section
                pushContext(state, TAG_CDATA);
                return chain(stream, state, inBlock(STYLE_TEXT, "]]>",
                    state.context == null ? parseDocument : parseElementBlock));
            } else if(stream.eatSpace() || stream.eol() ) {
                stream.skipToEnd();
                return STYLE_ERROR;
            } else {
                // element
                state.tokenize = parseElementTagName;
                return STYLE_ELEMENT_NAME;
            }
        } else if(stream.eat("&")) {
            stream.eatWhile(/[^;]/);
            stream.eat(";");
            return STYLE_ENTITIES;
        } else {
            // new context: text
            pushContext(state, TAG_TEXT);
            state.tokenize = parseText;
            return null;
        }

        state.tokenize = state.context == null ? parseDocument : parseElementBlock;
        stream.skipToEnd();
        return null;
    }

    function parseText(stream, state) {
        stream.eatWhile(/[^<]/);
        if(!stream.eol()) {
            // we cannot possibly be in the document context,
            // just inside an element block
            popContext(state);
            state.tokenize = parseElementBlock;
        }
        return STYLE_TEXT;
    }

    ///////////////////////////////////////////////////////////////////////////
    // context: XML processing instructions
    //
    // XML processing instructions (PIs) allow documents to contain instructions for applications.
    // PI format: <?name data?>
    // - 'name' can be anything other than 'xml' (case-insensitive)
    // - 'data' can be anything which doesn't contain '?>'
    // XML declaration is a special PI (see XML declaration context below)
    function parseProcessingInstructionStartTag(stream, state) {
        if(stream.match("xml", true, true)) {
            // xml declaration
            if(state.lineNumber > 1 || stream.pos > 5) {
                state.tokenize = parseDocument;
                stream.skipToEnd();
                return STYLE_ERROR;
            } else {
                state.tokenize = parseDeclarationVersion;
                return STYLE_INSTRUCTION;
            }
        }

        // regular processing instruction
        if(isTokenSeparated(stream) || stream.match("?>")) {
            // we have a space after the start-tag, or nothing but the end-tag
            // either way - error!
            state.tokenize = parseDocument;
            stream.skipToEnd();
            return STYLE_ERROR;
        }

        state.tokenize = parseProcessingInstructionBody;
        return STYLE_INSTRUCTION;
    }

    function parseProcessingInstructionBody(stream, state) {
        stream.eatWhile(/[^?]/);
        if(stream.eat("?")) {
            if(stream.eat(">")) {
                popContext(state);
                state.tokenize = state.context == null ? parseDocument : parseElementBlock;
            }
        }
        return STYLE_INSTRUCTION;
    }


    ///////////////////////////////////////////////////////////////////////////
    // context: XML declaration
    //
    // XML declaration is of the following format:
    // <?xml version="1.0" encoding="UTF-8" standalone="no" ?>
    // - must start at the first character of the first line
    // - may span multiple lines
    // - must include 'version'
    // - may include 'encoding' and 'standalone' (in that order after 'version')
    // - attribute names must be lowercase
    // - cannot contain anything else on the line
    function parseDeclarationVersion(stream, state) {
        state.tokenize = parseDeclarationEncoding;

        if(isTokenSeparated(stream) && stream.match(/^version( )*=( )*"([a-zA-Z0-9_.:]|\-)+"/)) {
            return STYLE_INSTRUCTION;
        }
        stream.skipToEnd();
        return STYLE_ERROR;
    }

    function parseDeclarationEncoding(stream, state) {
        state.tokenize = parseDeclarationStandalone;

        if(isTokenSeparated(stream) && stream.match(/^encoding( )*=( )*"[A-Za-z]([A-Za-z0-9._]|\-)*"/)) {
            return STYLE_INSTRUCTION;
        }
        return null;
    }

    function parseDeclarationStandalone(stream, state) {
        state.tokenize = parseDeclarationEndTag;

        if(isTokenSeparated(stream) && stream.match(/^standalone( )*=( )*"(yes|no)"/)) {
            return STYLE_INSTRUCTION;
        }
        return null;
    }

    function parseDeclarationEndTag(stream, state) {
        state.tokenize = parseDocument;

        if(stream.match("?>") && stream.eol()) {
            popContext(state);
            return STYLE_INSTRUCTION;
        }
        stream.skipToEnd();
        return STYLE_ERROR;
    }

    ///////////////////////////////////////////////////////////////////////////
    // returned object
    return {
        electricChars: "/[",

        startState: function() {
            return {
                tokenize: parseDocument,
                tokParams: {},
                lineNumber: 0,
                lineError: false,
                context: null,
                indented: 0
            };
        },

        token: function(stream, state) {
            if(stream.sol()) {
                // initialize a new line
                state.lineNumber++;
                state.lineError = false;
                state.indented = stream.indentation();
            }

            // eat all (the spaces) you can
            if(stream.eatSpace()) return null;

            // run the current tokenize function, according to the state
            var style = state.tokenize(stream, state);

            // is there an error somewhere in the line?
            state.lineError = (state.lineError || style == "error");

            return style;
        },

        blankLine: function(state) {
            // blank lines are lines too!
            state.lineNumber++;
            state.lineError = false;
        },

        indent: function(state, textAfter) {
            if(state.context) {
                if(state.context.noIndent == true) {
                    // do not indent - no return value at all
                    return;
                }
                if(textAfter.match(/^<\/.*/)) {
                    // end-tag - indent back to last context
                    return state.context.indent;
                }
                if(textAfter.match(/^<!\[CDATA\[/)) {
                    // a stand-alone CDATA start-tag - indent back to column 0
                    return 0;
                }
                // indent to last context + regular indent unit
                return state.context.indent + indentUnit;
            }
            return 0;
        },

        compareStates: function(a, b) {
            if (a.indented != b.indented) return false;
            for (var ca = a.context, cb = b.context; ; ca = ca.prev, cb = cb.prev) {
                if (!ca || !cb) return ca == cb;
                if (ca.tagName != cb.tagName) return false;
            }
        }
    };
});

CodeMirror.defineMIME("application/xml", "purexml");
CodeMirror.defineMIME("text/xml", "purexml");
CodeMirror.defineMode("css", function(config) {
  var indentUnit = config.indentUnit, type;
  function ret(style, tp) {type = tp; return style;}

  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == "@") {stream.eatWhile(/[\w\\\-]/); return ret("meta", stream.current());}
    else if (ch == "/" && stream.eat("*")) {
      state.tokenize = tokenCComment;
      return tokenCComment(stream, state);
    }
    else if (ch == "<" && stream.eat("!")) {
      state.tokenize = tokenSGMLComment;
      return tokenSGMLComment(stream, state);
    }
    else if (ch == "=") ret(null, "compare");
    else if ((ch == "~" || ch == "|") && stream.eat("=")) return ret(null, "compare");
    else if (ch == "\"" || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    else if (ch == "#") {
      stream.eatWhile(/[\w\\\-]/);
      return ret("atom", "hash");
    }
    else if (ch == "!") {
      stream.match(/^\s*\w*/);
      return ret("keyword", "important");
    }
    else if (/\d/.test(ch)) {
      stream.eatWhile(/[\w.%]/);
      return ret("number", "unit");
    }
    else if (/[,.+>*\/]/.test(ch)) {
      return ret(null, "select-op");
    }
    else if (/[;{}:\[\]]/.test(ch)) {
      return ret(null, ch);
    }
    else {
      stream.eatWhile(/[\w\\\-]/);
      return ret("variable", "variable");
    }
  }

  function tokenCComment(stream, state) {
    var maybeEnd = false, ch;
    while ((ch = stream.next()) != null) {
      if (maybeEnd && ch == "/") {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  function tokenSGMLComment(stream, state) {
    var dashes = 0, ch;
    while ((ch = stream.next()) != null) {
      if (dashes >= 2 && ch == ">") {
        state.tokenize = tokenBase;
        break;
      }
      dashes = (ch == "-") ? dashes + 1 : 0;
    }
    return ret("comment", "comment");
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, ch;
      while ((ch = stream.next()) != null) {
        if (ch == quote && !escaped)
          break;
        escaped = !escaped && ch == "\\";
      }
      if (!escaped) state.tokenize = tokenBase;
      return ret("string", "string");
    };
  }

  return {
    startState: function(base) {
      return {tokenize: tokenBase,
              baseIndent: base || 0,
              stack: []};
    },

    token: function(stream, state) {
      if (stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);

      var context = state.stack[state.stack.length-1];
      if (type == "hash" && context == "rule") style = "atom";
      else if (style == "variable") {
        if (context == "rule") style = "number";
        else if (!context || context == "@media{") style = "tag";
      }

      if (context == "rule" && /^[\{\};]$/.test(type))
        state.stack.pop();
      if (type == "{") {
        if (context == "@media") state.stack[state.stack.length-1] = "@media{";
        else state.stack.push("{");
      }
      else if (type == "}") state.stack.pop();
      else if (type == "@media") state.stack.push("@media");
      else if (context == "{" && type != "comment") state.stack.push("rule");
      return style;
    },

    indent: function(state, textAfter) {
      var n = state.stack.length;
      if (/^\}/.test(textAfter))
        n -= state.stack[state.stack.length-1] == "rule" ? 2 : 1;
      return state.baseIndent + n * indentUnit;
    },

    electricChars: "}"
  };
});

CodeMirror.defineMIME("text/css", "css");
(function() {
  function keywords(str) {
    var obj = {}, words = str.split(" ");
    for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
    return obj;
  }
  function heredoc(delim) {
    return function(stream, state) {
      if (stream.match(delim)) state.tokenize = null;
      else stream.skipToEnd();
      return "string";
    }
  }
  var phpConfig = {
    name: "clike",
    keywords: keywords("abstract and array as break case catch cfunction class clone const continue declare " +
                       "default do else elseif enddeclare endfor endforeach endif endswitch endwhile extends " +
                       "final for foreach function global goto if implements interface instanceof namespace " +
                       "new or private protected public static switch throw try use var while xor return" +
                       "die echo empty exit eval include include_once isset list require require_once print unset"),
    blockKeywords: keywords("catch do else elseif for foreach if switch try while"),
    atoms: keywords("true false null TRUE FALSE NULL"),
    multiLineStrings: true,
    hooks: {
      "$": function(stream, state) {
        stream.eatWhile(/[\w\$_]/);
        return "variable-2";
      },
      "<": function(stream, state) {
        if (stream.match(/<</)) {
          stream.eatWhile(/[\w\.]/);
          state.tokenize = heredoc(stream.current().slice(3));
          return state.tokenize(stream, state);
        }
        return false;
      },
      "#": function(stream, state) {
        stream.skipToEnd();
        return "comment";
      }
    }
  };

  CodeMirror.defineMode("php", function(config, parserConfig) {
    var htmlMode = CodeMirror.getMode(config, {name: "xml", htmlMode: true});
    var jsMode = CodeMirror.getMode(config, "javascript");
    var cssMode = CodeMirror.getMode(config, "css");
    var phpMode = CodeMirror.getMode(config, phpConfig);

    function dispatch(stream, state) { // TODO open PHP inside text/css
      if (state.curMode == htmlMode) {
        var style = htmlMode.token(stream, state.curState);
        if (style == "meta" && /^<\?/.test(stream.current())) {
          state.curMode = phpMode;
          state.curState = state.php;
          state.curClose = /^\?>/;
		  state.mode =  'php';
        }
        else if (style == "tag" && stream.current() == ">" && state.curState.context) {
          if (/^script$/i.test(state.curState.context.tagName)) {
            state.curMode = jsMode;
            state.curState = jsMode.startState(htmlMode.indent(state.curState, ""));
            state.curClose = /^<\/\s*script\s*>/i;
			state.mode =  'javascript';
          }
          else if (/^style$/i.test(state.curState.context.tagName)) {
            state.curMode = cssMode;
            state.curState = cssMode.startState(htmlMode.indent(state.curState, ""));
            state.curClose =  /^<\/\s*style\s*>/i;
            state.mode =  'css';
          }
        }
        return style;
      }
      else if (stream.match(state.curClose, false)) {
        state.curMode = htmlMode;
        state.curState = state.html;
        state.curClose = null;
		state.mode =  'html';
        return dispatch(stream, state);
      }
      else return state.curMode.token(stream, state.curState);
    }

    return {
      startState: function() {
        var html = htmlMode.startState();
        return {html: html,
                php: phpMode.startState(),
                curMode:	parserConfig.startOpen ? phpMode : htmlMode,
                curState:	parserConfig.startOpen ? phpMode.startState() : html,
                curClose:	parserConfig.startOpen ? /^\?>/ : null,
				mode:		parserConfig.startOpen ? 'php' : 'html'}
      },

      copyState: function(state) {
        var html = state.html, htmlNew = CodeMirror.copyState(htmlMode, html),
            php = state.php, phpNew = CodeMirror.copyState(phpMode, php), cur;
        if (state.curState == html) cur = htmlNew;
        else if (state.curState == php) cur = phpNew;
        else cur = CodeMirror.copyState(state.curMode, state.curState);
        return {html: htmlNew, php: phpNew, curMode: state.curMode, curState: cur,
                curClose: state.curClose, mode: state.mode};
      },

      token: dispatch,

      indent: function(state, textAfter) {
        if ((state.curMode != phpMode && /^\s*<\//.test(textAfter)) ||
            (state.curMode == phpMode && /^\?>/.test(textAfter)))
          return htmlMode.indent(state.html, textAfter);
        return state.curMode.indent(state.curState, textAfter);
      },

      electricChars: "/{}:"
    }
  });
  CodeMirror.defineMIME("application/x-httpd-php", "php");
  CodeMirror.defineMIME("application/x-httpd-php-open", {name: "php", startOpen: true});
  CodeMirror.defineMIME("text/x-php", phpConfig);
})();
CodeMirror.defineMode("htmlmixed", function(config, parserConfig) {
  var htmlMode = CodeMirror.getMode(config, {name: "xml", htmlMode: true});
  var jsMode = CodeMirror.getMode(config, "javascript");
  var cssMode = CodeMirror.getMode(config, "css");

  function html(stream, state) {
    var style = htmlMode.token(stream, state.htmlState);
    if (style == "tag" && stream.current() == ">" && state.htmlState.context) {
      if (/^script$/i.test(state.htmlState.context.tagName)) {
        state.token = javascript;
        state.localState = jsMode.startState(htmlMode.indent(state.htmlState, ""));
        state.mode = "javascript";
      }
      else if (/^style$/i.test(state.htmlState.context.tagName)) {
        state.token = css;
        state.localState = cssMode.startState(htmlMode.indent(state.htmlState, ""));
        state.mode = "css";
      }
    }
    return style;
  }
  function maybeBackup(stream, pat, style) {
    var cur = stream.current();
    var close = cur.search(pat);
    if (close > -1) stream.backUp(cur.length - close);
    return style;
  }
  function javascript(stream, state) {
    if (stream.match(/^<\/\s*script\s*>/i, false)) {
      state.token = html;
      state.curState = null;
      state.mode = "html";
      return html(stream, state);
    }
    return maybeBackup(stream, /<\/\s*script\s*>/,
                       jsMode.token(stream, state.localState));
  }
  function css(stream, state) {
    if (stream.match(/^<\/\s*style\s*>/i, false)) {
      state.token = html;
      state.localState = null;
      state.mode = "html";
      return html(stream, state);
    }
    return maybeBackup(stream, /<\/\s*style\s*>/,
                       cssMode.token(stream, state.localState));
  }

  return {
    startState: function() {
      var state = htmlMode.startState();
      return {token: html, localState: null, mode: "html", htmlState: state};
    },

    copyState: function(state) {
      if (state.localState)
        var local = CodeMirror.copyState(state.token == css ? cssMode : jsMode, state.localState);
      return {token: state.token, localState: local, mode: state.mode,
              htmlState: CodeMirror.copyState(htmlMode, state.htmlState)};
    },

    token: function(stream, state) {
      return state.token(stream, state);
    },

    indent: function(state, textAfter) {
      if (state.token == html || /^\s*<\//.test(textAfter))
        return htmlMode.indent(state.htmlState, textAfter);
      else if (state.token == javascript)
        return jsMode.indent(state.localState, textAfter);
      else
        return cssMode.indent(state.localState, textAfter);
    },

    compareStates: function(a, b) {
      return htmlMode.compareStates(a.htmlState, b.htmlState);
    },

    electricChars: "/{}:"
  }
});

CodeMirror.defineMIME("text/html", "htmlmixed");
CodeMirror.defineMode('rst', function(config, options) {
    function setState(state, fn, ctx) {
        state.fn = fn;
        setCtx(state, ctx);
    }

    function setCtx(state, ctx) {
        state.ctx = ctx || {};
    }

    function setNormal(state, ch) {
        if (ch && (typeof ch !== 'string')) {
            var str = ch.current();
            ch = str[str.length-1];
        }

        setState(state, normal, {back: ch});
    }

    function hasMode(mode) {
        if (mode) {
            var modes = CodeMirror.listModes();

            for (var i in modes) {
                if (modes[i] == mode) {
                    return true;
                }
            }
        }

        return false;
    }

    function getMode(mode) {
        if (hasMode(mode)) {
            return CodeMirror.getMode(config, mode);
        } else {
            return null;
        }
    }

    var verbatimMode = getMode(options.verbatim);
    var pythonMode = getMode('python');

    var reSection = /^[!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]/;
    var reDirective = /^\s*\w([-:.\w]*\w)?::(\s|$)/;
    var reHyperlink = /^\s*_[\w-]+:(\s|$)/;
    var reFootnote = /^\s*\[(\d+|#)\](\s|$)/;
    var reCitation = /^\s*\[[A-Za-z][\w-]*\](\s|$)/;
    var reFootnoteRef = /^\[(\d+|#)\]_/;
    var reCitationRef = /^\[[A-Za-z][\w-]*\]_/;
    var reDirectiveMarker = /^\.\.(\s|$)/;
    var reVerbatimMarker = /^::\s*$/;
    var rePreInline = /^[-\s"([{</:]/;
    var rePostInline = /^[-\s`'")\]}>/:.,;!?\\_]/;
    var reEnumeratedList = /^\s*((\d+|[A-Za-z#])[.)]|\((\d+|[A-Z-a-z#])\))\s/;
    var reBulletedList = /^\s*[-\+\*]\s/;
    var reExamples = /^\s+(>>>|In \[\d+\]:)\s/;

    function normal(stream, state) {
        var ch, sol, i;

        if (stream.eat(/\\/)) {
            ch = stream.next();
            setNormal(state, ch);
            return null;
        }

        sol = stream.sol();

        if (sol && (ch = stream.eat(reSection))) {
            for (i = 0; stream.eat(ch); i++);

            if (i >= 3 && stream.match(/^\s*$/)) {
                setNormal(state, null);
                return 'header';
            } else {
                stream.backUp(i + 1);
            }
        }

        if (sol && stream.match(reDirectiveMarker)) {
            if (!stream.eol()) {
                setState(state, directive);
            }
            return 'meta';
        }

        if (stream.match(reVerbatimMarker)) {
            if (!verbatimMode) {
                setState(state, verbatim);
            } else {
                var mode = verbatimMode;

                setState(state, verbatim, {
                    mode: mode,
                    local: mode.startState()
                });
            }
            return 'meta';
        }

        if (sol && stream.match(reExamples, false)) {
            if (!pythonMode) {
                setState(state, verbatim);
                return 'meta';
            } else {
                var mode = pythonMode;

                setState(state, verbatim, {
                    mode: mode,
                    local: mode.startState()
                });

                return null;
            }
        }

        function testBackward(re) {
            return sol || !state.ctx.back || re.test(state.ctx.back);
        }

        function testForward(re) {
            return stream.eol() || stream.match(re, false);
        }

        function testInline(re) {
            return stream.match(re) && testBackward(/\W/) && testForward(/\W/);
        }

        if (testInline(reFootnoteRef)) {
            setNormal(state, stream);
            return 'footnote';
        }

        if (testInline(reCitationRef)) {
            setNormal(state, stream);
            return 'citation';
        }

        ch = stream.next();

        if (testBackward(rePreInline)) {
            if ((ch === ':' || ch === '|') && stream.eat(/\S/)) {
                var token;

                if (ch === ':') {
                    token = 'builtin';
                } else {
                    token = 'atom';
                }

                setState(state, inline, {
                    ch: ch,
                    wide: false,
                    prev: null,
                    token: token
                });

                return token;
            }

            if (ch === '*' || ch === '`') {
                var orig = ch,
                    wide = false;

                ch = stream.next();

                if (ch == orig) {
                    wide = true;
                    ch = stream.next();
                }

                if (ch && !/\s/.test(ch)) {
                    var token;

                    if (orig === '*') {
                        token = wide ? 'strong' : 'em';
                    } else {
                        token = wide ? 'string' : 'string-2';
                    }

                    setState(state, inline, {
                        ch: orig,               // inline() has to know what to search for
                        wide: wide,             // are we looking for `ch` or `chch`
                        prev: null,             // terminator must not be preceeded with whitespace
                        token: token            // I don't want to recompute this all the time
                    });

                    return token;
                }
            }
        }

        setNormal(state, ch);
        return null;
    }

    function inline(stream, state) {
        var ch = stream.next(),
            token = state.ctx.token;

        function finish(ch) {
            state.ctx.prev = ch;
            return token;
        }

        if (ch != state.ctx.ch) {
            return finish(ch);
        }

        if (/\s/.test(state.ctx.prev)) {
            return finish(ch);
        }

        if (state.ctx.wide) {
            ch = stream.next();

            if (ch != state.ctx.ch) {
                return finish(ch);
            }
        }

        if (!stream.eol() && !rePostInline.test(stream.peek())) {
            if (state.ctx.wide) {
                stream.backUp(1);
            }

            return finish(ch);
        }

        setState(state, normal);
        setNormal(state, ch);

        return token;
    }

    function directive(stream, state) {
        var token = null;

        if (stream.match(reDirective)) {
            token = 'attribute';
        } else if (stream.match(reHyperlink)) {
            token = 'link';
        } else if (stream.match(reFootnote)) {
            token = 'quote';
        } else if (stream.match(reCitation)) {
            token = 'quote';
        } else {
            stream.eatSpace();

            if (stream.eol()) {
                setNormal(state, stream);
                return null;
            } else {
                stream.skipToEnd();
                setState(state, comment);
                return 'comment';
            }
        }

        // FIXME this is unreachable
        setState(state, body, {start: true});
        return token;
    }

    function body(stream, state) {
        var token = 'body';

        if (!state.ctx.start || stream.sol()) {
            return block(stream, state, token);
        }

        stream.skipToEnd();
        setCtx(state);

        return token;
    }

    function comment(stream, state) {
        return block(stream, state, 'comment');
    }

    function verbatim(stream, state) {
        if (!verbatimMode) {
            return block(stream, state, 'meta');
        } else {
            if (stream.sol()) {
                if (!stream.eatSpace()) {
                    setNormal(state, stream);
                }

                return null;
            }

            return verbatimMode.token(stream, state.ctx.local);
        }
    }

    function block(stream, state, token) {
        if (stream.eol() || stream.eatSpace()) {
            stream.skipToEnd();
            return token;
        } else {
            setNormal(state, stream);
            return null;
        }
    }

    return {
        startState: function() {
            return {fn: normal, ctx: {}};
        },

        copyState: function(state) {
            return {fn: state.fn, ctx: state.ctx};
        },

        token: function(stream, state) {
            var token = state.fn(stream, state);
            return token;
        }
    };
});

CodeMirror.defineMIME("text/x-rst", "rst");
// Define search commands. Depends on dialog.js or another
// implementation of the openDialog method.

// Replace works a little oddly -- it will do the replace on the next
// Ctrl-G (or whatever is bound to findNext) press. You prevent a
// replace by making sure the match is no longer selected when hitting
// Ctrl-G.

(function() {
  function SearchState() {
    this.posFrom = this.posTo = this.query = null;
    this.marked = [];
  }
  function getSearchState(cm) {
    return cm._searchState || (cm._searchState = new SearchState());
  }
  function dialog(cm, text, shortText, f) {
    if (cm.openDialog) cm.openDialog(text, f);
    else f(prompt(shortText, ""));
  }
  function confirmDialog(cm, text, shortText, fs) {
    if (cm.openConfirm) cm.openConfirm(text, fs);
    else if (confirm(shortText)) fs[0]();
  }
  function parseQuery(query) {
    var isRE = query.match(/^\/(.*)\/$/);
    return isRE ? new RegExp(isRE[1]) : query;
  }
  var queryDialog =
    _('Search')+': <input type="text" style="width: 10em"> <span style="color: #888">('+_('Use /re/ syntax for regexp search')+')</span>';
  function doSearch(cm, rev) {
    var state = getSearchState(cm);
    if (state.query) return findNext(cm, rev);
    dialog(cm, queryDialog, "Search for:", function(query) {
      cm.operation(function() {
        if (!query || state.query) return;
        state.query = parseQuery(query);
        if (cm.lineCount() < 2000) { // This is too expensive on big documents.
          for (var cursor = cm.getSearchCursor(query); cursor.findNext();)
            state.marked.push(cm.markText(cursor.from(), cursor.to(), "CodeMirror-searching"));
        }
        state.posFrom = state.posTo = cm.getCursor();
        findNext(cm, rev);
      });
    });
  }
  function findNext(cm, rev) {cm.operation(function() {
    var state = getSearchState(cm);
    var cursor = cm.getSearchCursor(state.query, rev ? state.posFrom : state.posTo);
    if (!cursor.find(rev)) {
      cursor = cm.getSearchCursor(state.query, rev ? {line: cm.lineCount() - 1} : {line: 0, ch: 0});
      if (!cursor.find(rev)) return;
    }
    cm.setSelection(cursor.from(), cursor.to());
    state.posFrom = cursor.from(); state.posTo = cursor.to();
  })}
  function clearSearch(cm) {cm.operation(function() {
    var state = getSearchState(cm);
    if (!state.query) return;
    state.query = null;
    for (var i = 0; i < state.marked.length; ++i) state.marked[i].clear();
    state.marked.length = 0;
  })}

  var replaceQueryDialog =
    'Replace: <input type="text" style="width: 10em"> <span style="color: #888">(Use /re/ syntax for regexp search)</span>';
  var replacementQueryDialog = 'With: <input type="text" style="width: 10em">';
  var doReplaceConfirm = "Replace? <button>Yes</button> <button>No</button> <button>Stop</button>";
  function replace(cm, all) {
    dialog(cm, replaceQueryDialog, "Replace:", function(query) {
      if (!query) return;
      query = parseQuery(query);
      dialog(cm, replacementQueryDialog, "Replace with:", function(text) {
        if (all) {
          cm.operation(function() {
            for (var cursor = cm.getSearchCursor(query); cursor.findNext();) {
              if (typeof query != "string") {
                var match = cm.getRange(cursor.from(), cursor.to()).match(query);
                cursor.replace(text.replace(/\$(\d)/, function(w, i) {return match[i];}));
              } else cursor.replace(text);
            }
          });
        } else {
          clearSearch(cm);
          var cursor = cm.getSearchCursor(query, cm.getCursor());
          function advance() {
            var start = cursor.from(), match;
            if (!(match = cursor.findNext())) {
              cursor = cm.getSearchCursor(query);
              if (!(match = cursor.findNext()) ||
                  (cursor.from().line == start.line && cursor.from().ch == start.ch)) return;
            }
            cm.setSelection(cursor.from(), cursor.to());
            confirmDialog(cm, doReplaceConfirm, "Replace?",
                          [function() {doReplace(match);}, advance]);
          }
          function doReplace(match) {
            cursor.replace(typeof query == "string" ? text :
                           text.replace(/\$(\d)/, function(w, i) {return match[i];}));
            advance();
          }
          advance();
        }
      });
    });
  }

  CodeMirror.commands.find = function(cm) {clearSearch(cm); doSearch(cm);};
  CodeMirror.commands.findNext = doSearch;
  CodeMirror.commands.findPrev = function(cm) {doSearch(cm, true);};
  CodeMirror.commands.clearSearch = clearSearch;
  CodeMirror.commands.replace = replace;
  CodeMirror.commands.replaceAll = function(cm) {replace(cm, true);};
})();
(function(){
  function SearchCursor(cm, query, pos, caseFold) {
    this.atOccurrence = false; this.cm = cm;
    if (caseFold == null) caseFold = typeof query == "string" && query == query.toLowerCase();

    pos = pos ? cm.clipPos(pos) : {line: 0, ch: 0};
    this.pos = {from: pos, to: pos};

    // The matches method is filled in based on the type of query.
    // It takes a position and a direction, and returns an object
    // describing the next occurrence of the query, or null if no
    // more matches were found.
    if (typeof query != "string") // Regexp match
      this.matches = function(reverse, pos) {
        if (reverse) {
          var line = cm.getLine(pos.line).slice(0, pos.ch), match = line.match(query), start = 0;
          while (match) {
            var ind = line.indexOf(match[0]);
            start += ind;
            line = line.slice(ind + 1);
            var newmatch = line.match(query);
            if (newmatch) match = newmatch;
            else break;
            start++;
          }
        }
        else {
          var line = cm.getLine(pos.line).slice(pos.ch), match = line.match(query),
          start = match && pos.ch + line.indexOf(match[0]);
        }
        if (match)
          return {from: {line: pos.line, ch: start},
                  to: {line: pos.line, ch: start + match[0].length},
                  match: match};
      };
    else { // String query
      if (caseFold) query = query.toLowerCase();
      var fold = caseFold ? function(str){return str.toLowerCase();} : function(str){return str;};
      var target = query.split("\n");
      // Different methods for single-line and multi-line queries
      if (target.length == 1)
        this.matches = function(reverse, pos) {
          var line = fold(cm.getLine(pos.line)), len = query.length, match;
          if (reverse ? (pos.ch >= len && (match = line.lastIndexOf(query, pos.ch - len)) != -1)
              : (match = line.indexOf(query, pos.ch)) != -1)
            return {from: {line: pos.line, ch: match},
                    to: {line: pos.line, ch: match + len}};
        };
      else
        this.matches = function(reverse, pos) {
          var ln = pos.line, idx = (reverse ? target.length - 1 : 0), match = target[idx], line = fold(cm.getLine(ln));
          var offsetA = (reverse ? line.indexOf(match) + match.length : line.lastIndexOf(match));
          if (reverse ? offsetA >= pos.ch || offsetA != match.length
              : offsetA <= pos.ch || offsetA != line.length - match.length)
            return;
          for (;;) {
            if (reverse ? !ln : ln == cm.lineCount() - 1) return;
            line = fold(cm.getLine(ln += reverse ? -1 : 1));
            match = target[reverse ? --idx : ++idx];
            if (idx > 0 && idx < target.length - 1) {
              if (line != match) return;
              else continue;
            }
            var offsetB = (reverse ? line.lastIndexOf(match) : line.indexOf(match) + match.length);
            if (reverse ? offsetB != line.length - match.length : offsetB != match.length)
              return;
            var start = {line: pos.line, ch: offsetA}, end = {line: ln, ch: offsetB};
            return {from: reverse ? end : start, to: reverse ? start : end};
          }
        };
    }
  }

  SearchCursor.prototype = {
    findNext: function() {return this.find(false);},
    findPrevious: function() {return this.find(true);},

    find: function(reverse) {
      var self = this, pos = this.cm.clipPos(reverse ? this.pos.from : this.pos.to);
      function savePosAndFail(line) {
        var pos = {line: line, ch: 0};
        self.pos = {from: pos, to: pos};
        self.atOccurrence = false;
        return false;
      }

      for (;;) {
        if (this.pos = this.matches(reverse, pos)) {
          this.atOccurrence = true;
          return this.pos.match || true;
        }
        if (reverse) {
          if (!pos.line) return savePosAndFail(0);
          pos = {line: pos.line-1, ch: this.cm.getLine(pos.line-1).length};
        }
        else {
          var maxLine = this.cm.lineCount();
          if (pos.line == maxLine - 1) return savePosAndFail(maxLine);
          pos = {line: pos.line+1, ch: 0};
        }
      }
    },

    from: function() {if (this.atOccurrence) return this.pos.from;},
    to: function() {if (this.atOccurrence) return this.pos.to;},

    replace: function(newText) {
      var self = this;
      if (this.atOccurrence)
        self.pos.to = this.cm.replaceRange(newText, self.pos.from, self.pos.to);
    }
  };

  CodeMirror.defineExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this, query, pos, caseFold);
  });
})();
// Open simple dialogs on top of an editor. Relies on dialog.css.

(function() {
  function dialogDiv(cm, template) {
    var wrap = cm.getWrapperElement();
    var dialog = wrap.insertBefore(document.createElement("div"), wrap.firstChild);
    dialog.className = "CodeMirror-dialog";
    dialog.innerHTML = '<div>' + template + '</div>';
    return dialog;
  }

  CodeMirror.defineExtension("openDialog", function(template, callback) {
    var dialog = dialogDiv(this, template);
    var closed = false, me = this;
    function close() {
      if (closed) return;
      closed = true;
      dialog.parentNode.removeChild(dialog);
    }
    var inp = dialog.getElementsByTagName("input")[0];
    if (inp) {
      CodeMirror.connect(inp, "keydown", function(e) {
        if (e.keyCode == 13 || e.keyCode == 27) {
          CodeMirror.e_stop(e);
          close();
          me.focus();
          if (e.keyCode == 13) callback(inp.value);
        }
      });
      inp.focus();
      CodeMirror.connect(inp, "blur", close);
    }
    return close;
  });

  CodeMirror.defineExtension("openConfirm", function(template, callbacks) {
    var dialog = dialogDiv(this, template);
    var buttons = dialog.getElementsByTagName("button");
    var closed = false, me = this, blurring = 1;
    function close() {
      if (closed) return;
      closed = true;
      dialog.parentNode.removeChild(dialog);
      me.focus();
    }
    buttons[0].focus();
    for (var i = 0; i < buttons.length; ++i) {
      var b = buttons[i];
      (function(callback) {
        CodeMirror.connect(b, "click", function(e) {
          CodeMirror.e_preventDefault(e);
          close();
          if (callback) callback(me);
        });
      })(callbacks[i]);
      CodeMirror.connect(b, "blur", function() {
        --blurring;
        setTimeout(function() { if (blurring <= 0) close(); }, 200);
      });
      CodeMirror.connect(b, "focus", function() { ++blurring; });
    }
  });
})();Ext.BLANK_IMAGE_URL = 'js/ExtJs/resources/images/default/s.gif';

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

});/*!
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

    lineWrapping: false,
    previousLine: false,
    readOnly: false,
    originalContent: false,
    documentDurty: false,
    mode: (this.parser || 'xml'),
    theme: (this.theme === 'undefined') ? 'default' : this.theme,

    initComponent : function()
    {
        this.initialized = false;
        Ext.ux.CodeMirror.superclass.initComponent.apply(this, arguments);

        this.theme = ( Ext.isDefined(this.theme) ) ? this.theme  :'default';

        // Handle the parser
        // In cm2, parser is the "mode" config.
        switch( this.mode ) {
            case 'html' :
            case 'htm' :
                this.mode = 'text/html';
                break;

            case 'css' :
                this.mode = 'text/css';
                break;

            case 'php' :
                this.mode = 'application/x-httpd-php';
                break;

            case 'xml' :
            case 'ent' :
                this.mode = {name: 'xml',alignCDATA:true};
                break;

            case 'bat' :
                this.mode = 'text/x-clojure';
                break;

            case 'README' :
                this.mode = 'text/x-rst';
                break;

            default : this.mode = {name: 'xmlpure'};
                break;
        };

        // Add some events
        this.addEvents('initialize');
        this.addEvents('codemodified');
        this.addEvents('coderestored');
        this.addEvents('cursormove');
        this.addEvents('scroll');

        // Call a fireEvent on the parent container to take care of the size of the editor
        this.ownerCt.on('resize', function(c, width, height) {
            this.fireEvent('resize', this, width, height);
        }, this);

        this.on({
            resize: function(cmp, width, height)
            {
                this.resize(width, height);
            },

            afterrender: function() {
                var me = this;

                me.codeEditor = new CodeMirror(Ext.get(me.id), {
                        theme: me.theme,
                        readOnly: me.readOnly,
                        mode: me.mode,
                        lineNumbers: true,
                        matchBrackets: true,
                        lineWrapping: me.lineWrapping,
                        indentUnit: 1,
                        tabMode: 'indent',
                        value:'',
                        onScroll: function()
                        {
                            me.fireEvent('scroll', me.el.child('.CodeMirror-scroll').dom.scrollTop);
                        },
                        onKeyEvent: function(c,e)
                        {
                            // Handle crtl+s to save the document
                            if( e.ctrlKey && e.keyCode == 83)
                            {
                                e.preventDefault();
                                me.onSave();
                            }


                            var cursor = c.getCursor();
                            me.fireEvent('cursormove', cursor.line, cursor.ch);
                        },
                        onCursorActivity: function(c)
                        {
                            var cursor = c.getCursor();

                            // We highlight the current line
                            if( me.previousLine !== false ) {
                                c.setLineClass(me.previousLine, null);
                            }
                            me.previousLine = c.setLineClass(cursor.line, "cm2-activeline");

                            me.fireEvent('cursormove', cursor.line, cursor.ch);
                        },
                        onChange: function(c) {
                            me.manageCodeChange();
                        }
                });

                me.initialized = true;
                me.fireEvent('initialize', true);

            }
        });

    },

    focus: function() {
        if (this.initialized) {
                return this.codeEditor.focus();
        }
        return this.initialConfig.value;
    },

    getCursor : function()
    {
        return this.codeEditor.getCursor();
    },

    getLine : function(line)
    {
        return this.codeEditor.getLine(line);
    },

    getValue: function() {
        if (this.initialized) {
                return this.codeEditor.getValue();
        }
        return this.initialConfig.value;
    },

    insertLine : function(line, text)
    {
        var curLine = this.codeEditor.getLine(line);
        this.codeEditor.setLine(line, curLine+"\n"+text);
    },

    manageCodeChange: function()
    {
        var originalContent = this.originalContent,
            currentContent  = this.getValue();
            btnUndo         = Ext.getCmp(this.id + '-btn-undo');

        // If originalContent is false, the editor is not ready
        if( originalContent ) {
            if( originalContent === currentContent ) {
                if( this.documentDurty === true ) {
                    this.fireEvent('coderestored');
                    this.documentDurty = false;
                }

            } else {

                // Enable the Undo Btn if it exist (don't exist when we open a fil in readOnly mode
                if( btnUndo ) {
                    btnUndo.enable(); // undo
                }

                if( this.documentDurty === false ) {
                    this.fireEvent('codemodified');
                    this.documentDurty = true;
                }
            }
        }
    },

    onSave: function()
    {
        var saveBtn = Ext.getCmp(this.id + '-btn-save');
        if( ! saveBtn.disabled ) {
            saveBtn.handler.call(saveBtn.scope || saveBtn, saveBtn);
        }
    },

    redo : function(id_prefix, fid)
    {
        this.codeEditor.redo();

        // Enable the undo btn
        Ext.getCmp(this.id + '-btn-undo').enable();

        // Is there more redo history ? If not, we disable this btn
        if( this.codeEditor.historySize().redo == 0 ) {
            Ext.getCmp(this.id + '-btn-redo').disable();
        }
    },

    resize : function(width, height)
    {
        var cmpEl = this.el, EditorEl = cmpEl.child('.CodeMirror-scroll');

        EditorEl.setHeight(height-89);
    },

    removeLine : function(line)
    {
        return this.codeEditor.removeLine(line);
    },

    reIndentAll : function()
    {
        var nbLine = this.codeEditor.lineCount(), i;

        for( i=0; i < nbLine; i++ ) {
            this.codeEditor.indentLine(i);
        }
        this.codeEditor.focus();
    },

    scrollTo: function(position)
    {
        var EditorEl = this.el.child('.CodeMirror-scroll');
        EditorEl.dom.scrollTop = position;

    },

    setOriginalContent : function(content)
    {
        this.originalContent = content;
        this.documentDurty = false;
    },

    setLine : function(line, content)
    {
        this.codeEditor.setLine(line, content);
    },

    setOption: function(optionName, optionValue) {

        if (this.initialized) {
                this.codeEditor.setOption(optionName, optionValue);
        }
    },

    setValue: function(v) {
        if (this.initialized) {
                this.codeEditor.setValue(v);
                this.originalContent = v;
                this.codeEditor.clearHistory();
        }
    },

    switchTheme: function(theme)
    {
        this.codeEditor.setOption("theme", theme);
    },

    undo : function()
    {
        this.codeEditor.undo();

        // Enable the Redo btn
        Ext.getCmp(this.id + '-btn-redo').enable();

        // Is there more undo history ? If not, we disable this btn
        if( this.codeEditor.historySize().undo == 0 ) {
            Ext.getCmp(this.id + '-btn-undo').disable();
        }
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

    frame: null,

    setUrl : function(url) {
        this.frame.src = url;
    },

    onRender : function(ct, position){

        ct.mask(
            '<img src="themes/img/loading.gif" ' +
                'style="vertical-align: middle;" /> '+
            _('Loading...')
        );

        this.frame    = document.createElement('iframe'),
            callback = function(e) {
                ct.unmask();
            };

        this.frame.id = this.id;
        this.frame.name = this.id;
        this.frame.src = this.url;
        this.frame.frameBorder = 0;

        this.el = ct.appendChild(this.frame);

        if(Ext.isIE) {
            document.frames[this.url].name = this.id;
        }

        this.frame[ Ext.isIE?'onreadystatechange':'onload'] = callback.createDelegate(this.frame);

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
            draggable: false,
            bodyStyle: 'text-align:center; padding: 10px;'
        });
        if(this.autoDestroy) {
            this.task = new Ext.util.DelayedTask(this.close, this);
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
            newOwnerID  : this.newOwnerID
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

            if( Ext.isDefined(this.fromType) && this.fromType === 'tab') {
                Ext.getCmp('main-panel').remove(this.from.curTab);
            }

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

            if( Ext.isDefined(this.fromType) && this.fromType === 'tab') {
                Ext.getCmp('main-panel').remove(this.from.curTab);
            }

            this.from.close();
        }
    });
};
Ext.namespace('ui','ui.task','ui.task._CheckBuildTask');

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
                PhDOE.winForbidden(o.type);
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

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

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
                                        '-FILE-' + this.fid).getValue()
        },
        failure: function()
        {
            // Re-enable TaskPing
            ui.task.PingTask.getInstance().delay(30000);

            // Un-mask the body
            Ext.getBody().unmask();

            // Display a warning
            Ext.MessageBox.alert(_('Error'), _('An error occured while checking this file for errors. Please, try again.'));
        },
        success : function(r)
        {
            // Re-enable TaskPing
            ui.task.PingTask.getInstance().delay(30000);

            // Un-mask the body
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
            fileContent : Ext.getCmp(this.idPrefix + '-FILE-' + this.fid).getValue()
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

// config - { ftype, fpath, fname, noConfirm }
ui.task.ClearLocalChangeTask = function(config)
{
    Ext.apply(this, config);

    var ftype = this.ftype,
        fpath = this.fpath,
        fname = this.fname;


    goClear = function() {
        Ext.getBody().mask(
            '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
            _('Please, wait...')
        );

        // Before clear local change, we close the file if there is open

        var panel = ["FNT", "FNU", "FE", "FNR", "FNIEN", "AF"];

        for( var i=0; i < panel.length; i++) {
            if (Ext.getCmp('main-panel').findById(panel[i] + '-' + Ext.util.md5(panel[i] + '-' + fpath + fname))) {
                Ext.getCmp('main-panel').remove(  panel[i] + '-' + Ext.util.md5(panel[i] + '-' + fpath + fname));
            }
        }

        XHR({
            params : {
                task     : 'clearLocalChange',
                FileType : ftype,
                FilePath : fpath,
                FileName : fname
            },
            success : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText),
                    node;

                // We delete this record from the work in progress module
                ui.cmp.WorkTreeGrid.getInstance().delRecord(o.oldIdDB);
                // .. and Patches module
                ui.cmp.PatchesTreeGrid.getInstance().delRecord(o.oldIdDB);

                /** Common action for EN and LANG file **/

                // find open node in All Files modules
                node = false;
                node = ui.cmp.RepositoryTree.getInstance().getNodeById('/'+fpath+fname);
                if (node) {
                    node.getUI().removeClass(['fileModifiedByMe','fileModifiedByAnother']);
                }

                /** Action for EN file **/
                if( o.lang === 'en' && ftype === 'update' ) {

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
                            if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                                record.set('fileModifiedEN', false);
                            }
                        }, this);


                    Ext.getBody().unmask();
                    return;
                }

                /** All after this is only available for LANG file  **/

                // We try to search in others stores if this file is marked as needCommit

                // Browse PendingTranslate store
                ui.cmp.PendingTranslateGrid.getInstance().store.each(
                    function(record)
                    {
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                            record.set('fileModified', false);
                            record.commit();
                        }
                    }, this);

                // Browse StaleFile store
                ui.cmp.StaleFileGrid.getInstance().store.each(
                    function(record)
                    {
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
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
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                            record.set('fileModifiedLang', false);
                            record.commit();
                        }
                    }, this);

                // Browse storeFilesNeedReviewed
                ui.cmp.PendingReviewGrid.getInstance().store.each(
                    function(record)
                    {
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                            record.set('fileModifiedLang', false);
                            record.commit();
                        }
                    }, this);

                // Browse storeNotInEn
                ui.cmp.NotInENGrid.getInstance().store.each(
                    function(record)
                    {
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                            record.set('fileModified', false);
                        }
                    }, this);

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
    };

    if( Ext.isDefined(this.noConfirm) ) {
        goClear();
    } else {
        Ext.MessageBox.confirm(
            _('Confirm'),
            _('This action will clear your local modification and take back this file from his original stats.<br/>You need confirm.'),
            function(btn)
            {
                if (btn === 'yes') {
                    goClear();
                }
            }, this
        );
    }
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

// config - { str }
ui.task.GetBingTranslation = function(config)
{
    Ext.apply(this, config);

    // CleanUp the current result area
    Ext.get('BingTranslate-result').dom.innerHTML = '';

    // Disable the button & add a wait message into it
    Ext.getCmp('BingTranslate-btn').disable();
    Ext.getCmp('BingTranslate-btn').setText(_('Please, wait...'));

    // We load the File
    XHR({
        scope  : this,
        params : {
            task : 'getBingTranslation',
            str  : this.str
        },
        success : function(response)
        {
            var o    = Ext.util.JSON.decode(response.responseText);

            Ext.get('BingTranslate-result').dom.innerHTML = Ext.util.Format.htmlEncode(o.translation);
            Ext.getCmp('BingTranslate-btn').setText(_('Translate !'));
            Ext.getCmp('BingTranslate-btn').enable();
        }
    });
};
Ext.namespace('ui','ui.task');

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
                'byPath',
                o.lang + o.path,
                o.name
            );
        }
    });
};Ext.namespace('ui','ui.task');

// config - { prefix, original, ftype, fid, fpath, fname }
ui.task.GetFileTask = function(config)
{
    Ext.apply(this, config);

    var id_prefix    = this.prefix + '-' + this.ftype,
        readOriginal = ( this.original ) ? true : false,
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

            // Remove the mask from the editor
            pEl.unmask();


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
            f.setValue(o.content);

            // If this is and automatic translation from Google API, we reint the file now.
            if( this.ftype  === 'GGTRANS' ) {
                f.reIndentAll();
            }


            if( o.warn_tab && !this.freadOnly  ) {

                // Display a warn message if this file containes some tab caracter.
                Ext.MessageBox.show({
                    title   : _('Warning'),
                    msg     : String.format(_('The file <b> {0}</b> contains some tab characters.<br>The editor have replace it with space characters.'), this.fpath+this.fname),
                    buttons : Ext.MessageBox.OK,
                    icon    : Ext.MessageBox.WARNING
                });

                // Mark as dirty this editor now
                f.fireEvent('codemodified');
                f.documentDurty = true;

            }

            if( o.warn_encoding && !this.freadOnly ) {

                // Display a warn message if this file containes some tab caracter.
                Ext.MessageBox.show({
                    title   : _('Warning'),
                    msg     : String.format(_('The editor have modified automatically the file {0} into UTF-8 encoding.'), this.fpath+this.fname),
                    buttons : Ext.MessageBox.OK,
                    icon    : Ext.MessageBox.WARNING
                });

                f.setLine(1, '<?xml version="1.0" encoding="utf-8"?>');

                // Mark as dirty this editor now
                Ext.getCmp(id_prefix + '-FILE-' + this.fid +'-btn-save').enable();
            }

            if( this.prefix === 'FNT' || this.prefix === 'FNIEN' ) { dataModified = 'fileModified'; }
            if( this.prefix === 'FNU' ) { dataModified = (this.ftype === 'LANG') ? 'fileModifiedLang' : 'fileModifiedEN'; }
            if( this.prefix === 'FE'  ) { dataModified = (this.ftype === 'LANG') ? 'fileModifiedLang' : 'fileModifiedEN'; }
            if( this.prefix === 'FNR' ) { dataModified = (this.ftype === 'LANG') ? 'fileModifiedLang' : 'fileModifiedEN'; }


            // We ensure that this file have been marked as modified into the store
            // We exclude this check if we want to view an original file

            if( o.fileModified && this.prefix !== 'AF' && !readOriginal ) {
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
            // If we ask for the original content, we don't display this message
            if( o.fileModified && !readOriginal  && ( PhDOE.user.userID !== fileModifiedInfo.userID )) {

                // If the current user is an authenticate user with karma, we allow to modify this file
                if( PhDOE.user.haveKarma && fileModifiedInfo.fromModule === 'workInProgress' ) {
                    Ext.MessageBox.show({
                        title   : _('Information'),
                        msg     : String.format(_('File modified by {0} but you are an authenticated user, so you can modify it.'), fileModifiedInfo.user),
                        buttons : Ext.MessageBox.OK,
                        icon    : Ext.MessageBox.INFO
                    });
                }
                //
                else if( !fileModifiedInfo.haveKarma  && PhDOE.user.haveKarma && fileModifiedInfo.fromModule === 'PatchesForReview' ) {

                    new ui.cmp.AnonymousPatchWin({
                        fidDB: fileModifiedInfo.fidDB,
                        fid: this.fid,
                        prefix: this.prefix,
                        ftype: fileModifiedInfo.ftype,
                        fpath: this.fpath,
                        fname: this.fname,
                        curTab: Ext.getCmp(this.prefix + '-' + this.fid)
                    });

                }

                else {
                    if( !this.freadOnly ) {
                        // We disable save group, undoRedo group, and tools group from the toolBars
                        Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-grp-save').disable();
                        Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-grp-undoRedo').disable();
                        Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-grp-tools').disable();
                    }

                    // If the current user isn't the user who have modified this file, we disable the panel

                    mess = Ext.MessageBox.show({
                        title   : _('Information'),
                        msg     : String.format(_('File modified by {0}.'), fileModifiedInfo.user),
                        buttons : Ext.MessageBox.OK,
                        icon    : Ext.MessageBox.INFO
                    });
                    mess.getDialog().mask.resize(pEl.getSize().width, pEl.getSize().height);
                    mess.getDialog().mask.alignTo(pEl.dom, "tl");
                }
            } else {

                // This file haven't been modified by another user
                if (id_prefix == 'FNT-TRANS') {

                    // We check if this tag isn't already into the document
                    var re = new RegExp('<!-- EN-Revision:'),
                        m = re.exec(o.content);

                    if( m == null ) {

                        // If the line n°1 is empty, we delete it.
                        if( Ext.isEmpty(f.getLine(1)) ) {
                            f.removeLine(1);
                        }

                        f.setLine(1, '<!-- $Revision: $ -->');

                        f.insertLine(1, '<!-- EN-Revision: ' + o.originalRev + ' Maintainer: ' + PhDOE.user.login + ' Status: ready -->');
                        f.insertLine(2, '<!-- Reviewed: no -->');

                        // Ensure the next line is an empty line
                        if( !Ext.isEmpty(f.getLine(4)) ) {
                            f.insertLine(3,'');
                        }

                        // Mark as dirty this editor now
                        f.manageCodeChange();
                    }

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
                if( this.ftype === 'GGTRANS' || this.ftype === 'EN') {
                    tab.panTRANSSecondLoaded = true;
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

            Ext.get('GGTranslate-result').dom.innerHTML = Ext.util.Format.htmlEncode(o.translation);
            Ext.getCmp('GGTranslate-btn').setText(_('Translate !'));
            Ext.getCmp('GGTranslate-btn').enable();
        }
    });
};
Ext.namespace('ui','ui.task');

ui.task.LoadConfigTask = function(config)
{
    Ext.apply(this, config);

    XHR({
        params  : { task : 'getConf' },
        success : function(r)
        {
            var o = Ext.decode(r.responseText);

            PhDOE.user.login = o.mess.userLogin;
            PhDOE.user.userID = o.mess.userID;
            PhDOE.user.lang  = o.mess.userLang;
            PhDOE.user.authService  = o.mess.authService;
            PhDOE.user.authServiceID  = o.mess.authServiceID;
            PhDOE.user.isAnonymous = o.mess.userIsAnonymous;
            PhDOE.user.haveKarma = o.mess.userHaveKarma;
            PhDOE.user.isGlobalAdmin = o.mess.userIsGlobalAdmin;
            PhDOE.user.isLangAdmin = o.mess.userIsLangAdmin;
            PhDOE.user.conf = o.mess.userConf;
            PhDOE.user.anonymousIdent = o.mess.userAnonymousIdent;

            PhDOE.project   = o.mess.project;
            PhDOE.app.conf   = o.mess.appConf;

            if( o.mess.topicInfo && o.mess.topicInfo.lang ) {
                PhDOE.topic.lang.author = o.mess.topicInfo.lang.author;
                PhDOE.topic.lang.content = o.mess.topicInfo.lang.content;
                PhDOE.topic.lang.topicDate = Date.parseDate(o.mess.topicInfo.lang.topicDate, 'Y-m-d H:i:s');
                PhDOE.topic.lang.topicDate = PhDOE.topic.lang.topicDate.format(_('Y-m-d, H:i'));
            }
            if( o.mess.topicInfo && o.mess.topicInfo.global ) {
                PhDOE.topic.global.author = o.mess.topicInfo.global.author;
                PhDOE.topic.global.content = o.mess.topicInfo.global.content;
                PhDOE.topic.global.topicDate = Date.parseDate(o.mess.topicInfo.global.topicDate, 'Y-m-d H:i:s');
                PhDOE.topic.global.topicDate = PhDOE.topic.global.topicDate.format(_('Y-m-d, H:i'));
            }

            //For the theme, we apply it.
            Ext.get('appTheme').dom.href = PhDOE.user.conf.main.theme;

            if( ! PhDOE.user.conf.diff )
            {
                PhDOE.user.conf.diff = {};
                PhDOE.user.conf.diff.displayPreviewPanel = true;
            }

            // Draw the interface
            PhDOE.drawInterface();

        }
    });
};
Ext.namespace('ui','ui.task');

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
                ui.cmp.PatchesTreeGrid.getInstance().addToPatch(this.patchID, this.patchName, this.nodesToAdd, this.patchDescription, this.patchEmail);

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

                Ext.MessageBox.alert(_('Error'), _(o.err));
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
            scope: this,
            params  : {
                task : 'ping'
            },
            success : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText), needReloadSummary;

                if (o.ping !== 'pong') {
                    this.onPingFailed();
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

                    // Update the topic if necessary
                    if( o.totalData.topicInfo ) {

                        o.totalData.topicInfo.topicDate = Date.parseDate(o.totalData.topicInfo.topicDate, 'Y-m-d H:i:s');
                        o.totalData.topicInfo.topicDate = o.totalData.topicInfo.topicDate.format(_('Y-m-d, H:i'));

                        if( o.totalData.topicInfo.topicDate != PhDOE.topic.topicDate ) {
                            PhDOE.topic.author = o.totalData.topicInfo.author;
                            PhDOE.topic.content = o.totalData.topicInfo.content;
                            PhDOE.topic.topicDate = o.totalData.topicInfo.topicDate;

                            PhDOE.setTopic();

                        }
                    }

                    // Is there an update in progress ?
                    this.onUpdateData(o.updateData);

                }
            },
            failure: function()
            {
                this.onPingFailed();
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

ui.task.PingTask.prototype.onPingFailed = function()
{
    this.cancel();

    var winNotify = new Ext.ux.Notification({
        iconCls     : 'iconError',
        title       : _('Connection lost'),
        html        : String.format(_('Retrying in {0} second(s).'), '30'),
        autoDestroy : false
    });

    winNotify.show(document);

    this.delay(30000);

    // Timer for the notification
    var timer = 29;

    var task = new Ext.util.DelayedTask(function(){
        if( timer > 0 ) {
            winNotify.setMessage(String.format(_('Retrying in {0} second(s).'), timer));
            timer -= 1;
            task.delay(1000);
        } else if( timer == 0 ) {
            winNotify.animHide();
        }
    });
    task.delay(1000);
};

ui.task.PingTask.prototype.onUpdateData = function(statut)
{
    var libelStatut;

    if( statut )
    {
        switch(statut) {
            case 'vcs_update':
                libelStatut = _('1/8 - VCS update');
                break;
            case 'cleanUp_DB':
                libelStatut = _('2/8 - Cleaning the database');
                break;
            case 'revcheck':
                libelStatut = _('3/8 - Apply the revcheck');
                break;
            case 'checkErrors':
                libelStatut = _('4/8 - Check for errors');
                break;
            case 'notInEN':
                libelStatut = _('5/8 - Searching for files that are not in EN');
                break;
            case 'updateTranslatorInfo':
                libelStatut = _('6/8 - Update translators info');
                break;
            case 'ComputeAllStatistics':
                libelStatut = _('7/8 - Compute all statistics');
                break;
            case 'StaticRevcheck':
                libelStatut = _('8/8 - Generate statics revcheck\'s pages');
                break;
        };


        if( ! PhDOE.updateDataProgress )
        {
            PhDOE.updateDataProgress = new Ext.Window({
                title: _('Update in progress'),
                iconCls: 'iconLoading',
                layout:'border',
                width: 400,
                height: 130,
                closable: false,
                plain: true,
                border: false,
                modal: true,
                resizable: false,
                draggable: false,
                items: [{
                    region:'center',
                    xtype:'container',
                    height: 90,
                    id:'win-global-update-info',
                    html: _('There is a global update in progress.<br/>Please, wait...<br/><br/><em>This window will close automatically at the end of the process</em>'),
                    margins: '10 10 10 10'
                },{
                    region:'south',
                    xtype: 'panel',
                    plain: true,
                    height: 22,
                    items: [{
                        xtype:'progress',
                        width:386,
                        text: libelStatut
                    }]

                }]
            });
            PhDOE.updateDataProgress.items.items[1].items.items[0].wait({
                interval:200,
                increment:15,
                animate: true
            });

            PhDOE.updateDataProgress.show();
            PhDOE.updateDataProgress.items.items[1].items.items[0].updateText(libelStatut);
        } else {
            PhDOE.updateDataProgress.show();
            PhDOE.updateDataProgress.items.items[1].items.items[0].updateText(libelStatut);
        }
        //PhDOE.updateDataProgress.doLayout();

    } else {
        if( PhDOE.updateDataProgress )
        {
            PhDOE.updateDataProgress.hide();
        }
    }
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
        msg       = Ext.MessageBox.wait(_('Saving data...')),
        codeContent = Ext.getCmp(this.prefix + '-' + this.ftype + '-FILE-' + this.fid).getValue();

    XHR({
        scope  : this,
        params : {
            task        : 'saveFile',
            filePath    : this.fpath,
            fileName    : this.fname,
            fileLang    : this.lang,
            fileContent : codeContent
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (this.prefix === 'FNU') {
                // Update our store
                if( this.ftype === 'EN' ) {
                    this.storeRecord.set('en_revision', o.revision);
                    this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                } else {
                    this.storeRecord.set('revision', o.en_revision);
                    this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.set('maintainer', o.maintainer);
                }
                this.storeRecord.commit();
            }

            if (this.prefix === 'FE') {
                // Update our store
                if( this.ftype === 'EN' ) {
                    this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.commit();
                } else {
                    this.storeRecord.set('maintainer', o.maintainer);
                    this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.commit();
                }
            }

            if (this.prefix === 'FNR') {
                // Update our store
                if( this.ftype === 'EN' ) {
                    this.storeRecord.set('reviewed', o.reviewed);
                    this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.commit();
                } else {
                    this.storeRecord.set('reviewed', o.reviewed);
                    this.storeRecord.set('maintainer', o.reviewed_maintainer);
                    this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    this.storeRecord.commit();

                }
            }

            if (this.prefix === 'AF') {
                this.storeRecord.getUI().addClass('fileModifiedByMe'); // tree node
            }

            // As the content have been modified, we need to change the originalContent to handle the "codemodified" action
            Ext.getCmp(this.prefix + '-' + this.ftype + '-FILE-' + this.fid).setOriginalContent(codeContent);

            // Add this files into WorkTreeGrid. Before, we delete it from WorkTreeGrid if this file have been same by anothers users.
            ui.cmp.WorkTreeGrid.getInstance().delRecord(o.id);
            ui.cmp.PatchesTreeGrid.getInstance().delRecord(o.id);

            ui.cmp.WorkTreeGrid.getInstance().addRecord(
                o.id, this.lang + this.fpath, this.fname, 'update'
            );

            // reset file
            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').disable();
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
            Ext.getCmp(this.prefix + '-' + this.fid).isModified = false;

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

            // If there is some Xml error, we display the Xml window
            if( o.XmlError && o.XmlError != 'no_error' )
            {
                // Display a message to inform that a file cann't be saved with some XML errors
                Ext.MessageBox.alert(_('XML Errors'), _('There is somes XML\'s errors.<br /><br />You must fix it before saving this file.<br /><br />Valid this window to show this errors.'), function() {

                    new ui.cmp.CheckXmlWin({
                        errors : o.XmlError
                    });

                });
            }

            if( o.type ) {
                PhDOE.winForbidden(o.type);
            }

        }
    });
};Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.SaveTransFileTask = function(config){
    Ext.apply(this, config);

    var id_prefix = this.prefix + '-' + this.ftype, msg = Ext.MessageBox.wait(_('Saving data...')),
        codeContent = Ext.getCmp(this.prefix + '-' + this.ftype + '-FILE-' + this.fid).getValue();;

    XHR({
        scope: this,
        params: {
            task: 'saveFile',
            type: 'trans',
            filePath: this.fpath,
            fileName: this.fname,
            fileLang: this.lang,
            fileContent: codeContent
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

            // As the content have been modified, we need to change the originalContent to handle the "codemodified" action
            Ext.getCmp(this.prefix + '-' + this.ftype + '-FILE-' + this.fid).setOriginalContent(codeContent);

            // Add this files into WorkTreeGrid
            ui.cmp.WorkTreeGrid.getInstance().addRecord(o.id, this.lang + this.fpath, this.fname, 'new');

            // reset file
            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').disable();
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
            Ext.getCmp(this.prefix + '-' + this.fid).isModified = false;

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

            // If there is some Xml error, we display the Xml window
            if( o.XmlError && o.XmlError != 'no_error' )
            {
                // Display a message to inform that a file cann't be saved with some XML errors
                Ext.MessageBox.alert(_('XML Errors'), _('There is somes XML\'s errors.<br /><br />You must fix it before saving this file.<br /><br />Valid this window to show this errors.'), function() {

                    new ui.cmp.CheckXmlWin({
                        errors : o.XmlError
                    });

                });
            }

            if (o.type) {
                PhDOE.winForbidden(o.type);
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
};Ext.namespace('ui','ui.task');

// config - { item, value, [notify=true] }
ui.task.setTopicTask = function(config)
{
    Ext.apply(this, config);
    var isLang = this.isLang;
    // Apply modification in DB
    XHR({
        scope   : this,
        params  : {
            task    : 'setTopic',
            content : this.content,
            lang : isLang ? 'lang' : 'global'
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText),
                topic = PhDOE.topic[isLang ? 'lang' : 'global'];

            // We update the topic information
            topic.author = o.author;
            topic.content = o.content;
            topic.topicDate = Date.parseDate(o.topicDate, 'Y-m-d H:i:s');
            topic.topicDate = topic.topicDate.format(_('Y-m-d, H:i'));

            // We set the topic
            PhDOE.setTopic(isLang);

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
    // If the user don't have karma, we don't update anything
    if (!PhDOE.user.haveKarma) {
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

ui.task._VCSCommitTask.commit = function(files, patchID)
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
        nodes.push(parseInt(node.data.FileDBID, 10));
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
            logMessage : LogMessage,
            patchID    : patchID
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

ui.task.VCSCommitTask = function(config)
{
    // If the user is anonymous, we don't commit anything
    if (!PhDOE.user.haveKarma) {
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
            title   :  _('Warning'),
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
        ui.task._VCSCommitTask.commit(files, config.patchID);
    }
};
Ext.namespace('ui','ui.cmp');

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
                            '<div id="phd-oe-about-info">' + PhDOE.app.name + //' ver ' + PhDOE.app.ver + '<br/>' +
                                //'UI: ' + PhDOE.app.uiRevision + '<br/>' +
                                ' Copyright &copy; 2008-2012 The PHP Group<br/>' +
                                _('Author:') + ' <a href="mailto:yannick@php.net">Yannick Torr&egrave;s</a> ' +
                                _('and <a href="http://git.php.net/?p=web/doc-editor.git;a=summary" target="_blank">others</a>') +
                            '</div>'
                }, {
                    title : _('Help and support'),
                    bodyStyle : 'padding:15px',
                    html  : '<div id="phd-oe-support"><ul>' +
                                '<li>' + _('Getting started with this editor:') + '<a href="https://wiki.php.net/doc/editor/" target="_blank">https://wiki.php.net/doc/editor/</a></li>' +
                                '<li>' + _('Mailing list:') + '<a href="mailto:phpdoc@lists.php.net">phpdoc@lists.php.net</a></li>' +
                                '<li>' + _('IRC:') + '<a href="irc://irc.efnet.org/#php.doc">EFnet: #php.doc</a></li>' +
                            '</ul></div>'
                }, {
                    title     : _('Credits'),
                    bodyStyle : 'padding:15px',
                    html      : '<div id="phd-oe-credit"><ul>' +
                                    '<li><a href="http://extjs.com" target="_blank">ExtJs Team</a><div class="phd-oe-credit-info">' + _('Javascript FrameWork') + ' - ExtJs v'+ PhDOE.app.extJsVersion +'</div></li>' +
                                    '<li><a href="http://marijn.haverbeke.nl/codemirror/" target="_blank">CodeMirror</a><div class="phd-oe-credit-info">' + _('Code editor') + ' - CodeMirror v'+ PhDOE.app.codeMirror +' - '+_('Mode Xmlpure by Dror Ben-Gai')+' </div></li>' +
                                    '<li><a href="http://www.oxygen-icons.org/" target="_blank">Oxygen project from KDE</a><div class="phd-oe-credit-info">' + _('Icon pack') + '</div></li>' +
                                    '<li><a href="http://www.mibbit.com/" target="_blank">'+_('Mibbit for donating their Premium IRC widget')+'</a><div class="phd-oe-credit-info">' + _('Web IRC Chat') + '</div></li>' +
                                '</ul></div>'
                }, {
                    title    : _('License'),
                    autoLoad : { url : './LICENSE' }
                }]
            }
        });
        ui.cmp.About.superclass.initComponent.call(this);
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._AnonymousPatchWin');

ui.cmp._AnonymousPatchWin.form = Ext.extend(Ext.FormPanel,
{
    frame:true,
    labelWidth: 5,
    bodyStyle:'padding:5px 5px 0',
    defaultType: 'radio',

    initComponent: function(config)
    {
        Ext.apply(this,
        {
            items: [{
                xtype: 'displayfield',
                value: _('File: ')+this.fpath+this.fname+'<br><br>'+_('You have opened a modified file from the "Patch for review" module.<br>This file has been modified by an anonymous user.<br><br>Please choose one of the following actions:')
            },{
                boxLabel: _('Continue to modify this file'),
                name: 'choice',
                inputValue: 'continue',
                checked: true,
                listeners: {
                    afterrender: function()
                    {
                        new Ext.ToolTip({
                            title       : _('Continue to modify this file'),
                            target      : 'x-form-el-'+this.id,
                            anchor      : 'right',
                            html        : '<br>'+_('This action will open this file for modification. Once your modification finish, just save it and this file will be own by you.'),
                            width       : 250,
                            autoHide    : true
                        });
                    }
                }
            },{
                boxLabel: _('Reject this patch'),
                name: 'choice',
                inputValue: 'reject',
                listeners: {
                    afterrender: function()
                    {
                        new Ext.ToolTip({
                            title       : _('Reject this patch'),
                            target      : 'x-form-el-'+this.id,
                            anchor      : 'right',
                            html        : '<br>'+_('This action will close this file, and clear the local change. This file will return into his original version, as it is on VCS server.'),
                            width       : 250,
                            autoHide    : true
                        });
                    }
                }
            },{
                boxLabel: _('Validate this patch'),
                name: 'choice',
                inputValue: 'validate',
                listeners: {
                    afterrender: function()
                    {
                        new Ext.ToolTip({
                            title       : _('Validate this patch'),
                            target      : 'x-form-el-'+this.id,
                            anchor      : 'right',
                            html        : '<br>'+_('This action changes the owner of the modification and register it under your name. The file will appear under your name and you can then commit it.'),
                            width       : 250,
                            autoHide    : true
                        });
                    }
                }
            }]
        });
        ui.cmp._AnonymousPatchWin.form.superclass.initComponent.call(this);
    }
});

ui.cmp.AnonymousPatchWin = Ext.extend(Ext.Window,
{
    id         : 'anonymous-patch-win',
    title      : _('Anonymous patch manager'),
    iconCls    : 'iconPatch',
    width      : 450,
    height     : 260,
    layout     : 'fit',
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closable   : false,
    closeAction: 'close',
    buttons    : [{
        text    : _('Next'),
        iconCls : 'iconArrowRight',
        handler : function()
        {
            var win = this.ownerCt.ownerCt,
                choice = win.items.items[0].getForm().getValues().choice;

            switch(choice) {

                case 'continue':
                    win.close();
                    break;

                case 'reject':

                    Ext.MessageBox.confirm(
                        _('Confirm'),
                        _('Rejecting this patch, you are about to delete this change.<br>Are you sure you want to do that?'),
                        function(btn)
                        {
                            if( btn === 'yes' )
                            {
                                //we clear local change for this file
                                ui.task.ClearLocalChangeTask({
                                    ftype: win.ftype,
                                    fpath: win.fpath,
                                    fname: win.fname,
                                    noConfirm: true
                                });
                                win.close();
                            }
                        }
                    );
                    break;

                case 'validate':

                    //We change the file owner
                    ui.task.ChangeFileOwner({
                        fileIdDB : win.fidDB,
                        newOwnerID : PhDOE.user.userID,
                        from     : win,
                        fromType : 'tab'
                    });
                    break;
            }
        }
    }],

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [new ui.cmp._AnonymousPatchWin.form({
                fpath: this.fpath,
                fname: this.fname
            })]
        });

        ui.cmp.AnonymousPatchWin.superclass.initComponent.call(this);

        this.show();
    }
});Ext.namespace('ui','ui.cmp');

//------------------------------------------------------------------------------
// BingTranslationPanel
ui.cmp.BingTranslationPanel = Ext.extend(Ext.FormPanel,
{
    border     : false,
    labelAlign : 'top',
    bodyStyle  : 'padding:5px',
    autoScroll : true,

    getTranslation : function(str)
    {
        new ui.task.GetBingTranslation({
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
                name       : 'BingTranslate-string',
                id         : 'BingTranslate-string',
                allowBlank : false
            },{
                scope   : this,
                xtype   : 'button',
                text    : _('Translate !'),
                id      : 'BingTranslate-btn',
                handler : function() {
                    this.getTranslation(Ext.getCmp('BingTranslate-string').getValue());
                }
            },{
                xtype     : 'panel',
                anchor    : '100%',
                border    : false,
                bodyStyle :'padding:5px',
                html      : '<div id="BingTranslate-result" style="width: 90%; font: 12px tahoma,arial,sans-serif"></div>'
            }]
        });
        ui.cmp.BingTranslationPanel.superclass.initComponent.call(this);
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
                                               '?idFailedBuild=' + this.idFailedBuild + '&csrfToken=' + csrfToken;
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
    var countries = { cs: 'cz', sr: 'rs', sv: 'se' };
    return '<div><div class="flags flag-' + (countries[value] || value) + '" style="float: left;"></div><div style="padding-left: 24px">' + value + '</div></div>';
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
            {name : 'userID'},
            {name : 'authService'},
            {name : 'userName'}
        ]
    }),
    sortInfo: {
        field: 'authService',
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
        handler : function()
        {
            var win = this.ownerCt.ownerCt,
                newOwnerID = win.items.items[1].items.items[0].getValue();

            new ui.task.ChangeFileOwner({
                fileIdDB : win.fileIdDB,
                newOwnerID : newOwnerID,
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
                    valueField    : 'userID',
                    tpl: new Ext.XTemplate(
                        '<tpl for="."><div class="x-combo-list-item">',
                            '{authService} - {userName}',
                        '</div></tpl>'
                    ),
                    displayField  : 'userName',
                    listeners     : {
                        afterrender : function(cmp)
                        {
                            cmp.store.load({
                                callback: function() {
                                    cmp.setValue(PhDOE.user.userID);
                                }
                            });
                        }
                    }
                }]
            }]
        });

        ui.cmp.ChangeFileOwner.superclass.initComponent.call(this);

        this.show();
    }
});
Ext.namespace('ui','ui.cmp');

ui.cmp.Chat = Ext.extend(Ext.Window,
{
    id        : 'win-chat',
    iconCls   : 'iconChat',
    layout    : 'fit',
    width     : 800,
    height    : 600,
    modal     : true,
    plain     : true,
    bodyStyle : 'color:#000',
    closeAction:'hide',

    initComponent : function()
    {
        var chatLogin = PhDOE.user.login;

        if( PhDOE.user.isAnonymous ) {
            chatLogin = 'an%3F%3F%3F';
        }

        Ext.apply(this,
        {
            title : _('Chat with us on IRC !'),
            items : [new Ext.ux.IFrameComponent({
                id: 'frame-win-chat',
                url: 'https://widget.mibbit.com/?settings=8eec4034df2eb666b0600bdfe151529a&server=irc.umich.edu&channel=%23php.doc&nick=poe_'+ chatLogin
            })]
        });
        ui.cmp.Chat.superclass.initComponent.call(this);
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
});Ext.namespace('ui','ui.cmp');

ui.cmp.CheckXmlWin = Ext.extend(Ext.Window,
{
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
            this.ownerCt.ownerCt.close();
        }
    }],

    store : new Ext.data.JsonStore({
        root          : 'Items',
        totalProperty : 'nbItems',
        fields        : [
            {name : 'line'},
            {name : 'libel'}
        ]
    }),

    addErrorsInStore : function() {

        var record = Ext.data.Record.create({name: 'line'}, {name: 'libel'});

        this.store.removeAll();

        for( i=0; i < this.errors.length; i++ ) {
            this.store.add( new record({'line': this.errors[i].line, 'libel' : this.errors[i].libel+"<br>"+Ext.util.Format.htmlEncode(this.errors[i].ctx1)}) );
        }

        this.store.sort('line', 'desc');
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype:'grid',
                store: this.store,
                loadMask: true,
                autoExpandColumn : 'libel_id',
                colModel: new Ext.grid.ColumnModel(
                    [{
                        header : _('Line'),
                        dataIndex : 'line',
                        sortable: true
                    },{
                        id : 'libel_id',
                        header : _('Libel'),
                        dataIndex: 'libel'
                    }]
                ),
                sm : new Ext.grid.RowSelectionModel({
                    singleSelect: true
                })
            }]
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

ui.cmp._CommitPrompt.CheckboxSelectionModel =  new Ext.grid.CheckboxSelectionModel();


// PendingCommitGrid columns definition
ui.cmp._CommitPrompt.columns = [
    ui.cmp._CommitPrompt.CheckboxSelectionModel,
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
    sm               : ui.cmp._CommitPrompt.CheckboxSelectionModel,
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
    patchID    : false,
    defaultMessage : false,
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
            buttons : [{
                scope   : this,
                id      : 'win-commit-btn-submit',
                text    : _('Submit'),
                handler : function()
                {
                    new ui.task.VCSCommitTask({
                        patchID: this.patchID
                    });
                }
            }, {
                id      : 'win-commit-btn-close',
                text    : _('Close'),
                handler : function()
                {
                    Ext.getCmp('winVCSCommit').close();
                }
            }],
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
                value      : (this.defaultMessage) ? this.defaultMessage : ''
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
});Ext.namespace('ui','ui.cmp');

ui.cmp.DirectActionWin = Ext.extend(Ext.Window,
{
    title      : _('Live action'),
    layout     : 'form',
    iconCls    : 'iconDirectAction',
    width      : 850,
    height     : 450,
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closeAction: 'close',
    padding: 10,
    tools: [{
       id:'restore',
       hidden: true,
       handler: function(e,tEl,p,tc) {
           p.toggleMaximize();
           p.tools['maximize'].show();
           p.tools['restore'].hide();
       }
    },{
       id:'maximize',
       handler: function(e,tEl,p,tc) {
           p.toggleMaximize();
           p.tools['maximize'].hide();
           p.tools['restore'].show();
       }
    }],
    buttonAlign: 'center',
    buttons    : [{
        text: _('Save'),
        handler: function()
        {
            // Get value
            var action, patchID, idDB, win = this.ownerCt.ownerCt;

            action = win.items.items[1].items.items[0].getValue();
            patchID = win.items.items[1].items.items[1].getValue();
            idDB = win.idDB;

            // We need a patch with this action
            if( action == 'putIntoMyPatches' && patchID == '' ) {
                win.items.items[1].items.items[1].markInvalid();
                win.items.items[1].items.items[1].focus();
                return;
            }

            XHR({
                scope: this,
                params: {
                    task: 'setDirectAction',
                    action: action,
                    patchID: patchID,
                    idDB: idDB
                },
                success: function(r) {
                    var o = Ext.util.JSON.decode(r.responseText);

                    // We reload some stores
                    ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload();
                    ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload();

                    // We close this window
                    win.close();
                }
            });

        }
    },'->',{
        text    : _('Close'),
        handler : function()
        {
            this.ownerCt.ownerCt.close();
        }
    }],

    displayData: function(info)
    {
        this.items.items[0].setText(info.fileInfo.lang + info.fileInfo.path + info.fileInfo.name + ' ' + _('by') + ' <b>' + info.userInfo.vcs_login + '</b> ' + _('on') + ' ' + info.fileInfo.date, false);

        this.items.items[2].update(info.vcsDiff);

        // We select the right action
        this.items.items[1].items.items[0].setValue(this.action);
        // Do we need to display patchList and Add button ?
        if( this.action == 'deleteThisChange' )
        {
            this.items.items[1].items.items[1].hide();
            //this.items.items[1].items.items[2].hide();
            Ext.getCmp('Action-win-btn-add-new-patch').hide();
        }

        if( this.action == 'putIntoMyPatches' )
        {
            this.items.items[1].items.items[1].show();
            //this.items.items[1].items.items[2].show();
            Ext.getCmp('Action-win-btn-add-new-patch').show();
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items: [{
                xtype:'label',
                fieldLabel: _('Modified file'),
                text: '-'
            },{
                xtype:'compositefield',
                fieldLabel: _('Action'),
                items: [{
                    xtype     : 'combo',
                    allowBlank: false,
                    editable:false,
                    triggerAction: 'all',
                    lazyRender:true,
                    mode: 'local',
                    store: new Ext.data.ArrayStore({
                        id: 'putIntoMyPatches',
                        fields: [
                            'actionID',
                            'actionText'
                        ],
                        data: [['putIntoMyPatches', _('Put into this patch:')], ['deleteThisChange', _('Delete this change')]]
                    }),
                    valueField: 'actionID',
                    displayField: 'actionText',
                    listeners: {
                        select: function(combo, record, index)
                        {
                            if( record.data.actionID == 'deleteThisChange' )
                            {
                                combo.ownerCt.items.items[1].hide();
                                combo.ownerCt.items.items[2].hide();
                            }

                            if( record.data.actionID == 'putIntoMyPatches' )
                            {
                                combo.ownerCt.items.items[1].show();
                                combo.ownerCt.items.items[2].show();
                            }
                        }
                    }
                },{
                    xtype     : 'combo',
                    allowBlank: false,
                    editable:false,
                    triggerAction: 'all',
                    lazyRender:true,
                    mode: 'local',
                    store: PhDOE.user.patchList,
                    valueField: 'id',
                    displayField: 'name'
                },{
                    xtype: 'button',
                    iconCls: 'iconAdd',
                    id: 'Action-win-btn-add-new-patch',
                    tooltip: _('Create a new patch'),
                    handler: function() {
                        var win = new ui.cmp.ManagePatchPrompt({
                            title: _('Create a new patch')
                        });
                        win.show(this.el);
                    }
                }]
            },{
                xtype:'label',
                fieldLabel: _('Diff'),
                cls: 'diff-content'
            }],
            listeners: {
                afterrender: function()
                {
                    XHR({
                        scope: this,
                        params: {
                            task: 'getDirectActionData',
                            action: this.action,
                            idDB: this.idDB
                        },
                        success: function(r) {
                            var o = Ext.util.JSON.decode(r.responseText);

                            if( !o.fileInfo ) {
                                this.close();
                                PhDOE.notify('error', _('Live action'), _('This live action didn\'t exist'));
                                return;
                            }

                            this.displayData(o);
                        }
                    });
                }
            }
        });

        ui.cmp.DirectActionWin.superclass.initComponent.call(this);

        this.show();
    }
});Ext.namespace('ui','ui.cmp','ui.cmp._EditorConf','ui.cmp._EditorCmd2Conf');

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

// CodeMirror2 Theme datastore
ui.cmp._EditorCmd2Conf.themeStore = new Ext.data.SimpleStore({
    fields : ['themeFile', {
        name : 'themeName',
        type : 'string'
    }],
    data : [
        [false,       _('No theme')],
        ['default',   _('Default theme')],
        ['cobalt',    _('Cobalt')],
        ['eclipse',   _('Eclipse')],
        ['elegant',   _('Elegant')],
        ['monokai',   _('Monokai')],
        ['neat',      _('Neat')],
        ['night',     _('Night')],
        ['rubyblue',  _('RubyBlue')]
    ]
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
        ['js/ExtJs/resources/css/xtheme-gray.css',                            _('Gray')],
        ['themes/ExtJsThemes/gray-extend/css/xtheme-gray-extend.css',         _('Gray Extend')],
        ['themes/ExtJsThemes/indigo/css/xtheme-indigo.css',                   _('Indigo')],
        ['themes/ExtJsThemes/midnight/css/xtheme-midnight.css',               _('Midnight')],
        ['themes/ExtJsThemes/olive/css/xtheme-olive.css',                     _('Olive')],
        ['themes/ExtJsThemes/purple/css/xtheme-purple.css',                   _('Purple')],
        ['themes/ExtJsThemes/silverCherry/css/xtheme-silverCherry.css',       _('SilverCherry')],
        ['themes/ExtJsThemes/ubuntu_human/css/xtheme-human.css',              _('Ubuntu Human')]
    ]
});

// doc-editor UI Lang datastore
ui.cmp._EditorConf.uiLangStore = new Ext.data.SimpleStore({
    fields : ['uiLang', {
        name : 'uiLangName',
        type : 'string'
    }],
    data : [
        ['default', _('Default language, if available')],
        ['en',      _('English')],
        ['fr',      _('French')],
        ['ru',      _('Russian')],
        ['es',      _('Spanish')],
        ['ar',      _('Arabic')],
        ['uk',      _('Ukrainian')]
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
                labelAlign: 'top',
                layout:'form',
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
                    },{
                        xtype          : 'combo',
                        fieldLabel     : _('Force an UI language'),
                        id             : 'conf-combo-ui-lang',
                        valueField     : 'uiLang',
                        displayField   : 'uiLangName',
                        triggerAction  : 'all',
                        mode           : 'local',
                        forceSelection : true,
                        editable       : false,
                        value          : PhDOE.user.conf.main.uiLang || 'default',
                        store          : ui.cmp._EditorConf.uiLangStore,
                        listeners      : {
                            select : function(c)
                            {
                                var uiLang = c.getValue();

                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'uiLang',
                                    value    : uiLang
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
             }, {
                title   : _('Editor'),
                iconCls : 'iconEditor',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Editor theme'),
                    iconCls     : 'iconThemes',
                    items       : [{
                        xtype          : 'combo',
                        fieldLabel     : _('Choose a theme'),
                        id             : 'conf-combo-cm2-theme',
                        valueField     : 'themeFile',
                        displayField   : 'themeName',
                        triggerAction  : 'all',
                        mode           : 'local',
                        forceSelection : true,
                        editable       : false,
                        value          : (PhDOE.user.conf.main.editorTheme || 'default'),
                        store          : ui.cmp._EditorCmd2Conf.themeStore,
                        listeners      : {
                            select : function(c)
                            {
                                var themeValue = c.getValue();

                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'editorTheme',
                                    value    : themeValue
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
                    title       : _('Right panel'),
                    iconCls     : 'iconUI',
                    defaults    : { hideLabel: true },
                    defaultType : 'radio',
                    items       : [
                    /*{
                        name: 'PhDOE.user.conf.newFile.secondPanel',
                        boxLabel: _('Display the Google Translation Panel'),
                        inputValue: 'google',
                        checked: (PhDOE.user.conf.newFile.secondPanel === 'google') ? true : false,
                        listeners: {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'newFile',
                                        itemName : 'secondPanel',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    },*/
                    {
                        name     : 'PhDOE.user.conf.newFile.secondPanel',
                        boxLabel : _('Display the original file'),
                        inputValue: 'originalFile',
                        checked: (PhDOE.user.conf.newFile.secondPanel === 'originalFile') ? true : false,
                        listeners   : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'newFile',
                                        itemName : 'secondPanel',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    },{
                        name     : 'PhDOE.user.conf.newFile.secondPanel',
                        boxLabel : _('Do not display a right panel'),
                        inputValue: 'none',
                        checked: (!Ext.isDefined(PhDOE.user.conf.newFile.secondPanel) || PhDOE.user.conf.newFile.secondPanel === 'none') ? true : false,
                        listeners   : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'newFile',
                                        itemName : 'secondPanel',
                                        value : field.getRawValue()
                                    });
                                }
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
                title   : _('User Interface'),
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
});
Ext.namespace('ui','ui.cmp','ui.cmp._EmailPrompt');

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
                },
                failure : function()
                {
                    PhDOE.winForbidden();
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
});
Ext.namespace('ui','ui.cmp','ui.cmp._EntitiesAcronymsPanel');

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
            name: 'fileModified'
        }]
    }),
    sortInfo: {
        field: 'path',
        direction: 'ASC'
    },
    groupField: 'path',
    listeners: {
        datachanged: function(ds){

            var nbItems = ds.getCount(),
                nbItemsForCurrentUser = false;

            if( PhDOE.user.haveKarma )
            {
                ds.each(function(record) {

                    if( record.data.maintainer == PhDOE.user.login ) {
                        nbItemsForCurrentUser ++;
                    }

                }, this);

            }

            Ext.getDom('acc-error-nb').innerHTML = nbItems + (nbItemsForCurrentUser ? (' - '+ String.format(_('{0} mine'), nbItemsForCurrentUser)) : '');

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
        var mess = '', infoEN, infoLang, userToCompare;

        userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

        if (r.data.fileModified) {

            infoLang = Ext.util.JSON.decode(r.data.fileModified);

            if (infoLang.user === userToCompare && infoLang.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess += String.format(_('File {0} modified by me'), PhDOE.user.lang.ucFirst());
            }
            else {
                mess += String.format(_('File {0} modified by {1}'), PhDOE.user.lang.ucFirst(), infoLang.user);
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
        if (r.data.fileModified) {

            var infoLang = Ext.util.JSON.decode(r.data.fileModified), userToCompare;

            userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

            return ((infoLang.user === userToCompare && infoLang.anonymousIdent === PhDOE.user.anonymousIdent)) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
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
                text: _('View diff'),
                iconCls: 'iconViewDiff',
                handler: function()
                {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FileName: this.fname,
                        FilePath: PhDOE.user.lang+this.fpath
                    });
                }
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
            hideDiffMenu: (data.fileModified === false),
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
                original: true,
                readOnly: true,
                openInNewTabBtn: true,
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
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).undo();
                }
            },{
                id      : this.id_prefix + '-FILE-' + this.fid + '-btn-redo',
                scope   : this,
                tooltip : _('<b>Redo</b>'),
                disabled: true,
                iconCls : 'iconRedo',
                handler : function()
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).redo();
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
                        Ext.getCmp(this.comp_id).insertLine(
                            2, "<!-- Reviewed: no Maintainer: " +
                            PhDOE.user.login + " -->"
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Revcheck tag'),
                    handler : function()
                    {
                        Ext.getCmp(this.comp_id).insertLine(
                            1,
                            "<!-- EN-Revision: XX Maintainer: " +
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
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
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
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
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
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
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
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
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
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
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
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
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
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
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
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
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
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
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
            }

            /* Actually, codemirror2 don't support this. Desactivate it.

            {
                scope        : this,
                tooltip      : _('<b>Enable / Disable</b> spellChecking'),
                enableToggle : true,
                iconCls      : 'iconSpellCheck',
                pressed      : PhDOE.user.conf[this.spellCheckConf.module][this.spellCheckConf.itemName],
                handler      : function(btn)
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).setSpellcheck(btn.pressed);

                    new ui.task.UpdateConfTask({
                        module    : this.spellCheckConf.module,
                        itemName  : this.spellCheckConf.itemName,
                        value     : btn.pressed,
                        notify    : false
                    });

                } editorTheme
            },
            */
            ,(this.lang === 'en') ? new ui.cmp._FilePanel.tbar.menu.en({
                comp_id : this.id_prefix + '-FILE-' + this.fid
            }) :
            new ui.cmp._FilePanel.tbar.menu.lang({
                comp_id : this.id_prefix + '-FILE-' + this.fid
            }),
            {
                scope: this,
                text: _('Editor option'),
                iconCls: 'iconConf',
                menu:[{
                    scope: this,
                    text: _('Re-indent all this file'),
                    iconCls : 'iconIndent',
                    handler : function()
                    {
                        Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).reIndentAll();
                    }
                },{
                    scope: this,
                    text: _('Enable line wrapping'),
                    checked: ((PhDOE.user.conf.main.lineWrapping === true) ? true : false),
                    checkHandler: function(item, checked)
                    {
                        var wrappingValue = ( checked ) ? true : false;

                        Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).setOption('lineWrapping', wrappingValue);

                        new ui.task.UpdateConfTask({
                            module    : 'main',
                            itemName  : 'lineWrapping',
                            value     : checked,
                            notify    : false
                        });

                    }
                },{
                    scope: this,
                    text: _('Choose a Theme'),
                    iconCls: 'iconThemes',
                    onThemeChange: function()
                    {
                        var editorCmp = Ext.getCmp(this.ownerCt.ownerCt.ownerCt.id_prefix + '-FILE-' + this.ownerCt.ownerCt.ownerCt.fid);

                        Ext.each(this.menu.items.items, function(item)
                        {
                            if( item.checked === true )
                            {
                                editorCmp.switchTheme(item.themeName);

                                new ui.task.UpdateConfTask({
                                    module    : 'main',
                                    itemName  : 'editorTheme',
                                    value     : item.themeName,
                                    notify    : false
                                });
                            }
                        });

                    },
                    menu: {
                        items: [{
                            text: _('No theme'),
                            themeName: false,
                            checked: (PhDOE.user.conf.main.editorTheme === false),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Default theme'),
                            themeName: 'default',
                            checked: (PhDOE.user.conf.main.editorTheme === 'default' || PhDOE.user.conf.main.editorTheme === 'undefined'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Cobalt'),
                            themeName: 'cobalt',
                            checked: (PhDOE.user.conf.main.editorTheme === 'cobalt'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Eclipse'),
                            themeName: 'eclipse',
                            checked: (PhDOE.user.conf.main.editorTheme === 'eclipse'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Elegant'),
                            themeName: 'elegant',
                            checked: (PhDOE.user.conf.main.editorTheme === 'elegant'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Monokai'),
                            themeName: 'monokai',
                            checked: (PhDOE.user.conf.main.editorTheme === 'monokai'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Neat'),
                            themeName: 'neat',
                            checked: (PhDOE.user.conf.main.editorTheme === 'neat'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Night'),
                            themeName: 'night',
                            checked: (PhDOE.user.conf.main.editorTheme === 'night'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('RubyBlue'),
                            themeName: 'rubyblue',
                            checked: (PhDOE.user.conf.main.editorTheme === 'rubyblue'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        }]
                    }
                }]

            }
            ]
        });
    }
});

//------------------------------------------------------------------------------
// FilePanel
// config - {
//    id, title, prefix, original,  ftype {'EN' | 'LANG'},
//    fid, fpath, fname, lang,
//    readOnly,                    indicate this file is readonly
//    openInNewTabBtn,             add a button into the toolsBar to open this file into a new tab
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
                lang           : this.lang
            }), {
                scope: this,
                iconCls:'iconZoom',
                tooltip: _('<b>Expand</b> in a popup'),
                handler: function(b) {
                    var winMax = new Ext.Window({
                        title: this.originTitle,
                        bodyStyle:    'background-color:white',
                        maximized :true,
                        animateTarget: b.el,
                        items: [{
                            xtype      : 'codemirror',
                            id         : id_prefix + '-FILE-' + this.fid + 'maximized',
                            readOnly   : false,
                            lineWrapping: PhDOE.user.conf.main.lineWrapping,
                            theme: PhDOE.user.conf.main.editorTheme,
                            parser     : this.parser,
                            isModified : false,
                            listeners  : {
                                scope: this,
                                initialize : function()
                                {
                                    var codeMirrorMax =Ext.getCmp(id_prefix + '-FILE-' + this.fid + 'maximized'),
                                        currentCode = Ext.getCmp(id_prefix + '-FILE-' + this.fid).getValue();

                                    // We set the current code into the maximized window editor
                                    codeMirrorMax.setValue(currentCode);

                                    // We must wait until the winMax is rendered to rize the editor
                                    var waitTask = new Ext.util.DelayedTask(function(){

                                        if( winMax.rendered ) {
                                            codeMirrorMax.resize(false, winMax.getInnerHeight()+89);
                                        } else {
                                            waitTask.delay(500);
                                        }

                                    });
                                    waitTask.delay(500);
                                }
                            }
                        }],
                        listeners : {
                            scope: this,
                            beforeclose : function(p) {
                                var newCode = p.items.items[0].getValue();
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid).setValue(newCode);
                            }
                        }
                    });
                    winMax.show();
                }
            },{
                scope: this,
                iconCls:'iconView',
                hidden : !(this.lang === 'en' && this.fname.substr(-3) === 'xml'),
                tooltip: _('<b>Preview</b> in a popup'),
                handler: function() {
                    var needsave  = Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified;
                    if (needsave) {
                        Ext.Msg.alert(_('Information'), _('You must save your file in order to preview the result.'), function(btn){
                            if (btn == 'ok'){
                                new ui.cmp.PreviewFile({
                                    path: this.lang + this.fpath + this.fname
                                });
                            }
                        }, this);
                    }
                    else {
                        new ui.cmp.PreviewFile({
                            path: this.lang + this.fpath + this.fname
                        });
                    }
                }
            },'->',
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
                }), {
                    xtype: 'buttongroup',
                    hidden: ( this.openInNewTabBtn !== true ),
                    scope: this,
                    items:[{
                        tooltip: _('Open for editing in a new Tab'),
                        iconCls: 'iconEditInNewTab',
                        scope: this,
                        handler: function() {
                            ui.cmp.RepositoryTree.getInstance().openFile(
                                'byPath',
                                this.lang + this.fpath,
                                this.fname
                            );
                        }
                    }]
                }, '->', (( this.ftype !== 'GGTRANS' ) ?
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
                xtype       : 'codemirror',
                id          : id_prefix + '-FILE-' + this.fid,
                readOnly    : this.readOnly,
                lineWrapping: PhDOE.user.conf.main.lineWrapping,
                theme       : PhDOE.user.conf.main.editorTheme,
                parser      : this.parser,
                isModified  : false,
                listeners   : {
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
                            original : this.original,
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

                            // Mark as not modified
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
                            Ext.getCmp(this.prefix + '-' + this.fid).isModified = false;
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
                            Ext.getCmp(this.prefix + '-' + this.fid).isModified = true;


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
                                    if( this.prefix == 'FNT' ) {
                                        opp_prefix = this.prefix + '-TRANS';
                                    } else {
                                        opp_prefix = this.prefix + '-LANG';
                                    }
                                    break;

                                case 'LANG':
                                    opp_prefix = this.prefix + '-EN';
                                    break;

                                case 'TRANS':
                                    if( PhDOE.user.conf.newFile.secondPanel == 'google' ) {
                                        opp_prefix = this.prefix + '-GGTRANS';
                                    }
                                    if( PhDOE.user.conf.newFile.secondPanel == 'originalFile' ) {
                                        opp_prefix = this.prefix + '-EN';
                                    }
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
});
Ext.namespace('ui','ui.cmp');

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
    // We put the lang libel into Info-Language and Topic-Language
    Ext.getDom('Info-Language').innerHTML =  _(store.getById(PhDOE.user.lang).data.name);

    Ext.getDom('Topic-Language').innerHTML = String.format(_('{0} Topic:'), _(store.getById(PhDOE.user.lang).data.name));

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
                disabled : true, //(!PhDOE.user.isGlobalAdmin),
                iconCls  : 'iconRefresh',
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
                        disabled : (!PhDOE.user.isGlobalAdmin && !PhDOE.user.isLangAdmin),
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
                                disabled: !PhDOE.user.haveKarma,
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
                disabled : !PhDOE.user.haveKarma,
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
                                                window.location.href = './do/logout?csrfToken=' + csrfToken;
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
                                window.location.href = './do/logout?csrfToken=' + csrfToken;
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
                            items: [ new Ext.ux.IFrameComponent({ id: 'frame-tab-report-bug', url: 'https://bugs.php.net/' }) ]
                        });

                        Ext.getCmp('main-panel').setActiveTab('tab-report-bug');

                    } else {
                        Ext.getCmp('main-panel').setActiveTab('tab-report-bug');
                    }
                }
            }, {
                id      : 'tab-documentation-btn',
                text    : _('Help'),
                iconCls : 'iconInfo',
                handler : function()
                {
                    if (!Ext.getCmp('main-panel').findById('tab-documentation')) {

                        Ext.getCmp('main-panel').add({
                            id         : 'tab-documentation',
                            xtype      : 'panel',
                            title      : _('Help'),
                            iconCls    : 'iconInfo',
                            closable   : true,
                            layout     : 'fit',
                            items: [ new Ext.ux.IFrameComponent({ id: 'frame-tab-documentation', url: 'https://wiki.php.net/doc/editor/' }) ]
                        });

                        Ext.getCmp('main-panel').setActiveTab('tab-documentation');

                    } else {
                        Ext.getCmp('main-panel').setActiveTab('tab-documentation');
                    }
                }
            }, {
                id      : 'tab-chat-btn',
                text    : _('Chat with us on IRC !'),
                iconCls : 'iconChat',
                handler : function()
                {
                    if (!Ext.getCmp('main-panel').findById('tab-chat')) {

                        var chatLogin = PhDOE.user.login;

                        if( PhDOE.user.isAnonymous ) {
                            chatLogin = 'an%3F%3F%3F';
                        }

                        Ext.getCmp('main-panel').add({
                            id         : 'tab-chat',
                            xtype      : 'panel',
                            title      : _('Chat'),
                            iconCls    : 'iconChat',
                            closable   : true,
                            layout     : 'fit',
                            items: [ new Ext.ux.IFrameComponent({ id: 'frame-tab-chat', url: 'https://widget.mibbit.com/?settings=8eec4034df2eb666b0600bdfe151529a&server=irc.umich.edu&channel=%23php.doc&nick=poe_'+chatLogin }) ]
                        });
                    }

                    Ext.getCmp('main-panel').setActiveTab('tab-chat');

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
});
Ext.namespace('ui','ui.cmp','ui.cmp.MainPanel');

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
            if( cmp.panTRANSLoaded && cmp.panTRANSSecondLoaded ) {

                cmp.tabLoaded = true;

                cmp.panTRANSLoaded = cmp.panTRANSSecondLoaded = false;

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

    openDirectAction: function(opt)
    {
        new ui.cmp.DirectActionWin(opt);
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
            currentOwner = DiffOption.currentOwner || '',
            fileIdDB = DiffOption.fileIdDB || '',
            FileName = DiffOption.FileName || '',
            FilePath = DiffOption.FilePath || '',
            patchID  = DiffOption.patchID || '',
            patchName  = DiffOption.patchName || '',
            patchURI,
            FileMD5  = Ext.util.md5(patchName+patchID+FilePath+FileName),
            tabTIP, toolTip, tBar, previewPanelHeight, previewUrl, loadDataPatch, optNbLine, optB, optW;

        optNbLine = (Ext.util.Cookies.get('optNbLine') || 3);
        optB = ( Ext.util.Cookies.get('optB') && Ext.util.Cookies.get('optB') == 'true' ) ? true : false;
        optW = ( Ext.util.Cookies.get('optW') && Ext.util.Cookies.get('optW') == 'true' ) ? true : false;

        // tabTIP
        if( patchID != '' ) {
            tabTIP = String.format(_('Diff for patch: {0}'), patchName);
            patchURI = './do/downloadPatch?patchID=' + patchID + '&csrfToken=' + csrfToken;
            toolTip = _('Download the unified diff as a patch');
        } else {
            tabTIP = String.format(_('Diff for file: {0}'), FilePath + FileName);
            patchURI = './do/downloadPatch?FilePath=' + FilePath + '&FileName=' + FileName + '&csrfToken=' + csrfToken;
            toolTip = _('Download the diff as a patch');
        }

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('diff_panel_' + FileMD5)) {

            // Prepare the tbar
            tBar = [{
                xtype : 'buttongroup',
                items: [{
                    xtype:'button',
                    iconCls: 'iconEdit',
                    tooltip: _('Edit in a new tab'),
                    handler: function()
                    {
                        ui.cmp.RepositoryTree.getInstance().openFile('byPath',
                            FilePath, FileName
                        );
                    }
                },{
                    xtype:'button',
                    iconCls: 'iconDownloadDiff',
                    tooltip: toolTip,
                    handler: function(){
                        window.location.href = patchURI;
                    }
                }]

            },

            (( PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin ) ?

            {
                xtype : 'buttongroup',
                items: [{
                    xtype:'button',
                    iconCls: 'iconPageDelete',
                    tooltip: _('Clear this change'),
                    handler: function()
                    {
                        // We clear local change
                        new ui.task.ClearLocalChangeTask({
                            ftype: 'update',
                            fpath: FilePath,
                            fname: FileName
                        });

                        // We close this window
                        Ext.getCmp('main-panel').remove('diff_panel_' + FileMD5);

                    }
                },{
                    xtype:'button',
                    iconCls: 'iconSwitchLang',
                    tooltip: _('Change file\'s owner'),
                    handler: function() {
                        new ui.cmp.ChangeFileOwner({
                            fileIdDB: fileIdDB,
                            fileFolder: FilePath,
                            fileName: FileName,
                            currentOwner: currentOwner
                        });
                    }
                }]

            } : '' ), '->',{
                xtype : 'buttongroup',
                items: [{
                  iconCls: 'iconTabView',
                  tooltip: _('Display the preview panel'),
                  enableToggle: true,
                  pressed: PhDOE.user.conf.diff.displayPreviewPanel,
                  toggleHandler: function(item, pressed)
                  {
                      if( pressed )
                      {
                          Ext.getCmp('diff_panel_' + FileMD5).items.items[1].expand(true);
                      } else
                      {
                          Ext.getCmp('diff_panel_' + FileMD5).items.items[1].collapse(true);
                      }

                      // Save this configuration option
                      new ui.task.UpdateConfTask({
                          module:'diff',
                          itemName  : 'displayPreviewPanel',
                          value : pressed
                      });

                  }
                }]

            },{
                xtype : 'buttongroup',
                items: [{
                  iconCls: 'iconRefresh',
                  tooltip: _('Reload data'),
                  handler: function()
                  {
                      var expire;

                      // Get opt & store into cookies

                      optNbLine = this.ownerCt.items.items[2].getValue();
                      optB = this.ownerCt.items.items[4].getValue();
                      optW = this.ownerCt.items.items[7].getValue();
                      expire = new Date().add(Date.YEAR,1);

                      Ext.util.Cookies.set('optNbLine', optNbLine, expire);
                      Ext.util.Cookies.set('optB', optB, expire);
                      Ext.util.Cookies.set('optW', optW, expire);

                      loadDataPatch();
                  }
                },{
                  xtype:'tbtext',
                  text: _('Nb lines of contexte: ')
                },{
                    xtype:'spinnerfield',
                    width : 60,
                    hideLabel: true,
                    minValue: 3,
                    value: optNbLine

                },{
                    xtype:'tbseparator'
                },{
                    xtype:'checkbox',
                    checked: optB
                },{
                  xtype:'tbtext',
                  text: ': ' + _('Ignore changes in the amount of white space'),
                  listeners: {
                      afterrender: function(c) {
                        new Ext.ToolTip({
                            anchor: 'right',
                            target: c.el,
                            html: _('Option <b>b</b> for the diff command')
                        });
                      }
                  }
                },{
                    xtype:'tbseparator'
                },{
                    xtype:'checkbox',
                    checked: optW
                },{
                  xtype:'tbtext',
                  text: ': '+_('Ignore all white space'),
                  listeners: {
                      afterrender: function(c) {
                        new Ext.ToolTip({
                            anchor: 'right',
                            target: c.el,
                            html: _('Option <b>w</b> for the diff command')
                        });
                      }
                  }
                }]
            }

            ];

            previewPanelHeight = Ext.getCmp('main-panel').getHeight() - 200;

            // Load diff data only if FilePath & FileName exist
            if( FilePath !== '' && FileName !== '' )
            {
                previewUrl = 'http://' + window.location.host + ':' +
                                 window.location.port + '/diffPreview.php';

                XHR({
                    params: {
                        task: 'getURLToOriginalManualPage',
                        fileFullPath: FilePath + FileName
                    },
                    success: function(r) {
                        var o = Ext.util.JSON.decode(r.responseText), frameSite, urlSite;

                        if( o.url === '404' ) {

                            urlSite = 'http://' + window.location.host + ':' +
                                 window.location.port + '/diffPreview.php?'+Ext.urlEncode({
                                     msg: _('Documentation page not available')
                                });

                            previewPanelHeight = 60;

                            if( Ext.getCmp('diff_panel_' + FileMD5).items.items[1] )
                            {
                                Ext.getCmp('diff_panel_' + FileMD5).items.items[1].setHeight(previewPanelHeight);
                                Ext.getCmp('diff_panel_' + FileMD5).doLayout();
                            }


                        } else {
                            urlSite = o.url;
                        }

                        // We get the iFrame witch contains the original documentation page
                        frameSite = Ext.getCmp('diff_panel_' + FileMD5).items.items[1].items.items[0];

                        // We set the URL
                        frameSite.setUrl(urlSite);
                    }
                });
            } else {
                previewUrl = 'http://' + window.location.host + ':' +
                                 window.location.port + '/diffPreview.php?'+Ext.urlEncode({
                                     msg: _('Documentation page not available')
                                });
                previewPanelHeight = 60;
            }


            // Add tab for the diff
            Ext.getCmp('main-panel').add({
                layout: 'border',
                id: 'diff_panel_' + FileMD5,
                title: _('Diff'),
                closable: true,
                iconCls: 'iconTabLink',
                tabTip: tabTIP,
                border: false,
                defaults : {
                    split: true
                },
                items:[{
                    xtype: 'panel',
                    region:'center',
                    autoScroll: true,
                    html: '<div id="diff_content_' + FileMD5 + '" class="diff-content"></div>',
                    tbar: tBar
                },{
                    xtype: 'panel',
                    collapsed: ! PhDOE.user.conf.diff.displayPreviewPanel,
                    region:'south',
                    height: previewPanelHeight,
                    layout: 'fit',
                    items: [ new Ext.ux.IFrameComponent({ id: Ext.id(), url: previewUrl }) ]
                }]
            });

            // We need to activate HERE this tab, otherwise, we can't mask it (el() is not defined)
            Ext.getCmp('main-panel').setActiveTab('diff_panel_' + FileMD5);


            loadDataPatch = function()
            {
                Ext.get('diff_panel_' + FileMD5).mask('<img src="themes/img/loading.gif" ' +
                'style="vertical-align: middle;" />' +
                _('Please, wait...'));

                // Load diff data
                XHR({
                    params: {
                        task: 'getDiff',
                        DiffType: DiffType,
                        FilePath: FilePath,
                        FileName: FileName,
                        patchID: patchID,
                        optNbLine: optNbLine,
                        optB: optB,
                        optW: optW
                    },
                    success: function(r){
                        var o = Ext.util.JSON.decode(r.responseText),
                            patchPermLink='';

                        if( patchID == '' ) {
                            patchPermLink = '<a href="http://' + window.location.host + ':' +
                                    window.location.port + window.location.pathname +
                                    '?patch='+FilePath+FileName+'&project=' + PhDOE.project + '"><h2>' +
                                    _('Direct link to this patch')+' ; ' + _('File: ') + FilePath+FileName+'</h2></a>';
                        } else {
                            patchPermLink = '<a href="http://' + window.location.host + ':' +
                                    window.location.port + window.location.pathname +
                                    '?patchID='+patchID+'&project=' + PhDOE.project + '"><h2>' +
                                    _('Direct link to this patch')+' ; ' + _('Patch Name: ') + patchName+'</h2></a>';
                        }

                        // We add the perm link into the content
                        o.content = patchPermLink + o.content;

                        // We display in diff div
                        Ext.get('diff_content_' + FileMD5).dom.innerHTML = o.content;
                        Ext.get('diff_panel_' + FileMD5).unmask();
                    }
                });

            };
            loadDataPatch();

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
    width       : 450,
    height      : 260,
    minWidth    : 450,
    minHeight   : 300,
    layout      : 'fit',
    plain       : true,
    bodyStyle   : 'padding:5px;',
    buttonAlign : 'center',
    iconCls     : 'iconPatch',
    closeAction : 'hide',

    nodesToAdd  : false,
    patchName   : '',
    patchDescription   : '',
    patchEmail   : '',
    patchID     : false,

    initComponent : function()
    {
        Ext.apply(this, {

            buttons : [{
                text   : (this.patchID) ? _('Save') : _('Create'),
                handler: function()
                {
                    var win    = this.ownerCt.ownerCt,
                        values = win.findByType('form').shift().getForm().getValues();

                    XHR({
                        params  : {
                            task        : 'managePatch',
                            name        : values.name,
                            description : values.description,
                            email       : values.email,
                            patchID     : win.patchID
                        },
                        success : function(r)
                        {
                            var o = Ext.util.JSON.decode(r.responseText);

                            win.hide();

                            // If we want to modify the path name
                            if( win.patchID ) {
                                ui.cmp.PatchesTreeGrid.getInstance().modPatchName({
                                    newPatchName : values.name,
                                    newPatchDescription : values.description,
                                    newPatchEmail : values.email,
                                    patchID      : win.patchID
                                });
                            }

                            // If there is some node to Add, we call this.
                            if (win.nodesToAdd) {
                                    ui.task.MoveToPatch({
                                            patchID: o.patchID,
                                            patchName: values.name,
                                            patchDescription: values.description,
                                            patchEmail: values.email,
                                            nodesToAdd: win.nodesToAdd
                                    });
                            }

                            // We reload the patchList store
                            PhDOE.user.patchList.reload();
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
            items : [{
                xtype       : 'form',
                baseCls     : 'x-plain',
                labelWidth  : 110,
                defaultType : 'textfield',
                labelAlign  : 'top',
                items : [{
                    name       : 'name',
                    fieldLabel : _('Patch name'),
                    anchor     : '100%',
                    value      : this.patchName
                },{
                    name       : 'description',
                    xtype      : 'textarea',
                    fieldLabel : _('Patch description'),
                   tooltipText : _('This description will be the default during the validation of the patch by a valid user.'),
                    anchor     : '100%',
                    value      : this.patchDescription
                },{
                    name       : 'email',
                    fieldLabel : _('Email'),
                   tooltipText : _('If provided, an email will be send to you to inform that the patch is commited.'),
                    anchor     : '100%',
                    value      : this.patchEmail
                }]
            }]
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
                return "<span ext:qtip='" + String.format(_('File removed by {0}'), info.user) + "'>" + v + "</span>";
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
                        original       : true,
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
                text: String.format(_('Send an email to {0}'), "<b>" + this.node.attributes.task + "</b>"),
                iconCls: 'iconSendEmail',
                hidden: (this.node.attributes.task === PhDOE.user.login || !this.node.attributes.email),
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
                hidden: !(PhDOE.user.haveKarma && this.node.attributes.task == PhDOE.user.login)
            }, new ui.cmp._WorkTreeGrid.menu.commit({
                hidden: !(PhDOE.user.haveKarma && this.node.attributes.task == PhDOE.user.login),
                module: 'patches',
                from: 'user',
                node: false,
                folderNode: false,
                patchNode: false,
                userNode: this.node
            })]
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
        currentUser = node.parentNode.attributes.task,
        currentUserIsAnonymous = node.parentNode.attributes.isAnonymous,
        currentUserHaveKarma = node.parentNode.attributes.haveKarma;

        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder' && node.attributes.type !== 'patch' && node.attributes.type !== 'user') {
                allFiles.push(node);
            }
        }, this);


        Ext.apply(this, {
            items: [{
                text: _('Edit the description of this patch'),
                iconCls: 'iconPendingPatch',
                hidden: (currentUser !== PhDOE.user.login),
                handler: function(){
                    var win = new ui.cmp.ManagePatchPrompt({
                        title: _('Modify this patch description'),
                        patchName : node.attributes.task,
                        patchDescription : node.attributes.patchDescription,
                        patchEmail : node.attributes.patchEmail,
                        patchID   : node.attributes.idDB
                    });
                    win.show(this.el);
                }
            }, {
                text: _('Delete this patch'),
                iconCls: 'iconTrash',
                hidden: (currentUser !== PhDOE.user.login),
                handler: function() {
                    ui.task.DeletePatchTask({
                        patchID: node.attributes.idDB
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: !(currentUser == PhDOE.user.login)
            }, {
                text: _('Back all this patch to work in progress module'),
                iconCls: 'iconWorkInProgress',
                hidden: !(currentUser == PhDOE.user.login),
                disabled: Ext.isEmpty(allFiles),
                handler: function(){
                    ui.task.MoveToWork({
                        nodesToAdd: allFiles
                    });
                }
            }, {
                xtype: 'menuseparator'
            },{
                text: _('View unified diff'),
                iconCls: 'iconViewDiff',
                handler: function(){
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        patchID: node.attributes.idDB,
                        patchName: node.attributes.task
                    });
                }
            }, {
                text: _('Download the unified diff as a patch'),
                iconCls: 'iconDownloadDiff',
                handler: function(){
                    window.location.href = './do/downloadPatch' +
                    '?patchID=' +
                    node.attributes.idDB +
                    '&csrfToken=' +
                    csrfToken;
                }
            }, {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.haveKarma && (currentUser === PhDOE.user.login || !currentUserHaveKarma))
            },

            // Commit item only when this patch belong to an anonymous user or user without karma and the current user is a valid VCS user with karma

            new ui.cmp._WorkTreeGrid.menu.commit({
                hidden: !(PhDOE.user.haveKarma && (currentUser === PhDOE.user.login || !currentUserHaveKarma)),
                module: 'patches',
                from: currentUserIsAnonymous ? 'anonymousPatch' : 'patch',
                node: false,
                folderNode: false,
                patchNode: this.node,
                userNode: this.node.parentNode
            }),
            {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin)
            },
            new ui.cmp._WorkTreeGrid.menu.admin({
                hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin),
                from: 'patch',
                node: this.node
            })
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
                hidden: !PhDOE.user.haveKarma
            },
            new ui.cmp._WorkTreeGrid.menu.commit({
                hidden: !PhDOE.user.haveKarma,
                module: 'patches',
                from: 'folder',
                node: false,
                folderNode: this.node,
                patchNode: this.node.parentNode,
                userNode: this.node.parentNode.parentNode
            })
            ]
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
        var node = this.node,
            FileType = node.attributes.type,
            FileLang,
            FilePath = node.parentNode.attributes.task,
            FileName = node.attributes.task, treeGrid = node.ownerTree,
            FileID = node.attributes.idDB,
            allFiles = [],
            owner = this.node.parentNode.parentNode.parentNode.attributes.task,
            ownerHaveKarma = this.node.parentNode.parentNode.parentNode.attributes.haveKarma,
            tmp;

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
                handler: function(){
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FileName: FileName,
                        FilePath: FilePath,
                        currentOwner: owner,
                        fileIdDB: node.attributes.idDB
                    });
                }
            }, {
                text: _('Download the diff as a patch'),
                iconCls: 'iconDownloadDiff',
                handler: function(){
                    window.location.href = './do/downloadPatch' +
                    '?FilePath=' +
                    FilePath +
                    '&FileName=' +
                    FileName +
                    '&csrfToken=' +
                    csrfToken;
                }
            }, {
                xtype: 'menuseparator',
                hidden: !(owner == PhDOE.user.login)
            }, {
                text: ((FileType === 'delete') ? _('Cancel this deletion') : _('Clear this change')),
                hidden: !(owner == PhDOE.user.login),
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
                hidden: !(PhDOE.user.haveKarma && (owner === PhDOE.user.login || !ownerHaveKarma))
            },
                new ui.cmp._WorkTreeGrid.menu.commit({
                module: 'patches',
                hidden: !(PhDOE.user.haveKarma && (owner === PhDOE.user.login || !ownerHaveKarma)),
                from: 'file',
                node: this.node,
                folderNode: this.node.parentNode,
                patchNode: this.node.parentNode.parentNode,
                userNode: this.node.parentNode.parentNode.parentNode
            }), {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin)
            },
                new ui.cmp._WorkTreeGrid.menu.admin({
                    hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin),
                    fileLang: FileLang,
                    from: 'file',
                    node: this.node,
                    folderNode: this.node.parentNode,
                    userNode: this.node.parentNode.parentNode.parentNode
                })
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

    modPatchName: function(a)
    {
        var rootNode  = this.getRootNode(),
            patchNode = rootNode.findChild('idDB', a.patchID, true);

        patchNode.setText(a.newPatchName);
        patchNode.attributes.patchDescription = a.newPatchDescription;
        patchNode.attributes.patchEmail = a.newPatchEmail;
        patchNode.attributes.task = a.newPatchName;
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

                        if( data.type === 'user' ) {

                            if( data.userID ) {
                                data.qtip= _('userID: ') + data.userID;
                            }
                            return v;
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
                },
                listeners: {
                    beforeload: function() {
                        Ext.getCmp('acc-patches').setIconClass('iconLoading');

                    },
                    load: function() {
                        Ext.getCmp('acc-patches').setIconClass('iconPatch');
                    }
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

                        // We can't use === operator here. Sometimes, fid is a string, Sometimes, it's an integer ( see Bug #55316 )
                        if (file.attributes.idDB == fid) {

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

    addToPatch: function(PatchID, PatchName, nodesToAdd, PatchDescription, PatchEmail){
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
                patchDescription:PatchDescription,
                patchEmail:PatchEmail,
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
Ext.namespace('ui', 'ui.cmp', 'ui.cmp._PendingReviewGrid');

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
        var mess = '', infoLang, userToCompare;

        userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

        if (r.data.fileModified) {

            infoLang = Ext.util.JSON.decode(r.data.fileModified);

            if (infoLang.user === userToCompare && infoLang.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess += String.format(_('File {0} modified by me'), PhDOE.user.lang.ucFirst());
            }
            else {
                mess += String.format(_('File {0} modified by {1}'), PhDOE.user.lang.ucFirst(), infoLang.user);
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
    header: _('Reviewer'),
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
        if (r.data.fileModified) {

            var infoLang = Ext.util.JSON.decode(r.data.fileModified), userToCompare;

            userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

            return ((infoLang.user === userToCompare && infoLang.anonymousIdent === PhDOE.user.anonymousIdent)) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
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
                text: _('View diff'),
                iconCls: 'iconViewDiff',
                handler: function()
                {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FileName: this.fname,
                        FilePath: PhDOE.user.lang+this.fpath
                    });
                }
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
            hideDiffMenu: (storeRecord.data.fileModified === false),
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
                    original: true,
                    readOnly: true,
                    openInNewTabBtn: true,
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

            var info = Ext.util.JSON.decode(r.data.fileModified), userToCompare;

            userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

            return (info.user === userToCompare && info.anonymousIdent === PhDOE.user.anonymousIdent) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
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

            var info = Ext.util.JSON.decode(r.data.fileModified), userToCompare;

            userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

            if (info.user === userToCompare && info.anonymousIdent === PhDOE.user.anonymousIdent) {
                return "<span ext:qtip='" + _('File modified by me') + "'>" + v + "</span>";
            }
            else {
                return "<span ext:qtip='" + String.format(_('File modified by {0}'), info.user) + "'>" + v + "</span>";
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
        var storeRecord = this.store.getById(rowId), FilePath = storeRecord.data.path, FileName = storeRecord.data.name, FileID = Ext.util.md5('FNT-' + PhDOE.user.lang + FilePath + FileName), isSecondPanel;

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNT-' + FileID)) {

            if( PhDOE.user.conf.newFile.secondPanel == 'google' || PhDOE.user.conf.newFile.secondPanel == 'originalFile' ) {
                isSecondPanel = true;
            } else {
                isSecondPanel = false;
            }

            Ext.getCmp('main-panel').add({
                id: 'FNT-' + FileID,
                layout: 'border',
                title: FileName,
                originTitle: FileName,
                iconCls: 'iconTabNeedTranslate',
                closable: true,
                tabLoaded: false,
                panTRANSLoaded: false,
                panTRANSSecondLoaded: !isSecondPanel,
                defaults: {
                    split: true
                },
                tabTip: String.format(_('Need translate: in {0}'), FilePath),
                listeners: {
                    resize: function(panel){
                        if (PhDOE.user.conf.newFile.secondPanel == 'google') {
                            Ext.getCmp('FNT-GGTRANS-PANEL-' + FileID).setWidth(panel.getWidth() / 2);
                        }
                        if (PhDOE.user.conf.newFile.secondPanel == 'originalFile') {
                            Ext.getCmp('FNT-EN-PANEL-' + FileID).setWidth(panel.getWidth() / 2);
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
                    syncScrollCB: isSecondPanel,
                    syncScroll: isSecondPanel,
                    syncScrollConf: { module : 'newFile', itemName : 'syncScrollbars' }
                }), ((PhDOE.user.conf.newFile.secondPanel == 'google') ? new ui.cmp.FilePanel({
                    id: 'FNT-GGTRANS-PANEL-' + FileID,
                    // FNT-GGTRANS-PANEL-
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
                }) : false),
                ((PhDOE.user.conf.newFile.secondPanel == 'originalFile') ? new ui.cmp.FilePanel({
                    id: 'FNT-EN-PANEL-' + FileID,
                    region: 'east',
                    title: _('File: ') + 'en' + FilePath + FileName,
                    prefix: 'FNT',
                    ftype: 'EN',
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    original: true,
                    readOnly: true,
                    lang: 'en',
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

// Store : storeUsageInfo

ui.cmp._PortletInfo.storeUsage = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getUsageInfos'
    }),
    baseParams: {
        year: new Date().format('Y')
    },
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'month'},
            {name : 'nbConTotal', type:'int'},
            {name : 'nbCommitTotal', type:'int'}
        ]
    })
});

// PortletInfo cell renderer for type column
ui.cmp._PortletInfo.typeRenderer = function(value, md, record)
{
    var user, lang, nbFolders, nbFilesCreate, nbFilesDelete, nbFilesUpdate, nbFiles, img;

    switch (value) {

        // Update datas
        case 'updateData' :
            user = record.data.value.user;

            return String.format(
                    _('{0} updated app\'s data'),
                    user);

        break;
        case 'changeFilesOwner' :
            user = record.data.value.user;

            return String.format(
                    _('{0} changed file\'s owner'),
                    user);

        break;
        case 'checkEntities' :
            user = record.data.value.user;

            return String.format(
                    _('{0} check all entitites'),
                    user);

        break;

        case 'computeUsageStatistics' :
            return _('Usage statistics were calculated');
        break;

        // Login / logout
        case 'logout' :
            user = record.data.value.user;

            return String.format(
                    _('{0} logged out'),
                    user);

        break;
        case 'login' :
            user = record.data.value.user;
            lang = record.data.value.lang;
            authService = record.data.value.authService;
            img = '';

            if( authService == 'google' ) {
                img = '<img src="themes/img/auth_google.png" style="vertical-align: middle;"> ';
            } else if( authService == 'facebook' ) {
                img = '<img src="themes/img/auth_facebook.png" style="vertical-align: middle;"> ';
            } else if( authService == 'github' ) {
                img = '<img src="themes/img/auth_github.png" style="vertical-align: middle;"> ';
            } else if( authService == 'stackoverflow' ) {
                img = '<img src="themes/img/auth_stackoverflow.png" style="vertical-align: middle;"> ';
            } else if( authService == 'linkedin' ) {
                img = '<img src="themes/img/auth_linkedin.png" style="vertical-align: middle;"> ';
            } else if( authService == 'instagram' ) {
                img = '<img src="themes/img/auth_instagram.png" style="vertical-align: middle;"> ';
            } else if( authService == 'twitter' ) {
                img = '<img src="themes/img/auth_twitter.png" style="vertical-align: middle;"> ';
            }

            return img + String.format(
                    _('{0} is logged in using the {1} language'),
                    user,
                    lang.ucFirst());

        break;

        // Commit
        case 'commitFolders' :
            user      = record.data.value.user;
            lang      = record.data.value.lang;
            nbFolders = record.data.value.nbFolders;

            return String.format(
                    _('{0} committed {1} new folder(s) in the {2} language'),
                    user,
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
                    user,
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
    title            : _('General'),
    loadMask         : true,
    autoScroll       : true,
    autoHeight       : true,
    store            : ui.cmp._PortletInfo.store,
    columns          : ui.cmp._PortletInfo.gridColumns,
    listeners        : {
        afterrender: function(p) {
            p.ownerCt.setHeight(p.height + 60);
            p.ownerCt.doLayout();
        }
    },
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
    storeUsage: ui.cmp._PortletInfo.storeUsage,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletInfo.store.reload({
                callback: function() {
                    ui.cmp._PortletInfo.storeUsage.reload();
                }
            });
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

        this.Year = parseInt(new Date().format('Y'));

        this.buildButton = function(from)
        {
            var yearForward = (this.Year + 1), yearBackward = (this.Year - 1),
                btnForward = this.items.items[0].items.items[1].toolbars[0].items.items[2],
                btnBackward = this.items.items[0].items.items[1].toolbars[0].items.items[0],
                chart = this.items.items[0].items.items[1].items.items[0];

            // On passe à l'année suivante / précédente
            if( from == 'Backward' ) {
                ui.cmp._PortletInfo.storeUsage.setBaseParam('year', yearBackward);
                this.Year = yearBackward;
            } else if( from == 'Forward' ) {
                ui.cmp._PortletInfo.storeUsage.setBaseParam('year', yearForward);
                this.Year = yearForward;
            }

            ui.cmp._PortletInfo.storeUsage.load();

            btnForward.setText(this.Year+1);
            btnBackward.setText(this.Year-1);

            // Futur statistics don't exist !
            if( this.Year+1 > new Date().format('Y')) {
                btnForward.disable();
            } else {
                btnForward.enable();
            }

            // Statistics before 2010 don't exist !
            if( this.Year-1 < 2010 ) {
                btnBackward.disable();
            } else {
                btnBackward.enable();
            }

        };

        this.add({
            xtype:'tabpanel',
            border: false,
            activeTab: 0,
            tabPosition: 'bottom',
            autoScroll: true,
            height: 288,
            items: [
                new ui.cmp._PortletInfo.grid(),
                {
                    xtype:'panel',
                    border: false,
                    title: _('Usage information'),
                    tbar: [{
                        scope:this,
                        text: this.Year - 1,
                        iconCls: 'iconBackward',
                        handler: function() {
                            this.buildButton('Backward');
                        }
                    },'->',{
                        scope:this,
                        text: this.Year + 1,
                        iconCls: 'iconForward',
                        disabled: true,
                        iconAlign: 'right',
                        handler: function() {
                            this.buildButton('Forward');
                        }
                    }],
                    items:[{
                        scope:this,
                        xtype: 'columnchart',
                        url: 'js/ExtJs/resources/charts.swf',
                        store: ui.cmp._PortletInfo.storeUsage,
                        xField: 'month',
                        series: [{
                            type: 'column',
                            yField: 'nbCommitTotal',
                            style: {
                                mode: 'stretch',
                                color:0x99BBE8
                            }
                        },{
                            type:'line',
                            yField: 'nbConTotal',
                            style: {
                                color: 0x15428B
                            }
                        }],
                        chartStyle: {
                            padding: 5,
                            animationEnabled: true,
                            font: {
                                name: 'verdana',
                                color: 0x444444,
                                size: 11
                            },
                            dataTip: {
                                border: {
                                    color: 0x99bbe8,
                                    size:1
                                },
                                background: {
                                    color: 0xDAE7F6,
                                    alpha: .9
                                },
                                font: {
                                    name: 'verdana',
                                    size: 11,
                                    color: 0x15428B
                                }
                            },
                            xAxis: {
                                color: 0x69aBc8,
                                majorTicks: {color: 0x69aBc8, length: 4},
                                minorTicks: {color: 0x69aBc8, length: 2},
                                majorGridLines: {size: 1, color: 0xeeeeee}
                            },
                            yAxis: {
                                color: 0x69aBc8,
                                majorTicks: {color: 0x69aBc8, length: 4},
                                minorTicks: {color: 0x69aBc8, length: 2},
                                majorGridLines: {size: 1, color: 0xdfe8f6}
                            }
                        },
                        tipRenderer: function(chart, record, index, series) {

                            if (series.yField == 'nbConTotal') {
                                return _('Month:') + ' '+ Date.monthNames[record.data.month-1] + "\r" + _('Nb. connexion:') + ' ' + record.data.nbConTotal;
                            }

                            if (series.yField == 'nbCommitTotal') {
                                return _('Month:') + ' '+ Date.monthNames[record.data.month-1] + "\r" + _('Nb. commit:') + ' ' + record.data.nbCommitTotal;
                            }

                        }
                    }]
                }
            ]
        });
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
};
Ext.namespace('ui','ui.cmp','ui.cmp._PortletLocalMail');

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
        var countries = { cs: 'cz', sr: 'rs', sv: 'se' }; // copied from ui.cmp._BuildStatus.rendererLanguage

        this.header.insertFirst({
            tag   : 'div',
            id    : Ext.id(),
            style : 'float: left; margin-right: 2px;',
            cls   : 'flags flag-'+(countries[this.lang] || this.lang)
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
    url           : 'js/ExtJs/resources/charts.swf',
    dataField     : 'total',
    categoryField : 'libel',
    store         : ui.cmp._PortletTranslationGraph.store,
    series        :[{
        style : {
            colors : ["#68D888", "#FF6347", "#EEE8AA"]
        }
    }],
    chartStyle: {
        font: {
            name: 'verdana',
            color: 0x444444,
            size: 11
        },
        dataTip: {
            border: {
                color: 0x99bbe8,
                size:1
            },
            background: {
                color: 0xDAE7F6,
                alpha: .9
            },
            font: {
                name: 'verdana',
                size: 11,
                color: 0x15428B
            }
        }
    },
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
    url         : 'js/ExtJs/resources/charts.swf',
    xField      : 'libel',
    chartStyle: {
        padding: 5,
        animationEnabled: true,
        font: {
            name: 'verdana',
            color: 0x444444,
            size: 11
        },
        dataTip: {
            border: {
                color: 0x99bbe8,
                size:1
            },
            background: {
                color: 0xDAE7F6,
                alpha: .9
            },
            font: {
                name: 'verdana',
                size: 11,
                color: 0x15428B
            }
        }
    },
    tipRenderer : function(chart, record){
        return _('Lang:') + ' ' + _(record.data.fullLibel) + "\r" + _('Total:') + ' ' + record.data.total + ' ' + _('files')+ ' (' + record.data.percent + '%)';
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
};Ext.namespace('ui','ui.cmp','ui.cmp._PortletTranslator','ui.cmp._PortletReviewer');

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

    }),
    listeners: {
        load: function() {

            var NbLines = this.getCount(),
                linesHeight = NbLines*20;

            ui.cmp.PortletTranslator.getInstance().setHeight(linesHeight + 124);
            ui.cmp.PortletTranslator.getInstance().doLayout();


        }
    }
});
ui.cmp._PortletTranslator.store.setDefaultSort('nick', 'asc');

ui.cmp._PortletReviewer.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url: './do/getReviewerInfo'
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
            {name : 'reviewedUptodate', type : 'int'},
            {name : 'reviewedStale',    type : 'int'},
            {name : 'reviewedSum',      type : 'int' }
        ]

    })
});
ui.cmp._PortletReviewer.store.setDefaultSort('nick', 'asc');



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
ui.cmp._PortletReviewer.translatorSumRenderer = function(v)
{
    if (v) {
        v = (v === 0 || v > 1) ? v : 1;
        return String.format('('+_('{0} Reviewers')+')', v);
    } else {
        return _('No reviewer');
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
ui.cmp._PortletReviewer.uptodateRenderer = function(v)
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
ui.cmp._PortletReviewer.staleRenderer = function(v)
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
ui.cmp._PortletReviewer.sumRenderer = function(v)
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

ui.cmp._PortletReviewer.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id              : 'GridTransName',
        header          : _('Name'),
        sortable        : true,
        dataIndex       : 'name',
        summaryType     : 'count',
        summaryRenderer : ui.cmp._PortletReviewer.translatorSumRenderer
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
        header      : _('Reviewed'),
        width       : 60,
        sortable    : true,
        renderer    : ui.cmp._PortletReviewer.uptodateRenderer,
        dataIndex   : 'reviewedUptodate',
        summaryType : 'sum'
    }, {
        header      : _('Must be reviewed'),
        width       : 90,
        sortable    : true,
        renderer    : ui.cmp._PortletReviewer.staleRenderer,
        dataIndex   : 'reviewedStale',
        summaryType : 'sum'
    }, {
        header      : _('Sum'),
        width       : 50,
        sortable    : true,
        renderer    : ui.cmp._PortletReviewer.sumRenderer,
        dataIndex   : 'reviewedSum',
        summaryType : 'sum'
    }
];

//------------------------------------------------------------------------------
// PortletTranslator
ui.cmp._PortletTranslator.grid = Ext.extend(Ext.grid.GridPanel,
{
    title            : _('Translators'),
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
    listeners        : {
        afterrender: function(p) {
            p.ownerCt.setHeight(p.height + 200);
            p.ownerCt.doLayout();
        }
    },

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

ui.cmp._PortletReviewer.grid = Ext.extend(Ext.grid.GridPanel,
{
    title            : _('Reviewers'),
    loadMask         : true,
    autoScroll       : true,
    autoHeight       : true,
    plugins          : [new Ext.ux.grid.GridSummary()],
    store            : ui.cmp._PortletReviewer.store,
    columns          : ui.cmp._PortletReviewer.gridColumns,
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
        ui.cmp._PortletReviewer.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

//------------------------------------------------------------------------------
// PortletTranslator
ui.cmp.PortletTranslator = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Translators & Reviewer'),
    iconCls : 'iconTranslator',
    layout  : 'fit',
    storeTranslator : ui.cmp._PortletTranslator.store,
    storeReviewer : ui.cmp._PortletReviewer.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletTranslator.store.reload({
                callback: function()
                {
                    ui.cmp._PortletReviewer.store.reload();
                }
            });
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

        this.add({
            xtype:'tabpanel',
            activeTab: 0,
            border: false,
            height: 200,
            tabPosition: 'bottom',
            autoScroll: true,
            items: [
                new ui.cmp._PortletTranslator.grid({lang: this.lang}),
                new ui.cmp._PortletReviewer.grid({lang: this.lang})
            ]
        });
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
};Ext.namespace('ui','ui.cmp');

ui.cmp.PreviewFile = Ext.extend(Ext.Window,
{
    id         : 'winPreviewFile',
    layout     : 'fit',
    title      : _('Preview'),
    iconCls    : 'iconView',
    closable   : true,
    closeAction: 'close',
    maximized  : true,
    modal      : true,
    buttons : [{
        text    : _('Close'),
        handler : function()
        {
            this.ownerCt.ownerCt.close();
        }
    }],

    initComponent : function()
    {
        var win = this;

        ui.cmp.PreviewFile.superclass.initComponent.call(this);

        XHR({
            params  : {
                task : 'previewFile',
                path : this.path
            },
            success : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText), frame;

                // We add a random string to the URL to not display the file cache
                o.url = o.url + '?' + Math.random();

                frame = new Ext.ux.IFrameComponent({ id: 'frame-previewFile', url: o.url });

                win.add(
                    frame
                );
                win.show();

            },
            failure : function()
            {
            }
        });

    }
});Ext.namespace('ui', 'ui.cmp', 'ui.cmp._RepositoryTree');

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
                disabled: true,
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

                if (extension === 'gif' || extension === 'png' || extension === 'jpg') {
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
                        '&' +
                        'csrfToken=' +
                        csrfToken +
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

            var nbItems = ds.getCount(),
                nbItemsForCurrentUser = false;

            if( PhDOE.user.haveKarma )
            {
                ds.each(function(record) {

                    if( record.data.maintainer == PhDOE.user.login ) {
                        nbItemsForCurrentUser ++;
                    }

                }, this);

            }

            if( nbItemsForCurrentUser )
            {
                Ext.getDom('acc-need-update-nb').innerHTML = nbItems + ' - '+ String.format(_('{0} mine'), nbItemsForCurrentUser);
            } else {
                Ext.getDom('acc-need-update-nb').innerHTML = nbItems;
            }

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
        if ( r.data.fileModified ) {

            var infoLang = Ext.util.JSON.decode(r.data.fileModified), userToCompare;

            userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

            return ((infoLang.user === userToCompare && infoLang.anonymousIdent === PhDOE.user.anonymousIdent)) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
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

        var mess = '', infoLang, userToCompare;

        userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

        if (r.data.fileModified) {

            infoLang = Ext.util.JSON.decode(r.data.fileModified);

            if (infoLang.user === userToCompare && infoLang.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess += String.format(_('File {0} modified by me'), PhDOE.user.lang.ucFirst());
            }
            else {
                mess += String.format(_('File {0} modified by {1}'), PhDOE.user.lang.ucFirst(), infoLang.user);
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
                text: _('View diff'),
                iconCls: 'iconViewDiff',
                handler: function()
                {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FileName: this.fname,
                        FilePath: PhDOE.user.lang+this.fpath
                    });
                }
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
            hideDiffMenu: ( data.fileModified === false ),
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
        if (!Ext.getCmp('main-panel').findById('FNU-' + FileID))
        {
            if (PhDOE.user.conf.needUpdate.diffMethod === "using-viewvc") {
                diff = ui.cmp.ViewVCDiff;
            }
            else if (PhDOE.user.conf.needUpdate.diffMethod === "using-exec") {
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
                    original: true,
                    readOnly: true,
                    openInNewTabBtn: true,
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
            {name : 'date', type : 'date',dateFormat : 'Y/m/d H:i:s' },
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


ui.cmp._WorkTreeGrid.isNotSavedFile = function(config) {

    var needToBeSaved = false;

    Ext.each(Ext.getCmp('main-panel').items.items, function(tab) {

        if( tab.isModified === true )
        {
             needToBeSaved = true;

             Ext.MessageBox.show({
                title   : _('Warning'),
                icon    : Ext.MessageBox.INFO,
                buttons : Ext.MessageBox.OK,
                msg     : _('There is some file unsaved. Please, save it before start a commit.'),
                fn: function() {
                    Ext.getCmp('main-panel').setActiveTab(tab.id);
                }
             });

             return false;

        }

    }, this);

    if( ! needToBeSaved ) {
        config.commitWindow.show();
    }
};


// WorkTreeGrid : adminstrator items for the context menu
// config - { module, from, node, folderNode, userNode }

ui.cmp._WorkTreeGrid.menu.admin = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.admin.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.admin, Ext.menu.Item, {

    listeners: {
        afterrender: function(){
            ui.cmp._WorkTreeGrid.menu.usersPatch({
                menuID: 'AdminPatchesMenu'
            });
        }
    },

    init: function() {

        var allFiles = [], items;

        allFiles.push(this.node);

        switch(this.from) {
            case 'file' :
                items = [{
                    text: _('Submit all files for review in patch:'),
                    iconCls: 'iconPendingPatch',
                    handler: function(){
                        return false;
                    },
                    menu: new Ext.menu.Menu({
                        id: 'AdminPatchesMenu',
                        itemRendered: false,
                        nodesToAdd: allFiles
                    })
                },{
                    scope: this,
                    iconCls: 'iconSwitchLang',
                    text: _('Change file\'s owner'),
                    handler: function()
                    {
                        new ui.cmp.ChangeFileOwner({
                            fileIdDB: this.node.attributes.idDB,
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
            disabled: (!PhDOE.user.haveKarma),
            handler: function(){
                return false;
            },
            menu: new Ext.menu.Menu({
                items: [{
                    scope: this,
                    text: _('...this file'),
                    hidden: (this.from === 'user' || this.from === 'folder' || this.from === 'patch' || this.from === 'anonymousPatch'),
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

                        ui.cmp._WorkTreeGrid.isNotSavedFile({
                                commitWindow: new ui.cmp.CommitPrompt({
                                                    files: file
                                              })
                        });
                    }
                }, {
                    scope: this,
                    text: _('...all files from this folder'),
                    hidden: (this.from === 'user' || this.from === 'patch' || this.from === 'anonymousPatch'),
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

                        ui.cmp._WorkTreeGrid.isNotSavedFile({
                                commitWindow: new ui.cmp.CommitPrompt({
                                                    files: files
                                              })
                        });

                    }
                }, {
                    scope: this,
                    text: _('...all files from this patch'),
                    hidden: (this.module !== 'patches' || this.from === 'user'),
                    iconCls: 'iconCommitFileVcs',
                    handler: function(){
                        var files = [], defaultCommitMessage = '', patchID = false, anonymousName;

                        // We build the default commit message for a commit issue from an anonymous patch
                        if( this.from === 'anonymousPatch' )
                        {
                            anonymousName = this.patchNode.parentNode.attributes.task;

                            // We must remove # caracter from the automatic comment to avoid bug system problem.
                            // See this thread : http://news.php.net/php.doc/969384624

                            if( this.patchNode.parentNode.attributes.isAnonymous ) {
                                anonymousName = 'anonymous ' + this.patchNode.parentNode.attributes.userID;
                            }

                            defaultCommitMessage = this.patchNode.attributes.patchDescription + "\n\n-- \nProvided by " + anonymousName + ' ('+this.patchNode.attributes.patchEmail+')';

                            patchID = this.patchNode.attributes.idDB;

                        }

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

                        ui.cmp._WorkTreeGrid.isNotSavedFile({
                                commitWindow: new ui.cmp.CommitPrompt({
                                                    files: files,
                                                    defaultMessage: defaultCommitMessage,
                                                    patchID: patchID
                                              })
                        });

                    }
                }, {
                    scope: this,
                    text: _('...all files modified by me'),
                    hidden: (this.from === 'anonymousPatch'),
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

                        ui.cmp._WorkTreeGrid.isNotSavedFile({
                                commitWindow: new ui.cmp.CommitPrompt({
                                                    files: files
                                              })
                        });

                    }
                }]
            })
        });
    }
});

ui.cmp._WorkTreeGrid.menu.usersPatch = function(config){
    Ext.apply(this, config);

    var menu = Ext.getCmp(this.menuID), newItem, patchesList;

    // We remove all this menu
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
            hidden: !PhDOE.user.haveKarma
        },


        new ui.cmp._WorkTreeGrid.menu.commit({
            hidden: !PhDOE.user.haveKarma,
            from: 'user',
            node: false,
            folderNode: false,
            userNode: this.node
        })
        ] : [{
            scope: this,
            text: String.format(_('Send an email to {0}'), "<b>" + this.node.attributes.task + "</b>"),
            iconCls: 'iconSendEmail',
            hidden: !this.node.attributes.email,
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
                hidden: !PhDOE.user.haveKarma
            },
            new ui.cmp._WorkTreeGrid.menu.commit({
                hidden: !PhDOE.user.haveKarma,
                from: 'folder',
                node: false,
                folderNode: this.node,
                userNode: this.node.parentNode
            })]
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
            ui.cmp._WorkTreeGrid.menu.usersPatch({
                menuID: 'filePatchesMenu'
            });
        }
    },

    init: function(){
        var node = this.node,
            FileType = node.attributes.type,
            FileLang,
            FilePath = node.parentNode.attributes.task,
            FileName = node.attributes.task,
            treeGrid = node.ownerTree,
            owner = node.parentNode.parentNode.attributes.task,
            allFiles = [],
            tmp;

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
                hidden: !(owner === PhDOE.user.login || !PhDOE.user.isAnonymous ),
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
                handler: function()
                {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FileName: FileName,
                        FilePath: FilePath,
                        currentOwner: owner,
                        fileIdDB: node.attributes.idDB
                    });
                }
            }, {
                text: _('Download the diff as a patch'),
                iconCls: 'iconDownloadDiff',
                handler: function(){
                    window.location.href = './do/downloadPatch' +
                    '?FilePath=' +
                    FilePath +
                    '&FileName=' +
                    FileName +
                    '&csrfToken=' +
                    csrfToken;
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
                hidden: !(PhDOE.user.haveKarma && owner === PhDOE.user.login)
            }, new ui.cmp._WorkTreeGrid.menu.commit({
                from: 'file',
                hidden: !(PhDOE.user.haveKarma && owner === PhDOE.user.login),
                node: this.node,
                folderNode: this.node.parentNode,
                userNode: this.node.parentNode.parentNode
            }),
            {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin)
            },
                new ui.cmp._WorkTreeGrid.menu.admin({
                    fileLang: FileLang,
                    from: 'file',
                    hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin),
                    node: this.node,
                    folderNode: this.node.parentNode,
                    userNode: this.node.parentNode.parentNode
                })
            ]
        });
    }
});

//------------------------------------------------------------------------------
// WorkTreeGrid
ui.cmp.WorkTreeGrid = Ext.extend(Ext.ux.tree.TreeGrid, {
    onContextMenu: function(node, e){
        e.stopEvent();
        var selectedNodes, NBselectedNodes, type, contextMenu;

        selectedNodes = this.getSelectionModel().getSelectedNodes();
        NBselectedNodes = selectedNodes.length;

        // We clean up the multi-selection and keep only files own by the current user
        if( NBselectedNodes > 1 ) {

            for( var i=0; i < NBselectedNodes; i++ ) {

                if( selectedNodes[i].attributes.type == 'folder' || selectedNodes[i].attributes.type == 'user') {
                    selectedNodes[i].unselect(true);
                }

                if( selectedNodes[i].attributes.type != 'folder' && selectedNodes[i].attributes.type != 'user') {

                    var fileOwner = selectedNodes[i].parentNode.parentNode.attributes.task;

                    if( fileOwner != PhDOE.user.login ) {
                        selectedNodes[i].unselect(true);
                    }
                }
            }
            selectedNodes = this.getSelectionModel().getSelectedNodes();
            NBselectedNodes = selectedNodes.length;
        }

        // Now we have only owns files selected
        if( NBselectedNodes > 1 ) {

            contextMenu = new Ext.menu.Menu({

                listeners: {
                    show: function() {
                        ui.cmp._WorkTreeGrid.menu.usersPatch({
                            menuID: 'globalPatchesMenu'
                        });
                    }
                },
                items: [{
                    text: _('Submit all this files for review in patch:'),
                    iconCls: 'iconPendingPatch',
                    handler: function(){
                        return false;
                    },
                    menu: new Ext.menu.Menu({
                        id: 'globalPatchesMenu',
                        itemRendered: false,
                        nodesToAdd: selectedNodes
                    })
                }]
            });
            contextMenu.showAt(e.getXY());

            return;
        }

        type = node.attributes.type;

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
                    formatUserName: function(v, data)
                    {
                        if( data.userID ) {
                            data.qtip= _('userID: ') + data.userID;
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
                },
                listeners: {
                    beforeload: function() {
                        Ext.getCmp('acc-work-in-progress').setIconClass('iconLoading');

                    },
                    load: function() {
                        Ext.getCmp('acc-work-in-progress').setIconClass('iconWorkInProgress');
                    }
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

                    // We can't use === operator here. Sometimes, fid is a string, Sometimes, it's an integer ( see Bug #55316 )
                    if (file.attributes.idDB == fid) {

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
            userID: null,
            login: null,
            anonymousIdent: null,
            isAnonymous: null,
            haveKarma: false,
            authService: null,
            authServiceID: null,
            isGlobalAdmin: false,
            isLangAdmin: false,
            lang: null,
            conf: '',
            email: '',
            patchList: new Ext.data.Store({
                proxy : new Ext.data.HttpProxy({
                    url : './do/getPatchList'
                }),
                sortInfo: {
                    field: 'name',
                    direction: 'ASC'
                },
                reader : new Ext.data.JsonReader({
                    root          : 'Items',
                    totalProperty : 'nbItems',
                    idProperty    : 'id',
                    fields        : [
                        {name : 'id'},
                        {name : 'name'},
                        {name : 'description'},
                        {name : 'email'},
                        {name : 'date', type : 'date', dateFormat : 'Y-m-d H:i:s' }
                    ]
                })
            })
        },

        updateDataProgress: false,

        topic : {
            global: {
                author: '',
                content: '',
                topicDate: ''
            },
            lang: {
                author: '',
                content: '',
                topicDate: ''
            }
        },


        /**
         * Hold application's variable such as name, version or configuration
         */
        app: {
            name: 'Php Docbook Online Editor',
            ver : 'X.XX',
            loaded: false,
            uiRevision: '$Revision$',
            conf: '',
            extJsVersion: '3.3.1',
            codeMirror: '2.21'
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

            // Set up automatic CSRF token appending for most requests
            Ext.Ajax.extraParams = { csrfToken: csrfToken };
            Ext.data.Connection.prototype.extraParams = { csrfToken: csrfToken };
            Ext.data.ScriptTagProxy.prototype.extraParams = { csrfToken: csrfToken };
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
                    mess  = _('File system error. Check read/write permissions under data folder.');
                    break;
                case 'encoding_error' :
                    title = _('Error');
                    mess  = _('You have used characters that require the use of UTF-8 despite the XML header.<br>Please delete these characters or change the header of the XML file to UTF-8 ; i.e.:<br><br><center><i>&lt;?xml version="1.0" encoding="utf-8"?&gt;</i></center>');
                    break;
                case 'tabs_found' :
                    title = _('Error');
                    mess  = _('It seems that you have inserted tab caracters into this file. Please, replace each one by a single space.<br>Tip: You can use the "Re-indent this entire file" button to replace all tabs by spaces.');
                    break;
                case 'folder_already_exist' :
                    title = _('Error');
                    mess  = _('This folder already exists in the current folder.');
                    break;
                case 'file_already_exist' :
                    title = _('Error');
                    mess  = _('This file already exists in the current folder.');
                    break;
                case 'save_you_cant_modify_it' :
                    title = _('Error');
                    mess  = _('You aren\'t allowed to modify this file as it has already been modified by different user. Contact an administrator if you want to be able to modify it.');
                    break;
                case 'file_isnt_owned_by_current_user' :
                    title = _('Error');
                    mess  = _('The file for which you want to clear local changes isn\'t owned by you.<br>You can only perform this action on your own files.');
                    break;
                case 'file_localchange_didnt_exist' :
                    title = _('Error');
                    mess  = _('The file you want to clear local changes in doesn\'t exist as a work in progress.');
                    break;
                case 'changeFilesOwnerNotAdmin' :
                    title = _('Error');
                    mess  = _('You aren\'t allowed to change this file\'s owner. You must be a global administrator or an administrator for this language to be able to do that.');
                    break;
                case 'patch_delete_dont_exist' :
                    title = _('Error');
                    mess  = _('The patch you want to delete doesn\'t exist.');
                    break;
                case 'patch_delete_isnt_own_by_current_user' :
                    title = _('Error');
                    mess  = _('The patch you want to delete isn\'t owned by you. Only the author of the patch or a global administrator can delete it.');
                    break;
                case 'action_only_global_admin' :
                    title = _('Error');
                    mess  = _('This action is available to global administrators only.');
                    break;
                case 'action_only_admin' :
                    title = _('Error');
                    mess  = _('This action is available to global administrators or to administrators for this language only.');
                    break;

            }

            Ext.MessageBox.alert(
                title,
                mess
            );
        },

        runDirectAccess: function()
        {
            if ( directAccess.link ) {
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
                if( directAccess.link == 'patchID' ) {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        patchID: directAccess.patchID,
                        patchName: directAccess.patchName
                    });
                }
            }

            if( directAccess.action )
            {
                Ext.getCmp('main-panel').openDirectAction({
                    action: directAccess.action,
                    idDB: directAccess.idDB
                });
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

            // We set the Topic
            PhDOE.setTopic();
            PhDOE.setTopic(true);
        },

        loadAllStore : function()
        {
            var progressBar = new Ext.ProgressBar({
                    width:300,
                    renderTo:'loading-progressBar'
                }),
                items = [],
                cascadeCallback;

            // Store to load for LANG project
            if (PhDOE.user.lang !== 'en') {
                // We load all stores, one after the others
                items = [
                    ui.cmp._MainMenu.store,
                    ui.cmp.StaleFileGrid.getInstance().store,
                    ui.cmp.ErrorFileGrid.getInstance().store,
                    ui.cmp.PendingReviewGrid.getInstance().store,
                    ui.cmp.NotInENGrid.getInstance().store,
                    ui.cmp.PortletSummary.getInstance().store,
                    ui.cmp.PortletTranslationGraph.getInstance().store,
                    ui.cmp.PortletTranslationsGraph.getInstance().store,
                    ui.cmp.PortletTranslator.getInstance().storeTranslator,
                    ui.cmp.PortletTranslator.getInstance().storeReviewer,
                    ui.cmp.PendingTranslateGrid.getInstance().store,
                    ui.cmp.PortletInfo.getInstance().store,
                    ui.cmp.PortletInfo.getInstance().storeUsage,
                    PhDOE.user.patchList
                ];
            } else {
                // Store to load only for EN project
                items = [
                    ui.cmp._MainMenu.store,
                    ui.cmp.PortletTranslationsGraph.getInstance().store,
                    ui.cmp.ErrorFileGrid.getInstance().store,
                    ui.cmp.PortletInfo.getInstance().store,
                    ui.cmp.PortletInfo.getInstance().storeUsage,
                    PhDOE.user.patchList
                ];


            }

            // after i iteration call i+1 iteration, while i < items.length
            cascadeCallback = function(i) {
                progressBar.updateProgress((i+1)/items.length, (i+1) + ' of ' + items.length + '...');
                items[i].load({
                    callback: function() {
                        i++;
                        if (i < items.length) {
                            cascadeCallback(i);
                        } else {
                            // Now, we can to remove the global mask
                            Ext.get('loading').remove();
                            Ext.fly('loading-mask').fadeOut({ remove : true });
                            progressBar.destroy();
                            PhDOE.afterLoadAllStore();
                        }
                    }
                });
            }

            progressBar.show();
            document.getElementById("loading-msg").innerHTML = "Loading data...";
            cascadeCallback(0);

        },

        reloadAllStore: function() {

            var items = [], cascadeCallback;

            // Store to reload for LANG project
            // NOTE: For items differ from Ext.data.GroupingStore.Ext.extend.constructor and Ext.tree.AsyncTreeNode should
            // change condition in cascadeCallback, if reload method require differing parameters
            if (PhDOE.user.lang !== 'en') {
                // We reload all stores, one after the others
                items = [
                    ui.cmp.PendingTranslateGrid.getInstance().store,
                    ui.cmp.StaleFileGrid.getInstance().store,
                    ui.cmp.ErrorFileGrid.getInstance().store,
                    ui.cmp.PendingReviewGrid.getInstance().store,
                    ui.cmp.NotInENGrid.getInstance().store,
                    ui.cmp.WorkTreeGrid.getInstance().getRootNode(),
                    ui.cmp.PatchesTreeGrid.getInstance().getRootNode(),
                    ui.cmp.PortletSummary.getInstance().store,
                    ui.cmp.PortletTranslator.getInstance().storeTranslator,
                    ui.cmp.PortletTranslator.getInstance().storeReviewer,
                    ui.cmp.PortletTranslationGraph.getInstance().store,
                    ui.cmp.PortletTranslationsGraph.getInstance().store,
                    ui.cmp.PortletInfo.getInstance().store
                ];
            } else {
                // Store to reload only for EN project
                items = [
                    ui.cmp.WorkTreeGrid.getInstance().getRootNode(),
                    ui.cmp.PatchesTreeGrid.getInstance().getRootNode(),
                    ui.cmp.PortletInfo.getInstance().store
                ];
            }



            // after i iteration call i+1 iteration, while i < items.length
            cascadeCallback = function(i) {
                // accessorial callback
                var cascadeSubCallback = function() {
                    i++;
                    if (i < items.length) {
                        cascadeCallback(i);
                    }
                };

                items[i].reload(
                    items[i] instanceof Ext.tree.AsyncTreeNode
                        ? cascadeSubCallback                // Ext.tree.AsyncTreeNode
                        : {callback: cascadeSubCallback}   // Ext.data.GroupingStore.Ext.extend.constructor
                );
            }

            cascadeCallback(0);

        },

        saveTopic: function(content, isLang) {
            ui.task.setTopicTask({
                content: content,
                isLang: isLang
            });
        },

        setTopic: function(isLang) {
            var topic = PhDOE.topic[isLang ? 'lang' : 'global'];
            Ext.get('topic-info-content' + (isLang ? '-lang' : '')).dom.innerHTML = topic.content;
            Ext.get('topic-info-user' + (isLang ? '-lang' : '')).dom.innerHTML = String.format(_('Defined by {0}, {1}'), topic.author,topic.topicDate);

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
                        title     : _('Work in progress') + ' (<em id="acc-work-in-progress-nb" qtip="'+_('Total number of your files')+'">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconWorkInProgress',
                        items     : [ ui.cmp.WorkTreeGrid.getInstance() ],
                        collapsed : true,
                        tools     : [{
                            id      : 'refresh',
                            qtip    : _('Refresh'),
                            handler : function() {
                                ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload();
                            }

                        }]
                    }, {
                        id        : 'acc-patches',
                        tools     : [{
                            id      : 'refresh',
                            qtip    : _('Refresh'),
                            handler : function() {
                                ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload();
                            }

                        },{
                            id      : 'gear',
                            hidden  : PhDOE.user.haveKarma,
                            qtip    : _('Open the Log Message Manager'),
                            handler : function() {
                                if( ! Ext.getCmp('commit-log-win') )
                                {
                                    var win = new ui.cmp.CommitLogManager();
                                }
                                Ext.getCmp('commit-log-win').show('acc-patches');
                            }
                        }],
                        title     : _('Patches for review') + ' (<em id="acc-patches-nb" qtip="'+_('Total number of your files')+'">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconPatch',
                        items     : [ ui.cmp.PatchesTreeGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-bing-translate',
                        title     : _('Bing translation'),
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconBing',
                        hidden    : (PhDOE.user.lang === 'en'),
                        items     : [ new ui.cmp.BingTranslationPanel() ],
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
                            xtype  : 'container',
                            layout: 'column',
                            border : false,
                            items: [{
                                xtype:'container',
                                columnWidth: .5,
                                html   : '<div class="topic-connected"><div class="x-box-tl"><div class="x-box-tr"><div class="x-box-tc"></div></div></div><div class="x-box-ml"><div class="x-box-mr"><div class="x-box-mc">' +
                                        '<h3>'+
                                        _('Connected as')+
                                        ' <em id="loginLibel"></em>' +
                                            ', ' + _('Project: ') + '<em id="Info-Project">' + PhDOE.project + '</em>, '+_('Language: ')+' <em id="Info-Language">-</em>'+
                                        '</h3>' +
                                     '</div></div></div><div class="x-box-bl"><div class="x-box-br"><div class="x-box-bc"></div></div></div></div><div class="x-box-like"><g:plusone size="medium" width="20"></g:plusone><br/><div class="fb-like" data-send="false" data-layout="button_count" data-width="40" data-show-faces="false"></div></div>',
                                 listeners: {
                                    afterrender: function(cmp) {

                                        var ttContent='', libelContent='', loginLibelEl, content;

                                        // Build libel content
                                        loginLibelEl = Ext.get('loginLibel');

                                        if( PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin ) {
                                            loginLibelEl.addClass('userAdmin');
                                            libelContent = '<img src="themes/img/icon_php.png" style="vertical-align:middle"> '+PhDOE.user.login;
                                        } else if( PhDOE.user.authService == 'VCS' ) {
                                            libelContent = '<img src="themes/img/icon_php.png" style="vertical-align:middle"> '+PhDOE.user.login;
                                        } else if( PhDOE.user.authService == 'google' ) {
                                            libelContent = '<img src="themes/img/auth_google.png" style="vertical-align:middle"> '+PhDOE.user.login;
                                        } else if( PhDOE.user.authService == 'facebook' ) {
                                            libelContent = '<img src="themes/img/auth_facebook.png" style="vertical-align:middle"> '+PhDOE.user.login;
                                        }
                                        else if( PhDOE.user.authService == 'github' ) {
                                            libelContent = '<img src="themes/img/auth_github.png" style="vertical-align:middle"> '+PhDOE.user.login;
                                        } else if( PhDOE.user.authService == 'stackoverflow' ) {
                                            libelContent = '<img src="themes/img/auth_stackoverflow.png" style="vertical-align:middle"> '+PhDOE.user.login;
                                        } else if( PhDOE.user.authService == 'linkedin' ) {
                                            libelContent = '<img src="themes/img/auth_linkedin.png" style="vertical-align:middle"> '+PhDOE.user.login;
                                        } else if( PhDOE.user.authService == 'instagram' ) {
                                            libelContent = '<img src="themes/img/auth_instagram.png" style="vertical-align:middle"> '+PhDOE.user.login;
                                        } else if( PhDOE.user.authService == 'twitter' ) {
                                            libelContent = '<img src="themes/img/auth_twitter.png" style="vertical-align:middle"> '+PhDOE.user.login;
                                        }
                                        loginLibelEl.dom.innerHTML = libelContent;

                                        // Build tooltip content

                                        content = _('Connected using') +' '+ PhDOE.user.authService + '<br>';

                                        content += (PhDOE.user.isGlobalAdmin) ? _('You are a global Administrator')+'<br>' : '';
                                        content += (PhDOE.user.isLangAdmin) ? _('You are an administrator for this language')+'<br>' : '';

                                        new Ext.ToolTip({
                                            target: 'loginLibel',
                                            anchor: 'top',
                                            html: content
                                        });
                                    }
                                 }
                            },{
                                xtype:'container',
                                columnWidth: .5,
                                html   : '<div class="topic-info"><div class="x-box-tl"><div class="x-box-tr"><div class="x-box-tc"></div></div></div><div class="x-box-ml"><div class="x-box-mr"><div class="x-box-mc">' +
                                            '<div id="topic-info-container">' +
                                                '<h3>'+_('Topic:')+'</h3>' +
                                                '<p id="topic-info-content">-</p>' +
                                                '<div id="topic-info-user">-</div>' +
                                            '</div>' +
                                            '<div id="topic-info-container-lang">' +
                                                '<h3><em id="Topic-Language">-</em></h3>' +
                                                '<p id="topic-info-content-lang">-</p>' +
                                                '<div id="topic-info-user-lang">-</div>' +
                                            '</div>' +
                                        '</div></div></div><div class="x-box-bl"><div class="x-box-br"><div class="x-box-bc"></div></div></div></div>',
                                listeners: {
                                    afterrender: function(c) {
                                        // Don't allow modify the topic without karma
                                        if( !PhDOE.user.haveKarma ) {
                                            return;
                                        }

                                        var editTopic = function(isLang) {

                                            var contentElName = 'topic-info-content' + (isLang ? '-lang' : ''),
                                                topicContent = Ext.get(contentElName).dom.innerHTML;

                                            Ext.get(contentElName).dom.innerHTML = '';

                                            new Ext.FormPanel({
                                                renderTo: contentElName,
                                                layout:'anchor',
                                                border: false,
                                                items:[{
                                                    xtype:'htmleditor',
                                                    value:topicContent,
                                                    anchor: '100%'
                                                }],
                                                buttonAlign:'center',
                                                buttons:[{
                                                    text:_('Save'),
                                                    handler: function() {
                                                        PhDOE.saveTopic(this.ownerCt.ownerCt.items.items[0].getValue(), isLang);
                                                    }
                                                },{
                                                    text:_('Cancel'),
                                                    handler: function() {
                                                        PhDOE.setTopic(isLang);
                                                    }
                                                }]
                                            });
                                        };

                                        Ext.get('topic-info-container').on('dblclick', function() {
                                            editTopic();
                                        });
                                        Ext.get('topic-info-container-lang').on('dblclick', function() {
                                            editTopic(true);
                                        });
                                    }
                                }
                            }]


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
                                        itemName  : (PhDOE.user.lang === 'en') ? 'portalSortEN' : 'portalSortLANG',
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

            // Call Js for Facebook-like button
            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/en_US/all.js#xfbml=1&appId=128417830579090";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));


            window.___gcfg = {
                lang: 'en-US',
                size: 'medium',
                annotation: 'bubble'
            };

            (function() {
                var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
                po.src = 'https://apis.google.com/js/plusone.js';
                var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
            })();

            // Load all store & remove the mask after all store are loaded
            this.loadAllStore();

        } // drawInterface
    }; // Return
}();

Ext.EventManager.onDocumentReady(PhDOE.init, PhDOE, true);
