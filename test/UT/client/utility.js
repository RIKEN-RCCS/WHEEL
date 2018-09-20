//setup test framework
const global = (function() {
  return this;
}());
if (!("chai" in global)) {
  const chai = require("chai");
  const { expect } = require("chai");
}

describe("#isValidName", ()=>{
  it("should allow name which contains only alphanumeric", ()=>{
    expect(isValidName("aaa23f")).to.be.true;
  });
  it("should allow name which starts with number", ()=>{
    expect(isValidName("41aa3f")).to.be.true;
  });
  it("should not allow name including '-'", ()=>{
    expect(isValidName("aa-bb")).to.be.true;
  });
  it("should not allow name including '_'", ()=>{
    expect(isValidName("aa_bb")).to.be.true;
  });
  it("should not allow name including '?'", ()=>{
    expect(isValidName("aa?bb")).to.be.false;
  });
  it("should not allow name including '.'", ()=>{
    expect(isValidName("aa.bb")).to.be.false;
  });
  it("should not allow name including '*'", ()=>{
    expect(isValidName("aa*bb")).to.be.false;
  });
  it("should not allow name including '{'", ()=>{
    expect(isValidName("aa{bb")).to.be.false;
  });
  it("should not allow name including '}'", ()=>{
    expect(isValidName("aa}bb")).to.be.false;
  });
  it("should not allow name including '['", ()=>{
    expect(isValidName("aa[bb")).to.be.false;
  });
  it("should not allow name including ']'", ()=>{
    expect(isValidName("aa]bb")).to.be.false;
  });
  it("should not allow name including \\", ()=>{
    expect(isValidName("aa\\bb")).to.be.false;
  });
  it("should not allow name including /", ()=>{
    expect(isValidName("aa/bb")).to.be.false;
  });
  it("should not allow name including UTF8", ()=>{
    expect(isValidName("aaほげ")).to.be.false;
  });
});

describe("#isValidInputFileName", ()=>{
  it("should allow name which contains only alphanumeric", ()=>{
    expect(isValidInputFilename("aaa23f")).to.be.true;
  });
  it("should allow name which starts with number", ()=>{
    expect(isValidInputFilename("41aa3f")).to.be.true;
  });
  it("should not allow name including '-'", ()=>{
    expect(isValidInputFilename("aa-bb")).to.be.true;
  });
  it("should not allow name including '_'", ()=>{
    expect(isValidInputFilename("aa_bb")).to.be.true;
  });
  it("should not allow name including '?'", ()=>{
    expect(isValidInputFilename("aa?bb")).to.be.false;
  });
  it("should not allow name including '.'", ()=>{
    expect(isValidInputFilename("aa.bb")).to.be.true;
  });
  it("should not allow name including '*'", ()=>{
    expect(isValidInputFilename("aa*bb")).to.be.false;
  });
  it("should not allow name including '{'", ()=>{
    expect(isValidInputFilename("aa{bb")).to.be.false;
  });
  it("should not allow name including '}'", ()=>{
    expect(isValidInputFilename("aa}bb")).to.be.false;
  });
  it("should not allow name including '['", ()=>{
    expect(isValidInputFilename("aa[bb")).to.be.false;
  });
  it("should not allow name including ']'", ()=>{
    expect(isValidInputFilename("aa]bb")).to.be.false;
  });
  it("should not allow name including \\", ()=>{
    expect(isValidInputFilename("aa\\bb")).to.be.true;
  });
  it("should not allow name including /", ()=>{
    expect(isValidInputFilename("aa/bb")).to.be.true;
  });
  it("should not allow name including UTF8", ()=>{
    expect(isValidInputFilename("aaほげ")).to.be.false;
  });
});

describe("#isValidOutputFileName", ()=>{
  it("should allow name which contains only alphanumeric", ()=>{
    expect(isValidOutputFilename("aaa23f")).to.be.true;
  });
  it("should allow name which starts with number", ()=>{
    expect(isValidOutputFilename("41aa3f")).to.be.true;
  });
  it("should not allow name including '-'", ()=>{
    expect(isValidOutputFilename("aa-bb")).to.be.true;
  });
  it("should not allow name including '_'", ()=>{
    expect(isValidOutputFilename("aa_bb")).to.be.true;
  });
  it("should not allow name including '?'", ()=>{
    expect(isValidOutputFilename("aa?bb")).to.be.true;
  });
  it("should not allow name including '.'", ()=>{
    expect(isValidOutputFilename("aa.bb")).to.be.true;
  });
  it("should not allow name including '*'", ()=>{
    expect(isValidOutputFilename("aa*bb")).to.be.true;
  });
  it("should not allow name including '{'", ()=>{
    expect(isValidOutputFilename("aa{bb")).to.be.true;
  });
  it("should not allow name including '}'", ()=>{
    expect(isValidOutputFilename("aa}bb")).to.be.true;
  });
  it("should not allow name including '['", ()=>{
    expect(isValidOutputFilename("aa[bb")).to.be.true;
  });
  it("should not allow name including ']'", ()=>{
    expect(isValidOutputFilename("aa]bb")).to.be.true;
  });
  it("should not allow name including \\", ()=>{
    expect(isValidOutputFilename("aa\\bb")).to.be.true;
  });
  it("should not allow name including /", ()=>{
    expect(isValidOutputFilename("aa/bb")).to.be.true;
  });
  it("should not allow name including UTF8", ()=>{
    expect(isValidOutputFilename("aaほげ")).to.be.false;
  });
});
