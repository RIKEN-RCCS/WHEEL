// setup test framework
const global = (function(){return this})();
if(!('chai' in global)){
  const chai = require("chai");
  const { expect } = require("chai");
};

describe("dummy UT:client", function(){
  it("dummy 1", function(){
    expect(true).to.be.true;
  });
});

