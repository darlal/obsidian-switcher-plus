'use strict';

var obsidian = require('obsidian');

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
});

function __exportStar(m, o) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
};

function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
}

function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
}

function __classPrivateFieldSet(receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
}

var DefaultConfig = {
    editorListCommand: 'edt ',
    symbolListCommand: '@',
    excludeViewTypes: ['empty'],
};
function getDefaultData() {
    return {
        alwaysNewPaneForSymbols: false,
        symbolsInLineOrder: true,
    };
}
var SwitcherPlusSettings = /** @class */ (function () {
    function SwitcherPlusSettings(plugin) {
        this.plugin = plugin;
        this.data = getDefaultData();
    }
    Object.defineProperty(SwitcherPlusSettings.prototype, "alwaysNewPaneForSymbols", {
        get: function () {
            var data = this.data;
            return data.alwaysNewPaneForSymbols;
        },
        set: function (value) {
            var data = this.data;
            data.alwaysNewPaneForSymbols = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SwitcherPlusSettings.prototype, "symbolsInlineOrder", {
        get: function () {
            var data = this.data;
            return data.symbolsInLineOrder;
        },
        set: function (value) {
            var data = this.data;
            data.symbolsInLineOrder = value;
        },
        enumerable: false,
        configurable: true
    });
    SwitcherPlusSettings.prototype.loadSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var plugin, _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        plugin = this.plugin;
                        _a = this;
                        _c = (_b = Object).assign;
                        _d = [getDefaultData()];
                        return [4 /*yield*/, plugin.loadData()];
                    case 1:
                        _a.data = _c.apply(_b, _d.concat([_e.sent()]));
                        return [2 /*return*/];
                }
            });
        });
    };
    SwitcherPlusSettings.prototype.saveSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, plugin, data;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this, plugin = _a.plugin, data = _a.data;
                        if (!(plugin && data)) return [3 /*break*/, 2];
                        return [4 /*yield*/, plugin.saveData(data)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return SwitcherPlusSettings;
}());

var SwitcherPlusSettingTab = /** @class */ (function (_super) {
    __extends(SwitcherPlusSettingTab, _super);
    function SwitcherPlusSettingTab(app, plugin, settings) {
        var _this = _super.call(this, app, plugin) || this;
        _this.settings = settings;
        return _this;
    }
    SwitcherPlusSettingTab.prototype.display = function () {
        var _a = this, containerEl = _a.containerEl, settings = _a.settings;
        containerEl.empty();
        SwitcherPlusSettingTab.setAlwaysNewPaneForSymbols(containerEl, settings);
        SwitcherPlusSettingTab.setSymbolsInLineOrder(containerEl, settings);
    };
    SwitcherPlusSettingTab.setAlwaysNewPaneForSymbols = function (containerEl, settings) {
        new obsidian.Setting(containerEl)
            .setName('Open Symbols in new pane')
            .setDesc('Enabled, always open a new pane when navigating to Symbols. Disabled, navigate in an already open pane (if one exists)')
            .addToggle(function (toggle) {
            return toggle.setValue(settings.alwaysNewPaneForSymbols).onChange(function (value) {
                settings.alwaysNewPaneForSymbols = value;
                settings.saveSettings();
            });
        });
    };
    SwitcherPlusSettingTab.setSymbolsInLineOrder = function (containerEl, settings) {
        new obsidian.Setting(containerEl)
            .setName('List symbols in order they appear')
            .setDesc('Enabled, symbols will be displayed in the (line) order they appear in the source text, indented under any preceding heading. Disabled, symbols will be grouped by type: Headings, Tags, Links, Embeds.')
            .addToggle(function (toggle) {
            return toggle.setValue(settings.symbolsInlineOrder).onChange(function (value) {
                settings.symbolsInlineOrder = value;
                settings.saveSettings();
            });
        });
    };
    return SwitcherPlusSettingTab;
}(obsidian.PluginSettingTab));

function isOfType(obj, discriminator, val) {
    var ret = false;
    if (obj && obj[discriminator] !== undefined) {
        ret = true;
        if (val !== undefined && val !== obj[discriminator]) {
            ret = false;
        }
    }
    return ret;
}
function isSymbolSuggestion(obj) {
    return isOfType(obj, 'type', 'Symbol');
}
function isEditorSuggestion(obj) {
    return isOfType(obj, 'type', 'Editor');
}
function isSystemSuggestion(obj) {
    return isOfType(obj, 'file');
}
function isHeadingCache(obj) {
    return isOfType(obj, 'level');
}

