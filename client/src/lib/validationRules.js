"use strict";

export function required (v) {
  return v === 0 || !!v || "Required.";
}

export function hasPattern (re, v, message) {
  return re.test(v) || message;
}
