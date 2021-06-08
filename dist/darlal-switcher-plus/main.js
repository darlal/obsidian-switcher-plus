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
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
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

/** @deprecated */
function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

/** @deprecated */
function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

function __spreadArray(to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
}

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

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
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
        showExistingOnly: false,
    };
}
var SwitcherPlusSettings = /** @class */ (function () {
    function SwitcherPlusSettings(plugin) {
        this.plugin = plugin;
        this.data = getDefaultData();
    }
    Object.defineProperty(SwitcherPlusSettings.prototype, "alwaysNewPaneForSymbols", {
        get: function () {
            return this.data.alwaysNewPaneForSymbols;
        },
        set: function (value) {
            this.data.alwaysNewPaneForSymbols = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SwitcherPlusSettings.prototype, "symbolsInlineOrder", {
        get: function () {
            return this.data.symbolsInLineOrder;
        },
        set: function (value) {
            this.data.symbolsInLineOrder = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SwitcherPlusSettings.prototype, "showExistingOnly", {
        get: function () {
            return this.data.showExistingOnly;
        },
        set: function (value) {
            this.data.showExistingOnly = value;
        },
        enumerable: false,
        configurable: true
    });
    SwitcherPlusSettings.prototype.loadSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var plugin, savedData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        plugin = this.plugin;
                        return [4 /*yield*/, plugin.loadData()];
                    case 1:
                        savedData = (_a.sent());
                        this.data = __assign(__assign({}, getDefaultData()), savedData);
                        return [2 /*return*/];
                }
            });
        });
    };
    SwitcherPlusSettings.prototype.saveSettings = function () {
        var _a = this, plugin = _a.plugin, data = _a.data;
        if (plugin && data) {
            plugin.saveData(data).catch(function () {
                console.log('Switcher++: Error saving settings data');
            });
        }
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
        SwitcherPlusSettingTab.setShowExistingOnly(containerEl, settings);
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
    SwitcherPlusSettingTab.setShowExistingOnly = function (containerEl, settings) {
        new obsidian.Setting(containerEl)
            .setName('Show existing only')
            .setDesc('Whether to show links to files that are not yet created.')
            .addToggle(function (toggle) {
            return toggle.setValue(settings.showExistingOnly).onChange(function (value) {
                settings.showExistingOnly = value;
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
function isFileSuggestion(obj) {
    return isOfType(obj, 'type', 'file');
}
function isAliasSuggestion(obj) {
    return isOfType(obj, 'type', 'alias');
}
function isUnresolvedSuggestion(obj) {
    return isOfType(obj, 'type', 'unresolved');
}
function isSystemSuggestion(obj) {
    return isFileSuggestion(obj) || isUnresolvedSuggestion(obj) || isAliasSuggestion(obj);
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
    function ModeHandler(app, settings) {
        this.app = app;
        this.settings = settings;
        this._mode = Mode.Standard;
        this.symbolTarget = null;
        this.hasSearchTerm = false;
    }
    Object.defineProperty(ModeHandler.prototype, "mode", {
        get: function () {
            return this._mode;
        },
        enumerable: false,
        configurable: true
    });
    ModeHandler.prototype.reset = function () {
        this.symbolTarget = null;
    };
    ModeHandler.prototype.getCommandStringForMode = function (mode) {
        var val = '';
        if (mode === Mode.EditorList) {
            val = DefaultConfig.editorListCommand;
        }
        else if (mode === Mode.SymbolList) {
            val = DefaultConfig.symbolListCommand;
        }
        return val;
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
    ModeHandler.prototype.determineRunMode = function (input, activeSuggestion) {
        var editorListCommand = DefaultConfig.editorListCommand, symbolListCommand = DefaultConfig.symbolListCommand;
        // determine if the editor command exists and if it's valid
        var hasEditorCmdPrefix = input.indexOf(editorListCommand) === 0;
        // get the index of symbol command and determine if it exists
        var symbolCmdIndex = input.indexOf(symbolListCommand);
        var hasSymbolCmd = symbolCmdIndex !== -1;
        var hasSymbolCmdPrefix = symbolCmdIndex === 0;
        // determine if the chooser is showing suggestions, and if so, is the
        // currently selected suggestion a valid target for symbols
        var activeSuggInfo = ModeHandler.getActiveSuggestionInfo(hasSymbolCmd, activeSuggestion);
        // determine if the current active editor pane a valid target for symbols
        var activeEditorInfo = this.getActiveEditorInfo(hasSymbolCmdPrefix, activeSuggInfo.isValidSymbolTarget);
        return this.setupRunMode(hasEditorCmdPrefix, hasSymbolCmd, activeSuggInfo, activeEditorInfo);
    };
    ModeHandler.prototype.getActiveEditorInfo = function (hasSymbolCmdPrefix, isActiveSuggValidSymbolTarget) {
        var _a = this.app.workspace, activeLeaf = _a.activeLeaf, view = _a.activeLeaf.view;
        var excludeViewTypes = DefaultConfig.excludeViewTypes;
        // determine if the current active editor pane is valid
        var isCurrentEditorValid = !excludeViewTypes.includes(view.getViewType());
        // whether or not the current active editor can be used as the target for
        // symbol search
        var isValidSymbolTarget = hasSymbolCmdPrefix &&
            !isActiveSuggValidSymbolTarget &&
            isCurrentEditorValid &&
            !!fileFromView(view);
        return { isValidSymbolTarget: isValidSymbolTarget, editor: activeLeaf };
    };
    ModeHandler.getActiveSuggestionInfo = function (hasSymbolCmd, activeSuggestion) {
        var sugg = activeSuggestion;
        if (hasSymbolCmd && isSymbolSuggestion(sugg)) {
            // symbol suggestions don't point to a file and can't
            //themselves be used for symbol suggestions
            sugg = null;
        }
        // whether or not the current suggestion can be used for symbol search
        var isValidSymbolTarget = !!sugg;
        return { suggestion: sugg, isValidSymbolTarget: isValidSymbolTarget };
    };
    ModeHandler.prototype.setupRunMode = function (hasEditorCmdPrefix, hasSymbolCmd, activeSuggInfo, activeEditorInfo) {
        var _a = this, mode = _a.mode, symbolTarget = _a.symbolTarget;
        if (hasSymbolCmd) {
            mode = Mode.SymbolList;
            symbolTarget = ModeHandler.getTargetForSymbolMode(mode, activeSuggInfo, activeEditorInfo, symbolTarget);
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
    ModeHandler.getTargetForSymbolMode = function (mode, activeSuggInfo, activeEditorInfo, oldSymbolTarget) {
        // wether or not a symbol target file exists. Indicates that the previous
        // operation was a symbol operation
        var hasExistingSymbolTarget = mode === Mode.SymbolList && !!oldSymbolTarget;
        var symbolTarget = oldSymbolTarget;
        if (activeSuggInfo.isValidSymbolTarget) {
            symbolTarget = ModeHandler.targetFromSuggestion(activeSuggInfo.suggestion);
        }
        else if (!hasExistingSymbolTarget && activeEditorInfo.isValidSymbolTarget) {
            var leaf = activeEditorInfo.editor;
            var file = fileFromView(leaf.view);
            symbolTarget = { file: file, leaf: leaf };
        }
        return symbolTarget;
    };
    ModeHandler.targetFromSuggestion = function (sugg) {
        var file = null, leaf = null, ret = null;
        if (!isSymbolSuggestion(sugg) && !isUnresolvedSuggestion(sugg)) {
            if (isEditorSuggestion(sugg)) {
                leaf = sugg.item;
                file = fileFromView(leaf.view);
            }
            else {
                file = sugg.file;
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
        workspace.iterateRootLeaves(saveLeaf);
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
            workspace
                .openLinkText(path, '', true, { eState: eState })
                .catch(function () { return console.log('Switcher++: unable to navigate to symbol'); });
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

var Keymap = /** @class */ (function () {
    function Keymap(scope, chooser, modalContainerEl) {
        this.scope = scope;
        this.chooser = chooser;
        this.modalContainerEl = modalContainerEl;
    }
    Object.defineProperty(Keymap.prototype, "isOpen", {
        get: function () {
            return this._isOpen;
        },
        set: function (value) {
            this._isOpen = value;
        },
        enumerable: false,
        configurable: true
    });
    Keymap.prototype.registerBindings = function () {
        var scope = this.scope;
        scope.register(['Ctrl'], 'n', this.navigateItems.bind(this));
        scope.register(['Ctrl'], 'p', this.navigateItems.bind(this));
    };
    Keymap.prototype.navigateItems = function (_evt, ctx) {
        var _a = this, isOpen = _a.isOpen, chooser = _a.chooser;
        if (isOpen) {
            var isNext = ctx.key === 'n';
            var index = chooser.selectedItem;
            chooser.setSelectedItem(isNext ? index + 1 : index - 1);
        }
        return false;
    };
    Keymap.updateHelperTextForMode = function (mode, containerEl) {
        var selector = '.prompt-instructions';
        var el = containerEl.querySelector(selector);
        if (el) {
            el.style.display = mode === Mode.Standard ? '' : 'none';
        }
    };
    Keymap.prototype.updateKeymapForMode = function (mode) {
        var keys = this.scope.keys;
        var _a = this.backupKeys, backupKeys = _a === void 0 ? [] : _a;
        Keymap.updateHelperTextForMode(mode, this.modalContainerEl);
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
    return Keymap;
}());

var QUICK_SWITCHER_ID = 'switcher';
function getSystemSwitcher(app) {
    var switcher = app.internalPlugins.getPluginById(QUICK_SWITCHER_ID);
    if (!switcher) {
        return null;
    }
    return switcher.instance.modal.constructor;
}
function createSwitcherPlus(app, plugin) {
    var systemSwitcher = getSystemSwitcher(app);
    if (systemSwitcher === null) {
        return null;
    }
    var switcherPlusClass = /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1(app, plugin) {
            var _this = _super.call(this, app) || this;
            _this.plugin = plugin;
            _this.openWithCommandStr = null;
            _this.exMode = new ModeHandler(app, plugin.options);
            _this.exKeymap = new Keymap(_this.scope, _this.chooser, _this.containerEl);
            return _this;
        }
        class_1.prototype.openInMode = function (mode) {
            var exMode = this.exMode;
            exMode.reset();
            this.chooser.setSuggestions([]);
            if (mode !== Mode.Standard) {
                this.openWithCommandStr = exMode.getCommandStringForMode(mode);
            }
            this.open();
        };
        class_1.prototype.onOpen = function () {
            this.exKeymap.isOpen = true;
            _super.prototype.onOpen.call(this);
        };
        class_1.prototype.onClose = function () {
            _super.prototype.onClose.call(this);
            this.exKeymap.isOpen = false;
        };
        class_1.prototype.updateSuggestions = function () {
            var _a = this, exMode = _a.exMode, exKeymap = _a.exKeymap, chooser = _a.chooser, openWithCommandStr = _a.openWithCommandStr;
            if (openWithCommandStr !== null && openWithCommandStr !== '') {
                // update UI with current command string in the case were openInMode was called
                this.inputEl.value = openWithCommandStr;
                // reset to null so user input is not overridden the next time onInput is called
                this.openWithCommandStr = null;
            }
            var activeSugg = this.getActiveSuggestion();
            var input = this.inputEl.value;
            var mode = exMode.determineRunMode(input, activeSugg);
            exKeymap.updateKeymapForMode(mode);
            if (mode === Mode.Standard) {
                _super.prototype.updateSuggestions.call(this);
            }
            else {
                chooser.setSuggestions([]);
                var suggestions = exMode.getSuggestions(input);
                chooser.setSuggestions(suggestions);
            }
        };
        class_1.prototype.onChooseSuggestion = function (item, evt) {
            var exMode = this.exMode;
            if (isSystemSuggestion(item) || exMode.mode === Mode.Standard) {
                _super.prototype.onChooseSuggestion.call(this, item, evt);
            }
            else {
                exMode.onChooseSuggestion(item);
            }
        };
        class_1.prototype.renderSuggestion = function (value, parentEl) {
            var exMode = this.exMode;
            if (isSystemSuggestion(value) || exMode.mode === Mode.Standard) {
                _super.prototype.renderSuggestion.call(this, value, parentEl);
            }
            else {
                exMode.renderSuggestion(value, parentEl);
            }
        };
        class_1.prototype.getActiveSuggestion = function () {
            var chooser = this.chooser;
            var activeSuggestion = null;
            if (chooser === null || chooser === void 0 ? void 0 : chooser.values) {
                activeSuggestion = chooser.values[chooser.selectedItem];
            }
            return activeSuggestion;
        };
        return class_1;
    }(systemSwitcher));
    return new switcherPlusClass(app, plugin);
}

var SwitcherPlusPlugin = /** @class */ (function (_super) {
    __extends(SwitcherPlusPlugin, _super);
    function SwitcherPlusPlugin() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SwitcherPlusPlugin.prototype.onload = function () {
        return __awaiter(this, void 0, void 0, function () {
            var options;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        options = new SwitcherPlusSettings(this);
                        return [4 /*yield*/, options.loadSettings()];
                    case 1:
                        _a.sent();
                        this.options = options;
                        this.addSettingTab(new SwitcherPlusSettingTab(this.app, this, options));
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
        if (modal) {
            return modal;
        }
        modal = createSwitcherPlus(this.app, this);
        this.modal = modal;
        return modal;
    };
    return SwitcherPlusPlugin;
}(obsidian.Plugin));

module.exports = SwitcherPlusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsIi4uLy4uL3NyYy9zZXR0aW5ncy9zd2l0Y2hlclBsdXNTZXR0aW5ncy50cyIsIi4uLy4uL3NyYy9zZXR0aW5ncy9zd2l0Y2hlclBsdXNTZXR0aW5nVGFiLnRzIiwiLi4vLi4vc3JjL3V0aWxzLnRzIiwiLi4vLi4vc3JjL3R5cGVzL3NoYXJlZFR5cGVzLnRzIiwiLi4vLi4vc3JjL3N3aXRjaGVyUGx1cy9tb2RlSGFuZGxlci50cyIsIi4uLy4uL3NyYy9zd2l0Y2hlclBsdXMva2V5bWFwLnRzIiwiLi4vLi4vc3JjL3N3aXRjaGVyUGx1cy9zd2l0Y2hlclBsdXMudHMiLCIuLi8uLi9zcmMvbWFpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6bnVsbCwibmFtZXMiOlsiU2V0dGluZyIsIlBsdWdpblNldHRpbmdUYWIiLCJyZW5kZXJSZXN1bHRzIiwicHJlcGFyZVF1ZXJ5IiwiV29ya3NwYWNlTGVhZiIsImZ1enp5U2VhcmNoIiwic29ydFNlYXJjaFJlc3VsdHMiLCJQbHVnaW4iXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksYUFBYSxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNuQyxJQUFJLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYztBQUN6QyxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxZQUFZLEtBQUssSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDcEYsUUFBUSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLE1BQU0sQ0FBQyxT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QVEsU0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO0FBQ3RHLFFBQVEsU0FBUyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFO0FBQ3RILFFBQVEsSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFVBQVUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzlFLEtBQUssQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQUNEO0FBQ08sU0FBUyxXQUFXLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRTtBQUMzQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDckgsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxNQUFNLEtBQUssVUFBVSxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsV0FBVyxFQUFFLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM3SixJQUFJLFNBQVMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sVUFBVSxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3RFLElBQUksU0FBUyxJQUFJLENBQUMsRUFBRSxFQUFFO0FBQ3RCLFFBQVEsSUFBSSxDQUFDLEVBQUUsTUFBTSxJQUFJLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0FBQ3RFLFFBQVEsT0FBTyxDQUFDLEVBQUUsSUFBSTtBQUN0QixZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3pLLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFL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LENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO0FBQ3RGLElBQUksU0FBUyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssWUFBWSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzVILElBQUksU0FBUyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFO0FBQ3RELElBQUksU0FBUyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFO0FBQ3RELElBQUksU0FBUyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN0RixDQUFDO0FBQ0Q7QUFDTyxTQUFTLGdCQUFnQixDQUFDLENBQUMsRUFBRTtBQUNwQyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNiLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsWUFBWSxFQUFFLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDaEosSUFBSSxTQUFTLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQ25KLENBQUM7QUFDRDtBQUNPLFNBQVMsYUFBYSxDQUFDLENBQUMsRUFBRTtBQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLE1BQU0sSUFBSSxTQUFTLENBQUMsc0NBQXNDLENBQUMsQ0FBQztBQUMzRixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxRQUFRLEtBQUssVUFBVSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLFlBQVksRUFBRSxPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDck4sSUFBSSxTQUFTLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxFQUFFLEVBQUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3BLLElBQUksU0FBUyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFO0FBQ2hJLENBQUM7QUFDRDtBQUNPLFNBQVMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtBQUNsRCxJQUFJLElBQUksTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUU7QUFDbkgsSUFBSSxPQUFPLE1BQU0sQ0FBQztBQUNsQixDQUFDLENBQUM7QUFDRjtBQUNBLElBQUksa0JBQWtCLEdBQUcsTUFBTSxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDekQsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDcEIsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQztBQUNGO0FBQ08sU0FBUyxZQUFZLENBQUMsR0FBRyxFQUFFO0FBQ2xDLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRSxPQUFPLEdBQUcsQ0FBQztBQUMxQyxJQUFJLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUNwQixJQUFJLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3SSxJQUFJLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNwQyxJQUFJLE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFDRDtBQUNPLFNBQVMsZUFBZSxDQUFDLEdBQUcsRUFBRTtBQUNyQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDNUQsQ0FBQztBQUNEO0FBQ08sU0FBUyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUU7QUFDakUsSUFBSSxJQUFJLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsTUFBTSxJQUFJLFNBQVMsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO0FBQ2pHLElBQUksSUFBSSxPQUFPLEtBQUssS0FBSyxVQUFVLEdBQUcsUUFBUSxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxJQUFJLFNBQVMsQ0FBQywwRUFBMEUsQ0FBQyxDQUFDO0FBQ3ZMLElBQUksT0FBTyxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNsRyxDQUFDO0FBQ0Q7QUFDTyxTQUFTLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUU7QUFDeEUsSUFBSSxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUUsTUFBTSxJQUFJLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQzVFLElBQUksSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLE1BQU0sSUFBSSxTQUFTLENBQUMsK0NBQStDLENBQUMsQ0FBQztBQUNqRyxJQUFJLElBQUksT0FBTyxLQUFLLEtBQUssVUFBVSxHQUFHLFFBQVEsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sSUFBSSxTQUFTLENBQUMseUVBQXlFLENBQUMsQ0FBQztBQUN0TCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDOUc7O0FDL05PLElBQU0sYUFBYSxHQUFXO0lBQ25DLGlCQUFpQixFQUFFLE1BQU07SUFDekIsaUJBQWlCLEVBQUUsR0FBRztJQUN0QixnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sQ0FBQztDQUM1QixDQUFDO0FBUUYsU0FBUyxjQUFjO0lBQ3JCLE9BQU87UUFDTCx1QkFBdUIsRUFBRSxLQUFLO1FBQzlCLGtCQUFrQixFQUFFLElBQUk7UUFDeEIsZ0JBQWdCLEVBQUUsS0FBSztLQUN4QixDQUFDO0FBQ0osQ0FBQztBQUVEO0lBMkJFLDhCQUFvQixNQUEwQjtRQUExQixXQUFNLEdBQU4sTUFBTSxDQUFvQjtRQUM1QyxJQUFJLENBQUMsSUFBSSxHQUFHLGNBQWMsRUFBRSxDQUFDO0tBQzlCO0lBMUJELHNCQUFJLHlEQUF1QjthQUEzQjtZQUNFLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztTQUMxQzthQUVELFVBQTRCLEtBQWM7WUFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxLQUFLLENBQUM7U0FDM0M7OztPQUpBO0lBTUQsc0JBQUksb0RBQWtCO2FBQXRCO1lBQ0UsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1NBQ3JDO2FBRUQsVUFBdUIsS0FBYztZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztTQUN0Qzs7O09BSkE7SUFNRCxzQkFBSSxrREFBZ0I7YUFBcEI7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7U0FDbkM7YUFFRCxVQUFxQixLQUFjO1lBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1NBQ3BDOzs7T0FKQTtJQVVLLDJDQUFZLEdBQWxCOzs7Ozs7d0JBQ1UsTUFBTSxHQUFLLElBQUksT0FBVCxDQUFVO3dCQUNMLHFCQUFNLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBQTs7d0JBQXBDLFNBQVMsSUFBSSxTQUF1QixDQUFpQjt3QkFDM0QsSUFBSSxDQUFDLElBQUkseUJBQVEsY0FBYyxFQUFFLEdBQUssU0FBUyxDQUFFLENBQUM7Ozs7O0tBQ25EO0lBRUQsMkNBQVksR0FBWjtRQUNRLElBQUEsS0FBbUIsSUFBSSxFQUFyQixNQUFNLFlBQUEsRUFBRSxJQUFJLFVBQVMsQ0FBQztRQUM5QixJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDbEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0JBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLENBQUMsQ0FBQzthQUN2RCxDQUFDLENBQUM7U0FDSjtLQUNGO0lBQ0gsMkJBQUM7QUFBRCxDQUFDOztBQ3hFRDtJQUE0QywwQ0FBZ0I7SUFDMUQsZ0NBQ0UsR0FBUSxFQUNSLE1BQTBCLEVBQ2xCLFFBQThCO1FBSHhDLFlBS0Usa0JBQU0sR0FBRyxFQUFFLE1BQU0sQ0FBQyxTQUNuQjtRQUhTLGNBQVEsR0FBUixRQUFRLENBQXNCOztLQUd2QztJQUVELHdDQUFPLEdBQVA7UUFDUSxJQUFBLEtBQTRCLElBQUksRUFBOUIsV0FBVyxpQkFBQSxFQUFFLFFBQVEsY0FBUyxDQUFDO1FBRXZDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQixzQkFBc0IsQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDekUsc0JBQXNCLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3BFLHNCQUFzQixDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztLQUNuRTtJQUVNLGlEQUEwQixHQUFqQyxVQUNFLFdBQXdCLEVBQ3hCLFFBQThCO1FBRTlCLElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3JCLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQzthQUNuQyxPQUFPLENBQ04sd0hBQXdILENBQ3pIO2FBQ0EsU0FBUyxDQUFDLFVBQUMsTUFBTTtZQUNoQixPQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLENBQUMsUUFBUSxDQUFDLFVBQUMsS0FBSztnQkFDL0QsUUFBUSxDQUFDLHVCQUF1QixHQUFHLEtBQUssQ0FBQztnQkFDekMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO2FBQ3pCLENBQUM7U0FBQSxDQUNILENBQUM7S0FDTDtJQUVNLDRDQUFxQixHQUE1QixVQUNFLFdBQXdCLEVBQ3hCLFFBQThCO1FBRTlCLElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3JCLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQzthQUM1QyxPQUFPLENBQ04sd01BQXdNLENBQ3pNO2FBQ0EsU0FBUyxDQUFDLFVBQUMsTUFBTTtZQUNoQixPQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsUUFBUSxDQUFDLFVBQUMsS0FBSztnQkFDMUQsUUFBUSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztnQkFDcEMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO2FBQ3pCLENBQUM7U0FBQSxDQUNILENBQUM7S0FDTDtJQUVNLDBDQUFtQixHQUExQixVQUNFLFdBQXdCLEVBQ3hCLFFBQThCO1FBRTlCLElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3JCLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQzthQUM3QixPQUFPLENBQUMsMERBQTBELENBQUM7YUFDbkUsU0FBUyxDQUFDLFVBQUMsTUFBTTtZQUNoQixPQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsUUFBUSxDQUFDLFVBQUMsS0FBSztnQkFDeEQsUUFBUSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztnQkFDbEMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO2FBQ3pCLENBQUM7U0FBQSxDQUNILENBQUM7S0FDTDtJQUNILDZCQUFDO0FBQUQsQ0FsRUEsQ0FBNENDLHlCQUFnQjs7U0NNNUMsUUFBUSxDQUN0QixHQUFZLEVBQ1osYUFBc0IsRUFDdEIsR0FBYTtJQUViLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQztJQUVoQixJQUFJLEdBQUcsSUFBSyxHQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssU0FBUyxFQUFFO1FBQ2xELEdBQUcsR0FBRyxJQUFJLENBQUM7UUFDWCxJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksR0FBRyxLQUFLLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUNuRCxHQUFHLEdBQUcsS0FBSyxDQUFDO1NBQ2I7S0FDRjtJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztTQUVlLGtCQUFrQixDQUFDLEdBQVk7SUFDN0MsT0FBTyxRQUFRLENBQW1CLEdBQUcsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDM0QsQ0FBQztTQUVlLGtCQUFrQixDQUFDLEdBQVk7SUFDN0MsT0FBTyxRQUFRLENBQW1CLEdBQUcsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDM0QsQ0FBQztTQUVlLGdCQUFnQixDQUFDLEdBQVk7SUFDM0MsT0FBTyxRQUFRLENBQWlCLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDdkQsQ0FBQztTQUVlLGlCQUFpQixDQUFDLEdBQVk7SUFDNUMsT0FBTyxRQUFRLENBQWtCLEdBQUcsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDekQsQ0FBQztTQUVlLHNCQUFzQixDQUFDLEdBQVk7SUFDakQsT0FBTyxRQUFRLENBQXVCLEdBQUcsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDbkUsQ0FBQztTQUVlLGtCQUFrQixDQUFDLEdBQVk7SUFDN0MsT0FBTyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN4RixDQUFDO1NBRWUsY0FBYyxDQUFDLEdBQVk7SUFDekMsT0FBTyxRQUFRLENBQWUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzlDOztBQ3pDQSxJQUFZLElBSVg7QUFKRCxXQUFZLElBQUk7SUFDZCx1Q0FBWSxDQUFBO0lBQ1osMkNBQWMsQ0FBQTtJQUNkLDJDQUFjLENBQUE7QUFDaEIsQ0FBQyxFQUpXLElBQUksS0FBSixJQUFJLFFBSWY7QUFFRCxJQUFZLFVBS1g7QUFMRCxXQUFZLFVBQVU7SUFDcEIsMkNBQVEsQ0FBQTtJQUNSLDZDQUFTLENBQUE7SUFDVCx5Q0FBTyxDQUFBO0lBQ1AsaURBQVcsQ0FBQTtBQUNiLENBQUMsRUFMVyxVQUFVLEtBQVYsVUFBVSxRQUtyQjtBQU1NLElBQU0sZ0JBQWdCLEdBQXdCLEVBQUUsQ0FBQztBQUN4RCxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQ3pDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUM7QUFDekMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUN2QyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBTXBDLElBQU0saUJBQWlCLEdBQW9DLEVBQUUsQ0FBQztBQUNyRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDNUIsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQzVCLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUM1QixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDNUIsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQzVCLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUk7O0FDVjNCLElBQU0sY0FBYyxHQUFHLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztBQWlCN0QsU0FBUyxZQUFZLENBQUMsSUFBVTs7SUFDOUIsT0FBTyxNQUFDLElBQVksMENBQUUsSUFBSSxDQUFDO0FBQzdCLENBQUM7QUFFRDtJQVNFLHFCQUFvQixHQUFRLEVBQVUsUUFBOEI7UUFBaEQsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUFVLGFBQVEsR0FBUixRQUFRLENBQXNCO1FBUjVELFVBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBS3RCLGlCQUFZLEdBQXFCLElBQUksQ0FBQztRQUN0QyxrQkFBYSxHQUFHLEtBQUssQ0FBQztLQUUwQztJQVB4RSxzQkFBVyw2QkFBSTthQUFmO1lBQ0UsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ25COzs7T0FBQTtJQU9ELDJCQUFLLEdBQUw7UUFDRSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztLQUMxQjtJQUVELDZDQUF1QixHQUF2QixVQUF3QixJQUFVO1FBQ2hDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUViLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDNUIsR0FBRyxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztTQUN2QzthQUFNLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDbkMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztTQUN2QztRQUVELE9BQU8sR0FBRyxDQUFDO0tBQ1o7SUFFRCx3Q0FBa0IsR0FBbEIsVUFBbUIsSUFBcUI7UUFDdEMsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNwQixJQUFBLElBQUksR0FBSyxJQUFJLEtBQVQsQ0FBVTtZQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQzlDO2FBQU07WUFDTCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDN0I7S0FDRjtJQUVELHNDQUFnQixHQUFoQixVQUFpQixJQUFxQixFQUFFLFFBQXFCO1FBQzNELElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQztRQUUzQixJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3BCLElBQUEsSUFBSSxHQUFLLElBQUksS0FBVCxDQUFVO1lBRXRCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQzNELFFBQVEsQ0FBQyxRQUFRLENBQUMsaUJBQWUsSUFBSSxDQUFDLFdBQWEsQ0FBQyxDQUFDO2FBQ3REO1lBRUQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNsRCxXQUFXLEdBQUcsVUFBVSxDQUFDO2dCQUN2QixHQUFHLEVBQUUsaUJBQWlCO2dCQUN0QixNQUFNLEVBQUUsV0FBVzthQUNwQixDQUFDLENBQUM7U0FDSjtRQUVELElBQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hEQyxzQkFBYSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQzlDO0lBRUQsc0NBQWdCLEdBQWhCLFVBQWlCLEtBQWEsRUFBRSxnQkFBK0I7UUFDckQsSUFBQSxpQkFBaUIsR0FBd0IsYUFBYSxrQkFBckMsRUFBRSxpQkFBaUIsR0FBSyxhQUFhLGtCQUFsQixDQUFtQjs7UUFHL0QsSUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDOztRQUdsRSxJQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDeEQsSUFBTSxZQUFZLEdBQUcsY0FBYyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzNDLElBQU0sa0JBQWtCLEdBQUcsY0FBYyxLQUFLLENBQUMsQ0FBQzs7O1FBSWhELElBQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyx1QkFBdUIsQ0FDeEQsWUFBWSxFQUNaLGdCQUFnQixDQUNqQixDQUFDOztRQUdGLElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUMvQyxrQkFBa0IsRUFDbEIsY0FBYyxDQUFDLG1CQUFtQixDQUNuQyxDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUN0QixrQkFBa0IsRUFDbEIsWUFBWSxFQUNaLGNBQWMsRUFDZCxnQkFBZ0IsQ0FDakIsQ0FBQztLQUNIO0lBRU8seUNBQW1CLEdBQTNCLFVBQ0Usa0JBQTJCLEVBQzNCLDZCQUFzQztRQUVoQyxJQUFBLEtBR0YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBRnBCLFVBQVUsZ0JBQUEsRUFDSSxJQUFJLHFCQUNFLENBQUM7UUFDZixJQUFBLGdCQUFnQixHQUFLLGFBQWEsaUJBQWxCLENBQW1COztRQUczQyxJQUFNLG9CQUFvQixHQUFHLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDOzs7UUFJNUUsSUFBTSxtQkFBbUIsR0FDdkIsa0JBQWtCO1lBQ2xCLENBQUMsNkJBQTZCO1lBQzlCLG9CQUFvQjtZQUNwQixDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXZCLE9BQU8sRUFBRSxtQkFBbUIscUJBQUEsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUM7S0FDcEQ7SUFFYyxtQ0FBdUIsR0FBdEMsVUFDRSxZQUFxQixFQUNyQixnQkFBK0I7UUFFL0IsSUFBSSxJQUFJLEdBQUcsZ0JBQWdCLENBQUM7UUFFNUIsSUFBSSxZQUFZLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7OztZQUc1QyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ2I7O1FBR0QsSUFBTSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ25DLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixxQkFBQSxFQUFFLENBQUM7S0FDbEQ7SUFFTyxrQ0FBWSxHQUFwQixVQUNFLGtCQUEyQixFQUMzQixZQUFxQixFQUNyQixjQUE4QixFQUM5QixnQkFBNEI7UUFFeEIsSUFBQSxLQUF5QixJQUFJLEVBQTNCLElBQUksVUFBQSxFQUFFLFlBQVksa0JBQVMsQ0FBQztRQUVsQyxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN2QixZQUFZLEdBQUcsV0FBVyxDQUFDLHNCQUFzQixDQUMvQyxJQUFJLEVBQ0osY0FBYyxFQUNkLGdCQUFnQixFQUNoQixZQUFZLENBQ2IsQ0FBQztTQUNIO2FBQU0sSUFBSSxrQkFBa0IsRUFBRTtZQUM3QixJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN2QixZQUFZLEdBQUcsSUFBSSxDQUFDO1NBQ3JCO2FBQU07WUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNyQixZQUFZLEdBQUcsSUFBSSxDQUFDO1NBQ3JCO1FBRUQsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFFbEIsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVjLGtDQUFzQixHQUFyQyxVQUNFLElBQVUsRUFDVixjQUE4QixFQUM5QixnQkFBNEIsRUFDNUIsZUFBaUM7OztRQUlqQyxJQUFNLHVCQUF1QixHQUFHLElBQUksS0FBSyxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUM7UUFDOUUsSUFBSSxZQUFZLEdBQXFCLGVBQWUsQ0FBQztRQUVyRCxJQUFJLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRTtZQUN0QyxZQUFZLEdBQUcsV0FBVyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUM1RTthQUFNLElBQUksQ0FBQyx1QkFBdUIsSUFBSSxnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRTtZQUMzRSxJQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7WUFDckMsSUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyxZQUFZLEdBQUcsRUFBRSxJQUFJLE1BQUEsRUFBRSxJQUFJLE1BQUEsRUFBRSxDQUFDO1NBQy9CO1FBRUQsT0FBTyxZQUFZLENBQUM7S0FDckI7SUFFYyxnQ0FBb0IsR0FBbkMsVUFBb0MsSUFBbUI7UUFDckQsSUFBSSxJQUFJLEdBQVUsSUFBSSxFQUNwQixJQUFJLEdBQWtCLElBQUksRUFDMUIsR0FBRyxHQUFxQixJQUFJLENBQUM7UUFFL0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUQsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDNUIsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ2pCLElBQUksR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hDO2lCQUFNO2dCQUNMLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ2xCO1lBRUQsR0FBRyxHQUFHLEVBQUUsSUFBSSxNQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsQ0FBQztTQUN0QjtRQUVELE9BQU8sR0FBRyxDQUFDO0tBQ1o7SUFFYyw4QkFBa0IsR0FBakMsVUFBa0MsS0FBVSxFQUFFLElBQVU7UUFBdEIsc0JBQUEsRUFBQSxVQUFVO1FBQ2xDLElBQUEsaUJBQWlCLEdBQXdCLGFBQWEsa0JBQXJDLEVBQUUsaUJBQWlCLEdBQUssYUFBYSxrQkFBbEIsQ0FBbUI7UUFDL0QsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBRW5CLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDNUIsSUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3hELFVBQVUsR0FBRyxjQUFjLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDO1NBQ3hEO2FBQU0sSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNuQyxVQUFVLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDO1NBQ3ZDO1FBRUQsSUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM5RCxPQUFPQyxxQkFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQy9CO0lBRUQsb0NBQWMsR0FBZCxVQUFlLEtBQWE7O1FBQ3BCLElBQUEsS0FBeUIsSUFBSSxFQUEzQixJQUFJLFVBQUEsRUFBRSxZQUFZLGtCQUFTLENBQUM7UUFDcEMsSUFBTSxXQUFXLEdBQXNCLEVBQUUsQ0FBQztRQUUxQyxJQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlELElBQU0sYUFBYSxHQUFHLENBQUEsTUFBQSxTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUUsS0FBSywwQ0FBRSxNQUFNLElBQUcsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ25DLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRWhELElBQU0sSUFBSSxHQUFHLFVBQUMsSUFBNEIsRUFBRSxLQUFtQjtZQUM3RCxJQUFJLElBQUksWUFBWUMsc0JBQWEsRUFBRTtnQkFDakMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxNQUFBLEVBQUUsS0FBSyxPQUFBLEVBQUUsQ0FBQyxDQUFDO2FBQ25EO2lCQUFNO2dCQUNMLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksTUFBQSxFQUFFLEtBQUssT0FBQSxFQUFFLENBQUMsQ0FBQzthQUNuRDtTQUNGLENBQUM7UUFFRixLQUFLLENBQUMsT0FBTyxDQUFDLFVBQUMsSUFBSTtZQUNqQixJQUFJLEtBQUssR0FBaUIsSUFBSSxDQUFDO1lBRS9CLElBQUksYUFBYSxFQUFFO2dCQUNqQixJQUFNLElBQUksR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxLQUFLLEdBQUdDLG9CQUFXLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUVyQyxJQUFJLEtBQUssRUFBRTtvQkFDVCxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2lCQUNuQjthQUNGO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDbEI7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLGFBQWEsRUFBRTtZQUNqQkMsMEJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDaEM7UUFFRCxPQUFPLFdBQVcsQ0FBQztLQUNwQjtJQUVPLDhCQUFRLEdBQWhCLFVBQWlCLElBQVUsRUFBRSxZQUE4QjtRQUN6RCxJQUFJLEtBQStCLENBQUM7UUFFcEMsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUM1QixLQUFLLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7U0FDbEM7YUFBTSxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ25DLEtBQUssR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDaEQ7UUFFRCxPQUFPLEtBQUssQ0FBQztLQUNkO0lBRU8sdUNBQWlCLEdBQXpCO1FBRVcsSUFBQSxTQUFTLEdBQ2QsSUFBSSxjQURVLENBQ1Q7UUFDVCxJQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFDO1FBRW5DLElBQU0sUUFBUSxHQUFHLFVBQUMsQ0FBZ0I7WUFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFO2dCQUNsRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hCO1NBQ0YsQ0FBQztRQUVGLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0QyxPQUFPLE1BQU0sQ0FBQztLQUNmO0lBRU8seUNBQW1CLEdBQTNCLFVBQTRCLFlBQThCO1FBRS9DLElBQUEsYUFBYSxHQUNsQixJQUFJLGtCQURjLENBQ2I7UUFDVCxJQUFNLEdBQUcsR0FBaUIsRUFBRSxDQUFDO1FBRTdCLElBQUksWUFBWSxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUU7WUFDckMsSUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztZQUMvQixJQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXBELElBQUksVUFBVSxFQUFFO2dCQUNkLElBQU0sSUFBSSxHQUFHLFVBQUMsT0FBb0MsRUFBRSxJQUFnQjtvQkFBdEQsd0JBQUEsRUFBQSxZQUFvQztvQkFDaEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFDLE1BQU0sSUFBSyxPQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLFFBQUEsRUFBRSxJQUFJLE1BQUEsRUFBRSxDQUFDLEdBQUEsQ0FBQyxDQUFDO2lCQUN6RCxDQUFDO2dCQUVGLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUMzQztTQUNGO1FBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWE7Y0FDMUQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQztjQUNsQyxHQUFHLENBQUM7S0FDVDtJQUVPLDhDQUF3QixHQUFoQyxVQUFpQyxPQUEwQjtRQUExQix3QkFBQSxFQUFBLFlBQTBCO1FBQ3pELElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBQyxDQUFhLEVBQUUsQ0FBYTtZQUMvQyxJQUFPLE1BQU0sR0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsTUFBdEIsQ0FBdUI7WUFDcEMsSUFBTyxNQUFNLEdBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLE1BQXRCLENBQXVCO1lBQzVDLElBQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztZQUMzQyxPQUFPLFFBQVEsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQztTQUM1RCxDQUFDLENBQUM7UUFFSCxJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFFeEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEVBQUU7WUFDaEIsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLElBQUksY0FBYyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDN0IsZUFBZSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUNsQyxXQUFXLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2FBQ25DO2lCQUFNO2dCQUNMLFdBQVcsR0FBRyxlQUFlLENBQUM7YUFDL0I7WUFFRCxFQUFFLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztTQUM5QixDQUFDLENBQUM7UUFFSCxPQUFPLE1BQU0sQ0FBQztLQUNmO0lBRWMsdUJBQVcsR0FBMUIsVUFBMkIsSUFBNEI7UUFDckQsSUFBSSxJQUFJLENBQUM7UUFFVCxJQUFJLElBQUksWUFBWUYsc0JBQWEsRUFBRTtZQUNqQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1NBQzlCO2FBQU07WUFDTCxJQUFJLEdBQUcsV0FBVyxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3JEO1FBRUQsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVjLHNDQUEwQixHQUF6QyxVQUEwQyxVQUFzQjtRQUN0RCxJQUFBLE1BQU0sR0FBSyxVQUFVLE9BQWYsQ0FBZ0I7UUFDOUIsSUFBSSxJQUFJLENBQUM7UUFFVCxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMxQixJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztTQUN2QjthQUFNLElBQUksUUFBUSxDQUFXLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRTtZQUM1QyxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDNUI7YUFBTTtZQUNMLElBQU0sUUFBUSxHQUFHLE1BQXdCLENBQUM7WUFDMUMsQ0FBUyxJQUFJLEdBQUssUUFBUSxLQUFiLEVBQWU7WUFDcEIsSUFBQSxXQUFXLEdBQUssUUFBUSxZQUFiLENBQWM7WUFFakMsSUFBSSxXQUFXLElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtnQkFDdkMsSUFBSSxJQUFJLE1BQUksV0FBYSxDQUFDO2FBQzNCO1NBQ0Y7UUFFRCxPQUFPLElBQUksQ0FBQztLQUNiO0lBRU8sc0NBQWdCLEdBQXhCLFVBQXlCLElBQXNCO1FBQ3JDLElBQUEsU0FBUyxHQUFLLElBQUksQ0FBQyxHQUFHLFVBQWIsQ0FBYzs7UUFHekIsSUFBQSxLQUdGLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxFQUYzQyxJQUFJLFVBQUEsRUFDSSxJQUFJLGVBQytCLENBQUM7UUFFeEMsSUFBQSxLQUdGLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFGM0IsYUFBb0IsRUFBWCxJQUFJLFVBQUEsRUFBRSxHQUFHLFNBQUEsRUFDYixNQUFNLFNBQ2dCLENBQUM7OztRQUk5QixJQUFNLE1BQU0sR0FBRztZQUNiLFFBQVEsRUFBRSxFQUFFLElBQUksTUFBQSxFQUFFLEdBQUcsS0FBQSxFQUFFO1lBQ3ZCLE1BQU0sUUFBQTtZQUNOLElBQUksTUFBQTtZQUNKLEtBQUssRUFBRSxJQUFJO1lBQ1gsTUFBTSxFQUFFO2dCQUNOLElBQUksRUFBRSxFQUFFLElBQUksTUFBQSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUU7Z0JBQ3ZCLEVBQUUsRUFBRSxFQUFFLElBQUksTUFBQSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUU7YUFDdEI7U0FDRixDQUFDO1FBRUYsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFOztZQUVsRCxTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3JDO2FBQU07WUFDTCxTQUFTO2lCQUNOLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sUUFBQSxFQUFFLENBQUM7aUJBQ3hDLEtBQUssQ0FBQyxjQUFNLE9BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQ0FBMEMsQ0FBQyxHQUFBLENBQUMsQ0FBQztTQUN6RTtLQUNGO0lBRU8sd0RBQWtDLEdBQTFDO1FBQ1EsSUFBQSxLQUFpQixJQUFJLENBQUMsWUFBWSxFQUFoQyxJQUFJLFVBQUEsRUFBRSxJQUFJLFVBQXNCLENBQUM7UUFDekMsSUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUU1QixJQUFNLFNBQVMsR0FBRyxVQUFDLENBQWdCO1lBQ2pDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQztZQUNoQixJQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUNoRSxJQUFNLGVBQWUsR0FDbkIsWUFBWSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBRW5FLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ2QsR0FBRztvQkFDRCxZQUFZLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxLQUFLLElBQUksR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQzthQUNqRjtZQUVELE9BQU8sR0FBRyxDQUFDO1NBQ1osQ0FBQztRQUVGLElBQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLE1BQUEsRUFBRSxDQUFDO0tBQzFCO0lBRWMsOEJBQWtCLEdBQWpDLFVBQWtDLFVBQXNCLEVBQUUsUUFBcUI7UUFDckUsSUFBQSxJQUFJLEdBQWEsVUFBVSxLQUF2QixFQUFFLE1BQU0sR0FBSyxVQUFVLE9BQWYsQ0FBZ0I7UUFDcEMsSUFBSSxTQUFpQixDQUFDO1FBRXRCLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzFCLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDN0M7YUFBTTtZQUNMLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNwQztRQUVELFNBQVMsQ0FBQztZQUNSLElBQUksRUFBRSxTQUFTO1lBQ2YsR0FBRyxFQUFFLHNCQUFzQjtZQUMzQixNQUFNLEVBQUUsUUFBUTtTQUNqQixDQUFDLENBQUM7S0FDSjtJQUNILGtCQUFDO0FBQUQsQ0FBQzs7QUNsZkQ7SUFZRSxnQkFDVSxLQUFZLEVBQ1osT0FBWSxFQUNaLGdCQUE2QjtRQUY3QixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osWUFBTyxHQUFQLE9BQU8sQ0FBSztRQUNaLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBYTtLQUNuQztJQVpKLHNCQUFJLDBCQUFNO2FBQVY7WUFDRSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDckI7YUFFRCxVQUFXLEtBQWM7WUFDdkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7U0FDdEI7OztPQUpBO0lBWUQsaUNBQWdCLEdBQWhCO1FBQ1UsSUFBQSxLQUFLLEdBQUssSUFBSSxNQUFULENBQVU7UUFDdkIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdELEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUM5RDtJQUVELDhCQUFhLEdBQWIsVUFBYyxJQUFtQixFQUFFLEdBQWtCO1FBQzdDLElBQUEsS0FBc0IsSUFBSSxFQUF4QixNQUFNLFlBQUEsRUFBRSxPQUFPLGFBQVMsQ0FBQztRQUVqQyxJQUFJLE1BQU0sRUFBRTtZQUNWLElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDO1lBQy9CLElBQU0sS0FBSyxHQUFXLE9BQU8sQ0FBQyxZQUFzQixDQUFDO1lBQ3JELE9BQU8sQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3pEO1FBRUQsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUVjLDhCQUF1QixHQUF0QyxVQUF1QyxJQUFVLEVBQUUsV0FBd0I7UUFDekUsSUFBTSxRQUFRLEdBQUcsc0JBQXNCLENBQUM7UUFFeEMsSUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBYyxRQUFRLENBQUMsQ0FBQztRQUM1RCxJQUFJLEVBQUUsRUFBRTtZQUNOLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksS0FBSyxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUM7U0FDekQ7S0FDRjtJQUVELG9DQUFtQixHQUFuQixVQUFvQixJQUFVO1FBQzVCLElBQU0sSUFBSSxHQUFJLElBQUksQ0FBQyxLQUFhLENBQUMsSUFBSSxDQUFDO1FBQ2hDLElBQUEsS0FBb0IsSUFBSSxXQUFULEVBQWYsVUFBVSxtQkFBRyxFQUFFLEtBQUEsQ0FBVTtRQUUvQixNQUFNLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRTVELElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDMUIsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFO2dCQUNyQixVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUMsR0FBRyxJQUFLLE9BQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBQSxDQUFDLENBQUM7YUFDN0M7WUFDRCxVQUFVLEdBQUcsU0FBUyxDQUFDO1NBQ3hCO2FBQU07O1lBRUwsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO2dCQUN6QyxJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRXBCLElBQ0UsR0FBRyxDQUFDLEdBQUcsS0FBSyxPQUFPO3FCQUNsQixHQUFHLENBQUMsU0FBUyxLQUFLLE1BQU0sSUFBSSxHQUFHLENBQUMsU0FBUyxLQUFLLE9BQU8sQ0FBQyxFQUN2RDtvQkFDQSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbEIsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdEI7YUFDRjtTQUNGO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7S0FDOUI7SUFDSCxhQUFDO0FBQUQsQ0FBQzs7QUNyRUQsSUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUM7QUFNckMsU0FBUyxpQkFBaUIsQ0FBQyxHQUFRO0lBQ2pDLElBQU0sUUFBUSxHQUFJLEdBQVcsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDL0UsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQXdDLENBQUM7QUFDMUUsQ0FBQztTQUVlLGtCQUFrQixDQUFDLEdBQVEsRUFBRSxNQUEwQjtJQUNyRSxJQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5QyxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7UUFDM0IsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELElBQU0saUJBQWlCO1FBQWlCLDJCQUFjO1FBS3BELGlCQUFZLEdBQVEsRUFBUyxNQUEwQjtZQUF2RCxZQUNFLGtCQUFNLEdBQUcsQ0FBQyxTQUlYO1lBTDRCLFlBQU0sR0FBTixNQUFNLENBQW9CO1lBRi9DLHdCQUFrQixHQUFXLElBQUksQ0FBQztZQUt4QyxLQUFJLENBQUMsTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkQsS0FBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxLQUFJLENBQUMsS0FBSyxFQUFFLEtBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDOztTQUN4RTtRQUVELDRCQUFVLEdBQVYsVUFBVyxJQUFVO1lBQ1gsSUFBQSxNQUFNLEdBQUssSUFBSSxPQUFULENBQVU7WUFFeEIsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFaEMsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNoRTtZQUVELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUNiO1FBRUQsd0JBQU0sR0FBTjtZQUNFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUM1QixpQkFBTSxNQUFNLFdBQUUsQ0FBQztTQUNoQjtRQUVELHlCQUFPLEdBQVA7WUFDRSxpQkFBTSxPQUFPLFdBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7U0FDOUI7UUFFUyxtQ0FBaUIsR0FBM0I7WUFDUSxJQUFBLEtBQW9ELElBQUksRUFBdEQsTUFBTSxZQUFBLEVBQUUsUUFBUSxjQUFBLEVBQUUsT0FBTyxhQUFBLEVBQUUsa0JBQWtCLHdCQUFTLENBQUM7WUFFL0QsSUFBSSxrQkFBa0IsS0FBSyxJQUFJLElBQUksa0JBQWtCLEtBQUssRUFBRSxFQUFFOztnQkFFNUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsa0JBQWtCLENBQUM7O2dCQUd4QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO2FBQ2hDO1lBRUQsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDOUMsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7WUFDakMsSUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN4RCxRQUFRLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFbkMsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDMUIsaUJBQU0saUJBQWlCLFdBQUUsQ0FBQzthQUMzQjtpQkFBTTtnQkFDTCxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMzQixJQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNqRCxPQUFPLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ3JDO1NBQ0Y7UUFFRCxvQ0FBa0IsR0FBbEIsVUFBbUIsSUFBbUIsRUFBRSxHQUErQjtZQUM3RCxJQUFBLE1BQU0sR0FBSyxJQUFJLE9BQVQsQ0FBVTtZQUV4QixJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDN0QsaUJBQU0sa0JBQWtCLFlBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ3JDO2lCQUFNO2dCQUNMLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNqQztTQUNGO1FBRUQsa0NBQWdCLEdBQWhCLFVBQWlCLEtBQW9CLEVBQUUsUUFBcUI7WUFDbEQsSUFBQSxNQUFNLEdBQUssSUFBSSxPQUFULENBQVU7WUFFeEIsSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQzlELGlCQUFNLGdCQUFnQixZQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN6QztpQkFBTTtnQkFDTCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzFDO1NBQ0Y7UUFFTyxxQ0FBbUIsR0FBM0I7WUFDVSxJQUFBLE9BQU8sR0FBSyxJQUFJLFFBQVQsQ0FBVTtZQUN6QixJQUFJLGdCQUFnQixHQUFrQixJQUFJLENBQUM7WUFFM0MsSUFBSSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsTUFBTSxFQUFFO2dCQUNuQixnQkFBZ0IsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUN6RDtZQUVELE9BQU8sZ0JBQWdCLENBQUM7U0FDekI7UUFDSCxjQUFDO0tBQUEsQ0ExRnVDLGNBQWMsRUEwRnJELENBQUM7SUFFRixPQUFPLElBQUksaUJBQWlCLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzVDOzs7SUNwSGdELHNDQUFNO0lBQXREOztLQTJEQztJQXZETyxtQ0FBTSxHQUFaOzs7Ozs7d0JBQ1EsT0FBTyxHQUFHLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQy9DLHFCQUFNLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBQTs7d0JBQTVCLFNBQTRCLENBQUM7d0JBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO3dCQUV2QixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFFeEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUNsRSxJQUFJLENBQUMsZUFBZSxDQUNsQiw0QkFBNEIsRUFDNUIscUJBQXFCLEVBQ3JCLElBQUksQ0FBQyxVQUFVLENBQ2hCLENBQUM7d0JBQ0YsSUFBSSxDQUFDLGVBQWUsQ0FDbEIsNEJBQTRCLEVBQzVCLHFCQUFxQixFQUNyQixJQUFJLENBQUMsVUFBVSxDQUNoQixDQUFDOzs7OztLQUNIO0lBRUQscUNBQVEsR0FBUjtRQUNFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0tBQ25CO0lBRUQsNENBQWUsR0FBZixVQUFnQixFQUFVLEVBQUUsSUFBWSxFQUFFLElBQVU7UUFBcEQsaUJBa0JDO1FBakJDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDZCxFQUFFLElBQUE7WUFDRixJQUFJLE1BQUE7WUFDSixPQUFPLEVBQUUsRUFBRTtZQUNYLGFBQWEsRUFBRSxVQUFDLFFBQVE7Z0JBQ3RCLElBQU0sS0FBSyxHQUFHLEtBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxLQUFLLEVBQUU7b0JBQ1QsSUFBSSxDQUFDLFFBQVEsRUFBRTt3QkFDYixLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUN4QjtvQkFFRCxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFFRCxPQUFPLEtBQUssQ0FBQzthQUNkO1NBQ0YsQ0FBQyxDQUFDO0tBQ0o7SUFFTyxxQ0FBUSxHQUFoQjtRQUNRLElBQUEsS0FBSyxHQUFLLElBQUksTUFBVCxDQUFVO1FBRXJCLElBQUksS0FBSyxFQUFFO1lBQ1QsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDSCx5QkFBQztBQUFELENBM0RBLENBQWdERyxlQUFNOzs7OyJ9