var Mode;
(function (Mode) {
    Mode[Mode["Standard"] = 1] = "Standard";
    Mode[Mode["EditorList"] = 2] = "EditorList";
    Mode[Mode["SymbolList"] = 4] = "SymbolList";
})(Mode || (Mode = {}));
var SymbolType;
(function (SymbolType) {
    SymbolType[SymbolType["Link"] = 1] = "Link";
    SymbolType[SymbolType["Embed"] = 2] = "Embed";
    SymbolType[SymbolType["Tag"] = 4] = "Tag";
    SymbolType[SymbolType["Heading"] = 8] = "Heading";
})(SymbolType || (SymbolType = {}));
var SymbolIndicators = {};
SymbolIndicators[SymbolType.Link] = '🔗';
SymbolIndicators[SymbolType.Embed] = '!';
SymbolIndicators[SymbolType.Tag] = '#';
SymbolIndicators[SymbolType.Heading] = 'H';
var HeadingIndicators = {};
HeadingIndicators[1] = 'H₁';
HeadingIndicators[2] = 'H₂';
HeadingIndicators[3] = 'H₃';
HeadingIndicators[4] = 'H₄';
HeadingIndicators[5] = 'H₅';
HeadingIndicators[6] = 'H₆';

var ReferenceViews = ['backlink', 'outline', 'localgraph'];
function fileFromView(view) {
    var _a;
    return (_a = view) === null || _a === void 0 ? void 0 : _a.file;
}
var ModeHandler = /** @class */ (function () {
    function ModeHandler(app, settings, scope, chooser, modalContainerEl) {
        this.app = app;
        this.settings = settings;
        this.scope = scope;
        this.chooser = chooser;
        this.modalContainerEl = modalContainerEl;
        this._mode = Mode.Standard;
        this.isOpen = false;
        this.symbolTarget = null;
        this.hasSearchTerm = false;
        scope.register(['Ctrl'], 'n', this.navigateItems.bind(this));
        scope.register(['Ctrl'], 'p', this.navigateItems.bind(this));
    }
    Object.defineProperty(ModeHandler.prototype, "mode", {
        get: function () {
            return this._mode;
        },
        enumerable: false,
        configurable: true
    });
    ModeHandler.prototype.openInMode = function (mode) {
        this._mode = mode !== null && mode !== void 0 ? mode : Mode.Standard;
        if (mode === Mode.SymbolList) {
            this.symbolTarget = null;
        }
    };
    ModeHandler.prototype.onOpen = function () {
        this.isOpen = true;
        var val = '';
        var mode = this.mode;
        if (mode === Mode.EditorList) {
            val = DefaultConfig.editorListCommand;
        }
        else if (mode === Mode.SymbolList) {
            val = DefaultConfig.symbolListCommand;
        }
        if (mode !== Mode.Standard) {
            this.chooser.setSuggestions([]);
        }
        return val;
    };
    ModeHandler.prototype.onClose = function () {
        this.isOpen = false;
    };
    ModeHandler.prototype.onInput = function (input) {
        var chooser = this.chooser;
        var currentSuggestion = chooser.values[chooser.selectedItem];
        var mode = this.parseInput(input, currentSuggestion);
        this.updateHelperTextForMode(this.modalContainerEl);
        this.updateKeymapForMode(mode);
        return mode;
    };
    ModeHandler.prototype.updateSuggestions = function (input) {
        var suggestions = this.getSuggestions(input);
        this.chooser.setSuggestions(suggestions);
    };
    ModeHandler.prototype.onChooseSuggestion = function (sugg) {
        if (isEditorSuggestion(sugg)) {
            var item = sugg.item;
            this.app.workspace.setActiveLeaf(item);
            item.view.setEphemeralState({ focus: true });
        }
        else {
            this.navigateToSymbol(sugg);
        }
    };
    ModeHandler.prototype.renderSuggestion = function (sugg, parentEl) {
        var containerEl = parentEl;
        if (isSymbolSuggestion(sugg)) {
            var item = sugg.item;
            if (this.settings.symbolsInlineOrder && !this.hasSearchTerm) {
                parentEl.addClass("qsp-symbol-l" + item.indentLevel);
            }
            ModeHandler.addSymbolIndicator(item, containerEl);
            containerEl = createSpan({
                cls: 'qsp-symbol-text',
                parent: containerEl,
            });
        }
        var text = ModeHandler.getItemText(sugg.item);
        obsidian.renderResults(containerEl, text, sugg.match);
    };
    ModeHandler.prototype.navigateItems = function (_evt, ctx) {
        var _a = this, isOpen = _a.isOpen, chooser = _a.chooser;
        if (isOpen) {
            var isNext = ctx.key === 'n';
            var index = chooser.selectedItem;
            chooser.setSelectedItem(isNext ? index + 1 : index - 1);
        }
        return false;
    };
    ModeHandler.prototype.parseInput = function (input, currentSuggestion) {
        var editorListCommand = DefaultConfig.editorListCommand, symbolListCommand = DefaultConfig.symbolListCommand;
        // determine if the editor command exists and if it's valid
        var hasEditorCmdPrefix = input.indexOf(editorListCommand) === 0;
        // get the index of symbol command and determine if it exists
        var symbolCmdIndex = input.indexOf(symbolListCommand);
        var hasSymbolCmd = symbolCmdIndex !== -1;
        var hasSymbolCmdPrefix = symbolCmdIndex === 0;
        // determine if the chooser is showing suggestions, and if so, is the
        // currently selected suggestion a valid target for symbols
        var currentSuggInfo = ModeHandler.getSelectedSuggestionInfo(hasSymbolCmd, currentSuggestion);
        // determine if the current active editor pane a valid target for symbols
        var activeEditorInfo = this.getActiveEditorInfo(hasSymbolCmdPrefix, currentSuggInfo.isValidSymbolTarget);
        return this.setupRunMode(hasEditorCmdPrefix, hasSymbolCmd, currentSuggInfo, activeEditorInfo);
    };
    ModeHandler.prototype.getActiveEditorInfo = function (hasSymbolCmdPrefix, isCurrentSuggValidSymbolTarget) {
        var _a = this.app.workspace, activeLeaf = _a.activeLeaf, view = _a.activeLeaf.view;
        var excludeViewTypes = DefaultConfig.excludeViewTypes;
        // determine if the current active editor pane is valid
        var isCurrentEditorValid = !excludeViewTypes.includes(view.getViewType());
        // whether or not the current active editor can be used as the target for
        // symbol search
        var isValidSymbolTarget = hasSymbolCmdPrefix &&
            !isCurrentSuggValidSymbolTarget &&
            isCurrentEditorValid &&
            !!fileFromView(view);
        return { isValidSymbolTarget: isValidSymbolTarget, currentEditor: activeLeaf };
    };
    ModeHandler.getSelectedSuggestionInfo = function (hasSymbolCmd, currentSuggestion) {
        var activeSugg = currentSuggestion;
        if (hasSymbolCmd && isSymbolSuggestion(activeSugg)) {
            // symbol suggestions don't point to a file and can't
            //themselves be used for symbol suggestions
            activeSugg = null;
        }
        // whether or not the current suggestion can be used for symbol search
        var isValidSymbolTarget = !!activeSugg;
        return { currentSuggestion: activeSugg, isValidSymbolTarget: isValidSymbolTarget };
    };
    ModeHandler.prototype.setupRunMode = function (hasEditorCmdPrefix, hasSymbolCmd, currentSuggInfo, activeEditorInfo) {
        var _a = this, mode = _a.mode, symbolTarget = _a.symbolTarget;
        if (hasSymbolCmd) {
            mode = Mode.SymbolList;
            symbolTarget = ModeHandler.getTargetForSymbolMode(mode, currentSuggInfo, activeEditorInfo, symbolTarget);
        }
        else if (hasEditorCmdPrefix) {
            mode = Mode.EditorList;
            symbolTarget = null;
        }
        else {
            mode = Mode.Standard;
            symbolTarget = null;
        }
        this.symbolTarget = symbolTarget;
        this._mode = mode;
        return mode;
    };
    ModeHandler.prototype.updateHelperTextForMode = function (containerEl) {
        var mode = this.mode;
        var selector = '.prompt-instructions';
        var el = containerEl.querySelector(selector);
        if (el) {
            el.style.display = mode === Mode.Standard ? '' : 'none';
        }
    };
    ModeHandler.prototype.updateKeymapForMode = function (mode) {
        var keys = this.scope.keys;
        var _a = this.backupKeys, backupKeys = _a === void 0 ? [] : _a;
        if (mode === Mode.Standard) {
            if (backupKeys.length) {
                backupKeys.forEach(function (key) { return keys.push(key); });
            }
            backupKeys = undefined;
        }
        else {
            // unregister unused hotkeys for custom modes
            for (var i = keys.length - 1; i >= 0; --i) {
                var key = keys[i];
                if (key.key === 'Enter' &&
                    (key.modifiers === 'Meta' || key.modifiers === 'Shift')) {
                    keys.splice(i, 1);
                    backupKeys.push(key);
                }
            }
        }
        this.backupKeys = backupKeys;
    };
    ModeHandler.getTargetForSymbolMode = function (mode, currentSuggInfo, activeEditorInfo, oldSymbolTarget) {
        // wether or not a symbol target file exists. Indicates that the previous
        // operation was a symbol operation
        var hasExistingSymbolTarget = mode === Mode.SymbolList && !!oldSymbolTarget;
        var symbolTarget = oldSymbolTarget;
        if (currentSuggInfo.isValidSymbolTarget) {
            symbolTarget = ModeHandler.targetFromSuggestion(currentSuggInfo.currentSuggestion);
        }
        else if (!hasExistingSymbolTarget && activeEditorInfo.isValidSymbolTarget) {
            var leaf = activeEditorInfo.currentEditor;
            var file = fileFromView(leaf.view);
            symbolTarget = { file: file, leaf: leaf };
        }
        return symbolTarget;
    };
    ModeHandler.targetFromSuggestion = function (sugg) {
        var file = null, leaf = null, ret = null;
        if (!isSymbolSuggestion(sugg)) {
            if (isSystemSuggestion(sugg)) {
                file = sugg.file;
            }
            else {
                leaf = sugg.item;
                file = fileFromView(leaf.view);
            }
            ret = { file: file, leaf: leaf };
        }
        return ret;
    };
    ModeHandler.extractSearchQuery = function (input, mode) {
        if (input === void 0) { input = ''; }
        var editorListCommand = DefaultConfig.editorListCommand, symbolListCommand = DefaultConfig.symbolListCommand;
        var startIndex = 0;
        if (mode === Mode.SymbolList) {
            var symbolCmdIndex = input.indexOf(symbolListCommand);
            startIndex = symbolCmdIndex + symbolListCommand.length;
        }
        else if (mode === Mode.EditorList) {
            startIndex = editorListCommand.length;
        }
        var queryStr = input.slice(startIndex).trim().toLowerCase();
        return obsidian.prepareQuery(queryStr);
    };
    ModeHandler.prototype.getSuggestions = function (input) {
        var _a;
        var _b = this, mode = _b.mode, symbolTarget = _b.symbolTarget;
        var suggestions = [];
        var prepQuery = ModeHandler.extractSearchQuery(input, mode);
        var hasSearchTerm = ((_a = prepQuery === null || prepQuery === void 0 ? void 0 : prepQuery.query) === null || _a === void 0 ? void 0 : _a.length) > 0;
        this.hasSearchTerm = hasSearchTerm;
        var items = this.getItems(mode, symbolTarget);
        var push = function (item, match) {
            if (item instanceof obsidian.WorkspaceLeaf) {
                suggestions.push({ type: 'Editor', item: item, match: match });
            }
            else {
                suggestions.push({ type: 'Symbol', item: item, match: match });
            }
        };
        items.forEach(function (item) {
            var match = null;
            if (hasSearchTerm) {
                var text = ModeHandler.getItemText(item);
                match = obsidian.fuzzySearch(prepQuery, text);
                if (match) {
                    push(item, match);
                }
            }
            else {
                push(item, null);
            }
        });
        if (hasSearchTerm) {
            obsidian.sortSearchResults(suggestions);
        }
        return suggestions;
    };
    ModeHandler.prototype.getItems = function (mode, symbolTarget) {
        var items;
        if (mode === Mode.EditorList) {
            items = this.getOpenRootSplits();
        }
        else if (mode === Mode.SymbolList) {
            items = this.getSymbolsForTarget(symbolTarget);
        }
        return items;
    };
    ModeHandler.prototype.getOpenRootSplits = function () {
        var workspace = this.app.workspace;
        var leaves = [];
        var saveLeaf = function (l) {
            if (!DefaultConfig.excludeViewTypes.includes(l.view.getViewType())) {
                leaves.push(l);
            }
        };
        workspace.iterateLeaves(saveLeaf, workspace.rootSplit);
        return leaves;
    };
    ModeHandler.prototype.getSymbolsForTarget = function (symbolTarget) {
        var metadataCache = this.app.metadataCache;
        var ret = [];
        if (symbolTarget && symbolTarget.file) {
            var file = symbolTarget.file;
            var symbolData = metadataCache.getFileCache(file);
            if (symbolData) {
                var push = function (symbols, type) {
                    if (symbols === void 0) { symbols = []; }
                    symbols.forEach(function (symbol) { return ret.push({ symbol: symbol, type: type }); });
                };
                push(symbolData.headings, SymbolType.Heading);
                push(symbolData.tags, SymbolType.Tag);
                push(symbolData.links, SymbolType.Link);
                push(symbolData.embeds, SymbolType.Embed);
            }
        }
        return this.settings.symbolsInlineOrder && !this.hasSearchTerm
            ? this.orderSymbolsByLineNumber(ret)
            : ret;
    };
    ModeHandler.prototype.orderSymbolsByLineNumber = function (symbols) {
        if (symbols === void 0) { symbols = []; }
        var sorted = symbols.sort(function (a, b) {
            var aStart = a.symbol.position.start;
            var bStart = b.symbol.position.start;
            var lineDiff = aStart.line - bStart.line;
            return lineDiff === 0 ? aStart.col - bStart.col : lineDiff;
        });
        var currIndentLevel = 0;
        sorted.forEach(function (si) {
            var indentLevel = 0;
            if (isHeadingCache(si.symbol)) {
                currIndentLevel = si.symbol.level;
                indentLevel = si.symbol.level - 1;
            }
            else {
                indentLevel = currIndentLevel;
            }
            si.indentLevel = indentLevel;
        });
        return sorted;
    };
    ModeHandler.getItemText = function (item) {
        var text;
        if (item instanceof obsidian.WorkspaceLeaf) {
            text = item.getDisplayText();
        }
        else {
            text = ModeHandler.getSuggestionTextForSymbol(item);
        }
        return text;
    };
    ModeHandler.getSuggestionTextForSymbol = function (symbolInfo) {
        var symbol = symbolInfo.symbol;
        var text;
        if (isHeadingCache(symbol)) {
            text = symbol.heading;
        }
        else if (isOfType(symbol, 'tag')) {
            text = symbol.tag.slice(1);
        }
        else {
            var refCache = symbol;
            (text = refCache.link);
            var displayText = refCache.displayText;
            if (displayText && displayText !== text) {
                text += "|" + displayText;
            }
        }
        return text;
    };
    ModeHandler.prototype.navigateToSymbol = function (sugg) {
        var workspace = this.app.workspace;
        // determine if the target is already open in a pane
        var _a = this.findOpenEditorMatchingSymbolTarget(), leaf = _a.leaf, path = _a.file.path;
        var _b = sugg.item.symbol.position, _c = _b.start, line = _c.line, col = _c.col, endLoc = _b.end;
        // object containing the state information for the target editor,
        // start with the range to highlight in target editor
        var eState = {
            startLoc: { line: line, col: col },
            endLoc: endLoc,
            line: line,
            focus: true,
            cursor: {
                from: { line: line, ch: col },
                to: { line: line, ch: col },
            },
        };
        if (leaf && !this.settings.alwaysNewPaneForSymbols) {
            // activate the already open pane, and set state
            workspace.setActiveLeaf(leaf, true);
            leaf.view.setEphemeralState(eState);
        }
        else {
            workspace.openLinkText(path, '', true, { eState: eState });
        }
    };
    ModeHandler.prototype.findOpenEditorMatchingSymbolTarget = function () {
        var _a = this.symbolTarget, file = _a.file, leaf = _a.leaf;
        var isTargetLeaf = !!leaf;
        var predicate = function (l) {
            var val = false;
            var isRefView = ReferenceViews.includes(l.view.getViewType());
            var isTargetRefView = isTargetLeaf && ReferenceViews.includes(leaf.view.getViewType());
            if (!isRefView) {
                val =
                    isTargetLeaf && !isTargetRefView ? l === leaf : fileFromView(l.view) === file;
            }
            return val;
        };
        var l = this.getOpenRootSplits().find(predicate);
        return { leaf: l, file: file };
    };
    ModeHandler.addSymbolIndicator = function (symbolInfo, parentEl) {
        var type = symbolInfo.type, symbol = symbolInfo.symbol;
        var indicator;
        if (isHeadingCache(symbol)) {
            indicator = HeadingIndicators[symbol.level];
        }
        else {
            indicator = SymbolIndicators[type];
        }
        createDiv({
            text: indicator,
            cls: 'qsp-symbol-indicator',
            parent: parentEl,
        });
    };
    return ModeHandler;
}());

