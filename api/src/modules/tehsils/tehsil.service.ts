import APIError from '@/configs/errors/APIError';
import { HttpErrorStatusCode } from '@/types/errors/errors.types';

import { TehsilModel } from './tehsil.model';
import {
  normalizeTehsilName,
  tehsilMatchKey,
  tehsilSlugFromName,
} from './tehsil.normalize';

export async function resolveOrCreateByName(rawName: string) {
  const name = normalizeTehsilName(rawName);
  if (!name) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'VALIDATION_FAILED',
      TITLE: 'VALIDATION_FAILED',
      MESSAGE: 'Tehsil name is required',
    });
  }

  const matchKey = tehsilMatchKey(name);
  const existing = await TehsilModel.findOne({ matchKey });
  if (existing) {
    return existing;
  }

  try {
    return await TehsilModel.create({
      name,
      matchKey,
      slug: tehsilSlugFromName(name),
    });
  }
  catch (error) {
    // Race: another import created the same tehsil
    const raced = await TehsilModel.findOne({ matchKey });
    if (raced) {
      return raced;
    }
    throw error;
  }
}

export async function listTehsils() {
  return TehsilModel.find().sort({ name: 1 }).lean();
}

export async function getTehsilById(id: string) {
  const tehsil = await TehsilModel.findById(id).lean();
  if (!tehsil) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.NOT_FOUND,
      CODE: 'TEHSIL_NOT_FOUND',
      TITLE: 'TEHSIL_NOT_FOUND',
      MESSAGE: 'Tehsil not found',
    });
  }
  return tehsil;
}
