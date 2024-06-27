/*

*/

import { GraphQLScalarType, Kind, ValueNode, ObjectValueNode } from "graphql";
import Json5 from "json5";

export default new GraphQLScalarType({
  name: "AnythingScalarType",
  description: "Represents an arbitrary object.",
  parseValue: toObject,
  serialize: toObject,
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value.charAt(0) === "{" ? Json5.parse(ast.value) : null;
      case Kind.OBJECT:
        return parseObject(ast);
    }
    return null;
  },
});

function toObject(value: string | object) {
  if (typeof value === "object") {
    return value;
  }
  if (typeof value === "string" && value.charAt(0) === "{") {
    return Json5.parse(value);
  }
  return null;
}

function parseObject(ast: ObjectValueNode) {
  const value = Object.create(null);
  ast.fields.forEach((field) => {
    value[field.name.value] = parseAst(field.value);
  });
  return value;
}

// eslint-disable-next-line   @typescript-eslint/no-explicit-any
function parseAst(ast: ValueNode): any {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT:
      return parseObject(ast);
    case Kind.LIST:
      return ast.values.map(parseAst);
    default:
      return null;
  }
}
