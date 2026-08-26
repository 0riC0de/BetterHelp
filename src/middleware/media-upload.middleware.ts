import multer from "multer";

import {
  isSupportedMediaMimeType,
  MAXIMUM_MEDIA_BYTES,
} from "../domain/media.js";
import { HttpError } from "../errors/http-error.js";

export const uploadTicketMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAXIMUM_MEDIA_BYTES, files: 1, fields: 2, parts: 4 },
  fileFilter: (_req, file, callback) => {
    if (!isSupportedMediaMimeType(file.mimetype)) {
      callback(new HttpError(400, "Unsupported media type"));
      return;
    }
    callback(null, true);
  },
}).single("media");
