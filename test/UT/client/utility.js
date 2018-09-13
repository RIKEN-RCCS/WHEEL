// setup test framework
const global = (function(){return this})();
if(!('chai' in global)){
  const chai = require("chai");
  const { expect } = require("chai");
};

describe("#isValidName", function(){
  it("should allow name which contains only alphanumeric", function(){
    expect(isValidName("aaa23f")).to.be.true;
  });
  it("should allow name which starts with number", function(){
    expect(isValidName("41aa3f")).to.be.true;
  });
  it("should not allow name including '-'", function(){
    expect(isValidName("aa-bb")).to.be.true;
  });
  it("should not allow name including '_'", function(){
    expect(isValidName("aa_bb")).to.be.true;
  });
  it("should not allow name including '?'", function(){
    expect(isValidName("aa?bb")).to.be.false;
  });
  it("should not allow name including '.'", function(){
    expect(isValidName("aa.bb")).to.be.false;
  });
  it("should not allow name including '*'", function(){
    expect(isValidName("aa*bb")).to.be.false;
  });
  it("should not allow name including '{'", function(){
    expect(isValidName("aa{bb")).to.be.false;
  });
  it("should not allow name including '}'", function(){
    expect(isValidName("aa}bb")).to.be.false;
  });
  it("should not allow name including '['", function(){
    expect(isValidName("aa[bb")).to.be.false;
  });
  it("should not allow name including ']'", function(){
    expect(isValidName("aa]bb")).to.be.false;
  });
  it("should not allow name including \\", function(){
    expect(isValidName("aa\\bb")).to.be.false;
  });
  it("should not allow name including /", function(){
    expect(isValidName("aa/bb")).to.be.false;
  });
  it("should not allow name including UTF8", function(){
    expect(isValidName("aaほげ")).to.be.false;
  });
});

describe("#isValidInputFileName", function(){
  it("should allow name which contains only alphanumeric", function(){
    expect(isValidInputFilename("aaa23f")).to.be.true;
  });
  it("should allow name which starts with number", function(){
    expect(isValidInputFilename("41aa3f")).to.be.true;
  });
  it("should not allow name including '-'", function(){
    expect(isValidInputFilename("aa-bb")).to.be.true;
  });
  it("should not allow name including '_'", function(){
    expect(isValidInputFilename("aa_bb")).to.be.true;
  });
  it("should not allow name including '?'", function(){
    expect(isValidInputFilename("aa?bb")).to.be.false;
  });
  it("should not allow name including '.'", function(){
    expect(isValidInputFilename("aa.bb")).to.be.true;
  });
  it("should not allow name including '*'", function(){
    expect(isValidInputFilename("aa*bb")).to.be.false;
  });
  it("should not allow name including '{'", function(){
    expect(isValidInputFilename("aa{bb")).to.be.false;
  });
  it("should not allow name including '}'", function(){
    expect(isValidInputFilename("aa}bb")).to.be.false;
  });
  it("should not allow name including '['", function(){
    expect(isValidInputFilename("aa[bb")).to.be.false;
  });
  it("should not allow name including ']'", function(){
    expect(isValidInputFilename("aa]bb")).to.be.false;
  });
  it("should not allow name including \\", function(){
    expect(isValidInputFilename("aa\\bb")).to.be.true;
  });
  it("should not allow name including /", function(){
    expect(isValidInputFilename("aa/bb")).to.be.true;
  });
  it("should not allow name including UTF8", function(){
    expect(isValidInputFilename("aaほげ")).to.be.false;
  });
});

describe("#isValidOutputFileName", function(){
  it("should allow name which contains only alphanumeric", function(){
    expect(isValidOutputFilename("aaa23f")).to.be.true;
  });
  it("should allow name which starts with number", function(){
    expect(isValidOutputFilename("41aa3f")).to.be.true;
  });
  it("should not allow name including '-'", function(){
    expect(isValidOutputFilename("aa-bb")).to.be.true;
  });
  it("should not allow name including '_'", function(){
    expect(isValidOutputFilename("aa_bb")).to.be.true;
  });
  it("should not allow name including '?'", function(){
    expect(isValidOutputFilename("aa?bb")).to.be.true;
  });
  it("should not allow name including '.'", function(){
    expect(isValidOutputFilename("aa.bb")).to.be.true;
  });
  it("should not allow name including '*'", function(){
    expect(isValidOutputFilename("aa*bb")).to.be.true;
  });
  it("should not allow name including '{'", function(){
    expect(isValidOutputFilename("aa{bb")).to.be.true;
  });
  it("should not allow name including '}'", function(){
    expect(isValidOutputFilename("aa}bb")).to.be.true;
  });
  it("should not allow name including '['", function(){
    expect(isValidOutputFilename("aa[bb")).to.be.true;
  });
  it("should not allow name including ']'", function(){
    expect(isValidOutputFilename("aa]bb")).to.be.true;
  });
  it("should not allow name including \\", function(){
    expect(isValidOutputFilename("aa\\bb")).to.be.true;
  });
  it("should not allow name including /", function(){
    expect(isValidOutputFilename("aa/bb")).to.be.true;
  });
  it("should not allow name including UTF8", function(){
    expect(isValidOutputFilename("aaほげ")).to.be.false;
  });
});

