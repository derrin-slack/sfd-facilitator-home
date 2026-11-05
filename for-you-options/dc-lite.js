/* Small runtime for the first-day demo pages: fills {{ holes }}, sc-for and sc-if from the page's Component, and re-renders in place on setState. */
(function () {
  var HOLE = /\{\{\s*([\w$.]+)\s*\}\}/g;
  var ONLY = /^\s*\{\{\s*([\w$.]+)\s*\}\}\s*$/;
  var BOOL = { disabled: 1, checked: 1, hidden: 1, selected: 1, readonly: 1, required: 1 };
  var EVT = { onclick: 'click', onchange: 'input', oninput: 'input', onsubmit: 'submit', onkeydown: 'keydown' };

  function get(scope, path) {
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function fill(str, scope) {
    return str.replace(HOLE, function (_, p) { var v = get(scope, p); return v == null ? '' : String(v); });
  }
  function raw(str, scope) { var m = ONLY.exec(str); return m ? get(scope, m[1]) : fill(str, scope); }

  function listen(el) {
    if (!el.__h) return;
    el.__l = el.__l || {};
    Object.keys(el.__h).forEach(function (type) {
      if (el.__l[type]) return;
      el.__l[type] = true;
      el.addEventListener(type, function (e) { var f = el.__h && el.__h[type]; if (typeof f === 'function') f(e); });
    });
  }

  function render(node, scope, out) {
    if (node.nodeType === 3) { out.push(document.createTextNode(fill(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = raw(node.getAttribute('list') || '', scope) || [];
      var as = node.getAttribute('as') || 'item';
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope); s[as] = list[i];
        kids(node, s, out);
      }
      return;
    }
    if (tag === 'sc-if') {
      if (raw(node.getAttribute('value') || '', scope)) kids(node, scope, out);
      return;
    }
    var el = node.cloneNode(false);
    for (var a = node.attributes.length - 1; a >= 0; a--) {
      var at = node.attributes[a], name = at.name, val = at.value;
      if (name.indexOf('hint-') === 0) { el.removeAttribute(name); continue; }
      if (EVT[name]) { el.removeAttribute(name); el.__h = el.__h || {}; el.__h[EVT[name]] = raw(val, scope); continue; }
      if (val.indexOf('{{') < 0) continue;
      var v = raw(val, scope);
      if (BOOL[name]) { if (v === false || v == null || v === 'false') el.removeAttribute(name); else el.setAttribute(name, ''); }
      else el.setAttribute(name, v == null ? '' : String(v));
    }
    var c = []; kids(node, scope, c);
    c.forEach(function (n) { el.appendChild(n); });
    listen(el);
    out.push(el);
  }
  function kids(node, scope, out) {
    var src = node.content || node;
    for (var n = src.firstChild; n; n = n.nextSibling) render(n, scope, out);
  }

  function morph(from, to) {
    if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.parentNode.replaceChild(to, from); return; }
    if (from.nodeType === 3) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return; }
    if (from.nodeType !== 1) return;
    var formField = from.localName === 'input' || from.localName === 'textarea';
    for (var i = from.attributes.length - 1; i >= 0; i--) {
      var n = from.attributes[i].name;
      if (!to.hasAttribute(n) && !(formField && n === 'value')) from.removeAttribute(n);
    }
    for (var j = 0; j < to.attributes.length; j++) {
      var at = to.attributes[j];
      if (formField && at.name === 'value') continue;
      if (from.getAttribute(at.name) !== at.value) from.setAttribute(at.name, at.value);
    }
    if (from.localName === 'input' && (from.type === 'checkbox' || from.type === 'radio')) from.checked = to.hasAttribute('checked');
    from.__h = to.__h; listen(from);
    var a = Array.prototype.slice.call(from.childNodes), b = Array.prototype.slice.call(to.childNodes);
    for (var k = 0; k < b.length; k++) { if (k < a.length) morph(a[k], b[k]); else from.appendChild(b[k]); }
    for (var r = b.length; r < a.length; r++) from.removeChild(a[r]);
  }

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    var p = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, p);
    this.__draw();
  };

  document.addEventListener('DOMContentLoaded', function () {
    var tpl = document.getElementById('tpl'), app = document.getElementById('app');
    var code = document.getElementById('logic').textContent;
    var Component = new Function('DCLogic', code + '\nreturn Component;')(DCLogic);
    var comp = new Component({});
    comp.__draw = function () {
      var holder = document.createElement('div'), nodes = [];
      kids(tpl, comp.renderVals(), nodes);
      nodes.forEach(function (n) { holder.appendChild(n); });
      if (!app.__drawn) { while (holder.firstChild) app.appendChild(holder.firstChild); app.__drawn = true; }
      else morph(app, (function () { var d = app.cloneNode(false); while (holder.firstChild) d.appendChild(holder.firstChild); return d; })());
    };
    comp.__draw();
  });
})();