var QUICK_SWITCHER_ID = 'switcher';
function getSystemSwitcher(app) {
    var switcher = app.internalPlugins.getPluginById(QUICK_SWITCHER_ID);
    if (!switcher) {
        return null;
    }
    return switcher.instance.modal.constructor;
}
function createSwitcherPlus(app, settings) {
    var systemSwitcher = getSystemSwitcher(app);
    if (systemSwitcher === null) {
        return null;
    }
    var switcherPlusClass = /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1(app, settings) {
            var _this = _super.call(this, app) || this;
            _this.exMode = new ModeHandler(app, settings, _this.scope, _this.chooser, _this.containerEl);
            return _this;
        }
        class_1.prototype.openInMode = function (mode) {
            this.exMode.openInMode(mode);
            this.open();
        };
        class_1.prototype.onOpen = function () {
            this.isOpen = true;
            var value = this.exMode.onOpen();
            this.inputEl.value = value;
            this.inputEl.focus();
            this.onInput();
        };
        class_1.prototype.onClose = function () {
            _super.prototype.onClose.call(this);
            this.exMode.onClose();
        };
        class_1.prototype.onInput = function () {
            var _a = this, exMode = _a.exMode, value = _a.inputEl.value;
            exMode.onInput(value);
            _super.prototype.onInput.call(this);
        };
        class_1.prototype.updateSuggestions = function () {
            var exMode = this.exMode;
            if (exMode.mode === Mode.Standard) {
                _super.prototype.updateSuggestions.call(this);
            }
            else {
                exMode.updateSuggestions(this.inputEl.value);
            }
        };
        class_1.prototype.onChooseSuggestion = function (item, evt) {
            var exMode = this.exMode;
            if (isOfType(item, 'file') || exMode.mode === Mode.Standard) {
                _super.prototype.onChooseSuggestion.call(this, item, evt);
            }
            else {
                this.exMode.onChooseSuggestion(item);
            }
        };
        class_1.prototype.renderSuggestion = function (value, parentEl) {
            var exMode = this.exMode;
            if (isOfType(value, 'file') || exMode.mode === Mode.Standard) {
                _super.prototype.renderSuggestion.call(this, value, parentEl);
            }
            else {
                this.exMode.renderSuggestion(value, parentEl);
            }
        };
        return class_1;
    }(systemSwitcher));
    return new switcherPlusClass(app, settings);
}

