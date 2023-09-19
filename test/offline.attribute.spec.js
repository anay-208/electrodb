const { CastTypes } = require("../src/types");
const { Attribute, SetAttribute } = require("../src/schema");
const { expect } = require("chai");
describe("constructor", () => {
  it("Should validate 'get' property type", () => {
    let attribute = {
      name: "property_name",
      type: "string",
      get: "INCORRECT_TYPE",
    };
    expect(() => new Attribute(attribute)).to.throw(
      `Invalid "get" property for attribute ${attribute.name}. Please ensure value is a function or undefined. - For more detail on this error reference: https://electrodb.dev/en/reference/errors/#invalid-attribute-definition`,
    );
  });
  it("Should validate 'set' property type", () => {
    let attribute = {
      name: "property_name",
      type: "string",
      set: "INCORRECT_TYPE",
    };
    expect(() => new Attribute(attribute)).to.throw(
      `Invalid "set" property for attribute ${attribute.name}. Please ensure value is a function or undefined. - For more detail on this error reference: https://electrodb.dev/en/reference/errors/#invalid-attribute-definition`,
    );
  });
});

describe("casting", () => {
  it("Should validate 'cast' property type", () => {
    let attribute = {
      name: "property_name",
      type: "string",
      cast: "INCORRECT_TYPE",
    };
    expect(() => new Attribute(attribute)).to.throw(
      `Invalid "cast" property for attribute: "${
        attribute.name
      }". Acceptable types include ${CastTypes.join(", ")}`,
    );
  });
  it("Should cast a set value to string", () => {
    let attribute = new Attribute({
      name: "property_name",
      type: "string",
      cast: "string",
    });

    let numberToString = attribute.cast(1);
    let stringToString = attribute.cast("abc");
    let undefinedToError = () => attribute.cast(undefined);
    expect(typeof numberToString).to.equal("string");
    expect(typeof stringToString).to.equal("string");
    expect(undefinedToError).to.throw(
      `Attribute ${attribute.name} is undefined and cannot be cast to type string`,
    );
  });

  it("Should cast a set value to number", () => {
    let attribute = new Attribute({
      name: "property_name",
      type: "string",
      cast: "number",
    });

    let numberToNumber = attribute.cast(1);
    let stringToNumber = attribute.cast("1234");
    let undefinedToError = () => attribute.cast(undefined);
    let charactersToError = () => attribute.cast("abc");
    expect(typeof numberToNumber).to.equal("number");
    expect(typeof stringToNumber).to.equal("number");
    expect(undefinedToError).to.throw(
      `Attribute ${attribute.name} is undefined and cannot be cast to type number`,
    );
    expect(charactersToError).to.throw(
      `Attribute ${attribute.name} cannot be cast to type number. Doing so results in NaN`,
    );
  });
});

describe("Attribute types", () => {
  it("should default a type to string", () => {
    let attribute = new Attribute({
      name: "property_name",
    });
    expect(attribute.type).to.equal("string");
  });
  it("Should validate a value's type", () => {
    let attribute = new Attribute({
      name: "property_name",
      type: "string",
    });
    let [isValid, errs] = attribute.isValid(123);
    expect(isValid).to.be.false;
    expect(errs).to.be.an("array").with.length(1);
    expect(errs[0].message).to.be.equal(
      `Invalid value type at entity path: "property_name". Received value of type "number", expected value of type "string" - For more detail on this error reference: https://electrodb.dev/en/reference/errors/#invalid-attribute`,
    );
  });
});

describe("Enum Set", () => {
  it("should accept a set with enum items", () => {
    expect(
      () =>
        new SetAttribute({
          type: "set",
          items: ["GREEN", "BLUE", "RED"],
        }),
    ).not.to.throw();
  });

  it("should validate a set with enum items", () => {
    const setEnum = new SetAttribute({
      type: "set",
      items: ["GREEN", "BLUE", "RED"],
    });
    const [redIsValid, redErrors] = setEnum.isValid(["RED"]);
    expect(redIsValid).to.equal(true);
    expect(redErrors).to.be.an("array").with.length(0);
    const [purpleIsValid, purpleErrors] = setEnum.isValid(["PURPLE"]);
    expect(purpleIsValid).to.equal(false);
    expect(purpleErrors).to.be.an("array").with.length(1);
    expect(purpleErrors[0].message).to.equal(
      'Invalid value type at entity path: "prop". Value not found in set of acceptable values: "GREEN", "BLUE", "RED" - For more detail on this error reference: https://electrodb.dev/en/reference/errors/#invalid-attribute',
    );
  });
});
