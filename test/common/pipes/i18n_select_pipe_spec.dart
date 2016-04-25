library angular2.test.common.pipes.i18n_select_pipe_spec;

import "package:angular2/testing_internal.dart"
    show ddescribe, describe, it, iit, xit, expect, beforeEach, afterEach;
import "package:angular2/common.dart" show I18nSelectPipe;
import "package:angular2/src/core/linker/pipe_resolver.dart" show PipeResolver;

main() {
  describe("I18nSelectPipe", () {
    var pipe;
    var mapping = {
      "male": "Invite him.",
      "female": "Invite her.",
      "other": "Invite them."
    };
    beforeEach(() {
      pipe = new I18nSelectPipe();
    });
    it("should be marked as pure", () {
      expect(new PipeResolver().resolve(I18nSelectPipe).pure).toEqual(true);
    });
    describe("transform", () {
      it("should return male text if value is male", () {
        var val = pipe.transform("male", [mapping]);
        expect(val).toEqual("Invite him.");
      });
      it("should return female text if value is female", () {
        var val = pipe.transform("female", [mapping]);
        expect(val).toEqual("Invite her.");
      });
      it("should return other text if value is anything other than male or female",
          () {
        var val = pipe.transform("Anything else", [mapping]);
        expect(val).toEqual("Invite them.");
      });
      it("should use 'other' if value is undefined", () {
        var gender;
        var val = pipe.transform(gender, [mapping]);
        expect(val).toEqual("Invite them.");
      });
      it("should not support bad arguments", () {
        expect(() => pipe.transform("male", ["hey"])).toThrowError();
      });
    });
  });
}
