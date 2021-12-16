"use strict";

export function required (v) {
  return v === 0 || !!v || "Required.";
}

export function validPortNumber (v) {
  if (typeof v !== "number") {
    return false;
  }
  return (v > 0 && v < 65536) || "out of port number range";
}
export function positiveNumber (allowEmpty, v) {
  if(allowEmpty){
    if (v === "" || typeof v === "undefined") {
      return true;
    }
  }
  return (typeof v === "number" && v >= 0) || allowEmpty? "0 or more" : "more than 0";
}
