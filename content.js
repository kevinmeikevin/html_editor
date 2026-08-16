/**
 * HTML Editor - Content Script
 * 提供文字编辑和布局拖拽修改功能
 */
(() => {
  'use strict';

  // ==================== State ====================
  const state = {
    editing: false,
    selectedEl: null,
    textEditing: false,
    potentialDrag: false,
    isDragging: false,
    isResizing: false,
    resizeHandle: null,
    dragData: null,
    resizeData: null,
    history: [],
    historyIndex: -1,
    maxHistory: 80,
    initialized: false,
    collapsed: false,
    ballDragging: false,
    ballDragData: null,
  };

  // ==================== DOM References ====================
  let toolbar = null;
  let btnEdit = null;
  let btnSave = null;
  let btnUndo = null;
  let btnDelete = null;
  let statusDot = null;
  let selectionBox = null;
  let handles = {};
  let hint = null;
  let toast = null;
  let floatBall = null;
  let toastTimer = null;

  // ==================== Utility ====================
  function isEditorElement(el) {
    return el && el.closest && el.closest('[data-he]');
  }

  function isEditableElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (isEditorElement(el)) return false;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'HEAD' || tag === 'META' || tag === 'LINK') return false;
    if (el === document.body || el === document.documentElement) return false;
    return true;
  }

  function showToast(msg, isError) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = isError ? 'he-show he-error' : 'he-show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = '';
    }, 2500);
  }

  // ==================== Toolbar ====================
  function createToolbar() {
    if (toolbar) toolbar.remove();

    toolbar = document.createElement('div');
    toolbar.id = 'he-toolbar';
    toolbar.setAttribute('data-he', 'toolbar');

    // Title with status dot
    const title = document.createElement('span');
    title.className = 'he-title';
    title.innerHTML = '<span class="he-dot" id="he-status-dot"></span>HTML编辑器';
    toolbar.appendChild(title);

    const div1 = document.createElement('span');
    div1.className = 'he-divider';
    toolbar.appendChild(div1);

    // Edit toggle button
    btnEdit = document.createElement('button');
    btnEdit.className = 'he-btn';
    btnEdit.textContent = '开始编辑';
    btnEdit.addEventListener('click', toggleEdit);
    toolbar.appendChild(btnEdit);

    // Undo button
    btnUndo = document.createElement('button');
    btnUndo.className = 'he-btn he-btn-warning';
    btnUndo.textContent = '撤销';
    btnUndo.disabled = true;
    btnUndo.addEventListener('click', undo);
    toolbar.appendChild(btnUndo);

    // Delete button
    btnDelete = document.createElement('button');
    btnDelete.className = 'he-btn he-btn-danger';
    btnDelete.textContent = '删除元素';
    btnDelete.disabled = true;
    btnDelete.addEventListener('click', deleteSelectedElement);
    toolbar.appendChild(btnDelete);

    const div2 = document.createElement('span');
    div2.className = 'he-divider';
    toolbar.appendChild(div2);

    // Save button
    btnSave = document.createElement('button');
    btnSave.className = 'he-btn he-btn-success';
    btnSave.textContent = '保存文件';
    btnSave.addEventListener('click', save);
    toolbar.appendChild(btnSave);

    // Minimize button (collapse to floating ball)
    const btnMinimize = document.createElement('button');
    btnMinimize.className = 'he-btn he-btn-minimize';
    btnMinimize.textContent = '收起';
    btnMinimize.title = '收起为悬浮球';
    btnMinimize.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      collapseToolbar();
    });
    toolbar.appendChild(btnMinimize);

    // Close button (exit edit mode & collapse to floating ball)
    const btnClose = document.createElement('button');
    btnClose.className = 'he-btn he-btn-close';
    btnClose.textContent = '退出';
    btnClose.title = '退出编辑模式';
    btnClose.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitEditMode();
    });
    toolbar.appendChild(btnClose);

    document.body.appendChild(toolbar);

    statusDot = document.getElementById('he-status-dot');
  }

  // ==================== Floating Ball ====================
  function createFloatBall() {
    if (floatBall) floatBall.remove();

    floatBall = document.createElement('div');
    floatBall.id = 'he-float-ball';
    floatBall.setAttribute('data-he', 'floatball');
    floatBall.style.display = 'none'; // Hidden initially, shown when toolbar is collapsed

    const icon = document.createElement('span');
    icon.className = 'he-ball-icon';
    icon.innerHTML = '&lt;/&gt;';
    floatBall.appendChild(icon);

    const dot = document.createElement('span');
    dot.className = 'he-ball-dot';
    floatBall.appendChild(dot);

    floatBall.addEventListener('mousedown', onBallMouseDown);

    document.body.appendChild(floatBall);
  }

  function collapseToolbar() {
    state.collapsed = true;
    if (toolbar) toolbar.style.display = 'none';
    if (hint) hint.style.display = 'none';
    if (floatBall) {
      floatBall.style.display = 'flex';
      updateFloatBallUI();
    }
  }

  function expandToolbar() {
    state.collapsed = false;
    if (floatBall) floatBall.style.display = 'none';
    if (toolbar) toolbar.style.display = '';
    updateToolbarUI();
  }

  function updateFloatBallUI() {
    if (!floatBall) return;
    const dot = floatBall.querySelector('.he-ball-dot');
    if (!dot) return;
    if (state.editing) {
      dot.classList.add('he-on');
    } else {
      dot.classList.remove('he-on');
    }
  }

  function onBallMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    const rect = floatBall.getBoundingClientRect();
    state.ballDragData = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: rect.left,
      startY: rect.top,
      moved: false,
    };
    state.ballDragging = true;
    floatBall.classList.add('he-ball-dragging');
  }

  function onBallDrag(e) {
    if (!state.ballDragData) return;
    const d = state.ballDragData;
    const dx = e.clientX - d.startMouseX;
    const dy = e.clientY - d.startMouseY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      d.moved = true;
    }
    if (d.moved) {
      const ballSize = 48;
      let newLeft = d.startX + dx;
      let newTop = d.startY + dy;
      newLeft = Math.max(0, Math.min(window.innerWidth - ballSize, newLeft));
      newTop = Math.max(0, Math.min(window.innerHeight - ballSize, newTop));
      floatBall.style.left = newLeft + 'px';
      floatBall.style.top = newTop + 'px';
      floatBall.style.right = 'auto';
      floatBall.style.bottom = 'auto';
    }
  }

  function endBallDrag() {
    floatBall.classList.remove('he-ball-dragging');
    const wasMoved = state.ballDragData && state.ballDragData.moved;
    state.ballDragging = false;
    state.ballDragData = null;
    // If didn't move (just clicked), expand toolbar
    if (!wasMoved) {
      expandToolbar();
    }
  }

  function exitEditMode() {
    if (state.textEditing) endTextEditing();
    deselectElement();
    if (state.editing) {
      state.editing = false;
      document.body.classList.remove('he-editing');
      document.querySelectorAll('.he-selectable').forEach(el => el.classList.remove('he-selectable'));
      document.querySelectorAll('.he-grabable').forEach(el => el.classList.remove('he-grabable'));
      if (hint) hint.style.display = 'none';
    }
    // Collapse toolbar into floating ball
    collapseToolbar();
    updateToolbarUI();
  }

  function updateToolbarUI() {
    if (!btnEdit || !statusDot) return;
    if (state.editing) {
      btnEdit.textContent = '停止编辑';
      btnEdit.classList.add('he-active');
      statusDot.classList.add('he-on');
      if (hint) hint.style.display = state.collapsed ? 'none' : 'flex';
    } else {
      btnEdit.textContent = '开始编辑';
      btnEdit.classList.remove('he-active');
      statusDot.classList.remove('he-on');
      if (hint) hint.style.display = 'none';
    }
    btnUndo.disabled = state.historyIndex <= 0;
    btnDelete.disabled = !state.selectedEl;
    updateFloatBallUI();
  }

  // ==================== Selection Box & Handles ====================
  function createSelectionBox() {
    if (selectionBox) selectionBox.remove();

    selectionBox = document.createElement('div');
    selectionBox.id = 'he-selection';
    selectionBox.className = 'he-hidden';
    selectionBox.setAttribute('data-he', 'selection');

    // Drag label at top of selection box
    const label = document.createElement('div');
    label.className = 'he-drag-label';
    label.textContent = '拖拽移动 · 双击编辑';
    selectionBox.appendChild(label);

    const handleTypes = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    handles = {};
    handleTypes.forEach(type => {
      const h = document.createElement('div');
      h.className = `he-handle he-${type}`;
      h.setAttribute('data-he', 'handle');
      h.setAttribute('data-handle', type);
      selectionBox.appendChild(h);
      handles[type] = h;
    });

    document.body.appendChild(selectionBox);
  }

  function selectElement(el) {
    if (state.selectedEl) {
      state.selectedEl.classList.remove('he-grabable');
    }
    state.selectedEl = el;
    el.classList.add('he-grabable');
    if (selectionBox) selectionBox.classList.remove('he-hidden');
    updateSelectionBox();
    updateToolbarUI();
  }

  function deselectElement() {
    if (state.selectedEl) {
      state.selectedEl.classList.remove('he-grabable');
      state.selectedEl.classList.remove('he-dragging');
      state.selectedEl.style.cursor = '';
      state.selectedEl.style.zIndex = '';
    }
    state.selectedEl = null;
    state.textEditing = false;
    if (selectionBox) selectionBox.classList.add('he-hidden');
    // Remove contenteditable from all
    document.querySelectorAll('[contenteditable="true"]').forEach(e => {
      e.removeAttribute('contenteditable');
    });
    updateToolbarUI();
  }

  function updateSelectionBox() {
    if (!state.selectedEl || !selectionBox) return;
    const el = state.selectedEl;
    const rect = el.getBoundingClientRect();
    selectionBox.style.left = (rect.left + window.scrollX) + 'px';
    selectionBox.style.top = (rect.top + window.scrollY) + 'px';
    selectionBox.style.width = rect.width + 'px';
    selectionBox.style.height = rect.height + 'px';
  }

  // ==================== Hint ====================
  function createHint() {
    if (hint) hint.remove();

    hint = document.createElement('div');
    hint.id = 'he-hint';
    hint.setAttribute('data-he', 'hint');
    hint.style.display = 'none';

    const tips = [
      { key: 'Ctrl+E', desc: '编辑开关' },
      { key: '单击', desc: '选中元素' },
      { key: '双击', desc: '编辑文字' },
      { key: '拖拽', desc: '移动位置' },
      { key: 'Delete', desc: '删除' },
      { key: 'Ctrl+Z', desc: '撤销' },
      { key: 'Ctrl+S', desc: '保存' },
    ];

    tips.forEach((tip, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.textContent = '·';
        sep.style.color = '#475569';
        hint.appendChild(sep);
      }
      const item = document.createElement('span');
      item.className = 'he-hint-item';
      const kbd = document.createElement('kbd');
      kbd.textContent = tip.key;
      item.appendChild(kbd);
      const desc = document.createElement('span');
      desc.textContent = tip.desc;
      item.appendChild(desc);
      hint.appendChild(item);
    });

    document.body.appendChild(hint);
  }

  // ==================== Toast ====================
  function createToast() {
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.id = 'he-toast';
    toast.setAttribute('data-he', 'toast');
    document.body.appendChild(toast);
  }

  // ==================== Edit Mode ====================
  function toggleEdit() {
    // Expand toolbar if it was collapsed
    if (state.collapsed) expandToolbar();
    state.editing = !state.editing;
    document.body.classList.toggle('he-editing', state.editing);

    if (state.editing) {
      // Add selectable class to visible elements
      makeElementsSelectable();
    } else {
      deselectElement();
      // Remove selectable class
      document.querySelectorAll('.he-selectable').forEach(el => {
        el.classList.remove('he-selectable');
      });
    }
    updateToolbarUI();
  }

  function makeElementsSelectable() {
    const all = document.body.querySelectorAll('*');
    all.forEach(el => {
      // Skip editor UI elements and their children
      if (el.closest('[data-he]')) return;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'META' || tag === 'LINK') return;
      el.classList.add('he-selectable');
    });
  }

  // ==================== Text Editing ====================
  function startTextEditing(el) {
    state.textEditing = true;
    el.setAttribute('contenteditable', 'true');
    el.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function endTextEditing() {
    if (!state.selectedEl) return;
    const el = state.selectedEl;
    el.removeAttribute('contenteditable');
    state.textEditing = false;
    el.blur();
    saveSnapshot();
  }

  // ==================== Drag / Move ====================
  function getTransform(el) {
    const t = getComputedStyle(el).transform;
    if (t && t !== 'none') {
      const m = new DOMMatrix(t);
      return { x: m.m41 || 0, y: m.m42 || 0 };
    }
    return { x: 0, y: 0 };
  }

  function startDrag(e) {
    const el = state.selectedEl;
    if (!el) return;

    const tr = getTransform(el);

    // Preserve original mousedown position, add transform start values
    state.dragData.startX = tr.x;
    state.dragData.startY = tr.y;
    state.isDragging = true;
    el.classList.add('he-dragging');
    el.style.cursor = 'grabbing';
    el.style.zIndex = '9999';
  }

  function onDrag(e) {
    if (!state.isDragging || !state.selectedEl) return;
    const el = state.selectedEl;
    const dx = e.clientX - state.dragData.startMouseX;
    const dy = e.clientY - state.dragData.startMouseY;
    const newX = state.dragData.startX + dx;
    const newY = state.dragData.startY + dy;
    el.style.transform = `translate(${newX}px, ${newY}px)`;
    updateSelectionBox();
  }

  function endDrag() {
    if (!state.isDragging || !state.selectedEl) return;
    const el = state.selectedEl;
    el.classList.remove('he-dragging');
    el.style.cursor = '';
    el.style.zIndex = '';
    state.isDragging = false;
    state.dragData = null;
    saveSnapshot();
  }

  // ==================== Resize ====================
  function startResize(e, handleType) {
    const el = state.selectedEl;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const tr = getTransform(el);

    state.resizeData = {
      handle: handleType,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startTransformX: tr.x,
      startTransformY: tr.y,
    };
    state.isResizing = true;
    e.preventDefault();
    e.stopPropagation();
  }

  function onResize(e) {
    if (!state.isResizing || !state.selectedEl || !state.resizeData) return;
    const el = state.selectedEl;
    const d = state.resizeData;
    const dx = e.clientX - d.startMouseX;
    const dy = e.clientY - d.startMouseY;

    let newWidth = d.startWidth;
    let newHeight = d.startHeight;
    let newTransformX = d.startTransformX;
    let newTransformY = d.startTransformY;

    switch (d.handle) {
      case 'e':  newWidth = d.startWidth + dx; break;
      case 'w':  newWidth = d.startWidth - dx; newTransformX = d.startTransformX + dx; break;
      case 's':  newHeight = d.startHeight + dy; break;
      case 'n':  newHeight = d.startHeight - dy; newTransformY = d.startTransformY + dy; break;
      case 'se': newWidth = d.startWidth + dx; newHeight = d.startHeight + dy; break;
      case 'sw': newWidth = d.startWidth - dx; newHeight = d.startHeight + dy; newTransformX = d.startTransformX + dx; break;
      case 'ne': newWidth = d.startWidth + dx; newHeight = d.startHeight - dy; newTransformY = d.startTransformY + dy; break;
      case 'nw': newWidth = d.startWidth - dx; newHeight = d.startHeight - dy; newTransformX = d.startTransformX + dx; newTransformY = d.startTransformY + dy; break;
    }

    // Minimum size
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    el.style.width = newWidth + 'px';
    el.style.height = newHeight + 'px';
    el.style.transform = `translate(${newTransformX}px, ${newTransformY}px)`;

    updateSelectionBox();
  }

  function endResize() {
    if (!state.isResizing) return;
    state.isResizing = false;
    state.resizeData = null;
    saveSnapshot();
  }

  // ==================== Delete ====================
  function deleteSelectedElement() {
    if (!state.selectedEl) return;
    const el = state.selectedEl;
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
    deselectElement();
    saveSnapshot();
    showToast('元素已删除');
  }

  // ==================== Undo / History ====================
  function getCleanBodyHTML() {
    // Clone body to avoid affecting live DOM
    const clone = document.body.cloneNode(true);
    // Remove editor elements from clone
    clone.querySelectorAll('[data-he]').forEach(el => el.remove());
    // Remove editor classes
    clone.classList.remove('he-editing');
    clone.querySelectorAll('.he-selectable').forEach(el => el.classList.remove('he-selectable'));
    clone.querySelectorAll('.he-dragging').forEach(el => el.classList.remove('he-dragging'));
    clone.querySelectorAll('.he-grabable').forEach(el => el.classList.remove('he-grabable'));
    // Remove contenteditable
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    return clone.innerHTML;
  }

  function saveSnapshot() {
    // Truncate redo history
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(getCleanBodyHTML());
    state.historyIndex = state.history.length - 1;
    if (state.history.length > state.maxHistory) {
      state.history.shift();
      state.historyIndex--;
    }
    updateToolbarUI();
  }

  function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    const snapshot = state.history[state.historyIndex];

    // Remove editor elements from DOM temporarily
    const editorEls = Array.from(document.querySelectorAll('[data-he]'));

    // Replace body innerHTML
    document.body.innerHTML = snapshot;

    // Re-apply editing state
    if (state.editing) {
      document.body.classList.add('he-editing');
      makeElementsSelectable();
    }

    // Re-add editor elements
    editorEls.forEach(el => document.body.appendChild(el));

    deselectElement();
    updateToolbarUI();
    showToast('已撤销');
  }

  // ==================== Save ====================
  async function save() {
    // End any active editing
    if (state.textEditing) endTextEditing();
    deselectElement();

    // Remove editor artifacts
    document.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    document.body.classList.remove('he-editing');
    document.querySelectorAll('.he-selectable').forEach(el => el.classList.remove('he-selectable'));
    document.querySelectorAll('.he-dragging').forEach(el => el.classList.remove('he-dragging'));
    document.querySelectorAll('.he-grabable').forEach(el => el.classList.remove('he-grabable'));

    // Remove editor elements from DOM completely before serialization
    const editorEls = Array.from(document.querySelectorAll('[data-he]'));
    editorEls.forEach(el => el.remove());

    // Get the full HTML (editor elements are now excluded)
    const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

    // Re-add editor elements
    editorEls.forEach(el => document.body.appendChild(el));
    if (state.editing) {
      document.body.classList.add('he-editing');
      makeElementsSelectable();
    }

    // Get filename
    const path = window.location.pathname;
    let filename = path.split('/').pop() || 'index.html';
    if (!filename.endsWith('.html') && !filename.endsWith('.htm')) {
      filename += '.html';
    }

    // Try File System Access API first (allows overwriting original file)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'HTML 文件',
            accept: { 'text/html': ['.html', '.htm'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(html);
        await writable.close();
        showToast('文件已保存');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User cancelled
        // Fall through to download
      }
    }

    // Fallback: download via Blob
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      showToast('文件已下载，请替换原文件');
    } catch (err2) {
      showToast('保存失败: ' + err2.message, true);
    }
  }

  // ==================== Event Handlers ====================
  function onMouseDown(e) {
    if (!state.editing) return;

    // Check if clicking on a resize handle
    if (e.target.classList && e.target.classList.contains('he-handle')) {
      e.preventDefault();
      e.stopPropagation();
      startResize(e, e.target.getAttribute('data-handle'));
      return;
    }

    // If text editing and clicking elsewhere
    if (state.textEditing) {
      if (state.selectedEl && (e.target === state.selectedEl || state.selectedEl.contains(e.target))) {
        return; // Let text editing work normally
      }
      endTextEditing();
    }

    // Check if element is editable
    if (!isEditableElement(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    // Select element
    if (state.selectedEl !== e.target) {
      selectElement(e.target);
    }

    // Prepare for potential drag
    state.potentialDrag = true;
    state.dragData = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
    };
  }

  function onMouseMove(e) {
    if (state.ballDragging) {
      onBallDrag(e);
      return;
    }

    if (state.isResizing) {
      onResize(e);
      return;
    }

    if (state.potentialDrag && !state.isDragging) {
      // Check if mouse moved enough to start drag
      const dx = Math.abs(e.clientX - state.dragData.startMouseX);
      const dy = Math.abs(e.clientY - state.dragData.startMouseY);
      if (dx > 3 || dy > 3) {
        state.potentialDrag = false;
        startDrag(e);
      }
    }

    if (state.isDragging) {
      onDrag(e);
    }
  }

  function onMouseUp(e) {
    if (state.ballDragging) {
      endBallDrag();
      return;
    }
    if (state.isDragging) {
      endDrag();
    }
    if (state.isResizing) {
      endResize();
    }
    state.potentialDrag = false;
  }

  function onDoubleClick(e) {
    if (!state.editing) return;
    if (!isEditableElement(e.target)) return;
    if (isEditorElement(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    // Select element first if not already
    if (state.selectedEl !== e.target) {
      selectElement(e.target);
    }

    // Start text editing
    startTextEditing(e.target);
  }

  function onKeyDown(e) {
    // Ctrl+S - save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      save();
      return;
    }

    // Ctrl+Z - undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo();
      return;
    }

    // Ctrl+E - toggle edit mode
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      toggleEdit();
      return;
    }

    if (!state.editing) return;

    // Escape - deselect or exit edit mode
    if (e.key === 'Escape') {
      if (state.textEditing) {
        endTextEditing();
      } else if (state.selectedEl) {
        deselectElement();
      } else {
        toggleEdit();
      }
      return;
    }

    // Delete - remove selected element
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedEl && !state.textEditing) {
      e.preventDefault();
      deleteSelectedElement();
      return;
    }
  }

  function onScroll() {
    if (state.selectedEl) updateSelectionBox();
  }

  function onWindowResize() {
    if (state.selectedEl) updateSelectionBox();
  }

  // Selectionchange - end text editing when selection leaves
  function onSelectionChange() {
    // This is handled by blur events
  }

  // ==================== Message Handling ====================
  function onMessage(msg, sender, sendResponse) {
    if (msg.type === 'toggleEdit') {
      toggleEdit();
      sendResponse({ editing: state.editing });
    } else if (msg.type === 'getStatus') {
      sendResponse({ editing: state.editing });
    } else if (msg.type === 'save') {
      save();
      sendResponse({ ok: true });
    }
    return true;
  }

  // ==================== Init ====================
  function init() {
    if (state.initialized) return;
    if (!document.body) return;

    state.initialized = true;

    createToast();
    createToolbar();
    createFloatBall();
    createSelectionBox();
    createHint();

    // Event listeners
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    document.addEventListener('dblclick', onDoubleClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onWindowResize);

    // Chrome runtime message listener
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(onMessage);
    }

    // Save initial snapshot
    saveSnapshot();

    console.log('[HTML Editor] 内容脚本已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
