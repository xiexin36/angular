'use strict';"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var di_1 = require('angular2/src/core/di');
var lang_1 = require('angular2/src/facade/lang');
var html_ast_1 = require('./html_ast');
var html_parser_1 = require('./html_parser');
var util_1 = require('./util');
var LONG_SYNTAX_REGEXP = /^(?:on-(.*)|bindon-(.*)|bind-(.*)|var-(.*))$/ig;
var SHORT_SYNTAX_REGEXP = /^(?:\((.*)\)|\[\((.*)\)\]|\[(.*)\]|#(.*))$/ig;
var VARIABLE_TPL_BINDING_REGEXP = /(\bvar\s+|#)(\S+)/ig;
var TEMPLATE_SELECTOR_REGEXP = /^(\S+)/g;
var SPECIAL_PREFIXES_REGEXP = /^(class|style|attr)\./ig;
var INTERPOLATION_REGEXP = /\{\{.*?\}\}/g;
var SPECIAL_CASES = lang_1.CONST_EXPR([
    'ng-non-bindable',
    'ng-default-control',
    'ng-no-form',
]);
/**
 * Convert templates to the case sensitive syntax
 *
 * @internal
 */
var LegacyHtmlAstTransformer = (function () {
    function LegacyHtmlAstTransformer(dashCaseSelectors) {
        this.dashCaseSelectors = dashCaseSelectors;
        this.rewrittenAst = [];
        this.visitingTemplateEl = false;
    }
    LegacyHtmlAstTransformer.prototype.visitComment = function (ast, context) { return ast; };
    LegacyHtmlAstTransformer.prototype.visitElement = function (ast, context) {
        var _this = this;
        this.visitingTemplateEl = ast.name.toLowerCase() == 'template';
        var attrs = ast.attrs.map(function (attr) { return attr.visit(_this, null); });
        var children = ast.children.map(function (child) { return child.visit(_this, null); });
        return new html_ast_1.HtmlElementAst(ast.name, attrs, children, ast.sourceSpan, ast.startSourceSpan, ast.endSourceSpan);
    };
    LegacyHtmlAstTransformer.prototype.visitAttr = function (originalAst, context) {
        var ast = originalAst;
        if (this.visitingTemplateEl) {
            if (lang_1.isPresent(lang_1.RegExpWrapper.firstMatch(LONG_SYNTAX_REGEXP, ast.name))) {
                // preserve the "-" in the prefix for the long syntax
                ast = this._rewriteLongSyntax(ast);
            }
            else {
                // rewrite any other attribute
                var name_1 = util_1.dashCaseToCamelCase(ast.name);
                ast = name_1 == ast.name ? ast : new html_ast_1.HtmlAttrAst(name_1, ast.value, ast.sourceSpan);
            }
        }
        else {
            ast = this._rewriteTemplateAttribute(ast);
            ast = this._rewriteLongSyntax(ast);
            ast = this._rewriteShortSyntax(ast);
            ast = this._rewriteStar(ast);
            ast = this._rewriteInterpolation(ast);
            ast = this._rewriteSpecialCases(ast);
        }
        if (ast !== originalAst) {
            this.rewrittenAst.push(ast);
        }
        return ast;
    };
    LegacyHtmlAstTransformer.prototype.visitText = function (ast, context) { return ast; };
    LegacyHtmlAstTransformer.prototype.visitExpansion = function (ast, context) {
        var _this = this;
        var cases = ast.cases.map(function (c) { return c.visit(_this, null); });
        return new html_ast_1.HtmlExpansionAst(ast.switchValue, ast.type, cases, ast.sourceSpan, ast.switchValueSourceSpan);
    };
    LegacyHtmlAstTransformer.prototype.visitExpansionCase = function (ast, context) { return ast; };
    LegacyHtmlAstTransformer.prototype._rewriteLongSyntax = function (ast) {
        var m = lang_1.RegExpWrapper.firstMatch(LONG_SYNTAX_REGEXP, ast.name);
        var attrName = ast.name;
        var attrValue = ast.value;
        if (lang_1.isPresent(m)) {
            if (lang_1.isPresent(m[1])) {
                attrName = "on-" + util_1.dashCaseToCamelCase(m[1]);
            }
            else if (lang_1.isPresent(m[2])) {
                attrName = "bindon-" + util_1.dashCaseToCamelCase(m[2]);
            }
            else if (lang_1.isPresent(m[3])) {
                attrName = "bind-" + util_1.dashCaseToCamelCase(m[3]);
            }
            else if (lang_1.isPresent(m[4])) {
                attrName = "var-" + util_1.dashCaseToCamelCase(m[4]);
                attrValue = util_1.dashCaseToCamelCase(attrValue);
            }
        }
        return attrName == ast.name && attrValue == ast.value ?
            ast :
            new html_ast_1.HtmlAttrAst(attrName, attrValue, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteTemplateAttribute = function (ast) {
        var name = ast.name;
        var value = ast.value;
        if (name.toLowerCase() == 'template') {
            name = 'template';
            // rewrite the directive selector
            value = lang_1.StringWrapper.replaceAllMapped(value, TEMPLATE_SELECTOR_REGEXP, function (m) { return util_1.dashCaseToCamelCase(m[1]); });
            // rewrite the var declarations
            value = lang_1.StringWrapper.replaceAllMapped(value, VARIABLE_TPL_BINDING_REGEXP, function (m) {
                return "" + m[1].toLowerCase() + util_1.dashCaseToCamelCase(m[2]);
            });
        }
        if (name == ast.name && value == ast.value) {
            return ast;
        }
        return new html_ast_1.HtmlAttrAst(name, value, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteShortSyntax = function (ast) {
        var m = lang_1.RegExpWrapper.firstMatch(SHORT_SYNTAX_REGEXP, ast.name);
        var attrName = ast.name;
        var attrValue = ast.value;
        if (lang_1.isPresent(m)) {
            if (lang_1.isPresent(m[1])) {
                attrName = "(" + util_1.dashCaseToCamelCase(m[1]) + ")";
            }
            else if (lang_1.isPresent(m[2])) {
                attrName = "[(" + util_1.dashCaseToCamelCase(m[2]) + ")]";
            }
            else if (lang_1.isPresent(m[3])) {
                var prop = lang_1.StringWrapper.replaceAllMapped(m[3], SPECIAL_PREFIXES_REGEXP, function (m) { return m[1].toLowerCase() + '.'; });
                if (prop.startsWith('class.') || prop.startsWith('attr.') || prop.startsWith('style.')) {
                    attrName = "[" + prop + "]";
                }
                else {
                    attrName = "[" + util_1.dashCaseToCamelCase(prop) + "]";
                }
            }
            else if (lang_1.isPresent(m[4])) {
                attrName = "#" + util_1.dashCaseToCamelCase(m[4]);
                attrValue = util_1.dashCaseToCamelCase(attrValue);
            }
        }
        return attrName == ast.name && attrValue == ast.value ?
            ast :
            new html_ast_1.HtmlAttrAst(attrName, attrValue, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteStar = function (ast) {
        var attrName = ast.name;
        var attrValue = ast.value;
        if (attrName[0] == '*') {
            attrName = util_1.dashCaseToCamelCase(attrName);
            // rewrite the var declarations
            attrValue = lang_1.StringWrapper.replaceAllMapped(attrValue, VARIABLE_TPL_BINDING_REGEXP, function (m) {
                return "" + m[1].toLowerCase() + util_1.dashCaseToCamelCase(m[2]);
            });
        }
        return attrName == ast.name && attrValue == ast.value ?
            ast :
            new html_ast_1.HtmlAttrAst(attrName, attrValue, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteInterpolation = function (ast) {
        var hasInterpolation = lang_1.RegExpWrapper.test(INTERPOLATION_REGEXP, ast.value);
        if (!hasInterpolation) {
            return ast;
        }
        var name = ast.name;
        if (!(name.startsWith('attr.') || name.startsWith('class.') || name.startsWith('style.'))) {
            name = util_1.dashCaseToCamelCase(ast.name);
        }
        return name == ast.name ? ast : new html_ast_1.HtmlAttrAst(name, ast.value, ast.sourceSpan);
    };
    LegacyHtmlAstTransformer.prototype._rewriteSpecialCases = function (ast) {
        var attrName = ast.name;
        if (SPECIAL_CASES.indexOf(attrName) > -1) {
            return new html_ast_1.HtmlAttrAst(util_1.dashCaseToCamelCase(attrName), ast.value, ast.sourceSpan);
        }
        if (lang_1.isPresent(this.dashCaseSelectors) && this.dashCaseSelectors.indexOf(attrName) > -1) {
            return new html_ast_1.HtmlAttrAst(util_1.dashCaseToCamelCase(attrName), ast.value, ast.sourceSpan);
        }
        return ast;
    };
    return LegacyHtmlAstTransformer;
}());
exports.LegacyHtmlAstTransformer = LegacyHtmlAstTransformer;
var LegacyHtmlParser = (function (_super) {
    __extends(LegacyHtmlParser, _super);
    function LegacyHtmlParser() {
        _super.apply(this, arguments);
    }
    LegacyHtmlParser.prototype.parse = function (sourceContent, sourceUrl, parseExpansionForms) {
        if (parseExpansionForms === void 0) { parseExpansionForms = false; }
        var transformer = new LegacyHtmlAstTransformer();
        var htmlParseTreeResult = _super.prototype.parse.call(this, sourceContent, sourceUrl, parseExpansionForms);
        var rootNodes = htmlParseTreeResult.rootNodes.map(function (node) { return node.visit(transformer, null); });
        return transformer.rewrittenAst.length > 0 ?
            new html_parser_1.HtmlParseTreeResult(rootNodes, htmlParseTreeResult.errors) :
            htmlParseTreeResult;
    };
    LegacyHtmlParser = __decorate([
        di_1.Injectable(), 
        __metadata('design:paramtypes', [])
    ], LegacyHtmlParser);
    return LegacyHtmlParser;
}(html_parser_1.HtmlParser));
exports.LegacyHtmlParser = LegacyHtmlParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVnYWN5X3RlbXBsYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1ETnljSWF3ay50bXAvYW5ndWxhcjIvc3JjL2NvbXBpbGVyL2xlZ2FjeV90ZW1wbGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtQkFBNEMsc0JBQXNCLENBQUMsQ0FBQTtBQUVuRSxxQkFNTywwQkFBMEIsQ0FBQyxDQUFBO0FBRWxDLHlCQVNPLFlBQVksQ0FBQyxDQUFBO0FBQ3BCLDRCQUE4QyxlQUFlLENBQUMsQ0FBQTtBQUU5RCxxQkFBdUQsUUFBUSxDQUFDLENBQUE7QUFFaEUsSUFBSSxrQkFBa0IsR0FBRyxnREFBZ0QsQ0FBQztBQUMxRSxJQUFJLG1CQUFtQixHQUFHLDhDQUE4QyxDQUFDO0FBQ3pFLElBQUksMkJBQTJCLEdBQUcscUJBQXFCLENBQUM7QUFDeEQsSUFBSSx3QkFBd0IsR0FBRyxTQUFTLENBQUM7QUFDekMsSUFBSSx1QkFBdUIsR0FBRyx5QkFBeUIsQ0FBQztBQUN4RCxJQUFJLG9CQUFvQixHQUFHLGNBQWMsQ0FBQztBQUUxQyxJQUFNLGFBQWEsR0FBRyxpQkFBVSxDQUFDO0lBQy9CLGlCQUFpQjtJQUNqQixvQkFBb0I7SUFDcEIsWUFBWTtDQUNiLENBQUMsQ0FBQztBQUVIOzs7O0dBSUc7QUFDSDtJQUlFLGtDQUFvQixpQkFBNEI7UUFBNUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFXO1FBSGhELGlCQUFZLEdBQWMsRUFBRSxDQUFDO1FBQzdCLHVCQUFrQixHQUFZLEtBQUssQ0FBQztJQUVlLENBQUM7SUFFcEQsK0NBQVksR0FBWixVQUFhLEdBQW1CLEVBQUUsT0FBWSxJQUFTLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRXBFLCtDQUFZLEdBQVosVUFBYSxHQUFtQixFQUFFLE9BQVk7UUFBOUMsaUJBTUM7UUFMQyxJQUFJLENBQUMs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LEVBQ3hDLG1CQUFvQztRQUFwQyxtQ0FBb0MsR0FBcEMsMkJBQW9DO1FBQ3hDLElBQUksV0FBVyxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUNqRCxJQUFJLG1CQUFtQixHQUFHLGdCQUFLLENBQUMsS0FBSyxZQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUVyRixJQUFJLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQTdCLENBQTZCLENBQUMsQ0FBQztRQUV6RixNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUMvQixJQUFJLGlDQUFtQixDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7WUFDOUQsbUJBQW1CLENBQUM7SUFDakMsQ0FBQztJQVpIO1FBQUMsZUFBVSxFQUFFOzt3QkFBQTtJQWFiLHVCQUFDO0FBQUQsQ0FBQyxBQVpELENBQXNDLHdCQUFVLEdBWS9DO0FBWlksd0JBQWdCLG1CQVk1QixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJbmplY3RhYmxlLCBQcm92aWRlciwgcHJvdmlkZX0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvcmUvZGknO1xuXG5pbXBvcnQge1xuICBTdHJpbmdXcmFwcGVyLFxuICBSZWdFeHBXcmFwcGVyLFxuICBDT05TVF9FWFBSLFxuICBpc0JsYW5rLFxuICBpc1ByZXNlbnRcbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9sYW5nJztcblxuaW1wb3J0IHtcbiAgSHRtbEFzdFZpc2l0b3IsXG4gIEh0bWxBdHRyQXN0LFxuICBIdG1sRWxlbWVudEFzdCxcbiAgSHRtbFRleHRBc3QsXG4gIEh0bWxDb21tZW50QXN0LFxuICBIdG1sRXhwYW5zaW9uQXN0LFxuICBIdG1sRXhwYW5zaW9uQ2FzZUFzdCxcbiAgSHRtbEFzdFxufSBmcm9tICcuL2h0bWxfYXN0JztcbmltcG9ydCB7SHRtbFBhcnNlciwgSHRtbFBhcnNlVHJlZVJlc3VsdH0gZnJvbSAnLi9odG1sX3BhcnNlcic7XG5cbmltcG9ydCB7ZGFzaENhc2VUb0NhbWVsQ2FzZSwgY2FtZWxDYXNlVG9EYXNoQ2FzZX0gZnJvbSAnLi91dGlsJztcblxudmFyIExPTkdfU1lOVEFYX1JFR0VYUCA9IC9eKD86b24tKC4qKXxiaW5kb24tKC4qKXxiaW5kLSguKil8dmFyLSguKikpJC9pZztcbnZhciBTSE9SVF9TWU5UQVhfUkVHRVhQID0gL14oPzpcXCgoLiopXFwpfFxcW1xcKCguKilcXClcXF18XFxbKC4qKVxcXXwjKC4qKSkkL2lnO1xudmFyIFZBUklBQkxFX1RQTF9CSU5ESU5HX1JFR0VYUCA9IC8oXFxidmFyXFxzK3wjKShcXFMrKS9pZztcbnZhciBURU1QTEFURV9TRUxFQ1RPUl9SRUdFWFAgPSAvXihcXFMrKS9nO1xudmFyIFNQRUNJQUxfUFJFRklYRVNfUkVHRVhQID0gL14oY2xhc3N8c3R5bGV8YXR0cilcXC4vaWc7XG52YXIgSU5URVJQT0xBVElPTl9SRUdFWFAgPSAvXFx7XFx7Lio/XFx9XFx9L2c7XG5cbmNvbnN0IFNQRUNJQUxfQ0FTRVMgPSBDT05TVF9FWFBSKFtcbiAgJ25nLW5vbi1iaW5kYWJsZScsXG4gICduZy1kZWZhdWx0LWNvbnRyb2wnLFxuICAnbmctbm8tZm9ybScsXG5dKTtcblxuLyoqXG4gKiBDb252ZXJ0IHRlbXBsYXRlcyB0byB0aGUgY2FzZSBzZW5zaXRpdmUgc3ludGF4XG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjbGFzcyBMZWdhY3lIdG1sQXN0VHJhbnNmb3JtZXIgaW1wbGVtZW50cyBIdG1sQXN0VmlzaXRvciB7XG4gIHJld3JpdHRlbkFzdDogSHRtbEFzdFtdID0gW107XG4gIHZpc2l0aW5nVGVtcGxhdGVFbDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGFzaENhc2VTZWxlY3RvcnM/OiBzdHJpbmdbXSkge31cblxuICB2aXNpdENvbW1lbnQoYXN0OiBIdG1sQ29tbWVudEFzdCwgY29udGV4dDogYW55KTogYW55IHsgcmV0dXJuIGFzdDsgfVxuXG4gIHZpc2l0RWxlbWVudChhc3Q6IEh0bWxFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiBIdG1sRWxlbWVudEFzdCB7XG4gICAgdGhpcy52aXNpdGluZ1RlbXBsYXRlRWwgPSBhc3QubmFtZS50b0xvd2VyQ2FzZSgpID09ICd0ZW1wbGF0ZSc7XG4gICAgbGV0IGF0dHJzID0gYXN0LmF0dHJzLm1hcChhdHRyID0+IGF0dHIudmlzaXQodGhpcywgbnVsbCkpO1xuICAgIGxldCBjaGlsZHJlbiA9IGFzdC5jaGlsZHJlbi5tYXAoY2hpbGQgPT4gY2hpbGQudmlzaXQodGhpcywgbnVsbCkpO1xuICAgIHJldHVybiBuZXcgSHRtbEVsZW1lbnRBc3QoYXN0Lm5hbWUsIGF0dHJzLCBjaGlsZHJlbiwgYXN0LnNvdXJjZVNwYW4sIGFzdC5zdGFydFNvdXJjZVNwYW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3QuZW5kU291cmNlU3Bhbik7XG4gIH1cblxuICB2aXNpdEF0dHIob3JpZ2luYWxBc3Q6IEh0bWxBdHRyQXN0LCBjb250ZXh0OiBhbnkpOiBIdG1sQXR0ckFzdCB7XG4gICAgbGV0IGFzdCA9IG9yaWdpbmFsQXN0O1xuXG4gICAgaWYgKHRoaXMudmlzaXRpbmdUZW1wbGF0ZUVsKSB7XG4gICAgICBpZiAoaXNQcmVzZW50KFJlZ0V4cFdyYXBwZXIuZmlyc3RNYXRjaChMT05HX1NZTlRBWF9SRUdFWFAsIGFzdC5uYW1lKSkpIHtcbiAgICAgICAgLy8gcHJlc2VydmUgdGhlIFwiLVwiIGluIHRoZSBwcmVmaXggZm9yIHRoZSBsb25nIHN5bnRheFxuICAgICAgICBhc3QgPSB0aGlzLl9yZXdyaXRlTG9uZ1N5bnRheChhc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcmV3cml0ZSBhbnkgb3RoZXIgYXR0cmlidXRlXG4gICAgICAgIGxldCBuYW1lID0gZGFzaENhc2VUb0NhbWVsQ2FzZShhc3QubmFtZSk7XG4gICAgICAgIGFzdCA9IG5hbWUgPT0gYXN0Lm5hbWUgPyBhc3QgOiBuZXcgSHRtbEF0dHJBc3QobmFtZSwgYXN0LnZhbHVlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGFzdCA9IHRoaXMuX3Jld3JpdGVUZW1wbGF0ZUF0dHJpYnV0ZShhc3QpO1xuICAgICAgYXN0ID0gdGhpcy5fcmV3cml0ZUxvbmdTeW50YXgoYXN0KTtcbiAgICAgIGFzdCA9IHRoaXMuX3Jld3JpdGVTaG9ydFN5bnRheChhc3QpO1xuICAgICAgYXN0ID0gdGhpcy5fcmV3cml0ZVN0YXIoYXN0KTtcbiAgICAgIGFzdCA9IHRoaXMuX3Jld3JpdGVJbnRlcnBvbGF0aW9uKGFzdCk7XG4gICAgICBhc3QgPSB0aGlzLl9yZXdyaXRlU3BlY2lhbENhc2VzKGFzdCk7XG4gICAgfVxuXG4gICAgaWYgKGFzdCAhPT0gb3JpZ2luYWxBc3QpIHtcbiAgICAgIHRoaXMucmV3cml0dGVuQXN0LnB1c2goYXN0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXN0O1xuICB9XG5cbiAgdmlzaXRUZXh0KGFzdDogSHRtbFRleHRBc3QsIGNvbnRleHQ6IGFueSk6IEh0bWxUZXh0QXN0IHsgcmV0dXJuIGFzdDsgfVxuXG4gIHZpc2l0RXhwYW5zaW9uKGFzdDogSHRtbEV4cGFuc2lvbkFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICBsZXQgY2FzZXMgPSBhc3QuY2FzZXMubWFwKGMgPT4gYy52aXNpdCh0aGlzLCBudWxsKSk7XG4gICAgcmV0dXJuIG5ldyBIdG1sRXhwYW5zaW9uQXN0KGFzdC5zd2l0Y2hWYWx1ZSwgYXN0LnR5cGUsIGNhc2VzLCBhc3Quc291cmNlU3BhbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXN0LnN3aXRjaFZhbHVlU291cmNlU3Bhbik7XG4gIH1cblxuICB2aXNpdEV4cGFuc2lvbkNhc2UoYXN0OiBIdG1sRXhwYW5zaW9uQ2FzZUFzdCwgY29udGV4dDogYW55KTogYW55IHsgcmV0dXJuIGFzdDsgfVxuXG4gIHByaXZhdGUgX3Jld3JpdGVMb25nU3ludGF4KGFzdDogSHRtbEF0dHJBc3QpOiBIdG1sQXR0ckFzdCB7XG4gICAgbGV0IG0gPSBSZWdFeHBXcmFwcGVyLmZpcnN0TWF0Y2goTE9OR19TWU5UQVhfUkVHRVhQLCBhc3QubmFtZSk7XG4gICAgbGV0IGF0dHJOYW1lID0gYXN0Lm5hbWU7XG4gICAgbGV0IGF0dHJWYWx1ZSA9IGFzdC52YWx1ZTtcblxuICAgIGlmIChpc1ByZXNlbnQobSkpIHtcbiAgICAgIGlmIChpc1ByZXNlbnQobVsxXSkpIHtcbiAgICAgICAgYXR0ck5hbWUgPSBgb24tJHtkYXNoQ2FzZVRvQ2FtZWxDYXNlKG1bMV0pfWA7XG4gICAgICB9IGVsc2UgaWYgKGlzUHJlc2VudChtWzJdKSkge1xuICAgICAgICBhdHRyTmFtZSA9IGBiaW5kb24tJHtkYXNoQ2FzZVRvQ2FtZWxDYXNlKG1bMl0pfWA7XG4gICAgICB9IGVsc2UgaWYgKGlzUHJlc2VudChtWzNdKSkge1xuICAgICAgICBhdHRyTmFtZSA9IGBiaW5kLSR7ZGFzaENhc2VUb0NhbWVsQ2FzZShtWzNdKX1gO1xuICAgICAgfSBlbHNlIGlmIChpc1ByZXNlbnQobVs0XSkpIHtcbiAgICAgICAgYXR0ck5hbWUgPSBgdmFyLSR7ZGFzaENhc2VUb0NhbWVsQ2FzZShtWzRdKX1gO1xuICAgICAgICBhdHRyVmFsdWUgPSBkYXNoQ2FzZVRvQ2FtZWxDYXNlKGF0dHJWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGF0dHJOYW1lID09IGFzdC5uYW1lICYmIGF0dHJWYWx1ZSA9PSBhc3QudmFsdWUgP1xuICAgICAgICAgICAgICAgYXN0IDpcbiAgICAgICAgICAgICAgIG5ldyBIdG1sQXR0ckFzdChhdHRyTmFtZSwgYXR0clZhbHVlLCBhc3Quc291cmNlU3Bhbik7XG4gIH1cblxuICBwcml2YXRlIF9yZXdyaXRlVGVtcGxhdGVBdHRyaWJ1dGUoYXN0OiBIdG1sQXR0ckFzdCk6IEh0bWxBdHRyQXN0IHtcbiAgICBsZXQgbmFtZSA9IGFzdC5uYW1lO1xuICAgIGxldCB2YWx1ZSA9IGFzdC52YWx1ZTtcblxuICAgIGlmIChuYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ3RlbXBsYXRlJykge1xuICAgICAgbmFtZSA9ICd0ZW1wbGF0ZSc7XG5cbiAgICAgIC8vIHJld3JpdGUgdGhlIGRpcmVjdGl2ZSBzZWxlY3RvclxuICAgICAgdmFsdWUgPSBTdHJpbmdXcmFwcGVyLnJlcGxhY2VBbGxNYXBwZWQodmFsdWUsIFRFTVBMQVRFX1NFTEVDVE9SX1JFR0VYUCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChtKSA9PiB7IHJldHVybiBkYXNoQ2FzZVRvQ2FtZWxDYXNlKG1bMV0pOyB9KTtcblxuICAgICAgLy8gcmV3cml0ZSB0aGUgdmFyIGRlY2xhcmF0aW9uc1xuICAgICAgdmFsdWUgPSBTdHJpbmdXcmFwcGVyLnJlcGxhY2VBbGxNYXBwZWQodmFsdWUsIFZBUklBQkxFX1RQTF9CSU5ESU5HX1JFR0VYUCwgbSA9PiB7XG4gICAgICAgIHJldHVybiBgJHttWzFdLnRvTG93ZXJDYXNlKCl9JHtkYXNoQ2FzZVRvQ2FtZWxDYXNlKG1bMl0pfWA7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAobmFtZSA9PSBhc3QubmFtZSAmJiB2YWx1ZSA9PSBhc3QudmFsdWUpIHtcbiAgICAgIHJldHVybiBhc3Q7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBIdG1sQXR0ckFzdChuYW1lLCB2YWx1ZSwgYXN0LnNvdXJjZVNwYW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmV3cml0ZVNob3J0U3ludGF4KGFzdDogSHRtbEF0dHJBc3QpOiBIdG1sQXR0ckFzdCB7XG4gICAgbGV0IG0gPSBSZWdFeHBXcmFwcGVyLmZpcnN0TWF0Y2goU0hPUlRfU1lOVEFYX1JFR0VYUCwgYXN0Lm5hbWUpO1xuICAgIGxldCBhdHRyTmFtZSA9IGFzdC5uYW1lO1xuICAgIGxldCBhdHRyVmFsdWUgPSBhc3QudmFsdWU7XG5cbiAgICBpZiAoaXNQcmVzZW50KG0pKSB7XG4gICAgICBpZiAoaXNQcmVzZW50KG1bMV0pKSB7XG4gICAgICAgIGF0dHJOYW1lID0gYCgke2Rhc2hDYXNlVG9DYW1lbENhc2UobVsxXSl9KWA7XG4gICAgICB9IGVsc2UgaWYgKGlzUHJlc2VudChtWzJdKSkge1xuICAgICAgICBhdHRyTmFtZSA9IGBbKCR7ZGFzaENhc2VUb0NhbWVsQ2FzZShtWzJdKX0pXWA7XG4gICAgICB9IGVsc2UgaWYgKGlzUHJlc2VudChtWzNdKSkge1xuICAgICAgICBsZXQgcHJvcCA9IFN0cmluZ1dyYXBwZXIucmVwbGFjZUFsbE1hcHBlZChtWzNdLCBTUEVDSUFMX1BSRUZJWEVTX1JFR0VYUCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKG0pID0+IHsgcmV0dXJuIG1bMV0udG9Mb3dlckNhc2UoKSArICcuJzsgfSk7XG5cbiAgICAgICAgaWYgKHByb3Auc3RhcnRzV2l0aCgnY2xhc3MuJykgfHwgcHJvcC5zdGFydHNXaXRoKCdhdHRyLicpIHx8IHByb3Auc3RhcnRzV2l0aCgnc3R5bGUuJykpIHtcbiAgICAgICAgICBhdHRyTmFtZSA9IGBbJHtwcm9wfV1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF0dHJOYW1lID0gYFske2Rhc2hDYXNlVG9DYW1lbENhc2UocHJvcCl9XWA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNQcmVzZW50KG1bNF0pKSB7XG4gICAgICAgIGF0dHJOYW1lID0gYCMke2Rhc2hDYXNlVG9DYW1lbENhc2UobVs0XSl9YDtcbiAgICAgICAgYXR0clZhbHVlID0gZGFzaENhc2VUb0NhbWVsQ2FzZShhdHRyVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhdHRyTmFtZSA9PSBhc3QubmFtZSAmJiBhdHRyVmFsdWUgPT0gYXN0LnZhbHVlID9cbiAgICAgICAgICAgICAgIGFzdCA6XG4gICAgICAgICAgICAgICBuZXcgSHRtbEF0dHJBc3QoYXR0ck5hbWUsIGF0dHJWYWx1ZSwgYXN0LnNvdXJjZVNwYW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmV3cml0ZVN0YXIoYXN0OiBIdG1sQXR0ckFzdCk6IEh0bWxBdHRyQXN0IHtcbiAgICBsZXQgYXR0ck5hbWUgPSBhc3QubmFtZTtcbiAgICBsZXQgYXR0clZhbHVlID0gYXN0LnZhbHVlO1xuXG4gICAgaWYgKGF0dHJOYW1lWzBdID09ICcqJykge1xuICAgICAgYXR0ck5hbWUgPSBkYXNoQ2FzZVRvQ2FtZWxDYXNlKGF0dHJOYW1lKTtcbiAgICAgIC8vIHJld3JpdGUgdGhlIHZhciBkZWNsYXJhdGlvbnNcbiAgICAgIGF0dHJWYWx1ZSA9IFN0cmluZ1dyYXBwZXIucmVwbGFjZUFsbE1hcHBlZChhdHRyVmFsdWUsIFZBUklBQkxFX1RQTF9CSU5ESU5HX1JFR0VYUCwgbSA9PiB7XG4gICAgICAgIHJldHVybiBgJHttWzFdLnRvTG93ZXJDYXNlKCl9JHtkYXNoQ2FzZVRvQ2FtZWxDYXNlKG1bMl0pfWA7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXR0ck5hbWUgPT0gYXN0Lm5hbWUgJiYgYXR0clZhbHVlID09IGFzdC52YWx1ZSA/XG4gICAgICAgICAgICAgICBhc3QgOlxuICAgICAgICAgICAgICAgbmV3IEh0bWxBdHRyQXN0KGF0dHJOYW1lLCBhdHRyVmFsdWUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jld3JpdGVJbnRlcnBvbGF0aW9uKGFzdDogSHRtbEF0dHJBc3QpOiBIdG1sQXR0ckFzdCB7XG4gICAgbGV0IGhhc0ludGVycG9sYXRpb24gPSBSZWdFeHBXcmFwcGVyLnRlc3QoSU5URVJQT0xBVElPTl9SRUdFWFAsIGFzdC52YWx1ZSk7XG5cbiAgICBpZiAoIWhhc0ludGVycG9sYXRpb24pIHtcbiAgICAgIHJldHVybiBhc3Q7XG4gICAgfVxuXG4gICAgbGV0IG5hbWUgPSBhc3QubmFtZTtcblxuICAgIGlmICghKG5hbWUuc3RhcnRzV2l0aCgnYXR0ci4nKSB8fCBuYW1lLnN0YXJ0c1dpdGgoJ2NsYXNzLicpIHx8IG5hbWUuc3RhcnRzV2l0aCgnc3R5bGUuJykpKSB7XG4gICAgICBuYW1lID0gZGFzaENhc2VUb0NhbWVsQ2FzZShhc3QubmFtZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5hbWUgPT0gYXN0Lm5hbWUgPyBhc3QgOiBuZXcgSHRtbEF0dHJBc3QobmFtZSwgYXN0LnZhbHVlLCBhc3Quc291cmNlU3Bhbik7XG4gIH1cblxuICBwcml2YXRlIF9yZXdyaXRlU3BlY2lhbENhc2VzKGFzdDogSHRtbEF0dHJBc3QpOiBIdG1sQXR0ckFzdCB7XG4gICAgbGV0IGF0dHJOYW1lID0gYXN0Lm5hbWU7XG5cbiAgICBpZiAoU1BFQ0lBTF9DQVNFUy5pbmRleE9mKGF0dHJOYW1lKSA+IC0xKSB7XG4gICAgICByZXR1cm4gbmV3IEh0bWxBdHRyQXN0KGRhc2hDYXNlVG9DYW1lbENhc2UoYXR0ck5hbWUpLCBhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICB9XG5cbiAgICBpZiAoaXNQcmVzZW50KHRoaXMuZGFzaENhc2VTZWxlY3RvcnMpICYmIHRoaXMuZGFzaENhc2VTZWxlY3RvcnMuaW5kZXhPZihhdHRyTmFtZSkgPiAtMSkge1xuICAgICAgcmV0dXJuIG5ldyBIdG1sQXR0ckFzdChkYXNoQ2FzZVRvQ2FtZWxDYXNlKGF0dHJOYW1lKSwgYXN0LnZhbHVlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFzdDtcbiAgfVxufVxuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgTGVnYWN5SHRtbFBhcnNlciBleHRlbmRzIEh0bWxQYXJzZXIge1xuICBwYXJzZShzb3VyY2VDb250ZW50OiBzdHJpbmcsIHNvdXJjZVVybDogc3RyaW5nLFxuICAgICAgICBwYXJzZUV4cGFuc2lvbkZvcm1zOiBib29sZWFuID0gZmFsc2UpOiBIdG1sUGFyc2VUcmVlUmVzdWx0IHtcbiAgICBsZXQgdHJhbnNmb3JtZXIgPSBuZXcgTGVnYWN5SHRtbEFzdFRyYW5zZm9ybWVyKCk7XG4gICAgbGV0IGh0bWxQYXJzZVRyZWVSZXN1bHQgPSBzdXBlci5wYXJzZShzb3VyY2VDb250ZW50LCBzb3VyY2VVcmwsIHBhcnNlRXhwYW5zaW9uRm9ybXMpO1xuXG4gICAgbGV0IHJvb3ROb2RlcyA9IGh0bWxQYXJzZVRyZWVSZXN1bHQucm9vdE5vZGVzLm1hcChub2RlID0+IG5vZGUudmlzaXQodHJhbnNmb3JtZXIsIG51bGwpKTtcblxuICAgIHJldHVybiB0cmFuc2Zvcm1lci5yZXdyaXR0ZW5Bc3QubGVuZ3RoID4gMCA/XG4gICAgICAgICAgICAgICBuZXcgSHRtbFBhcnNlVHJlZVJlc3VsdChyb290Tm9kZXMsIGh0bWxQYXJzZVRyZWVSZXN1bHQuZXJyb3JzKSA6XG4gICAgICAgICAgICAgICBodG1sUGFyc2VUcmVlUmVzdWx0O1xuICB9XG59XG4iXX0=