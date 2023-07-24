"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SAXParser = exports.ENTITIES = void 0;
var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var DEFAULT_SAX_EVENTS = {
  ontext: function ontext() {},
  onprocessinginstruction: function onprocessinginstruction() {},
  onsgmldeclaration: function onsgmldeclaration() {},
  ondoctype: function ondoctype() {},
  oncomment: function oncomment() {},
  onopentagstart: function onopentagstart() {},
  onattribute: function onattribute() {},
  onopentag: function onopentag() {},
  onclosetag: function onclosetag() {},
  onopencdata: function onopencdata() {},
  oncdata: function oncdata() {},
  onclosecdata: function onclosecdata() {},
  onerror: function onerror() {},
  onend: function onend() {},
  onready: function onready() {},
  onscript: function onscript() {},
  onopennamespace: function onopennamespace() {},
  onclosenamespace: function onclosenamespace() {}
};
var DEFAULT_SAX_PARSER_OPTIONS = _objectSpread(_objectSpread({}, DEFAULT_SAX_EVENTS), {}, {
  strict: false,
  MAX_BUFFER_LENGTH: 64 * 1024,
  lowercase: false,
  lowercasetags: false,
  noscript: false,
  strictEntities: false,
  xmlns: undefined,
  position: undefined,
  trim: undefined,
  normalize: undefined
});
var EVENTS = ['text', 'processinginstruction', 'sgmldeclaration', 'doctype', 'comment', 'opentagstart', 'attribute', 'opentag', 'closetag', 'opencdata', 'cdata', 'closecdata', 'error', 'end', 'ready', 'script', 'opennamespace', 'closenamespace'];
var BUFFERS = ['comment', 'sgmlDecl', 'textNode', 'tagName', 'doctype', 'procInstName', 'procInstBody', 'entity', 'attribName', 'attribValue', 'cdata', 'script'];
var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
var entityStart = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
var entityBody = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
var ENTITIES = {
  amp: '&',
  gt: '>',
  lt: '<',
  quot: '"',
  apos: "'",
  AElig: 198,
  Aacute: 193,
  Acirc: 194,
  Agrave: 192,
  Aring: 197,
  Atilde: 195,
  Auml: 196,
  Ccedil: 199,
  ETH: 208,
  Eacute: 201,
  Ecirc: 202,
  Egrave: 200,
  Euml: 203,
  Iacute: 205,
  Icirc: 206,
  Igrave: 204,
  Iuml: 207,
  Ntilde: 209,
  Oacute: 211,
  Ocirc: 212,
  Ograve: 210,
  Oslash: 216,
  Otilde: 213,
  Ouml: 214,
  THORN: 222,
  Uacute: 218,
  Ucirc: 219,
  Ugrave: 217,
  Uuml: 220,
  Yacute: 221,
  aacute: 225,
  acirc: 226,
  aelig: 230,
  agrave: 224,
  aring: 229,
  atilde: 227,
  auml: 228,
  ccedil: 231,
  eacute: 233,
  ecirc: 234,
  egrave: 232,
  eth: 240,
  euml: 235,
  iacute: 237,
  icirc: 238,
  igrave: 236,
  iuml: 239,
  ntilde: 241,
  oacute: 243,
  ocirc: 244,
  ograve: 242,
  oslash: 248,
  otilde: 245,
  ouml: 246,
  szlig: 223,
  thorn: 254,
  uacute: 250,
  ucirc: 251,
  ugrave: 249,
  uuml: 252,
  yacute: 253,
  yuml: 255,
  copy: 169,
  reg: 174,
  nbsp: 160,
  iexcl: 161,
  cent: 162,
  pound: 163,
  curren: 164,
  yen: 165,
  brvbar: 166,
  sect: 167,
  uml: 168,
  ordf: 170,
  laquo: 171,
  not: 172,
  shy: 173,
  macr: 175,
  deg: 176,
  plusmn: 177,
  sup1: 185,
  sup2: 178,
  sup3: 179,
  acute: 180,
  micro: 181,
  para: 182,
  middot: 183,
  cedil: 184,
  ordm: 186,
  raquo: 187,
  frac14: 188,
  frac12: 189,
  frac34: 190,
  iquest: 191,
  times: 215,
  divide: 247,
  OElig: 338,
  oelig: 339,
  Scaron: 352,
  scaron: 353,
  Yuml: 376,
  fnof: 402,
  circ: 710,
  tilde: 732,
  Alpha: 913,
  Beta: 914,
  Gamma: 915,
  Delta: 916,
  Epsilon: 917,
  Zeta: 918,
  Eta: 919,
  Theta: 920,
  Iota: 921,
  Kappa: 922,
  Lambda: 923,
  Mu: 924,
  Nu: 925,
  Xi: 926,
  Omicron: 927,
  Pi: 928,
  Rho: 929,
  Sigma: 931,
  Tau: 932,
  Upsilon: 933,
  Phi: 934,
  Chi: 935,
  Psi: 936,
  Omega: 937,
  alpha: 945,
  beta: 946,
  gamma: 947,
  delta: 948,
  epsilon: 949,
  zeta: 950,
  eta: 951,
  theta: 952,
  iota: 953,
  kappa: 954,
  lambda: 955,
  mu: 956,
  nu: 957,
  xi: 958,
  omicron: 959,
  pi: 960,
  rho: 961,
  sigmaf: 962,
  sigma: 963,
  tau: 964,
  upsilon: 965,
  phi: 966,
  chi: 967,
  psi: 968,
  omega: 969,
  thetasym: 977,
  upsih: 978,
  piv: 982,
  ensp: 8194,
  emsp: 8195,
  thinsp: 8201,
  zwnj: 8204,
  zwj: 8205,
  lrm: 8206,
  rlm: 8207,
  ndash: 8211,
  mdash: 8212,
  lsquo: 8216,
  rsquo: 8217,
  sbquo: 8218,
  ldquo: 8220,
  rdquo: 8221,
  bdquo: 8222,
  dagger: 8224,
  Dagger: 8225,
  bull: 8226,
  hellip: 8230,
  permil: 8240,
  prime: 8242,
  Prime: 8243,
  lsaquo: 8249,
  rsaquo: 8250,
  oline: 8254,
  frasl: 8260,
  euro: 8364,
  image: 8465,
  weierp: 8472,
  real: 8476,
  trade: 8482,
  alefsym: 8501,
  larr: 8592,
  uarr: 8593,
  rarr: 8594,
  darr: 8595,
  harr: 8596,
  crarr: 8629,
  lArr: 8656,
  uArr: 8657,
  rArr: 8658,
  dArr: 8659,
  hArr: 8660,
  forall: 8704,
  part: 8706,
  exist: 8707,
  empty: 8709,
  nabla: 8711,
  isin: 8712,
  notin: 8713,
  ni: 8715,
  prod: 8719,
  sum: 8721,
  minus: 8722,
  lowast: 8727,
  radic: 8730,
  prop: 8733,
  infin: 8734,
  ang: 8736,
  and: 8743,
  or: 8744,
  cap: 8745,
  cup: 8746,
  int: 8747,
  there4: 8756,
  sim: 8764,
  cong: 8773,
  asymp: 8776,
  ne: 8800,
  equiv: 8801,
  le: 8804,
  ge: 8805,
  sub: 8834,
  sup: 8835,
  nsub: 8836,
  sube: 8838,
  supe: 8839,
  oplus: 8853,
  otimes: 8855,
  perp: 8869,
  sdot: 8901,
  lceil: 8968,
  rceil: 8969,
  lfloor: 8970,
  rfloor: 8971,
  lang: 9001,
  rang: 9002,
  loz: 9674,
  spades: 9824,
  clubs: 9827,
  hearts: 9829,
  diams: 9830
};
exports.ENTITIES = ENTITIES;
Object.keys(ENTITIES).forEach(function (key) {
  var e = ENTITIES[key];
  ENTITIES[key] = typeof e === 'number' ? String.fromCharCode(e) : e;
});
var SAX = function () {
  function SAX() {
    (0, _classCallCheck2.default)(this, SAX);
    (0, _defineProperty2.default)(this, "EVENTS", EVENTS);
    (0, _defineProperty2.default)(this, "ENTITIES", _objectSpread({}, ENTITIES));
    (0, _defineProperty2.default)(this, "events", void 0);
    (0, _defineProperty2.default)(this, "XML_ENTITIES", {
      amp: '&',
      gt: '>',
      lt: '<',
      quot: '"',
      apos: "'"
    });
    (0, _defineProperty2.default)(this, "S", 0);
    (0, _defineProperty2.default)(this, "opt", void 0);
    (0, _defineProperty2.default)(this, "trackPosition", false);
    (0, _defineProperty2.default)(this, "column", 0);
    (0, _defineProperty2.default)(this, "line", 0);
    (0, _defineProperty2.default)(this, "c", '');
    (0, _defineProperty2.default)(this, "error", void 0);
    (0, _defineProperty2.default)(this, "q", '');
    (0, _defineProperty2.default)(this, "bufferCheckPosition", void 0);
    (0, _defineProperty2.default)(this, "closed", false);
    (0, _defineProperty2.default)(this, "tags", []);
    (0, _defineProperty2.default)(this, "looseCase", '');
    (0, _defineProperty2.default)(this, "closedRoot", false);
    (0, _defineProperty2.default)(this, "sawRoot", false);
    (0, _defineProperty2.default)(this, "strict", false);
    (0, _defineProperty2.default)(this, "tag", void 0);
    (0, _defineProperty2.default)(this, "strictEntities", void 0);
    (0, _defineProperty2.default)(this, "state", void 0);
    (0, _defineProperty2.default)(this, "noscript", false);
    (0, _defineProperty2.default)(this, "attribList", []);
    (0, _defineProperty2.default)(this, "ns", void 0);
    (0, _defineProperty2.default)(this, "position", 0);
    (0, _defineProperty2.default)(this, "STATE", {
      BEGIN: this.S++,
      BEGIN_WHITESPACE: this.S++,
      TEXT: this.S++,
      TEXT_ENTITY: this.S++,
      OPEN_WAKA: this.S++,
      SGML_DECL: this.S++,
      SGML_DECL_QUOTED: this.S++,
      DOCTYPE: this.S++,
      DOCTYPE_QUOTED: this.S++,
      DOCTYPE_DTD: this.S++,
      DOCTYPE_DTD_QUOTED: this.S++,
      COMMENT_STARTING: this.S++,
      COMMENT: this.S++,
      COMMENT_ENDING: this.S++,
      COMMENT_ENDED: this.S++,
      CDATA: this.S++,
      CDATA_ENDING: this.S++,
      CDATA_ENDING_2: this.S++,
      PROC_INST: this.S++,
      PROC_INST_BODY: this.S++,
      PROC_INST_ENDING: this.S++,
      OPEN_TAG: this.S++,
      OPEN_TAG_SLASH: this.S++,
      ATTRIB: this.S++,
      ATTRIB_NAME: this.S++,
      ATTRIB_NAME_SAW_WHITE: this.S++,
      ATTRIB_VALUE: this.S++,
      ATTRIB_VALUE_QUOTED: this.S++,
      ATTRIB_VALUE_CLOSED: this.S++,
      ATTRIB_VALUE_UNQUOTED: this.S++,
      ATTRIB_VALUE_ENTITY_Q: this.S++,
      ATTRIB_VALUE_ENTITY_U: this.S++,
      CLOSE_TAG: this.S++,
      CLOSE_TAG_SAW_WHITE: this.S++,
      SCRIPT: this.S++,
      SCRIPT_ENDING: this.S++
    });
    (0, _defineProperty2.default)(this, "BUFFERS", BUFFERS);
    (0, _defineProperty2.default)(this, "CDATA", '[CDATA[');
    (0, _defineProperty2.default)(this, "DOCTYPE", 'DOCTYPE');
    (0, _defineProperty2.default)(this, "XML_NAMESPACE", 'http://www.w3.org/XML/1998/namespace');
    (0, _defineProperty2.default)(this, "XMLNS_NAMESPACE", 'http://www.w3.org/2000/xmlns/');
    (0, _defineProperty2.default)(this, "rootNS", {
      xml: this.XML_NAMESPACE,
      xmlns: this.XMLNS_NAMESPACE
    });
    (0, _defineProperty2.default)(this, "comment", void 0);
    (0, _defineProperty2.default)(this, "sgmlDecl", void 0);
    (0, _defineProperty2.default)(this, "textNode", '');
    (0, _defineProperty2.default)(this, "tagName", void 0);
    (0, _defineProperty2.default)(this, "doctype", void 0);
    (0, _defineProperty2.default)(this, "procInstName", void 0);
    (0, _defineProperty2.default)(this, "procInstBody", void 0);
    (0, _defineProperty2.default)(this, "entity", '');
    (0, _defineProperty2.default)(this, "attribName", void 0);
    (0, _defineProperty2.default)(this, "attribValue", void 0);
    (0, _defineProperty2.default)(this, "cdata", '');
    (0, _defineProperty2.default)(this, "script", '');
    (0, _defineProperty2.default)(this, "startTagPosition", 0);
    this.S = 0;
    for (var s in this.STATE) {
      if (this.STATE.hasOwnProperty(s)) {
        this.STATE[this.STATE[s]] = s;
      }
    }
    this.S = this.STATE;
  }
  (0, _createClass2.default)(SAX, [{
    key: "write",
    value: function write(chunk) {
      if (this.error) {
        throw this.error;
      }
      if (this.closed) {
        return this.errorFunction('Cannot write after close. Assign an onready handler.');
      }
      if (chunk === null) {
        return this.end();
      }
      if ((0, _typeof2.default)(chunk) === 'object') {
        chunk = chunk.toString();
      }
      var i = 0;
      var c;
      while (true) {
        c = SAX.charAt(chunk, i++);
        this.c = c;
        if (!c) {
          break;
        }
        if (this.trackPosition) {
          this.position++;
          if (c === '\n') {
            this.line++;
            this.column = 0;
          } else {
            this.column++;
          }
        }
        switch (this.state) {
          case this.S.BEGIN:
            this.state = this.S.BEGIN_WHITESPACE;
            if (c === "\uFEFF") {
              continue;
            }
            this.beginWhiteSpace(c);
            continue;
          case this.S.BEGIN_WHITESPACE:
            this.beginWhiteSpace(c);
            continue;
          case this.S.TEXT:
            if (this.sawRoot && !this.closedRoot) {
              var starti = i - 1;
              while (c && c !== '<' && c !== '&') {
                c = SAX.charAt(chunk, i++);
                if (c && this.trackPosition) {
                  this.position++;
                  if (c === '\n') {
                    this.line++;
                    this.column = 0;
                  } else {
                    this.column++;
                  }
                }
              }
              this.textNode += chunk.substring(starti, i - 1);
            }
            if (c === '<' && !(this.sawRoot && this.closedRoot && !this.strict)) {
              this.state = this.S.OPEN_WAKA;
              this.startTagPosition = this.position;
            } else {
              if (!SAX.isWhitespace(c) && (!this.sawRoot || this.closedRoot)) {
                this.strictFail('Text data outside of root node.');
              }
              if (c === '&') {
                this.state = this.S.TEXT_ENTITY;
              } else {
                this.textNode += c;
              }
            }
            continue;
          case this.S.SCRIPT:
            if (c === '<') {
              this.state = this.S.SCRIPT_ENDING;
            } else {
              this.script += c;
            }
            continue;
          case this.S.SCRIPT_ENDING:
            if (c === '/') {
              this.state = this.S.CLOSE_TAG;
            } else {
              this.script += "<".concat(c);
              this.state = this.S.SCRIPT;
            }
            continue;
          case this.S.OPEN_WAKA:
            if (c === '!') {
              this.state = this.S.SGML_DECL;
              this.sgmlDecl = '';
            } else if (SAX.isWhitespace(c)) {} else if (SAX.isMatch(nameStart, c)) {
              this.state = this.S.OPEN_TAG;
              this.tagName = c;
            } else if (c === '/') {
              this.state = this.S.CLOSE_TAG;
              this.tagName = '';
            } else if (c === '?') {
              this.state = this.S.PROC_INST;
              this.procInstName = this.procInstBody = '';
            } else {
              this.strictFail('Unencoded <');
              if (this.startTagPosition + 1 < this.position) {
                var pad = this.position - this.startTagPosition;
                c = new Array(pad).join(' ') + c;
              }
              this.textNode += "<".concat(c);
              this.state = this.S.TEXT;
            }
            continue;
          case this.S.SGML_DECL:
            if ((this.sgmlDecl + c).toUpperCase() === this.CDATA) {
              this.emitNode('onopencdata');
              this.state = this.S.CDATA;
              this.sgmlDecl = '';
              this.cdata = '';
            } else if (this.sgmlDecl + c === '--') {
              this.state = this.S.COMMENT;
              this.comment = '';
              this.sgmlDecl = '';
            } else if ((this.sgmlDecl + c).toUpperCase() === this.DOCTYPE) {
              this.state = this.S.DOCTYPE;
              if (this.doctype || this.sawRoot) {
                this.strictFail('Inappropriately located doctype declaration');
              }
              this.doctype = '';
              this.sgmlDecl = '';
            } else if (c === '>') {
              this.emitNode('onsgmldeclaration', this.sgmlDecl);
              this.sgmlDecl = '';
              this.state = this.S.TEXT;
            } else if (SAX.isQuote(c)) {
              this.state = this.S.SGML_DECL_QUOTED;
              this.sgmlDecl += c;
            } else {
              this.sgmlDecl += c;
            }
            continue;
          case this.S.SGML_DECL_QUOTED:
            if (c === this.q) {
              this.state = this.S.SGML_DECL;
              this.q = '';
            }
            this.sgmlDecl += c;
            continue;
          case this.S.DOCTYPE:
            if (c === '>') {
              this.state = this.S.TEXT;
              this.emitNode('ondoctype', this.doctype);
              this.doctype = true;
            } else {
              this.doctype += c;
              if (c === '[') {
                this.state = this.S.DOCTYPE_DTD;
              } else if (SAX.isQuote(c)) {
                this.state = this.S.DOCTYPE_QUOTED;
                this.q = c;
              }
            }
            continue;
          case this.S.DOCTYPE_QUOTED:
            this.doctype += c;
            if (c === this.q) {
              this.q = '';
              this.state = this.S.DOCTYPE;
            }
            continue;
          case this.S.DOCTYPE_DTD:
            this.doctype += c;
            if (c === ']') {
              this.state = this.S.DOCTYPE;
            } else if (SAX.isQuote(c)) {
              this.state = this.S.DOCTYPE_DTD_QUOTED;
              this.q = c;
            }
            continue;
          case this.S.DOCTYPE_DTD_QUOTED:
            this.doctype += c;
            if (c === this.q) {
              this.state = this.S.DOCTYPE_DTD;
              this.q = '';
            }
            continue;
          case this.S.COMMENT:
            if (c === '-') {
              this.state = this.S.COMMENT_ENDING;
            } else {
              this.comment += c;
            }
            continue;
          case this.S.COMMENT_ENDING:
            if (c === '-') {
              this.state = this.S.COMMENT_ENDED;
              this.comment = this.textApplyOptions(this.comment);
              if (this.comment) {
                this.emitNode('oncomment', this.comment);
              }
              this.comment = '';
            } else {
              this.comment += "-".concat(c);
              this.state = this.S.COMMENT;
            }
            continue;
          case this.S.COMMENT_ENDED:
            if (c !== '>') {
              this.strictFail('Malformed comment');
              this.comment += "--".concat(c);
              this.state = this.S.COMMENT;
            } else {
              this.state = this.S.TEXT;
            }
            continue;
          case this.S.CDATA:
            if (c === ']') {
              this.state = this.S.CDATA_ENDING;
            } else {
              this.cdata += c;
            }
            continue;
          case this.S.CDATA_ENDING:
            if (c === ']') {
              this.state = this.S.CDATA_ENDING_2;
            } else {
              this.cdata += "]".concat(c);
              this.state = this.S.CDATA;
            }
            continue;
          case this.S.CDATA_ENDING_2:
            if (c === '>') {
              if (this.cdata) {
                this.emitNode('oncdata', this.cdata);
              }
              this.emitNode('onclosecdata');
              this.cdata = '';
              this.state = this.S.TEXT;
            } else if (c === ']') {
              this.cdata += ']';
            } else {
              this.cdata += "]]".concat(c);
              this.state = this.S.CDATA;
            }
            continue;
          case this.S.PROC_INST:
            if (c === '?') {
              this.state = this.S.PROC_INST_ENDING;
            } else if (SAX.isWhitespace(c)) {
              this.state = this.S.PROC_INST_BODY;
            } else {
              this.procInstName += c;
            }
            continue;
          case this.S.PROC_INST_BODY:
            if (!this.procInstBody && SAX.isWhitespace(c)) {
              continue;
            } else if (c === '?') {
              this.state = this.S.PROC_INST_ENDING;
            } else {
              this.procInstBody += c;
            }
            continue;
          case this.S.PROC_INST_ENDING:
            if (c === '>') {
              this.emitNode('onprocessinginstruction', {
                name: this.procInstName,
                body: this.procInstBody
              });
              this.procInstName = this.procInstBody = '';
              this.state = this.S.TEXT;
            } else {
              this.procInstBody += "?".concat(c);
              this.state = this.S.PROC_INST_BODY;
            }
            continue;
          case this.S.OPEN_TAG:
            if (SAX.isMatch(nameBody, c)) {
              this.tagName += c;
            } else {
              this.newTag();
              if (c === '>') {
                this.openTag();
              } else if (c === '/') {
                this.state = this.S.OPEN_TAG_SLASH;
              } else {
                if (!SAX.isWhitespace(c)) {
                  this.strictFail('Invalid character in tag name');
                }
                this.state = this.S.ATTRIB;
              }
            }
            continue;
          case this.S.OPEN_TAG_SLASH:
            if (c === '>') {
              this.openTag(true);
              this.closeTag();
            } else {
              this.strictFail('Forward-slash in opening tag not followed by >');
              this.state = this.S.ATTRIB;
            }
            continue;
          case this.S.ATTRIB:
            if (SAX.isWhitespace(c)) {
              continue;
            } else if (c === '>') {
              this.openTag();
            } else if (c === '/') {
              this.state = this.S.OPEN_TAG_SLASH;
            } else if (SAX.isMatch(nameStart, c)) {
              this.attribName = c;
              this.attribValue = '';
              this.state = this.S.ATTRIB_NAME;
            } else {
              this.strictFail('Invalid attribute name');
            }
            continue;
          case this.S.ATTRIB_NAME:
            if (c === '=') {
              this.state = this.S.ATTRIB_VALUE;
            } else if (c === '>') {
              this.strictFail('Attribute without value');
              this.attribValue = this.attribName;
              this.attrib();
              this.openTag();
            } else if (SAX.isWhitespace(c)) {
              this.state = this.S.ATTRIB_NAME_SAW_WHITE;
            } else if (SAX.isMatch(nameBody, c)) {
              this.attribName += c;
            } else {
              this.strictFail('Invalid attribute name');
            }
            continue;
          case this.S.ATTRIB_NAME_SAW_WHITE:
            if (c === '=') {
              this.state = this.S.ATTRIB_VALUE;
            } else if (SAX.isWhitespace(c)) {
              continue;
            } else {
              this.strictFail('Attribute without value');
              this.tag.attributes[this.attribName] = '';
              this.attribValue = '';
              this.emitNode('onattribute', {
                name: this.attribName,
                value: ''
              });
              this.attribName = '';
              if (c === '>') {
                this.openTag();
              } else if (SAX.isMatch(nameStart, c)) {
                this.attribName = c;
                this.state = this.S.ATTRIB_NAME;
              } else {
                this.strictFail('Invalid attribute name');
                this.state = this.S.ATTRIB;
              }
            }
            continue;
          case this.S.ATTRIB_VALUE:
            if (SAX.isWhitespace(c)) {
              continue;
            } else if (SAX.isQuote(c)) {
              this.q = c;
              this.state = this.S.ATTRIB_VALUE_QUOTED;
            } else {
              this.strictFail('Unquoted attribute value');
              this.state = this.S.ATTRIB_VALUE_UNQUOTED;
              this.attribValue = c;
            }
            continue;
          case this.S.ATTRIB_VALUE_QUOTED:
            if (c !== this.q) {
              if (c === '&') {
                this.state = this.S.ATTRIB_VALUE_ENTITY_Q;
              } else {
                this.attribValue += c;
              }
              continue;
            }
            this.attrib();
            this.q = '';
            this.state = this.S.ATTRIB_VALUE_CLOSED;
            continue;
          case this.S.ATTRIB_VALUE_CLOSED:
            if (SAX.isWhitespace(c)) {
              this.state = this.S.ATTRIB;
            } else if (c === '>') {
              this.openTag();
            } else if (c === '/') {
              this.state = this.S.OPEN_TAG_SLASH;
            } else if (SAX.isMatch(nameStart, c)) {
              this.strictFail('No whitespace between attributes');
              this.attribName = c;
              this.attribValue = '';
              this.state = this.S.ATTRIB_NAME;
            } else {
              this.strictFail('Invalid attribute name');
            }
            continue;
          case this.S.ATTRIB_VALUE_UNQUOTED:
            if (!SAX.isAttribEnd(c)) {
              if (c === '&') {
                this.state = this.S.ATTRIB_VALUE_ENTITY_U;
              } else {
                this.attribValue += c;
              }
              continue;
            }
            this.attrib();
            if (c === '>') {
              this.openTag();
            } else {
              this.state = this.S.ATTRIB;
            }
            continue;
          case this.S.CLOSE_TAG:
            if (!this.tagName) {
              if (SAX.isWhitespace(c)) {
                continue;
              } else if (SAX.notMatch(nameStart, c)) {
                if (this.script) {
                  this.script += "</".concat(c);
                  this.state = this.S.SCRIPT;
                } else {
                  this.strictFail('Invalid tagname in closing tag.');
                }
              } else {
                this.tagName = c;
              }
            } else if (c === '>') {
              this.closeTag();
            } else if (SAX.isMatch(nameBody, c)) {
              this.tagName += c;
            } else if (this.script) {
              this.script += "</".concat(this.tagName);
              this.tagName = '';
              this.state = this.S.SCRIPT;
            } else {
              if (!SAX.isWhitespace(c)) {
                this.strictFail('Invalid tagname in closing tag');
              }
              this.state = this.S.CLOSE_TAG_SAW_WHITE;
            }
            continue;
          case this.S.CLOSE_TAG_SAW_WHITE:
            if (SAX.isWhitespace(c)) {
              continue;
            }
            if (c === '>') {
              this.closeTag();
            } else {
              this.strictFail('Invalid characters in closing tag');
            }
            continue;
          case this.S.TEXT_ENTITY:
          case this.S.ATTRIB_VALUE_ENTITY_Q:
          case this.S.ATTRIB_VALUE_ENTITY_U:
            var returnState = void 0;
            var buffer = void 0;
            switch (this.state) {
              case this.S.TEXT_ENTITY:
                returnState = this.S.TEXT;
                buffer = 'textNode';
                break;
              case this.S.ATTRIB_VALUE_ENTITY_Q:
                returnState = this.S.ATTRIB_VALUE_QUOTED;
                buffer = 'attribValue';
                break;
              case this.S.ATTRIB_VALUE_ENTITY_U:
                returnState = this.S.ATTRIB_VALUE_UNQUOTED;
                buffer = 'attribValue';
                break;
              default:
                throw new Error("Unknown state: ".concat(this.state));
            }
            if (c === ';') {
              this[buffer] += this.parseEntity();
              this.entity = '';
              this.state = returnState;
            } else if (SAX.isMatch(this.entity.length ? entityBody : entityStart, c)) {
              this.entity += c;
            } else {
              this.strictFail('Invalid character in entity name');
              this[buffer] += "&".concat(this.entity).concat(c);
              this.entity = '';
              this.state = returnState;
            }
            continue;
          default:
            throw new Error("Unknown state: ".concat(this.state));
        }
      }
      if (this.position >= this.bufferCheckPosition) {
        this.checkBufferLength();
      }
      return this;
    }
  }, {
    key: "emit",
    value: function emit(event, data) {
      if (this.events.hasOwnProperty(event)) {
        var _eventName = event.replace(/^on/, '');
        this.events[event](data, _eventName, this);
      }
    }
  }, {
    key: "clearBuffers",
    value: function clearBuffers() {
      for (var i = 0, l = this.BUFFERS.length; i < l; i++) {
        this[this[i]] = '';
      }
    }
  }, {
    key: "flushBuffers",
    value: function flushBuffers() {
      this.closeText();
      if (this.cdata !== '') {
        this.emitNode('oncdata', this.cdata);
        this.cdata = '';
      }
      if (this.script !== '') {
        this.emitNode('onscript', this.script);
        this.script = '';
      }
    }
  }, {
    key: "end",
    value: function end() {
      if (this.sawRoot && !this.closedRoot) this.strictFail('Unclosed root tag');
      if (this.state !== this.S.BEGIN && this.state !== this.S.BEGIN_WHITESPACE && this.state !== this.S.TEXT) {
        this.errorFunction('Unexpected end');
      }
      this.closeText();
      this.c = '';
      this.closed = true;
      this.emit('onend');
      return new SAXParser(this.opt);
    }
  }, {
    key: "errorFunction",
    value: function errorFunction(er) {
      this.closeText();
      if (this.trackPosition) {
        er += "\nLine: ".concat(this.line, "\nColumn: ").concat(this.column, "\nChar: ").concat(this.c);
      }
      var error = new Error(er);
      this.error = error;
      this.emit('onerror', error);
      return this;
    }
  }, {
    key: "attrib",
    value: function attrib() {
      if (!this.strict) {
        this.attribName = this.attribName[this.looseCase]();
      }
      if (this.attribList.indexOf(this.attribName) !== -1 || this.tag.attributes.hasOwnProperty(this.attribName)) {
        this.attribName = this.attribValue = '';
        return;
      }
      if (this.opt.xmlns) {
        var qn = SAX.qname(this.attribName, true);
        var prefix = qn.prefix;
        var local = qn.local;
        if (prefix === 'xmlns') {
          if (local === 'xml' && this.attribValue !== this.XML_NAMESPACE) {
            this.strictFail("xml: prefix must be bound to ".concat(this.XML_NAMESPACE, "\n") + "Actual: ".concat(this.attribValue));
          } else if (local === 'xmlns' && this.attribValue !== this.XMLNS_NAMESPACE) {
            this.strictFail("xmlns: prefix must be bound to ".concat(this.XMLNS_NAMESPACE, "\n") + "Actual: ".concat(this.attribValue));
          } else {
            var tag = this.tag;
            var parent = this.tags[this.tags.length - 1] || this;
            if (tag.ns === parent.ns) {
              tag.ns = Object.create(parent.ns);
            }
            tag.ns[local] = this.attribValue;
          }
        }
        this.attribList.push([this.attribName, this.attribValue]);
      } else {
        this.tag.attributes[this.attribName] = this.attribValue;
        this.emitNode('onattribute', {
          name: this.attribName,
          value: this.attribValue
        });
      }
      this.attribName = this.attribValue = '';
    }
  }, {
    key: "newTag",
    value: function newTag() {
      if (!this.strict) this.tagName = this.tagName[this.looseCase]();
      var parent = this.tags[this.tags.length - 1] || this;
      var tag = this.tag = {
        name: this.tagName,
        attributes: {}
      };
      if (this.opt.xmlns) {
        tag.ns = parent.ns;
      }
      this.attribList.length = 0;
      this.emitNode('onopentagstart', tag);
    }
  }, {
    key: "parseEntity",
    value: function parseEntity() {
      var entity = this.entity;
      var entityLC = entity.toLowerCase();
      var num = NaN;
      var numStr = '';
      if (this.ENTITIES[entity]) {
        return this.ENTITIES[entity];
      }
      if (this.ENTITIES[entityLC]) {
        return this.ENTITIES[entityLC];
      }
      entity = entityLC;
      if (entity.charAt(0) === '#') {
        if (entity.charAt(1) === 'x') {
          entity = entity.slice(2);
          num = parseInt(entity, 16);
          numStr = num.toString(16);
        } else {
          entity = entity.slice(1);
          num = parseInt(entity, 10);
          numStr = num.toString(10);
        }
      }
      entity = entity.replace(/^0+/, '');
      if (isNaN(num) || numStr.toLowerCase() !== entity) {
        this.strictFail('Invalid character entity');
        return "&".concat(this.entity, ";");
      }
      return String.fromCodePoint(num);
    }
  }, {
    key: "beginWhiteSpace",
    value: function beginWhiteSpace(c) {
      if (c === '<') {
        this.state = this.S.OPEN_WAKA;
        this.startTagPosition = this.position;
      } else if (!SAX.isWhitespace(c)) {
        this.strictFail('Non-whitespace before first tag.');
        this.textNode = c;
        this.state = this.S.TEXT;
      } else {}
    }
  }, {
    key: "strictFail",
    value: function strictFail(message) {
      if ((0, _typeof2.default)(this) !== 'object' || !(this instanceof SAXParser)) {
        throw new Error('bad call to strictFail');
      }
      if (this.strict) {
        this.errorFunction(message);
      }
    }
  }, {
    key: "textApplyOptions",
    value: function textApplyOptions(text) {
      if (this.opt.trim) text = text.trim();
      if (this.opt.normalize) text = text.replace(/\s+/g, ' ');
      return text;
    }
  }, {
    key: "emitNode",
    value: function emitNode(nodeType, data) {
      if (this.textNode) this.closeText();
      this.emit(nodeType, data);
    }
  }, {
    key: "closeText",
    value: function closeText() {
      this.textNode = this.textApplyOptions(this.textNode);
      if (this.textNode !== undefined && this.textNode !== '' && this.textNode !== 'undefined') {
        this.emit('ontext', this.textNode);
      }
      this.textNode = '';
    }
  }, {
    key: "checkBufferLength",
    value: function checkBufferLength() {
      var maxAllowed = Math.max(this.opt.MAX_BUFFER_LENGTH, 10);
      var maxActual = 0;
      for (var i = 0, l = this.BUFFERS.length; i < l; i++) {
        var _this$this$BUFFERS$i;
        var len = ((_this$this$BUFFERS$i = this[this.BUFFERS[i]]) === null || _this$this$BUFFERS$i === void 0 ? void 0 : _this$this$BUFFERS$i.length) || 0;
        if (len > maxAllowed) {
          switch (this.BUFFERS[i]) {
            case 'textNode':
              this.closeText();
              break;
            case 'cdata':
              this.emitNode('oncdata', this.cdata);
              this.cdata = '';
              break;
            case 'script':
              this.emitNode('onscript', this.script);
              this.script = '';
              break;
            default:
              this.errorFunction("Max buffer length exceeded: ".concat(this.BUFFERS[i]));
          }
        }
        maxActual = Math.max(maxActual, len);
      }
      var m = this.opt.MAX_BUFFER_LENGTH - maxActual;
      this.bufferCheckPosition = m + this.position;
    }
  }, {
    key: "openTag",
    value: function openTag(selfClosing) {
      if (this.opt.xmlns) {
        var tag = this.tag;
        var qn = SAX.qname(this.tagName);
        tag.prefix = qn.prefix;
        tag.local = qn.local;
        tag.uri = tag.ns[qn.prefix] || '';
        if (tag.prefix && !tag.uri) {
          this.strictFail("Unbound namespace prefix: ".concat(JSON.stringify(this.tagName)));
          tag.uri = qn.prefix;
        }
        var parent = this.tags[this.tags.length - 1] || this;
        if (tag.ns && parent.ns !== tag.ns) {
          var that = this;
          Object.keys(tag.ns).forEach(function (p) {
            that.emitNode('onopennamespace', {
              prefix: p,
              uri: tag.ns[p]
            });
          });
        }
        for (var i = 0, l = this.attribList.length; i < l; i++) {
          var nv = this.attribList[i];
          var name = nv[0];
          var value = nv[1];
          var qualName = SAX.qname(name, true);
          var prefix = qualName.prefix;
          var local = qualName.local;
          var uri = prefix === '' ? '' : tag.ns[prefix] || '';
          var a = {
            name: name,
            value: value,
            prefix: prefix,
            local: local,
            uri: uri
          };
          if (prefix && prefix !== 'xmlns' && !uri) {
            this.strictFail("Unbound namespace prefix: ".concat(JSON.stringify(prefix)));
            a.uri = prefix;
          }
          this.tag.attributes[name] = a;
          this.emitNode('onattribute', a);
        }
        this.attribList.length = 0;
      }
      this.tag.isSelfClosing = Boolean(selfClosing);
      this.sawRoot = true;
      this.tags.push(this.tag);
      this.emitNode('onopentag', this.tag);
      if (!selfClosing) {
        if (!this.noscript && this.tagName.toLowerCase() === 'script') {
          this.state = this.S.SCRIPT;
        } else {
          this.state = this.S.TEXT;
        }
        this.tag = null;
        this.tagName = '';
      }
      this.attribName = this.attribValue = '';
      this.attribList.length = 0;
    }
  }, {
    key: "closeTag",
    value: function closeTag() {
      var _this = this;
      if (!this.tagName) {
        this.strictFail('Weird empty close tag.');
        this.textNode += '</>';
        this.state = this.S.TEXT;
        return;
      }
      if (this.script) {
        if (this.tagName !== 'script') {
          this.script += "</".concat(this.tagName, ">");
          this.tagName = '';
          this.state = this.S.SCRIPT;
          return;
        }
        this.emitNode('onscript', this.script);
        this.script = '';
      }
      var t = this.tags.length;
      var tagName = this.tagName;
      if (!this.strict) {
        tagName = tagName[this.looseCase]();
      }
      while (t--) {
        var close = this.tags[t];
        if (close.name !== tagName) {
          this.strictFail('Unexpected close tag');
        } else {
          break;
        }
      }
      if (t < 0) {
        this.strictFail("Unmatched closing tag: ".concat(this.tagName));
        this.textNode += "</".concat(this.tagName, ">");
        this.state = this.S.TEXT;
        return;
      }
      this.tagName = tagName;
      var s = this.tags.length;
      var _loop = function _loop() {
        var tag = _this.tag = _this.tags.pop();
        _this.tagName = _this.tag.name;
        _this.emitNode('onclosetag', _this.tagName);
        var x = {};
        for (var i in tag.ns) {
          if (tag.ns.hasOwnProperty(i)) {
            x[i] = tag.ns[i];
          }
        }
        var parent = _this.tags[_this.tags.length - 1] || _this;
        if (_this.opt.xmlns && tag.ns !== parent.ns) {
          var that = _this;
          Object.keys(tag.ns).forEach(function (p) {
            var n = tag.ns[p];
            that.emitNode('onclosenamespace', {
              prefix: p,
              uri: n
            });
          });
        }
      };
      while (s-- > t) {
        _loop();
      }
      if (t === 0) this.closedRoot = true;
      this.tagName = this.attribValue = this.attribName = '';
      this.attribList.length = 0;
      this.state = this.S.TEXT;
    }
  }], [{
    key: "charAt",
    value: function charAt(chunk, i) {
      var result = '';
      if (i < chunk.length) {
        result = chunk.charAt(i);
      }
      return result;
    }
  }, {
    key: "isWhitespace",
    value: function isWhitespace(c) {
      return c === ' ' || c === '\n' || c === '\r' || c === '\t';
    }
  }, {
    key: "isQuote",
    value: function isQuote(c) {
      return c === '"' || c === "'";
    }
  }, {
    key: "isAttribEnd",
    value: function isAttribEnd(c) {
      return c === '>' || SAX.isWhitespace(c);
    }
  }, {
    key: "isMatch",
    value: function isMatch(regex, c) {
      return regex.test(c);
    }
  }, {
    key: "notMatch",
    value: function notMatch(regex, c) {
      return !SAX.isMatch(regex, c);
    }
  }, {
    key: "qname",
    value: function qname(name, attribute) {
      var i = name.indexOf(':');
      var qualName = i < 0 ? ['', name] : name.split(':');
      var prefix = qualName[0];
      var local = qualName[1];
      if (attribute && name === 'xmlns') {
        prefix = 'xmlns';
        local = '';
      }
      return {
        prefix: prefix,
        local: local
      };
    }
  }]);
  return SAX;
}();
var SAXParser = function (_SAX) {
  (0, _inherits2.default)(SAXParser, _SAX);
  var _super = _createSuper(SAXParser);
  function SAXParser(opt) {
    var _this2;
    (0, _classCallCheck2.default)(this, SAXParser);
    _this2 = _super.call(this);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this2), "opt", DEFAULT_SAX_PARSER_OPTIONS);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this2), "events", DEFAULT_SAX_EVENTS);
    _this2.clearBuffers();
    _this2.opt = opt = _objectSpread(_objectSpread({}, _this2.opt), opt);
    _this2.events = _objectSpread(_objectSpread({}, _this2.events), opt);
    _this2.q = _this2.c = '';
    _this2.opt.lowercase = _this2.opt.lowercase || _this2.opt.lowercasetags;
    _this2.bufferCheckPosition = _this2.opt.MAX_BUFFER_LENGTH;
    _this2.looseCase = _this2.opt.lowercase ? 'toLowerCase' : 'toUpperCase';
    _this2.tags = [];
    _this2.closed = _this2.closedRoot = _this2.sawRoot = false;
    _this2.tag = _this2.error = null;
    _this2.strict = Boolean(_this2.opt.strict);
    _this2.noscript = Boolean(_this2.opt.strict || _this2.opt.noscript);
    _this2.state = _this2.S.BEGIN;
    _this2.strictEntities = _this2.opt.strictEntities;
    _this2.ENTITIES = _this2.strictEntities ? Object.create(_this2.XML_ENTITIES) : Object.create(_this2.ENTITIES);
    _this2.attribList = [];
    if (_this2.opt.xmlns) {
      _this2.ns = Object.create(_this2.rootNS);
    }
    _this2.trackPosition = _this2.opt.position !== false;
    if (_this2.trackPosition) {
      _this2.position = _this2.line = _this2.column = 0;
    }
    _this2.emit('onready');
    return _this2;
  }
  (0, _createClass2.default)(SAXParser, [{
    key: "resume",
    value: function resume() {
      this.error = null;
      return this;
    }
  }, {
    key: "close",
    value: function close() {
      return this.write(null);
    }
  }, {
    key: "flush",
    value: function flush() {
      this.flushBuffers();
    }
  }]);
  return SAXParser;
}(SAX);
exports.SAXParser = SAXParser;
(0, _defineProperty2.default)(SAXParser, "ENTITIES", ENTITIES);
//# sourceMappingURL=sax.js.map