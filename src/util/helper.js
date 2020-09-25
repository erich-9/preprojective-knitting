import $ from "jquery";

function randomInt(from, to) {
  const n = (to - from);

  return Math.floor((Math.random() * n) % n) + from;
}

function randomKey(obj) {
  const x = Object.keys(obj);

  return x[randomInt(0, x.length)];
}

function compare(x1, x2) {
  return x1 < x2 ? -1 : x2 < x1 ? 1 : 0;
}

function throwError(str) {
  throw $.extend(new Error(str), { userDefined: true });
}

function equalObjects(x, y) {
  for (const i in x) {
    if (!(i in y) || x[i] !== y[i])
      return false;
  }

  for (const i in y) {
    if (!(i in x))
      return false;
  }

  return true;
}

function polarCoordinates(x, y) {
  if (x === 0 && y === 0) {
    return {
      r: 0,
      arg: null
    };
  }

  const r = Math.sqrt((x * x) + (y * y));

  return {
    r,
    arg:
      x < 0 && y === 0
        ? 180
        : Math.atan(y / (x + r)) * 360 / Math.PI
  };
}

let inIE;

function runningInIE() {
  if (inIE === undefined && navigator)
    inIE = /MSIE \d|Trident.*rv:/.test(navigator.userAgent);

  return inIE;
}

function count(array, equals) {
  const res = array.slice();

  res.sort((x, y) => equals(x, y));

  for (let i = 0; i < res.length;) {
    if (i > 0 && equals(res[i], res[i - 1][1])) {
      ++res[i - 1][0];
      res.splice(i, 1);
    }
    else {
      res[i] = [1, res[i]];
      ++i;
    }
  }

  return res;
}

function isObject(x) {
  return Object.prototype.toString.call(x) === "[object Object]";
}

function isString(x) {
  return (typeof x === "string");
}

function htmlEscape(str) {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isAlphanumericCharacter(str) {
  return /^[a-z0-9]$/i.test(str);
}

function isIntegerInRange(x, x_min = -Infinity, x_max = Infinity) {
  return Number.isInteger(x) && x > x_min && x < x_max;
}

function withDefault(x, dft, func) {
  return x !== null && x !== undefined ? (func ? func(x) : x) : dft;
}

export default {
  compare,
  count,
  equalObjects,
  htmlEscape,
  isAlphanumericCharacter,
  isIntegerInRange,
  isObject,
  isString,
  polarCoordinates,
  randomInt,
  randomKey,
  runningInIE,
  throwError,
  withDefault
};
