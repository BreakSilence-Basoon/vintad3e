const limit = (1n << 256n) - 1n;
const keysMatch = (value, keys) => Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const abs = value => value < 0n ? -value : value;
function gcd(a, b) { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a || 1n; }
function reduce(numerator, denominator) {
  if (denominator === 0n) return null;
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const common = gcd(numerator, denominator); numerator /= common; denominator /= common;
  return abs(numerator) <= limit && denominator <= limit ? { numerator, denominator } : null;
}
function interpret(expression, variables) {
  if (!variables || typeof variables !== 'object' || Array.isArray(variables) || !keysMatch(variables, ['amount', 'rate']) || !Object.values(variables).every(Number.isSafeInteger)) return null;
  let nodes = 0;
  function visit(node, depth) {
    if (!node || typeof node !== 'object' || Array.isArray(node) || ++nodes > 64 || depth > 8) return null;
    if (keysMatch(node, ['value']) && Number.isSafeInteger(node.value)) return { numerator: BigInt(node.value), denominator: 1n, text: String(node.value) };
    if (keysMatch(node, ['var']) && ['amount', 'rate'].includes(node.var)) return { numerator: BigInt(variables[node.var]), denominator: 1n, text: node.var };
    if (!keysMatch(node, ['op', 'left', 'right']) || !['add', 'subtract', 'multiply', 'divide'].includes(node.op)) return null;
    const left = visit(node.left, depth + 1), right = visit(node.right, depth + 1);
    if (!left || !right) return null;
    const symbols = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
    let value;
    if (node.op === 'add') value = reduce(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
    else if (node.op === 'subtract') value = reduce(left.numerator * right.denominator - right.numerator * left.denominator, left.denominator * right.denominator);
    else if (node.op === 'multiply') value = reduce(left.numerator * right.numerator, left.denominator * right.denominator);
    else value = reduce(left.numerator * right.denominator, left.denominator * right.numerator);
    return value ? { ...value, text: `(${left.text} ${symbols[node.op]} ${right.text})` } : null;
  }
  return visit(expression, 0);
}
export function calculateFixtureFormula(expression, variables) {
  const value = interpret(expression, variables);
  if (!value) return null;
  const magnitude = abs(value.numerator), quotient = magnitude / value.denominator, remainder = magnitude % value.denominator;
  const rounded = (value.numerator < 0n ? -1n : 1n) * (quotient + (remainder * 2n >= value.denominator ? 1n : 0n));
  return abs(rounded) <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rounded) : null;
}
export function formatFixtureFormula(expression, variables) { return interpret(expression, variables)?.text ?? null; }