var SwitcherPlusPlugin = /** @class */ (function (_super) {
    __extends(SwitcherPlusPlugin, _super);
    function SwitcherPlusPlugin() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SwitcherPlusPlugin.prototype.onload = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        settings = new SwitcherPlusSettings(this);
                        return [4 /*yield*/, settings.loadSettings()];
                    case 1:
                        _a.sent();
                        this.settings = settings;
                        this.addSettingTab(new SwitcherPlusSettingTab(this.app, this, settings));
                        this.registerCommand('switcher-plus:open', 'Open', Mode.Standard);
                        this.registerCommand('switcher-plus:open-editors', 'Open in Editor Mode', Mode.EditorList);
                        this.registerCommand('switcher-plus:open-symbols', 'Open in Symbol Mode', Mode.SymbolList);
                        return [2 /*return*/];
                }
            });
        });
    };
    SwitcherPlusPlugin.prototype.onunload = function () {
        this.modal = null;
    };
    SwitcherPlusPlugin.prototype.registerCommand = function (id, name, mode) {
        var _this = this;
        this.addCommand({
            id: id,
            name: name,
            hotkeys: [],
            checkCallback: function (checking) {
                var modal = _this.getModal();
                if (modal) {
                    if (!checking) {
                        modal.openInMode(mode);
                    }
                    return true;
                }
                return false;
            },
        });
    };
    SwitcherPlusPlugin.prototype.getModal = function () {
        var modal = this.modal;
        var _a = this, app = _a.app, settings = _a.settings;
        if (modal) {
            return modal;
        }
        modal = createSwitcherPlus(app, settings);
        this.modal = modal;
        return modal;
    };
    return SwitcherPlusPlugin;
}(obsidian.Plugin));

module.exports = SwitcherPlusPlugin;
