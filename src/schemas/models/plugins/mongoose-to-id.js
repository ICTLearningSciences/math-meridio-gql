/*

*/

import { isHex } from "ishex";
import mongoose from "mongoose";
import { logger } from "../../utils/logging";

/**
 * Checks if a given object is of type ObjectId.
 * If it isn't, looks for an object id in property _id.
 * @param obj either an ObjectId or an object that contains an ObjectId property _id
 * @returns the _id property of the given object or the object itself
 */
function toIdPlugin(schema) {
  const toId = (obj) => {
    if (obj instanceof mongoose.Types.ObjectId) {
      return obj;
    }
    if (!obj) {
      return obj;
    }
    if (obj._id) {
      return obj._id;
    }
    if (obj.id) {
      return obj.id;
    }
    if (obj.length === 24 && isHex(obj)) {
      try {
        return new mongoose.Types.ObjectId(obj);
      } catch (castErr) {
        logger.error(`cast error for id '${obj}': ${castErr}`);
        logger.error(castErr);
      }
    }

    return obj;
  };
  schema.statics.toId = toId;
  schema.methods.toId = toId;
}
module.exports = toIdPlugin;
